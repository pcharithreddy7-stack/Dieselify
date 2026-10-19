import { createClient } from 'npm:@supabase/supabase-js@2';

type QuotePayload = {
  name: string;
  phone: string;
  email: string;
  address: string;
  quantity: string;
  company: string;
  maps: string;
  note: string;
};

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? Deno.env.get('ALLOWED_ORIGIN') ?? '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const secretKeys = (() => {
  try {
    return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
})();
// The fallback keeps local development working with older Supabase projects.
const adminKey = secretKeys.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const resendKey = Deno.env.get('RESEND_API_KEY') ?? '';
const quoteToEmail = Deno.env.get('QUOTE_TO_EMAIL') ?? '';
const quoteFromEmail = Deno.env.get('QUOTE_FROM_EMAIL') ?? '';
const rateLimitPepper = Deno.env.get('RATE_LIMIT_PEPPER') ?? '';
const isAllowedOrigin = (origin: string | null) => origin !== null && allowedOrigins.includes(origin);

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : 'null',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
  'Content-Type': 'application/json; charset=utf-8',
});

const response = (request: Request, body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders(request.headers.get('origin')) });

const htmlEscapes: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
};

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => htmlEscapes[character]);

const requiredText = (value: unknown, label: string, maxLength: number) => {
  if (typeof value !== 'string') throw new Error(`${label} is required.`);
  const text = value.trim();
  if (!text || text.length > maxLength) throw new Error(`${label} is invalid.`);
  return text;
};

const optionalText = (value: unknown, label: string, maxLength: number) => {
  if (value === undefined || value === null || value === '') return '';
  return requiredText(value, label, maxLength);
};

const validatePayload = (body: Record<string, unknown>): QuotePayload => {
  const email = requiredText(body.email, 'Email address', 254).toLowerCase();
  const phone = requiredText(body.phone, 'Phone number', 30);
  const quantity = requiredText(body.quantity, 'Diesel quantity', 10);
  const maps = optionalText(body.maps, 'Google Maps link', 2_048);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email address is invalid.');
  if (!/^[0-9+()\-\s]{7,30}$/.test(phone)) throw new Error('Phone number is invalid.');
  if (!/^[1-9]\d{0,6}$/.test(quantity)) throw new Error('Diesel quantity is invalid.');
  if (maps) {
    let url: URL;
    try { url = new URL(maps); } catch { throw new Error('Google Maps link is invalid.'); }
    if (url.protocol !== 'https:') throw new Error('Google Maps link must use HTTPS.');
  }

  return {
    name: requiredText(body.name, 'Full name', 120),
    phone,
    email,
    address: requiredText(body.address, 'Delivery address', 500),
    quantity,
    company: requiredText(body.company, 'Company', 160),
    maps,
    note: optionalText(body.note, 'Additional note', 2_000),
  };
};

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const emailHtml = (quote: QuotePayload) => {
  const field = (label: string, value: string) =>
    `<tr><th align="left" style="padding:6px 12px 6px 0">${label}</th><td style="padding:6px 0;white-space:pre-wrap">${escapeHtml(value || '—')}</td></tr>`;
  return `<h2>New Dieselify quote request</h2><table>${field('Name', quote.name)}${field('Phone', quote.phone)}${field('Email', quote.email)}${field('Company', quote.company)}${field('Quantity (L)', quote.quantity)}${field('Address', quote.address)}${field('Google Maps', quote.maps)}${field('Note', quote.note)}</table>`;
};

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  if (!isAllowedOrigin(origin)) {
    return response(request, { ok: false, message: 'Request origin is not allowed.' }, 403);
  }
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== 'POST') return response(request, { ok: false, message: 'Method not allowed.' }, 405);

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 12_000) return response(request, { ok: false, message: 'Request is too large.' }, 413);

  try {
    if (!supabaseUrl || !adminKey || !resendKey || !quoteToEmail || !quoteFromEmail || !rateLimitPepper) {
      throw new Error('Quote service is not configured.');
    }

    const body = await request.json() as Record<string, unknown>;
    // Return a success response to bots that fill the hidden field without doing work.
    if (typeof body.website === 'string' && body.website.trim()) {
      return response(request, { ok: true });
    }

    const requestId = requiredText(body.requestId, 'Request ID', 36);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
      throw new Error('Invalid request.');
    }
    const quote = validatePayload(body);
    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const ipHash = await sha256(`${rateLimitPepper}:${forwardedFor}`);
    const admin = createClient(supabaseUrl, adminKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: submissionId, error: saveError } = await admin.rpc('save_quote_submission', {
      p_payload: quote,
      p_ip_hash: ipHash,
      p_request_id: requestId,
    });
    if (saveError || !submissionId) {
      const tooManyRequests = saveError?.message.includes('Too many requests');
      return response(request, {
        ok: false,
        message: tooManyRequests ? 'Too many requests. Please try again later.' : 'Unable to submit your request. Please try again.',
      }, tooManyRequests ? 429 : 500);
    }

    const mailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `dieselify-quote/${submissionId}`,
      },
      body: JSON.stringify({
        from: quoteFromEmail,
        to: [quoteToEmail],
        reply_to: quote.email,
        subject: 'New Dieselify quote request',
        html: emailHtml(quote),
      }),
    });

    if (!mailResponse.ok) {
      await admin.rpc('mark_quote_email_status', {
        p_submission_id: submissionId, p_status: 'failed', p_error: 'Email provider request failed',
      });
      return response(request, { ok: false, message: 'Unable to submit your request. Please try again.' }, 502);
    }

    const mail = await mailResponse.json().catch(() => ({})) as { id?: string };
    await admin.rpc('mark_quote_email_status', {
      p_submission_id: submissionId, p_status: 'sent', p_provider_id: mail.id ?? null,
    });
    return response(request, { ok: true });
  } catch (error) {
    const message = error instanceof Error && /is (required|invalid)|must use HTTPS|Quote service/.test(error.message)
      ? error.message
      : 'Unable to submit your request. Please try again.';
    return response(request, { ok: false, message }, 400);
  }
});
