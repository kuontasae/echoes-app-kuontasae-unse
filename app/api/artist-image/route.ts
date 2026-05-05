import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type ArtistImageRequest = {
  artistId?: unknown;
  artistName?: unknown;
  fallbackArtworkUrl?: unknown;
};

type ArtistImageSource = 'lastfm' | 'fallback' | 'none';

type SpotifyArtist = {
  id?: string;
  name?: string;
  popularity?: number;
  images?: Array<{ url?: string; height?: number; width?: number }>;
};

type LastfmImage = {
  '#text'?: string;
  size?: string;
};

type LastfmArtistInfoResponse = {
  error?: number;
  message?: string;
  artist?: {
    name?: string;
    image?: LastfmImage[];
  };
};

const normalizeArtistKey = (value: string) =>
  value
    .trim()
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9一-龯ぁ-んァ-ヶー]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';

const normalizeForMatch = (value: string) =>
  value
    .trim()
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '');

const responseFor = (artistImageUrl: string, source: ArtistImageSource, fallbackArtworkUrl = '') =>
  NextResponse.json({
    artistImageUrl,
    source,
    fallbackUsed: source !== 'lastfm',
  });

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
};

const isMissingArtistProfilesTable = (error: any) => {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
  return error?.code === '42P01' || error?.code === 'PGRST205' || /artist_profiles/i.test(message);
};

const getSpotifyAccessToken = async () => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });

  if (!response.ok) {
    throw new Error(`Spotify token request failed: ${response.status}`);
  }

  const data = await response.json();
  return typeof data.access_token === 'string' ? data.access_token : null;
};

const scoreSpotifyArtist = (artistName: string, artist: SpotifyArtist) => {
  const target = normalizeForMatch(artistName);
  const candidate = normalizeForMatch(artist.name || '');
  let score = artist.popularity || 0;
  if (candidate === target) score += 1000;
  else if (candidate.includes(target) || target.includes(candidate)) score += 200;
  if (artist.images?.length) score += 50;
  return score;
};

const findSpotifyArtistImage = async (artistName: string) => {
  const token = await getSpotifyAccessToken();
  if (!token) return null;

  const url = `https://api.spotify.com/v1/search?${new URLSearchParams({
    q: artistName,
    type: 'artist',
    limit: '5',
    market: 'JP',
  })}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Spotify artist search failed: ${response.status}`);
  }

  const data = await response.json();
  const artists = (data?.artists?.items || []) as SpotifyArtist[];
  const best = artists
    .filter(artist => artist.name)
    .sort((a, b) => scoreSpotifyArtist(artistName, b) - scoreSpotifyArtist(artistName, a))[0];

  return best?.images?.[0]?.url || null;
};

const lastfmSizeRank: Record<string, number> = {
  small: 1,
  medium: 2,
  large: 3,
  extralarge: 4,
  mega: 5,
};

const lastfmPlaceholderImageIds = [
  '2a96cbd8b46e442fc41c2b86b821562f.png',
];

const isLastfmPlaceholderImageUrl = (url: string) =>
  !url.trim() || lastfmPlaceholderImageIds.some(imageId => url.includes(imageId));

const pickLargestLastfmImage = (images: LastfmImage[] | undefined) => {
  const candidates = (images || [])
    .map(image => ({
      url: (image['#text'] || '').trim(),
      size: image.size || '',
      rank: lastfmSizeRank[(image.size || '').toLowerCase()] || 0,
    }))
    .filter(image => !isLastfmPlaceholderImageUrl(image.url));

  return candidates.sort((a, b) => b.rank - a.rank)[0]?.url || null;
};

const findLastfmArtistImage = async (artistName: string) => {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) {
    console.warn('Last.fm artist image lookup skipped: LASTFM_API_KEY is not set', { artistName });
    return null;
  }

  const url = `https://ws.audioscrobbler.com/2.0/?${new URLSearchParams({
    method: 'artist.getInfo',
    artist: artistName,
    api_key: apiKey,
    autocorrect: '1',
    format: 'json',
  })}`;

  const response = await fetch(url);
  if (!response.ok) {
    console.warn('Last.fm artist image lookup failed', { artistName, status: response.status });
    return null;
  }

  const data = (await response.json()) as LastfmArtistInfoResponse;
  if (data.error) {
    console.warn('Last.fm artist image lookup returned an error', {
      artistName,
      error: data.error,
      message: data.message,
    });
    return null;
  }

  const images = data.artist?.image || [];
  const placeholderImages = images
    .map(image => ({
      size: image.size || '',
      url: (image['#text'] || '').trim(),
    }))
    .filter(image => isLastfmPlaceholderImageUrl(image.url));
  if (placeholderImages.length) {
    console.warn('Last.fm artist image lookup returned placeholder images', {
      artistName,
      resolvedArtistName: data.artist?.name,
      placeholderImages,
    });
  }

  const imageUrl = pickLargestLastfmImage(images);
  if (!imageUrl) {
    console.warn('Last.fm artist image lookup returned no image', { artistName });
  }
  return imageUrl;
};

export async function POST(req: Request) {
  let body: ArtistImageRequest;
  try {
    body = (await req.json()) as ArtistImageRequest;
  } catch {
    return NextResponse.json({ error: 'InvalidJson' }, { status: 400 });
  }

  const artistName = typeof body.artistName === 'string' ? body.artistName.trim() : '';
  const artistId = typeof body.artistId === 'string' || typeof body.artistId === 'number' ? String(body.artistId).trim() : '';
  const fallbackArtworkUrl = typeof body.fallbackArtworkUrl === 'string' ? body.fallbackArtworkUrl.trim() : '';
  if (!artistName) {
    return responseFor(fallbackArtworkUrl, fallbackArtworkUrl ? 'fallback' : 'none', fallbackArtworkUrl);
  }

  const artistKey = artistId || normalizeArtistKey(artistName);
  const supabaseAdmin = getSupabaseAdmin();

  let artistImageUrl = '';
  let source: ArtistImageSource = fallbackArtworkUrl ? 'fallback' : 'none';
  try {
    artistImageUrl = await findLastfmArtistImage(artistName) || '';
    if (artistImageUrl) source = 'lastfm';
  } catch (error) {
    console.warn('Last.fm artist image lookup failed', { artistName, artistId, error });
  }

  const resolvedUrl = artistImageUrl || fallbackArtworkUrl;
  if (supabaseAdmin && artistImageUrl) {
    const payload = {
      artist_key: artistKey,
      artist_id: artistId || null,
      artist_name: artistName,
      image_url: artistImageUrl,
      image_source: 'lastfm',
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabaseAdmin
      .from('artist_profiles')
      .upsert(payload, { onConflict: 'artist_key' });
    if (error && !isMissingArtistProfilesTable(error)) {
      console.warn('Artist profile cache save failed', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        artistKey,
      });
    }

    const byArtistId = artistId ? await supabaseAdmin
      .from('custom_communities')
      .update({ artwork_url: artistImageUrl })
      .eq('community_type', 'artist')
      .eq('artist_id', artistId) : { error: null };
    const byArtistName = await supabaseAdmin
      .from('custom_communities')
      .update({ artwork_url: artistImageUrl })
      .eq('community_type', 'artist')
      .eq('artist_name', artistName);
    const communityError = byArtistId.error || byArtistName.error;
    if (communityError) {
      console.warn('Artist community artwork cache update failed', {
        code: communityError.code,
        message: communityError.message,
        details: communityError.details,
        hint: communityError.hint,
        artistKey,
      });
    }
  }

  return responseFor(resolvedUrl, source, fallbackArtworkUrl);
}
