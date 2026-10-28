-- Run this once if conversations already exist without join approval.

alter table public.conversations
  add column if not exists status text;

update public.conversations
set status = 'accepted'
where status is null;

alter table public.conversations
  alter column status set default 'accepted';

alter table public.conversations
  drop constraint if exists conversations_status_check;

alter table public.conversations
  add constraint conversations_status_check
  check (status in ('pending', 'accepted'));
