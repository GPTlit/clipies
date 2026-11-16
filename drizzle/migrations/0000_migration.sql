
create extension if not exists pgcrypto;

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

-- subscriptions
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  plan text not null default 'free' check (plan in ('free','pro','agency')),
  status text not null default 'active',
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "own sub" on public.subscriptions for select to authenticated using (user_id = auth.uid());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  insert into public.subscriptions (user_id) values (new.id);
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- generic owner table helper via repeated DDL
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','uploading','processing','ready','failed')),
  language text not null default 'auto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.projects(user_id, created_at desc);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  storage_path text,
  thumbnail_path text,
  source_url text,
  mime_type text,
  size_bytes bigint,
  duration_seconds numeric,
  width int, height int,
  status text not null default 'uploading' check (status in ('uploading','uploaded','transcribing','analyzing','ready','failed','awaiting_worker')),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.videos(user_id, created_at desc);
create index on public.videos(project_id);

create table public.video_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  video_id uuid references public.videos(id) on delete cascade,
  clip_id uuid,
  kind text not null check (kind in ('audio','thumbnail','render','waveform','other')),
  storage_path text not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.video_assets(user_id);

create table public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  video_id uuid references public.videos(id) on delete cascade,
  clip_id uuid,
  kind text not null check (kind in ('transcribe','detect_moments','diarize','reframe','render','generate_content','publish')),
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','awaiting_worker','cancelled')),
  progress int not null default 0,
  payload jsonb not null default '{}',
  result jsonb,
  error text,
  attempts int not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.processing_jobs(user_id, created_at desc);
create index on public.processing_jobs(status, kind);

create table public.transcripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  video_id uuid not null unique references public.videos(id) on delete cascade,
  language text,
  segments jsonb not null default '[]',
  full_text text not null default '',
  timing_precision text not null default 'segment',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.speakers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  video_id uuid not null references public.videos(id) on delete cascade,
  label text not null,
  display_name text,
  color text,
  face_box jsonb,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);
create index on public.speakers(video_id);

create table public.detected_moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  video_id uuid not null references public.videos(id) on delete cascade,
  start_seconds numeric not null,
  end_seconds numeric not null,
  category text,
  score int,
  reason text,
  created_at timestamptz not null default now()
);
create index on public.detected_moments(video_id);

create table public.subtitle_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  style jsonb not null default '{}',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.subtitle_presets(user_id);

create table public.clips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  video_id uuid not null references public.videos(id) on delete cascade,
  moment_id uuid references public.detected_moments(id) on delete set null,
  title text not null,
  description text,
  transcript text,
  start_seconds numeric not null,
  end_seconds numeric not null,
  score int,
  reason text,
  category text,
  hashtags text[] not null default '{}',
  status text not null default 'suggested' check (status in ('suggested','approved','rejected','rendering','rendered')),
  is_favorite boolean not null default false,
  framing_mode text not null default 'active_speaker' check (framing_mode in ('active_speaker','dual_speaker','split_screen','smart_center','manual')),
  aspect_ratio text not null default '9:16',
  subtitle_preset_id uuid references public.subtitle_presets(id) on delete set null,
  render_path text,
  content jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.clips(user_id, created_at desc);
create index on public.clips(video_id);

create table public.subtitles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  clip_id uuid not null unique references public.clips(id) on delete cascade,
  cues jsonb not null default '[]',
  style jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.editing_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  clip_id uuid not null unique references public.clips(id) on delete cascade,
  settings jsonb not null default '{}',
  history jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  platform text not null check (platform in ('tiktok','instagram','youtube','snapchat')),
  external_id text not null,
  username text,
  avatar_url text,
  scopes text[] not null default '{}',
  status text not null default 'connected' check (status in ('connected','expired','revoked','error')),
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, platform, external_id)
);
create index on public.social_accounts(user_id);

-- tokens: never readable by clients
create table public.social_account_tokens (
  account_id uuid primary key references public.social_accounts(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
grant all on public.social_account_tokens to service_role;
alter table public.social_account_tokens enable row level security;

create table public.oauth_states (
  state text primary key,
  user_id uuid not null,
  platform text not null,
  code_verifier text,
  created_at timestamptz not null default now()
);
grant all on public.oauth_states to service_role;
alter table public.oauth_states enable row level security;

create table public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  clip_id uuid not null references public.clips(id) on delete cascade,
  social_account_id uuid references public.social_accounts(id) on delete set null,
  platform text not null,
  caption text,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('draft','scheduled','paused','processing','publishing','published','failed','cancelled')),
  recurrence text,
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.scheduled_posts(user_id, scheduled_at);
create index on public.scheduled_posts(status, scheduled_at);

create table public.published_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  scheduled_post_id uuid references public.scheduled_posts(id) on delete set null,
  clip_id uuid references public.clips(id) on delete set null,
  platform text not null,
  external_post_id text not null,
  url text,
  metrics jsonb,
  metrics_fetched_at timestamptz,
  published_at timestamptz not null default now()
);
create index on public.published_posts(user_id);

create table public.publishing_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  scheduled_post_id uuid references public.scheduled_posts(id) on delete cascade,
  level text not null default 'info',
  message text not null,
  created_at timestamptz not null default now()
);
create index on public.publishing_logs(scheduled_post_id);

create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null default 'My brand',
  primary_color text not null default '#a855f7',
  secondary_color text not null default '#22d3ee',
  font text not null default 'Sora',
  logo_path text,
  watermark_enabled boolean not null default false,
  watermark_position text not null default 'bottom-right',
  intro_text text,
  outro_text text,
  default_subtitle_preset_id uuid references public.subtitle_presets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.brand_kits(user_id);

create table public.usage_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null,
  quantity numeric not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.usage_records(user_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications(user_id, created_at desc);

-- grants + RLS for owner tables
do $$
declare t text;
begin
  foreach t in array array['projects','videos','video_assets','processing_jobs','transcripts','speakers','detected_moments','subtitle_presets','clips','subtitles','editing_projects','social_accounts','scheduled_posts','published_posts','publishing_logs','brand_kits','usage_records','notifications']
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "owner select" on public.%I for select to authenticated using (user_id = auth.uid())', t);
    execute format('create policy "owner insert" on public.%I for insert to authenticated with check (user_id = auth.uid())', t);
    execute format('create policy "owner update" on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "owner delete" on public.%I for delete to authenticated using (user_id = auth.uid())', t);
  end loop;
  foreach t in array array['profiles','subscriptions','projects','videos','processing_jobs','transcripts','subtitle_presets','clips','subtitles','editing_projects','social_accounts','scheduled_posts','brand_kits']
  loop
    execute format('create trigger touch_%I before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.processing_jobs;
alter publication supabase_realtime add table public.videos;

-- storage policies (buckets created separately)
create policy "own media read" on storage.objects for select to authenticated using (bucket_id in ('videos','thumbnails','renders','brand') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own media insert" on storage.objects for insert to authenticated with check (bucket_id in ('videos','thumbnails','renders','brand') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own media update" on storage.objects for update to authenticated using (bucket_id in ('videos','thumbnails','renders','brand') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own media delete" on storage.objects for delete to authenticated using (bucket_id in ('videos','thumbnails','renders','brand') and (storage.foldername(name))[1] = auth.uid()::text);
