import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });

  const authorization = request.headers.get("Authorization");
  const accessToken = authorization?.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : undefined;
  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}") as Record<string, string>;
  const serviceRoleKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");

  if (!accessToken || !serviceRoleKey || !supabaseUrl) {
    return Response.json({ error: "Missing authenticated session or server configuration" }, { status: 401, headers: corsHeaders });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: authError } = await admin.auth.getUser(accessToken);
  if (authError || !userData.user) {
    return Response.json({ error: "Your session could not be verified. Sign in again and retry." }, { status: 401, headers: corsHeaders });
  }

  let body: { confirmation?: string };
  try {
    body = await request.json() as { confirmation?: string };
  } catch {
    return Response.json({ error: "A deletion confirmation is required" }, { status: 400, headers: corsHeaders });
  }
  if (body.confirmation !== "DELETE") {
    return Response.json({ error: "Type DELETE to confirm account removal" }, { status: 400, headers: corsHeaders });
  }

  const { data: trees, error: treesError } = await admin
    .from("family_trees")
    .select("id")
    .eq("created_by", userData.user.id);
  if (treesError) {
    return Response.json({ error: "Family data could not be checked; the account was not deleted." }, { status: 500, headers: corsHeaders });
  }
  const treeIds = (trees ?? []).map((tree) => tree.id as string);
  if (treeIds.length) {
    const { data: people, error: peopleError } = await admin
      .from("people")
      .select("photo_path")
      .in("tree_id", treeIds);
    if (peopleError) {
      return Response.json({ error: "Family photos could not be checked; the account was not deleted." }, { status: 500, headers: corsHeaders });
    }
    const photoPaths = (people ?? []).map((person) => person.photo_path as string | null).filter((path): path is string => Boolean(path));
    if (photoPaths.length) {
      const { error: photoError } = await admin.storage.from("family-photos").remove(photoPaths);
      if (photoError) {
        return Response.json({ error: "Family photos could not be removed; the account was not deleted." }, { status: 500, headers: corsHeaders });
      }
    }
  }

  const { error: dataError } = await admin.rpc("delete_user_family_data", { target_user_id: userData.user.id });
  if (dataError) {
    return Response.json({ error: "Family data could not be removed; the account was not deleted." }, { status: 500, headers: corsHeaders });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userData.user.id);
  if (deleteError) {
    return Response.json({ error: "Family data was removed, but the account could not be deleted. Contact the app administrator." }, { status: 500, headers: corsHeaders });
  }

  return Response.json({ success: true }, { status: 200, headers: corsHeaders });
});
