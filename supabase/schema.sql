-- ============================================================
--  Team SRC · Supabase schema
--  Run this whole file once: Supabase dashboard → SQL Editor → New query → Run
--  Before you run it: change CHANGE-THIS-ADMIN-PASSCODE (near the bottom).
-- ============================================================

-- ---------- 1. Members table ----------
create table if not exists public.members (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 2 and 60),
  role        text not null default 'Volunteer'
              check (role in ('Lead','Event Lead','Event Crew','Media','Tech','Design','Volunteer')),
  photo_url   text check (photo_url is null or photo_url ~ '^(https://|images/)[^[:space:]<>"'']{3,250}$'),
  instagram   text check (instagram is null or instagram ~ '^https://[^[:space:]<>"'']{4,250}$'),
  linkedin    text check (linkedin  is null or linkedin  ~ '^https://[^[:space:]<>"'']{4,250}$'),
  github      text check (github    is null or github    ~ '^https://[^[:space:]<>"'']{4,250}$'),
  x           text check (x         is null or x         ~ '^https://[^[:space:]<>"'']{4,250}$'),
  youtube     text check (youtube   is null or youtube   ~ '^https://[^[:space:]<>"'']{4,250}$'),
  whatsapp    text check (whatsapp  is null or whatsapp  ~ '^https://wa\.me/[0-9]{8,15}$'),
  email       text check (email     is null or email     ~ '^[^@[:space:]<>"'']{1,64}@[^@[:space:]<>"'']{1,150}\.[^@[:space:]<>"'']{2,20}$'),
  website     text check (website   is null or website   ~ '^https://[^[:space:]<>"'']{4,250}$'),
  sort_order  int  not null default 100,        -- lower number = shown first
  hidden      boolean not null default false,   -- admin can hide a card
  edit_hash   text not null,                    -- sha256 of the private edit key (never readable by the public)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists members_order_idx on public.members (sort_order, created_at);

-- ---------- 2. Private config (admin passcode, open/closed) ----------
create table if not exists public.app_config (
  key   text primary key,
  value text not null
);
alter table public.app_config enable row level security;      -- no policies = nobody can read it directly
revoke all on public.app_config from anon, authenticated;

-- ---------- 3. Row level security: public can only READ visible cards ----------
alter table public.members enable row level security;

drop policy if exists "public can read visible members" on public.members;
create policy "public can read visible members"
  on public.members for select
  to anon, authenticated
  using (hidden = false);

-- No insert/update/delete policies on purpose: every write goes through the functions below.
revoke all on public.members from anon, authenticated;
grant select (id, name, role, photo_url, instagram, linkedin, github, x, youtube, whatsapp,
              email, website, sort_order, hidden, created_at, updated_at)
  on public.members to anon, authenticated;     -- edit_hash is deliberately NOT granted

-- ---------- 4. Helpers (not callable from the browser) ----------
create or replace function public._hash(p text) returns text
  language sql immutable
  as $$ select encode(sha256(convert_to(coalesce(p,''), 'utf8')), 'hex') $$;

create or replace function public._is_admin(p_pass text) returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from app_config where key = 'admin_hash' and value = _hash(p_pass)) $$;

create or replace function public._is_open() returns boolean
  language sql stable security definer set search_path = public
  as $$ select coalesce((select value from app_config where key = 'submissions_open'), 'true') <> 'false' $$;

revoke execute on function public._hash(text)     from public, anon, authenticated;
revoke execute on function public._is_admin(text) from public, anon, authenticated;
revoke execute on function public._is_open()      from public, anon, authenticated;

-- ---------- 5. Public functions (called from the website) ----------

-- Is the page still accepting new cards / edits?
create or replace function public.is_open() returns boolean
  language sql stable security definer set search_path = public
  as $$ select _is_open() $$;

-- Add a card. Returns the new id and the PRIVATE edit key (shown once to the person).
create or replace function public.add_member(
  p_name text, p_role text, p_photo_url text,
  p_instagram text default null, p_linkedin text default null, p_github text default null,
  p_x text default null, p_youtube text default null, p_whatsapp text default null,
  p_email text default null, p_website text default null, p_hp text default ''
) returns table (id uuid, edit_key text)
  language plpgsql security definer set search_path = public
