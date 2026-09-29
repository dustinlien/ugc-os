-- Edited sits between Filmed and Submitted.
-- quota_start_day is the day the brand's quota period begins (1 = calendar month).

alter table public.ideas drop constraint if exists ideas_status_check;

alter table public.ideas
  add constraint ideas_status_check
  check (status in ('idea', 'script_ready', 'filmed', 'edited', 'submitted'));

alter table public.brands
  add column if not exists quota_start_day int not null default 1;

alter table public.brands drop constraint if exists brands_quota_start_day_check;

alter table public.brands
  add constraint brands_quota_start_day_check
  check (quota_start_day between 1 and 31);
