# Dieselify Website — Client Handover

**Website:** [https://dieselify.co](https://dieselify.co)  
**Primary contact email:** connect@dieselify.co  
**Primary contact number:** +91 81233 35705  
**Prepared:** 19 October 2026

## 1. Website purpose

The Dieselify website presents on-site diesel delivery services and gives businesses a quick way to request a tailored quote. It is designed for desktop, tablet, and mobile visitors.

The website is intended for construction sites, hospitals and healthcare facilities, data centres, corporate buildings, educational institutions, manufacturing industries, agricultural sites, and other commercial customers.

## 2. Public website sections

The navigation automatically highlights the section currently being viewed and updates the address-bar link so it can be shared directly.

| Navigation item | Direct link | Purpose |
| --- | --- | --- |
| Home | `https://dieselify.co/#home` | Main introduction and contact actions |
| Services | `https://dieselify.co/#services` | Industries served and service cards |
| How it Works? | `https://dieselify.co/#how-it-works` | Four-step delivery process |
| Inquire | `https://dieselify.co/#contact` | Quote-request form |
| Contact | `https://dieselify.co/#contact-information` | Phone, email, and office address |

The enquiry form is also linked from the service cards, so visitors can start a quote request from the relevant service area.

## 3. Quote-request form

### Required information

- Full name
- Phone number
- Email address
- Delivery site / address
- Diesel quantity in litres
- Company name

### Optional information

- Google Maps location — a URL is not required; customers may enter any useful location text.
- Additional note — customers may enter any additional requirements.

When a visitor submits a valid form:

1. The request is securely sent to the website backend.
2. A unique quote reference is assigned in sequence: `#D1`, `#D2`, `#D3`, and so on.
3. An email containing the enquiry and reference number is sent to **connect@dieselify.co**.
4. The customer email is set as the reply-to address, making replies convenient for the Dieselify team.
5. The enquiry is retained securely in the backend for operational records.

There is no customer-facing order dashboard or payment process in this version. The quote reference is an enquiry reference, not a confirmed delivery or invoice number.

## 4. Enquiry security and privacy

The quote system is built to protect customer information and reduce automated spam.

- Enquiry details are encrypted before storage using AES-256 encryption.
- The encryption key is stored in the backend secret vault, not in website files or browser code.
- Public website visitors cannot directly read, add, edit, or delete enquiry records in the database.
- The backend validates all form fields before accepting an enquiry.
- A hidden spam-trap field helps reject basic automated bot submissions.
- Requests are rate-limited to five attempts per source per hour using a privacy-preserving, one-way hashed identifier.
- Email-provider and backend credentials are kept as private server-side secrets and must never be added to the website code, GitHub, email, or a client-facing document.

## 5. Email delivery

Quote notifications are delivered using the configured transactional email provider. The email subject includes the quote reference, for example:

`[#D12] New Dieselify quote request`

For reliable delivery, the sending domain should remain verified with the email provider and its DNS records should remain in the Dieselify domain’s DNS account.

If an enquiry appears to submit but an email is not received:

1. Check the spam/junk folder for `connect@dieselify.co`.
2. Check the email provider’s delivery logs.
3. Check the quote record and email status in Supabase.
4. Confirm that the Supabase Edge Function secrets and domain DNS verification are still active.

## 6. Search visibility and performance

The website includes the following search and performance foundations:

- A clear page title and description for on-site diesel delivery in Bangalore.
- Canonical URL: `https://dieselify.co/`.
- Social sharing metadata for Google, WhatsApp, LinkedIn, Facebook, and X.
- Local-business structured data covering Dieselify’s business name, phone number, email, address, and Bangalore service area.
- `robots.txt` and `sitemap.xml` files for search-engine discovery.
- Optimized image loading: the main hero image is prioritized and service images load lazily.
- Responsive layouts and images for desktop, tablet, and mobile devices.
- Security headers and a restrictive Content Security Policy.

### Google Analytics

Google Analytics 4 is installed with measurement ID **G-Y39XHBC2K8**.

After a website deployment, Google Analytics can take a few minutes to display Realtime traffic and up to 24–48 hours to remove its initial “data collection isn’t active” message. To test it, visit the live website in a normal browser and then check **Google Analytics → Reports → Realtime**.

## 7. Technologies used

| Area | Technology | Purpose |
| --- | --- | --- |
| Website interface | HTML5, CSS3, JavaScript | Responsive public website, navigation, animations, and quote form |
| Hosting and delivery | Cloudflare | Secure static-site hosting, HTTPS, caching, deployment, and security headers |
| Source control | Git and GitHub | Version history, code storage, and deployment source |
| Backend | Supabase Edge Functions (TypeScript / Deno) | Validates quote requests and sends email securely without exposing secrets to visitors |
| Database | Supabase PostgreSQL | Stores enquiry records and quote reference numbers |
| Data protection | Supabase Vault, PostgreSQL Row Level Security, pgcrypto | Protects encryption keys, encrypts enquiry details, and blocks public database access |
| Transactional email | Resend | Sends quote-request notifications to the Dieselify team |
| Website analytics | Google Analytics 4 | Measures website visits and visitor activity |
| Domain and DNS | GoDaddy | Domain registration and DNS record management |

## 8. Domain and hosting

The intended public domain is:

- Primary: `https://dieselify.co`
- Secondary: `https://www.dieselify.co`

The recommended domain setup is a permanent redirect from `www.dieselify.co` to `https://dieselify.co`. This consolidates search ranking, analytics, and shared links under one primary address.

The source code is maintained in the Dieselify GitHub repository. Changes pushed to the `main` branch are deployed through the connected hosting service.

## 9. Administration access to retain securely

The business owner should retain ownership and recovery access for these accounts:

- Domain registrar / DNS account
- Website hosting account
- GitHub repository
- Supabase project
- Transactional email provider
- Google Analytics property

Enable two-factor authentication on each account. Do not share passwords, API keys, backend service keys, or rate-limit secrets in chat messages, documents, or public repositories.

## 10. Routine website updates

Common changes include service descriptions, contact details, office address, images, and FAQ content. These should be updated in the source files, reviewed on a preview deployment, and then published through the normal GitHub deployment process.

For an operational change to the enquiry system—such as changing the receiving email address, sending domain, rate limit, or email provider—update the protected backend configuration rather than putting credentials into `script.js` or `index.html`.

## 11. Launch and monthly checklist

### Before launch

- [ ] Confirm both `dieselify.co` and `www.dieselify.co` open correctly.
- [ ] Confirm `www` permanently redirects to the non-`www` domain.
- [ ] Submit a real test quote request and confirm the email reaches `connect@dieselify.co`.
- [ ] Confirm the received email contains a `#D` reference number.
- [ ] Confirm the sending domain is verified by the email provider.
- [ ] Confirm Google Analytics Realtime shows a test visit.
- [ ] Submit `https://dieselify.co/sitemap.xml` in Google Search Console.

### Monthly

- [ ] Review new quote emails and respond promptly.
- [ ] Check the email provider’s delivery/bounce logs.
- [ ] Review Google Analytics traffic and popular pages.
- [ ] Confirm the domain, hosting, and backend accounts remain active and billing details are current.
- [ ] Keep account recovery details and two-factor authentication current.

## 12. Support information

For a technical issue, provide the following when requesting support:

- The full website address being tested
- A screenshot or screen recording of the issue
- The approximate date and time of the issue
- The browser and device used
- The quote reference number, if the issue relates to an enquiry
- Any error message shown on screen

Never include API keys, passwords, or secret values in a support request.
