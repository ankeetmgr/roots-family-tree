"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { createClient } from "./lib/supabase";

export type PhotoPerson = {
  id: string | number;
  name: string;
  photoPath?: string | null;
};

type Props = {
  treeId: string | null;
  signedIn: boolean;
  people: PhotoPerson[];
  onPhotoPathChange: (personId: string | number, path: string | null) => void;
  onRequestSignIn: () => void;
};

const BUCKET = "family-photos";
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function PersonPortrait({ person, size = "large" }: { person: PhotoPerson; size?: "small" | "large" }) {
  const supabase = useMemo(() => createClient(), []);
  const [url, setUrl] = useState("");
  const [urlPath, setUrlPath] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!person.photoPath) return () => { active = false; };
    void supabase.storage.from(BUCKET).createSignedUrl(person.photoPath, 3600).then(({ data }: { data: { signedUrl: string } | null }) => {
      if (active) {
        setUrl(data?.signedUrl ?? "");
        setUrlPath(person.photoPath ?? null);
      }
    });
    return () => { active = false; };
  }, [person.photoPath, supabase]);

  const dimensions = size === "large" ? "size-16 text-lg" : "size-10 text-xs";
  const imageUrl = urlPath === person.photoPath ? url : "";
  return (
    <div
      role="img"
      aria-label={person.photoPath ? `${person.name}'s portrait` : `No photo for ${person.name}`}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E8F0E6] font-bold text-[#315B3F] ${dimensions}`}
      style={imageUrl ? { backgroundImage: `url("${imageUrl}")`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}
    >
      {!imageUrl && person.name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase()}
    </div>
  );
}

export function PersonPhotoButton({
  person,
  treeId,
  signedIn,
  onPhotoPathChange,
  onRequestSignIn,
}: {
  person: PhotoPerson;
  treeId: string | null;
  signedIn: boolean;
  onPhotoPathChange: (personId: string | number, path: string | null) => void;
  onRequestSignIn: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !treeId || !signedIn) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("This photo is larger than 8 MB.");
      return;
    }

    setSaving(true);
    setError("");
    const previousPath = person.photoPath ?? null;
    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const path = `${treeId}/${person.id}/${crypto.randomUUID()}.${extension}`;
    try {
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
        cacheControl: "3600",
      });
      if (uploadError) {
        setError(`Could not upload photo: ${uploadError.message}. Check that the Roots photo migration is applied.`);
        return;
      }

      const { error: updateError } = await supabase.from("people")
        .update({ photo_path: path })
        .eq("id", person.id)
        .eq("tree_id", treeId);
      if (updateError) {
        await supabase.storage.from(BUCKET).remove([path]);
        setError(`Could not attach the photo: ${updateError.message}`);
        return;
      }

      onPhotoPathChange(person.id, path);
      if (previousPath) {
        const { error: removeError } = await supabase.storage.from(BUCKET).remove([previousPath]);
        if (removeError) setError(`Photo updated, but the previous file could not be removed: ${removeError.message}`);
      }
    } catch (uploadError: unknown) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload this photo.");
    } finally {
      setSaving(false);
    }
  }

  function choosePhoto() {
    setError("");
    if (!signedIn) {
      onRequestSignIn();
      return;
    }
    if (!treeId) {
      setError("Create a family tree before adding a profile photo.");
      return;
    }
    inputRef.current?.click();
  }

  return (
    <div className="relative shrink-0">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => void uploadPhoto(event)}
        disabled={saving}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={choosePhoto}
        disabled={saving}
        aria-label={`${person.photoPath ? "Change" : "Add"} profile photo for ${person.name}`}
        title={person.photoPath ? "Change profile photo" : "Add profile photo"}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#DFE3D9] px-2.5 py-2 text-[11px] font-semibold text-[#526452] hover:bg-[#EFF3EB] hover:text-[#315B3F] disabled:cursor-wait disabled:opacity-50"
      >
        <Camera size={14} />
        <span>{saving ? "Uploading…" : person.photoPath ? "Change photo" : "Add photo"}</span>
      </button>
      {error && <span role="alert" className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-rose-200 bg-white p-2 text-[10px] leading-4 text-rose-800 shadow-lg">{error}</span>}
    </div>
  );
}

