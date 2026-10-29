
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { createClient } from "./lib/supabase";
import DiscoverTrees from "./DiscoverTrees";
import StoriesMemories from "./StoriesMemories";
import PhotoArchive, { PersonPhotoButton, PersonPortrait } from "./PhotoArchive";
import Timeline from "./Timeline";
import {
  ArrowDownRight,
  ArrowRight,
  BookOpen,
  Camera,
  ChevronDown,
  ChevronRight,
  Clock3,
  Compass,
  GitBranch,
  Globe2,
  Heart,
  ImagePlus,
  LayoutDashboard,
  Menu,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TreeDeciduous,
  Trash2,
  Users,
  X,
} from "lucide-react";

type Person = {
  id: number | string;
  name: string;
  role: string;
  place: string;
  years: string;
  initials: string;
  color: string;
  birthDate?: string;
  deathDate?: string;
  photoPath?: string | null;
};

type FamilyRelationship = {
  id: string;
  tree_id: string;
  parent_id: string;
  child_id: string;
};

type FamilyTree = { id: string; name: string; is_discoverable: boolean };

function relationshipRole(id: string | number, relationships: FamilyRelationship[]) {
  const personId = String(id);
  const isParent = relationships.some((relationship) => relationship.parent_id === personId);
  const isChild = relationships.some((relationship) => relationship.child_id === personId);
  return isParent && isChild ? "Parent & child" : isParent ? "Parent" : isChild ? "Child" : "Family member";
}

const initialPeople: Person[] = [
  {
    id: 1,
    name: "Pahalsingh Thapa Magar",
    role: "Grandfather",
    place: "Bhimapokhara, Baglung",
    years: "Dates to be added",
    initials: "PT",
    color: "bg-amber-100 text-amber-900",
  },
  {
    id: 2,
    name: "Nara Bahadur Thapa",
    role: "Father",
    place: "Bhimapokhara, Baglung",
    years: "Dates to be added",
    initials: "NT",
    color: "bg-emerald-100 text-emerald-900",
  },
  {
    id: 3,
    name: "Your name",
    role: "You",
    place: "Nepal",
    years: "Your story starts here",
    initials: "YN",
    color: "bg-sky-100 text-sky-900",
  },
];

function normalizePersonRows(
  rows: Record<string, unknown>[],
  relationships: FamilyRelationship[] = []
): Person[] {
  return rows.map((record, index) => {
    const name = String(record.full_name ?? record.name ?? "").trim();
    const id = String(record.id ?? `person-${index}`);

    return {
      id: (record.id as string | number | undefined) ?? `person-${index}`,
      name: name || "Unnamed family member",
      role: relationshipRole(id, relationships),
      place: String(record.birthplace ?? record.birth_place ?? record.place ?? "Location not added"),
      years: [record.birth_date, record.death_date].filter(Boolean).join(" – ") || "Details to be added",
      birthDate: typeof record.birth_date === "string" ? record.birth_date : "",
      deathDate: typeof record.death_date === "string" ? record.death_date : "",
      photoPath: typeof record.photo_path === "string" ? record.photo_path : null,
      initials: name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase() || "FM",
      color: "bg-violet-100 text-violet-900",
    };
  });
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Family tree", icon: GitBranch },
  { label: "People", icon: Users },
  { label: "Stories & memories", icon: BookOpen },
  { label: "Photo archive", icon: Camera },
  { label: "Timeline", icon: Clock3 },
];

