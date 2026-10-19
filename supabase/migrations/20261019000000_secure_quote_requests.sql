-- Run through Supabase CLI migrations, or paste this into the SQL Editor once.
-- PII is encrypted before it is saved. No browser role can select, insert,
-- update, or delete these tables.

create extension if not exists pgcrypto with schema extensions;

-- Generate an encryption key inside Vault so the key is not committed or
-- copied into the Edge Function environment. This block is safe to re-run.
do $$
begin
  if not exists (
    select 1 from vault.secrets where name = 'quote_encryption_key'
  ) then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'quote_encryption_key',
      'Application-level encryption key for website quote requests'
    );
  end if;
end;
$$;

create table if not exists public.quote_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  request_id uuid not null unique,
  encrypted_payload bytea not null,
  email_status text not null default 'pending'
    check (email_status in ('pending', 'sent', 'failed')),
  email_provider_id text,
  email_error text,
  created_at timestamptz not null default now()
);

-- The only retained anti-abuse metadata is a peppered one-way hash of the IP.
create table if not exists public.quote_submission_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists quote_submission_attempts_ip_created_at_idx
  on public.quote_submission_attempts (ip_hash, created_at desc);

alter table public.quote_requests enable row level security;
alter table public.quote_submission_attempts enable row level security;

revoke all on table public.quote_requests from public, anon, authenticated;
revoke all on table public.quote_submission_attempts from public, anon, authenticated;

-- This is intentionally restricted to service_role. The only caller is the
-- Edge Function, which has already validated the browser request.
create or replace function public.save_quote_submission(
  p_payload jsonb,
  p_ip_hash text,
  p_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  encryption_key text;
  submission_id uuid;
  recent_attempts integer;
begin
  if jsonb_typeof(p_payload) <> 'object'
     or coalesce(length(p_ip_hash), 0) <> 64 then
    raise exception 'Invalid submission' using errcode = '22023';
  end if;

  select id into submission_id
  from public.quote_requests
  where request_id = p_request_id;

  if found then
    return submission_id;
  end if;

  -- Serialize checks for each privacy-preserving IP hash.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_ip_hash, 0));

  select count(*) into recent_attempts
  from public.quote_submission_attempts
  where ip_hash = p_ip_hash
    and created_at > pg_catalog.clock_timestamp() - interval '1 hour';

  if recent_attempts >= 5 then
    raise exception 'Too many requests. Please try again later.' using errcode = 'P0001';
  end if;

  select secret into encryption_key
  from vault.decrypted_secrets
  where name = 'quote_encryption_key'
  limit 1;

  if encryption_key is null then
    raise exception 'Quote encryption is not configured' using errcode = '55000';
  end if;

  insert into public.quote_submission_attempts (ip_hash) values (p_ip_hash);

  insert into public.quote_requests (request_id, encrypted_payload)
  values (
    p_request_id,
    extensions.pgp_sym_encrypt(
      p_payload::text,
      encryption_key,
      'cipher-algo=aes256, compress-algo=1'
    )
  )
  on conflict (request_id) do update set request_id = excluded.request_id
  returning id into submission_id;

  return submission_id;
end;
$$;

create or replace function public.mark_quote_email_status(
  p_submission_id uuid,
  p_status text,
  p_provider_id text default null,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('sent', 'failed') then
    raise exception 'Invalid email status' using errcode = '22023';
  end if;

  update public.quote_requests
  set email_status = p_status,
      email_provider_id = left(p_provider_id, 255),
      email_error = left(p_error, 255)
  where id = p_submission_id;
end;
$$;

revoke all on function public.save_quote_submission(jsonb, text, uuid) from public, anon, authenticated;
revoke all on function public.mark_quote_email_status(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.save_quote_submission(jsonb, text, uuid) to service_role;
grant execute on function public.mark_quote_email_status(uuid, text, text, text) to service_role;
