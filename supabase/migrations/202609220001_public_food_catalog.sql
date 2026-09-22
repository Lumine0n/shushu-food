-- Guests can browse and draw from published catalog entries. Keep profiles,
-- individual experiences, favorites, decisions and every write private.
create policy places_public_read on public.places
  for select to anon using (status = 'open');

create policy food_public_read on public.food_items
  for select to anon using (
    status = 'available' and exists (
      select 1 from public.places p where p.id = place_id and p.status = 'open'
    )
  );

create policy food_tags_public_read on public.food_item_tags
  for select to anon using (
    exists (select 1 from public.food_items f where f.id = food_item_id)
  );

create policy tags_public_read on public.tags
  for select to anon using (
    exists (select 1 from public.food_item_tags fit where fit.tag_id = id)
  );

create policy images_public_read on public.food_item_images
  for select to anon using (
    exists (select 1 from public.food_items f where f.id = food_item_id)
  );

grant select on public.places, public.food_items, public.tags,
  public.food_item_tags, public.food_item_images to anon;
