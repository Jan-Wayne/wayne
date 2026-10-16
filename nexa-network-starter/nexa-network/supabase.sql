-- Nexa Network starter schema for Supabase.
-- Run in Supabase Dashboard > SQL Editor.
-- This schema uses Supabase Auth and Row Level Security (RLS).

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Nexa Member' check (char_length(full_name) between 2 and 80),
  headline text not null default '' check (char_length(headline) <= 140),
  location text not null default '' check (char_length(location) <= 100),
  about text not null default '' check (char_length(about) <= 1200),
  skills text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 3000),
  created_at timestamptz not null default now()
);

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connection_not_self check (requester_id <> addressee_id),
  constraint connection_pair_unique unique (requester_id, addressee_id)
);

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_user_id_idx on public.posts(user_id);
create index if not exists connections_addressee_idx on public.connections(addressee_id);
create index if not exists connections_requester_idx on public.connections(requester_id);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.connections enable row level security;

-- Public profiles are visible to signed-in users; users may only edit their own profile.
drop policy if exists "Profiles visible to authenticated users" on public.profiles;
create policy "Profiles visible to authenticated users"
on public.profiles for select to authenticated using (true);

drop policy if exists "Users create their own profile" on public.profiles;
create policy "Users create their own profile"
on public.profiles for insert to authenticated with check (auth.uid() = id);

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile"
on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Authenticated users can read the feed. A member can only publish/delete their own posts.
drop policy if exists "Posts visible to authenticated users" on public.posts;
create policy "Posts visible to authenticated users"
on public.posts for select to authenticated using (true);

drop policy if exists "Users create their own posts" on public.posts;
create policy "Users create their own posts"
on public.posts for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users delete their own posts" on public.posts;
create policy "Users delete their own posts"
on public.posts for delete to authenticated using (auth.uid() = user_id);

-- Participants can see their own connection requests. Requester creates pending requests.
drop policy if exists "Participants view connections" on public.connections;
create policy "Participants view connections"
on public.connections for select to authenticated
using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "Users send connection requests" on public.connections;
create policy "Users send connection requests"
on public.connections for insert to authenticated
with check (auth.uid() = requester_id and status = 'pending');

-- Only the recipient can accept/decline; only participants can update a connection.
drop policy if exists "Recipients respond to requests" on public.connections;
create policy "Recipients respond to requests"
on public.connections for update to authenticated
using (auth.uid() = addressee_id)
with check (auth.uid() = addressee_id and status in ('accepted','declined'));

-- Create a profile row after each new auth account. Name comes from signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Do not expose the service_role key in frontend code. Only use the anon/publishable key.
