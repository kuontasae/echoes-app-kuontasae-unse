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
  hashtags: ['邦ロック'],
  liveHistory: ['VIVA LA ROCK'],
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
  age: 24,
  gender: 'other',
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

async function mockLoggedInSupabase(page: Page, profile = mockProfile) {
  const storageKey = getSupabaseStorageKey();
  test.skip(!storageKey, 'NEXT_PUBLIC_SUPABASE_URL is required for the mocked login test.');
  if (!storageKey) return;

  const session = createMockSession();

  await page.addInitScript(
    ({ key, value }) => {
      Object.defineProperty(window.navigator, 'locks', {
        configurable: true,
        value: undefined,
      });
      window.localStorage.clear();
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
              artworkUrl60: 'https://example.com/vaundy-60.jpg',
              artworkUrl100: 'https://example.com/vaundy-100.jpg',
            },
          ],
        },
      });
      return;
    }
    await route.fulfill({ json: { results: [] } });
  });

  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').pop();
    const accept = route.request().headers().accept || '';

    if (table === 'profiles') {
      if (route.request().method() === 'PATCH') {
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

    if (table === 'follows' || table === 'blocks' || table === 'vibes' || table === 'likes' || table === 'comments' || table === 'articles' || table === 'transactions' || table === 'community_members' || table === 'notifications' || table === 'chat_messages') {
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

  const tabs = ['Feed', 'Discover', 'Read', 'Diary', 'Chat', 'Profile'];
  for (const tab of tabs) {
    await expect(page.getByRole('button', { name: new RegExp(tab, 'i') })).toBeVisible();
  }

  await page.getByRole('button', { name: /Discover/i }).click();
  await expect(page.getByRole('button', { name: 'People' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Community' })).toBeVisible();

  await page.getByRole('button', { name: /Read/i }).click();
  await expect(page.getByRole('button', { name: 'Trend' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Global' })).toBeVisible();

  await page.getByRole('button', { name: /Diary/i }).click();
  await expect(page.getByText('AI Vibe Analysis')).toBeVisible();

  await page.getByRole('button', { name: /Chat/i }).click();
  await expect(page.getByRole('heading', { name: 'チャット' })).toBeVisible();

  await page.getByRole('button', { name: /Profile/i }).click();
  await expect(page.getByText('@e2e_user')).toBeVisible();

  await page.getByRole('button', { name: /Feed/i }).click();
  await expect(page.getByRole('heading', { name: 'Echoes' })).toBeVisible();
});

test('主要タブをクリックしても画面が真っ白にならない', async ({ page }) => {
  await mockLoggedInSupabase(page);
  await page.goto('/');

  const tabs = ['Feed', 'Discover', 'Read', 'Chat', 'Profile'];
  for (const tab of tabs) {
    await page.getByRole('button', { name: new RegExp(tab, 'i') }).click();
    await expectPageNotBlank(page);
  }
});

test('Discoverで音楽タグからユーザーを絞り込める', async ({ page }) => {
  await mockLoggedInSupabase(page);
  await page.goto('/');

  await page.getByRole('button', { name: /Discover/i }).click();
  await expect(page.getByRole('button', { name: '#邦ロック' })).toBeVisible();
  await expect(page.getByText('Band Mate')).toBeVisible();
  await expect(page.getByText('Jazz Friend')).toBeVisible();

  await page.getByRole('button', { name: '#邦ロック' }).click();

  await expect(page.getByText('Band Mate')).toBeVisible();
  await expect(page.getByText('Jazz Friend')).not.toBeVisible();
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByText('Jazz Friend')).toBeVisible();
});

test('初回オンボーディングでプロフィールと音楽タグを保存できる', async ({ page }) => {
  const emptyMusicProfile = { ...mockProfile, hashtags: [], liveHistory: [] };
  await mockLoggedInSupabase(page, emptyMusicProfile);
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
  await page.getByRole('button', { name: /Profile/i }).click();
  await expect(page.getByText('@new_echo')).toBeVisible();
  await expect(page.getByText('#テクノ')).toBeVisible();
  await expect(page.getByText('#Vaundy')).toBeVisible();
  await expect(page.getByText('#深夜に聴きたい')).toBeVisible();
});
