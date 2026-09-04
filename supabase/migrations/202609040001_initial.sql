create extension if not exists pgcrypto;

create type public.profile_role as enum ('admin', 'member');
create type public.profile_status as enum ('active', 'inactive');
create type public.place_status as enum ('open', 'closed');
create type public.food_status as enum ('available', 'unavailable');
create type public.experience_attitude as enum ('again', 'neutral', 'avoid');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 40),
  avatar_url text,
  role public.profile_role not null default 'member',
  status public.profile_status not null default 'inactive',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  normalized_name text not null,
  category text not null default '其他',
  address text not null check (char_length(address) between 1 and 200),
  latitude numeric(9,6) not null check (latitude between -90 and 90),
  longitude numeric(9,6) not null check (longitude between -180 and 180),
  status public.place_status not null default 'open',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index places_location_idx on public.places(latitude, longitude);
create index places_normalized_name_idx on public.places(normalized_name);

create table public.food_items (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  normalized_name text not null,
  description text not null default '' check (char_length(description) <= 240),
  price_cents integer check (price_cents > 0 and price_cents <= 100000),
  meal_type text not null check (meal_type in ('正餐','夜宵','甜品','饮品','小吃')),
  service_modes text[] not null default '{}',
  status public.food_status not null default 'available',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(place_id, normalized_name)
);

create index food_items_place_idx on public.food_items(place_id);
create index food_items_status_type_idx on public.food_items(status, meal_type);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 30),
  created_at timestamptz not null default now()
);

create table public.food_item_tags (
  food_item_id uuid not null references public.food_items(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key(food_item_id, tag_id)
);

create table public.food_item_images (
  id uuid primary key default gen_random_uuid(),
  food_item_id uuid not null references public.food_items(id) on delete cascade,
  url text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index food_item_images_food_idx on public.food_item_images(food_item_id, sort_order);

create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  food_item_id uuid not null references public.food_items(id) on delete cascade,
  attitude public.experience_attitude not null,
  reason text check (char_length(reason) <= 240),
  observed_price_cents integer check (observed_price_cents > 0 and observed_price_cents <= 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, food_item_id)
);

create index experiences_food_attitude_idx on public.experiences(food_item_id, attitude);

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  food_item_id uuid not null references public.food_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, food_item_id)
);

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  input jsonb not null,
  selected_food_id uuid references public.food_items(id),
  selected_at timestamptz,
  feedback_pending boolean not null default false,
  created_at timestamptz not null default now()
);

create index decisions_user_created_idx on public.decisions(user_id, created_at desc);
create index decisions_pending_idx on public.decisions(user_id, feedback_pending) where feedback_pending = true;

