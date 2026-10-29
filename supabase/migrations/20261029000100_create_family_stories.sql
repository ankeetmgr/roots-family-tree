-- Stories and memories are private to the owner of their family tree.
create table if not exists public.family_stories (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.family_trees (id) on delete cascade,
  person_id uuid references public.people (id) on delete set null,
  kind text not null default 'story' check (kind in ('story', 'memory')),
  title text not null check (char_length(title) between 1 and 160),
  content text not null check (char_length(content) between 1 and 12000),
  memory_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists family_stories_tree_created_idx
  on public.family_stories (tree_id, created_at desc);

create index if not exists family_stories_person_idx
  on public.family_stories (person_id);

alter table public.family_stories enable row level security;

drop policy if exists "Owners manage stories in their trees" on public.family_stories;
create policy "Owners manage stories in their trees"
  on public.family_stories
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.family_trees as tree
      where tree.id = family_stories.tree_id
        and tree.created_by = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.family_trees as tree
      where tree.id = family_stories.tree_id
        and tree.created_by = (select auth.uid())
    )
    and (
      family_stories.person_id is null
      or exists (
        select 1
        from public.people as person
        where person.id = family_stories.person_id
          and person.tree_id = family_stories.tree_id
      )
    )
  );

grant select, insert, update, delete on public.family_stories to authenticated;
