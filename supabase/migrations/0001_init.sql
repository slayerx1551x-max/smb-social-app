-- =============================================================
-- SMB Social Media Marketing App — Phase 1 schema
-- Tenant = business. Users join businesses via workspace_members.
-- Platforms: instagram, youtube, tiktok, facebook.
-- =============================================================

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type platform       as enum ('instagram', 'youtube', 'tiktok', 'facebook');
create type member_role    as enum ('owner', 'admin', 'member');
create type content_type   as enum ('post', 'graphic', 'caption', 'subtitle', 'animation', 'video');
create type content_status as enum ('draft', 'approved', 'scheduled', 'published', 'failed');

-- ---------- updated_at helper ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================
-- profiles (public mirror of auth.users — the spec's `users`)
-- =============================================================
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- businesses (tenant + brand profile the AI reads)
-- =============================================================
create table public.businesses (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  type                    text,
  brand_colors            jsonb not null default '[]'::jsonb,
  logo_url                text,
  tone                    text,
  description             text,
  onboarding_completed_at timestamptz,
  created_by              uuid references public.profiles(id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create trigger trg_businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();

-- =============================================================
-- workspace_members (user <-> business)
-- =============================================================
create table public.workspace_members (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        member_role not null default 'owner',
  created_at  timestamptz not null default now(),
  unique (business_id, user_id)
);
create index idx_members_user on public.workspace_members(user_id);
create index idx_members_business on public.workspace_members(business_id);

create or replace function public.is_member_of(b_id uuid)
returns boolean language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.business_id = b_id and m.user_id = auth.uid()
  );
$$;

-- =============================================================
-- connected_accounts (OAuth for IG / YouTube / TikTok / Facebook)
-- =============================================================
create table public.connected_accounts (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  platform         platform not null,
  account_id       text,
  account_name     text,
  access_token     text,   -- SENSITIVE: server-only (column grants below)
  refresh_token    text,   -- SENSITIVE: server-only
  token_expires_at timestamptz,
  scopes           text[],
  status           text not null default 'connected',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (business_id, platform, account_id)
);
create trigger trg_accounts_updated_at before update on public.connected_accounts
  for each row execute function public.set_updated_at();

-- =============================================================
-- content_items (outputs of the generators + posts)
-- =============================================================
create table public.content_items (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  type             content_type not null default 'post',
  status           content_status not null default 'draft',
  caption          text,
  hashtags         text[] not null default '{}',
  media_url        text,
  platform         platform,
  scheduled_for    timestamptz,
  published_at     timestamptz,
  external_post_id text,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_content_business_status on public.content_items(business_id, status);
create trigger trg_content_updated_at before update on public.content_items
  for each row execute function public.set_updated_at();

-- =============================================================
-- metrics (account-level and post-level samples)
-- =============================================================
create table public.metrics (
  id                   uuid primary key default gen_random_uuid(),
  business_id          uuid not null references public.businesses(id) on delete cascade,
  connected_account_id uuid references public.connected_accounts(id) on delete set null,
  content_id           uuid references public.content_items(id) on delete cascade,
  platform             platform not null,
  followers            integer,
  reach                integer,
  engagement           integer,
  views                integer,
  likes                integer,
  comments             integer,
  collected_at         timestamptz not null default now(),
  created_at           timestamptz not null default now()
);
create index idx_metrics_business on public.metrics(business_id, platform, collected_at);
create index idx_metrics_content on public.metrics(content_id);

-- =============================================================
-- Row Level Security
-- =============================================================
alter table public.profiles           enable row level security;
alter table public.businesses         enable row level security;
alter table public.workspace_members  enable row level security;
alter table public.connected_accounts enable row level security;
alter table public.content_items      enable row level security;
alter table public.metrics            enable row level security;

create policy "own profile - select" on public.profiles
  for select using (id = auth.uid());
create policy "own profile - update" on public.profiles
  for update using (id = auth.uid());

create policy "businesses - member select" on public.businesses
  for select using (public.is_member_of(id));
create policy "businesses - authed insert" on public.businesses
  for insert with check (auth.uid() = created_by);
create policy "businesses - member update" on public.businesses
  for update using (public.is_member_of(id));

create policy "members - select" on public.workspace_members
  for select using (public.is_member_of(business_id));
create policy "members - self insert" on public.workspace_members
  for insert with check (user_id = auth.uid());
create policy "members - self delete" on public.workspace_members
  for delete using (user_id = auth.uid());

create policy "accounts - member all" on public.connected_accounts
  for all using (public.is_member_of(business_id)) with check (public.is_member_of(business_id));

create policy "content - member all" on public.content_items
  for all using (public.is_member_of(business_id)) with check (public.is_member_of(business_id));

create policy "metrics - member select" on public.metrics
  for select using (public.is_member_of(business_id));

-- Protect OAuth tokens from client reads/writes (edge functions use service role).
revoke select (access_token, refresh_token) on public.connected_accounts from anon, authenticated;
revoke insert (access_token, refresh_token) on public.connected_accounts from anon, authenticated;
revoke update (access_token, refresh_token) on public.connected_accounts from anon, authenticated;

-- =============================================================
-- create_business RPC (atomic business + owner membership)
-- =============================================================
create or replace function public.create_business(
  p_name         text,
  p_type         text default null,
  p_description  text default null,
  p_tone         text default null,
  p_brand_colors jsonb default '[]'::jsonb
)
returns public.businesses
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_biz public.businesses;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  insert into public.businesses (name, type, description, tone, brand_colors, created_by)
  values (p_name, p_type, p_description, p_tone, coalesce(p_brand_colors, '[]'::jsonb), v_uid)
  returning * into v_biz;
  insert into public.workspace_members (business_id, user_id, role)
  values (v_biz.id, v_uid, 'owner');
  return v_biz;
end;
$$;

-- Lock down SECURITY DEFINER functions.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_member_of(uuid) from public;
grant  execute on function public.is_member_of(uuid) to authenticated;
revoke execute on function public.create_business(text, text, text, text, jsonb) from public, anon;
grant  execute on function public.create_business(text, text, text, text, jsonb) to authenticated;

-- =============================================================
-- Storage: brand-logos bucket (public read via URL, member write)
-- =============================================================
insert into storage.buckets (id, name, public)
values ('brand-logos', 'brand-logos', true)
on conflict (id) do nothing;

create policy "brand-logos authed insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'brand-logos');
create policy "brand-logos authed update" on storage.objects
  for update to authenticated using (bucket_id = 'brand-logos');
create policy "brand-logos authed delete" on storage.objects
  for delete to authenticated using (bucket_id = 'brand-logos');
