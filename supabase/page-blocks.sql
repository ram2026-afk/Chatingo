-- Run this once if pages already exist without customer-block support.

create table if not exists public.page_blocks (
  page_id uuid not null references public.pages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (page_id, user_id)
);

create index if not exists page_blocks_user_idx
  on public.page_blocks (user_id);

alter table public.page_blocks enable row level security;

revoke all on table public.page_blocks from anon, authenticated;
