# Walmart-Look Redesign — Implementation Prompt

> Branch: `walmart` (off `dev`). Visual reskin ONLY — every existing feature,
> flow, API, and the database stay exactly as they are. `dev` is never touched.
> Reference: Walmart.com screenshots provided 2026-07-19 (savings grid, login
> page, product detail page).

## 1. Global theme (app/globals.css)

- New design tokens alongside the existing ones:
  - `--wm-blue: #0071dc` (primary — buttons, links, prices, active states)
  - `--wm-blue-dark: #001e60` (hover/emphasis)
  - `--wm-yellow: #ffc220` (accent, logo spark territory)
  - `--wm-red: #de1c24` (deal/"Rollback"-style badges)
  - `--wm-green: #2a8703` ("You save" text)
  - Background: white; section dividers light gray `#f1f1f2`.
- Typography: single clean rounded sans everywhere (swap display font Baloo out;
  use Nunito Sans/Poppins weight 600–800 for headings). Walmart's look is *one*
  family at different weights, not a display+body pair.
- Buttons: `rounded-full`, solid `--wm-blue` with white text; secondary =
  white, 1px blue border, blue text. Remove the candy "3D shadow" button style.
- Cards: white, borderless (or 1px `#e6e7e8`), subtle shadow only on hover.
- Keep all existing micro-interactions (press-squish, reveal, badge pop) —
  same classes, calmer palette.

## 2. Header (components/Navbar.tsx + CategoryNav)

Two rows, replacing the current three:

- **Row 1 — solid blue (`--wm-blue`), white text:**
  - Left: **[LOGO-MARK placeholder]** (user supplies) linking to `/`.
  - Next to it: rounded darker-blue pill "🏬 Ambil di toko · <default store city>"
    → links to `/stores` (repurposes Walmart's "Pickup or delivery?" pill).
  - Center: large **rounded-full white search bar** ("Cari mainan di Bimbi
    Toys...") with a round blue search icon button inside the right edge.
  - Right cluster: "💖 Wishlist" (label + count), "Masuk / Akun" (greeting +
    Keluar when logged in), cart icon with count bubble and the cart subtotal
    underneath (like Walmart's `$0.00`).
  - Mobile: same row collapses to logo + search + icons (keep current compact
    behavior and CartBadge bubbles).
- **Row 2 — white, thin bottom border:** the existing sliding CategoryNav
  restyled: dark text links, blue underline/active state, ‹ › arrows kept,
  "Penawaran Hari Ini" becomes a plain link at the end. Navy utility bar is
  removed entirely (its links live in Row 1).

## 3. Homepage (app/(shop)/page.tsx)

- **Drop the left sidebar** (Walmart is a full-width grid). Its content moves:
  - Category menu → already covered by Row 2 nav + filter dropdown.
  - PROMO HITS + Rekomendasi → one horizontal "Penawaran" strip above the grid
    (reusing ProductCard).
- Section header Walmart-style: bold "Semua Koleksi Mainan (N)" + small
  "Harga saat dibeli online" caption + the category dropdown restyled as a
  white pill with blue border.
- **ProductCard → Walmart card:** red deal badge top-left ("Hemat -19%"),
  wishlist heart top-right on the image, rounded-full bordered "+ Tambah"
  button bottom-left of image (goes to product page, same as card click),
  price block: blue bold "Rp 349.000" + gray strikethrough + green
  "Hemat Rp 80.000", star row + name below. No card border until hover.
- Hero: keep, but flat Walmart style — white card, blue CTA pill, floating
  toys kept at lower opacity (they're subtle already).

## 4. Product page (app/(shop)/product/[slug])

Match screenshot 3's three-column anatomy:

- Left: vertical thumbnail rail (existing images) + large main image.
- Middle: badge row (red "Promo" when discounted), product title, star row +
  rating count placeholder, description under an "Deskripsi" heading, and a
  "Keunggulan Produk" bullet card if description has bullet-able lines.
- Right: **buy box card** — big blue "Rp X" + strikethrough + green "Hemat",
  qty stepper, full-width rounded-full blue "Masuk Keranjang", secondary
  white/blue "💬 WhatsApp" and wishlist heart, then the "📍 Ambil di Toko"
  per-store stock list inside the buy box column.
- Existing popup, animations, and login-gating unchanged.

## 5. Login/Register (app/(shop)/login, register)

Match screenshot 2: centered narrow column — **[LOGO-FULL placeholder]** top
center, "Masuk atau buat akunmu", helper sentence, labeled fields, full-width
rounded-full blue button, thin footer link row. Remove the 🔑 emoji header.

## 6. Cart / Checkout / Orders

Reskin only: white cards with thin borders, blue rounded-full primary buttons,
green savings text, fulfillment cards as clean bordered radio cards. QRIS flow,
self-courier gate, statuses — all untouched.

## 7. Footer (components/Footer.tsx)

Walmart-style light footer: light-gray background, centered link rows
(categories, stores from DB, kebijakan), fine-print line. Keep store list
DB-driven. **[LOGO-FULL placeholder]** small, centered above links.

## 8. Logo placeholders (user will supply artwork)

- Files expected at: `public/brand/logo-mark.png` (square icon) and
  `public/brand/logo-full.png` (wordmark).
- New `components/BrandLogo.tsx`: renders the file; until the real files
  exist, shows a dashed outline box labeled "LOGO" so every placement is
  visible in the UI. Placements: header row 1, login card, footer, and the
  added-to-cart popup icon spot.

## 9. Admin panel (added per user 2026-07-19)

Reskin to match: Walmart blue replaces the orange/pink accents in the admin
layout, buttons, badges, and tables. Structure and features unchanged.

## 9b. Out of scope (unchanged)

All APIs, Prisma schema, seed data, WhatsApp flows, Midtrans, ongkir logic.

Confirmed decisions: full spec; homepage sidebar removed (promo widgets become
a horizontal strip); single clean sans typeface; admin panel included.

## 10. Build order

Theme tokens → Header+Footer → Homepage grid/cards → Product page → Login →
Cart/Checkout reskin. Verify each phase in the browser at desktop + mobile
widths before moving on; type-check at the end of every phase.
