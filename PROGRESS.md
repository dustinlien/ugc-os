# Progress

## M0 — Scaffold

Done.

What changed:

- Next.js 15 App Router app in `ugc-os/` with TypeScript, Tailwind CSS v4, and ESLint.
- shadcn/ui (Radix, new-york): button, input, textarea, card, tabs, dialog, badge, dropdown-menu, separator, scroll-area, progress, sonner.
- Route and library folders from the spec. Screens are placeholders until their milestone.
- README, `.env.local.example`, `PROGRESS.md`, `DECISIONS.md`.

How to test:

```bash
cd ugc-os
npm install
npx tsc --noEmit
npm run dev
```

Open http://localhost:3000. At the time of M0 this was the “UGC OS / Scaffold ready” page. M1 replaced `/` with a protected dashboard.

## M1 — Supabase + auth


Done.

What changed:

- `supabase/migrations/0001_init.sql` with brands, ideas, guideline files and chunks, chat threads and messages, RLS, `updated_at` / `submitted_at` triggers, and the private `guidelines` bucket.
- Browser, server, and service-role Supabase clients.
- Email/password sign up and sign in, Google OAuth callback, sign out on `/settings`.
- Middleware sends signed-out visitors to `/login` and signed-in visitors away from `/login`.
- Settings shows the account email and the configured OpenRouter model ids (read-only).

How to test:

1. Create a Supabase project and run `supabase/migrations/0001_init.sql` in the SQL editor.
2. Turn off email confirmation if you want an immediate session (see README).
3. `cp .env.local.example .env.local` and fill in the Supabase URL and anon key.
4. `npm run dev`
5. Open `/`. You should land on `/login`.
6. Create an account, refresh, and confirm you are still on the dashboard.
7. Open `/settings`, confirm the email, sign out, and confirm `/` redirects to `/login` again.

## M2 — Brands

Done.

What changed:

- Brand list with this-month progress, pay rate, and a show-archived toggle.
- Create and edit name, quota, pay rate (dollars), color, and notes.
- Archive and unarchive. Archived brands stay reachable by URL and hide from the default list.
- Brand page with Board (empty), Chat, Guidelines, and Settings tabs.
- Sidebar on desktop and a bottom nav on a phone.

How to test:

1. Sign in.
2. Add two brands with different quotas and pay rates.
3. Open one, change the pay rate, and confirm it sticks after refresh.
4. Archive that brand. It should disappear from Brands until “Show archived” is on, and the brand URL should still open.

## M3 — Ideas board

Done.

What changed:

- Board on the brand page with columns Idea, Script ready, Filmed, and Submitted.
- New idea asks for a title, platform, and notes.
- Drag a card between columns or reorder it in a column. Refresh keeps the place.
- Click a card to edit it, change its column, or delete it after a confirm.
- Archived brands can still show ideas, but New idea is hidden.

How to test:

1. Open a brand and add three ideas.
2. Drag one to Script ready and one to Submitted.
3. Refresh. They should stay put.
4. Open a card, edit the title, then delete one and confirm it is gone.

## M4 — Dashboard

Done.

What changed:

- Home shows the Chicago month, submitted count, quota remaining, and estimated pay.
- One row per active brand with remaining, pay, and On track / Behind / Done / Over.
- Brands with nothing submitted are listed under Needs attention.
- The eight most recently updated ideas are listed under that.

How to test:

1. Open Dashboard.
2. On a brand with quota 4 and pay $250, move 2 ideas to Submitted.
3. Remaining should be 2 and estimated pay $500. An archived brand should not appear.

Follow-up, same day:

- Edited column sits between Filmed and Submitted.
- Brand settings include “Quota starts on day”. 23 means the 23rd through the 22nd. Dashboard and brand progress use that window.

## M5 — Guideline upload

Done.

What changed:

- Guidelines tab accepts PDF, DOCX, TXT, and MD up to 15 MB.
- The file is stored privately, then the server extracts the text.
- The list shows the date, status, a text preview, retry, and delete.

How to test:

1. Open a brand, then Guidelines.
2. Upload a small PDF or text file that contains a sentence you can recognize.
3. Show text. That sentence should be there.

## M6 — Chat

Done.

What changed:

- Chat tab on a brand. Threads are saved.
- A message is embedded and matched to that brand’s guideline chunks.
- The answer can be saved onto the board as an idea, with the script filled in.
- Existing guideline files are indexed on the first chat once an OpenRouter key is set.

How to test:

1. Add `OPENROUTER_API_KEY` and restart.
2. Upload a brief that says never to mention competitors.
3. Ask the chat to compare the product with a competitor. It should refuse or rewrite using the brief.
4. Save as idea, then find that card on the board.






