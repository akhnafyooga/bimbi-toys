# Deploying to Netlify (free, commercial-use allowed)

Why: Vercel's **Hobby** plan is restricted to *non-commercial, personal use* — a
real store violates it, and Pro is $20/month. Netlify's free plan **explicitly
allows commercial projects**, so the only recurring cost becomes the domain.

Nothing here affects the current Vercel deployment. Vercel ignores
`netlify.toml`; run both in parallel until you're happy, then switch the domain.

---

## Before you start

- The repo has **no Vercel-specific code** (no `VERCEL_URL`, no `@vercel/*`
  packages), so no code changes are needed to move.
- `netlify.toml` is already committed — build command, Node 22, and the official
  `@netlify/plugin-nextjs` runtime are configured.
- The database (Neon) and product images (Cloudflare R2) are **independent of the
  host**. They keep working, untouched, on either platform.

---

## 1. Create the site

1. Sign up at https://netlify.com (use the client's email if this will be handed over).
2. **Add new site → Import an existing project → GitHub →** pick this repo.
3. Branch to deploy: **`dev`** (same branch Vercel builds).
4. Build command and publish directory are read from `netlify.toml` — leave them.
5. **Do not deploy yet** — add the environment variables first (step 2), or the
   first build will fail on a missing `DATABASE_URL`.

## 2. Environment variables

**Site configuration → Environment variables.** Copy the values from your local
`.env` (or from the Vercel project's settings — they are identical).

Required:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon connection string — same one Vercel uses |
| `AUTH_SECRET` | NextAuth signing secret — reuse the same value |
| `AUTH_TRUST_HOST` | set to `true` |
| `R2_ACCOUNT_ID` | Cloudflare R2 |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 — keep secret |
| `R2_BUCKET` | `bimbi-product-image` (singular — a plural typo causes `NoSuchBucket`) |
| `SERPER_API_KEY` | only needed for the "Isi gambar otomatis" button |

Not needed: `R2_PUBLIC_BASE` (images are served through `/api/img`),
`MIDTRANS_*` (payment is via WhatsApp now), `GOOGLE_CSE_*`, `NGROK_*`,
`CLOUDINARY_*` — all unused.

## 3. Deploy and test

Trigger the first deploy. Then walk the app on the `*.netlify.app` URL:

- [ ] Homepage loads, products and images appear (images prove R2 + `/api/img` work)
- [ ] Search works, including the "Apakah maksud kamu" suggestion
- [ ] **Log in** — this is the one most likely to break; see troubleshooting
- [ ] Add to cart → checkout → the WhatsApp button appears
- [ ] `/orders` (Pesanan Saya) lists orders
- [ ] `/admin` loads and can edit a product

## 4. Point the domain

Only after step 3 passes:

1. Buy the domain (register it in the **client's** name so they own it).
2. Netlify: **Domain management → Add a domain** → follow the DNS instructions.
3. HTTPS is issued automatically and free.
4. Set `AUTH_URL` to the final domain (e.g. `https://bimbitoys.com`) if login
   misbehaves on the custom domain.

## 5. Turn Vercel off

Keep Vercel running until the Netlify site has served real traffic for a few
days. Then delete the Vercel project (or leave it — Hobby is free) and make sure
only one deployment has the live domain attached.

---

## Troubleshooting

**Login fails / redirect loop.** NextAuth needs to know its own URL. Confirm
`AUTH_TRUST_HOST=true`, and add `AUTH_URL` set to the full site URL.

**Build fails on `@prisma/client` / "did not initialize yet".** Netlify rebuilds
`node_modules` each deploy, so `prisma generate` must run at build time. It is
already in `npm run build` — don't change that script.

**"Isi gambar otomatis" times out.** Netlify's synchronous functions have a
tighter timeout than Vercel's. The endpoint already processes **one product per
request** with a ~7s internal budget (`lib/productImages.ts`), so it should fit —
but if it fails, lower `DOWNLOAD_TIMEOUT_MS` / `DOWNLOAD_DEADLINE_MS` there.
`app/api/admin/products/fill-images/route.ts` declares `maxDuration = 60`, which
Netlify may cap lower; that's fine given the internal budget.

**Images 404.** Product image URLs are relative (`/api/img/products/...`) and
resolve on any host. If they fail, the R2 credentials are wrong — check
`R2_BUCKET` spelling first.

**Cold starts feel slow.** Same as Vercel: the first request after idle is slow
because the database wakes up. Open the site a few minutes before a demo.
