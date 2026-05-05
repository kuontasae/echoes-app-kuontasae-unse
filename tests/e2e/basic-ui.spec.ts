import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const mockUser = {
  id: 'e2e-user',
  email: 'e2e@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  role: 'authenticated',
  created_at: new Date().toISOString(),
};

const mockProfile = {
  id: mockUser.id,
  name: 'E2E User',
  handle: 'e2e_user',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
  bio: 'E2E test profile',
  followers: 0,
  following: 0,
  isPrivate: false,
  category: 'suggested',
  hashtags: ['test'],
  liveHistory: [],
  topArtists: [],
  age: 20,
  gender: 'other',
  free_coin: 0,
  paid_coin: 0,
  coin_balance: 0,
};

const mockTaggedProfile = {
  id: 'tagged-user',
  name: 'Band Mate',
  handle: 'band_mate',
  avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&q=80',
  bio: 'Tagged music friend',
  followers: 0,
  following: 0,
  isPrivate: false,
  category: 'suggested',
  hashtags: ['邦ロック', 'genre:テクノ', 'artist:Vaundy'],
  liveHistory: ['VIVA LA ROCK', 'FUJI ROCK'],
  topArtists: ['Vaundy'],
  age: 22,
  gender: 'other',
};

const mockUntaggedProfile = {
  id: 'untagged-user',
  name: 'Jazz Friend',
  handle: 'jazz_friend',
  avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80',
  bio: 'Different music friend',
  followers: 0,
  following: 0,
  isPrivate: false,
  category: 'suggested',
  hashtags: ['ジャズ'],
  liveHistory: [],
  topArtists: ['Miles Davis'],
  age: 24,
  gender: 'other',
};

type MockVibeRow = {
  id: string;
  user_id: string;
  track_id: string;
  title: string;
  artist: string;
  img_url: string;
  preview_url: string | null;
  caption: string;
  created_at: string;
};

function createMockSession() {
  return {
    access_token: 'e2e-access-token',
    refresh_token: 'e2e-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: mockUser,
  };
}

function readEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};

  return Object.fromEntries(
    fs.readFileSync(envPath, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const [key, ...rest] = line.split('=');
        return [key, rest.join('=').replace(/^["']|["']$/g, '')];
      }),
  );
}

function getSupabaseStorageKey() {
  const env = readEnvLocal();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  return `sb-${projectRef}-auth-token`;
}

async function mockLoggedInSupabase(page: Page, profile = mockProfile, options?: {
  onProfilePatch?: (body: { topArtists?: string[] }) => void;
  onVibePost?: (rows: MockVibeRow[]) => void;
  initialVibes?: MockVibeRow[];
  initialCustomCommunities?: any[];
  initialCommunityMembers?: Array<{ community_id: string; user_id: string; created_at?: string }>;
  trendingSongs?: any[];
  failTrendingSongs?: boolean;
}) {
  const storageKey = getSupabaseStorageKey();
  test.skip(!storageKey, 'NEXT_PUBLIC_SUPABASE_URL is required for the mocked login test.');
  if (!storageKey) return;

  const session = createMockSession();
  const postedVibes: MockVibeRow[] = [...(options?.initialVibes || [])];
  const customCommunities: any[] = [...(options?.initialCustomCommunities || [])];
  const communityMembers: Array<{ community_id: string; user_id: string; created_at?: string }> = [...(options?.initialCommunityMembers || [])];
  const artistFavorites: Array<{ user_id: string; artist_id: string; artist_name: string; artwork_url?: string }> = [];

  await page.addInitScript(
    ({ key, value }) => {
      Object.defineProperty(window.navigator, 'locks', {
        configurable: true,
        value: undefined,
      });
      window.sessionStorage.clear();
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    { key: storageKey, value: session },
  );

  await page.route('**/auth/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

    if (pathname.endsWith('/user')) {
      await route.fulfill({ json: { user: mockUser } });
      return;
    }

    if (pathname.endsWith('/token')) {
      await route.fulfill({ json: session });
      return;
    }

    await route.fulfill({ json: {} });
  });

  await page.route('https://itunes.apple.com/**', async (route) => {
    const url = new URL(route.request().url());
    const term = url.searchParams.get('term') || '';
    if (/vaundy/i.test(term)) {
      await route.fulfill({
        json: {
          results: [
            {
              artistId: 123,
              artistName: 'Vaundy',
              trackId: 456,
              trackName: '怪獣の花唄',
              wrapperType: 'track',
              releaseDate: '2023-01-01T00:00:00Z',
              artworkUrl60: 'https://example.com/vaundy-60.jpg',
              artworkUrl100: 'https://example.com/vaundy-100.jpg',
              previewUrl: 'https://example.com/vaundy-preview.m4a',
            },
          ],
        },
      });
      return;
    }
    await route.fulfill({ json: { results: [] } });
  });

  await page.route('**/api/trending-songs', async (route) => {
    if (options?.failTrendingSongs) {
      await route.fulfill({ status: 500, json: { error: 'trend unavailable' } });
      return;
    }
    await route.fulfill({
      json: {
        source: 'apple-music-rss',
        songs: options?.trendingSongs || [
          {
            trackId: 1739088799,
            trackName: 'ライラック',
            artistName: 'Mrs. GREEN APPLE',
            artistId: 962221033,
            artworkUrl60: 'https://example.com/lilac-60.jpg',
            artworkUrl100: 'https://example.com/lilac-100.jpg',
            previewUrl: 'https://example.com/lilac-preview.m4a',
          },
        ],
      },
    });
  });

  await page.route('**/api/artist-image', async (route) => {
    const body = route.request().postDataJSON() as { fallbackArtworkUrl?: string };
    await route.fulfill({
      json: {
        artistImageUrl: body.fallbackArtworkUrl || '',
        source: body.fallbackArtworkUrl ? 'fallback' : 'none',
        fallbackUsed: Boolean(body.fallbackArtworkUrl),
      },
    });
  });

  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').pop();
    const accept = route.request().headers().accept || '';

    if (table === 'profiles') {
      if (route.request().method() === 'PATCH') {
        options?.onProfilePatch?.(route.request().postDataJSON() as { topArtists?: string[] });
        await route.fulfill({ json: {} });
        return;
      }
      if (accept.includes('application/vnd.pgrst.object+json')) {
        await route.fulfill({ json: profile });
        return;
      }
      await route.fulfill({ json: [profile, mockTaggedProfile, mockUntaggedProfile] });
      return;
    }

    if (table === 'vibes') {
      if (route.request().method() === 'POST') {
        const rows = route.request().postDataJSON() as MockVibeRow[];
        options?.onVibePost?.(rows);
        postedVibes.unshift(...rows);
        await route.fulfill({ json: [] });
        return;
      }
      await route.fulfill({ json: postedVibes });
      return;
    }

    if (table === 'custom_communities') {
      if (route.request().method() === 'POST') {
        const rows = route.request().postDataJSON() as any[];
        rows.forEach((row) => {
          const index = customCommunities.findIndex(c => c.id === row.id);
          if (index >= 0) customCommunities[index] = { ...customCommunities[index], ...row };
          else customCommunities.push(row);
        });
        await route.fulfill({ json: customCommunities.filter(c => rows.some(row => row.id === c.id)) });
        return;
      }
      let result = customCommunities;
      const idMatch = url.searchParams.get('id')?.match(/^eq\.(.+)$/);
      const typeMatch = url.searchParams.get('community_type')?.match(/^eq\.(.+)$/);
      const artistMatch = url.searchParams.get('artist_id')?.match(/^eq\.(.+)$/);
      if (idMatch) result = result.filter(c => c.id === decodeURIComponent(idMatch[1]));
      if (typeMatch) result = result.filter(c => c.community_type === decodeURIComponent(typeMatch[1]));
      if (artistMatch) result = result.filter(c => c.artist_id === decodeURIComponent(artistMatch[1]));
      await route.fulfill({ json: accept.includes('application/vnd.pgrst.object+json') ? (result[0] || null) : result });
      return;
    }

    if (table === 'community_members') {
      if (route.request().method() === 'POST') {
        const rows = route.request().postDataJSON() as Array<{ community_id: string; user_id: string }>;
        rows.forEach((row) => {
          if (!communityMembers.some(m => m.community_id === row.community_id && m.user_id === row.user_id)) communityMembers.push({ ...row, created_at: new Date().toISOString() });
        });
        await route.fulfill({ json: [] });
        return;
      }
      if (route.request().method() === 'DELETE') {
        const communityMatch = url.searchParams.get('community_id')?.match(/^eq\.(.+)$/);
        const userMatch = url.searchParams.get('user_id')?.match(/^eq\.(.+)$/);
        for (let i = communityMembers.length - 1; i >= 0; i -= 1) {
          if ((!communityMatch || communityMembers[i].community_id === decodeURIComponent(communityMatch[1])) && (!userMatch || communityMembers[i].user_id === decodeURIComponent(userMatch[1]))) {
            communityMembers.splice(i, 1);
          }
        }
        await route.fulfill({ json: [] });
        return;
      }
      let result = communityMembers;
      const communityMatch = url.searchParams.get('community_id')?.match(/^eq\.(.+)$/);
      const userMatch = url.searchParams.get('user_id')?.match(/^eq\.(.+)$/);
      if (communityMatch) result = result.filter(m => m.community_id === decodeURIComponent(communityMatch[1]));
      if (userMatch) result = result.filter(m => m.user_id === decodeURIComponent(userMatch[1]));
      await route.fulfill({ json: result });
      return;
    }

    if (table === 'artist_favorites') {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as { user_id: string; artist_id: string; artist_name: string; artwork_url?: string } | Array<{ user_id: string; artist_id: string; artist_name: string; artwork_url?: string }>;
        const rows = Array.isArray(body) ? body : [body];
        rows.forEach((row) => {
          const index = artistFavorites.findIndex(f => f.user_id === row.user_id && f.artist_id === row.artist_id);
          if (index >= 0) artistFavorites[index] = { ...artistFavorites[index], ...row };
          else artistFavorites.push(row);
        });
        await route.fulfill({ json: rows });
        return;
      }
      if (route.request().method() === 'DELETE') {
        const userMatch = url.searchParams.get('user_id')?.match(/^eq\.(.+)$/);
        const artistMatch = url.searchParams.get('artist_id')?.match(/^eq\.(.+)$/);
        for (let i = artistFavorites.length - 1; i >= 0; i -= 1) {
          if ((!userMatch || artistFavorites[i].user_id === decodeURIComponent(userMatch[1])) && (!artistMatch || artistFavorites[i].artist_id === decodeURIComponent(artistMatch[1]))) {
            artistFavorites.splice(i, 1);
          }
        }
        await route.fulfill({ json: [] });
        return;
      }
      let result = artistFavorites;
      const userMatch = url.searchParams.get('user_id')?.match(/^eq\.(.+)$/);
      const artistMatch = url.searchParams.get('artist_id')?.match(/^eq\.(.+)$/);
      if (userMatch) result = result.filter(f => f.user_id === decodeURIComponent(userMatch[1]));
      if (artistMatch) result = result.filter(f => f.artist_id === decodeURIComponent(artistMatch[1]));
      if (route.request().method() === 'HEAD') {
        await route.fulfill({
          headers: {
            'content-range': `0-${Math.max(0, result.length - 1)}/${result.length}`,
          },
          body: '',
        });
        return;
      }
      await route.fulfill({ json: result });
      return;
    }

    if (table === 'follows' || table === 'blocks' || table === 'likes' || table === 'comments' || table === 'articles' || table === 'transactions' || table === 'notifications' || table === 'chat_messages') {
      await route.fulfill({ json: [] });
      return;
    }

    await route.fulfill({ json: [] });
  });
}

