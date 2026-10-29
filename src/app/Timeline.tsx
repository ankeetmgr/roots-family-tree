"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, Clock3, Heart, Plus, X } from "lucide-react";
import { createClient } from "./lib/supabase";

type TimelinePerson = { id: string | number; name: string; birthDate?: string; deathDate?: string };
type StoryEvent = { id: string; person_id: string | null; title: string; content: string; kind: "story" | "memory"; memory_date: string; created_at: string };
type TimelineEvent = { id: string; date: string; title: string; description: string; personName: string; type: string };

type Props = {
  treeId: string | null;
  signedIn: boolean;
  people: TimelinePerson[];
  onRequestSignIn: () => void;
};

export default function Timeline({ treeId, signedIn, people, onRequestSignIn }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [entries, setEntries] = useState<StoryEvent[]>([]);
  const [loadedTreeId, setLoadedTreeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [personId, setPersonId] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    let active = true;
    if (!signedIn || !treeId) return () => { active = false; };
    void supabase.from("family_stories")
      .select("id, person_id, title, content, kind, memory_date, created_at")
      .eq("tree_id", treeId)
      .not("memory_date", "is", null)
      .then(({ data, error: queryError }: { data: StoryEvent[] | null; error: { message: string } | null }) => {
        if (!active) return;
        if (queryError) setError(`Could not load timeline events: ${queryError.message}. Apply the family stories migration in Supabase.`);
        else {
          setEntries(data ?? []);
          setError("");
        }
        setLoadedTreeId(treeId);
        setLoading(false);
      }).catch((queryError: unknown) => {
        if (!active) return;
        setError(queryError instanceof Error ? queryError.message : "Could not load timeline events.");
        setLoadedTreeId(treeId);
        setLoading(false);
      });
    return () => { active = false; };
  }, [signedIn, supabase, treeId]);

  const events = useMemo(() => {
    const lifeEvents: TimelineEvent[] = people.flatMap((person) => [
      person.birthDate ? { id: `birth-${person.id}`, date: person.birthDate, title: `${person.name} was born`, description: "Birth", personName: person.name, type: "Life event" } : null,
      person.deathDate ? { id: `passing-${person.id}`, date: person.deathDate, title: `${person.name} passed away`, description: "Passing", personName: person.name, type: "Life event" } : null,
    ].filter((event): event is TimelineEvent => Boolean(event)));
    const memories = entries.filter((entry) => entry.memory_date).map((entry): TimelineEvent => ({
      id: entry.id,
      date: entry.memory_date,
      title: entry.title,
      description: entry.content,
      personName: people.find((person) => String(person.id) === entry.person_id)?.name ?? "Family",
      type: entry.kind === "story" ? "Family story" : "Memory",
    }));
    return [...lifeEvents, ...memories].sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, people]);

  function resetForm() {
    setTitle(""); setDate(""); setPersonId(""); setContent(""); setFormOpen(false);
  }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!treeId || !signedIn) return;
    setSaving(true); setError("");
    try {
      const { data, error: saveError } = await supabase.from("family_stories").insert({
        tree_id: treeId,
        person_id: personId || null,
        kind: "memory",
        title: title.trim(),
        content: content.trim(),
        memory_date: date,
      }).select("id, person_id, title, content, kind, memory_date, created_at").single();
      if (saveError) { setError(`Could not save this timeline event: ${saveError.message}`); return; }
      setEntries((current) => [...current, data as StoryEvent]);
      resetForm();
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this timeline event.");
    } finally { setSaving(false); }
  }

  return (
    <section className="mx-auto max-w-5xl py-7 sm:py-10">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DCE6D8] bg-[#EDF3E9] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#42684B]"><Clock3 size={13} /> FAMILY HISTORY</span><h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[39px]">Family timeline</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#777F73]">See important dates, stories, and memories in the order they happened.</p></div>
        <button onClick={() => { if (!signedIn) onRequestSignIn(); else if (!treeId) setError("Create a family tree first."); else { setError(""); setFormOpen(true); } }} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#254C3B] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1C3D2E]"><Plus size={17} /> Add an event</button>
      </div>
      {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-800">{error}</p>}
      {!signedIn && <p className="mb-5 rounded-xl border border-[#DCE6D8] bg-white px-4 py-3 text-xs text-[#527456]">Sign in to create and view the timeline for your private family tree.</p>}
      {formOpen && <form onSubmit={saveEvent} className="mb-6 rounded-2xl border border-[#DCE6D8] bg-white p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between"><div><h3 className="text-base font-semibold">Add a timeline event</h3><p className="mt-1 text-xs text-[#858D80]">This event will also be saved as a family memory.</p></div><button type="button" onClick={resetForm} aria-label="Close event form" className="rounded-lg p-2 text-[#858D80] hover:bg-[#F3F4EF]"><X size={17} /></button></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold">Event title *<input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. The family moved to Kathmandu" className="mt-1.5 w-full rounded-xl border border-[#DFE3D9] px-3 py-3 text-sm font-normal" /></label>
          <label className="text-xs font-semibold">Date *<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#DFE3D9] bg-white px-3 py-3 text-sm font-normal" /></label>
          <label className="text-xs font-semibold sm:col-span-2">Person (optional)<select value={personId} onChange={(event) => setPersonId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#DFE3D9] bg-white px-3 py-3 text-sm font-normal"><option value="">Whole family</option>{people.map((person) => <option key={person.id} value={String(person.id)}>{person.name}</option>)}</select></label>
          <label className="text-xs font-semibold sm:col-span-2">Details *<textarea required rows={4} maxLength={12000} value={content} onChange={(event) => setContent(event.target.value)} placeholder="What happened? Add the details your family wants to remember." className="mt-1.5 w-full resize-y rounded-xl border border-[#DFE3D9] px-3 py-3 text-sm font-normal leading-6" /></label>
        </div>
        <div className="mt-5 flex justify-end gap-3 border-t border-[#ECEDE6] pt-4"><button type="button" onClick={resetForm} className="rounded-xl border border-[#DFE3D9] px-4 py-3 text-sm font-semibold">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-[#254C3B] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save event"}</button></div>
      </form>}
      {loading || (signedIn && treeId && loadedTreeId !== treeId) ? <p className="rounded-2xl border border-[#E5E7DD] bg-white p-6 text-sm text-[#777F73]">Loading your family timeline…</p> : !signedIn || !treeId ? null : events.length ? (
        <ol className="relative ml-3 border-l border-[#DCE6D8] pl-6 sm:ml-5 sm:pl-8">{events.map((event) => <li key={event.id} className="relative pb-6 last:pb-0"><span className="absolute -left-[33px] top-1 flex size-4 items-center justify-center rounded-full border-4 border-[#F7F7F2] bg-[#477756] sm:-left-[41px]" /><article className="rounded-2xl border border-[#E5E7DD] bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center gap-2 text-[11px] text-[#858D80]"><span className="inline-flex items-center gap-1 rounded-full bg-[#F0F3EB] px-2.5 py-1 font-semibold text-[#527456]"><Heart size={12} />{event.type}</span><span className="inline-flex items-center gap-1"><CalendarDays size={12} />{new Date(`${event.date}T00:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span><span>{event.personName}</span></div><h3 className="mt-3 text-base font-semibold">{event.title}</h3>{event.type !== "Life event" && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#596458]">{event.description}</p>}</article></li>)}</ol>
      ) : <div className="rounded-2xl border border-dashed border-[#D8DFD3] bg-white px-6 py-12 text-center"><span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#F0F3EB] text-[#527456]"><Clock3 size={22} /></span><h3 className="mt-4 text-base font-semibold">Your family timeline starts here</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#777F73]">Add a dated event, or add birth and passing dates when editing a family member.</p></div>}
    </section>
  );
}
