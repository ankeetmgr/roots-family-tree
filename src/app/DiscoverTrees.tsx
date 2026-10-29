"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, GitBranch, Users } from "lucide-react";
import { createClient } from "./lib/supabase";

type DiscoverableTree = { tree_id: string; tree_name: string; member_count: number };
type SharedPerson = { id: string; name: string };
type SharedRelationship = { parent_id: string; child_id: string };
type SharedTreeDetail = {
  tree_id: string;
  tree_name: string;
  people: SharedPerson[];
  relationships: SharedRelationship[];
};

const migrationPath = "supabase/migrations/20261029000200_discovery_and_history_controls.sql";

export default function DiscoverTrees() {
  const supabase = useMemo(() => createClient(), []);
  const [trees, setTrees] = useState<DiscoverableTree[]>([]);
  const [detail, setDetail] = useState<SharedTreeDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void supabase.rpc("discover_family_trees").then(({ data, error: queryError }: { data: DiscoverableTree[] | null; error: { message: string } | null }) => {
      if (!active) return;
      if (queryError) {
        setError(`Discover is not ready yet: ${queryError.message}. Apply ${migrationPath} in the Supabase SQL Editor.`);
      } else {
        setTrees((data ?? []) as DiscoverableTree[]);
      }
      setLoaded(true);
    }).catch((loadError: unknown) => {
      if (!active) return;
      setError(loadError instanceof Error ? loadError.message : "Could not load discoverable family trees.");
      setLoaded(true);
    });
    return () => { active = false; };
  }, [supabase]);

  async function openTree(treeId: string) {
    setError("");
    setDetail(null);
    setDetailLoading(true);
    try {
      const { data, error: queryError } = await supabase.rpc("get_discoverable_family_tree", { tree_id_input: treeId });
      if (queryError) {
        setError(`Could not open this tree: ${queryError.message}`);
        return;
      }
      const row = ((data ?? []) as SharedTreeDetail[])[0];
      if (!row) {
        setError("This family tree is no longer being shared.");
        return;
      }
      setDetail(row);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Could not open this family tree.");
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl py-7 sm:py-10">
      {detail ? (
        <>
          <button onClick={() => setDetail(null)} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#426A4A] hover:text-[#254C3B]"><ArrowLeft size={16} /> All discoverable trees</button>
          <div className="mb-7">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DCE6D8] bg-[#EDF3E9] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#42684B]"><GitBranch size={13} /> SHARED FAMILY TREE</span>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[39px]">{detail.tree_name}</h2>
            <p className="mt-2 text-sm text-[#777F73]">The owner chose to share these names and family connections.</p>
          </div>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {detail.people.map((person) => {
              const isParent = detail.relationships.some((link) => link.parent_id === person.id);
              const isChild = detail.relationships.some((link) => link.child_id === person.id);
              return <div key={person.id} className="flex items-center gap-3 rounded-2xl border border-[#E5E7DD] bg-white p-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#E8F0E6] text-xs font-bold text-[#315B3F]">{person.name.split(/\s+/).slice(0, 2).map((word) => word[0] ?? "").join("").toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{person.name}</p><p className="mt-1 text-[11px] text-[#858D80]">{isParent && isChild ? "Parent & child" : isParent ? "Parent" : isChild ? "Child" : "Family member"}</p></div></div>;
            })}
          </div>
          {detail.relationships.length > 0 && <div className="rounded-2xl border border-[#E5E7DD] bg-white p-5"><h3 className="text-sm font-semibold">Parent-child connections</h3><div className="mt-3 divide-y divide-[#EFF0E9]">{detail.relationships.map((link) => <p key={`${link.parent_id}-${link.child_id}`} className="py-3 text-sm"><span className="font-medium">{detail.people.find((person) => person.id === link.parent_id)?.name ?? "Family member"}</span><span className="text-[#858D80]"> is parent of </span><span className="font-medium">{detail.people.find((person) => person.id === link.child_id)?.name ?? "Family member"}</span></p>)}</div></div>}
          <p className="mt-5 rounded-xl bg-[#F0F3EB] p-4 text-xs leading-5 text-[#527456]">Birth dates, places, biographies, photos, stories, and memories are not included in public discovery.</p>
        </>
      ) : (
        <>
          <div className="mb-7">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DCE6D8] bg-[#EDF3E9] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#42684B]"><Users size={13} /> COMMUNITY TREES</span>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[39px]">Discover family trees</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#777F73]">Browse trees that their owners chose to share. Only the tree name, member names, and parent-child connections are shown.</p>
          </div>
          {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-800">{error}</p>}
          {!loaded ? <p className="rounded-2xl border border-[#E5E7DD] bg-white p-6 text-sm text-[#777F73]">Loading shared trees…</p> : trees.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {trees.map((tree) => <article key={tree.tree_id} className="rounded-2xl border border-[#E5E7DD] bg-white p-5 sm:p-6"><span className="flex size-10 items-center justify-center rounded-xl bg-[#F0F3EB] text-[#527456]"><GitBranch size={19} /></span><h3 className="mt-4 text-lg font-semibold">{tree.tree_name}</h3><p className="mt-1 text-xs text-[#858D80]">{tree.member_count} {tree.member_count === 1 ? "family member" : "family members"}</p><button onClick={() => void openTree(tree.tree_id)} disabled={detailLoading} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#254C3B] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1C3D2E] disabled:opacity-60">{detailLoading ? "Opening…" : "View family tree"}<ArrowRight size={14} /></button></article>)}
            </div>
          ) : !error ? <div className="rounded-2xl border border-dashed border-[#D8DFD3] bg-white px-6 py-12 text-center"><span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#F0F3EB] text-[#527456]"><GitBranch size={22} /></span><h3 className="mt-4 text-base font-semibold">No shared trees yet</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#777F73]">A family tree appears here only after its owner turns on sharing in Settings.</p></div> : null}
          {detailLoading && <p role="status" className="mt-4 text-xs text-[#777F73]">Opening shared tree…</p>}
        </>
      )}
    </section>
  );
}
