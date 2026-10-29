"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BookOpen, CalendarDays, Heart, Pencil, Plus, Trash2, X } from "lucide-react";
import { createClient } from "./lib/supabase";

type EntryKind = "story" | "memory";

type FamilyStory = {
  id: string;
  tree_id: string;
  person_id: string | null;
  kind: EntryKind;
  title: string;
  content: string;
  memory_date: string | null;
  created_at: string;
};

type FamilyPerson = { id: string | number; name: string };

type StoriesMemoriesProps = {
  treeId: string | null;
  signedIn: boolean;
  people: FamilyPerson[];
  onCountsChange: (stories: number, memories: number) => void;
  onRequestSignIn: () => void;
};

const migrationPath = "supabase/migrations/20261029000100_create_family_stories.sql";

export default function StoriesMemories({
  treeId,
  signedIn,
  people,
  onCountsChange,
  onRequestSignIn,
}: StoriesMemoriesProps) {
  const supabase = useMemo(() => createClient(), []);
  const [entries, setEntries] = useState<FamilyStory[]>([]);
  const [loadedTreeId, setLoadedTreeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kind, setKind] = useState<EntryKind>("story");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [personId, setPersonId] = useState("");
  const [memoryDate, setMemoryDate] = useState("");

  useEffect(() => {
    let active = true;
    if (!signedIn || !treeId) {
      onCountsChange(0, 0);
      return () => { active = false; };
    }

    void supabase
      .from("family_stories")
      .select("id, tree_id, person_id, kind, title, content, memory_date, created_at")
      .eq("tree_id", treeId)
      .order("created_at", { ascending: false })
      .then(({ data, error: queryError }: { data: FamilyStory[] | null; error: { message: string } | null }) => {
        if (!active) return;
        setError("");
        if (queryError) {
          setEntries([]);
          setLoadedTreeId(treeId);
          setError(`Could not load stories and memories: ${queryError.message}. Apply ${migrationPath} in the Supabase SQL Editor.`);
          onCountsChange(0, 0);
        } else {
          const loaded = (data ?? []) as FamilyStory[];
          setEntries(loaded);
          setLoadedTreeId(treeId);
          onCountsChange(
            loaded.filter((entry) => entry.kind === "story").length,
            loaded.filter((entry) => entry.kind === "memory").length
          );
        }
        setLoading(false);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setEntries([]);
        setLoadedTreeId(treeId);
        setError(loadError instanceof Error ? loadError.message : "Could not load stories and memories.");
        onCountsChange(0, 0);
        setLoading(false);
      });

    return () => { active = false; };
  }, [onCountsChange, signedIn, supabase, treeId]);

  function resetForm() {
    setEditingId(null);
    setKind("story");
    setTitle("");
    setContent("");
    setPersonId("");
    setMemoryDate("");
    setFormOpen(false);
  }

  function startEditing(entry: FamilyStory) {
    setEditingId(entry.id);
    setKind(entry.kind);
    setTitle(entry.title);
    setContent(entry.content);
    setPersonId(entry.person_id ?? "");
    setMemoryDate(entry.memory_date ?? "");
    setError("");
    setFormOpen(true);
  }

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!treeId || !signedIn) return;
    setSaving(true);
    setError("");
    const fields = {
      tree_id: treeId,
      person_id: personId || null,
      kind,
      title: title.trim(),
      content: content.trim(),
      memory_date: memoryDate || null,
      updated_at: new Date().toISOString(),
    };
    try {
      const result = editingId
        ? await supabase.from("family_stories").update(fields).eq("id", editingId).eq("tree_id", treeId).select("*").single()
        : await supabase.from("family_stories").insert(fields).select("*").single();
      if (result.error) {
        setError(`Could not save this entry: ${result.error.message}`);
        return;
      }
      const saved = result.data as FamilyStory;
      const next = editingId
        ? entries.map((entry) => entry.id === saved.id ? saved : entry)
        : [saved, ...entries];
      next.sort((first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime());
      setEntries(next);
      onCountsChange(next.filter((entry) => entry.kind === "story").length, next.filter((entry) => entry.kind === "memory").length);
      resetForm();
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this entry.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(entry: FamilyStory) {
    if (!treeId || !window.confirm(`Delete “${entry.title}”? This cannot be undone.`)) return;
    setError("");
    const { error: deleteError } = await supabase.from("family_stories").delete().eq("id", entry.id).eq("tree_id", treeId);
    if (deleteError) {
      setError(`Could not delete this entry: ${deleteError.message}`);
      return;
    }
    const next = entries.filter((item) => item.id !== entry.id);
    setEntries(next);
    onCountsChange(next.filter((item) => item.kind === "story").length, next.filter((item) => item.kind === "memory").length);
  }

  return (
    <section className="mx-auto max-w-5xl py-7 sm:py-10">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DCE6D8] bg-[#EDF3E9] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#42684B]">
            <Heart size={13} /> FAMILY ARCHIVE
          </div>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[39px]">Stories &amp; memories</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#777F73]">Keep the moments, traditions, and family stories that deserve to be remembered.</p>
        </div>
        <button
          onClick={() => { if (!signedIn) onRequestSignIn(); else if (!treeId) setError("Create a family tree first, then you can save stories and memories."); else { setError(""); setFormOpen(true); } }}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#254C3B] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1C3D2E]"
        >
          <Plus size={17} /> Add an entry
        </button>
      </div>

      {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-800">{error}</p>}
      {!signedIn && <p className="mb-5 rounded-xl border border-[#DCE6D8] bg-white px-4 py-3 text-xs text-[#527456]">Sign in to save stories and memories to your private family tree.</p>}
      {signedIn && !treeId && <p className="mb-5 rounded-xl border border-[#DCE6D8] bg-white px-4 py-3 text-xs text-[#527456]">Create a family tree before saving an entry.</p>}

      {formOpen && (
        <form onSubmit={saveEntry} className="mb-6 rounded-2xl border border-[#DCE6D8] bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold">{editingId ? "Edit entry" : "Save a family memory"}</h3>
              <p className="mt-1 text-xs text-[#858D80]">You can edit or remove this entry later.</p>
            </div>
            <button type="button" aria-label="Close entry form" onClick={resetForm} className="rounded-lg p-2 text-[#858D80] hover:bg-[#F3F4EF]"><X size={17} /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold">Entry type
              <select value={kind} onChange={(event) => setKind(event.target.value as EntryKind)} className="mt-1.5 w-full rounded-xl border border-[#DFE3D9] bg-white px-3 py-3 text-sm font-normal">
                <option value="story">Family story</option>
                <option value="memory">Memory</option>
              </select>
            </label>
            <label className="text-xs font-semibold">About a family member (optional)
              <select value={personId} onChange={(event) => setPersonId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#DFE3D9] bg-white px-3 py-3 text-sm font-normal">
                <option value="">Everyone / not linked</option>
                {people.map((person) => <option key={person.id} value={String(person.id)}>{person.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold sm:col-span-2">Title *
              <input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Sunday lunches at Grandma's" className="mt-1.5 w-full rounded-xl border border-[#DFE3D9] px-3 py-3 text-sm font-normal outline-none focus:border-[#6B916E]" />
            </label>
            <label className="text-xs font-semibold">When did it happen? (optional)
              <input type="date" value={memoryDate} onChange={(event) => setMemoryDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#DFE3D9] bg-white px-3 py-3 text-sm font-normal" />
            </label>
            <label className="text-xs font-semibold sm:col-span-2">The story or memory *
              <textarea required rows={5} maxLength={12000} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Write what happened, who was there, and why your family remembers it…" className="mt-1.5 w-full resize-y rounded-xl border border-[#DFE3D9] px-3 py-3 text-sm font-normal leading-6 outline-none focus:border-[#6B916E]" />
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-3 border-t border-[#ECEDE6] pt-4">
            <button type="button" onClick={resetForm} className="rounded-xl border border-[#DFE3D9] px-4 py-3 text-sm font-semibold hover:bg-[#F8F9F5]">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-[#254C3B] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : editingId ? "Save changes" : "Save entry"}</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="rounded-2xl border border-[#E5E7DD] bg-white p-6 text-sm text-[#777F73]">Loading your family archive…</p>
      ) : signedIn && treeId && loadedTreeId !== treeId ? (
        <p className="rounded-2xl border border-[#E5E7DD] bg-white p-6 text-sm text-[#777F73]">Loading your family archive…</p>
      ) : (signedIn && treeId ? entries : []).length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {(signedIn && treeId ? entries : []).map((entry) => {
            const person = people.find((item) => String(item.id) === entry.person_id);
            return (
              <article key={entry.id} className="rounded-2xl border border-[#E5E7DD] bg-white p-5 sm:p-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#F0F3EB] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#527456]">
                    {entry.kind === "story" ? <BookOpen size={13} /> : <Heart size={13} />}{entry.kind === "story" ? "Family story" : "Memory"}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => startEditing(entry)} aria-label={`Edit ${entry.title}`} className="rounded-lg p-2 text-[#899184] hover:bg-[#EFF3EB] hover:text-[#315B3F]"><Pencil size={15} /></button>
                    <button onClick={() => void deleteEntry(entry)} aria-label={`Delete ${entry.title}`} className="rounded-lg p-2 text-[#A46B5E] hover:bg-rose-50"><Trash2 size={15} /></button>
                  </div>
                </div>
                <h3 className="text-lg font-semibold tracking-tight">{entry.title}</h3>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#858D80]">
                  {person && <span>{person.name}</span>}
                  {entry.memory_date && <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{new Date(`${entry.memory_date}T00:00:00`).toLocaleDateString()}</span>}
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#596458]">{entry.content}</p>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#D8DFD3] bg-white px-6 py-12 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#F0F3EB] text-[#527456]"><BookOpen size={22} /></span>
          <h3 className="mt-4 text-base font-semibold">Your family archive starts with one story</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#777F73]">Save a tradition, a favorite family moment, or the story behind a name. You can connect it to a person and add a date.</p>
          {signedIn && treeId && <button onClick={() => { setError(""); setFormOpen(true); }} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#254C3B] px-4 py-3 text-sm font-semibold text-white"><Plus size={16} /> Add your first entry</button>}
        </div>
      )}
    </section>
  );
}
