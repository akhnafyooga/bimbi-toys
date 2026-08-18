# 🧸 Bimbi Toys

A playful e-commerce app for a toy store — browse toys, sign in to see prices,
add to cart/wishlist, and check out with QRIS (pay via GoPay/OVO/Dana/ShopeePay/m-Banking),
choosing store pickup or home delivery.

**Stage 1 of 3** — this is the full app running locally. See `DEPLOYMENT.md` for
Stage 2 (going live) and Stage 3 (swapping in your real product catalog).

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript | Server components for fast, SEO-friendly catalog pages; API routes for cart/checkout |
| Styling | Tailwind CSS v4 | matches what you're familiar with |
| Database | SQLite (dev) via Prisma ORM | zero-config locally, one-line swap to Postgres later |
| Auth | NextAuth.js v5 (Credentials) | simple email/password now, easy to add Google/social login later |
| Payments | **Midtrans** (QRIS) | the most widely-supported Indonesian payment aggregator — one QRIS code works with GoPay, OVO, Dana, ShopeePay, and any mobile banking app. Free sandbox, no company registration needed to start testing. |
| Shipping | Mocked JNE/SiCepat/AnterAja cost calculator | swappable for the real RajaOngkir/Komerce API in Stage 2 |
| State | React state + server data (Prisma) | cart/wishlist are saved to the signed-in account, not just localStorage |

## Run it locally

**Requirements:** Node.js 20+, npm.

```bash
cd bimbi-toys
npm run setup     # installs deps, creates the SQLite DB, and seeds sample toys
npm run dev
```

Open **http://localhost:3000**.

Demo login: `demo@bimbitoys.id` / `bimbi123` — or just register a new account.

> `npm run setup` runs `prisma generate`, `prisma db push`, and the seed script.
> If you ever change `prisma/schema.prisma`, re-run `npm run db:push`.

## What's already wired up

- 🧸 **Catalog** — homepage with category filters, featured shelf, and search (`/search`)
- 🔒 **Price gating** — prices are hidden until the visitor signs in (`components/ProductActions.tsx`, `app/product/[slug]/page.tsx`)
- 💖 **Wishlist** & 🛒 **Cart** — both saved per-account in the database (`app/api/wishlist`, `app/api/cart`)
- 📍 **Pickup or shipping** — checkout lets the customer choose a store (`/stores`) or enter an address and pick a courier
- 🏷️ **"Lihat Ada Apa di Toko"** (`/store`) — customers browse the physical shelves of each store: shelf categories → shelf (photo, code, auto price range) → text-first product list, with price filters and in-store product search. Managed by admins under `/admin/rak` (see `HANDOFF.md`)
- 📱 **QRIS payment** — checkout creates a Midtrans QRIS charge and shows the scannable code (`lib/midtrans.ts`, `app/api/checkout`, `app/api/midtrans-webhook`)
- 🗄️ **Order tracking** — `/orders/[id]` polls for payment status after scanning

## Before you can actually take a payment

1. Sign up free at https://dashboard.sandbox.midtrans.com
2. Copy your **Sandbox Server Key** and **Client Key** into `.env`
3. Restart `npm run dev` — checkout will now generate real (sandbox) QR codes
4. Use Midtrans' [simulator](https://simulator.sandbox.midtrans.com/) to simulate a successful scan while testing locally

## Project structure

```
app/                  routes (pages + API routes)
  product/[slug]/     product detail page
  cart/ wishlist/     account-bound cart & wishlist pages
  checkout/           pickup/shipping + QRIS flow
  orders/[id]/        order status page
  api/                cart, wishlist, checkout, auth, webhook, shipping-cost, register
components/           shared UI (Navbar, ProductCard, CheckoutClient, etc.)
lib/                  prisma client, auth config, midtrans, shipping, formatting
prisma/schema.prisma  full data model (User, Product, Order, StoreLocation, ...)
prisma/seed.ts        sample toy catalog — replace with your real data (see Stage 3)
```
