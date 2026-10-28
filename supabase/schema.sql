-- Run this in the Supabase SQL editor for a new project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  welcome text not null default '',
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.page_access (
  page_id uuid not null references public.pages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (page_id, user_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  visitor_name text not null,
  visitor_token text not null unique,
  user_id uuid references public.profiles (id) on delete set null,
  referred_by uuid references public.profiles (id) on delete set null,
  admin_read_at timestamptz,
  user_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender text not null check (sender in ('visitor', 'page')),
  body text not null,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  token text primary key,
  role text not null check (role in ('admin', 'user')),
  account_id uuid references public.profiles (id) on delete cascade,
  expires_at timestamptz not null
);

create index if not exists conversations_page_updated_idx
  on public.conversations (page_id, updated_at desc);

create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

create index if not exists conversations_referred_by_idx
  on public.conversations (referred_by);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

create unique index if not exists conversations_page_user_idx
  on public.conversations (page_id, user_id)
  where user_id is not null;

create index if not exists page_access_user_idx
  on public.page_access (user_id);

create index if not exists sessions_expires_idx
  on public.sessions (expires_at);

alter table public.profiles enable row level security;
alter table public.pages enable row level security;
alter table public.page_access enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.sessions enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.pages from anon, authenticated;
revoke all on table public.page_access from anon, authenticated;
revoke all on table public.conversations from anon, authenticated;
revoke all on table public.messages from anon, authenticated;
revoke all on table public.sessions from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

update storage.buckets
set file_size_limit = 8388608
where id = 'avatars';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