export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const authUserIdRef = useRef<string | null>(null);
  const [people, setPeople] = useState(initialPeople);
  const [relationships, setRelationships] = useState<FamilyRelationship[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [treeId, setTreeId] = useState<string | null>(null);
  const [familyTrees, setFamilyTrees] = useState<FamilyTree[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [cloudConnected, setCloudConnected] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | number | null>(null);
  const [personBusy, setPersonBusy] = useState(false);
  const [treeNameDraft, setTreeNameDraft] = useState("");
  const [showTreeSettings, setShowTreeSettings] = useState(false);
  const [showClearHistory, setShowClearHistory] = useState(false);
  const [clearHistoryConfirmation, setClearHistoryConfirmation] = useState("");
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteAccountConfirmation, setDeleteAccountConfirmation] = useState("");
  const [settingsNotice, setSettingsNotice] = useState("");
  const [activePage, setActivePage] = useState("Overview");
  const [storyCounts, setStoryCounts] = useState({ stories: 0, memories: 0 });
  const handleStoryCountsChange = useCallback((stories: number, memories: number) => {
    setStoryCounts({ stories, memories });
  }, []);
  const handlePersonPhotoChange = useCallback((personId: string | number, photoPath: string | null) => {
    setPeople((current) => current.map((person) => person.id === personId ? { ...person, photoPath } : person));
  }, []);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [personName, setPersonName] = useState("");
  const [personPlace, setPersonPlace] = useState("");
  const [personBirthDate, setPersonBirthDate] = useState("");
  const [personDeathDate, setPersonDeathDate] = useState("");
  const [relatedPersonId, setRelatedPersonId] = useState("");
  const [relationshipDirection, setRelationshipDirection] = useState<"parent" | "child">("child");
  const [relationshipParentId, setRelationshipParentId] = useState("");
  const [relationshipChildId, setRelationshipChildId] = useState("");

  useEffect(() => {
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((
      _event: AuthChangeEvent,
      session: Session | null
    ) => {
      if (!active) return;
      const nextUserId = session?.user.id ?? null;
      if (authUserIdRef.current !== nextUserId) {
        authUserIdRef.current = nextUserId;
        setTreeId(null);
        setFamilyTrees([]);
        setPeople(session?.user ? [] : initialPeople);
        setRelationships([]);
        setCloudConnected(false);
        setDataLoading(Boolean(session?.user));
        setDataError("");
      }
      setUser(session?.user ?? null);
      setAuthLoading(false);
      setShowAuth(false);
      setAuthMessage("");
      setAuthError("");
    });

    void supabase.auth.getUser().then(({
      data: { user: currentUser },
      error,
    }: { data: { user: User | null }; error: { message: string } | null }) => {
      if (!active) return;
      if (error) setAuthError("Could not verify your sign-in. Please try again.");
      if (window.location.search.includes("auth=callback-error")) {
        setShowAuth(true);
        setAuthError("That sign-in link could not be verified or has expired. Request a new link and try again.");
        window.history.replaceState({}, "", window.location.pathname);
      }
      const nextUserId = currentUser?.id ?? null;
      const userChanged = authUserIdRef.current !== nextUserId;
      authUserIdRef.current = nextUserId;
      setUser(currentUser);
      if (userChanged) {
        setFamilyTrees([]);
        setTreeId(null);
        setPeople(currentUser ? [] : initialPeople);
        setRelationships([]);
        setCloudConnected(false);
        setDataLoading(Boolean(currentUser));
        setDataError("");
      }
      setAuthLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    let active = true;
    if (!user) {
      return () => { active = false; };
    }

    void supabase.from("family_trees").select("*").then(({
      data: rows,
      error,
    }: { data: Record<string, unknown>[] | null; error: { message: string } | null }) => {
      if (!active) return;
      if (error) {
        setDataError(`Could not load your family trees: ${error.message}`);
        setCloudConnected(false);
      } else {
        const trees = ((rows ?? []) as Record<string, unknown>[])
          .filter((tree) => tree.id)
          .map((tree) => ({ id: String(tree.id), name: String(tree.name ?? "My family tree"), is_discoverable: Boolean(tree.is_discoverable) }));
        setFamilyTrees(trees);
        setTreeId((current) => trees.some((tree) => tree.id === current) ? current : trees[0]?.id ?? null);
        if (trees.length === 0) {
          setPeople([]);
          setRelationships([]);
          setCloudConnected(true);
        }
      }
      setDataLoading(false);
    }).catch((error: unknown) => {
      if (!active) return;
      setDataError(error instanceof Error ? error.message : "Could not load family trees.");
      setCloudConnected(false);
      setDataLoading(false);
    });

    return () => { active = false; };
  }, [supabase, user]);

  useEffect(() => {
    let active = true;
    if (!user) return () => { active = false; };
    if (!treeId) return () => { active = false; };

    void Promise.all([
      supabase.from("people").select("*").eq("tree_id", treeId),
      supabase.from("relationships").select("*").eq("tree_id", treeId),
    ]).then(([peopleResult, relationshipResult]) => {
        if (!active) return;
        if (peopleResult.error || relationshipResult.error) {
          const error = peopleResult.error ?? relationshipResult.error;
          setDataError(`Your family data could not be read: ${error?.message ?? "unknown error"}`);
          setCloudConnected(false);
        } else {
          const loadedRelationships = (relationshipResult.data ?? []) as FamilyRelationship[];
          setRelationships(loadedRelationships);
          setPeople(normalizePersonRows((peopleResult.data ?? []) as Record<string, unknown>[], loadedRelationships));
          setCloudConnected(true);
        }
        setDataLoading(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setDataError(error instanceof Error ? error.message : "Could not load family data.");
        setCloudConnected(false);
        setDataLoading(false);
      });

    return () => { active = false; };
  }, [supabase, treeId, user]);

  const filteredPeople = useMemo(
    () =>
      people.filter((person) =>
        `${person.name} ${person.role} ${person.place}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [people, search]
  );

  async function requestSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    setAuthMessage("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: authEmail.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setAuthError(error.message);
      else setAuthMessage("Check your email for a secure sign-in link. You can use it to sign in or create your account.");
    } catch (error: unknown) {
      setAuthError(errorMessage(error, "Could not send the sign-in link. Please try again."));
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) setAuthError(error.message);
    } catch (error: unknown) {
      setAuthError(errorMessage(error, "Could not sign out. Please try again."));
    } finally {
      setAuthBusy(false);
    }
  }

  async function createFamilyTree() {
    if (!user) return;
    setPersonBusy(true);
    setDataError("");
    try {
      const { data, error } = await supabase
        .from("family_trees")
        .insert({ name: "My family tree", created_by: user.id })
        .select("*")
        .single();
      if (error) {
        setDataError(`Could not create a family tree: ${error.message}. Check the table columns and RLS insert policy.`);
      } else {
        const created = data as Record<string, unknown>;
        const createdId = String(created.id);
        setFamilyTrees((current) => [...current, { id: createdId, name: String(created.name ?? "My family tree"), is_discoverable: Boolean(created.is_discoverable) }]);
        setTreeId(createdId);
        setCloudConnected(true);
        setPeople([]);
        setRelationships([]);
      }
    } catch (error: unknown) {
      setDataError(`Could not create a family tree: ${errorMessage(error, "request failed")}`);
    } finally {
      setPersonBusy(false);
    }
  }

  async function renameFamilyTree(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!treeId || !treeNameDraft.trim()) return;
    setPersonBusy(true);
    const { error } = await supabase.from("family_trees")
      .update({ name: treeNameDraft.trim() })
      .eq("id", treeId);
    if (error) {
      setDataError(`Could not rename this family tree: ${error.message}`);
    } else {
      setFamilyTrees((current) => current.map((tree) => tree.id === treeId ? { ...tree, name: treeNameDraft.trim() } : tree));
      setShowTreeSettings(false);
    }
    setPersonBusy(false);
  }

  async function deleteFamilyTree() {
    if (!treeId || !window.confirm("Delete this family tree? Its linked people, relationships, stories, memories, and photos will also be permanently deleted. This cannot be undone.")) return;
    setPersonBusy(true);
    const photoCleanupError = await removeFamilyPhotosForTree(treeId);
    if (photoCleanupError) {
      setDataError(`Could not remove this tree's photos: ${photoCleanupError}`);
      setPersonBusy(false);
      return;
    }
    const { error } = await supabase.from("family_trees").delete().eq("id", treeId);
    if (error) {
      setDataError(`Could not delete this family tree: ${error.message}`);
    } else {
      const remaining = familyTrees.filter((tree) => tree.id !== treeId);
      setFamilyTrees(remaining);
      setTreeId(remaining[0]?.id ?? null);
      setPeople([]);
      setRelationships([]);
      setShowTreeSettings(false);
    }
    setPersonBusy(false);
  }

  async function setTreeDiscoverability(discoverable: boolean) {
    if (!user || !treeId) return;
    if (discoverable && !window.confirm("Share this tree in Discover? Anyone browsing Roots will be able to see its name, family member names, and parent-child links. Dates, places, biographies, photos, stories, and memories remain private.")) return;
    setPersonBusy(true);
    setDataError("");
    setSettingsNotice("");
    try {
      const { error } = await supabase.from("family_trees")
        .update({ is_discoverable: discoverable })
        .eq("id", treeId);
      if (error) {
        setDataError(`Could not update sharing: ${error.message}`);
        return;
      }
      setFamilyTrees((current) => current.map((tree) => tree.id === treeId ? { ...tree, is_discoverable: discoverable } : tree));
      setSettingsNotice(discoverable ? "This tree is now listed in Discover." : "This tree is private and no longer listed in Discover.");
    } catch (error: unknown) {
      setDataError(`Could not update sharing: ${errorMessage(error, "request failed")}`);
    } finally {
      setPersonBusy(false);
    }
  }

  async function clearFamilyHistory() {
    if (!user || !treeId || clearHistoryConfirmation.trim() !== "CLEAR") return;
    setPersonBusy(true);
    setDataError("");
    setSettingsNotice("");
    try {
      const photoCleanupError = await removeFamilyPhotosForTree(treeId);
      if (photoCleanupError) {
        setDataError(`Could not clear family photos: ${photoCleanupError}`);
        return;
      }
      const { error } = await supabase.rpc("clear_family_tree_history", { tree_id_input: treeId });
      if (error) {
        setDataError(`Could not clear this family history: ${error.message}. Apply the latest Roots migration if this function is missing.`);
        return;
      }
      setPeople([]);
      setRelationships([]);
      setStoryCounts({ stories: 0, memories: 0 });
      setClearHistoryConfirmation("");
      setShowClearHistory(false);
      setSettingsNotice("People, family links, stories, memories, and photos were cleared. The family tree itself remains.");
    } catch (error: unknown) {
      setDataError(`Could not clear this family history: ${errorMessage(error, "request failed")}`);
    } finally {
      setPersonBusy(false);
    }
  }

  async function deleteAccount() {
    if (!user || deleteAccountConfirmation.trim() !== "DELETE") return;
    setPersonBusy(true);
    setDataError("");
    try {
      const { error } = await supabase.functions.invoke("delete-account", {
        body: { confirmation: "DELETE" },
      });
      if (error) {
        setDataError(`Could not delete your account: ${error.message}. Make sure the delete-account Supabase function is deployed.`);
        return;
      }

      await supabase.auth.signOut({ scope: "local" });
      authUserIdRef.current = null;
      setUser(null);
      setFamilyTrees([]);
      setTreeId(null);
      setPeople(initialPeople);
      setRelationships([]);
      setCloudConnected(false);
      setDeleteAccountConfirmation("");
      setShowDeleteAccount(false);
      setActivePage("Overview");
    } catch (error: unknown) {
      setDataError(`Could not delete your account: ${errorMessage(error, "request failed")}. Make sure the delete-account Supabase function is deployed.`);
    } finally {
      setPersonBusy(false);
    }
  }

  async function removeFamilyPhotosForTree(selectedTreeId: string): Promise<string | null> {
    const { data, error } = await supabase.from("people").select("photo_path").eq("tree_id", selectedTreeId);
    if (error) return error.message;
    const rows = (data ?? []) as { photo_path?: string | null }[];
    const paths = rows.map((person) => person.photo_path).filter((path): path is string => Boolean(path));
    if (!paths.length) return null;
    const { error: removeError } = await supabase.storage.from("family-photos").remove(paths);
    return removeError?.message ?? null;
  }

  async function exportFamilyData() {
    if (!user || !treeId) return;
    setPersonBusy(true);
    setDataError("");
    try {
      const [peopleResult, relationshipsResult, storiesResult] = await Promise.all([
        supabase.from("people").select("*").eq("tree_id", treeId),
        supabase.from("relationships").select("*").eq("tree_id", treeId),
        supabase.from("family_stories").select("*").eq("tree_id", treeId),
      ]);
      const exportError = peopleResult.error ?? relationshipsResult.error ?? storiesResult.error;
      if (exportError) {
        setDataError(`Could not export your family data: ${exportError.message}`);
        return;
      }

      const tree = familyTrees.find((item) => item.id === treeId);
      const archive = {
        format: "Roots family archive",
        version: 1,
        exported_at: new Date().toISOString(),
        family_tree: tree ?? { id: treeId, name: "My family tree" },
        people: peopleResult.data ?? [],
        relationships: relationshipsResult.data ?? [],
        stories_and_memories: storiesResult.data ?? [],
      };
      const file = new Blob([JSON.stringify(archive, null, 2)], { type: "application/json" });
      const objectUrl = URL.createObjectURL(file);
      const link = document.createElement("a");
      const safeName = (tree?.name ?? "my-family-tree").trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
      link.href = objectUrl;
      link.download = `${safeName || "my-family-tree"}-roots-backup.json`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error: unknown) {
      setDataError(`Could not export your family data: ${errorMessage(error, "request failed")}`);
    } finally {
      setPersonBusy(false);
    }
  }

  async function addPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!personName.trim()) return;
    if (!user) {
      setAuthError("");
      setShowAuth(true);
      return;
    }
    if (!treeId) {
      setShowAdd(false);
      setDataError(dataError || "Create a family tree first. Your form details are saved here; open Add family member again after creating the tree.");
      return;
    }

    const name = personName.trim();
    setPersonBusy(true);
    setDataError("");

    try {
      const personFields = {
        full_name: name,
        birthplace: personPlace.trim() || null,
        birth_date: personBirthDate || null,
        death_date: personDeathDate || null,
      };
      const mutation = editingPersonId === null
        ? supabase.from("people").insert({ tree_id: treeId, ...personFields })
        : supabase.from("people").update(personFields)
            .eq("id", editingPersonId)
            .eq("tree_id", treeId);
      const { data: savedPerson, error } = await mutation.select("id").single();

      if (error) {
        setDataError(`Could not save this person: ${error.message}. Check the people table columns and RLS policy.`);
        return;
      }

      if (editingPersonId === null && relatedPersonId) {
        const newPersonId = String((savedPerson as Record<string, unknown>).id);
        const parentId = relationshipDirection === "parent" ? newPersonId : relatedPersonId;
        const childId = relationshipDirection === "parent" ? relatedPersonId : newPersonId;
        const { error: relationshipError } = await supabase.from("relationships").insert({
          tree_id: treeId,
          parent_id: parentId,
          child_id: childId,
        });
        if (relationshipError) {
          setDataError(`The person was saved, but the family link could not be created: ${relationshipError.message}`);
        }
      }

      const [refreshedPeople, refreshedRelationships] = await Promise.all([
        supabase.from("people").select("*").eq("tree_id", treeId),
        supabase.from("relationships").select("*").eq("tree_id", treeId),
      ]);
      if (refreshedPeople.error || refreshedRelationships.error) {
        const refreshError = refreshedPeople.error ?? refreshedRelationships.error;
        setDataError(`The change was saved, but the list could not refresh: ${refreshError?.message ?? "unknown error"}`);
      } else {
        const loadedRelationships = (refreshedRelationships.data ?? []) as FamilyRelationship[];
        setRelationships(loadedRelationships);
        setPeople(normalizePersonRows((refreshedPeople.data ?? []) as Record<string, unknown>[], loadedRelationships));
      }

      setPersonName("");
      setPersonPlace("");
      setPersonBirthDate("");
      setPersonDeathDate("");
      setRelatedPersonId("");
      setRelationshipDirection("child");
      setEditingPersonId(null);
      setShowAdd(false);
      setActivePage("People");
    } catch (error: unknown) {
      setDataError(`Could not save this person: ${errorMessage(error, "request failed")}`);
    } finally {
      setPersonBusy(false);
    }
  }

  async function deletePerson(person: Person) {
    if (typeof person.id === "number" || String(person.id).startsWith("person-")) return;
    setPersonBusy(true);
    setDataError("");
    const { error } = await supabase
      .from("people")
      .delete()
      .eq("id", person.id)
      .eq("tree_id", treeId);
    if (error) {
      setDataError(`Could not delete this person: ${error.message}`);
    } else {
      if (person.photoPath) {
        const { error: photoError } = await supabase.storage.from("family-photos").remove([person.photoPath]);
        if (photoError) setDataError(`The person was deleted, but their photo file could not be removed: ${photoError.message}`);
      }
      const updatedRelationships = relationships.filter((relationship) =>
        relationship.parent_id !== String(person.id) && relationship.child_id !== String(person.id)
      );
      setRelationships(updatedRelationships);
      setPeople((current) => current.filter((item) => item.id !== person.id).map((item) => ({
        ...item,
        role: relationshipRole(item.id, updatedRelationships),
      })));
    }
    setPersonBusy(false);
  }

  async function addRelationship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!treeId || !relationshipParentId || !relationshipChildId) return;
    if (relationshipParentId === relationshipChildId) {
      setDataError("A person cannot be their own parent.");
      return;
    }

    setPersonBusy(true);
    setDataError("");
    try {
      const { data, error } = await supabase.from("relationships").insert({
        tree_id: treeId,
        parent_id: relationshipParentId,
        child_id: relationshipChildId,
      }).select("id").single();

      if (error) {
        setDataError(`Could not add this family connection: ${error.message}`);
        return;
      }

      const link: FamilyRelationship = {
        id: String((data as Record<string, unknown>).id),
        tree_id: treeId,
        parent_id: relationshipParentId,
        child_id: relationshipChildId,
      };
      const updatedRelationships = [...relationships, link];
      setRelationships(updatedRelationships);
      setPeople((current) => current.map((person) => ({
        ...person,
        role: relationshipRole(person.id, updatedRelationships),
      })));
      setRelationshipParentId("");
      setRelationshipChildId("");
    } catch (error: unknown) {
      setDataError(`Could not add this family connection: ${errorMessage(error, "request failed")}`);
    } finally {
      setPersonBusy(false);
    }
  }

  async function deleteRelationship(relationship: FamilyRelationship) {
    if (!treeId || !window.confirm("Remove this parent-child connection?")) return;
    setPersonBusy(true);
    setDataError("");
    try {
      const { error } = await supabase.from("relationships")
        .delete()
        .eq("id", relationship.id)
        .eq("tree_id", treeId);
      if (error) {
        setDataError(`Could not remove this family connection: ${error.message}`);
        return;
      }

      const updatedRelationships = relationships.filter((item) => item.id !== relationship.id);
      setRelationships(updatedRelationships);
      setPeople((current) => current.map((person) => ({
        ...person,
        role: relationshipRole(person.id, updatedRelationships),
      })));
    } catch (error: unknown) {
      setDataError(`Could not remove this family connection: ${errorMessage(error, "request failed")}`);
    } finally {
      setPersonBusy(false);
    }
  }

  function editPerson(person: Person) {
    setEditingPersonId(person.id);
    setPersonName(person.name);
    setPersonPlace(person.place === "Location not added" ? "" : person.place);
    setPersonBirthDate(person.birthDate ?? "");
    setPersonDeathDate(person.deathDate ?? "");
    setShowAdd(true);
  }

  return (
    <main className="min-h-screen bg-[#F7F7F2] text-[#202B24]">
      <div className="flex min-h-screen">
        {sidebarOpen && (
          <button
            aria-label="Close navigation"
            className="fixed inset-0 z-30 bg-black/30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[265px] flex-col overflow-hidden border-r border-[#E7E8DF] bg-white transition-all duration-200 lg:sticky lg:top-0 lg:h-screen lg:min-w-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } ${desktopSidebarCollapsed ? "lg:w-0 lg:border-r-0" : "lg:w-[265px]"}`}
        >
          <div className="flex h-[86px] shrink-0 items-center justify-between border-b border-[#ECEDE6] bg-white px-6">
            <button
              type="button"
              onClick={() => {
                setActivePage("Overview");
                setSidebarOpen(false);
              }}
              className="flex items-center gap-3 text-left"
            >
              <span className="flex size-10 items-center justify-center rounded-2xl bg-[#254C3B] text-white">
                <TreeDeciduous size={25} />
              </span>
              <span>
                <span className="block text-xl font-bold tracking-tight">
                  roots<span className="text-[#79977D]">.</span>
                </span>
                <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-[#8A9188]">
                  Your story lives on
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSidebarOpen(false);
                setDesktopSidebarCollapsed(true);
              }}
              className="shrink-0 rounded-lg p-2 text-stone-500 hover:bg-[#F3F4EF] hover:text-[#254C3B]"
              aria-label="Close sidebar"
              title="Close sidebar"
            >
              <X size={19} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-6 pb-4">
            <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A9E94]">
              WORKSPACE
            </p>
            <div className="mb-6 rounded-2xl border border-[#E7E9E0] bg-[#FAFAF6] p-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#DDE9DC] text-[#31583E]">
                  <GitBranch size={20} />
                </div>
                <button
                  type="button"
                  aria-expanded={workspaceMenuOpen}
                  aria-controls="workspace-tree-menu"
                  onClick={() => setWorkspaceMenuOpen((open) => !open)}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-[#477756]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {familyTrees.find((tree) => tree.id === treeId)?.name ?? "My family tree"}
                    </span>
                    <span className="mt-0.5 block text-xs text-[#858C80]">
                      {user ? `${familyTrees.length || 0} private ${familyTrees.length === 1 ? "tree" : "trees"}` : "Personal workspace"}
                    </span>
                  </span>
                  <ChevronDown size={15} className={`shrink-0 text-[#858C80] transition-transform ${workspaceMenuOpen ? "rotate-180" : ""}`} />
                </button>
              </div>
              {workspaceMenuOpen && (
                <div id="workspace-tree-menu" className="mt-3 space-y-1 rounded-xl border border-[#E7E9E0] bg-white p-2" aria-label="Family tree workspace menu">
                  {familyTrees.length > 0 ? familyTrees.map((tree) => (
                    <button
                      key={tree.id}
                      type="button"
                      onClick={() => {
                        if (tree.id !== treeId) {
                          setDataLoading(true);
                          setDataError("");
                          setTreeId(tree.id);
                        }
                        setWorkspaceMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs ${tree.id === treeId ? "bg-[#E8F0E6] font-semibold text-[#254C3B]" : "text-[#596456] hover:bg-[#F6F7F1]"}`}
                    >
                      <span className="truncate">{tree.name}</span>
                      {tree.id === treeId && <span aria-label="Current tree">✓</span>}
                    </button>
                  )) : (
                    <p className="px-2 py-2 text-xs leading-5 text-[#777F73]">{user ? "No family trees yet." : "Your personal workspace is using demo data."}</p>
                  )}
                  {user ? (
                    <button type="button" onClick={() => { setWorkspaceMenuOpen(false); void createFamilyTree(); }} disabled={personBusy} className="w-full rounded-lg px-2 py-2 text-left text-xs font-semibold text-[#315B3F] hover:bg-[#F6F7F1] disabled:opacity-50">+ Create family tree</button>
                  ) : (
                    <button type="button" onClick={() => { setWorkspaceMenuOpen(false); setShowAuth(true); }} className="w-full rounded-lg px-2 py-2 text-left text-xs font-semibold text-[#315B3F] hover:bg-[#F6F7F1]">Sign in to save your family tree</button>
                  )}
                </div>
              )}
              {user && treeId && (
                <button onClick={() => { setTreeNameDraft(familyTrees.find((tree) => tree.id === treeId)?.name ?? "My family tree"); setShowTreeSettings(true); }} className="mt-2 px-1 text-[10px] font-semibold text-[#426A4A] hover:text-[#254C3B]">Manage family tree</button>
              )}
            </div>

            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = activePage === item.label;

                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      setActivePage(item.label);
                      setSidebarOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium transition ${
                      active
                        ? "bg-[#E8F0E6] text-[#254C3B]"
                        : "text-[#737A70] hover:bg-[#F6F7F1] hover:text-[#254C3B]"
                    }`}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    <span className="flex-1">{item.label}</span>
                    {active && (
                      <span className="size-1.5 rounded-full bg-[#477756]" />
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="my-6 border-t border-[#ECEDE6]" />

            <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A9E94]">
              YOUR SPACE
            </p>

            <button
              onClick={() => setActivePage("Discover")}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium ${
                activePage === "Discover"
                  ? "bg-[#E8F0E6] text-[#254C3B]"
                  : "text-[#737A70] hover:bg-[#F6F7F1]"
              }`}
            >
              <Compass size={18} strokeWidth={1.8} />
              Discover
            </button>

            <button
              onClick={() => setActivePage("Settings")}
              className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium ${
                activePage === "Settings"
                  ? "bg-[#E8F0E6] text-[#254C3B]"
                  : "text-[#737A70] hover:bg-[#F6F7F1]"
              }`}
            >
              <Settings2 size={18} strokeWidth={1.8} />
              Settings
            </button>
          </div>

          <div className="shrink-0 border-t border-[#ECEDE6] bg-white p-4">
            <div className="rounded-2xl bg-[#F3F3EB] p-4">
              <div className="mb-2 flex size-9 items-center justify-center rounded-xl bg-white text-[#527858]">
                <Heart size={18} />
              </div>
              <p className="text-sm font-semibold">Every story matters.</p>
              <p className="mt-1 text-xs leading-5 text-[#737A70]">
                Preserve a memory today for the generations that follow.
              </p>
              <button
                onClick={() => setActivePage("Stories & memories")}
                className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#315B3F]"
              >
                Explore memories <ArrowRight size={13} />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3 px-2 py-2">
              <div className="flex size-9 items-center justify-center rounded-full bg-[#D9E5D5] text-xs font-bold text-[#315B3F]">
                Y
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">Your account</p>
                <p className="text-[11px] text-[#8A9188]">
                  Demo workspace
                </p>
              </div>
              <ChevronDown size={15} className="text-[#8A9188]" />
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[74px] items-center justify-between border-b border-[#E7E8DF] bg-[#F7F7F2]/95 px-5 backdrop-blur-md sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => {
                  setDesktopSidebarCollapsed(false);
                  setSidebarOpen(true);
                }}
                aria-label="Open navigation"
                title="Open navigation"
                className={`rounded-xl border border-[#E5E7DD] bg-white p-2 ${desktopSidebarCollapsed ? "" : "lg:hidden"}`}
              >
                <Menu size={19} />
              </button>
              <div className="hidden items-center gap-2 text-xs text-[#8A9188] sm:flex">
                <span>Workspace</span>
                <ChevronRight size={13} />
                <span className="font-semibold text-[#34483A]">
                  {activePage}
                </span>
              </div>
              <h1 className="truncate text-sm font-semibold sm:hidden">
                {activePage}
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <label className="hidden w-[230px] items-center gap-2 rounded-xl border border-[#E4E6DD] bg-white px-3 py-2.5 md:flex">
                <Search size={16} className="text-[#969B90]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search your family..."
                  className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[#A3A79E]"
                />
                <span className="rounded border border-[#E9EAE3] px-1.5 py-0.5 text-[9px] text-[#92978E]">
                  /
                </span>
              </label>
              {user ? (
                <>
                  <span className="hidden max-w-[170px] truncate text-xs text-[#637064] sm:block">{user.email}</span>
                  <button onClick={() => void signOut()} disabled={authBusy} className="rounded-xl border border-[#E5E7DD] bg-white px-3 py-2.5 text-xs font-semibold text-[#526354] hover:bg-[#F9FAF6] disabled:opacity-60">Sign out</button>
                </>
              ) : (
                <button onClick={() => setShowAuth(true)} disabled={authLoading} className="rounded-xl bg-[#254C3B] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#1C3D2E] disabled:opacity-60">{authLoading ? "Checking…" : "Sign in"}</button>
              )}
            </div>
          </header>

          <div className="mx-auto max-w-[1450px] px-5 py-7 sm:px-8 sm:py-9">
            {dataLoading && <div className="mb-5 rounded-xl border border-[#DCE6D8] bg-white px-4 py-3 text-xs text-[#527456]">Loading your family data…</div>}
            {dataError && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">{dataError}</div>}
            {user && !dataLoading && cloudConnected && !treeId && (
              <div className="mb-5 flex flex-col items-start justify-between gap-3 rounded-xl border border-[#DCE6D8] bg-white px-4 py-4 sm:flex-row sm:items-center">
                <div><p className="text-sm font-semibold">Your account is ready</p><p className="mt-1 text-xs text-[#777F73]">Create a family tree to start saving people to your private workspace.</p></div>
                <button onClick={() => void createFamilyTree()} disabled={personBusy} className="rounded-lg bg-[#254C3B] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">{personBusy ? "Creating…" : "Create family tree"}</button>
              </div>
            )}
            {activePage === "Stories & memories" ? (
              <StoriesMemories
                treeId={treeId}
                signedIn={Boolean(user)}
                people={people}
                onCountsChange={handleStoryCountsChange}
                onRequestSignIn={() => setShowAuth(true)}
              />
            ) : activePage === "Discover" ? (
              <DiscoverTrees />
            ) : activePage === "Timeline" ? (
              <Timeline treeId={treeId} signedIn={Boolean(user)} people={people} onRequestSignIn={() => setShowAuth(true)} />
            ) : activePage === "Photo archive" ? (
              <PhotoArchive treeId={treeId} signedIn={Boolean(user)} people={people} onPhotoPathChange={handlePersonPhotoChange} onRequestSignIn={() => setShowAuth(true)} />
            ) : activePage === "Overview" ? (
              <>
                <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                  <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DCE6D8] bg-[#EDF3E9] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#42684B]">
                      <Sparkles size={13} />
                      YOUR FAMILY LEGACY
                    </div>
                    <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[39px]">
                      Every root has a story.
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-[#777F73]">
                      Welcome to your family&apos;s living archive. Start
                      with what you know, and let every generation add a
                      little more to the story.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAdd(true)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#254C3B] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1C3D2E]"
                  >
                    <Plus size={17} />
                    Add family member
                  </button>
                </div>

                <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: "Family members",
                      value: people.length,
                      note: "People in this demo",
                      icon: Users,
                    },
                    {
                      label: "Generations",
                      value: people.length >= 3 ? "3" : "1",
                      note: "Sample generation count",
                      icon: GitBranch,
                    },
                    {
                      label: "Family stories",
                      value: storyCounts.stories,
                      note: storyCounts.stories === 1 ? "Saved story" : "Saved stories",
                      icon: BookOpen,
                    },
                    {
                      label: "Memories",
                      value: storyCounts.memories,
                      note: storyCounts.memories === 1 ? "Saved memory" : "Saved memories",
                      icon: Camera,
                    },
                  ].map((stat) => {
                    const Icon = stat.icon;

                    return (
                      <div
                        key={stat.label}
                        className="rounded-2xl border border-[#E6E7DE] bg-white p-5"
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-medium text-[#7E8579]">
                            {stat.label}
                          </span>
                          <span className="flex size-9 items-center justify-center rounded-xl bg-[#F0F3EB] text-[#527456]">
                            <Icon size={18} />
                          </span>
                        </div>
                        <div className="mt-4 flex items-end justify-between gap-2">
                          <span className="text-3xl font-semibold tracking-tight">
                            {stat.value}
                          </span>
                          <span className="pb-1 text-right text-[10px] text-[#93998F]">
                            {stat.note}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mb-8 grid gap-6 xl:grid-cols-[1.65fr_1fr]">
                  <section className="overflow-hidden rounded-2xl border border-[#E5E7DD] bg-white">
                    <div className="flex items-center justify-between border-b border-[#ECEDE6] px-5 py-5 sm:px-6">
                      <div>
                        <h3 className="text-base font-semibold">
                          Your family tree
                        </h3>
                        <p className="mt-1 text-xs text-[#888F84]">
                          A glimpse of the generations before you
                        </p>
                      </div>
                      <button
                        onClick={() => setActivePage("Family tree")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E8DF] px-3 py-2 text-xs font-semibold hover:bg-[#F7F8F3]"
                      >
                        Explore tree <ArrowRight size={14} />
                      </button>
                    </div>

                    <div className="relative overflow-hidden bg-[#FAFAF6] p-5 sm:p-7">
                      <div className="pointer-events-none absolute inset-0 opacity-40">
                        <div
                          className="h-full w-full"
                          style={{
                            backgroundImage:
                              "radial-gradient(#AEBBA9 0.8px, transparent 0.8px)",
                            backgroundSize: "18px 18px",
                          }}
                        />
                      </div>

                      <div className="relative mx-auto flex max-w-[530px] flex-col items-center gap-3 py-3">
                        <div className="mb-1 rounded-full border border-[#D9E4D4] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#5C7C5F]">
                          Previous generation
                        </div>

                        <div className="grid w-full grid-cols-2 gap-3">
                          {people.slice(0, 2).map((person) => (
                            <button
                              key={person.id}
                              onClick={() => {
                                setSearch(person.name);
                                setActivePage("People");
                              }}
                              className="flex min-w-0 flex-col items-center rounded-2xl border border-[#E3E7DC] bg-white p-4 text-center shadow-[0_4px_16px_rgba(34,54,38,0.03)] transition hover:border-[#9FB89B] hover:shadow-sm"
                            >
                              <span
                                className={`mb-3 flex size-12 items-center justify-center rounded-full text-sm font-bold ${person.color}`}
                              >
                                {person.initials}
                              </span>
                              <span className="line-clamp-2 text-xs font-semibold">
                                {person.name}
                              </span>
                              <span className="mt-1 text-[10px] text-[#858D80]">
                                {person.role}
                              </span>
                            </button>
                          ))}
                        </div>

                        <div className="flex h-9 flex-col items-center">
                          <span className="h-5 w-px bg-[#9BB399]" />
                          <span className="flex size-7 items-center justify-center rounded-full border border-[#D7E3D2] bg-white text-[#557A56]">
                            <ArrowDownRight size={15} />
                          </span>
                        </div>

                        <div className="w-[58%] rounded-2xl border border-[#A8BEA1] bg-[#EAF1E5] p-4 text-center shadow-sm">
                          <span className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-white text-sm font-bold text-[#315B3F]">
                            {people[2]?.initials ?? "YN"}
                          </span>
                          <p className="text-xs font-bold">
                            {people[2]?.name ?? "Your name"}
                          </p>
                          <p className="mt-1 text-[10px] text-[#69806A]">
                            Your generation
                          </p>
                        </div>

                        <p className="mt-3 max-w-xs text-center text-[10px] leading-5 text-[#8B9287]">
                          Illustrative preview — add verified relationships
                          to build your real family tree.
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-2xl border border-[#E5E7DD] bg-white">
                    <div className="flex items-center justify-between border-b border-[#ECEDE6] px-5 py-5">
                      <div>
                        <h3 className="text-base font-semibold">
                          Preserve a memory
                        </h3>
                        <p className="mt-1 text-xs text-[#888F84]">
                          Small details become family history.
                        </p>
                      </div>
                      <Heart size={19} className="text-[#789175]" />
                    </div>

                    <div className="p-5">
                      <div className="mb-4 rounded-2xl bg-[#F4F3EB] p-5">
                        <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-white text-[#557A56]">
                          <BookOpen size={20} />
                        </div>
                        <h4 className="text-sm font-semibold">
                          Every elder holds a story.
                        </h4>
                        <p className="mt-2 text-xs leading-5 text-[#777F73]">
                          Record a relative&apos;s memories, traditions,
                          birthplace, or the story behind an old photograph.
                        </p>
                      </div>

                      <button
                        onClick={() => setActivePage("Stories & memories")}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#DDE4D8] py-3 text-xs font-semibold text-[#315B3F] transition hover:bg-[#F5F8F1]"
                      >
                        <Plus size={15} /> Start a family story
                      </button>

                      <button
                        onClick={() => setActivePage("Photo archive")}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[#E8E9E1] py-3 text-xs font-semibold text-[#646E62] transition hover:bg-[#F9F9F5]"
                      >
                        <ImagePlus size={15} /> Explore photo archive
                      </button>
                    </div>
                  </section>
                </div>

                <section className="overflow-hidden rounded-2xl border border-[#E5E7DD] bg-white">
                  <div className="flex flex-col justify-between gap-3 border-b border-[#ECEDE6] px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                    <div>
                      <h3 className="text-base font-semibold">
                        Family directory
                      </h3>
                      <p className="mt-1 text-xs text-[#888F84]">
                        The people whose stories shape your history
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex min-w-0 items-center gap-2 rounded-lg border border-[#E4E6DD] px-3 py-2 sm:w-[210px]">
                        <Search size={15} className="shrink-0 text-[#92998D]" />
                        <input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search people..."
                          className="min-w-0 flex-1 bg-transparent text-xs outline-none"
                        />
                      </label>
                      <button
                        onClick={() => setShowAdd(true)}
                        aria-label="Add family member"
                        className="rounded-lg bg-[#254C3B] p-2.5 text-white hover:bg-[#1C3D2E]"
                      >
                        <Plus size={17} />
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-[#EFF0E9]">
                    {filteredPeople.map((person) => (
                      <div
                        key={person.id}
                        className="flex items-center gap-3 px-5 py-4 transition hover:bg-[#FBFBF8] sm:gap-4 sm:px-6"
                      >
                        <PersonPortrait person={person} size="small" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold sm:text-sm">
                            {person.name}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-[#858D80]">
                            {person.role} · {person.place}
                          </p>
                        </div>
                        <span className="hidden text-[10px] text-[#92998D] sm:block">
                          {person.years}
                        </span>
                        <PersonPhotoButton
                          person={person}
                          treeId={treeId}
                          signedIn={Boolean(user)}
                          onPhotoPathChange={handlePersonPhotoChange}
                          onRequestSignIn={() => setShowAuth(true)}
                        />
                        <button
                          onClick={() => {
                            setSearch(person.name);
                            setActivePage("People");
                          }}
                          aria-label={`View ${person.name}`}
                          className="rounded-lg p-2 text-[#899184] hover:bg-[#EFF3EB] hover:text-[#315B3F]"
                        >
                          <ChevronRight size={17} />
                        </button>
                        {user && cloudConnected && (
                          <>
                            <button onClick={() => editPerson(person)} aria-label={`Edit ${person.name}`} className="rounded-lg p-2 text-[#899184] hover:bg-[#EFF3EB] hover:text-[#315B3F]"><Pencil size={16} /></button>
                            <button onClick={() => void deletePerson(person)} disabled={personBusy} aria-label={`Delete ${person.name}`} className="rounded-lg p-2 text-[#A46B5E] hover:bg-rose-50 disabled:opacity-50"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    ))}

                    {filteredPeople.length === 0 && (
                      <div className="px-6 py-10 text-center">
                        <Search className="mx-auto mb-3 text-[#A1A79B]" />
                        <p className="text-sm font-semibold">
                          No matching family members
                        </p>
                        <p className="mt-1 text-xs text-[#858D80]">
                          Try another name or add a new person.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[#ECEDE6] px-5 py-4 sm:px-6">
                    <button
                      onClick={() => setActivePage("People")}
                      className="flex items-center gap-2 text-xs font-semibold text-[#426A4A] hover:text-[#254C3B]"
                    >
                      View family directory <ArrowRight size={14} />
                    </button>
                  </div>
                </section>

                <footer className="flex flex-col justify-between gap-2 py-7 text-[10px] text-[#959B90] sm:flex-row sm:items-center">
                  <span>Roots · A home for every family story.</span>
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={13} />
                    {user ? (cloudConnected ? "Signed in · Private family data" : "Signed in · Data connection needs attention") : "Demo workspace · Sign in to save family data"}
                  </span>
                </footer>
              </>
            ) : (
              <section className="mx-auto max-w-3xl py-12 sm:py-20">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-[#E8F0E6] text-[#315B3F]">
                  {activePage === "Family tree" ? (
                    <GitBranch size={27} />
                  ) : activePage === "People" ? (
                    <Users size={27} />
                  ) : activePage === "Stories & memories" ? (
                    <BookOpen size={27} />
                  ) : activePage === "Photo archive" ? (
                    <Camera size={27} />
                  ) : activePage === "Timeline" ? (
                    <Clock3 size={27} />
                  ) : activePage === "Discover" ? (
                    <Globe2 size={27} />
                  ) : (
                    <Settings2 size={27} />
                  )}
                </div>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#638166]">
                  ROOTS WORKSPACE
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                  {activePage}
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-[#777F73]">
                  {activePage === "Family tree"
                    ? "Manage parent-child connections in your family tree. Connections are private to this tree."
                    : activePage === "People"
                      ? "Manage the people in your family history. Search the current demo directory or add another person."
                      : activePage === "Stories & memories"
                        ? "Preserve the stories, traditions, and memories that deserve to be passed down."
                        : activePage === "Photo archive"
                          ? "Create a home for family portraits and historical photographs."
                          : activePage === "Timeline"
                            ? "Bring important family events together in a chronological view."
                            : activePage === "Discover"
                              ? "Browse family trees their owners chose to share. Private family details stay hidden."
                              : activePage === "Settings"
                                ? "Manage your account, family tree, privacy, and data backup."
                                : "A future space for your family history."}
                </p>

                {activePage === "People" && (
                  <div className="mt-8 space-y-3">
                    <button
                      onClick={() => setShowAdd(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#254C3B] px-4 py-3 text-sm font-semibold text-white"
                    >
                      <Plus size={17} /> Add family member
                    </button>
                    {filteredPeople.map((person) => (
                      <div
                        key={person.id}
                        className="flex items-center gap-3 rounded-xl border border-[#E5E7DD] bg-white p-4"
                      >
                        <PersonPortrait person={person} size="small" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{person.name}</p>
                          <p className="mt-1 text-xs text-[#858D80]">
                            {person.role} · {person.place}
                          </p>
                        </div>
                        <PersonPhotoButton
                          person={person}
                          treeId={treeId}
                          signedIn={Boolean(user)}
                          onPhotoPathChange={handlePersonPhotoChange}
                          onRequestSignIn={() => setShowAuth(true)}
                        />
                        {user && cloudConnected && (
                          <>
                            <button onClick={() => editPerson(person)} aria-label={`Edit ${person.name}`} className="rounded-lg p-2 text-[#899184] hover:bg-[#EFF3EB] hover:text-[#315B3F]"><Pencil size={16} /></button>
                            <button onClick={() => void deletePerson(person)} disabled={personBusy} aria-label={`Delete ${person.name}`} className="rounded-lg p-2 text-[#A46B5E] hover:bg-rose-50 disabled:opacity-50"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activePage === "Family tree" && (
                  <div className="mt-8 rounded-2xl border border-[#E4E7DC] bg-white p-5 sm:p-6">
                    <h3 className="text-base font-semibold">Parent-child connections</h3>
                    <p className="mt-1 text-xs text-[#858D80]">Add or remove links between people in this family tree.</p>
                    {user && cloudConnected ? (
                      <>
                        {people.length > 1 && (
                          <form onSubmit={addRelationship} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
                            <label className="text-xs font-semibold">Parent
                              <select required value={relationshipParentId} onChange={(event) => setRelationshipParentId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#DFE3D9] bg-white px-3 py-3 text-sm font-normal">
                                <option value="">Choose a parent</option>
                                {people.map((person) => <option key={person.id} value={String(person.id)}>{person.name}</option>)}
                              </select>
                            </label>
                            <div className="hidden pb-3 text-xs text-[#8A9188] sm:block">is parent of</div>
                            <label className="text-xs font-semibold">Child
                              <select required value={relationshipChildId} onChange={(event) => setRelationshipChildId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#DFE3D9] bg-white px-3 py-3 text-sm font-normal">
                                <option value="">Choose a child</option>
                                {people.map((person) => <option key={person.id} value={String(person.id)}>{person.name}</option>)}
                              </select>
                            </label>
                            <button type="submit" disabled={personBusy || !relationshipParentId || !relationshipChildId} className="rounded-xl bg-[#254C3B] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Add link</button>
                          </form>
                        )}
                        {relationships.length ? (
                          <div className="mt-5 divide-y divide-[#EFF0E9] rounded-xl border border-[#ECEDE6]">
                            {relationships.map((relationship) => {
                              const parent = people.find((person) => String(person.id) === relationship.parent_id);
                              const child = people.find((person) => String(person.id) === relationship.child_id);
                              return (
                                <div key={relationship.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                                  {parent && <PersonPortrait person={parent} size="small" />}
                                  <span className="min-w-0 flex-1 truncate font-medium">{parent?.name ?? "Family member"} <span className="font-normal text-[#858D80]">is parent of</span> {child?.name ?? "Family member"}</span>
                                  {child && <PersonPortrait person={child} size="small" />}
                                  <button onClick={() => void deleteRelationship(relationship)} disabled={personBusy} aria-label={`Remove connection between ${parent?.name ?? "parent"} and ${child?.name ?? "child"}`} className="rounded-lg p-2 text-[#A46B5E] hover:bg-rose-50 disabled:opacity-50"><Trash2 size={15} /></button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="mt-5 rounded-xl bg-[#F7F8F3] p-4 text-xs text-[#777F73]">No connections yet. Add at least two people, then link a parent to a child.</p>
                        )}
                      </>
                    ) : (
                      <p className="mt-5 rounded-xl bg-[#F7F8F3] p-4 text-xs text-[#777F73]">Sign in and create a family tree to manage its connections.</p>
                    )}
                  </div>
                )}

                {activePage === "Settings" && (
                  <div className="mt-8 grid gap-4">
                    {settingsNotice && <p role="status" className="rounded-xl border border-[#DCE6D8] bg-[#EDF3E9] px-4 py-3 text-xs leading-5 text-[#315B3F]">{settingsNotice}</p>}
                    <section className="rounded-2xl border border-[#E4E7DC] bg-white p-5 sm:p-6">
                      <div className="flex items-start gap-4">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F3EB] text-[#527456]"><ShieldCheck size={19} /></span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold">Account</h3>
                          <p className="mt-1 text-xs text-[#858D80]">{user ? "Signed in with your private Roots account." : "Sign in to manage your saved family data."}</p>
                          {user && <p className="mt-3 truncate text-sm font-medium">{user.email}</p>}
                          <button onClick={() => user ? void signOut() : setShowAuth(true)} disabled={authBusy || authLoading} className="mt-4 rounded-lg border border-[#E1E5DC] px-3 py-2 text-xs font-semibold text-[#47624A] hover:bg-[#F8F9F5] disabled:opacity-50">{authBusy ? "Please wait…" : user ? "Sign out" : "Sign in"}</button>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-[#E4E7DC] bg-white p-5 sm:p-6">
                      <div className="flex items-start gap-4">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F3EB] text-[#527456]"><GitBranch size={19} /></span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold">Family workspace</h3>
                          <p className="mt-1 text-xs text-[#858D80]">{treeId ? familyTrees.find((tree) => tree.id === treeId)?.name ?? "My family tree" : user ? "No family tree selected" : "Demo family"}</p>
                          <p className="mt-2 text-xs text-[#858D80]">{user ? `${familyTrees.length} ${familyTrees.length === 1 ? "tree" : "trees"} · ${people.length} ${people.length === 1 ? "person" : "people"}` : `${people.length} sample family members · sign in to save your own tree`}</p>
                          {user && treeId ? (
                            <button onClick={() => { setTreeNameDraft(familyTrees.find((tree) => tree.id === treeId)?.name ?? "My family tree"); setShowTreeSettings(true); }} className="mt-4 rounded-lg border border-[#E1E5DC] px-3 py-2 text-xs font-semibold text-[#47624A] hover:bg-[#F8F9F5]">Manage family tree</button>
                          ) : user ? (
                            <button onClick={() => void createFamilyTree()} disabled={personBusy || dataLoading} className="mt-4 rounded-lg bg-[#254C3B] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Create family tree</button>
                          ) : <p className="mt-3 text-xs text-[#858D80]">Sign in to manage your family tree.</p>}
                          {user && treeId && (
                            <div className="mt-5 rounded-xl border border-[#ECEDE6] bg-[#FAFAF6] p-4">
                              <label className="flex items-center justify-between gap-4 text-xs font-semibold">
                                <span>List this tree in Discover</span>
                                <input type="checkbox" checked={Boolean(familyTrees.find((tree) => tree.id === treeId)?.is_discoverable)} disabled={personBusy} onChange={(event) => void setTreeDiscoverability(event.target.checked)} className="size-4 accent-[#315B3F]" />
                              </label>
                              <p className="mt-2 text-[11px] leading-5 text-[#777F73]">Off by default. If enabled, visitors can see this tree&apos;s name, member names, and parent-child links. Other details and all stories stay private.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-[#E4E7DC] bg-white p-5 sm:p-6">
                      <div className="flex items-start gap-4">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F3EB] text-[#527456]"><Users size={19} /></span>
                        <div>
                          <h3 className="text-sm font-semibold">Privacy</h3>
                          <p className="mt-1 text-xs leading-5 text-[#777F73]">{user ? "Your trees, people, relationships, stories, and memories are protected by Supabase row-level security. Only the owner can manage data. A tree is visible in Discover only after its owner opts in, and only its name, member names, and parent-child links are shared." : "Sign in to save your own private family history. The sample people shown before sign-in are demo details and are not saved to your account."}</p>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-[#E4E7DC] bg-white p-5 sm:p-6">
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                          <h3 className="text-sm font-semibold">Download a backup</h3>
                          <p className="mt-1 text-xs leading-5 text-[#777F73]">Export the selected tree, people, relationships, and stories as a JSON file.</p>
                        </div>
                        <button onClick={() => void exportFamilyData()} disabled={!user || !treeId || dataLoading || personBusy} className="shrink-0 rounded-lg bg-[#254C3B] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1C3D2E] disabled:cursor-not-allowed disabled:opacity-50">{personBusy ? "Working…" : "Download backup"}</button>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-amber-200 bg-white p-5 sm:p-6">
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                          <h3 className="text-sm font-semibold">Clear family history</h3>
                          <p className="mt-1 max-w-xl text-xs leading-5 text-[#777F73]">Remove all people, connections, stories, memories, and photos from the selected tree. The tree itself remains. This cannot be undone.</p>
                        </div>
                        <button onClick={() => { setClearHistoryConfirmation(""); setShowClearHistory(true); }} disabled={!user || !treeId || personBusy} className="shrink-0 rounded-lg border border-amber-300 px-4 py-2.5 text-xs font-semibold text-amber-900 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50">Clear family history</button>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-rose-200 bg-white p-5 sm:p-6">
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                          <h3 className="text-sm font-semibold text-rose-900">Delete account</h3>
                          <p className="mt-1 max-w-xl text-xs leading-5 text-[#777F73]">Permanently remove your Roots account and all its family trees, people, connections, stories, memories, and photos.</p>
                        </div>
                        <button onClick={() => { setDeleteAccountConfirmation(""); setShowDeleteAccount(true); }} disabled={!user || personBusy} className="shrink-0 rounded-lg bg-rose-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50">Delete account</button>
                      </div>
                    </section>
                  </div>
                )}

                {activePage !== "People" && activePage !== "Family tree" && activePage !== "Settings" && activePage !== "Discover" && (
                  <div className="mt-8 rounded-2xl border border-[#E4E7DC] bg-white p-6">
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#F0F3EB] text-[#527456]">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">
                          Coming in the next build
                        </h3>
                        <p className="mt-2 text-xs leading-5 text-[#7B8376]">
                          This navigation works, but this section is not
                          implemented yet. We&apos;ll connect it to real
                          family data as we build the application.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setActivePage("Overview")}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#426A4A]"
                >
                  <ArrowRight size={16} className="rotate-180" />
                  Back to overview
                </button>
              </section>
            )}
          </div>
        </section>
      </div>

      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#15251B]/45 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowAdd(false);
          }}
        >
          <div className="w-full max-w-md rounded-3xl border border-[#E8E9E0] bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <span className="mb-3 flex size-11 items-center justify-center rounded-xl bg-[#E8F0E6] text-[#315B3F]">
                  <Users size={21} />
                </span>
                <h2 className="text-xl font-semibold tracking-tight">
                  {editingPersonId === null ? "Add a family member" : "Edit family member"}
                </h2>
                <p className="mt-1 text-xs leading-5 text-[#858D80]">
                  Start with the details you know. You can add more later.
                </p>
              </div>
              <button
                onClick={() => setShowAdd(false)}
                aria-label="Close form"
                className="rounded-lg p-2 text-[#858D80] hover:bg-[#F3F4EF]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={addPerson} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold">
                  Full name *
                </label>
                <input
                  required
                  autoFocus
                  value={personName}
                  onChange={(event) => setPersonName(event.target.value)}
                  placeholder="Enter their full name"
                  className="w-full rounded-xl border border-[#DFE3D9] px-4 py-3 text-sm outline-none transition placeholder:text-[#ADB2A7] focus:border-[#6B916E] focus:ring-2 focus:ring-[#DCE9D8]"
                />
              </div>

              {editingPersonId === null && people.length > 0 && (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold">Connect to a family member (optional)</label>
                    <select value={relatedPersonId} onChange={(event) => setRelatedPersonId(event.target.value)} className="w-full rounded-xl border border-[#DFE3D9] bg-white px-4 py-3 text-sm outline-none focus:border-[#6B916E]">
                      <option value="">No relationship yet</option>
                      {people.filter((person) => typeof person.id === "string" && !String(person.id).startsWith("person-")).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                    </select>
                  </div>
                  {relatedPersonId && (
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold">How are they connected?</label>
                      <select value={relationshipDirection} onChange={(event) => setRelationshipDirection(event.target.value as "parent" | "child")} className="w-full rounded-xl border border-[#DFE3D9] bg-white px-4 py-3 text-sm outline-none focus:border-[#6B916E]">
                        <option value="parent">This person is a parent of the selected member</option>
                        <option value="child">This person is a child of the selected member</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold">
                  Birthplace or hometown
                </label>
                <input
                  value={personPlace}
                  onChange={(event) => setPersonPlace(event.target.value)}
                  placeholder="e.g. Bhimapokhara, Baglung, Nepal"
                  className="w-full rounded-xl border border-[#DFE3D9] px-4 py-3 text-sm outline-none transition placeholder:text-[#ADB2A7] focus:border-[#6B916E] focus:ring-2 focus:ring-[#DCE9D8]"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold">Birth date (optional)
                  <input type="date" value={personBirthDate} onChange={(event) => setPersonBirthDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#DFE3D9] bg-white px-4 py-3 text-sm font-normal" />
                </label>
                <label className="text-xs font-semibold">Passing date (optional)
                  <input type="date" value={personDeathDate} onChange={(event) => setPersonDeathDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#DFE3D9] bg-white px-4 py-3 text-sm font-normal" />
                </label>
              </div>

              {dataError && (
                <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800">
                  {dataError}
                </p>
              )}

              <div className="flex gap-3 border-t border-[#ECEDE6] pt-5">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 rounded-xl border border-[#DFE3D9] px-4 py-3 text-sm font-semibold hover:bg-[#F8F9F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={personBusy || authLoading || dataLoading}
                  className="flex-1 rounded-xl bg-[#254C3B] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1C3D2E] disabled:cursor-wait disabled:opacity-60"
                >
                  {personBusy ? "Saving…" : authLoading || dataLoading ? "Loading…" : !user ? "Sign in to save" : !treeId ? "Create a family tree first" : editingPersonId === null ? "Add member" : "Save changes"}
                </button>
              </div>
              <p className="text-center text-[10px] leading-4 text-[#999F94]">
                {!user ? "Click “Sign in to save”, then reopen this form after signing in." : !treeId ? "A family tree is needed before this person can be saved." : "Saved to your authenticated family workspace with Supabase RLS."}
              </p>
            </form>
          </div>
        </div>
      )}

      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15251B]/45 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAuth(false); }}>
          <div className="w-full max-w-md rounded-3xl border border-[#E8E9E0] bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <span className="mb-3 flex size-11 items-center justify-center rounded-xl bg-[#E8F0E6] text-[#315B3F]"><ShieldCheck size={21} /></span>
                <h2 className="text-xl font-semibold tracking-tight">Sign in to Roots</h2>
                <p className="mt-1 text-xs leading-5 text-[#858D80]">We’ll email you a secure, one-time sign-in link.</p>
              </div>
              <button onClick={() => setShowAuth(false)} aria-label="Close sign-in form" className="rounded-lg p-2 text-[#858D80] hover:bg-[#F3F4EF]"><X size={18} /></button>
            </div>
            <form onSubmit={requestSignIn} className="space-y-4">
              <label className="block text-xs font-semibold">Email address
                <input required type="email" autoFocus value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-[#DFE3D9] px-4 py-3 text-sm font-normal outline-none focus:border-[#6B916E] focus:ring-2 focus:ring-[#DCE9D8]" />
              </label>
              {authMessage && <p role="status" className="rounded-xl bg-[#EDF3E9] p-3 text-xs leading-5 text-[#315B3F]">{authMessage}</p>}
              {authError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-800">{authError}</p>}
              <button type="submit" disabled={authBusy} className="w-full rounded-xl bg-[#254C3B] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1C3D2E] disabled:opacity-60">{authBusy ? "Sending link…" : "Email me a sign-in link"}</button>
              <p className="text-center text-[10px] leading-4 text-[#999F94]">Your family data is protected by your Supabase sign-in and the database’s existing row-level security policies.</p>
            </form>
          </div>
        </div>
      )}

      {showTreeSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15251B]/45 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowTreeSettings(false); }}>
          <div className="w-full max-w-md rounded-3xl border border-[#E8E9E0] bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <span className="mb-3 flex size-11 items-center justify-center rounded-xl bg-[#E8F0E6] text-[#315B3F]"><GitBranch size={21} /></span>
                <h2 className="text-xl font-semibold tracking-tight">Manage family tree</h2>
                <p className="mt-1 text-xs leading-5 text-[#858D80]">Changes are protected by your sign-in and the tree’s RLS policy.</p>
              </div>
              <button onClick={() => setShowTreeSettings(false)} aria-label="Close tree settings" className="rounded-lg p-2 text-[#858D80] hover:bg-[#F3F4EF]"><X size={18} /></button>
            </div>
            <form onSubmit={renameFamilyTree} className="space-y-4">
              <label className="block text-xs font-semibold">Family tree name
                <input required value={treeNameDraft} onChange={(event) => setTreeNameDraft(event.target.value)} className="mt-2 w-full rounded-xl border border-[#DFE3D9] px-4 py-3 text-sm font-normal outline-none focus:border-[#6B916E] focus:ring-2 focus:ring-[#DCE9D8]" />
              </label>
              <button type="submit" disabled={personBusy} className="w-full rounded-xl bg-[#254C3B] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1C3D2E] disabled:opacity-60">{personBusy ? "Saving…" : "Save tree name"}</button>
              <button type="button" onClick={() => void deleteFamilyTree()} disabled={personBusy} className="w-full rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-60">Delete family tree</button>
            </form>
          </div>
        </div>
      )}

      {showClearHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15251B]/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !personBusy) setShowClearHistory(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="clear-history-title" className="w-full max-w-md rounded-3xl border border-amber-200 bg-white p-6 shadow-2xl sm:p-8">
            <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-800"><Trash2 size={20} /></span>
            <h2 id="clear-history-title" className="text-xl font-semibold tracking-tight">Clear this family history?</h2>
            <p className="mt-2 text-sm leading-6 text-[#777F73]">This permanently removes every person, connection, story, memory, and photo in <strong>{familyTrees.find((tree) => tree.id === treeId)?.name ?? "this tree"}</strong>. The tree itself remains, but this action cannot be undone.</p>
            <label className="mt-5 block text-xs font-semibold">Type CLEAR to confirm
              <input autoFocus value={clearHistoryConfirmation} onChange={(event) => setClearHistoryConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-[#DFE3D9] px-4 py-3 text-sm font-normal outline-none focus:border-amber-500" />
            </label>
            {dataError && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-800">{dataError}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => { setShowClearHistory(false); setClearHistoryConfirmation(""); }} disabled={personBusy} className="rounded-xl border border-[#DFE3D9] px-4 py-3 text-sm font-semibold">Cancel</button>
              <button onClick={() => void clearFamilyHistory()} disabled={personBusy || clearHistoryConfirmation.trim() !== "CLEAR"} className="rounded-xl bg-amber-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{personBusy ? "Clearing…" : "Clear history"}</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15251B]/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !personBusy) setShowDeleteAccount(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl sm:p-8">
            <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-rose-50 text-rose-800"><ShieldCheck size={20} /></span>
            <h2 id="delete-account-title" className="text-xl font-semibold tracking-tight text-rose-900">Permanently delete your account?</h2>
            <p className="mt-2 text-sm leading-6 text-[#777F73]">This removes your Roots account and all of its family trees, people, connections, stories, memories, and photos. It cannot be undone. Type <strong>DELETE</strong> to continue.</p>
            <label className="mt-5 block text-xs font-semibold">Confirmation
              <input autoFocus autoComplete="off" value={deleteAccountConfirmation} onChange={(event) => setDeleteAccountConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-[#DFE3D9] px-4 py-3 text-sm font-normal outline-none focus:border-rose-500" />
            </label>
            {dataError && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-800">{dataError}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => { setShowDeleteAccount(false); setDeleteAccountConfirmation(""); }} disabled={personBusy} className="rounded-xl border border-[#DFE3D9] px-4 py-3 text-sm font-semibold">Cancel</button>
              <button onClick={() => void deleteAccount()} disabled={personBusy || deleteAccountConfirmation.trim() !== "DELETE"} className="rounded-xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{personBusy ? "Deleting…" : "Delete my account"}</button>
            </div>
            <p className="mt-4 text-center text-[10px] leading-4 text-[#999F94]">Your sign-in must be active and the secure account-deletion function must be deployed.</p>
          </div>
        </div>
      )}
    </main>
  );
}
