# Secure quote-form setup

The form sends only to `submit-quote`, which validates the request, stores an encrypted copy, and emails the recipient. The browser never receives a Resend key, Supabase service-role key, database-encryption key, or recipient email address.

## 1. Set the website endpoint

In `script.js`, replace `YOUR_PROJECT_REF` in `QUOTE_FUNCTION_URL` with the reference in your Supabase project URL. For example:

```js
const QUOTE_FUNCTION_URL = 'https://abcdefghijk.supabase.co/functions/v1/submit-quote';
```

Do **not** put the recipient email in `script.js`. Configure it privately in the next step.

## 2. Create the database objects

Open **Supabase Dashboard → SQL Editor**, paste the contents of `supabase/migrations/20261019000000_secure_quote_requests.sql`, and run it once. It enables RLS, removes browser table access, creates a Vault-held encryption key, encrypts each stored response with AES-256 PGP encryption, and grants the two database functions only to `service_role`.

## 3. Set Edge Function secrets

Create a Resend account and verify a sending domain. Then set these secrets in **Edge Functions → Secrets**, or using the CLI below. `ALLOWED_ORIGINS` accepts one or more exact, comma-separated HTTPS origins without trailing slashes.

```bash
supabase secrets set --project-ref YOUR_PROJECT_REF \
  ALLOWED_ORIGINS=https://dieselify.co,https://www.dieselify.co \
  QUOTE_TO_EMAIL=connect@dieselify.co \
  QUOTE_FROM_EMAIL='Dieselify Website <quotes@your-verified-domain.com>' \
  RESEND_API_KEY=re_your_resend_key \
  RATE_LIMIT_PEPPER='a-long-random-secret-at-least-32-characters'
```

`SUPABASE_URL` and `SUPABASE_SECRET_KEYS` are supplied to hosted Edge Functions by Supabase. Never add either to the website or a committed `.env` file. The function falls back to the legacy `SUPABASE_SERVICE_ROLE_KEY` only for older local projects.

## 4. Deploy

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy submit-quote
```

The included `supabase/config.toml` deliberately makes this function public because website visitors are not logged in. It instead permits only `ALLOWED_ORIGINS`, limits each privacy-preserving IP hash to five requests/hour, validates input server-side, uses a honeypot, and rejects all database access from `anon` and `authenticated` roles.

## 5. Test

Submit the deployed form once. You should receive an email at `QUOTE_TO_EMAIL`. In Supabase’s Table Editor, `quote_requests.encrypted_payload` will appear as encrypted binary rather than readable customer details; this is expected. Check the Edge Function logs if the browser reports an error.

Resend’s verified sender is required. `onboarding@resend.dev` is useful only for initial Resend testing, not normal delivery from your domain.
