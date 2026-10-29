-- Add private portraits to people, and dates that feed the family timeline.
alter table public.people
  add column if not exists birth_date date,
  add column if not exists death_date date,
  add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('family-photos', 'family-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Tree owners read their family photos" on storage.objects;
create policy "Tree owners read their family photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'family-photos'
    and exists (
      select 1
      from public.people as person
      join public.family_trees as tree on tree.id = person.tree_id
      where tree.created_by = (select auth.uid())
        and tree.id::text = (storage.foldername(name))[1]
        and person.id::text = (storage.foldername(name))[2]
    )
  );

drop policy if exists "Tree owners upload family photos" on storage.objects;
create policy "Tree owners upload family photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'family-photos'
    and exists (
      select 1
      from public.people as person
      join public.family_trees as tree on tree.id = person.tree_id
      where tree.created_by = (select auth.uid())
        and tree.id::text = (storage.foldername(name))[1]
        and person.id::text = (storage.foldername(name))[2]
    )
  );

drop policy if exists "Tree owners update family photos" on storage.objects;
create policy "Tree owners update family photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'family-photos'
    and exists (
      select 1 from public.family_trees as tree
      where tree.created_by = (select auth.uid())
        and tree.id::text = (storage.foldername(name))[1]
    )
  )
  with check (
    bucket_id = 'family-photos'
    and exists (
      select 1
      from public.people as person
      join public.family_trees as tree on tree.id = person.tree_id
      where tree.created_by = (select auth.uid())
        and tree.id::text = (storage.foldername(name))[1]
        and person.id::text = (storage.foldername(name))[2]
    )
  );

drop policy if exists "Tree owners delete family photos" on storage.objects;
create policy "Tree owners delete family photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'family-photos'
    and exists (
      select 1 from public.family_trees as tree
      where tree.created_by = (select auth.uid())
        and tree.id::text = (storage.foldername(name))[1]
    )
  );
