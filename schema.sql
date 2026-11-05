-- Supabase Database Schema for Daily AI Discovery
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

create table if not exists public.discoveries (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  name text not null unique,
  developer text,
  category text not null,
  short_verdict text,
  what_it_does text,
  free_tier text,
  limits text,
  signup_pakistan text,
  official_url text,
  use_url text,
  android_app_verified boolean default false,
  android_play_url text,
  quality_evidence text,
  synced_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS)
alter table public.discoveries enable row level security;

-- Allow public read access to all verified discoveries
create policy "Allow public read access"
  on public.discoveries
  for select
  using (true);

-- Allow authenticated users or service role to insert/update discoveries
create policy "Allow authorized insert and update"
  on public.discoveries
  for all
  using (auth.role() = 'authenticated' or auth.role() = 'service_role');
