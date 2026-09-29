# Decisions

## M0 — Scaffold

- Pinned `create-next-app@15.5.26`. Installed `next@15.5.26`, `react@19.1.0`, `react-dom@19.1.0`, TypeScript 5, ESLint 9, Tailwind CSS v4 (the Tailwind version that create-next-app 15.5 emits).
- shadcn CLI `shadcn@4` with `--base radix`, template `next`, style `new-york`, base color `neutral`, CSS variables. The CLI default preset is Base UI (`base-nova`); Radix matches the components named in the spec.
- No theme toggle. shadcn ships `.dark` tokens, but the app does not add a `.dark` class or a switch. Spec says not to add a toggle unless the template includes one.
- Sonner’s `<Toaster />` is mounted in the root layout so the installed toast component is actually reachable. No theme provider.
- `.gitignore` ignores `.env*` and un-ignores `.env.local.example` so the sample file can be committed and real keys cannot.
- Route files exist as placeholders so the folder map from the spec is real. They do not implement later milestones.
- `next.config.ts` sets `turbopack.root` to this package so a parent lockfile (if the repo is nested) is not treated as the app root.

## M1 — Supabase + auth


- Installed `@supabase/supabase-js@^2.117.1` and `@supabase/ssr@^0.12.7`. The env name stays `NEXT_PUBLIC_SUPABASE_ANON_KEY` as in the spec, not Supabase’s newer publishable-key name.
- Next.js 15 still uses `middleware.ts` (`proxy.ts` is the Next.js 16 name). Session refresh uses `auth.getClaims()`, which the current SSR guide requires so users are not randomly signed out.
- `/auth/callback` is public. Google OAuth cannot finish if that route redirects to `/login`. The `next` query param must be a same-origin relative path.
- The Google button is always shown. It only succeeds after the Google provider is enabled in the Supabase project. There is no extra env flag for it in the spec.
- If Supabase has “Confirm email” on, sign-up does not create a session. The form says so instead of pretending the user is signed in.
- With empty Supabase env vars, protected routes still redirect to `/login`, and the login page tells you to fill in `.env.local`. The dev server boots either way.
- `guideline_chunks.embedding` is `extensions.vector(1536)` with an HNSW cosine index, matching `openai/text-embedding-3-small`.
- Storage policies cover select, insert, update, and delete under `{user_id}/...`. Update is included so a replaced file can be overwritten. The spec named upload, read, and delete.
- Status, platform, extract status, and chat role are Postgres `check` constraints, not app-only enums.
- The live project uses Supabase’s new publishable key (`sb_publishable_...`) in `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `@supabase/supabase-js` accepts that key in the same argument as the legacy anon key. The secret key is not stored.
- On https (the in-chat preview), auth cookies are `SameSite=None; Secure; Partitioned`. Otherwise the preview drops the session and Create account looks like it did nothing. Local `http://localhost:3000` still uses `SameSite=Lax`.
- Sign out runs in the browser, not as a Next.js server action. The preview host does not match the app host, and Next.js rejects that action with "Invalid Server Actions request."

## M2 — Brands

- Brand create, edit, and archive run in the browser through the Supabase client, same as sign-in. Server actions fail in the preview.
- Slug is lowercase and hyphenated. A collision gets `-2`, `-3`, and so on.
- Pay is entered in dollars and stored as integer cents. `25.5` means 2550 cents.
- This month on the brand card uses `America/Chicago` month bounds.
- Phone navigation is a bottom bar (Dashboard, Brands, Settings). Desktop uses the left sidebar, including the open brand name.

## M3 — Ideas board

- Columns match the check constraint already in the database: Idea, Script ready, Filmed, Submitted. Platforms are Instagram, then TikTok. Nothing else.

- Order is `sort_order`, rewritten as 1000, 2000, 3000 after a drop.
- Moving into Submitted lets the existing trigger set `submitted_at`. Moving out clears it, which is what that trigger already does.
- Drag-and-drop uses `@dnd-kit` with a pointer and a keyboard sensor. A 6px threshold keeps a click from starting a drag.

## M4 — Dashboard

- “This month” is the America/Chicago calendar month. A video counts only when its status is submitted and `submitted_at` is inside that month.
- Estimated pay is the idea’s pay override if set, otherwise the brand rate.
- Behind means remaining is above zero and submitted/quota is below day-of-month/days-in-month. Over wins if submitted is above quota. Done means remaining is zero or less and the brand is not over.
- Greeting uses the Chicago hour: morning before noon, afternoon before 5pm, otherwise evening.
- The board has an Edited column between Filmed and Submitted. The user asked for it after the original four-column pipeline.
- Each brand has `quota_start_day`. 1 is a calendar month. 23 means the 23rd through the 22nd, in America/Chicago. Counts and pay use that window, not always the 1st.

## M5 — Guidelines

- Upload goes straight to the private `guidelines` bucket from the browser, then `POST /api/guidelines/extract` reads it back with the signed-in user. No server action, and no service-role key.
- PDF text uses `unpdf`. DOCX uses `mammoth`. TXT and MD are read as UTF-8.
- Chunking and embeddings wait until chat. A file is `ready` once `extracted_text` is saved. Empty text is `failed`.

## M6 — Chat

- After text is extracted, chunks of about 3,500 characters with 600 characters of overlap are embedded with `openai/text-embedding-3-small` through OpenRouter. If the key is missing, the file still stays readable and chat says the key is required.
- Top 8 chunks are ranked in the server with cosine similarity. That avoids another SQL function. Fine for one creator’s files.
- Chat is not streamed. The route returns the full assistant message.
- The model only sees the new question and the previous answer, not the whole thread. The full thread still shows in the chat panel. This keeps follow-ups cheap.

- “Save as idea” stores the assistant text in `ideas.script`. It starts as Script ready when the answer looks like a script (hook, CTA, caption), otherwise Idea.

## Later polish

- Production build is `next build` (not Turbopack) so Vercel’s default Next.js builder can deploy `ugc-os` as the root directory.
- Chat and guideline extract routes allow 60 seconds so a PDF or a model reply can finish on Vercel.
- On a phone, dragging a card starts after a short press-and-hold so sideways swipes still scroll the board.
- The visual tone is warm paper, violet buttons, and tinted columns. Headings use Fraunces.











