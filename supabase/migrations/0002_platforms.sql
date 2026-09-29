-- Platforms are Instagram and TikTok only.
-- Drop the old check first, or updating "reels" to "instagram" is rejected.

alter table public.ideas drop constraint if exists ideas_platform_check;

update public.ideas
set platform = 'instagram'
where platform in ('reels');

update public.ideas
set platform = 'tiktok'
where platform in ('shorts', 'other');

alter table public.ideas
  add constraint ideas_platform_check
  check (platform in ('instagram', 'tiktok'));

alter table public.ideas alter column platform set default 'instagram';
