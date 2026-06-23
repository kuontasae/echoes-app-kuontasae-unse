alter table public.vibes
  add column if not exists spotify_track_id text,
  add column if not exists spotify_uri text,
  add column if not exists spotify_url text;