as $$
declare v_key text; v_id uuid;
begin
  if coalesce(p_hp,'') <> '' then raise exception 'rejected'; end if;                 -- honeypot (bots fill it)
  if not _is_open() then raise exception 'closed'; end if;
  if (select count(*) from members) >= 500 then raise exception 'full'; end if;
  if (select count(*) from members where created_at > now() - interval '1 minute') >= 25 then
    raise exception 'slow down';
  end if;

  v_key := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into members (name, role, photo_url, instagram, linkedin, github, x, youtube, whatsapp, email, website, edit_hash)
  values (btrim(p_name), p_role, nullif(p_photo_url,''), nullif(p_instagram,''), nullif(p_linkedin,''),
          nullif(p_github,''), nullif(p_x,''), nullif(p_youtube,''), nullif(p_whatsapp,''),
          nullif(p_email,''), nullif(p_website,''), _hash(v_key))
  returning members.id into v_id;

  return query select v_id, v_key;
end $$;

-- Edit your own card (needs the private edit key).
create or replace function public.update_member(
  p_id uuid, p_key text, p_name text, p_role text, p_photo_url text,
  p_instagram text default null, p_linkedin text default null, p_github text default null,
  p_x text default null, p_youtube text default null, p_whatsapp text default null,
  p_email text default null, p_website text default null
) returns void
  language plpgsql security definer set search_path = public
as $$
begin
  if not _is_open() then raise exception 'closed'; end if;
  update members set
    name = btrim(p_name), role = p_role, photo_url = nullif(p_photo_url,''),
    instagram = nullif(p_instagram,''), linkedin = nullif(p_linkedin,''), github = nullif(p_github,''),
    x = nullif(p_x,''), youtube = nullif(p_youtube,''), whatsapp = nullif(p_whatsapp,''),
    email = nullif(p_email,''), website = nullif(p_website,''), updated_at = now()
  where members.id = p_id and edit_hash = _hash(p_key);
  if not found then raise exception 'not allowed'; end if;
end $$;

-- Delete your own card.
create or replace function public.delete_member(p_id uuid, p_key text) returns void
  language plpgsql security definer set search_path = public
as $$
begin
  delete from members where id = p_id and edit_hash = _hash(p_key);
  if not found then raise exception 'not allowed'; end if;
end $$;

-- ---------- 6. Admin functions (used by admin.html) ----------
create or replace function public.admin_list(p_pass text) returns jsonb
  language plpgsql stable security definer set search_path = public
as $$
begin
  if not _is_admin(p_pass) then raise exception 'wrong passcode'; end if;
  return jsonb_build_object(
    'open', _is_open(),
    'members', coalesce((select jsonb_agg(to_jsonb(m) - 'edit_hash' order by m.sort_order, m.created_at) from members m), '[]'::jsonb)
  );
end $$;

create or replace function public.admin_update(p_pass text, p_id uuid, p_role text, p_sort int, p_hidden boolean)
  returns void language plpgsql security definer set search_path = public
as $$
begin
  if not _is_admin(p_pass) then raise exception 'wrong passcode'; end if;
  update members set role = p_role, sort_order = p_sort, hidden = p_hidden, updated_at = now() where id = p_id;
end $$;

create or replace function public.admin_delete(p_pass text, p_id uuid) returns void
  language plpgsql security definer set search_path = public
as $$
begin
  if not _is_admin(p_pass) then raise exception 'wrong passcode'; end if;
  delete from members where id = p_id;
end $$;

create or replace function public.admin_set_open(p_pass text, p_open boolean) returns void
  language plpgsql security definer set search_path = public
as $$
begin
  if not _is_admin(p_pass) then raise exception 'wrong passcode'; end if;
  insert into app_config (key, value) values ('submissions_open', case when p_open then 'true' else 'false' end)
  on conflict (key) do update set value = excluded.value;
end $$;

grant execute on function
  public.is_open(),
  public.add_member(text,text,text,text,text,text,text,text,text,text,text,text),
  public.update_member(uuid,text,text,text,text,text,text,text,text,text,text,text,text),
  public.delete_member(uuid,text),
  public.admin_list(text),
  public.admin_update(text,uuid,text,int,boolean),
  public.admin_delete(text,uuid),
  public.admin_set_open(text,boolean)
to anon, authenticated;

-- ---------- 7. Photo storage ----------
-- Public bucket: anyone can VIEW photos; browsers can only UPLOAD small images into members/.
-- (Only runs on Supabase, where the storage schema exists.)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "anyone can upload member photos" on storage.objects;
create policy "anyone can upload member photos"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = 'members'
    and lower(storage.extension(name)) in ('jpg','jpeg','png','webp')
  );

-- ---------- 8. Admin passcode ----------
-- ▼▼▼ CHANGE THE PASSCODE BELOW BEFORE RUNNING (use 12+ characters) ▼▼▼
insert into public.app_config (key, value)
values ('admin_hash', encode(sha256(convert_to('CHANGE-THIS-ADMIN-PASSCODE','utf8')),'hex'))
on conflict (key) do nothing;
insert into public.app_config (key, value) values ('submissions_open','true')
on conflict (key) do nothing;
