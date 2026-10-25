-- Run this once if profiles already exists without image_url.

alter table public.profiles
  add column if not exists image_url text;

alter table public.pages
  add column if not exists image_url text;

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
