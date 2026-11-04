# Sufra · سُفرة

A multi-tenant restaurant platform: every restaurant gets its own branded website, in Arabic and English, with a menu it manages from a dashboard.

**Live:** https://sufra-sandy.vercel.app · try a demo restaurant at [/r/bait-alkabsa](https://sufra-sandy.vercel.app/r/bait-alkabsa)

## What it does

- **Restaurant sites** at `/r/[slug]`, themed from a single accent color (contrast checked against WCAG AA in light and dark mode), with an "open now" badge in Riyadh time and a filterable menu.
- **Dish pages** that open as a modal from the menu (intercepting routes) and as a full page from a direct link.
- **Arabic and English** with `next-intl`: Arabic at the plain URLs (RTL), English under `/en` (LTR), hreflang on every page.
- **Owner accounts**: email and password, email confirmation before the dashboard opens, and password reset by email.
- **Owner dashboard**: create a restaurant, edit its details with a live theme preview, and edit the menu with drag and drop (mouse, touch and keyboard) and optimistic updates.

## Tech stack

- Next.js 16 (App Router, Cache Components, Server Actions, `proxy.js`)
- React 19 (`useOptimistic`, `useActionState`), JavaScript
- Tailwind CSS v4 with OKLCH design tokens
- MongoDB Atlas with the official driver and `$jsonSchema` validators
- zod, dnd-kit, GSAP, culori
- Deployed on Vercel

## How it's built

- **Static by default.** Restaurant and dish pages are prerendered. Data reads live in `src/lib/restaurants.js` behind `"use cache"` with per-restaurant tags, so a save in the dashboard refreshes only that restaurant (`updateTag`).
- **Auth without a service.** Passwords are hashed with Node's `scrypt` (OWASP parameters). Sessions are random tokens in an `httpOnly`, `SameSite=Lax` cookie; MongoDB stores only their SHA-256 and expires them with a TTL index. Sign-in and sign-up are rate limited per email, per IP and per pair.
- **Email links done carefully.** Confirmation and reset links carry a random token whose hash is stored with a purpose, an expiry (TTL index) and the address it was sent to; `findOneAndDelete` makes each link work exactly once. Opening a link only shows a page, and a button press uses it, so mail scanners can't burn it. Sign-up and "forgot password" give the same answer whether or not an account exists, and send their email after the response (`after()`), so neither the answer nor its timing reveals who has an account.
- **Email by hand.** `src/lib/email/` holds a small SMTP client over TLS (RFC 5321, AUTH PLAIN) and a MIME builder (multipart/alternative, RFC 2047 encoded Arabic headers, base64 bodies). Templates are table-based HTML with inline styles, in both languages, each with a plain text version.
- **Authorization in every action.** `src/lib/auth/dal.js` is the only place that turns the cookie into a user. Every Server Action checks the user and the restaurant owner in the database query itself; the proxy only redirects signed-out page visits.
- **Safe concurrent menu edits.** The editor and the server share pure functions (`src/lib/menu-ops.js`). The server saves with compare-and-swap and retries when another tab saved in between.
- **Two layers of validation.** zod on the server for form input, and MongoDB `$jsonSchema` validators (`src/db/schema.js`) on every write.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in MONGODB_URI
npm run db:setup             # collections, validators and indexes
npm run db:seed              # the three demo restaurants
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint |
| `npm run check:themes` | Checks every theme color pair for WCAG contrast on real, extreme and random accents |
| `npm run db:setup` | Creates or updates collections, validators and indexes (safe to rerun) |
| `npm run db:seed` | Writes the demo restaurants by slug (safe to rerun) |

## Environment variables

| Name | Purpose |
| --- | --- |
| `MONGODB_URI` | Atlas connection string for the app user |
| `MONGODB_DB` | Database name, `sufra` by default. Use separate ones for local work and Preview deployments |
| `SMTP_USER`, `SMTP_PASS` | The Gmail address and app password emails are sent from. Empty locally: emails print to the console |

## Known limits

- New restaurants are public as soon as they're created; there is no draft or review step.
- Dish photos for new dishes are coming with Vercel Blob uploads.

## License

[MIT](LICENSE)
