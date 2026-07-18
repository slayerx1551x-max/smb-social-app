-- Public buckets serve objects via their public URL without a SELECT policy on
-- storage.objects. Ensure no broad read policy exists so clients can't LIST the
-- bucket. (0001 no longer creates one; this is a safety net for older DBs.)
drop policy if exists "brand-logos public read" on storage.objects;
