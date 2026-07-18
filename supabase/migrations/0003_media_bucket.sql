-- Bucket for uploaded videos (input to the subtitle generator).
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Authenticated members can upload/manage; public read is via object URL only
-- (no broad SELECT policy → clients can't list the bucket).
create policy "media authed insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'media');
create policy "media authed update" on storage.objects
  for update to authenticated using (bucket_id = 'media');
create policy "media authed delete" on storage.objects
  for delete to authenticated using (bucket_id = 'media');
