-- Discovery is opt-in. Public RPCs return only tree names, member names,
-- and parent-child links; private dates, places, biographies, and stories stay private.
alter table public.family_trees
  add column if not exists is_discoverable boolean not null default false;

create or replace function public.discover_family_trees()
returns table (tree_id uuid, tree_name text, member_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select tree.id, tree.name, count(person.id)
  from public.family_trees as tree
  left join public.people as person on person.tree_id = tree.id
  where tree.is_discoverable is true
    and ((select auth.uid()) is null or tree.created_by <> (select auth.uid()))
  group by tree.id, tree.name, tree.created_at, tree.created_by
  order by tree.created_at desc
  limit 100;
$$;

revoke all on function public.discover_family_trees() from public;
grant execute on function public.discover_family_trees() to anon, authenticated;

create or replace function public.get_discoverable_family_tree(tree_id_input uuid)
returns table (
  tree_id uuid,
  tree_name text,
  people jsonb,
  relationships jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    tree.id,
    tree.name,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('id', person.id, 'name', person.full_name)
          order by person.full_name
        )
        from public.people as person
        where person.tree_id = tree.id
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('parent_id', link.parent_id, 'child_id', link.child_id)
        )
        from public.relationships as link
        where link.tree_id = tree.id
      ),
      '[]'::jsonb
    )
  from public.family_trees as tree
  where tree.id = tree_id_input
    and tree.is_discoverable is true
    and ((select auth.uid()) is null or tree.created_by <> (select auth.uid()));
$$;

revoke all on function public.get_discoverable_family_tree(uuid) from public;
grant execute on function public.get_discoverable_family_tree(uuid) to anon, authenticated;

create or replace function public.clear_family_tree_history(tree_id_input uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.family_trees as tree
    where tree.id = tree_id_input
      and tree.created_by = (select auth.uid())
  ) then
    raise exception 'Family tree not found or not owned by the signed-in user';
  end if;

  delete from public.relationships where tree_id = tree_id_input;
  delete from public.family_stories where tree_id = tree_id_input;
  delete from public.people where tree_id = tree_id_input;
end;
$$;

revoke all on function public.clear_family_tree_history(uuid) from public, anon;
grant execute on function public.clear_family_tree_history(uuid) to authenticated;

-- Called only by the authenticated delete-account Edge Function using a secret server key.
create or replace function public.delete_user_family_data(target_user_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.relationships as link
  using public.family_trees as tree
  where link.tree_id = tree.id and tree.created_by = target_user_id;

  delete from public.family_stories as story
  using public.family_trees as tree
  where story.tree_id = tree.id and tree.created_by = target_user_id;

  delete from public.people as person
  using public.family_trees as tree
  where person.tree_id = tree.id and tree.created_by = target_user_id;

  delete from public.family_trees where created_by = target_user_id;
end;
$$;

revoke all on function public.delete_user_family_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_user_family_data(uuid) to service_role;