export default function PhotoArchive({ treeId, signedIn, people, onPhotoPathChange, onRequestSignIn }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedPerson = people.find((person) => String(person.id) === selectedPersonId) ?? people[0];

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !selectedPerson || !treeId || !signedIn) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("This photo is larger than 8 MB. Choose a smaller image.");
      return;
    }

    setSaving(true);
    setError("");
    const previousPath = selectedPerson.photoPath;
    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const path = `${treeId}/${selectedPerson.id}/${crypto.randomUUID()}.${extension}`;
    try {
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
        cacheControl: "3600",
      });
      if (uploadError) {
        setError(`Could not upload this photo: ${uploadError.message}. Make sure the Roots photo migration is applied.`);
        return;
      }
      const { error: updateError } = await supabase.from("people").update({ photo_path: path }).eq("id", selectedPerson.id).eq("tree_id", treeId);
      if (updateError) {
        await supabase.storage.from(BUCKET).remove([path]);
        setError(`The photo uploaded, but could not be attached to ${selectedPerson.name}: ${updateError.message}`);
        return;
      }
      onPhotoPathChange(selectedPerson.id, path);
      if (previousPath) await supabase.storage.from(BUCKET).remove([previousPath]);
    } catch (uploadError: unknown) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload this photo.");
    } finally {
      setSaving(false);
    }
  }

  async function removePhoto(person: PhotoPerson) {
    if (!treeId || !person.photoPath || !window.confirm(`Remove ${person.name}'s photo?`)) return;
    setSaving(true);
    setError("");
    try {
      const { error: updateError } = await supabase.from("people").update({ photo_path: null }).eq("id", person.id).eq("tree_id", treeId);
      if (updateError) {
        setError(`Could not remove the photo: ${updateError.message}`);
        return;
      }
      onPhotoPathChange(person.id, null);
      const { error: removeError } = await supabase.storage.from(BUCKET).remove([person.photoPath]);
      if (removeError) setError(`The photo was detached, but its stored file could not be removed: ${removeError.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl py-7 sm:py-10">
      <div className="mb-7">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DCE6D8] bg-[#EDF3E9] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#42684B]"><Camera size={13} /> FAMILY PHOTOS</span>
        <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[39px]">Photo archive</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#777F73]">Add a portrait to each person. Photos are stored privately with the selected family tree.</p>
      </div>
      {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-800">{error}</p>}
      {!signedIn ? (
        <div className="rounded-2xl border border-[#E5E7DD] bg-white p-6"><p className="text-sm text-[#596458]">Sign in to add photos to your private family tree.</p><button onClick={onRequestSignIn} className="mt-4 rounded-xl bg-[#254C3B] px-4 py-3 text-sm font-semibold text-white">Sign in</button></div>
      ) : !treeId ? (
        <div className="rounded-2xl border border-[#E5E7DD] bg-white p-6 text-sm text-[#596458]">Create a family tree before you add family photos.</div>
      ) : people.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D8DFD3] bg-white px-6 py-12 text-center"><Camera className="mx-auto text-[#527456]" /><h3 className="mt-4 font-semibold">Add a person first</h3><p className="mt-2 text-sm text-[#777F73]">Each photo is attached to an individual in your family tree.</p></div>
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#E5E7DD] bg-white p-4 sm:flex-row sm:items-end">
            <label className="flex-1 text-xs font-semibold">Choose a family member
              <select value={selectedPerson ? String(selectedPerson.id) : ""} onChange={(event) => setSelectedPersonId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#DFE3D9] bg-white px-3 py-3 text-sm font-normal">
                {people.map((person) => <option key={person.id} value={String(person.id)}>{person.name}</option>)}
              </select>
            </label>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#254C3B] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1C3D2E]">
              <ImagePlus size={17} /> {saving ? "Saving…" : selectedPerson?.photoPath ? "Replace photo" : "Add photo"}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadPhoto(event)} disabled={saving} className="sr-only" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((person) => (
              <article key={person.id} className="flex items-center gap-4 rounded-2xl border border-[#E5E7DD] bg-white p-5">
                <PersonPortrait person={person} />
                <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold">{person.name}</h3><p className="mt-1 text-xs text-[#858D80]">{person.photoPath ? "Portrait added" : "No photo yet"}</p></div>
                {person.photoPath && <button onClick={() => void removePhoto(person)} disabled={saving} aria-label={`Remove ${person.name}'s photo`} className="rounded-lg p-2 text-[#A46B5E] hover:bg-rose-50 disabled:opacity-50"><Trash2 size={16} /></button>}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
