import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';
const REVALIDATE_SECONDS = 60 * 60;

type RecommendationRequest = {
  mode?: 'home' | 'diary';
  artists?: string[];
  recentArtists7?: string[];
  recentArtists30?: string[];
  hashtags?: string[];
  recordedTrackIds?: Array<number | string>;
};

type ItunesTrack = {
  wrapperType?: string;
  trackId?: number;
  trackName?: string;
  artistName?: string;
  artistId?: number;
  artworkUrl60?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  primaryGenreName?: string;
};

type RecommendedSong = ItunesTrack & {
  reason: string;
  sourceArtist?: string;
  similarArtist?: string;
};

const normalizeForMatch = (value: string | undefined) => (value || "")
  .normalize("NFKC")
  .toLowerCase()
  .replace(/[^\p{Letter}\p{Number}]+/gu, "");

const scoreCandidate = (trackName: string, artistName: string, candidate: ItunesTrack) => {
  const baseTrack = normalizeForMatch(trackName);
  const candidateTrack = normalizeForMatch(candidate.trackName);
  const baseArtist = normalizeForMatch(artistName);
  const candidateArtist = normalizeForMatch(candidate.artistName);
  let score = 0;

  if (candidate.wrapperType === 'track') score += 1;
  if (candidate.previewUrl) score += 4;
  if (candidateTrack === baseTrack) score += 8;
  else if (candidateTrack.includes(baseTrack) || baseTrack.includes(candidateTrack)) score += 3;
  if (candidateArtist === baseArtist) score += 6;
  else if (candidateArtist.includes(baseArtist) || baseArtist.includes(candidateArtist)) score += 2;

  return score;
};

const safeStringArray = (value: unknown) => Array.isArray(value)
  ? value.map(item => String(item || "").trim()).filter(Boolean)
  : [];

const buildAnalysisMessage = (seedArtists: string[]) => {
  if (seedArtists.length === 0) return "もう少し曲を記録すると、あなたに合う曲を提案できます。";
  const artistText = seedArtists.slice(0, 3).join(', ');
  return `${artistText} などの傾向から、今のあなたにぴったりな3曲をピックアップしました。`;
};

const fallbackResponse = (source = 'fallback', mode: RecommendationRequest['mode'] = 'home', seedArtists: string[] = []) => NextResponse.json(
  {
    source,
    mode,
    seedArtists,
    analysisMessage: mode === 'diary' ? buildAnalysisMessage(seedArtists) : undefined,
    songs: [],
  },
  { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } },
);

const fetchLastfm = async (method: string, params: Record<string, string>) => {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) return null;

  const url = new URL(LASTFM_API_URL);
  url.searchParams.set('method', method);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('format', 'json');
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`Last.fm ${method} returned ${response.status}`);
  }

  return response.json();
};

const enrichWithItunes = async (trackName: string, artistName: string): Promise<ItunesTrack | null> => {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(`${trackName} ${artistName}`)}&media=music&entity=song&country=jp&limit=10`;
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`iTunes Search returned ${response.status}`);
  }

  const data = await response.json();
  const candidates = (data?.results || []) as ItunesTrack[];
  return candidates
    .filter(candidate => candidate.wrapperType === 'track' && candidate.trackId && candidate.trackName && candidate.artistName)
    .sort((a, b) => scoreCandidate(trackName, artistName, b) - scoreCandidate(trackName, artistName, a))[0] || null;
};

const buildReason = (sourceArtist: string, similarArtist: string, index: number, hashtags: string[]) => {
  const hasJapaneseRockSignal = hashtags.some(tag => /邦ロック|ロック|フェス|ライブ/i.test(tag));
  if (hasJapaneseRockSignal && index % 3 === 2) return "あなたの邦ロック傾向に近い曲";
  if (index === 0) return `最近${sourceArtist}をよく記録しているので`;
  return `${sourceArtist}に近いアーティストから`;
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as RecommendationRequest;
    const mode = body.mode === 'diary' ? 'diary' : 'home';
    const recentArtists7 = safeStringArray(body.recentArtists7);
    const recentArtists30 = safeStringArray(body.recentArtists30);
    const seedArtists = safeStringArray(body.artists).slice(0, 3);
    const recommendationSeeds = (mode === 'diary'
      ? [...recentArtists7, ...recentArtists30, ...seedArtists]
      : seedArtists
    ).filter((artist, index, artists) => artists.findIndex(other => normalizeForMatch(other) === normalizeForMatch(artist)) === index).slice(0, 3);
    const hashtags = safeStringArray(body.hashtags);
    const recordedTrackIds = new Set((body.recordedTrackIds || []).map(id => Number(id)).filter(Number.isFinite));

    if (recommendationSeeds.length === 0) return fallbackResponse('no-history', mode);
    if (!process.env.LASTFM_API_KEY) return fallbackResponse('missing-lastfm-key', mode, recommendationSeeds);

    const recommendations: RecommendedSong[] = [];
    const seenTrackIds = new Set<number>();
    const seenPairs = new Set<string>();

    for (const sourceArtist of recommendationSeeds) {
      const similarData = await fetchLastfm('artist.getSimilar', {
        artist: sourceArtist,
        limit: '4',
        autocorrect: '1',
      });
      const similarArtists = safeStringArray(
        (similarData?.similarartists?.artist || []).map((artist: any) => artist?.name),
      ).filter(artist => normalizeForMatch(artist) !== normalizeForMatch(sourceArtist));

      for (const similarArtist of similarArtists.slice(0, 3)) {
        const topTracksData = await fetchLastfm('artist.getTopTracks', {
          artist: similarArtist,
          limit: '3',
          autocorrect: '1',
        });
        const topTracks = (topTracksData?.toptracks?.track || [])
          .map((track: any) => ({
            trackName: String(track?.name || "").trim(),
            artistName: String(track?.artist?.name || similarArtist).trim(),
          }))
          .filter((track: { trackName: string; artistName: string }) => track.trackName && track.artistName);

        for (const topTrack of topTracks) {
          if (recommendations.length >= 6) break;
          const pairKey = `${normalizeForMatch(topTrack.trackName)}:${normalizeForMatch(topTrack.artistName)}`;
          if (seenPairs.has(pairKey)) continue;
          seenPairs.add(pairKey);

          const itunesTrack = await enrichWithItunes(topTrack.trackName, topTrack.artistName).catch(() => null);
          if (!itunesTrack?.trackId || recordedTrackIds.has(itunesTrack.trackId) || seenTrackIds.has(itunesTrack.trackId)) continue;

          seenTrackIds.add(itunesTrack.trackId);
          recommendations.push({
            ...itunesTrack,
            reason: buildReason(sourceArtist, similarArtist, recommendations.length, hashtags),
            sourceArtist,
            similarArtist,
          });
        }
        if (recommendations.length >= 6) break;
      }
      if (recommendations.length >= 6) break;
    }

    return NextResponse.json(
      {
        source: recommendations.length > 0 ? 'lastfm' : 'fallback',
        mode,
        seedArtists: recommendationSeeds,
        analysisMessage: mode === 'diary' ? buildAnalysisMessage(recommendationSeeds) : undefined,
        songs: recommendations,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
        },
      },
    );
  } catch (error) {
    console.warn('Recommended songs fallback', error);
    return fallbackResponse();
  }
}
