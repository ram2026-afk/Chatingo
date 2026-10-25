-- Run this once so chat photos can be stored on messages.

alter table public.messages
  add column if not exists image_url text;
