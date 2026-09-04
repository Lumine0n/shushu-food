-- Users need to be able to read their own profile while waiting for an
-- administrator to activate them. Without this, RLS hides the row entirely
-- and the client cannot distinguish an inactive account from a missing one.
drop policy if exists profiles_read_circle on public.profiles;
create policy profiles_read_circle on public.profiles
  for select
  using (auth.uid() = id or public.is_active_user());
