-- UGC OS initial schema: tables, RLS, triggers, private guidelines bucket.
-- Run in the Supabase SQL editor (or via the Supabase CLI) once per project.

create extension if not exists pgcrypto;
create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- When status becomes submitted, stamp submitted_at if it is still null.
-- When status leaves submitted, clear submitted_at.
create or replace function public.sync_idea_submitted_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'submitted' then
    if tg_op = 'INSERT' or old.status is distinct from 'submitted' then
      if new.submitted_at is null then
        new.submitted_at = now();
      end if;
    end if;
  else
    new.submitted_at = null;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- brands
-- ---------------------------------------------------------------------------

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slug text not null,
  color text not null default '#6366f1',
  monthly_quota int not null default 4,
  quota_start_day int not null default 1,
  pay_rate_cents int not null default 0,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brands_user_slug_unique unique (user_id, slug),
  constraint brands_monthly_quota_nonnegative check (monthly_quota >= 0),
  constraint brands_quota_start_day_check check (quota_start_day between 1 and 31),
  constraint brands_pay_rate_nonnegative check (pay_rate_cents >= 0)
);

create trigger brands_set_updated_at
before update on public.brands
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ideas
-- ---------------------------------------------------------------------------

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  title text not null,
  script text not null default '',
  notes text not null default '',
  platform text not null default 'instagram',
  status text not null default 'idea',
  sort_order int not null default 0,
  submitted_at timestamptz,
  pay_rate_override_cents int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ideas_platform_check check (platform in ('instagram', 'tiktok')),
  constraint ideas_status_check check (status in ('idea', 'script_ready', 'filmed', 'edited', 'submitted')),
  constraint ideas_pay_override_nonnegative check (
    pay_rate_override_cents is null or pay_rate_override_cents >= 0
  )
);

create index ideas_user_brand_status_idx
  on public.ideas (user_id, brand_id, status);

create index ideas_user_submitted_at_idx
  on public.ideas (user_id, submitted_at);

create trigger ideas_sync_submitted_at
before insert or update on public.ideas
for each row
execute function public.sync_idea_submitted_at();

create trigger ideas_set_updated_at
before update on public.ideas
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- guideline files + chunks
-- ---------------------------------------------------------------------------

create table public.guideline_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  byte_size int,
  extracted_text text,
  extract_status text not null default 'pending',
  extract_error text,
  created_at timestamptz not null default now(),
  constraint guideline_files_extract_status_check check (
    extract_status in ('pending', 'ready', 'failed')
  ),
  constraint guideline_files_byte_size_nonnegative check (
    byte_size is null or byte_size >= 0
  )
);

create table public.guideline_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  file_id uuid not null references public.guideline_files (id) on delete cascade,
  chunk_index int not null,
  content text not null,
  -- openai/text-embedding-3-small is 1536 dimensions. See DECISIONS.md.
  embedding extensions.vector(1536),
  created_at timestamptz not null default now()
);

create index guideline_chunks_embedding_hnsw
  on public.guideline_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- chat
-- ---------------------------------------------------------------------------

create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint chat_messages_role_check check (role in ('user', 'assistant'))
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.brands enable row level security;
alter table public.ideas enable row level security;
alter table public.guideline_files enable row level security;
alter table public.guideline_chunks enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

create policy brands_select_own on public.brands
  for select to authenticated
  using (auth.uid() = user_id);

create policy brands_insert_own on public.brands
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy brands_update_own on public.brands
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy brands_delete_own on public.brands
  for delete to authenticated
  using (auth.uid() = user_id);

create policy ideas_select_own on public.ideas
  for select to authenticated
  using (auth.uid() = user_id);

create policy ideas_insert_own on public.ideas
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy ideas_update_own on public.ideas
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy ideas_delete_own on public.ideas
  for delete to authenticated
  using (auth.uid() = user_id);

create policy guideline_files_select_own on public.guideline_files
  for select to authenticated
  using (auth.uid() = user_id);

create policy guideline_files_insert_own on public.guideline_files
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy guideline_files_update_own on public.guideline_files
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy guideline_files_delete_own on public.guideline_files
  for delete to authenticated
  using (auth.uid() = user_id);

create policy guideline_chunks_select_own on public.guideline_chunks
  for select to authenticated
  using (auth.uid() = user_id);

create policy guideline_chunks_insert_own on public.guideline_chunks
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy guideline_chunks_update_own on public.guideline_chunks
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy guideline_chunks_delete_own on public.guideline_chunks
  for delete to authenticated
  using (auth.uid() = user_id);

create policy chat_threads_select_own on public.chat_threads
  for select to authenticated
  using (auth.uid() = user_id);

create policy chat_threads_insert_own on public.chat_threads
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy chat_threads_update_own on public.chat_threads
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy chat_threads_delete_own on public.chat_threads
  for delete to authenticated
  using (auth.uid() = user_id);

create policy chat_messages_select_own on public.chat_messages
  for select to authenticated
  using (auth.uid() = user_id);

create policy chat_messages_insert_own on public.chat_messages
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy chat_messages_update_own on public.chat_messages
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy chat_messages_delete_own on public.chat_messages
  for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.brands to authenticated;
grant select, insert, update, delete on public.ideas to authenticated;
grant select, insert, update, delete on public.guideline_files to authenticated;
grant select, insert, update, delete on public.guideline_chunks to authenticated;
grant select, insert, update, delete on public.chat_threads to authenticated;
grant select, insert, update, delete on public.chat_messages to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket, objects only under {user_id}/...
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('guidelines', 'guidelines', false)
on conflict (id) do nothing;

create policy guidelines_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'guidelines'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy guidelines_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'guidelines'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy guidelines_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'guidelines'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'guidelines'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy guidelines_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'guidelines'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
