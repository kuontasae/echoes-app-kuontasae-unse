import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const APPLE_MUSIC_JP_MOST_PLAYED_URL = 'https://rss.applemarketingtools.com/api/v2/jp/music/most-played/25/songs.json';
const REVALIDATE_SECONDS = 60 * 60;

const FALLBACK_SONGS = [
  {
    trackId: 1739088799,
    trackName: 'ライラック',
    artistName: 'Mrs. GREEN APPLE',
    artistId: 962221033,
    artworkUrl60: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/4c/3b/b2/4c3bb247-3be8-0c57-aa9a-7f1775a7b7a8/24UMGIM32931.rgb.jpg/60x60bb.jpg',
    artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/4c/3b/b2/4c3bb247-3be8-0c57-aa9a-7f1775a7b7a8/24UMGIM32931.rgb.jpg/100x100bb.jpg',
    previewUrl: '',
  },
  {
    trackId: 1739088798,
    trackName: '青と夏',
    artistName: 'Mrs. GREEN APPLE',
    artistId: 962221033,
    artworkUrl60: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/86/ee/0a/86ee0a6e-3172-896d-6f20-a333497ad2d1/00602567754836.rgb.jpg/60x60bb.jpg',
    artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/86/ee/0a/86ee0a6e-3172-896d-6f20-a333497ad2d1/00602567754836.rgb.jpg/100x100bb.jpg',
    previewUrl: '',
  },
  {
    trackId: 1708908341,
    trackName: '唱',
    artistName: 'Ado',
    artistId: 1497140254,
    artworkUrl60: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/63/83/f5/6383f55f-5cd5-cd19-b434-3dc0b4b4ed37/23UMGIM91066.rgb.jpg/60x60bb.jpg',
    artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/63/83/f5/6383f55f-5cd5-cd19-b434-3dc0b4b4ed37/23UMGIM91066.rgb.jpg/100x100bb.jpg',
    previewUrl: '',
  },
];

type AppleMusicRssSong = {
  id?: string;
  name?: string;
  artistName?: string;
  artistId?: string;
  artworkUrl100?: string;
  releaseDate?: string;
  url?: string;
};

type TrendingSong = {
  trackId: number;
  trackName: string;
  artistName: string;
  artistId: number;
  collectionId?: number;
  collectionName?: string;
  artworkUrl60: string;
  artworkUrl100: string;
  previewUrl: string;
  releaseDate?: string;
  primaryGenreName?: string;
  trackViewUrl?: string;
  collectionViewUrl?: string;
};

type ItunesTrack = {
  wrapperType?: string;
  trackId?: number;
  trackName?: string;
  artistName?: string;
  artistId?: number;
  collectionId?: number;
  collectionName?: string;
  artworkUrl60?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  releaseDate?: string;
  primaryGenreName?: string;
  trackViewUrl?: string;
  collectionViewUrl?: string;
};

const artworkWithSize = (url: string | undefined, size: number) => {
  if (!url) return '';
  return url.replace(/\/\d+x\d+bb\.(jpg|jpeg|png|webp)$/i, `/${size}x${size}bb.$1`);
};

const normalizeForMatch = (value: string | undefined) => (value || "")
  .normalize("NFKC")
  .toLowerCase()
  .replace(/[^\p{Letter}\p{Number}]+/gu, "");

const toSong = (song: AppleMusicRssSong, index: number) => {
  const trackId = Number(song.id) || index + 1;
  const artistId = Number(song.artistId) || 0;
  const artworkUrl100 = artworkWithSize(song.artworkUrl100, 100);

  return {
    trackId,
    trackName: song.name || 'Unknown Song',
    artistName: song.artistName || 'Unknown Artist',
    artistId,
    artworkUrl60: artworkWithSize(song.artworkUrl100, 60) || artworkUrl100,
    artworkUrl100,
    previewUrl: '',
    releaseDate: song.releaseDate,
    trackViewUrl: song.url,
  };
};

const scoreCandidate = (base: TrendingSong, candidate: ItunesTrack) => {
  const baseTrack = normalizeForMatch(base.trackName);
  const candidateTrack = normalizeForMatch(candidate.trackName);
  const baseArtist = normalizeForMatch(base.artistName);
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

const enrichWithPreview = async (song: TrendingSong): Promise<TrendingSong> => {
  try {
    const term = `${song.trackName} ${song.artistName}`;
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&country=jp&limit=10`;
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      throw new Error(`iTunes Search returned ${response.status}`);
    }

    const data = await response.json();
    const candidates = (data?.results || []) as ItunesTrack[];
    const best = candidates
      .filter(candidate => candidate.wrapperType === 'track')
      .sort((a, b) => scoreCandidate(song, b) - scoreCandidate(song, a))[0];

    if (!best) return song;

    return {
      ...song,
      trackId: best.trackId || song.trackId,
      trackName: best.trackName || song.trackName,
      artistName: best.artistName || song.artistName,
      artistId: best.artistId || song.artistId,
      collectionId: best.collectionId,
      collectionName: best.collectionName,
      artworkUrl60: best.artworkUrl60 || song.artworkUrl60,
      artworkUrl100: best.artworkUrl100 || song.artworkUrl100,
      previewUrl: best.previewUrl || song.previewUrl || '',
      releaseDate: best.releaseDate || song.releaseDate,
      primaryGenreName: best.primaryGenreName,
      trackViewUrl: best.trackViewUrl || song.trackViewUrl,
      collectionViewUrl: best.collectionViewUrl,
    };
  } catch (error) {
    console.warn('Trending song preview enrichment failed', {
      trackName: song.trackName,
      artistName: song.artistName,
      error,
    });
    return song;
  }
};

const enrichSongsWithPreviews = async (songs: TrendingSong[]) => Promise.all(songs.map(enrichWithPreview));

const fallbackResponse = async () => {
  const songs = await enrichSongsWithPreviews(FALLBACK_SONGS);
  return NextResponse.json(
  {
    source: 'fallback',
    songs,
  },
  {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
    },
  },
  );
};

export async function GET() {
  try {
    const response = await fetch(APPLE_MUSIC_JP_MOST_PLAYED_URL, {
      headers: { accept: 'application/json' },
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      throw new Error(`Apple Music RSS returned ${response.status}`);
    }

    const data = await response.json();
    const songs = (data?.feed?.results || [])
      .map((song: AppleMusicRssSong, index: number) => toSong(song, index))
      .filter((song: ReturnType<typeof toSong>) => song.trackName && song.artistName && song.artworkUrl100);

    if (songs.length === 0) {
      throw new Error('Apple Music RSS returned no songs');
    }

    const enrichedSongs = await enrichSongsWithPreviews(songs);

    return NextResponse.json(
      {
        source: 'apple-music-rss',
        updated: data?.feed?.updated,
        songs: enrichedSongs,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      },
    );
  } catch (error) {
    console.warn('Trending songs fetch failed', error);
    return fallbackResponse();
  }
}
