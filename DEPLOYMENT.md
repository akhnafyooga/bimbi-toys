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
3. Add environment variables (from your `.env`): `DATABASE_URL`, `AUTH_SECRET`,
   `NEXTAUTH_URL` (set to your real domain, e.g. `https://bimbitoys.id`),
   `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`,
   `RAJAONGKIR_API_KEY`.
4. Deploy. Vercel builds and gives you a `*.vercel.app` URL immediately.
5. Optional: add your own domain in Vercel → Settings → Domains, and point your
   registrar's DNS at it.

### 2.3 Go live with real QRIS payments

1. Register a real (non-sandbox) Midtrans account at https://midtrans.com —
   this requires basic business documents (NIB/SIUP, KTP of the owner, bank
   account) since real money will move through it.
2. Once approved, get your **production** Server Key / Client Key from the
   Midtrans dashboard and set `MIDTRANS_IS_PRODUCTION=true`.
3. In the Midtrans dashboard → Settings → Configuration, set your **Payment
   Notification URL** to `https://yourdomain.com/api/midtrans-webhook` — this
   is how Bimbi Toys finds out a scan succeeded.

### 2.4 Real shipping costs

The app currently estimates shipping with a simple formula in `lib/shipping.ts`.
Swap it for a real courier-rate API:
- **Komerce / RajaOngkir Collection API** (successor to the classic RajaOngkir) — https://collaborator.komerce.id
- Sign up, get an API key, put it in `RAJAONGKIR_API_KEY`, then replace the
  body of `getShippingOptions()` with the real fetch call (the file has the
  exact shape commented in already).

---

## Stage 3 — Integrate your real corporate data

Right now the catalog is `prisma/seed.ts` — 10 sample toys. To go live with
your actual inventory:

### Option A — You have a spreadsheet/CSV of products
Fastest path. Write a one-off import script (`prisma/import.ts`) that reads
your CSV (columns: name, description, price, stock, category, image URLs) and
calls `prisma.product.create(...)` for each row — same shape as `seed.ts`,
just fed from your file instead of hardcoded data. Ask me for this script
once you have a sample export and I'll tailor it exactly to your columns.

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
same tables.

### Option C — Product images
Seed data uses `picsum.photos` placeholders. For real photos:
- Upload to a CDN/object storage (Cloudinary has a generous free tier and
  automatic image optimization — good fit for a toy catalog with lots of photos)
- Add the domain to `next.config.ts` → `images.remotePatterns`
- Point `ProductImage.url` at the uploaded URLs

### Admin panel (optional next step)
Right now product data goes in via the seed/import script — there's no UI for
non-technical staff to add products yet. A natural Stage 4 would be a small
`/admin` section (protected by an `isAdmin` flag on `User`) with forms for
creating/editing products, viewing orders, and updating store stock. Happy to
scaffold that whenever you're ready — just say the word.