create table public.decision_candidates (
  decision_id uuid not null references public.decisions(id) on delete cascade,
  food_item_id uuid not null references public.food_items(id),
  rank smallint not null check (rank between 1 and 9),
  score numeric(6,2) not null,
  reasons text[] not null default '{}',
  primary key(decision_id, food_item_id),
  unique(decision_id, rank)
);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  food_item_id uuid not null references public.food_items(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index share_links_lookup_idx on public.share_links(token_hash, expires_at) where revoked_at is null;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger places_touch before update on public.places for each row execute function public.touch_updated_at();
create trigger food_items_touch before update on public.food_items for each row execute function public.touch_updated_at();
create trigger experiences_touch before update on public.experiences for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user() returns trigger security definer set search_path = public language plpgsql as $$
begin
  insert into public.profiles(id, nickname) values (new.id, coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_active_user() returns boolean security definer set search_path = public language sql stable as $$
  select exists(select 1 from public.profiles where id = auth.uid() and status = 'active');
$$;
create or replace function public.is_admin() returns boolean security definer set search_path = public language sql stable as $$
  select exists(select 1 from public.profiles where id = auth.uid() and status = 'active' and role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.food_items enable row level security;
alter table public.tags enable row level security;
alter table public.food_item_tags enable row level security;
alter table public.food_item_images enable row level security;
alter table public.experiences enable row level security;
alter table public.favorites enable row level security;
alter table public.decisions enable row level security;
alter table public.decision_candidates enable row level security;
alter table public.share_links enable row level security;

create policy profiles_read_circle on public.profiles for select using (public.is_active_user());
create policy profiles_update_self on public.profiles for update using (auth.uid() = id or public.is_admin()) with check (auth.uid() = id or public.is_admin());

create policy places_read on public.places for select using (public.is_active_user());
create policy places_insert on public.places for insert with check (public.is_active_user() and created_by = auth.uid());
create policy places_update on public.places for update using (created_by = auth.uid() or public.is_admin()) with check (created_by = auth.uid() or public.is_admin());

create policy food_read on public.food_items for select using (public.is_active_user());
create policy food_insert on public.food_items for insert with check (public.is_active_user() and created_by = auth.uid());
create policy food_update on public.food_items for update using (created_by = auth.uid() or public.is_admin()) with check (created_by = auth.uid() or public.is_admin());

create policy tags_read on public.tags for select using (public.is_active_user());
create policy food_tags_read on public.food_item_tags for select using (public.is_active_user());
create policy images_read on public.food_item_images for select using (public.is_active_user());
create policy images_insert on public.food_item_images for insert with check (public.is_active_user() and uploaded_by = auth.uid());
create policy images_update on public.food_item_images for update using (uploaded_by = auth.uid() or public.is_admin());

create policy experiences_read on public.experiences for select using (public.is_active_user());
create policy experiences_insert on public.experiences for insert with check (public.is_active_user() and user_id = auth.uid());
create policy experiences_update on public.experiences for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy experiences_delete on public.experiences for delete using (user_id = auth.uid());

create policy favorites_own on public.favorites for all using (user_id = auth.uid() and public.is_active_user()) with check (user_id = auth.uid() and public.is_active_user());
create policy decisions_own on public.decisions for all using (user_id = auth.uid() and public.is_active_user()) with check (user_id = auth.uid() and public.is_active_user());
create policy candidates_own on public.decision_candidates for all using (exists(select 1 from public.decisions d where d.id = decision_id and d.user_id = auth.uid())) with check (exists(select 1 from public.decisions d where d.id = decision_id and d.user_id = auth.uid()));
create policy shares_own on public.share_links for all using (created_by = auth.uid() and public.is_active_user()) with check (created_by = auth.uid() and public.is_active_user());

create or replace function public.attach_food_tag(p_food_id uuid, p_tag_name text) returns void
security definer set search_path = public language plpgsql as $$
declare v_tag_id uuid;
begin
  if not public.is_active_user() then raise exception 'inactive user'; end if;
  if not exists(select 1 from public.food_items where id = p_food_id and (created_by = auth.uid() or public.is_admin())) then raise exception 'not allowed'; end if;
  insert into public.tags(name) values (trim(p_tag_name)) on conflict(name) do update set name = excluded.name returning id into v_tag_id;
  insert into public.food_item_tags(food_item_id, tag_id) values (p_food_id, v_tag_id) on conflict do nothing;
end;
$$;

create or replace function public.get_public_share(p_token_hash text)
returns table(food_name text, place_name text, address text, image_url text, price_cents integer, positive_count bigint, tags text[])
security definer set search_path = public language sql stable as $$
  select f.name, p.name, p.address,
    (select i.url from public.food_item_images i where i.food_item_id = f.id order by i.sort_order, i.created_at limit 1),
    f.price_cents,
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

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('food-images', 'food-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

create policy food_images_public_read on storage.objects for select using (bucket_id = 'food-images');
create policy food_images_member_upload on storage.objects for insert to authenticated with check (bucket_id = 'food-images' and public.is_active_user() and (storage.foldername(name))[1] = auth.uid()::text);
create policy food_images_owner_update on storage.objects for update to authenticated using (bucket_id = 'food-images' and owner_id = auth.uid()::text);
create policy food_images_owner_delete on storage.objects for delete to authenticated using (bucket_id = 'food-images' and owner_id = auth.uid()::text);

grant execute on function public.attach_food_tag(uuid, text) to authenticated;
