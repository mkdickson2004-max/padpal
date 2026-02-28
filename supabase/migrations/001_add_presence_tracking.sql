-- Migration: Add presence tracking for "Who's Home" feature

-- Add last_seen_at to users table for quick presence checks
alter table public.users add column if not exists last_seen_at timestamp with time zone;

-- Create presence_events table for check-in history
create table if not exists public.presence_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  house_id uuid references public.houses(id) on delete cascade not null,
  lat decimal(10,8) not null,
  lng decimal(11,8) not null,
  distance_m integer not null,
  is_at_home boolean not null,
  accuracy integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for common queries
create index if not exists idx_presence_events_user_id on public.presence_events(user_id);
create index if not exists idx_presence_events_house_id on public.presence_events(house_id);
create index if not exists idx_presence_events_created_at on public.presence_events(created_at desc);
create index if not exists idx_presence_events_user_house on public.presence_events(user_id, house_id, created_at desc);

-- RLS Policies for presence_events

-- Users can view presence events from their house members
CREATE POLICY IF NOT EXISTS "presence_events viewable by house members"
  on public.presence_events for select
  using (
    exists (
      select 1 from public.memberships m
      where m.house_id = presence_events.house_id
      and m.user_id = auth.uid()
    )
  );

-- Users can only insert their own presence events
CREATE POLICY IF NOT EXISTS "presence_events insertable by self"
  on public.presence_events for insert
  with check (auth.uid() = user_id);

-- Users can only delete their own presence events
CREATE POLICY IF NOT EXISTS "presence_events deletable by self"
  on public.presence_events for delete
  using (auth.uid() = user_id);

-- Function to update user's last_seen_at when they check in
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET last_seen_at = NEW.created_at
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update last_seen_at on check-in
DROP TRIGGER IF EXISTS update_last_seen_on_checkin ON public.presence_events;
CREATE TRIGGER update_last_seen_on_checkin
  AFTER INSERT ON public.presence_events
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_seen();
