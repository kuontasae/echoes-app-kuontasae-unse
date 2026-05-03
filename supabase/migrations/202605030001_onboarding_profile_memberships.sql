create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists name text not null default '',
  add column if not exists handle text not null default '',
  add column if not exists avatar text not null default '/default-avatar.png',
  add column if not exists bio text not null default '',
  add column if not exists hashtags text[] not null default '{}',
  add column if not exists "liveHistory" text[] not null default '{}',
  add column if not exists "topArtists" text[] not null default '{}',
  add column if not exists "isPrivate" boolean not null default false,
  add column if not exists age integer,
  add column if not exists gender text,
  add column if not exists "twitterUrl" text,
  add column if not exists "instagramUrl" text;

create table if not exists public.chat_groups (
  id text primary key,
  name text not null,
  avatar text,
  creator_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id text not null references public.chat_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.custom_communities (
  id text primary key,
  name text not null,
  date date not null,
  creator_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

alter table public.profiles enable row level security;
alter table public.chat_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.custom_communities enable row level security;
alter table public.community_members enable row level security;
