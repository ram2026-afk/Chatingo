-- Run this once if conversations already exist without referral columns.

alter table public.conversations
  add column if not exists referred_by uuid references public.profiles (id) on delete set null;

create index if not exists conversations_referred_by_idx
  on public.conversations (referred_by);
