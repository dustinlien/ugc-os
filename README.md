# UGC OS

Personal web app for one UGC creator to manage brands, monthly video quotas, pay rates, idea pipelines, and on-brand script chat.

## 1. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In **Project Settings → API**, copy the project URL, the `anon` key, and the `service_role` key.

## 2. Run the migration SQL

After M1, open the Supabase SQL editor and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). That file creates tables, RLS policies, triggers, and the private `guidelines` storage bucket.

## 3. Storage bucket

The migration creates a private bucket named `guidelines`. Confirm it under **Storage**. Object paths are `{user_id}/{brand_id}/...`.

## 4. Google OAuth (optional)

Email and password work without this.

1. In Supabase: **Authentication → Providers → Google**. Enable it and add the Google client id and secret.
2. Add the site URL and redirect `http://localhost:3000/auth/callback` (and your Vercel URL when you deploy).

Email confirmation is on by default in new Supabase projects. For the local “create account and stay signed in” check, turn off **Authentication → Sign In / Providers → Email → Confirm email**. If you leave it on, sign-up shows a notice to confirm the email before signing in.

## 5. Environment

```bash
cp .env.local.example .env.local
```

Fill in the values. Never commit `.env.local`.

## 6. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 7. OpenRouter

1. Create a key at [openrouter.ai/keys](https://openrouter.ai/keys).
2. Set `OPENROUTER_API_KEY`.
3. Leave the model ids unless you need to change them:

- `OPENROUTER_CHAT_MODEL` (default `google/gemini-2.5-flash`)
- `OPENROUTER_EMBED_MODEL` (default `openai/text-embedding-3-small`)

Chat and embeddings are wired in M6.

## 8. Put it on the web with Vercel

The app folder is `ugc-os`. Vercel must use that folder, not the folder above it.

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Push this project to a GitHub repo if it is not there yet.
3. Click **Add New… → Project** and import that repo.
4. Set **Root Directory** to `ugc-os`. Leave the framework as Next.js.
5. Open **Environment Variables** and add these. Copy the values from your `.env.local`. Do not paste the service role key unless you have one. The app works without it.

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_CHAT_MODEL` = `google/gemini-2.5-flash`
   - `OPENROUTER_EMBED_MODEL` = `openai/text-embedding-3-small`

6. Click **Deploy**. Wait until it says Ready. Open the site URL Vercel gives you.
7. In Supabase, open **Authentication → URL Configuration**.
   - Set **Site URL** to `https://your-app.vercel.app` (use the real URL).
   - Add `https://your-app.vercel.app/auth/callback` under **Redirect URLs**.
8. If you use Google sign-in, add that same callback URL in the Google provider settings too.

After this, the phone site and the computer site are the same URL. Sign in with the account you already created.

