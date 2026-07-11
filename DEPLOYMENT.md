# Deployment Roadmap — Bimbi Toys

## Stage 1 — Local (you are here) ✅
The whole app, running on your machine with SQLite. See `README.md`.

---

## Stage 2 — Deploy globally

Going live means three things: a real database, an internet-facing host, and
production payment keys.

### 2.1 Move the database off SQLite

SQLite lives in a single file — fine for your laptop, not for a deployed app
(most hosts wipe local disk on every deploy). Pick one (both have generous free tiers):

- **Supabase** (https://supabase.com) — Postgres + free tier + built-in dashboard
- **Neon** (https://neon.tech) — serverless Postgres, scales to zero, pairs very well with Vercel

Steps:
1. Create a project, copy the connection string it gives you.
2. In `prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "postgresql"   // was "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
3. Put the new connection string in `DATABASE_URL` (locally in `.env`, and later
   as an environment variable on your host).
4. Run `npx prisma db push` once against the new database, then `npm run db:seed`
   to load the sample catalog (you'll replace this with real data in Stage 3).

### 2.2 Host the app

**Vercel** (https://vercel.com) is the natural fit for Next.js and has a free tier:

1. Push this project to a GitHub repo.
2. In Vercel, "Add New Project" → import the repo.
3. Add environment variables (from your `.env` — see `.env.example` for the full,
   commented list): `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL` (set to your
   real domain, e.g. `https://bimbitoys.id`), `MIDTRANS_SERVER_KEY`,
   `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`, and — once you're ready for
   production photo storage — `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
   `CLOUDINARY_API_SECRET` (see 2.5 below).
4. Deploy. Vercel builds and gives you a `*.vercel.app` URL immediately.
5. Optional: add your own domain in Vercel → Settings → Domains, and point your
   registrar's DNS at it.

> **Commercial use note:** Vercel's free "Hobby" plan is licensed for personal,
> non-commercial projects only. Since Bimbi Toys is a real business processing
> real payments, use at least the **Pro** plan (usage-based pricing) —
> see https://vercel.com/pricing.

### 2.3 Go live with real QRIS payments

1. Register a real (non-sandbox) Midtrans account at https://midtrans.com —
   this requires basic business documents (NIB/SIUP, KTP of the owner, bank
   account) since real money will move through it.
2. Once approved, get your **production** Server Key / Client Key from the
   Midtrans dashboard and set `MIDTRANS_IS_PRODUCTION=true`.
3. In the Midtrans dashboard → Settings → Configuration, set your **Payment
   Notification URL** to `https://yourdomain.com/api/midtrans-webhook` — this
   is how Bimbi Toys finds out a scan succeeded.
4. The webhook (`app/api/midtrans-webhook/route.ts`) already verifies the
   Midtrans signature (`verifyNotificationSignature` in `lib/midtrans.ts`)
   before trusting any payment notification — this doesn't need to change
   between sandbox and production, just double-check it after your first live
   test transaction (see the first-run checklist in Stage 5).

### 2.4 Real shipping costs

The app currently estimates shipping with a simple formula in `lib/shipping.ts`.
Swap it for a real courier-rate API:
- **Komerce / RajaOngkir Collection API** (successor to the classic RajaOngkir) — https://collaborator.komerce.id
- Sign up, get an API key, put it in `RAJAONGKIR_API_KEY`, then replace the
  body of `getShippingOptions()` with the real fetch call (the file has the
  exact shape commented in already).

### 2.5 Production image storage

Product photos uploaded through the admin panel (`Produk → Tambah Produk Baru`)
are saved through one swappable module, `lib/upload.ts`. By default it writes
to `/public/uploads` on local disk — this is fine for local dev, but **does
not persist on Vercel or any serverless host**, since the filesystem is wiped
on every deploy.

To switch to Cloudinary (recommended — generous free tier, automatic image
optimization):
1. Sign up at https://cloudinary.com and grab your Cloud Name, API Key, and
   API Secret from the dashboard.
2. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`
   as environment variables (locally in `.env`, and on your host).
3. That's it — `lib/upload.ts` detects those variables automatically and
   uploads there instead. No code changes, no changes anywhere else in the
   app (the `res.cloudinary.com` domain is already allow-listed in
   `next.config.ts` for `next/image`).

> This Cloudinary code path hasn't been exercised against a live account yet —
> after setting the three env vars, upload one test product photo in the admin
> panel and confirm it appears (check the Cloudinary Media Library too).

---

## Stage 3 — Integrate your real corporate data

The admin panel (`/admin`) is the primary way to manage products, categories,
orders, stores, and stock day-to-day — see `HANDOFF.md` for a staff-friendly
guide. For a one-time bulk import of an existing catalog:

### Option A — You have a spreadsheet/CSV of products
Fastest path. Write a one-off import script (`prisma/import.ts`) that reads
your CSV (columns: name, description, price, stock, category, image URLs) and
calls `prisma.product.create(...)` for each row — same shape as `seed.ts`,
just fed from your file instead of hardcoded data. Ask your developer for this
script once you have a sample export.

### Option B — You have an existing POS/ERP system (e.g. Moka, Accurate, custom)
Most systems expose either a REST API or scheduled CSV/Excel exports.
Two integration patterns:
1. **Pull sync** — a scheduled job (e.g. a Vercel Cron Job or GitHub Action)
   calls your ERP's API nightly and upserts into `Product` / `StoreStock`.
2. **Push webhook** — your ERP calls a new `app/api/sync/products` route
   whenever stock/price changes, and that route updates Prisma directly.

Either way, the target shape is always the `Product`, `ProductImage`,
`Category`, and `StoreStock` tables already defined in `prisma/schema.prisma`
— nothing else in the app needs to change, since every page reads from those
same tables. Products added this way are immediately editable in the admin
panel too.

### Option C — Product images for a bulk import
For a one-time bulk import (not through the admin panel's upload form),
upload photos to Cloudinary directly (or your CDN of choice) and point
`ProductImage.url` at the resulting URLs. Going forward, day-to-day photo
uploads happen through the admin panel itself (see Stage 2.5 above).

---

## Stage 4 — Admin panel & staff access

The admin panel lives at `/admin` and is protected by a `role` field on `User`
(`CUSTOMER`, `ADMIN`, or `STAFF` — new accounts default to `CUSTOMER`).

### Create the client's first admin account

1. Have the client register a normal account through `/register` (or register
   one for them).
2. Promote that account to `ADMIN`:
   ```bash
   npm run admin:promote -- someone@bimbitoys.id
   ```
3. They log in as usual at `/login`, then visit `/admin`.
4. Once inside, an `ADMIN` can't yet promote *other* staff through the UI —
   run the same command again for each additional staff account. (`ADMIN` vs
   `STAFF` both get full access today; the distinction exists in the schema
   for future use if you want to restrict `STAFF` permissions later.)

See `HANDOFF.md` for the staff-friendly walkthrough of actually using the
panel day-to-day.

---

## Stage 5 — First-run checklist before going live with real payments

Run through this once, after Stage 2 is deployed and before telling customers
the store is open:

- [ ] Create the client's initial admin account (Stage 4) and confirm they can
      log in and reach `/admin`.
- [ ] Add at least one real product with a real photo through the admin panel,
      and confirm it appears correctly on the storefront.
- [ ] Place one real test order end-to-end as a customer: add to cart, check
      out, scan the QRIS code with a real e-wallet app for a small amount.
- [ ] Confirm the order's payment status flips to "Sudah Dibayar" automatically
      within a few seconds (this proves the Midtrans webhook + signature
      verification is correctly configured for your production domain).
- [ ] In the admin panel, advance that test order through Sedang Dikemas →
      Sedang Dikirim/Siap Diambil → Selesai, and confirm each step reflects
      correctly on the customer's order page too.
- [ ] Refund/cancel the test transaction in the Midtrans dashboard if it was a
      real payment, so it doesn't show up in real revenue reporting later.

## Still needs a human security review

These are things this build didn't (and can't fully) verify by itself before
you go live with real customer accounts and real money:

- **Admin auth & role checks** — every `/api/admin/*` route re-checks the
  session role server-side (see `lib/adminAuth.ts`), and `proxy.ts` blocks
  page navigation to `/admin` for non-admin/staff sessions. Have a second
  person independently confirm no admin route was missed.
- **Payment webhook** — `app/api/midtrans-webhook/route.ts` verifies the
  Midtrans signature before trusting any status update. Confirm this in
  production with a real (small) transaction, not just sandbox.
- **Rate limiting / abuse** — there's currently no rate limiting on
  `/api/register`, `/api/checkout`, or the admin upload endpoint. Consider
  adding this at the hosting/CDN layer (e.g. Vercel's built-in protections or
  a WAF) before launch.
- **Backups** — once on production Postgres (Stage 2.1), confirm your
  provider's automatic backup schedule meets your comfort level for losing an
  order or two of data.
