alter table public.places
  add column if not exists average_price_cents integer check (average_price_cents > 0 and average_price_cents <= 100000),
  add column if not exists notes text check (char_length(notes) <= 500),
  add column if not exists coordinate_status text not null default 'pending' check (coordinate_status in ('verified', 'estimated', 'pending')),
  add column if not exists data_source text not null default 'legacy' check (char_length(data_source) between 1 and 80);

alter table public.food_items
  add column if not exists data_source text not null default 'legacy' check (char_length(data_source) between 1 and 80);

create unique index if not exists places_name_address_unique_idx
  on public.places(normalized_name, address);

create index if not exists places_coordinate_status_idx
  on public.places(coordinate_status);

create or replace function public.admin_reset_food_catalog()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  removed_decisions integer;
  removed_places integer;
begin
  delete from public.decisions;
  get diagnostics removed_decisions = row_count;

  delete from public.places;
  get diagnostics removed_places = row_count;

  delete from public.tags t
  where not exists (
    select 1 from public.food_item_tags fit where fit.tag_id = t.id
  );

  return jsonb_build_object(
    'removed_decisions', removed_decisions,
    'removed_places', removed_places
  );
end;
$$;

revoke all on function public.admin_reset_food_catalog() from public, anon, authenticated;
grant execute on function public.admin_reset_food_catalog() to service_role;

drop function if exists public.get_public_share(text);
create function public.get_public_share(p_token_hash text)
returns table(food_name text, place_name text, address text, image_url text, price_cents integer, price_kind text, positive_count bigint, tags text[])
security definer set search_path = public language sql stable as $$
  select f.name, p.name, p.address,
    (select i.url from public.food_item_images i where i.food_item_id = f.id order by i.sort_order, i.created_at limit 1),
    coalesce(f.price_cents, p.average_price_cents),
    case when f.price_cents is not null then 'item' when p.average_price_cents is not null then 'average' else 'unknown' end,
    (select count(*) from public.experiences e where e.food_item_id = f.id and e.attitude = 'again'),
    coalesce((select array_agg(t.name order by t.name) from public.food_item_tags fit join public.tags t on t.id = fit.tag_id where fit.food_item_id = f.id), '{}')
  from public.share_links s
  join public.food_items f on f.id = s.food_item_id and f.status = 'available'
  join public.places p on p.id = f.place_id and p.status = 'open'
  where s.token_hash = p_token_hash and s.revoked_at is null and s.expires_at > now()
  limit 1;
$$;
revoke all on function public.get_public_share(text) from public, anon, authenticated;
grant execute on function public.get_public_share(text) to service_role;