async function mockLoggedOutSupabase(page: Page) {
  const storageKey = getSupabaseStorageKey();
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'locks', {
      configurable: true,
      value: undefined,
    });
  });
  if (storageKey) {
    await page.addInitScript((key) => window.localStorage.removeItem(key), storageKey);
  }

  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({
      status: 401,
      json: { message: 'No session in e2e test' },
    });
  });
}

async function expectPageNotBlank(page: Page) {
  await expect(page.locator('main')).toBeVisible();
  await expect.poll(async () => {
    const text = await page.locator('body').innerText();
    return text.trim().length;
  }).toBeGreaterThan(20);
}

test('ログイン前のトップページが表示される', async ({ page }) => {
  await mockLoggedOutSupabase(page);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Echoes.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ログインして始める' })).toBeVisible();
  await expect(page.getByPlaceholder('メールアドレス')).toBeVisible();
  await expect(page.getByPlaceholder('パスワード')).toBeVisible();
  await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();
});

test('モックログイン状態で主要タブを表示できる', async ({ page }) => {
  await mockLoggedInSupabase(page);
  await page.goto('/');

  const tabs = ['フィード', '見つける', '読む', 'ダイアリー', 'チャット', 'プロフィール'];
  for (const tab of tabs) {
    await expect(page.getByRole('button', { name: new RegExp(tab, 'i') })).toBeVisible();
  }

  await page.getByRole('button', { name: '見つける' }).click();
  await expect(page.getByRole('button', { name: 'ユーザー' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'コミュニティ' })).toBeVisible();

  await page.getByRole('button', { name: '読む' }).click();
  await expect(page.getByRole('button', { name: 'トレンド' })).toBeVisible();
  await expect(page.getByRole('button', { name: '全体' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'フォロー中' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'いいね' })).toBeVisible();
  await expect(page.getByRole('button', { name: '自分の記事' })).toBeVisible();
  await expect(page.getByRole('button', { name: '下書き' })).toBeVisible();
  await expect(page.getByText('記事がありません')).toBeVisible();
  await expect(page.getByTestId('article-empty-state').locator('svg')).toHaveCount(0);

  for (const tab of ['全体', 'フォロー中', 'いいね', '自分の記事']) {
    await page.getByRole('button', { name: tab }).click();
    await expect(page.getByText('記事がありません')).toBeVisible();
    await expect(page.getByTestId('article-empty-state').locator('svg')).toHaveCount(0);
  }

  await page.getByRole('button', { name: '下書き' }).click();
  await expect(page.getByText('保存された下書きはありません')).toBeVisible();
  await expect(page.getByTestId('article-empty-state').locator('svg')).toHaveCount(0);

  await page.getByRole('button', { name: 'ダイアリー' }).click();
  await expect(page.getByText('AI Vibe Analysis')).toBeVisible();

  await page.getByRole('button', { name: 'チャット' }).click();
  await expect(page.getByRole('heading', { name: 'チャット' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'フレンド' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'グループ' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ライブ' })).not.toBeVisible();

  await page.getByRole('button', { name: 'プロフィール' }).click();
  await expect(page.getByText('@e2e_user')).toBeVisible();

  await page.getByRole('button', { name: 'フィード' }).click();
  await expect(page.getByRole('heading', { name: 'Echoes' })).toBeVisible();
});

test('Homeから最初の1曲を記録する導線が分かる', async ({ page }) => {
  await mockLoggedInSupabase(page);
  await page.goto('/');

  await expect(page.getByText('まずは今聴いている1曲を記録しよう')).toBeVisible();
  await expect(page.getByText('曲名・アーティスト名で検索して、今日のVibeを残せます。')).toBeVisible();

  await page.getByPlaceholder('楽曲やアーティストを検索...').fill('Vaundy');
  await page.getByText('怪獣の花唄').click();

  await expect(page.getByPlaceholder('今の気分、思い出、誰に聴いてほしいかを書いてみよう')).toBeVisible();
});

test('Home検索欄に日本の人気曲を表示して選択できる', async ({ page }) => {
  let postedPreviewUrl: string | null | undefined;
  await mockLoggedInSupabase(page, mockProfile, {
    onVibePost: rows => {
      postedPreviewUrl = rows[0]?.preview_url;
    },
  });
  await page.goto('/');

  await page.getByPlaceholder('楽曲やアーティストを検索...').focus();
  await expect(page.getByText('日本の人気曲')).toBeVisible();
  await expect(page.getByText('ライラック')).toBeVisible();

  await page.getByText('ライラック').click();
  await expect(page.getByPlaceholder('今の気分、思い出、誰に聴いてほしいかを書いてみよう')).toBeVisible();
  await page.getByPlaceholder('今の気分、思い出、誰に聴いてほしいかを書いてみよう').fill('人気曲から記録');
  await page.getByRole('button', { name: '記録する' }).click();

  await expect(page.getByText('人気曲から記録')).toBeVisible();
  expect(postedPreviewUrl).toBe('https://example.com/lilac-preview.m4a');
});

test('投稿後に近い人を探す次アクションへ進める', async ({ page }) => {
  await mockLoggedInSupabase(page);
  await page.goto('/');

  await page.getByPlaceholder('楽曲やアーティストを検索...').fill('Vaundy');
  await page.getByText('怪獣の花唄').click();
  await page.getByPlaceholder('今の気分、思い出、誰に聴いてほしいかを書いてみよう').fill('朝に聴きたい');
  await page.getByRole('button', { name: '記録する' }).click();

  await expect(page.getByPlaceholder('今の気分、思い出、誰に聴いてほしいかを書いてみよう')).not.toBeVisible();
  await expect(page.getByText('記録できました。似た音楽が好きな人を見つけに行こう')).toBeVisible();
  await expect(page.getByText('怪獣の花唄')).toBeVisible();
  await expect(page.getByText('朝に聴きたい')).toBeVisible();

  await page.getByRole('button', { name: '近い人を探す' }).click();
  await expect(page.getByRole('button', { name: 'ユーザー' })).toBeVisible();
});

test('アーティストページ経由の投稿後にHomeへ戻り完了表示が見える', async ({ page }) => {
  await mockLoggedInSupabase(page);
  await page.goto('/');

  await page.getByPlaceholder('楽曲やアーティストを検索...').fill('Vaundy');
  const artistResult = page.locator('div.cursor-pointer', { hasText: 'アーティスト' }).first();
  await expect(artistResult).toBeVisible();
  await artistResult.dispatchEvent('mousedown');

  await expect(page.getByRole('heading', { name: 'Vaundy' })).toBeVisible();
  await page.getByText('怪獣の花唄').nth(1).click();
  await page.getByPlaceholder('今の気分、思い出、誰に聴いてほしいかを書いてみよう').fill('アーティストページから記録');
  await page.getByRole('button', { name: '記録する' }).click();

  await expect(page.getByRole('heading', { name: 'Echoes' })).toBeVisible();
  await expect(page.getByText('記録できました。似た音楽が好きな人を見つけに行こう')).toBeVisible();
  await expect(page.getByText('成功しました')).toBeVisible();
  await expect(page.getByText('アーティストページから記録')).toBeVisible();
});

test('アーティストページの戻るボタンで中途半端な詳細画面が残らない', async ({ page }) => {
  await mockLoggedInSupabase(page);
  await page.goto('/');

  await page.getByPlaceholder('楽曲やアーティストを検索...').fill('Vaundy');
  const artistResult = page.locator('div.cursor-pointer', { hasText: 'アーティスト' }).first();
  await expect(artistResult).toBeVisible();
  await artistResult.dispatchEvent('mousedown');

  await expect(page.getByRole('heading', { name: 'Vaundy' })).toBeVisible();
  await expect(page.getByText('Vaundy ファンコミュニティ')).toBeVisible();
  await expect(page.getByText('怪獣の花唄').first()).toBeVisible();

  await page.getByRole('button', { name: 'アーティストページを戻る' }).click();
  await expect(page.getByRole('heading', { name: 'Vaundy' })).not.toBeVisible();
  await expect(page.getByText('Vaundy ファンコミュニティ')).not.toBeVisible();
  await expect(page.getByPlaceholder('楽曲やアーティストを検索...')).toBeVisible();

  await artistResult.dispatchEvent('mousedown');
  await expect(page.getByRole('heading', { name: 'Vaundy' })).toBeVisible();
  await expect(page.getByText('Vaundy ファンコミュニティ')).toBeVisible();
  await expect(page.getByText('怪獣の花唄').first()).toBeVisible();
});

test('アーティストページのお気に入り数がハートと連動してリロード後も残る', async ({ page }) => {
  await mockLoggedInSupabase(page);
  await page.goto('/');

  await page.getByPlaceholder('楽曲やアーティストを検索...').fill('Vaundy');
  const artistResult = page.locator('div.cursor-pointer', { hasText: 'アーティスト' }).first();
  await expect(artistResult).toBeVisible();
  await artistResult.dispatchEvent('mousedown');

  await expect(page.getByRole('heading', { name: 'Vaundy' })).toBeVisible();
  await expect(page.getByText('お気に入り 0人')).toBeVisible();
  const favoriteButton = page.getByRole('button', { name: 'お気に入り' });

  await favoriteButton.click();
  await expect(favoriteButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('お気に入り 1人')).toBeVisible();

  await page.reload();
  await page.getByPlaceholder('楽曲やアーティストを検索...').fill('Vaundy');
  const reloadedArtistResult = page.locator('div.cursor-pointer', { hasText: 'アーティスト' }).first();
  await expect(reloadedArtistResult).toBeVisible();
  await reloadedArtistResult.dispatchEvent('mousedown');

  await expect(page.getByRole('button', { name: 'お気に入り' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('お気に入り 1人')).toBeVisible();

  await page.getByRole('button', { name: 'お気に入り' }).click();
  await expect(page.getByRole('button', { name: 'お気に入り' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('お気に入り 0人')).toBeVisible();
});

test('アーティストページからファンコミュニティに参加してチャットへ入れる', async ({ page }) => {
  await mockLoggedInSupabase(page);
  await page.goto('/');

  await page.getByPlaceholder('楽曲やアーティストを検索...').fill('Vaundy');
  const artistResult = page.locator('div.cursor-pointer', { hasText: 'アーティスト' }).first();
  await expect(artistResult).toBeVisible();
  await artistResult.dispatchEvent('mousedown');

  await expect(page.getByText('Vaundy ファンコミュニティ')).toBeVisible();
  await expect(page.getByText('Vaundyが好きな人たちが集まる場所です')).toBeVisible();
  await page.getByRole('button', { name: '参加する' }).click();

  await expect(page.getByText('Vaundy ファンコミュニティ').first()).toBeVisible();
  await expect(page.getByText('参加者 1人').first()).toBeVisible();
  await expect(page.getByText('参加しました')).toBeVisible();
  await expect(page.getByPlaceholder('Aa')).toBeVisible();

  await page.getByRole('button', { name: '詳細' }).click();
  await page.getByText('メンバー').click();
  await expect(page.getByText('E2E User')).toBeVisible();
  await expect(page.getByText('あなた')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'チャット' }).click();
  await page.getByRole('button', { name: 'グループ', exact: true }).click();
  await expect(page.getByText('アーティストコミュニティ')).toBeVisible();
  await expect(page.getByText('Vaundy ファンコミュニティ')).toBeVisible();
});

test('主要タブをクリックしても画面が真っ白にならない', async ({ page }) => {
  await mockLoggedInSupabase(page);
  await page.goto('/');

  const tabs = ['フィード', '見つける', '読む', 'チャット', 'プロフィール'];
  for (const tab of tabs) {
    await page.getByRole('button', { name: new RegExp(tab, 'i') }).click();
    await expectPageNotBlank(page);
  }
});

test('Discoverのアーティストコミュニティがおすすめスコア順に並ぶ', async ({ page }) => {
  const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const artworkDataUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  const makeMembers = (communityId: string, count: number, recentCount: number) =>
    Array.from({ length: count }, (_, index) => ({
      community_id: communityId,
      user_id: `${communityId}-member-${index}`,
      created_at: daysAgo(index < recentCount ? 1 : 14),
    }));
  const makeVibe = (id: string, artist: string): MockVibeRow => ({
    id,
    user_id: mockProfile.id,
    track_id: id,
    title: `${artist} Song`,
    artist,
    img_url: artworkDataUrl,
    preview_url: null,
    caption: '',
    created_at: daysAgo(1),
  });

  await mockLoggedInSupabase(page, mockProfile, {
    trendingSongs: [
      { trackId: 1, trackName: 'ライラック', artistName: 'Mrs. GREEN APPLE', artistId: 962221033, artworkUrl60: artworkDataUrl, artworkUrl100: artworkDataUrl, previewUrl: null },
      { trackId: 2, trackName: 'SPECIALZ', artistName: 'King Gnu', artistId: 111, artworkUrl60: artworkDataUrl, artworkUrl100: artworkDataUrl, previewUrl: null },
      { trackId: 3, trackName: '青と夏', artistName: 'Mrs. GREEN APPLE', artistId: 962221033, artworkUrl60: artworkDataUrl, artworkUrl100: artworkDataUrl, previewUrl: null },
    ],
    initialCustomCommunities: [
      { id: 'artist:mrs-green-apple', name: 'Mrs. GREEN APPLE ファンコミュニティ', date: '2026-05-01', community_type: 'artist', artist_id: 'mrs-green-apple', artist_name: 'Mrs. GREEN APPLE', description: 'Mrs. GREEN APPLEが好きな人たちが集まる場所です', artwork_url: artworkDataUrl },
      { id: 'artist:tele', name: 'Tele ファンコミュニティ', date: '2026-05-01', community_type: 'artist', artist_id: 'tele', artist_name: 'Tele', description: 'Teleが好きな人たちが集まる場所です', artwork_url: artworkDataUrl },
      { id: 'artist:mazzel', name: 'MAZZEL ファンコミュニティ', date: '2026-05-01', community_type: 'artist', artist_id: 'mazzel', artist_name: 'MAZZEL', description: 'MAZZELが好きな人たちが集まる場所です', artwork_url: artworkDataUrl },
    ],
    initialCommunityMembers: [
      ...makeMembers('artist:mrs-green-apple', 12, 4),
      ...makeMembers('artist:tele', 5, 0),
      ...makeMembers('artist:mazzel', 3, 0),
    ],
    initialVibes: [makeVibe('tele-1', 'Tele'), makeVibe('tele-2', 'Tele'), makeVibe('tele-3', 'Tele')],
  });
  await page.goto('/');

  await page.getByRole('button', { name: '見つける' }).click();
  await page.getByRole('button', { name: 'コミュニティ' }).click();

  const section = page.getByRole('heading', { name: 'アーティストコミュニティ' }).locator('..');
  const rows = section.locator('div.cursor-pointer').filter({ hasText: 'ファンコミュニティ' });
  await expect(rows.nth(0)).toContainText('Mrs. GREEN APPLE ファンコミュニティ');
  await expect(rows.nth(0)).toContainText('12人が参加中');
  await expect(rows.nth(1)).toContainText('King Gnu ファンコミュニティ');
  await expect(rows.nth(1)).toContainText('0人が参加中');
  await expect(rows.nth(2)).toContainText('Tele ファンコミュニティ');
  await expect(rows.nth(2)).toContainText('5人が参加中');
  await expect(rows.nth(3)).toContainText('MAZZEL ファンコミュニティ');
  await expect(rows.nth(3)).toContainText('3人が参加中');
  await expect(rows.filter({ hasText: 'Mrs. GREEN APPLE ファンコミュニティ' })).toHaveCount(1);
  await expect(section.getByText('人気曲にランクイン')).not.toBeVisible();
  await expect(section.getByText(/今週 .*投稿/)).not.toBeVisible();
  await expect(section.getByText(/今週 .*人参加/)).not.toBeVisible();
  await expect(rows.nth(0).locator('img')).toBeVisible();

  await rows.nth(1).click();
  await expect(page.getByText('King Gnuが好きな人たちが集まる場所です')).toBeVisible();
  await page.getByRole('button', { name: '参加する' }).click();
  await expect(page.getByPlaceholder('Aa')).toBeVisible();
});

test('トレンド曲取得に失敗してもDiscover Communityが落ちない', async ({ page }) => {
  await mockLoggedInSupabase(page, mockProfile, { failTrendingSongs: true });
  await page.goto('/');

  await page.getByRole('button', { name: '見つける' }).click();
  await page.getByRole('button', { name: 'コミュニティ' }).click();

  await expect(page.getByText('アーティストコミュニティ')).toBeVisible();
  await expect(page.getByText('Vaundy ファンコミュニティ')).toBeVisible();
  await expect(page.getByText('人気曲にランクイン')).not.toBeVisible();
});

test('Discoverで音楽タグからユーザーを絞り込める', async ({ page }) => {
  await mockLoggedInSupabase(page);
  await page.goto('/');

  await page.getByRole('button', { name: '見つける' }).click();
  await expect(page.getByText('音楽タグ')).toBeVisible();
  await expect(page.getByText('おすすめの友達')).toBeVisible();
  await page.getByRole('button', { name: 'コミュニティ' }).click();
  await expect(page.getByText('アーティストコミュニティ')).toBeVisible();
  await expect(page.getByText('Vaundy ファンコミュニティ')).toBeVisible();
  await page.getByRole('button', { name: 'ユーザー' }).click();
  await expect(page.getByRole('button', { name: '#邦ロック' })).toBeVisible();
  await expect(page.getByText('Band Mate')).toBeVisible();
  await expect(page.getByText('Jazz Friend')).toBeVisible();

  await page.getByRole('button', { name: '#邦ロック' }).click();

  await expect(page.getByText('Band Mate')).toBeVisible();
  await expect(page.getByText('Jazz Friend')).not.toBeVisible();
  await page.getByRole('button', { name: 'クリア' }).click();
  await expect(page.getByText('Jazz Friend')).toBeVisible();
});

test('初回オンボーディングでプロフィールと音楽タグを保存できる', async ({ page }) => {
  const emptyMusicProfile = { ...mockProfile, hashtags: [], liveHistory: [] };
  const profilePatch: { current: { topArtists?: string[] } | null } = { current: null };
  await mockLoggedInSupabase(page, emptyMusicProfile, { onProfilePatch: (body) => { profilePatch.current = body; } });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'プロフィールを作りましょう' })).toBeVisible();

  await page.getByPlaceholder('名前').fill('New Echo');
  await page.getByPlaceholder('ユーザーID').fill('new_echo');
  await page.getByRole('button', { name: 'テクノ' }).click();
  await page.getByLabel('好きなアーティスト検索').fill('Vaundy');
  await page.getByRole('button', { name: /Vaundy/ }).click();
  await page.getByRole('button', { name: 'FUJI ROCK' }).click();
  await page.getByPlaceholder('自分でハッシュタグを追加').fill('深夜に聴きたい');
  await page.getByPlaceholder('自分でハッシュタグを追加').press('Enter');
  await page.getByPlaceholder('自分でライブ参戦歴を追加').fill('Zepp Tokyo');
  await page.getByPlaceholder('自分でライブ参戦歴を追加').press('Enter');
  await page.getByRole('button', { name: '保存して始める' }).click();

  await expect(page.getByRole('heading', { name: 'プロフィールを作りましょう' })).not.toBeVisible();
  expect(profilePatch.current?.topArtists).toEqual(['Vaundy']);
  await expect(page.getByRole('button', { name: 'ユーザー' })).toBeVisible();
  await expect(page.getByText('好きな音楽・ライブ履歴が近い人を表示中')).toBeVisible();
  await expect(page.getByText('Band Mate').first()).toBeVisible();
  await expect(page.getByText('共通: Vaundy')).toBeVisible();
  await expect(page.getByText('プロフィールを見てフォローしてみよう')).toBeVisible();
  await expect(page.getByRole('button', { name: 'フォロー' })).toBeVisible();
  await expect(page.getByText('Jazz Friend')).not.toBeVisible();
  await page.getByText('共通: Vaundy').click();
  await expect(page.getByText('@band_mate')).toBeVisible();
  await page.getByRole('button', { name: 'プロフィール' }).click();
  await expect(page.getByText('@new_echo')).toBeVisible();
  await expect(page.getByText('#テクノ')).toBeVisible();
  await expect(page.getByText('#Vaundy')).toBeVisible();
  await expect(page.getByText('#深夜に聴きたい')).toBeVisible();
});

test('初回オンボーディングであとでを選ぶとリロード後に再表示されない', async ({ page }) => {
  const emptyMusicProfile = { ...mockProfile, hashtags: [], liveHistory: [] };
  await mockLoggedInSupabase(page, emptyMusicProfile);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'プロフィールを作りましょう' })).toBeVisible();
  await page.getByRole('button', { name: 'あとで' }).click();
  await expect(page.getByRole('heading', { name: 'プロフィールを作りましょう' })).not.toBeVisible();

  await page.reload();

  await expect(page.getByRole('heading', { name: 'プロフィールを作りましょう' })).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Echoes' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'プロフィール' })).toBeVisible();
});
