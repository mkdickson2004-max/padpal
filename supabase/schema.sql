-- PadPal Database Schema

-- Enable RLS
alter table if exists public.users enable row level security;

-- Users table (synced with auth)
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  name text,
  avatar_url text,
  venmo_handle text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Houses table
create table if not exists public.houses (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  address text not null,
  lat decimal(10,8),
  lng decimal(11,8),
  geofence_radius_m integer default 150,
  invite_code text unique not null,
  created_by uuid references public.users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Memberships table
create table if not exists public.memberships (
  id uuid default gen_random_uuid() primary key,
  house_id uuid references public.houses(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role text default 'member' check (role in ('admin', 'member')),
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(house_id, user_id)
);

-- Tasks table (chores, supply runs, etc.)
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  house_id uuid references public.houses(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  type text check (type in ('chore', 'supply', 'party', 'bill')) not null,
  subtype text,
  description text not null,
  photo_url text,
  points integer default 0,
  status text default 'pending' check (status in ('pending', 'verified', 'rejected')),
  ai_confidence decimal(3,2),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Bills table
create table if not exists public.bills (
  id uuid default gen_random_uuid() primary key,
  house_id uuid references public.houses(id) on delete cascade not null,
  vendor text not null,
  total_amount decimal(10,2) not null,
  due_date date,
  status text default 'open' check (status in ('open', 'settled')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Bill splits table
create table if not exists public.bill_splits (
  id uuid default gen_random_uuid() primary key,
  bill_id uuid references public.bills(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  amount decimal(10,2) not null,
  venmo_link text,
  status text default 'requested' check (status in ('requested', 'paid')),
  paid_at timestamp with time zone,
  unique(bill_id, user_id)
);

-- Leaderboard entries
create table if not exists public.leaderboard_entries (
  id uuid default gen_random_uuid() primary key,
  house_id uuid references public.houses(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  category text check (category in ('chore_king', 'supply_hero', 'bill_boss', 'party_mvp', 'total')) not null,
  points integer default 0,
  period text check (period in ('weekly', 'monthly')) not null,
  period_start date not null,
  period_end date not null,
  unique(house_id, user_id, category, period, period_start)
);

-- Activity log
create table if not exists public.activity_log (
  id uuid default gen_random_uuid() primary key,
  house_id uuid references public.houses(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete set null,
  type text not null,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies

-- Users: can read own, insert own
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Houses: members can read their houses
-- Note: Need to create a function to check house membership

-- Tasks: house members can view and create
create policy "Tasks viewable by house members"
  on public.tasks for select
  using (
    exists (
      select 1 from public.memberships
      where memberships.house_id = tasks.house_id
      and memberships.user_id = auth.uid()
    )
  );

create policy "Tasks insertable by house members"
  on public.tasks for insert
  with check (
    exists (
      select 1 from public.memberships
      where memberships.house_id = tasks.house_id
      and memberships.user_id = auth.uid()
    )
  );

-- Memberships: viewable by house members
create policy "Memberships viewable by house members"
  on public.memberships for select
  using (
    exists (
      select 1 from public.memberships m2
      where m2.house_id = memberships.house_id
      and m2.user_id = auth.uid()
    )
  );

-- Leaderboard: viewable by house members
create policy "Leaderboard viewable by house members"
  on public.leaderboard_entries for select
  using (
    exists (
      select 1 from public.memberships
      where memberships.house_id = leaderboard_entries.house_id
      and memberships.user_id = auth.uid()
    )
  );

-- Bills: viewable by house members
create policy "Bills viewable by house members"
  on public.bills for select
  using (
    exists (
      select 1 from public.memberships
      where memberships.house_id = bills.house_id
      and memberships.user_id = auth.uid()
    )
  );

-- Indexes for performance
create index if not exists idx_tasks_house_id on public.tasks(house_id);
create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_memberships_house_id on public.memberships(house_id);
create index if not exists idx_memberships_user_id on public.memberships(user_id);
create index if not exists idx_leaderboard_house_id on public.leaderboard_entries(house_id);
create index if not exists idx_bills_house_id on public.bills(house_id);
