-- Adds a human-friendly, never-reused quote number: #D1, #D2, #D3, ...
-- Run this migration after 20261019000000_secure_quote_requests.sql.

create sequence if not exists public.quote_order_number_seq start with 1;

alter table public.quote_requests
  add column if not exists order_number bigint;

alter table public.quote_requests
  alter column order_number set default nextval('public.quote_order_number_seq');

-- Backfill any quote rows that existed before order numbers were introduced.
update public.quote_requests
set order_number = nextval('public.quote_order_number_seq')
where order_number is null;

alter table public.quote_requests
  alter column order_number set not null;

create unique index if not exists quote_requests_order_number_key
  on public.quote_requests (order_number);

alter sequence public.quote_order_number_seq
  owned by public.quote_requests.order_number;

select setval(
  'public.quote_order_number_seq',
  greatest((select coalesce(max(order_number), 0) from public.quote_requests), 1),
  (select count(*) > 0 from public.quote_requests)
);

-- The original RPC returns only the UUID. This server-only wrapper also returns
-- the assigned order number for the email, without exposing the quote table.
create or replace function public.save_quote_submission_with_order_number(
  p_payload jsonb,
  p_ip_hash text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission_id uuid;
  v_order_number bigint;
begin
  v_submission_id := public.save_quote_submission(p_payload, p_ip_hash, p_request_id);

  select order_number into v_order_number
  from public.quote_requests
  where id = v_submission_id;

  if v_order_number is null then
    raise exception 'Quote order number was not created' using errcode = '55000';
  end if;

  return jsonb_build_object(
    'submissionId', v_submission_id,
    'orderNumber', v_order_number
  );
end;
$$;

revoke all on function public.save_quote_submission_with_order_number(jsonb, text, uuid)
  from public, anon, authenticated;
grant execute on function public.save_quote_submission_with_order_number(jsonb, text, uuid)
  to service_role;
