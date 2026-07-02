"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import DOMPurify from "isomorphic-dompurify";
import useSWR from 'swr';
import { User, Comment, Song, FavoriteArtist, Notification, ChatMessage, ChatGroup, LiveCommunity } from './types';
import { IconHeart, IconComment, IconLock, IconPlay, IconStop, IconChevronLeft, IconChevronRight, IconChevronDown, IconSearch, IconShareBox, IconVerified, IconCross, IconGear, IconTrend, IconSparkles, IconMusic, IconMusicSmall, IconBell, IconGlobe, IconClock, IconShareExternal, IconStar, IconInfo, IconHelp, IconLockSetting, IconCamera, IconShuffle, IconDots, IconFlame, IconRewind, IconCheck, IconWarning, IconMatchTab, IconChatTab, IconSend, IconUserPlus, IconUser, IconMessagePlus, IconFilter, IconTicket, IconCrown, IconUsers, IconCalendar } from './Icons';
import { supabase } from './supabase';
import { FeedCard } from './components/FeedCard';
import { ArticleEditorModal } from './components/articles/ArticleEditorModal';
import { ArticleListSection } from './components/articles/ArticleListSection';
import { ArticleDetailModal } from './components/articles/ArticleDetailModal';
import { ArticlePublishSettingsModal } from './components/articles/ArticlePublishSettingsModal';
import { MusicSearchBox } from './components/music/MusicSearchBox';
import { SongPostModal } from './components/music/SongPostModal';
import { EditProfileModal } from './components/profile/EditProfileModal';
import { ProfileSection } from './components/profile/ProfileSection';
import { UserListModal } from './components/profile/UserListModal';
import { ChatInputBar } from './components/chat/ChatInputBar';
import { ChatListSection } from './components/chat/ChatListSection';
import { ChatMessages } from './components/chat/ChatMessages';
import { ChatRoomHeader } from './components/chat/ChatRoomHeader';
import { ArtistDetailOverlay } from './components/ArtistDetailOverlay';
import { BlockedUsersModal } from './components/BlockedUsersModal';
import { CalendarMonthYearPicker } from './components/CalendarMonthYearPicker';
import { ChatMusicPickerModal } from './components/ChatMusicPickerModal';
import { CommunityCalendarPicker } from './components/CommunityCalendarPicker';
import { CreateGroupModal } from './components/CreateGroupModal';
import { MatchFilterModal } from './components/MatchFilterModal';
import { MiniPlayer } from './components/MiniPlayer';
import { NotificationsModal } from './components/NotificationsModal';
import { displayLocalTime, formatCount } from './utils/formatters';
import { COIN_CHARGE_PLANS, type CoinChargePlan } from './coinPlans';
import { useSearchParams } from 'next/navigation';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("NetworkError");
  return res.json();
};

type CoinFields = {
  coin_balance?: number;
  free_coin?: number;
  paid_coin?: number;
};

type StripeConnectStatus = {
  connected: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  lastPayoutFailure?: {
    code?: string | null;
    message?: string | null;
  } | null;
};

const getAvailableCoins = (profile: CoinFields) => {
  const splitBalance = (Number(profile.free_coin) || 0) + (Number(profile.paid_coin) || 0);
  return splitBalance > 0 ? splitBalance : Number(profile.coin_balance) || 0;
};

const LANGUAGE_STORAGE_KEY = "echoes_language";
const DEFAULT_ONBOARDING_GENRES = ["邦ロック", "J-POP", "K-POP", "洋楽", "ヒップホップ", "R&B", "EDM", "テクノ", "ジャズ", "アニソン", "ボカロ", "アイドル"];
const DEFAULT_ONBOARDING_HASHTAGS = ["フェス勢", "ライブ好き", "チルい曲", "カラオケ好き", "音楽友達募集", "新譜チェック", "推し活", "レコード好き"];
const DEFAULT_ONBOARDING_LIVE_HISTORY = ["VIVA LA ROCK", "ROCK IN JAPAN", "FUJI ROCK", "SUMMER SONIC", "COUNTDOWN JAPAN", "METROCK", "RISING SUN", "SWEET LOVE SHOWER"];
const MUSIC_TAG_PREFIXES = ["genre:", "artist:", "tag:"] as const;
const makeMusicTag = (category: "genre" | "artist" | "tag", value: string) => `${category}:${value.trim().replace(/^#/, '')}`;
const getMusicTagLabel = (value: string) => MUSIC_TAG_PREFIXES.reduce((label, prefix) => label.startsWith(prefix) ? label.slice(prefix.length) : label, value);
const isMusicTagCategory = (value: string, category: "genre" | "artist" | "tag") => value.startsWith(`${category}:`);
const isOnboardingLiveCandidate = (value: string) => /(live|ライブ|フェス|ツアー|公演|ドーム|スタジアム|rock|fuji|summer|sonic|viva|metrock|japan|countdown|rising|sweet)/i.test(value);
const normalizeMusicLabel = (value: string) => getMusicTagLabel(value).trim().toLowerCase();
const normalizeArtistCommunityKey = (value: string) => normalizeMusicLabel(value).replace(/[^a-z0-9一-龯ぁ-んァ-ヶー]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
const getArtistScreenKey = (artist: any) => artist ? (normalizeMusicLabel(String(artist.artistName || "")) || String(artist.artistId || "")) : null;
const getAlbumScreenKey = (album: any) => album ? String(album.collectionId || "") : null;
const getArtistCommunityId = (artistId: string | number | undefined, artistName: string) => {
  const key = String(artistId || "").trim() || normalizeArtistCommunityKey(artistName);
  return `artist:${key || "unknown"}`;
};
const getArtistCommunityMetricKey = (artistName?: string) => normalizeMusicLabel(artistName || "");
const getArtistFavoriteId = (artist: { artistId?: string | number; artistName?: string }) => {
  const rawId = String(artist.artistId || "").trim();
  if (rawId && rawId !== "0") return rawId;
  return normalizeArtistCommunityKey(artist.artistName || "") || "unknown";
};
const getSupabaseErrorInfo = (err: any) => ({
  code: err?.code,
  message: err?.message,
  details: err?.details,
  hint: err?.hint
});
const isCommunityChatId = (id: string) => id.startsWith('com') || id.startsWith('artist:');
const buildArtistCommunity = (artist: { artistId?: string | number; artistName: string; artworkUrl?: string }, joinedIds: Set<string>, memberCounts: Record<string, number>): LiveCommunity => {
  const id = getArtistCommunityId(artist.artistId, artist.artistName);
  return {
    id,
    name: `${artist.artistName} ファンコミュニティ`,
    date: "常設",
    memberCount: memberCounts[id] || 0,
    isJoined: joinedIds.has(id),
    isVerified: true,
    communityType: 'artist',
    artistId: String(artist.artistId || normalizeArtistCommunityKey(artist.artistName)),
    artistName: artist.artistName,
    description: `${artist.artistName}が好きな人たちが集まる場所です`,
    artworkUrl: artist.artworkUrl
  };
};
const getArtistCommunityRecommendationScore = (community: LiveCommunity) =>
  (community.memberCount || 0) + (community.recentMemberCount || 0) * 3 + (community.recentPostCount || 0) * 2 + (community.trendScore || 0) * 5;

const toChatMessage = (msg: any): ChatMessage => {
  const targetId = String(msg.target_id || "");
  const isGroup = targetId.startsWith('g') || isCommunityChatId(targetId);
  const calculatedReadCount = isGroup ? (msg.read_count || (msg.is_read ? 1 : 0)) : 0;
  return {
    id: msg.id,
    senderId: msg.sender_id,
    text: msg.text,
    timestamp: new Date(msg.created_at).getTime(),
    isRead: msg.is_read,
    readCount: calculatedReadCount,
  } as any;
};
// 💡 本物の歯車アイコン
const IconSettings = () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const IconPlus = () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IconPin = () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>;
const IconImage = () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;
const IconMic = () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>;
const IconFile = () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>;
const IconArticle = () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M2 15h10"></path><path d="M2 18h10"></path><path d="M2 21h10"></path></svg>;
const IconTrash = () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const IconEdit2 = () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const IconShare = () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>;
const IconEdit = () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const IconLink = () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>;
const IconQuote = () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path></svg>;
const IconCode = () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>;
const IconMinus = () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IconYen = () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><line x1="12" y1="9" x2="12" y2="22"></line><polyline points="6 6 12 9 18 6"></polyline><line x1="6" y1="14" x2="18" y2="14"></line><line x1="6" y1="18" x2="18" y2="18"></line></svg>;
const IconHeadphones = () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>;
const IconList = () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
const getVibeMatchScore = (id1: string, id2: string) => {
  const hash = (id1 + id2).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return 60 + (hash % 39);
};
const calculateStreak = (vibes: Song[]) => {
  if (!vibes.length) return 0;
  const today = new Date(); today.setHours(0, 0, 0, 0); const current = today.getTime();
  const dates = vibes.map(v => { const d = new Date(v.timestamp); d.setHours(0, 0, 0, 0); return d.getTime(); });
  const unique = [...new Set(dates)].sort((a, b) => b - a);
  if (!unique.includes(current) && !unique.includes(current - 864e5)) return 0;
  let s = 0, c = unique.includes(current) ? current : current - 864e5;
  for (const d of unique) { if (d === c) { s++; c -= 864e5; } else break; }
  return s;
};
// 💡 外部ライブラリ不要：画像アップロード前にブラウザ側で自動圧縮する最強の関数
const compressImage = async (file: File, maxWidth = 800, quality = 0.7): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) { resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpeg"), { type: "image/jpeg", lastModified: Date.now() })); }
          else { reject(new Error("圧縮に失敗しました")); }
        }, "image/jpeg", quality);
      };
      img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
      img.src = event.target?.result as string;
    };
    reader.onerror = error => reject(error);
  });
};
// 💡 ステップ7適用: 全ての言語設定を追加（AIメッセージ等含む・修正版）
const localI18n: Record<string, any> = {
  "日本語": { feed: "Global", discover: "見つける", match: "マッチ", diary: "ダイアリー", chat: "チャット", profile: "プロフィール", searchPlaceholder: "楽曲やアーティストを検索...", settings: "設定", cancel: "キャンセル", postVibe: "記録する", audio: "プレビュー音", notifications: "通知", privateAcc: "非公開アカウント", timezone: "タイムゾーン", language: "言語", logout: "ログアウト", features: "機能", appInfo: "アプリについて", shareApp: "シェアする", rateApp: "評価する", help: "ヘルプ", editProfile: "編集", editProfileFull: "プロフィールを編集", artist: "歌手", topResults: "ヒット", allSongs: "全曲", latestRelease: "最新曲", popularSongs: "人気曲", popularAlbums: "アルバム", followers: "フォロワー", rewind: "振り返り", overwriteVibe: "上書き", alreadyPostedWarning: "投稿済みです。上書きしますか？", favoriteArtists: "お気に入り", postSuccess: "記録完了！", sendMessage: "送信", typeMessage: "入力...", vibeMatchAnalysis: "Vibe分析", topSharedArtists: "共通アーティスト", sharedGenres: "共通ジャンル", noPreview: "プレビューなし", pass: "スキップ", connect: "気になる", friendsChat: "フレンド", matchesChat: "マッチ", groupsChat: "グループ", communityChat: "ライブ", Friends: "フレンド", Groups: "グループ", CommunityJoined: "参加しました", CommunityLeft: "退会しました", JoinFailed: "参加処理に失敗しました", LeaveFailed: "退会処理に失敗しました", liveHistory: "参戦歴", hashtags: "ハッシュタグ", deleteAcc: "アカウント削除", deleteAccFull: "アカウントを完全に削除（退会）", admin: "通報管理", adminOnly: "Admin (運営専用)", adminDashboard: "通報管理ダッシュボード", musicSearch: "音楽を探す", follow: "フォロー", following: "フォロー中", block: "ブロックする", report: "通報する", myEchoes: "My Echoes", likedPosts: "いいねした投稿", aiStart: "まだ記録がありません。曲を記録すると、AIが好みを分析します。", aiRec: "などの傾向から、今のあなたにぴったりな3曲をピックアップしました。", aiAnalyzing: "分析中..." },
  "English": { feed: "Global", discover: "Discover", match: "Match", diary: "Diary", chat: "Chat", profile: "Profile", searchPlaceholder: "Search...", settings: "Settings", cancel: "Cancel", postVibe: "Post", audio: "Audio", notifications: "Notif", privateAcc: "Private", timezone: "Timezone", language: "Lang", logout: "Log Out", features: "Features", appInfo: "About", shareApp: "Share", rateApp: "Rate", help: "Help", editProfile: "Edit", editProfileFull: "Edit Profile", artist: "Artist", topResults: "Top", allSongs: "All", latestRelease: "New", popularSongs: "Hot", popularAlbums: "Albums", followers: "Followers", rewind: "Rewind", overwriteVibe: "Overwrite", alreadyPostedWarning: "Already posted. Overwrite?", favoriteArtists: "Favorites", postSuccess: "Success!", sendMessage: "Send", typeMessage: "Aa", vibeMatchAnalysis: "Analysis", topSharedArtists: "Shared Artists", sharedGenres: "Shared Genres", noPreview: "No audio", pass: "Skip", connect: "Like", friendsChat: "Friends", matchesChat: "Matches", groupsChat: "Groups", communityChat: "Lives", Friends: "Friends", Groups: "Groups", CommunityJoined: "Joined", CommunityLeft: "Left community", JoinFailed: "Could not join", LeaveFailed: "Could not leave", liveHistory: "History", hashtags: "Hashtags", deleteAcc: "Delete Account", deleteAccFull: "Delete Account Permanently", admin: "Admin", adminOnly: "Admin Only", adminDashboard: "Report Dashboard", musicSearch: "Search Music", follow: "Follow", following: "Following", block: "Block", report: "Report", myEchoes: "My Echoes", likedPosts: "Liked Posts", aiStart: "Start recording vibes to get AI recommendations.", aiRec: "inspired recommendations just for you.", aiAnalyzing: "Analyzing..." },
  "中文": { feed: "Global", discover: "发现", match: "匹配", diary: "日记", chat: "聊天", profile: "我的", searchPlaceholder: "搜索...", settings: "设置", cancel: "取消", postVibe: "记录", audio: "音频", notifications: "通知", privateAcc: "私密", timezone: "时区", language: "语言", logout: "登出", features: "功能", appInfo: "关于", shareApp: "分享", rateApp: "评价", help: "帮助", editProfile: "编辑", editProfileFull: "编辑个人资料", artist: "歌手", topResults: "最佳", allSongs: "所有", latestRelease: "最新", popularSongs: "热门", popularAlbums: "专辑", followers: "粉丝", rewind: "回顾", overwriteVibe: "覆盖", alreadyPostedWarning: "已记录。覆盖吗？", favoriteArtists: "喜欢", postSuccess: "成功！", sendMessage: "发送", typeMessage: "输入...", vibeMatchAnalysis: "分析", topSharedArtists: "共同歌手", sharedGenres: "共同类型", noPreview: "无试听", pass: "跳过", connect: "感兴趣", friendsChat: "好友", matchesChat: "匹配", groupsChat: "群组", communityChat: "社区", Friends: "好友", Groups: "群组", CommunityJoined: "已加入", CommunityLeft: "已退出", JoinFailed: "加入失败", LeaveFailed: "退出失败", liveHistory: "参战历史", hashtags: "标签", deleteAcc: "注销", deleteAccFull: "永久注销账号", admin: "管理员", adminOnly: "Admin (管理员专用)", adminDashboard: "举报管理面板", musicSearch: "搜索音乐", follow: "关注", following: "已关注", block: "拉黑", report: "举报", myEchoes: "我的记录", likedPosts: "赞过的帖子", aiStart: "开始记录以获取 AI 推荐。", aiRec: "风格的专属推荐。", aiAnalyzing: "分析中..." }
};

Object.assign(localI18n["日本語"], {
  feed: "フィード",
  read: "読む",
  global: "全体",
  people: "ユーザー",
  community: "コミュニティ",
  musicTags: "音楽タグ",
  suggestedFriends: "おすすめの友達",
  similarPeople: "好みが近い人",
  popularAccounts: "人気のアカウント",
  articles: "記事",
  trend: "トレンド",
  liked: "いいね",
  mine: "自分の記事",
  drafts: "下書き",
  emptyArticles: "記事がありません",
  emptyDrafts: "保存された下書きはありません",
  articleListDraftUntitled: "無題の下書き",
  articleListDraftNoContent: "本文がありません",
  articleListShare: "シェア",
  articleListEdit: "編集",
  articleListDelete: "削除",
  artistCommunities: "アーティストコミュニティ",
  searchUser: "ユーザーを検索...",
  searchLive: "ライブやコミュニティを検索...",
  searchFromCalendar: "カレンダーから探す",
  popularLiveCommunity: "人気のライブコミュニティ",
  createLiveIfNotFound: "見つからないライブを作成",
  communityMembersCount: "参加者 {count}人",
  communityRecentMembersCount: "今週 {count}人参加",
  communityRecentPostsCount: "今週 {count}投稿",
  communityJoinedCount: "{count}人が参加中",
  communityScheduledCount: "{count}人が参加予定",
  communityDatePerformances: "{date} の公演",
  communityDetailTitle: "コミュニティ詳細",
  artistCommunityName: "{artist} ファンコミュニティ",
  artistCommunityDescription: "{artist}が好きな人たちが集まる場所です",
  permanentFanCommunity: "常設ファンコミュニティ",
  viewCommunity: "コミュニティを見る",
  joinCommunityAction: "参加する",
  reportFalseLiveInfo: "このライブ情報を嘘として通報する",
  createLiveTitle: "新しくライブを作成",
  createLiveDescription: "探しているライブが見つからない場合、自分で作成して同行者や仲間を募集できます。",
  liveName: "ライブ名",
  liveNamePlaceholder: "例: Vaundy ARENA tour 2026",
  dateLabel: "日付",
  dateTbd: "日程未定",
  createAndJoinLive: "ライブを作成して参加する",
  officialLiveFetchFailed: "公式ライブの取得に失敗しました。標準データを表示します",
  customLiveFetchFailed: "ユーザー作成ライブの取得に失敗しました",
  findLive: "ライブを探す",
  selectYearMonth: "年月を選択",
  set: "決定",
  yearSuffix: "{year}年",
  monthSuffix: "{month}月",
  weekdaysShort: "日,月,火,水,木,金,土",
  eventCount: "{count}件",
  tapDateToViewLives: "日付をタップしてライブを確認",
  showAllDates: "すべての日程を表示",
  peopleFilterNotice: "好きな音楽・ライブ履歴が近い人を表示中",
  commonLiveReason: "共通ライブ: {label}",
  commonMusicReason: "共通: {label}",
  followUserPrompt: "プロフィールを見てフォローしてみよう",
  totalPostCount: "総投稿数: {count}件",
  suggestedFriendsEmptyFiltered: "選択したタグに合う友達候補がまだいません。",
  suggestedFriendsEmpty: "友達をフォローして、タイムラインを充実させましょう！",
  similarPeopleEmptyFiltered: "選択したタグに合う音楽仲間がまだいません。",
  similarPeopleEmpty: "音楽を記録して、好みの合う人を探しましょう！",
  popularAccountsEmptyFiltered: "選択したタグに合う人気アカウントがまだありません。",
  popularAccountsEmpty: "投稿が活発な公式ユーザーがここに表示されます。",
  clear: "クリア",
  Success: "成功しました",
  UpdateFailed: "保存に失敗しました",
  SystemError: "エラーが発生しました",
  Unauthorized: "ログインが必要です",
  ValidationError: "入力内容を確認してください",
  WeakPassword: "パスワードは8文字以上で、英字と数字を含めてください。",
  InvalidNameLength: "名前は1〜50文字で入力してください",
  InvalidHandleFormat: "ユーザーIDは3〜20文字の英数字とアンダーバーで入力してください",
  InsertFailed: "保存に失敗しました",
  DeleteFailed: "削除に失敗しました",
  UploadFailed: "アップロードに失敗しました",
  ProfileUpdated: "プロフィールを更新しました",
  PostSuccess: "投稿しました",
  SaveFailed: "保存に失敗しました",
  DeleteSuccess: "削除しました",
  PermissionDenied: "権限がありません",
  CommentTooLong: "コメントが長すぎます",
  DataFetchFailed: "データの取得に失敗しました",
  CaptionTooLong: "キャプションが長すぎます",
  LengthLimitExceeded: "文字数の上限を超えています",
  TextLimitExceeded: "テキストが長すぎます",
  TooManyFiles: "ファイル数が多すぎます",
  InvalidDateFormat: "日付の形式が正しくありません",
  InvalidCalendarDate: "存在しない日付です",
  DatabaseInsertFailed: "データの保存に失敗しました",
  MembershipSaveFailed: "参加情報の保存に失敗しました",
  ReportAlreadySubmitted: "すでに通報済みです",
  InvalidFileType: "このファイル形式は使えません",
  FileSizeLimitExceeded: "ファイルサイズが大きすぎます",
  Uploading: "アップロードしています...",
  AudioSizeLimitExceeded: "音声ファイルが大きすぎます",
  VoiceSendFailed: "音声の送信に失敗しました",
  UserSearchFailed: "ユーザー検索に失敗しました",
  SearchFailed: "検索に失敗しました",
  ArtistSearchFailed: "アーティスト検索に失敗しました",
  ArtistInfoFetchFailed: "アーティスト情報の取得に失敗しました",
  AlbumInfoFetchFailed: "アルバム情報の取得に失敗しました",
  AudioOff: "音声がオフです",
  FollowedUserToast: "{name}さんをフォローしました",
  FollowedToast: "フォローしました！",
  UnfollowedToast: "フォローを解除しました",
  MicrophonePermissionRequired: "マイクへのアクセスを許可してください",
  OperationFailed: "処理に失敗しました",
  ReportConfirm: "この内容を通報しますか？",
  DeleteConfirm: "本当に削除しますか？",
  adminDashboardDescriptionLine1: "3回以上通報され、非表示状態になっているコミュニティのリストです。",
  adminDashboardDescriptionLine2: "問題がなければ復旧、悪質な場合は削除してください。",
  adminReportCount: "通報 {count}件",
  adminParticipantsCount: "参加者: {count}人",
  adminDeletePermanently: "完全削除",
  adminRestoreSafe: "復旧 (安全)",
  adminNoReportedCommunities: "現在、通報されたコミュニティはありません",
  adminPeacefulState: "平和な状態です。",
  matchFilterArtistPlaceholder: "例: Tele, Vaundy",
  matchFilterTagLiveLabel: "ハッシュタグ / ライブ",
  matchFilterTagLivePlaceholder: "例: 邦ロック, VIVA LA ROCK",
  matchFilterTitle: "Vibeフィルター",
  matchFilterAgeRange: "年齢",
  matchFilterSex: "性別",
  matchFilterSexAll: "すべて",
  matchFilterSexMale: "男性",
  matchFilterSexFemale: "女性",
  matchFilterApply: "適用して探す",
  logoutConfirmTitle: "ログアウトしますか？",
  deleteAccountConfirmTitle: "本当に退会しますか？",
  deleteAccountWarningLine1: "この操作は取り消せません。",
  deleteAccountWarningLine2: "プロフィール、Vibe、メッセージなど、",
  deleteAccountWarningLine3: "すべてのデータが永久に削除されます。",
  deleteAccountAction: "退会する",
  feedShare: "シェア",
  feedDelete: "削除",
  feedLike: "いいね",
  feedComments: "コメント",
  feedPlayPreview: "プレビューを再生",
  feedStopPreview: "プレビューを停止",
  feedNoComments: "まだコメントはありません",
  feedCommentPlaceholder: "コメントを追加...",
  feedPostComment: "投稿",
  feedDeleteConfirm: "この投稿を削除しますか？",
  feedAllPostsLoaded: "すべての投稿を読み込みました",
  feedEmptyTitle: "まずは今聴いている1曲を記録しよう",
  feedEmptyBody: "曲名・アーティスト名で検索して、今日のVibeを残せます。",
  todayRecommendedSongs: "本日のおすすめ曲",
  similarSongReason: "記録に近い曲",
  feedRecommendationEmpty: "曲を記録すると、好みに近いおすすめがここに届きます。",
  feedPostSuccessTitle: "記録できました。似た音楽が好きな人を見つけに行こう",
  feedPostSuccessAction: "近い人を探す",
  songPostCaptionPlaceholder: "今の気分、思い出、誰に聴いてほしいかを書いてみよう",
  songPostOverrideConfirm: "今日はすでに投稿しています。\n上書きして記録しますか？",
  songPostOverwrite: "上書きする",
  songPostRecordAria: "{title}を記録する",
  aiRecommendationsEmpty: "もう少し曲を記録すると、あなたに合う曲を提案できます。",
  aiRecommendationsAnalyzingFromHistory: "過去の記録から、あなたにおすすめの曲を分析しています...",
  aiRecommendationsFromArtists: "{artists} などの傾向から、今のあなたにぴったりな3曲をピックアップしました。",
  popularSongsInJapan: "日本の人気曲",
  recommendedSongs: "おすすめ曲",
  matchPercentSuffix: "% マッチ",
  topArtists: "トップアーティスト",
  noUsersFound: "該当するユーザーはいません",
  notificationsEmpty: "新しい通知はありません",
  artistFavoriteCountPrefix: "お気に入り ",
  artistFavoriteCountSuffix: "人",
  FavoriteSaved: "お気に入りに追加しました",
  FavoriteRemoved: "お気に入りを解除しました",
  ArtistFavoritesSetupRequired: "お気に入り保存の準備がまだ完了していません",
  InvalidEmailFormat: "メールアドレスの形式が正しくありません",
  AuthFailed: "ログインに失敗しました",
  SignupFailed: "登録に失敗しました",
  EmailAlreadyInUse: "このメールアドレスはすでに登録されています",
  AuthSignupSuccessTitle: "メールを送信しました",
  AuthSignupSuccessBodyLine1: "{email} 宛に確認メールを送りました。",
  AuthSignupSuccessBodyLine2: "リンクをクリックしてログインしてください。",
  AuthBackToLoginScreen: "ログイン画面へ",
  AuthLoginHeading: "ログインして始める",
  AuthResetHeading: "パスワードを再設定",
  AuthSignupHeading: "新しいアカウントを作成",
  AuthEmailPlaceholder: "メールアドレス",
  AuthPasswordPlaceholder: "パスワード",
  AuthResetDescription: "登録済みのメールアドレスに、パスワード再設定用のリンクを送信します。",
  AuthSending: "送信中...",
  AuthSendResetEmail: "再設定メールを送信",
  AuthReturnToLoginPrompt: "ログイン画面に戻りますか？",
  AuthLoginButton: "ログイン",
  AuthProcessing: "処理中...",
  AuthForgotPassword: "パスワードを忘れた方",
  AuthNoAccountPrompt: "アカウントを持っていませんか？",
  AuthSignupButton: "新規登録",
  AuthAlreadyHaveAccountPrompt: "すでにアカウントをお持ちですか？",
  AuthCreateAccountButton: "登録する",
  AuthAgreementPrefix: "",
  AuthAgreementJoiner: "と",
  AuthAgreementSuffix: "に同意します。",
  AuthClose: "閉じる",
  TermsTitle: "利用規約",
  PrivacyPolicyTitle: "プライバシーポリシー",
  TermsContent: "第1条（適用）\n本規約は、ユーザーと本アプリ「Echoes」の利用に関わる一切の関係に適用されます。\n\n第2条（禁止事項）\nユーザーは、以下の行為をしてはなりません。\n・法令または公序良俗に違反する行為\n・著作権、商標権などの知的財産権を侵害する行為\n・他のユーザーや第三者を誹謗中傷する行為\n・スパム、宣伝、勧誘を目的とする行為\n\n第3条（免責事項）\n運営は、本アプリに起因してユーザーに生じたあらゆる損害について、一切の責任を負いません。\n\n第4条（規約の変更）\n運営は、必要と判断した場合には、いつでも本規約を変更することができるものとします。",
  PrivacyPolicyContent: "1. 取得する情報\n本アプリは、アカウント登録時のメールアドレス、プロフィール情報、投稿された文章や画像、音声を取得します。\n\n2. 利用目的\n取得した情報は、本サービスの提供、ユーザー間のコミュニケーションの円滑化、AIによるおすすめコンテンツの提示のために利用されます。\n\n3. 第三者提供\n本アプリは、法令に定めがある場合を除き、ユーザーの同意を得ることなく第三者に個人情報を提供することはありません。\n\n4. データの削除\nユーザーはアカウント設定から退会処理を行うことで、紐づくすべてのデータをシステムから完全に消去することができます。",
  ProfileCreationError: "プロフィールの作成に失敗しました",
  BioTooLong: "自己紹介は160文字以内で入力してください",
  ProfileSaved: "プロフィールを保存しました",
  MusicProfileRequired: "好きな音楽を1つ以上追加してください",
  MusicProfileSaved: "音楽プロフィールを保存しました",
  OnboardingPrompt: "好きな音楽を登録して、つながりやすくしましょう",
  TermsAgreementRequired: "利用規約とプライバシーポリシーへの同意が必要です",
  LoggingOut: "ログアウトしています...",
  DeletingAccount: "アカウントを削除しています",
  CopiedUrl: "URLをクリップボードにコピーしました。",
  BlockUserConfirm: "このユーザーをブロックしますか？\n（投稿やプロフィールがお互いに見えなくなります）",
  UserBlocked: "ユーザーをブロックしました",
  BlockFailed: "ブロックに失敗しました",
  UserUnblocked: "ブロックを解除しました",
  NetworkError: "通信エラーが発生しました",
  ReportUserConfirm: "このユーザーを通報しますか？\n（運営が内容を確認し、適切な対応を行います）",
  UserReported: "通報が完了しました。ご協力ありがとうございます。",
  ReportFailed: "通報に失敗しました",
  HelpSupportContent: "サポート窓口: echos.jpn@gmail.com\n\n24時間以内に担当者がお答えします。",
  AppInfoContent: "バージョン: 42.0.0\n\nEchoesは、音楽を通じて日々の記録を残す新しい形のSNSです。",
  ArticleImageUploading: "画像をアップロードしています...",
  ArticleImageUploadSuccess: "画像のアップロードが完了しました！",
  ArticleImageUploadFailed: "画像のアップロードに失敗しました",
  ArticleImageInserting: "画像を挿入しています...",
  ArticleImageInsertSuccess: "画像を挿入しました！",
  ArticleImageInsertFailed: "画像の挿入に失敗しました",
  ArticleAudioUploading: "音声ファイルをアップロードしています...",
  ArticleAudioInsertSuccess: "音声ファイルを挿入しました！",
  ArticleAudioInsertFailed: "音声の挿入に失敗しました",
  ArticleEnterUrl: "URLを入力してください",
  ArticleInvalidUrl: "URLが正しくありません",
  ArticleVoiceInserting: "録音した音声を挿入しています...",
  ArticleVoiceInsertSuccess: "音声を挿入しました！",
  ArticleFileUploading: "ファイルをアップロードしています...",
  ArticleFileInsertSuccess: "ファイルを挿入しました！",
  ArticleFileInsertFailed: "ファイルの挿入に失敗しました",
  ArticleTitleTooLong: "タイトルは100文字以内で入力してください",
  ArticleMissingPaywallSeparator: "有料エリアの区切りを挿入してください",
  ArticlePaywallSeparatorLabel: "ここから先は有料エリアです",
  ArticleInvalidPrice: "価格が不正です",
  ArticleDatabaseError: "記事の保存に失敗しました",
  ArticleStorageQuotaExceeded: "下書きの保存容量が不足しています",
  ArticleEmptyDraft: "保存できる内容がありません",
  ArticleDeletePermissionDenied: "他人の記事は削除できません",
  ArticleDeleteConfirm: "本当にこの記事を削除しますか？\n（この操作は取り消せません）",
  ArticleDeleteSuccess: "記事を削除しました！",
  ArticleDeleteServerFailed: "サーバーでの削除に失敗しました",
  ArticleDraftDeleteConfirm: "この下書きを削除しますか？",
  articleEditorSavedSuffix: "保存済",
  articleEditorSaveDraft: "下書き保存",
  articleEditorPublishSettings: "公開設定",
  articleEditorChangeCover: "表紙を変更",
  articleEditorAddCover: "表紙追加",
  articleEditorTitlePlaceholder: "タイトル",
  articleEditorBodyPlaceholder: "ご自由にお書きください。",
  articleEditorQuoteTextPlaceholder: "ここに引用文を入力...",
  articleEditorQuoteSourcePlaceholder: "出典を入力",
  articleEditorCharacterUnit: "文字",
  articleEditorBold: "太字",
  articleEditorStrikethrough: "取り消し線",
  articleEditorHeading: "見出し",
  articleEditorAlignment: "配置",
  articleEditorList: "リスト",
  articleEditorHeadingStandard: "指定なし（標準テキスト）",
  articleEditorHeadingLarge: "大見出し (H2)",
  articleEditorHeadingSmall: "小見出し (H3)",
  articleEditorAlignmentTitle: "文字の配置",
  articleEditorAlignLeft: "左寄せ",
  articleEditorAlignCenter: "中央寄せ",
  articleEditorAlignRight: "右寄せ",
  articleEditorListTitle: "リスト（箇条書き）",
  articleEditorBulletedList: "箇条書きリスト (・)",
  articleEditorNumberedList: "番号付きリスト (1. 2. 3.)",
  articleEditorElementMenuTitle: "要素の追加",
  articleEditorElementImage: "画像",
  articleEditorElementEmbed: "埋め込み",
  articleEditorElementFile: "ファイル",
  articleEditorElementToc: "目次",
  articleEditorElementQuote: "引用",
  articleEditorElementCode: "コード",
  articleEditorElementDivider: "区切り線",
  articleEditorElementPaidArea: "有料エリア",
  articleEditorElementInsertArticle: "記事を挿入",
  articleEditorElementAudioFile: "音声ファイル",
  articleEditorElementRecord: "録音",
  articleEditorTocGenerating: "目次を生成します",
  articleEditorCodePlaceholder: "ここからコードを入力...",
  articleEditorVoicePrompt: "ボタンをタップして録音してください",
  articleEditorDraftSavedTitle: "下書きを保存しました。",
  articleEditorDraftSavedBody: "読み直すと新たな発見があるかも？",
  articleEditorContinueEditing: "編集を続ける",
  articleEditorPastArticleEmpty: "過去の記事がありません",
  articleDetailPremiumUnlocked: "有料コンテンツをアンロックしました",
  articleDetailPremiumPreviewLine1: "ここに有料限定のテキストが入ります。ライブの裏話や、特別なセットリストの解説、個人的な音楽の考察などが読めるようになります。アーティストの活動を支援するために、ぜひコインを使って続きを読んでみてください。応援がクリエイターの力になります...",
  articleDetailPremiumPreviewLine2: "さらに深い音楽の話や、ここでしか見られない特別なコンテンツをお楽しみください。あなたのサポートが、次の素晴らしい作品を生み出す原動力となります。",
  articleDetailPremiumPreviewLine3: "Echoesで新しい音楽の発見を。",
  articleDetailPremiumLockedTitle: "この続きは有料コンテンツです",
  articleDetailArticlePrice: "記事の価格",
  articleDetailCurrentCoins: "現在の所持コイン",
  articleDetailUnlockArticle: "記事をアンロック",
  articleDetailSupportCreator: "クリエイターをサポート",
  articleDetailSupportCreatorDescriptionLine1: "この記事が気に入ったら、コインを贈って応援しよう！",
  articleDetailSupportCreatorDescriptionLine2: "あなたのサポートが次の作品の原動力になります。",
  articleDetailLikes: "いいね",
  articleDetailComments: "コメント",
  articleDetailCommentPlaceholder: "感想を書く...",
  articleDetailPostComment: "投稿",
  save: "保存",
  name: "名前",
  handle: "ユーザーID",
  bio: "自己紹介",
  hashtagsCommaSeparated: "ハッシュタグ (カンマ区切り)",
  liveHistoryCommaSeparated: "ライブ参戦履歴 (カンマ区切り)",
  hashtagExample: "例: 邦ロック, Vaundy",
  liveHistoryExample: "例: Tele 2026ツアー, VIVA LA ROCK",
  twitterLink: "X (旧Twitter) のリンク",
  instagramLink: "Instagram のリンク",
  urlExample: "例: https://x.com/username",
  instagramUrlExample: "例: https://instagram.com/username",
  paidCoin: "有償",
  freeCoin: "無償",
  creatorTools: "クリエイターツール",
  revenueDashboard: "収益ダッシュボード",
  availableRevenue: "引き出し可能な売上金",
  payoutEligiblePaidCoins: "換金対象: 有償 {coins} C (レート: 1C = 0.5円)",
  payoutSettings: "換金設定",
  payoutLastFailure: "前回の振込に失敗しました: {reason}",
  payoutDefaultFailureReason: "振込先情報を確認してください。",
  stripePayoutsReady: "Stripeの本人確認と振込先登録が完了しています。",
  stripePayoutsIncomplete: "Stripeの本人確認または振込先登録が未完了です。",
  stripePayoutsRequired: "換金にはStripeで本人確認と振込先登録が必要です。",
  stripeConnecting: "接続中...",
  payoutSetupContinue: "換金設定を続ける",
  payoutSetupStart: "換金設定を開始する",
  payoutRequesting: "申請中...",
  payoutRequestButton: "振込申請をする",
  payoutMinimum: "1,000円以上で引き出し可能",
  totalEarnedCoins: "累計獲得コイン (無償分含む)",
  revenueArticle: "記事",
  revenueGift: "ギフト",
  transactionHistory: "取引履歴",
  userFallback: "ユーザー",
  revenueGiftReceived: "サポートを受け取りました",
  revenueArticlePurchased: "記事が購入されました",
  coinUnit: "コイン",
  noRevenueData: "まだ収益データがありません",
  noRevenueDataDescription: "有料記事を公開するか、\nサポートを受けるとここに履歴が表示されます。",
  paymentSuccessToast: "決済が完了し、コインがチャージされました！ 🎉",
  paymentCanceledToast: "決済をキャンセルしました",
  stripeConnectReturnToast: "換金設定を確認しています",
  stripeConnectRefreshToast: "換金設定をもう一度開始してください",
  invalidCoinAmount: "コイン数が不正です",
  paymentInitFailed: "決済を開始できませんでした",
  stripeConnectStartFailed: "換金設定を開始できませんでした",
  payoutRequestSuccess: "¥{amount} の振込申請を受け付けました",
  payoutRequestFailed: "振込申請に失敗しました",
  invalidArticleInfo: "記事の情報が不正です",
  cannotPurchaseOwnArticle: "自分の記事は購入できません",
  insufficientCoins: "コインが不足しています",
  articlePurchaseSuccess: "記事を購入しました！",
  insufficientCoinsCharge: "コインが不足しています。チャージしてください。",
  articleGiftConfirm: "{amount}C を贈りますか？",
  creatorSupportSuccess: "クリエイターをサポートしました！",
  coinChargeTitle: "コインチャージ",
  paymentConfirmationTitle: "決済の確認",
  ownedCoins: "保有",
  coinPlanBonus: "{count}コインお得！",
  paymentAmount: "決済金額: ¥{amount}",
  stripeSecureNotice: "安全な決済システム（Stripe）へ移動します。クレジットカード情報は暗号化され、当アプリには一切保存されません。",
  goToCheckout: "決済画面へ進む",
  dayStreak: "{count}日連続記録中",
  mutualFriendsCount: "{count}人の共通の友達",
  vibeMatchDescription: "あなたと{name}さんの音楽の好みの分析結果です。",
  sharedArtistsDescription: "お互いにこれらのアーティストをよく聴いています！",
  sendVibeMatchMessage: "音楽の趣味が合うね！とメッセージを送る",
  searchUsers: "ユーザーを検索...",
  blockedUsers: "ブロックしたユーザー",
  noBlockedUsers: "ブロックしているユーザーはいません",
  unblock: "解除",
  mutualFriends: "共通の友達",
  close: "閉じる",
  onboardingTitle: "プロフィールを作りましょう",
  onboardingDescription: "名前と好きな音楽を登録すると、プロフィールとDiscoverのマッチングに反映されます。",
  profileSection: "プロフィール",
  musicTaste: "音楽の好み",
  favoriteGenres: "好きなジャンル",
  onboardingDefaultChoiceLabels: {
    "邦ロック": "邦ロック",
    "J-POP": "J-POP",
    "K-POP": "K-POP",
    "洋楽": "洋楽",
    "ヒップホップ": "ヒップホップ",
    "R&B": "R&B",
    "EDM": "EDM",
    "テクノ": "テクノ",
    "ジャズ": "ジャズ",
    "アニソン": "アニソン",
    "ボカロ": "ボカロ",
    "アイドル": "アイドル",
    "フェス勢": "フェス勢",
    "ライブ好き": "ライブ好き",
    "チルい曲": "チルい曲",
    "カラオケ好き": "カラオケ好き",
    "音楽友達募集": "音楽友達募集",
    "新譜チェック": "新譜チェック",
    "推し活": "推し活",
    "レコード好き": "レコード好き"
  },
  favoriteArtist: "好きなアーティスト",
  artistSearchPlaceholder: "アーティストを検索",
  artistDetailBackLabel: "アーティストページを戻る",
  artistTracksLoading: "曲を読み込んでいます...",
  viewArtistDetail: "アーティスト詳細を見る",
  favoriteArtistSearchLabel: "好きなアーティスト検索",
  searchingCandidates: "候補を検索しています",
  customHashtagPlaceholder: "自分でハッシュタグを追加",
  customLiveHistoryPlaceholder: "自分でライブ参戦歴を追加",
  add: "追加",
  later: "あとで",
  saveAndStart: "保存して始める",
  likedPostsEmpty: "まだ{label}はありません",
  articlePublishSettingsTitle: "公開設定",
  articlePublishPreview: "プレビュー",
  articlePublishUntitled: "無題の記事",
  articlePublishAsPremium: "有料記事として公開",
  articlePublishPremiumDividerHint: "※本文に有料エリアの区切り線が必要です",
  articlePublishSalePrice: "販売価格",
  articlePublishCoin: "コイン",
  articlePublishPosting: "投稿中...",
  articlePublishPostArticle: "この記事を投稿する",
  chatCreateGroup: "グループを作成",
  chatUserFallback: "ユーザー",
  chatVoiceMessage: "ボイスメッセージ",
  chatImageSent: "画像を送信しました",
  chatFileSent: "ファイルを送信しました",
  chatSendPrompt: "メッセージを送ろう",
  chatEmptyMessages: "メッセージはまだありません",
  chatGroupsSection: "グループ",
  chatJoined: "参加しました",
  chatArtistCommunities: "アーティストコミュニティ",
  chatLiveCommunities: "ライブコミュニティ",
  chatMembersCount: "参加者 {count}人",
  chatEmptyGroups: "参加中のグループはまだありません",
  chatCommunityFallback: "コミュニティ",
  chatGroupFallback: "グループチャット",
  chatBackAria: "戻る",
  chatDetailsAria: "詳細",
  chatFile: "ファイル",
  chatMusic: "音楽",
  chatVoicePrompt: "ボタンをタップして録音してください",
  chatMessagePlaceholder: "Aa",
  chatUnknownFile: "不明なファイル",
  chatFileSize: "サイズ: {size}",
  chatFileSizeUnknown: "サイズ情報なし",
  chatUnsend: "送信取消",
  chatUnsendConfirmTitle: "送信を取り消しますか？",
  chatUnsendConfirmDescriptionLine1: "相手の画面からもこのメッセージや写真が",
  chatUnsendConfirmDescriptionLine2: "完全に削除されます。",
  chatUnsendConfirmAction: "取り消す",
  chatRead: "既読",
  chatReadCount: "既読 {count}",
  chatConfirmMusic: "音楽を確認",
  chatShareMusic: "音楽をシェア",
  chatArtist: "アーティスト",
  chatAddMessage: "メッセージを追加...",
  chatMusicCommentPlaceholder: "この曲について話そう...",
  chatSendToChat: "チャットに送信",
  chatDetailsTitle: "詳細設定",
  chatMembers: "メンバー",
  chatAlbum: "アルバム",
  chatNotes: "ノート",
  chatNotificationsOff: "通知オフ",
  chatInvite: "招待",
  chatLeave: "退会",
  chatMedia: "写真・動画",
  chatEvents: "イベント",
  chatComingSoon: "近日公開予定です",
  chatInviteCopied: "招待リンクをコピーしました",
  chatInviteCopiedSuccess: "招待リンクをコピーしました！",
  chatInviteTitle: "Echoesに招待",
  chatInviteText: "グループ/ライブに参加しよう！",
  chatInviteFriend: "友だちを招待",
  chatMembersParticipants: "メンバー・参加者 ({count})",
  chatYou: "あなた",
  chatNoPhotos: "まだ写真はありません",
  chatNoFiles: "まだファイルはありません",
  chatOpenOriginalMessage: "元のメッセージへ",
  chatImageMissingUrl: "画像のURLが取得できませんでした",
  chatImageSaveFailed: "画像の保存に失敗しました",
  chatImageShareText: "Echoesの画像をシェアします",
  chatImageUrlCopySuccess: "画像のURLをコピーしました！",
  chatShare: "共有",
  chatUploading: "送信しています...",
  chatFileSending: "ファイルを送信しています...",
  chatFileSendFailed: "ファイルの送信に失敗しました",
  chatMessageSendFailed: "メッセージの送信に失敗しました",
  chatMessageUnsent: "送信を取り消しました",
  chatFileSizeLimitExceeded: "ファイルサイズが大きすぎます",
  chatGroupName: "グループ名",
  chatGroupNamePlaceholder: "例: VIVA LA ROCK 参戦組",
  chatSelectMembers: "メンバーを選択",
  chatCreateAction: "作成する",
  chatInvalidGroupName: "グループ名を確認してください",
  chatNoMembersSelected: "メンバーを選択してください",
  chatGroupCreationError: "グループの作成に失敗しました",
  chatMemberAdditionError: "メンバーの追加に失敗しました"
});

Object.assign(localI18n["English"], {
  feed: "Feed",
  read: "Read",
  global: "Global",
  people: "People",
  community: "Community",
  musicTags: "Music Tags",
  suggestedFriends: "Suggested Friends",
  similarPeople: "People With Similar Taste",
  popularAccounts: "Popular Accounts",
  articles: "Articles",
  trend: "Trend",
  liked: "Liked",
  mine: "Mine",
  drafts: "Drafts",
  emptyArticles: "No articles",
  emptyDrafts: "No saved drafts",
  articleListDraftUntitled: "Untitled draft",
  articleListDraftNoContent: "No content",
  articleListShare: "Share",
  articleListEdit: "Edit",
  articleListDelete: "Delete",
  artistCommunities: "Artist Communities",
  searchUser: "Search users...",
  searchLive: "Search lives or communities...",
  searchFromCalendar: "Search from calendar",
  popularLiveCommunity: "Popular Live Communities",
  createLiveIfNotFound: "Create a live if you cannot find it",
  communityMembersCount: "{count} members",
  communityRecentMembersCount: "{count} joined this week",
  communityRecentPostsCount: "{count} posts this week",
  communityJoinedCount: "{count} members joined",
  communityScheduledCount: "{count} planning to join",
  communityDatePerformances: "{date} performances",
  communityDetailTitle: "Community Detail",
  artistCommunityName: "{artist} Fan Community",
  artistCommunityDescription: "A place for people who love {artist}.",
  permanentFanCommunity: "Permanent fan community",
  viewCommunity: "View community",
  joinCommunityAction: "Join",
  reportFalseLiveInfo: "Report this live information as false",
  createLiveTitle: "Create a new live",
  createLiveDescription: "If you cannot find the live you are looking for, create it yourself to find companions and other fans.",
  liveName: "Live name",
  liveNamePlaceholder: "Example: Vaundy ARENA tour 2026",
  dateLabel: "Date",
  dateTbd: "Date TBD",
  createAndJoinLive: "Create live and join",
  officialLiveFetchFailed: "Could not load official lives. Showing default data.",
  customLiveFetchFailed: "Could not load user-created lives",
  findLive: "Find a live",
  selectYearMonth: "Select year and month",
  set: "Set",
  yearSuffix: "{year}",
  monthSuffix: "{month}",
  weekdaysShort: "Sun,Mon,Tue,Wed,Thu,Fri,Sat",
  eventCount: "{count}",
  tapDateToViewLives: "Tap a date to view lives",
  showAllDates: "Show all dates",
  peopleFilterNotice: "Showing people with similar music and live history",
  commonLiveReason: "Shared live: {label}",
  commonMusicReason: "Shared: {label}",
  followUserPrompt: "View their profile and follow them",
  totalPostCount: "Total posts: {count}",
  suggestedFriendsEmptyFiltered: "No friend suggestions match the selected tags yet.",
  suggestedFriendsEmpty: "Follow friends to make your timeline better.",
  similarPeopleEmptyFiltered: "No music friends match the selected tags yet.",
  similarPeopleEmpty: "Record music to find people with similar taste.",
  popularAccountsEmptyFiltered: "No popular accounts match the selected tags yet.",
  popularAccountsEmpty: "Active official users will appear here.",
  clear: "Clear",
  Success: "Success",
  UpdateFailed: "Failed to save",
  SystemError: "An error occurred",
  Unauthorized: "Login required",
  ValidationError: "Please check your input",
  InvalidNameLength: "Enter a name between 1 and 50 characters",
  InvalidHandleFormat: "Use 3-20 letters, numbers, or underscores for your handle",
  InsertFailed: "Failed to save",
  DeleteFailed: "Failed to delete",
  UploadFailed: "Upload failed",
  ProfileUpdated: "Profile updated",
  PostSuccess: "Posted",
  SaveFailed: "Failed to save",
  DeleteSuccess: "Deleted",
  PermissionDenied: "You do not have permission",
  CommentTooLong: "Comment is too long",
  DataFetchFailed: "Could not load data",
  CaptionTooLong: "Caption is too long",
  LengthLimitExceeded: "Text is too long",
  TextLimitExceeded: "Text is too long",
  TooManyFiles: "Too many files",
  InvalidDateFormat: "Invalid date format",
  InvalidCalendarDate: "Invalid date",
  DatabaseInsertFailed: "Could not save data",
  MembershipSaveFailed: "Could not save membership",
  ReportAlreadySubmitted: "Already reported",
  InvalidFileType: "File type not supported",
  FileSizeLimitExceeded: "File is too large",
  Uploading: "Uploading...",
  AudioSizeLimitExceeded: "Audio file is too large",
  VoiceSendFailed: "Could not send voice message",
  UserSearchFailed: "User search failed",
  SearchFailed: "Search failed",
  ArtistSearchFailed: "Artist search failed",
  ArtistInfoFetchFailed: "Could not load artist info",
  AlbumInfoFetchFailed: "Could not load album info",
  AudioOff: "Audio is off",
  FollowedUserToast: "Followed {name}",
  FollowedToast: "Followed!",
  UnfollowedToast: "Unfollowed",
  MicrophonePermissionRequired: "Please allow microphone access",
  OperationFailed: "Operation failed",
  ReportConfirm: "Report this content?",
  DeleteConfirm: "Delete this item?",
  adminDashboardDescriptionLine1: "Communities reported 3 or more times and currently hidden are listed here.",
  adminDashboardDescriptionLine2: "Restore them if there is no issue, or delete them if malicious.",
  adminReportCount: "{count} reports",
  adminParticipantsCount: "Participants: {count}",
  adminDeletePermanently: "Delete permanently",
  adminRestoreSafe: "Restore (safe)",
  adminNoReportedCommunities: "No reported communities right now",
  adminPeacefulState: "Everything is peaceful.",
  matchFilterArtistPlaceholder: "Example: Tele, Vaundy",
  matchFilterTagLiveLabel: "Hashtag / Live",
  matchFilterTagLivePlaceholder: "Example: J-rock, VIVA LA ROCK",
  matchFilterTitle: "Vibe Filter",
  matchFilterAgeRange: "Age range",
  matchFilterSex: "Gender",
  matchFilterSexAll: "All",
  matchFilterSexMale: "Male",
  matchFilterSexFemale: "Female",
  matchFilterApply: "Apply filters",
  logoutConfirmTitle: "Log out?",
  deleteAccountConfirmTitle: "Delete your account?",
  deleteAccountWarningLine1: "This action cannot be undone.",
  deleteAccountWarningLine2: "Your profile, Vibes, messages,",
  deleteAccountWarningLine3: "and all related data will be permanently deleted.",
  deleteAccountAction: "Delete account",
  feedShare: "Share",
  feedDelete: "Delete",
  feedLike: "Like",
  feedComments: "Comments",
  feedPlayPreview: "Play preview",
  feedStopPreview: "Stop preview",
  feedNoComments: "No comments yet",
  feedCommentPlaceholder: "Add a comment...",
  feedPostComment: "Post",
  feedDeleteConfirm: "Delete this post?",
  feedAllPostsLoaded: "All posts loaded",
  feedEmptyTitle: "Record the song you are listening to now",
  feedEmptyBody: "Search by song or artist and save today's Vibe.",
  todayRecommendedSongs: "Recommended Today",
  similarSongReason: "Close to your records",
  feedRecommendationEmpty: "Record songs to see recommendations close to your taste here.",
  feedPostSuccessTitle: "Recorded. Find people who like similar music.",
  feedPostSuccessAction: "Find similar people",
  songPostCaptionPlaceholder: "Write about your mood, memories, or who you want to hear this",
  songPostOverrideConfirm: "You already posted today.\nOverwrite and record this?",
  songPostOverwrite: "Overwrite",
  songPostRecordAria: "Record {title}",
  aiRecommendationsEmpty: "Record a few more songs to get recommendations for you.",
  aiRecommendationsAnalyzingFromHistory: "Analyzing your past records for songs you may like...",
  aiRecommendationsFromArtists: "Based on trends like {artists}, we picked 3 songs for you.",
  popularSongsInJapan: "Popular Songs in Japan",
  recommendedSongs: "Recommended Songs",
  matchPercentSuffix: "% match",
  topArtists: "Top artists",
  noUsersFound: "No users found",
  notificationsEmpty: "No new notifications",
  artistFavoriteCountPrefix: "",
  artistFavoriteCountSuffix: " Favorites",
  FavoriteSaved: "Added to favorites",
  FavoriteRemoved: "Removed from favorites",
  ArtistFavoritesSetupRequired: "Favorites storage is not ready yet",
  WeakPassword: "Use at least 8 characters with letters and numbers.",
  InvalidEmailFormat: "Please enter a valid email address",
  AuthFailed: "Login failed",
  SignupFailed: "Sign up failed",
  EmailAlreadyInUse: "This email address is already registered",
  AuthSignupSuccessTitle: "Email sent",
  AuthSignupSuccessBodyLine1: "We sent a confirmation email to {email}.",
  AuthSignupSuccessBodyLine2: "Click the link, then log in.",
  AuthBackToLoginScreen: "Back to login",
  AuthLoginHeading: "Log in to get started",
  AuthResetHeading: "Reset your password",
  AuthSignupHeading: "Create a new account",
  AuthEmailPlaceholder: "Email address",
  AuthPasswordPlaceholder: "Password",
  AuthResetDescription: "We will send a password reset link to your registered email address.",
  AuthSending: "Sending...",
  AuthSendResetEmail: "Send reset email",
  AuthReturnToLoginPrompt: "Back to the login screen?",
  AuthLoginButton: "Log in",
  AuthProcessing: "Processing...",
  AuthForgotPassword: "Forgot your password?",
  AuthNoAccountPrompt: "Don't have an account?",
  AuthSignupButton: "Sign up",
  AuthAlreadyHaveAccountPrompt: "Already have an account?",
  AuthCreateAccountButton: "Create account",
  AuthAgreementPrefix: "I agree to the ",
  AuthAgreementJoiner: " and ",
  AuthAgreementSuffix: ".",
  AuthClose: "Close",
  TermsTitle: "Terms of Service",
  PrivacyPolicyTitle: "Privacy Policy",
  TermsContent: "Article 1 (Application)\nThese terms apply to all relationships between users and the Echoes app.\n\nArticle 2 (Prohibited Acts)\nUsers must not engage in the following acts:\n- Acts that violate laws or public order and morals\n- Acts that infringe copyrights, trademarks, or other intellectual property rights\n- Acts that defame or harass other users or third parties\n- Acts for spam, advertising, or solicitation\n\nArticle 3 (Disclaimer)\nThe operator is not responsible for any damages incurred by users arising from this app.\n\nArticle 4 (Changes to Terms)\nThe operator may change these terms at any time when deemed necessary.",
  PrivacyPolicyContent: "1. Information We Collect\nThis app collects email addresses used for account registration, profile information, and posted text, images, and audio.\n\n2. Purpose of Use\nCollected information is used to provide the service, support communication between users, and present AI-powered recommendations.\n\n3. Third-Party Disclosure\nExcept as required by law, this app will not provide personal information to third parties without user consent.\n\n4. Data Deletion\nUsers can permanently delete all linked data from the system by deleting their account from account settings.",
  ProfileCreationError: "Failed to create profile",
  BioTooLong: "Bio must be 160 characters or less",
  ProfileSaved: "Profile saved",
  MusicProfileRequired: "Add at least one music preference",
  MusicProfileSaved: "Music profile saved",
  OnboardingPrompt: "Add your favorite music to help people connect with you",
  TermsAgreementRequired: "You need to agree to the Terms and Privacy Policy",
  LoggingOut: "Logging out...",
  DeletingAccount: "Deleting account",
  CopiedUrl: "Copied URL to clipboard.",
  BlockUserConfirm: "Block this user?\n(Your posts and profiles will be hidden from each other.)",
  UserBlocked: "User blocked",
  BlockFailed: "Could not block user",
  UserUnblocked: "User unblocked",
  NetworkError: "A network error occurred",
  ReportUserConfirm: "Report this user?\n(The team will review it and take appropriate action.)",
  UserReported: "Report submitted. Thank you for your help.",
  ReportFailed: "Could not submit report",
  HelpSupportContent: "Support: echos.jpn@gmail.com\n\nA team member will reply within 24 hours.",
  AppInfoContent: "Version: 42.0.0\n\nEchoes is a new social app for keeping daily music memories.",
  ArticleImageUploading: "Uploading image...",
  ArticleImageUploadSuccess: "Image upload complete!",
  ArticleImageUploadFailed: "Image upload failed",
  ArticleImageInserting: "Inserting image...",
  ArticleImageInsertSuccess: "Image inserted!",
  ArticleImageInsertFailed: "Could not insert image",
  ArticleAudioUploading: "Uploading audio file...",
  ArticleAudioInsertSuccess: "Audio file inserted!",
  ArticleAudioInsertFailed: "Could not insert audio",
  ArticleEnterUrl: "Enter URL",
  ArticleInvalidUrl: "Invalid URL",
  ArticleVoiceInserting: "Inserting recorded audio...",
  ArticleVoiceInsertSuccess: "Audio inserted!",
  ArticleFileUploading: "Uploading file...",
  ArticleFileInsertSuccess: "File inserted!",
  ArticleFileInsertFailed: "Could not insert file",
  ArticleTitleTooLong: "Title must be 100 characters or less",
  ArticleMissingPaywallSeparator: "Insert the paid-area separator",
  ArticlePaywallSeparatorLabel: "Paid area starts here",
  ArticleInvalidPrice: "Invalid price",
  ArticleDatabaseError: "Failed to save article",
  ArticleStorageQuotaExceeded: "Not enough storage for drafts",
  ArticleEmptyDraft: "There is nothing to save",
  ArticleDeletePermissionDenied: "You cannot delete someone else's article",
  ArticleDeleteConfirm: "Delete this article?\n(This cannot be undone.)",
  ArticleDeleteSuccess: "Article deleted!",
  ArticleDeleteServerFailed: "Failed to delete on the server",
  ArticleDraftDeleteConfirm: "Delete this draft?",
  articleEditorSavedSuffix: "saved",
  articleEditorSaveDraft: "Save draft",
  articleEditorPublishSettings: "Publish settings",
  articleEditorChangeCover: "Change cover",
  articleEditorAddCover: "Add cover",
  articleEditorTitlePlaceholder: "Title",
  articleEditorBodyPlaceholder: "Write freely.",
  articleEditorQuoteTextPlaceholder: "Enter quote...",
  articleEditorQuoteSourcePlaceholder: "Enter source",
  articleEditorCharacterUnit: " chars",
  articleEditorBold: "Bold",
  articleEditorStrikethrough: "Strikethrough",
  articleEditorHeading: "Heading",
  articleEditorAlignment: "Alignment",
  articleEditorList: "List",
  articleEditorHeadingStandard: "Normal text",
  articleEditorHeadingLarge: "Large heading (H2)",
  articleEditorHeadingSmall: "Small heading (H3)",
  articleEditorAlignmentTitle: "Text alignment",
  articleEditorAlignLeft: "Align left",
  articleEditorAlignCenter: "Align center",
  articleEditorAlignRight: "Align right",
  articleEditorListTitle: "Lists",
  articleEditorBulletedList: "Bulleted list",
  articleEditorNumberedList: "Numbered list (1. 2. 3.)",
  articleEditorElementMenuTitle: "Add element",
  articleEditorElementImage: "Image",
  articleEditorElementEmbed: "Embed",
  articleEditorElementFile: "File",
  articleEditorElementToc: "TOC",
  articleEditorElementQuote: "Quote",
  articleEditorElementCode: "Code",
  articleEditorElementDivider: "Divider",
  articleEditorElementPaidArea: "Paid area",
  articleEditorElementInsertArticle: "Insert article",
  articleEditorElementAudioFile: "Audio file",
  articleEditorElementRecord: "Record",
  articleEditorTocGenerating: "Generating table of contents",
  articleEditorCodePlaceholder: "Start typing code here...",
  articleEditorVoicePrompt: "Tap the button to record",
  articleEditorDraftSavedTitle: "Draft saved.",
  articleEditorDraftSavedBody: "You may notice something new when you read it again.",
  articleEditorContinueEditing: "Keep editing",
  articleEditorPastArticleEmpty: "No past articles",
  articleDetailPremiumUnlocked: "Premium content unlocked",
  articleDetailPremiumPreviewLine1: "Premium-only text will appear here. You can read behind-the-scenes live stories, special setlist notes, and personal music reflections. Use coins to keep reading and support the creator...",
  articleDetailPremiumPreviewLine2: "Enjoy deeper music stories and special content available only here. Your support helps make the next work possible.",
  articleDetailPremiumPreviewLine3: "Discover new music on Echoes.",
  articleDetailPremiumLockedTitle: "The rest is premium content",
  articleDetailArticlePrice: "Article price",
  articleDetailCurrentCoins: "Current coins",
  articleDetailUnlockArticle: "Unlock article",
  articleDetailSupportCreator: "Support the creator",
  articleDetailSupportCreatorDescriptionLine1: "If you enjoyed this article, send coins to show support.",
  articleDetailSupportCreatorDescriptionLine2: "Your support helps power the next work.",
  articleDetailLikes: "Likes",
  articleDetailComments: "Comments",
  articleDetailCommentPlaceholder: "Write a comment...",
  articleDetailPostComment: "Post",
  save: "Save",
  name: "Name",
  handle: "User ID",
  bio: "Bio",
  hashtagsCommaSeparated: "Hashtags (comma separated)",
  liveHistoryCommaSeparated: "Live history (comma separated)",
  hashtagExample: "Example: J-rock, Vaundy",
  liveHistoryExample: "Example: Tele 2026 Tour, VIVA LA ROCK",
  twitterLink: "X (formerly Twitter) link",
  instagramLink: "Instagram link",
  urlExample: "Example: https://x.com/username",
  instagramUrlExample: "Example: https://instagram.com/username",
  paidCoin: "Paid",
  freeCoin: "Free",
  creatorTools: "Creator tools",
  revenueDashboard: "Revenue dashboard",
  availableRevenue: "Available earnings",
  payoutEligiblePaidCoins: "Eligible paid coins: {coins} C (rate: 1 C = ¥0.5)",
  payoutSettings: "Payout setup",
  payoutLastFailure: "Previous payout failed: {reason}",
  payoutDefaultFailureReason: "Please check your payout information.",
  stripePayoutsReady: "Stripe identity verification and payout details are complete.",
  stripePayoutsIncomplete: "Stripe identity verification or payout details are incomplete.",
  stripePayoutsRequired: "Stripe identity verification and payout details are required for payouts.",
  stripeConnecting: "Connecting...",
  payoutSetupContinue: "Continue payout setup",
  payoutSetupStart: "Start payout setup",
  payoutRequesting: "Requesting...",
  payoutRequestButton: "Request payout",
  payoutMinimum: "Available from ¥1,000",
  totalEarnedCoins: "Total earned coins (including free coins)",
  revenueArticle: "Articles",
  revenueGift: "Gifts",
  transactionHistory: "Transaction history",
  userFallback: "User",
  revenueGiftReceived: "Support received",
  revenueArticlePurchased: "Article purchased",
  coinUnit: "Coins",
  noRevenueData: "No revenue data yet",
  noRevenueDataDescription: "Publish a paid article or receive support,\nand your history will appear here.",
  paymentSuccessToast: "Payment complete. Coins have been charged! 🎉",
  paymentCanceledToast: "Payment canceled",
  stripeConnectReturnToast: "Checking payout setup",
  stripeConnectRefreshToast: "Please restart payout setup",
  invalidCoinAmount: "Invalid coin amount",
  paymentInitFailed: "Could not start payment",
  stripeConnectStartFailed: "Could not start payout setup",
  payoutRequestSuccess: "Payout request for ¥{amount} has been received",
  payoutRequestFailed: "Payout request failed",
  invalidArticleInfo: "Invalid article information",
  cannotPurchaseOwnArticle: "You cannot purchase your own article",
  insufficientCoins: "Not enough coins",
  articlePurchaseSuccess: "Article purchased!",
  insufficientCoinsCharge: "Not enough coins. Please charge coins.",
  articleGiftConfirm: "Send {amount}C?",
  creatorSupportSuccess: "Creator supported!",
  coinChargeTitle: "Charge coins",
  paymentConfirmationTitle: "Payment confirmation",
  ownedCoins: "Owned",
  coinPlanBonus: "{count} bonus coins!",
  paymentAmount: "Payment amount: ¥{amount}",
  stripeSecureNotice: "You will be redirected to Stripe's secure payment system. Credit card information is encrypted and is never stored in this app.",
  goToCheckout: "Go to checkout",
  dayStreak: "{count}-day streak",
  mutualFriendsCount: "{count} mutual friends",
  vibeMatchDescription: "This is an analysis of your music taste match with {name}.",
  sharedArtistsDescription: "You both listen to these artists often.",
  sendVibeMatchMessage: "Send a message about your shared music taste",
  searchUsers: "Search users...",
  blockedUsers: "Blocked users",
  noBlockedUsers: "No blocked users",
  unblock: "Unblock",
  mutualFriends: "Mutual friends",
  close: "Close",
  onboardingTitle: "Create your profile",
  onboardingDescription: "Add your name and favorite music to improve your profile and Discover matches.",
  profileSection: "Profile",
  musicTaste: "Music taste",
  favoriteGenres: "Favorite genres",
  onboardingDefaultChoiceLabels: {
    "邦ロック": "Japanese rock",
    "J-POP": "J-POP",
    "K-POP": "K-POP",
    "洋楽": "Western music",
    "ヒップホップ": "Hip-hop",
    "R&B": "R&B",
    "EDM": "EDM",
    "テクノ": "Techno",
    "ジャズ": "Jazz",
    "アニソン": "Anime songs",
    "ボカロ": "Vocaloid",
    "アイドル": "Idol pop",
    "フェス勢": "Festival-goer",
    "ライブ好き": "Live music fan",
    "チルい曲": "Chill songs",
    "カラオケ好き": "Karaoke fan",
    "音楽友達募集": "Looking for music friends",
    "新譜チェック": "New release watcher",
    "推し活": "Fan activity",
    "レコード好き": "Record lover"
  },
  favoriteArtist: "Favorite artist",
  artistSearchPlaceholder: "Search artists",
  artistDetailBackLabel: "Back from artist page",
  artistTracksLoading: "Loading tracks...",
  viewArtistDetail: "View artist details",
  favoriteArtistSearchLabel: "Favorite artist search",
  searchingCandidates: "Searching suggestions",
  customHashtagPlaceholder: "Add your own hashtag",
  customLiveHistoryPlaceholder: "Add your own live history",
  add: "Add",
  later: "Later",
  saveAndStart: "Save and start",
  likedPostsEmpty: "No {label} yet",
  articlePublishSettingsTitle: "Publish Settings",
  articlePublishPreview: "Preview",
  articlePublishUntitled: "Untitled article",
  articlePublishAsPremium: "Publish as premium",
  articlePublishPremiumDividerHint: "A paid-area divider is required in the body.",
  articlePublishSalePrice: "Sale price",
  articlePublishCoin: "Coins",
  articlePublishPosting: "Posting...",
  articlePublishPostArticle: "Post this article",
  chatCreateGroup: "Create group",
  chatUserFallback: "User",
  chatVoiceMessage: "Voice message",
  chatImageSent: "Sent an image",
  chatFileSent: "Sent a file",
  chatSendPrompt: "Send a message",
  chatEmptyMessages: "No messages yet",
  chatGroupsSection: "Groups",
  chatJoined: "Joined",
  chatArtistCommunities: "Artist communities",
  chatLiveCommunities: "Live communities",
  chatMembersCount: "{count} members",
  chatEmptyGroups: "No groups joined yet",
  chatCommunityFallback: "Community",
  chatGroupFallback: "Group chat",
  chatBackAria: "Back",
  chatDetailsAria: "Details",
  chatFile: "File",
  chatMusic: "Music",
  chatVoicePrompt: "Tap the button to record",
  chatMessagePlaceholder: "Aa",
  chatUnknownFile: "Unknown file",
  chatFileSize: "Size: {size}",
  chatFileSizeUnknown: "Size unknown",
  chatUnsend: "Unsend",
  chatUnsendConfirmTitle: "Unsend this message?",
  chatUnsendConfirmDescriptionLine1: "This message or photo will also be",
  chatUnsendConfirmDescriptionLine2: "deleted from the other person's screen.",
  chatUnsendConfirmAction: "Unsend",
  chatRead: "Read",
  chatReadCount: "Read {count}",
  chatConfirmMusic: "Confirm music",
  chatShareMusic: "Share music",
  chatArtist: "Artist",
  chatAddMessage: "Add a message...",
  chatMusicCommentPlaceholder: "Talk about this song...",
  chatSendToChat: "Send to chat",
  chatDetailsTitle: "Details",
  chatMembers: "Members",
  chatAlbum: "Album",
  chatNotes: "Notes",
  chatNotificationsOff: "Mute",
  chatInvite: "Invite",
  chatLeave: "Leave",
  chatMedia: "Photos & videos",
  chatEvents: "Events",
  chatComingSoon: "Coming soon",
  chatInviteCopied: "Invite link copied",
  chatInviteCopiedSuccess: "Invite link copied!",
  chatInviteTitle: "Invite to Echoes",
  chatInviteText: "Join this group/live!",
  chatInviteFriend: "Invite friends",
  chatMembersParticipants: "Members / participants ({count})",
  chatYou: "You",
  chatNoPhotos: "No photos yet",
  chatNoFiles: "No files yet",
  chatOpenOriginalMessage: "Go to original message",
  chatImageMissingUrl: "Could not get the image URL",
  chatImageSaveFailed: "Could not save image",
  chatImageShareText: "Sharing an image from Echoes",
  chatImageUrlCopySuccess: "Image URL copied!",
  chatShare: "Share",
  chatUploading: "Sending...",
  chatFileSending: "Sending file...",
  chatFileSendFailed: "Could not send file",
  chatMessageSendFailed: "Could not send message",
  chatMessageUnsent: "Message unsent",
  chatFileSizeLimitExceeded: "File size is too large",
  chatGroupName: "Group name",
  chatGroupNamePlaceholder: "Example: VIVA LA ROCK crew",
  chatSelectMembers: "Select members",
  chatCreateAction: "Create",
  chatInvalidGroupName: "Check the group name",
  chatNoMembersSelected: "Select at least one member",
  chatGroupCreationError: "Could not create group",
  chatMemberAdditionError: "Could not add members"
});

Object.assign(localI18n["中文"], {
  feed: "动态",
  read: "阅读",
  global: "全部",
  people: "用户",
  community: "社区",
  musicTags: "音乐标签",
  suggestedFriends: "推荐好友",
  similarPeople: "兴趣相近的人",
  popularAccounts: "热门账号",
  articles: "文章",
  trend: "趋势",
  liked: "已赞",
  mine: "我的文章",
  drafts: "草稿",
  emptyArticles: "暂无文章",
  emptyDrafts: "暂无保存的草稿",
  articleListDraftUntitled: "无标题草稿",
  articleListDraftNoContent: "暂无正文",
  articleListShare: "分享",
  articleListEdit: "编辑",
  articleListDelete: "删除",
  artistCommunities: "艺人社区",
  searchUser: "搜索用户...",
  searchLive: "搜索现场或社区...",
  searchFromCalendar: "从日历搜索",
  popularLiveCommunity: "热门现场社区",
  createLiveIfNotFound: "创建找不到的现场",
  communityMembersCount: "{count}人参加",
  communityRecentMembersCount: "本周 {count}人加入",
  communityRecentPostsCount: "本周 {count}条投稿",
  communityJoinedCount: "{count}人参加中",
  communityScheduledCount: "{count}人计划参加",
  communityDatePerformances: "{date} 的演出",
  communityDetailTitle: "社区详情",
  artistCommunityName: "{artist} 粉丝社区",
  artistCommunityDescription: "这里聚集了喜欢 {artist} 的人。",
  permanentFanCommunity: "常设粉丝社区",
  viewCommunity: "查看社区",
  joinCommunityAction: "参加",
  reportFalseLiveInfo: "举报此现场信息为虚假",
  createLiveTitle: "创建新的现场",
  createLiveDescription: "如果找不到想找的现场，可以自己创建并募集同行者或伙伴。",
  liveName: "现场名称",
  liveNamePlaceholder: "例: Vaundy ARENA tour 2026",
  dateLabel: "日期",
  dateTbd: "日期未定",
  createAndJoinLive: "创建现场并参加",
  officialLiveFetchFailed: "官方现场获取失败。将显示默认数据",
  customLiveFetchFailed: "用户创建的现场获取失败",
  findLive: "搜索现场",
  selectYearMonth: "选择年月",
  set: "确定",
  yearSuffix: "{year}年",
  monthSuffix: "{month}月",
  weekdaysShort: "日,一,二,三,四,五,六",
  eventCount: "{count}条",
  tapDateToViewLives: "点击日期查看现场",
  showAllDates: "显示所有日期",
  peopleFilterNotice: "正在显示音乐喜好和现场记录相近的人",
  commonLiveReason: "共同现场: {label}",
  commonMusicReason: "共同: {label}",
  followUserPrompt: "查看个人资料并关注吧",
  totalPostCount: "总投稿数: {count}",
  suggestedFriendsEmptyFiltered: "还没有符合所选标签的好友推荐。",
  suggestedFriendsEmpty: "关注好友，让时间线更丰富吧！",
  similarPeopleEmptyFiltered: "还没有符合所选标签的音乐伙伴。",
  similarPeopleEmpty: "记录音乐，寻找喜好相近的人吧！",
  popularAccountsEmptyFiltered: "还没有符合所选标签的热门账号。",
  popularAccountsEmpty: "活跃的官方用户会显示在这里。",
  clear: "清除",
  Success: "成功",
  UpdateFailed: "保存失败",
  SystemError: "发生错误",
  Unauthorized: "需要登录",
  ValidationError: "请检查输入内容",
  InvalidNameLength: "请输入1到50个字符的名称",
  InvalidHandleFormat: "用户ID需为3到20位字母、数字或下划线",
  InsertFailed: "保存失败",
  DeleteFailed: "删除失败",
  UploadFailed: "上传失败",
  ProfileUpdated: "个人资料已更新",
  PostSuccess: "已发布",
  SaveFailed: "保存失败",
  DeleteSuccess: "已删除",
  PermissionDenied: "没有操作权限",
  CommentTooLong: "评论过长",
  DataFetchFailed: "数据获取失败",
  CaptionTooLong: "说明文字过长",
  LengthLimitExceeded: "文字过长",
  TextLimitExceeded: "文本过长",
  TooManyFiles: "文件数量过多",
  InvalidDateFormat: "日期格式无效",
  InvalidCalendarDate: "日期无效",
  DatabaseInsertFailed: "数据保存失败",
  MembershipSaveFailed: "参加信息保存失败",
  ReportAlreadySubmitted: "已举报过",
  InvalidFileType: "不支持此文件类型",
  FileSizeLimitExceeded: "文件过大",
  Uploading: "上传中...",
  AudioSizeLimitExceeded: "音频文件过大",
  VoiceSendFailed: "语音发送失败",
  UserSearchFailed: "用户搜索失败",
  SearchFailed: "搜索失败",
  ArtistSearchFailed: "艺人搜索失败",
  ArtistInfoFetchFailed: "艺人信息获取失败",
  AlbumInfoFetchFailed: "专辑信息获取失败",
  AudioOff: "音频已关闭",
  FollowedUserToast: "已关注{name}",
  FollowedToast: "已关注！",
  UnfollowedToast: "已取消关注",
  MicrophonePermissionRequired: "请允许麦克风访问",
  OperationFailed: "操作失败",
  ReportConfirm: "要举报此内容吗？",
  DeleteConfirm: "确定要删除吗？",
  adminDashboardDescriptionLine1: "这里列出被举报3次以上并已隐藏的社区。",
  adminDashboardDescriptionLine2: "如无问题可恢复，恶意内容请删除。",
  adminReportCount: "举报 {count}件",
  adminParticipantsCount: "参与者: {count}人",
  adminDeletePermanently: "彻底删除",
  adminRestoreSafe: "恢复（安全）",
  adminNoReportedCommunities: "当前没有被举报的社区",
  adminPeacefulState: "目前状态平稳。",
  matchFilterArtistPlaceholder: "例: Tele, Vaundy",
  matchFilterTagLiveLabel: "标签 / 现场",
  matchFilterTagLivePlaceholder: "例: 日摇, VIVA LA ROCK",
  matchFilterTitle: "Vibe 筛选",
  matchFilterAgeRange: "年龄范围",
  matchFilterSex: "性别",
  matchFilterSexAll: "全部",
  matchFilterSexMale: "男性",
  matchFilterSexFemale: "女性",
  matchFilterApply: "应用并搜索",
  logoutConfirmTitle: "要退出登录吗？",
  deleteAccountConfirmTitle: "确定要注销账号吗？",
  deleteAccountWarningLine1: "此操作无法撤销。",
  deleteAccountWarningLine2: "个人资料、Vibe、消息等",
  deleteAccountWarningLine3: "所有数据都将被永久删除。",
  deleteAccountAction: "注销账号",
  feedShare: "分享",
  feedDelete: "删除",
  feedLike: "点赞",
  feedComments: "评论",
  feedPlayPreview: "播放试听",
  feedStopPreview: "停止试听",
  feedNoComments: "暂无评论",
  feedCommentPlaceholder: "添加评论...",
  feedPostComment: "发布",
  feedDeleteConfirm: "要删除这条投稿吗？",
  feedAllPostsLoaded: "已加载全部投稿",
  feedEmptyTitle: "先记录一首正在听的歌吧",
  feedEmptyBody: "搜索歌曲名或艺人名，留下今天的 Vibe。",
  todayRecommendedSongs: "今日推荐歌曲",
  similarSongReason: "接近你的记录",
  feedRecommendationEmpty: "记录歌曲后，与你喜好相近的推荐会显示在这里。",
  feedPostSuccessTitle: "已记录。去发现喜欢相似音乐的人吧",
  feedPostSuccessAction: "寻找相近的人",
  songPostCaptionPlaceholder: "写下现在的心情、回忆，或想推荐给谁听",
  songPostOverrideConfirm: "今天已经投稿了。\n要覆盖并记录吗？",
  songPostOverwrite: "覆盖",
  songPostRecordAria: "记录{title}",
  aiRecommendationsEmpty: "再记录几首歌后，就能为你推荐合适的歌曲。",
  aiRecommendationsAnalyzingFromHistory: "正在根据过去的记录分析适合你的歌曲...",
  aiRecommendationsFromArtists: "根据 {artists} 等倾向，为你精选了3首歌曲。",
  popularSongsInJapan: "日本热门歌曲",
  recommendedSongs: "推荐歌曲",
  matchPercentSuffix: "% 匹配",
  topArtists: "热门艺人",
  noUsersFound: "未找到用户",
  notificationsEmpty: "暂无新通知",
  artistFavoriteCountPrefix: "",
  artistFavoriteCountSuffix: "人收藏",
  FavoriteSaved: "已加入收藏",
  FavoriteRemoved: "已取消收藏",
  ArtistFavoritesSetupRequired: "收藏保存尚未准备好",
  WeakPassword: "密码需至少8个字符，并包含字母和数字。",
  InvalidEmailFormat: "请输入有效的邮箱地址",
  AuthFailed: "登录失败",
  SignupFailed: "注册失败",
  EmailAlreadyInUse: "该邮箱地址已被注册",
  AuthSignupSuccessTitle: "邮件已发送",
  AuthSignupSuccessBodyLine1: "已向 {email} 发送确认邮件。",
  AuthSignupSuccessBodyLine2: "请点击链接后登录。",
  AuthBackToLoginScreen: "返回登录页面",
  AuthLoginHeading: "登录后开始使用",
  AuthResetHeading: "重置密码",
  AuthSignupHeading: "创建新账号",
  AuthEmailPlaceholder: "邮箱地址",
  AuthPasswordPlaceholder: "密码",
  AuthResetDescription: "我们会向已注册的邮箱地址发送密码重置链接。",
  AuthSending: "发送中...",
  AuthSendResetEmail: "发送重置邮件",
  AuthReturnToLoginPrompt: "返回登录页面吗？",
  AuthLoginButton: "登录",
  AuthProcessing: "处理中...",
  AuthForgotPassword: "忘记密码？",
  AuthNoAccountPrompt: "还没有账号？",
  AuthSignupButton: "注册",
  AuthAlreadyHaveAccountPrompt: "已经有账号？",
  AuthCreateAccountButton: "创建账号",
  AuthAgreementPrefix: "我同意",
  AuthAgreementJoiner: "和",
  AuthAgreementSuffix: "。",
  AuthClose: "关闭",
  TermsTitle: "服务条款",
  PrivacyPolicyTitle: "隐私政策",
  TermsContent: "第1条（适用）\n本条款适用于用户与本应用 Echoes 使用相关的一切关系。\n\n第2条（禁止事项）\n用户不得进行以下行为：\n・违反法律法规或公序良俗的行为\n・侵犯著作权、商标权等知识产权的行为\n・诽谤中伤其他用户或第三方的行为\n・以垃圾信息、宣传或招揽为目的的行为\n\n第3条（免责声明）\n运营方不对用户因本应用产生的任何损害承担责任。\n\n第4条（条款变更）\n运营方在认为必要时，可以随时变更本条款。",
  PrivacyPolicyContent: "1. 收集的信息\n本应用会收集账号注册时的邮箱地址、个人资料信息，以及发布的文字、图片和音频。\n\n2. 使用目的\n收集的信息将用于提供本服务、促进用户之间的沟通，以及通过 AI 提供推荐内容。\n\n3. 向第三方提供\n除法律法规规定的情况外，本应用不会在未经用户同意的情况下向第三方提供个人信息。\n\n4. 数据删除\n用户可以通过账号设置办理注销，从系统中永久删除关联的全部数据。",
  ProfileCreationError: "个人资料创建失败",
  BioTooLong: "个人简介请控制在160个字符以内",
  ProfileSaved: "个人资料已保存",
  MusicProfileRequired: "请至少添加一个喜欢的音乐偏好",
  MusicProfileSaved: "音乐资料已保存",
  OnboardingPrompt: "添加你喜欢的音乐，让大家更容易与你连接",
  TermsAgreementRequired: "需要同意服务条款和隐私政策",
  LoggingOut: "正在退出登录...",
  DeletingAccount: "正在删除账号",
  CopiedUrl: "已复制URL到剪贴板。",
  BlockUserConfirm: "要拉黑此用户吗？\n（你们将无法互相看到帖子和个人资料。）",
  UserBlocked: "已拉黑用户",
  BlockFailed: "拉黑失败",
  UserUnblocked: "已解除拉黑",
  NetworkError: "发生网络错误",
  ReportUserConfirm: "要举报此用户吗？\n（运营团队会审核内容并采取适当处理。）",
  UserReported: "举报已提交。感谢你的协助。",
  ReportFailed: "举报提交失败",
  HelpSupportContent: "客服邮箱: echos.jpn@gmail.com\n\n工作人员会在24小时内回复。",
  AppInfoContent: "版本: 42.0.0\n\nEchoes 是一款通过音乐记录日常的新型社交应用。",
  ArticleImageUploading: "正在上传图片...",
  ArticleImageUploadSuccess: "图片上传完成！",
  ArticleImageUploadFailed: "图片上传失败",
  ArticleImageInserting: "正在插入图片...",
  ArticleImageInsertSuccess: "图片已插入！",
  ArticleImageInsertFailed: "图片插入失败",
  ArticleAudioUploading: "正在上传音频文件...",
  ArticleAudioInsertSuccess: "音频文件已插入！",
  ArticleAudioInsertFailed: "音频插入失败",
  ArticleEnterUrl: "请输入URL",
  ArticleInvalidUrl: "URL无效",
  ArticleVoiceInserting: "正在插入录制的音频...",
  ArticleVoiceInsertSuccess: "音频已插入！",
  ArticleFileUploading: "正在上传文件...",
  ArticleFileInsertSuccess: "文件已插入！",
  ArticleFileInsertFailed: "文件插入失败",
  ArticleTitleTooLong: "标题请控制在100个字符以内",
  ArticleMissingPaywallSeparator: "请插入付费区域分隔线",
  ArticlePaywallSeparatorLabel: "以下为付费区域",
  ArticleInvalidPrice: "价格无效",
  ArticleDatabaseError: "文章保存失败",
  ArticleStorageQuotaExceeded: "草稿保存空间不足",
  ArticleEmptyDraft: "没有可保存的内容",
  ArticleDeletePermissionDenied: "无法删除他人的文章",
  ArticleDeleteConfirm: "确定要删除这篇文章吗？\n（此操作无法撤销）",
  ArticleDeleteSuccess: "文章已删除！",
  ArticleDeleteServerFailed: "服务器删除失败",
  ArticleDraftDeleteConfirm: "要删除这个草稿吗？",
  articleEditorSavedSuffix: "已保存",
  articleEditorSaveDraft: "保存草稿",
  articleEditorPublishSettings: "发布设置",
  articleEditorChangeCover: "更换封面",
  articleEditorAddCover: "添加封面",
  articleEditorTitlePlaceholder: "标题",
  articleEditorBodyPlaceholder: "请自由书写。",
  articleEditorQuoteTextPlaceholder: "在此输入引用...",
  articleEditorQuoteSourcePlaceholder: "输入出处",
  articleEditorCharacterUnit: "字",
  articleEditorBold: "粗体",
  articleEditorStrikethrough: "删除线",
  articleEditorHeading: "标题",
  articleEditorAlignment: "对齐",
  articleEditorList: "列表",
  articleEditorHeadingStandard: "无指定（标准文本）",
  articleEditorHeadingLarge: "大标题 (H2)",
  articleEditorHeadingSmall: "小标题 (H3)",
  articleEditorAlignmentTitle: "文字对齐",
  articleEditorAlignLeft: "左对齐",
  articleEditorAlignCenter: "居中",
  articleEditorAlignRight: "右对齐",
  articleEditorListTitle: "列表（项目符号）",
  articleEditorBulletedList: "项目符号列表",
  articleEditorNumberedList: "编号列表 (1. 2. 3.)",
  articleEditorElementMenuTitle: "添加元素",
  articleEditorElementImage: "图片",
  articleEditorElementEmbed: "嵌入",
  articleEditorElementFile: "文件",
  articleEditorElementToc: "目录",
  articleEditorElementQuote: "引用",
  articleEditorElementCode: "代码",
  articleEditorElementDivider: "分隔线",
  articleEditorElementPaidArea: "付费区域",
  articleEditorElementInsertArticle: "插入文章",
  articleEditorElementAudioFile: "音频文件",
  articleEditorElementRecord: "录音",
  articleEditorTocGenerating: "正在生成目录",
  articleEditorCodePlaceholder: "从这里输入代码...",
  articleEditorVoicePrompt: "点击按钮开始录音",
  articleEditorDraftSavedTitle: "草稿已保存。",
  articleEditorDraftSavedBody: "重新阅读时也许会有新的发现。",
  articleEditorContinueEditing: "继续编辑",
  articleEditorPastArticleEmpty: "暂无过往文章",
  articleDetailPremiumUnlocked: "已解锁付费内容",
  articleDetailPremiumPreviewLine1: "这里会显示付费限定内容。你可以阅读演出幕后故事、特别歌单解说以及个人音乐思考。使用金币继续阅读，也是在支持创作者...",
  articleDetailPremiumPreviewLine2: "享受更深入的音乐故事和仅在这里可见的特别内容。你的支持会成为创作下一部作品的动力。",
  articleDetailPremiumPreviewLine3: "在 Echoes 发现新的音乐。",
  articleDetailPremiumLockedTitle: "后续内容为付费内容",
  articleDetailArticlePrice: "文章价格",
  articleDetailCurrentCoins: "当前持有金币",
  articleDetailUnlockArticle: "解锁文章",
  articleDetailSupportCreator: "支持创作者",
  articleDetailSupportCreatorDescriptionLine1: "如果喜欢这篇文章，就赠送金币支持吧！",
  articleDetailSupportCreatorDescriptionLine2: "你的支持会成为下一部作品的动力。",
  articleDetailLikes: "赞",
  articleDetailComments: "评论",
  articleDetailCommentPlaceholder: "写下感想...",
  articleDetailPostComment: "发布",
  save: "保存",
  name: "名称",
  handle: "用户ID",
  bio: "个人简介",
  hashtagsCommaSeparated: "标签（用逗号分隔）",
  liveHistoryCommaSeparated: "现场参战记录（用逗号分隔）",
  hashtagExample: "例：日摇, Vaundy",
  liveHistoryExample: "例：Tele 2026巡演, VIVA LA ROCK",
  twitterLink: "X（原 Twitter）链接",
  instagramLink: "Instagram 链接",
  urlExample: "例：https://x.com/username",
  instagramUrlExample: "例：https://instagram.com/username",
  paidCoin: "付费",
  freeCoin: "免费",
  creatorTools: "创作者工具",
  revenueDashboard: "收益仪表盘",
  availableRevenue: "可提现收益",
  payoutEligiblePaidCoins: "可提现对象: 付费 {coins} C (汇率: 1C = 0.5日元)",
  payoutSettings: "提现设置",
  payoutLastFailure: "上次打款失败: {reason}",
  payoutDefaultFailureReason: "请确认收款信息。",
  stripePayoutsReady: "Stripe 身份验证和收款账户已完成登记。",
  stripePayoutsIncomplete: "Stripe 身份验证或收款账户登记尚未完成。",
  stripePayoutsRequired: "提现需要在 Stripe 完成身份验证和收款账户登记。",
  stripeConnecting: "连接中...",
  payoutSetupContinue: "继续提现设置",
  payoutSetupStart: "开始提现设置",
  payoutRequesting: "申请中...",
  payoutRequestButton: "申请打款",
  payoutMinimum: "满1,000日元即可提现",
  totalEarnedCoins: "累计获得金币（含免费部分）",
  revenueArticle: "文章",
  revenueGift: "礼物",
  transactionHistory: "交易记录",
  userFallback: "用户",
  revenueGiftReceived: "收到了支持",
  revenueArticlePurchased: "文章被购买",
  coinUnit: "金币",
  noRevenueData: "暂无收益数据",
  noRevenueDataDescription: "发布付费文章或收到支持后，\n记录会显示在这里。",
  paymentSuccessToast: "支付完成，金币已充值！🎉",
  paymentCanceledToast: "支付已取消",
  stripeConnectReturnToast: "正在确认提现设置",
  stripeConnectRefreshToast: "请重新开始提现设置",
  invalidCoinAmount: "金币数量无效",
  paymentInitFailed: "无法开始支付",
  stripeConnectStartFailed: "无法开始提现设置",
  payoutRequestSuccess: "已受理 ¥{amount} 的打款申请",
  payoutRequestFailed: "打款申请失败",
  invalidArticleInfo: "文章信息无效",
  cannotPurchaseOwnArticle: "不能购买自己的文章",
  insufficientCoins: "金币不足",
  articlePurchaseSuccess: "文章已购买！",
  insufficientCoinsCharge: "金币不足。请充值。",
  articleGiftConfirm: "要赠送 {amount}C 吗？",
  creatorSupportSuccess: "已支持创作者！",
  coinChargeTitle: "充值金币",
  paymentConfirmationTitle: "确认支付",
  ownedCoins: "持有",
  coinPlanBonus: "优惠 {count} 金币！",
  paymentAmount: "支付金额: ¥{amount}",
  stripeSecureNotice: "将跳转到安全支付系统（Stripe）。信用卡信息会被加密，本应用不会保存。",
  goToCheckout: "前往支付页面",
  dayStreak: "连续记录{count}天",
  mutualFriendsCount: "{count}位共同好友",
  vibeMatchDescription: "这是你和{name}的音乐喜好分析结果。",
  sharedArtistsDescription: "你们都经常听这些艺人。",
  sendVibeMatchMessage: "发送关于共同音乐喜好的消息",
  searchUsers: "搜索用户...",
  blockedUsers: "已拉黑用户",
  noBlockedUsers: "暂无已拉黑用户",
  unblock: "解除",
  mutualFriends: "共同好友",
  close: "关闭",
  onboardingTitle: "创建个人资料",
  onboardingDescription: "填写名称和喜欢的音乐后，会反映到个人资料和 Discover 匹配中。",
  profileSection: "个人资料",
  musicTaste: "音乐喜好",
  favoriteGenres: "喜欢的类型",
  onboardingDefaultChoiceLabels: {
    "邦ロック": "日摇",
    "J-POP": "J-POP",
    "K-POP": "K-POP",
    "洋楽": "西洋音乐",
    "ヒップホップ": "嘻哈",
    "R&B": "R&B",
    "EDM": "EDM",
    "テクノ": "Techno",
    "ジャズ": "爵士",
    "アニソン": "动画歌曲",
    "ボカロ": "Vocaloid",
    "アイドル": "偶像流行",
    "フェス勢": "音乐节爱好者",
    "ライブ好き": "喜欢现场",
    "チルい曲": "轻松歌曲",
    "カラオケ好き": "喜欢卡拉OK",
    "音楽友達募集": "寻找音乐好友",
    "新譜チェック": "关注新歌",
    "推し活": "应援活动",
    "レコード好き": "喜欢唱片"
  },
  favoriteArtist: "喜欢的艺人",
  artistSearchPlaceholder: "搜索艺人",
  artistDetailBackLabel: "返回艺人页面",
  artistTracksLoading: "正在加载歌曲...",
  viewArtistDetail: "查看艺人详情",
  favoriteArtistSearchLabel: "喜欢的艺人搜索",
  searchingCandidates: "正在搜索候选",
  customHashtagPlaceholder: "添加自定义标签",
  customLiveHistoryPlaceholder: "添加自定义现场记录",
  add: "添加",
  later: "稍后",
  saveAndStart: "保存并开始",
  likedPostsEmpty: "暂无{label}",
  articlePublishSettingsTitle: "发布设置",
  articlePublishPreview: "预览",
  articlePublishUntitled: "无标题文章",
  articlePublishAsPremium: "作为付费文章发布",
  articlePublishPremiumDividerHint: "正文中需要付费区域分隔线。",
  articlePublishSalePrice: "售价",
  articlePublishCoin: "金币",
  articlePublishPosting: "发布中...",
  articlePublishPostArticle: "发布这篇文章",
  chatCreateGroup: "创建群组",
  chatUserFallback: "用户",
  chatVoiceMessage: "语音消息",
  chatImageSent: "已发送图片",
  chatFileSent: "已发送文件",
  chatSendPrompt: "发送一条消息吧",
  chatEmptyMessages: "暂无消息",
  chatGroupsSection: "群组",
  chatJoined: "已加入",
  chatArtistCommunities: "艺人社区",
  chatLiveCommunities: "现场社区",
  chatMembersCount: "{count}人参加",
  chatEmptyGroups: "暂无已加入的群组",
  chatCommunityFallback: "社区",
  chatGroupFallback: "群聊",
  chatBackAria: "返回",
  chatDetailsAria: "详情",
  chatFile: "文件",
  chatMusic: "音乐",
  chatVoicePrompt: "点击按钮开始录音",
  chatMessagePlaceholder: "输入...",
  chatUnknownFile: "未知文件",
  chatFileSize: "大小: {size}",
  chatFileSizeUnknown: "无大小信息",
  chatUnsend: "撤回",
  chatUnsendConfirmTitle: "要撤回这条消息吗？",
  chatUnsendConfirmDescriptionLine1: "对方画面中的这条消息或照片也会",
  chatUnsendConfirmDescriptionLine2: "被完全删除。",
  chatUnsendConfirmAction: "撤回",
  chatRead: "已读",
  chatReadCount: "已读 {count}",
  chatConfirmMusic: "确认音乐",
  chatShareMusic: "分享音乐",
  chatArtist: "艺人",
  chatAddMessage: "添加消息...",
  chatMusicCommentPlaceholder: "聊聊这首歌...",
  chatSendToChat: "发送到聊天",
  chatDetailsTitle: "详细设置",
  chatMembers: "成员",
  chatAlbum: "相册",
  chatNotes: "笔记",
  chatNotificationsOff: "关闭通知",
  chatInvite: "邀请",
  chatLeave: "退出",
  chatMedia: "照片・视频",
  chatEvents: "活动",
  chatComingSoon: "即将上线",
  chatInviteCopied: "邀请链接已复制",
  chatInviteCopiedSuccess: "邀请链接已复制！",
  chatInviteTitle: "邀请加入 Echoes",
  chatInviteText: "一起加入群组/现场吧！",
  chatInviteFriend: "邀请好友",
  chatMembersParticipants: "成员・参加者 ({count})",
  chatYou: "你",
  chatNoPhotos: "暂无照片",
  chatNoFiles: "暂无文件",
  chatOpenOriginalMessage: "前往原消息",
  chatImageMissingUrl: "无法获取图片URL",
  chatImageSaveFailed: "图片保存失败",
  chatImageShareText: "分享 Echoes 的图片",
  chatImageUrlCopySuccess: "图片URL已复制！",
  chatShare: "分享",
  chatUploading: "正在发送...",
  chatFileSending: "正在发送文件...",
  chatFileSendFailed: "文件发送失败",
  chatMessageSendFailed: "消息发送失败",
  chatMessageUnsent: "已撤回发送",
  chatFileSizeLimitExceeded: "文件过大",
  chatGroupName: "群组名",
  chatGroupNamePlaceholder: "例: VIVA LA ROCK 参战组",
  chatSelectMembers: "选择成员",
  chatCreateAction: "创建",
  chatInvalidGroupName: "请检查群组名",
  chatNoMembersSelected: "请选择成员",
  chatGroupCreationError: "群组创建失败",
  chatMemberAdditionError: "成员添加失败"
});
function MainApp() {
  const searchParams = useSearchParams();
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showAlignmentMenu, setShowAlignmentMenu] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [settings, setSettings] = useState({ audio: true, notifications: true });

  const [timeZone, setTimeZone] = useState("Asia/Tokyo");
  const [language, setLanguage] = useState("日本語");
  const [isLanguageRestored, setIsLanguageRestored] = useState(false);
  const t = (k: string) => localI18n[language]?.[k] || localI18n["日本語"][k];
  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const getPaywallSeparatorLabel = () => t("ArticlePaywallSeparatorLabel");
  const getPaywallSeparatorHtml = () => `<br/><div contenteditable="false"><hr style="border-top:2px dashed #1DB954;margin:32px 0;"/><p style="text-align:center;color:#1DB954;font-weight:bold;font-size:12px;letter-spacing:0.1em;margin-bottom:32px;">${getPaywallSeparatorLabel()}</p></div><br/>`;
  const getPaywallSeparatorRegex = () => {
    const labels = Array.from(new Set(
      Object.values(localI18n).map((dict: any) => dict.ArticlePaywallSeparatorLabel).filter(Boolean)
    ));
    const labelPattern = labels.map(escapeRegExp).join('|');
    return new RegExp(`(?:<br\\s*\\/?>\\s*)*(?:<div[^>]*>\\s*)?<hr[^>]*>[\\s\\S]*?(?:${labelPattern})[\\s\\S]*?<\\/p>(?:\\s*<\\/div>)?(?:<br\\s*\\/?>\\s*)*`, 'i');
  };
  useEffect(() => {
    try {
      const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage && localI18n[savedLanguage]) setLanguage(savedLanguage);
    } catch (e) {
      console.warn("Language preference restore failed", e);
    } finally {
      setIsLanguageRestored(true);
    }
  }, []);
  const handleLanguageChange = (nextLanguage: string) => {
    setLanguage(nextLanguage);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch (e) {
      console.warn("Language preference save failed", e);
    }
  };
  const passwordResetText = {
    missingEmail: {
      "日本語": "メールアドレスを入力してください",
      English: "Please enter your email address.",
      "中文": "请输入邮箱地址",
    },
    invalidEmail: {
      "日本語": "メールアドレスの形式が正しくありません",
      English: "Please enter a valid email address.",
      "中文": "邮箱地址格式不正确",
    },
    sent: {
      "日本語": "パスワード再設定メールを送信しました",
      English: "Password reset email has been sent.",
      "中文": "密码重置邮件已发送",
    },
    sendFailed: {
      "日本語": "メール送信に失敗しました。時間をおいてもう一度お試しください。",
      English: "Could not send the reset email. Please try again later.",
      "中文": "邮件发送失败。请稍后再试。",
    },
    expiredLink: {
      "日本語": "リンクの有効期限が切れているか、無効です。もう一度パスワード再設定メールを送信してください。",
      English: "The link is expired or invalid. Please request another password reset email.",
      "中文": "链接已过期或无效。请重新发送密码重置邮件。",
    },
  } as const;
  type PasswordResetLanguage = keyof typeof passwordResetText.missingEmail;
  const passwordResetLanguages: PasswordResetLanguage[] = ["日本語", "English", "中文"];
  const getPasswordResetText = (key: keyof typeof passwordResetText) => {
    const activeLanguage = passwordResetLanguages.includes(language as PasswordResetLanguage)
      ? language as PasswordResetLanguage
      : "日本語";
    return passwordResetText[key][activeLanguage];
  };
  const mapPasswordResetAuthError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error || "");
    const lowerMessage = message.toLowerCase();
    if (
      lowerMessage.includes("expired") ||
      lowerMessage.includes("invalid") ||
      lowerMessage.includes("token") ||
      lowerMessage.includes("otp")
    ) {
      return getPasswordResetText("expiredLink");
    }
    return getPasswordResetText("sendFailed");
  };
  const [toastMsg, setToastMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => { setToastMsg({ text: t(text) || text, type }); setTimeout(() => setToastMsg(null), 3000); };
  const getOnboardingSkippedKey = (userId: string) => `echoes_onboarding_skipped_${userId}`;
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'match' | 'article' | 'calendar' | 'chat' | 'profile' | 'other_profile'>('home');
  const [discoverTabMode, setDiscoverTabMode] = useState<'users' | 'communities' | 'match'>('users');
  // 💡 記事機能のデータと画面状態の箱
  const [chatTabMode, setChatTabMode] = useState<'friends' | 'matches' | 'groups' | 'community'>('friends');
  const [profileTabMode, setProfileTabMode] = useState<'my_vibes' | 'liked'>('my_vibes');
  const [homeFeedMode, setHomeFeedMode] = useState<'all' | 'following'>('all');
  // 💡 プロフィール画面を開いた時に「どこから来たか」を記憶する箱
  // --- プロフィール管理 ---
  const [allProfiles, setAllProfiles] = useState<User[]>([]);
  // 💡 記事の購入状態をチェックするSWR
  const [viewingArticle, setViewingArticle] = useState<any>(null);
  const { data: hasPurchasedArticle, mutate: mutatePurchase } = useSWR(
    (currentUser && viewingArticle && viewingArticle.price > 0) ? ['check_purchase', currentUser.id, viewingArticle.id] : null,
    async ([_, userId, articleId]) => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id')
        .eq('sender_id', userId)
        .eq('target_id', articleId)
        .eq('transaction_type', 'article')
        .maybeSingle();
      if (error) throw error;
      return !!data;
    }
  );
  useEffect(() => {
    const fetchAllProfiles = async () => {
      const { data } = await supabase.from('profiles').select('*');
      if (data) setAllProfiles(data as User[]);
    };
    fetchAllProfiles();
  }, []);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [allFollows, setAllFollows] = useState<{ follower_id: string, following_id: string }[]>([]);
  const [showMutualFriendsModal, setShowMutualFriendsModal] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set()); // 💡 ブロックしたユーザーを記憶する箱
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false); // 💡 退会確認モーダル用の箱
  const [myFollowers, setMyFollowers] = useState<Set<string>>(new Set());
  const [myProfile, setMyProfile] = useState<User>({
    id: "", handle: "", name: "", avatar: "",
    bio: "", followers: 0, following: 0, isPrivate: false, category: "suggested",
    hashtags: [], liveHistory: [], age: 20, gender: "other"
  });
  const [vibes, setVibes] = useState<Song[]>([]);
  const [communityVibes, setCommunityVibes] = useState<Song[]>([]);
  const allFeedVibes = useMemo(() => {
  const today = new Date();
  const currentY = today.getFullYear();
  const currentM = today.getMonth() + 1;
  const currentD = today.getDate();
  let list = [...vibes, ...communityVibes].filter(v => 
    !blockedUsers.has(v.user.id) && 
    v.year === currentY && 
    v.month === currentM && 
    v.dayIndex === currentD
  );
  if (homeFeedMode === 'following') {
    list = list.filter(v => followedUsers.has(v.user.id) || v.user.id === currentUser?.id);
  }
  return list.sort((a, b) => b.timestamp - a.timestamp);
}, [vibes, communityVibes, homeFeedMode, followedUsers, currentUser, blockedUsers]);
  const likedVibes = useMemo(() => allFeedVibes.filter(v => v.isLiked), [allFeedVibes]);
  const myStreak = calculateStreak(vibes);
  // 💡 記事機能のデータと画面状態の箱（エラー回避のため、vibesの下に配置）
  const [articleTabMode, setArticleTabMode] = useState<'global' | 'trend' | 'following' | 'liked' | 'my_posts' | 'drafts'>('trend');
  // 💡 リロードしても消えないようにブラウザの保存領域（localStorage）を使うss
  const [articles, setArticles] = useState<any[]>([]);
  const fetchArticleDetail = async (article: any) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    const response = await fetch(`/api/article-detail?id=${encodeURIComponent(String(article.id))}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    if (!response.ok) throw new Error('ArticleDetailFailed');
    const detail = await response.json();
    return {
      ...article,
      title: detail.title ?? article.title,
      content: detail.content ?? article.content,
      premium_content: detail.premium_content ?? undefined,
      price: detail.price ?? article.price,
      coverUrl: detail.cover_url ?? article.coverUrl,
      hasPremiumAccess: Boolean(detail.hasPremiumAccess),
    };
  };
  const handleOpenArticle = async (article: any) => {
    setViewingArticle({ ...article, premium_content: undefined });
    if (article.price > 0) {
      mutatePurchase(Boolean(article.author?.id === currentUser?.id), { revalidate: false });
    }
    try {
      const detailedArticle = await fetchArticleDetail(article);
      setViewingArticle((prev: any) => prev?.id === article.id ? detailedArticle : prev);
      if (detailedArticle.price > 0) {
        mutatePurchase(Boolean(detailedArticle.hasPremiumAccess), { revalidate: false });
      }
    } catch (error) {
      console.warn('Article detail fetch failed', error);
    }
  };
  useEffect(() => {
  const fetchArticlesFromDB = async () => {
    try {
      const { data: articlesData, error: articlesError } = await supabase
        .from('articles')
        .select('id, title, content, price, cover_url, author_id, created_at')
        .order('created_at', { ascending: false });
      if (articlesError) throw articlesError;
      if (!articlesData || articlesData.length === 0) {
        setArticles([]);
        return;
      }
      const articleIds = articlesData.map(a => a.id);
      // 💡 作成した専用テーブルから取得する！
      const [likesRes, commentsRes] = await Promise.all([
        supabase.from('article_likes').select('*').in('article_id', articleIds),
        supabase.from('article_comments').select('*').in('article_id', articleIds)
      ]);
      const likesData = likesRes.data || [];
      const commentsData = commentsRes.data || [];
      const currentUserId = currentUser?.id;
      const formatted = articlesData.map((a: any) => {
        const authorProfile = allProfiles.find(p => p.id === a.author_id);
        // 💡 専用テーブルのカラム（article_id）でフィルタリング！
        const postLikes = likesData.filter(l => l.article_id === a.id);
        const postComments = commentsData.filter(c => c.article_id === a.id);
        const isLikedByMe = currentUserId ? postLikes.some(l => l.user_id === currentUserId) : false;
        const formattedComments = postComments.map(c => {
          const commenterProfile = allProfiles.find(p => p.id === c.user_id);
          return {
            id: c.id,
            text: c.text,
            user: {
              id: commenterProfile?.id || 'unknown',
              handle: commenterProfile?.handle || 'unknown',
              name: commenterProfile?.name || 'Unknown',
              avatar: commenterProfile?.avatar || '/default-avatar.png'
            }
          };
        });
        return {
          id: a.id,
          title: a.title,
          content: a.content,
          premium_content: undefined,
          price: a.price || 0,
          coverUrl: a.cover_url,
          author: authorProfile || {
            id: 'unknown',
            name: 'Unknown',
            handle: 'unknown',
            avatar: '/default-avatar.png'
          },
          likes: postLikes.length,
          isLiked: isLikedByMe,
          comments: formattedComments,
          date: new Date(a.created_at).toLocaleDateString('ja-JP'),
          readTime: '2 min read'
        };
      });
      setArticles(formatted);
    } catch (e) {
      console.warn(e);
    }
  };
  if (allProfiles.length > 0) {
    fetchArticlesFromDB();
  }
}, [allProfiles.length, currentUser?.id]);
  useEffect(() => {
    if (!searchParams) return;
    const articleId = searchParams.get('article');
	    if (articleId && articles.length > 0) {
	      const targetArticle = articles.find(a => a.id === articleId);
	      if (targetArticle) {
	        void handleOpenArticle(targetArticle);
	      }
	    }
  }, [searchParams, articles]);
  const [articleCommentInput, setArticleCommentInput] = useState("");
  // 💡 自分で記事を書くための箱
  const [showWriteArticleModal, setShowWriteArticleModal] = useState(false);
  const [newArticleTitle, setNewArticleTitle] = useState("");
  const [newArticleContent, setNewArticleContent] = useState("");
  const [newArticleCover, setNewArticleCover] = useState<string | null>(null);
  const [showElementMenu, setShowElementMenu] = useState(false);
  const [showListMenu, setShowListMenu] = useState(false);
  const [showDraftSaveDialog, setShowDraftSaveDialog] = useState(false);
  const [draftArticles, setDraftArticles] = useState<any[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [showEditorVoiceMenu, setShowEditorVoiceMenu] = useState(false);
  const [showPastArticleModal, setShowPastArticleModal] = useState(false);
  const [isArticleUploading, setIsArticleUploading] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const articleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  // 💡 AI自動生成記事（本番仕様：いいねは0からスタート）
  useEffect(() => {
    if (vibes.length > 0 && articles.length === 0) {
      const artistCounts: Record<string, number> = {};
      vibes.forEach(v => { artistCounts[v.artist] = (artistCounts[v.artist] || 0) + 1; });
      const topArtist = Object.keys(artistCounts).sort((a, b) => artistCounts[b] - artistCounts[a])[0];
      const topSong = vibes.find(v => v.artist === topArtist);
      const aiArticle = {
        id: 'ai_article_1',
        title: `【AI分析】ユーザーデータから判明！今週Echoesで最も熱いアーティストは「${topArtist}」`,
        coverUrl: topSong?.imgUrl || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&q=80',
        content: `Echoesに記録された全ユーザーのVibe（視聴記録）データをリアルタイムに集計・分析した結果、今週最も多く聴かれているアーティストは「${topArtist}」であることが判明しました。\n\nデータの特徴として、夜の時間帯（22時〜2時）にかけて特に再生回数が伸びる傾向があり、深夜のチルタイムや作業用BGMとして深く愛されていることが読み取れます。\n\nEchoesでは今後も、皆様の日々の音楽記録データをもとに、まだ見ぬ新たな音楽のトレンドを発見・発信していきます。引き続き、日々のVibeを記録して好みの合う仲間を見つけましょう！`,
        author: { id: 'ai_system', name: 'Echoes AI', handle: 'echoes_system', avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=200&q=80', isVerified: true },
        likes: 0,
        isLiked: false,
        comments: [],
        date: '今日',
        readTime: '2 min read'
      };
      setArticles([aiArticle]);
    }
  }, [vibes, articles.length]);
  // 💡 記事の表紙画像をアップロードする機能
  const handleArticleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    e.target.value = '';
    setIsArticleUploading(true);
    showToast(t("ArticleImageUploading"));
    try {
      const compressedFile = await compressImage(file);
      const fileName = `article-cover-${currentUser.id}-${Date.now()}.jpeg`;
      // 💡 既存の avatars バケットを再利用して画像を安全に保存
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, compressedFile);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setNewArticleCover(data.publicUrl);
      showToast(t("ArticleImageUploadSuccess"), "success");
    } catch (err) {
          showToast(t("ArticleImageUploadFailed"), "error");
        } finally {
          setIsArticleUploading(false);
        }
      };
      const handleArticleBodyImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;
        e.target.value = '';
        showToast(t("ArticleImageInserting"));
        try {
          const compressedFile = await compressImage(file);
          const fileName = `article-body-${currentUser.id}-${Date.now()}.jpeg`;
          const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, compressedFile);
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
          if (articleTextareaRef.current) {
            articleTextareaRef.current.focus();
            document.execCommand('insertImage', false, data.publicUrl);
            setNewArticleContent(articleTextareaRef.current.innerHTML);
          }
          showToast(t("ArticleImageInsertSuccess"), "success");
          setShowElementMenu(false);
        } catch (err) {
          showToast(t("ArticleImageInsertFailed"), "error");
        }
      };
      const handleArticleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;
        e.target.value = '';
        showToast(t("ArticleAudioUploading"));
        try {
          const fileExt = file.name.split('.').pop() || "mp3";
          const fileName = `article-audio-${currentUser.id}-${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
          if (articleTextareaRef.current) {
            articleTextareaRef.current.focus();
            const audioHtml = `<br/><audio controls src="${data.publicUrl}" style="width: 100%; border-radius: 8px; background: #1c1c1e; outline: none;"></audio><br/>`;
            document.execCommand('insertHTML', false, audioHtml);
            setNewArticleContent(articleTextareaRef.current.innerHTML);
          }
          showToast(t("ArticleAudioInsertSuccess"), "success");
          setShowElementMenu(false);
        } catch (err) {
          showToast(t("ArticleAudioInsertFailed"), "error");
        }
      };
      const handleEmbedLink = () => {
  let url = window.prompt(t("ArticleEnterUrl"));
  if (!url) return;
  url = url.trim();
  try {
    const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error("InvalidProtocol");
    }
    const safeUrl = parsedUrl.toString();
    const escapeHtml = (str: string) => str.replace(/[<&>"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] || c));
    const escapedSafeUrl = escapeHtml(safeUrl);
    let embedHtml = `<a href="${escapedSafeUrl}" target="_blank" rel="noopener noreferrer" style="color: #1DB954; text-decoration: underline; word-break: break-all;">${escapedSafeUrl}</a>`;
    if (safeUrl.includes('youtube.com/watch') || safeUrl.includes('youtu.be/')) {
      const videoIdMatch = safeUrl.match(/(?:youtu\.be\/|v=)([^&]+)/);
      if (videoIdMatch && videoIdMatch[1]) {
        const cleanId = videoIdMatch[1].replace(/[^a-zA-Z0-9_-]/g, '');
        embedHtml = `<br/><iframe width="100%" height="315" src="https://www.youtube.com/embed/${cleanId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: 12px; margin: 16px 0;"></iframe><br/>`;
      }
    }
    if (articleTextareaRef.current) {
      articleTextareaRef.current.focus();
      document.execCommand('insertHTML', false, embedHtml);
      setNewArticleContent(articleTextareaRef.current.innerHTML);
    }
  } catch (err) {
    showToast(t("ArticleInvalidUrl"), "error");
  }
  setShowElementMenu(false);
};
      const insertEditorVoice = async () => {
        if (!draftVoice || !currentUser) return;
        showToast(t("ArticleVoiceInserting"));
        const tempVoice = draftVoice;
        cancelVoiceRecording();
        setShowEditorVoiceMenu(false);
        try {
          const fileName = `article-voice-${currentUser.id}-${Date.now()}.webm`;
          const { error } = await supabase.storage.from('avatars').upload(fileName, tempVoice.blob);
          if (error) throw error;
          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
          if (articleTextareaRef.current) {
            articleTextareaRef.current.focus();
            const audioHtml = `<br/><audio controls src="${data.publicUrl}" style="width: 100%; border-radius: 8px; background: #1c1c1e; outline: none;"></audio><br/>`;
            document.execCommand('insertHTML', false, audioHtml);
            setNewArticleContent(articleTextareaRef.current.innerHTML);
          }
          showToast(t("ArticleVoiceInsertSuccess"), "success");
        } catch (err) {
          showToast(t("ArticleAudioInsertFailed"), "error");
        }
      };
      const handleArticleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;
        e.target.value = '';
        showToast(t("ArticleFileUploading"));
        try {
          const fileExt = file.name.split('.').pop() || "file";
          const fileName = `article-file-${currentUser.id}-${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
          if (articleTextareaRef.current) {
            articleTextareaRef.current.focus();
            const fileHtml = `<br/><a href="${data.publicUrl}" target="_blank" contenteditable="false" style="display:flex;align-items:center;gap:12px;padding:16px;background:#27272a;border-radius:12px;color:#e4e4e7;text-decoration:none;border:1px solid #52525b;margin:8px 0;width:100%;max-width:320px;"><span style="font-size:24px;">📄</span><span style="font-weight:bold;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${file.name}</span></a><br/>`;
            document.execCommand('insertHTML', false, fileHtml);
            setNewArticleContent(articleTextareaRef.current.innerHTML);
          }
          showToast(t("ArticleFileInsertSuccess"), "success");
          setShowElementMenu(false);
        } catch (err) {
          showToast(t("ArticleFileInsertFailed"), "error");
        }
      };
  const [isArticlePremium, setIsArticlePremium] = useState(false);
  const [articlePriceInput, setArticlePriceInput] = useState(300);
  const [showPublishSettingsModal, setShowPublishSettingsModal] = useState(false);
  const [showCoinChargeModal, setShowCoinChargeModal] = useState(false);
  const [isCharging, setIsCharging] = useState(false);
  const [selectedChargePlan, setSelectedChargePlan] = useState<CoinChargePlan | null>(null);
  useEffect(() => {
    if (!isLanguageRestored) return;
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      if (paymentStatus === 'success') {
        showToast(t("paymentSuccessToast"), "success");
        window.history.replaceState(null, '', window.location.pathname);
      } else if (paymentStatus === 'cancel') {
        showToast(t("paymentCanceledToast"), "error");
        window.history.replaceState(null, '', window.location.pathname);
      }
      const stripeConnectStatus = urlParams.get('stripe_connect');
      if (stripeConnectStatus === 'return') {
        showToast(t("stripeConnectReturnToast"), "success");
        window.history.replaceState(null, '', window.location.pathname);
      } else if (stripeConnectStatus === 'refresh') {
        showToast(t("stripeConnectRefreshToast"), "error");
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [isLanguageRestored, language]);
  const [cardInfo, setCardInfo] = useState({ number: "", expiry: "", cvc: "", name: "" });
  const handleChargeCoins = async () => {
  if (!currentUser) return;
  if (!selectedChargePlan) {
    showToast(t("invalidCoinAmount"), "error");
    return;
  }
  setIsCharging(true);
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (sessionError || !accessToken) {
      throw new Error("Unauthorized");
    }
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        planId: selectedChargePlan.id,
      })
    });
    if (!response.ok) {
      throw new Error("APIRequestFailed");
    }
    const data = await response.json();
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    } else {
      throw new Error("InvalidResponse");
    }
  } catch (err) {
    showToast(t("paymentInitFailed"), "error");
    setIsCharging(false);
  }
};
  const handlePostArticle = async () => {
  if (!currentUser) return;
  const trimmedTitle = newArticleTitle.trim();
  const rawContent = newArticleContent.trim();
  if (!trimmedTitle || !rawContent) {
    showToast(t("ValidationError"), "error");
    return;
  }
  if (trimmedTitle.length > 100) {
    showToast(t("ArticleTitleTooLong"), "error");
    return;
  }
  const sanitizeHtml = (html: string) => {
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
               .replace(/on\w+="[^"]*"/gi, '')
               .replace(/javascript:/gi, '');
  };
  const trimmedContent = sanitizeHtml(rawContent);
  let freeContent = trimmedContent;
  let premiumContent = "";
  let articlePrice = 0;
  if (isArticlePremium) {
    const paywallRegex = getPaywallSeparatorRegex();
    if (!paywallRegex.test(trimmedContent)) {
      showToast(t("ArticleMissingPaywallSeparator"), "error");
      return;
    }
    const parsedPrice = Math.floor(Number(articlePriceInput));
    if (isNaN(parsedPrice) || parsedPrice < 1) {
      showToast(t("ArticleInvalidPrice"), "error");
      return;
    }
    const parts = trimmedContent.split(paywallRegex);
    freeContent = parts[0] || "";
    premiumContent = parts.slice(1).join('').replace(/^<br\s*\/?>/, '');
    articlePrice = parsedPrice;
  }
  const articleId = editingArticleId || `article_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const coverUrl = newArticleCover || 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&q=80';
  const articleData = {
    id: articleId,
    title: trimmedTitle,
    content: freeContent,
    premium_content: premiumContent,
    price: articlePrice,
    cover_url: coverUrl,
    author_id: currentUser.id
  };
  const previousArticles = [...articles];
  const optimisticArticle = {
    id: articleId,
    title: trimmedTitle,
    content: freeContent,
    premium_content: premiumContent,
    price: articlePrice,
    coverUrl: coverUrl,
    author: myProfile,
    likes: 0,
    isLiked: false,
    comments: [],
    date: new Date().toLocaleDateString('en-US'),
    readTime: '1 min read'
  };
  if (editingArticleId) {
    setArticles(articles.map(a => a.id === editingArticleId ? { ...a, ...optimisticArticle } : a));
  } else {
    setArticles([optimisticArticle, ...articles]);
  }
  try {
    if (editingArticleId) {
      const { error } = await supabase
        .from('articles')
        .update(articleData)
        .eq('id', editingArticleId)
        .eq('author_id', currentUser.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('articles').insert([articleData]);
      if (error) throw error;
    }
    localStorage.removeItem('article_draft');
    setDraftArticles([]);
    setLastSaved(null);
    setShowWriteArticleModal(false);
    setShowPublishSettingsModal(false);
    setNewArticleTitle("");
    setNewArticleContent("");
    setNewArticleCover(null);
    setEditingArticleId(null);
    showToast(t("Success"), "success");
  } catch (err) {
    setArticles(previousArticles);
    showToast(t("ArticleDatabaseError"), "error");
  }
};
	  const buildEditableArticleContent = (article: any) => {
	    if ((Number(article.price) || 0) <= 0) return article.content || "";
	    const paywallSeparator = getPaywallSeparatorHtml();
	    return `${article.content || ""}${paywallSeparator}${article.premium_content || ""}`;
	  };
	  // 💡 記事の編集を開始する（画像もセットする）
	  const startEditingArticle = async (article: any) => {
	    let editableArticle = article;
	    if ((Number(article.price) || 0) > 0 && article.author?.id === currentUser?.id && article.premium_content === undefined) {
	      try {
	        editableArticle = await fetchArticleDetail(article);
	      } catch (error) {
	        console.warn('Article detail fetch for editing failed', error);
	      }
	    }
	    setNewArticleTitle(editableArticle.title);
	    setNewArticleContent(buildEditableArticleContent(editableArticle));
	    setNewArticleCover(editableArticle.coverUrl);
	    setEditingArticleId(editableArticle.id);
	    setShowWriteArticleModal(true);
	  };
  useEffect(() => {
    if (showWriteArticleModal && articleTextareaRef.current) {
      articleTextareaRef.current.innerHTML = newArticleContent;
    }
  }, [showWriteArticleModal]);
  const resetEditorState = () => {
  setShowWriteArticleModal(false);
  setNewArticleTitle("");
  setNewArticleContent("");
  setNewArticleCover(null);
  setEditingArticleId(null);
  setCurrentDraftId(null);
  setLastSaved(null);
  setArticleTabMode('drafts');
};
const handleCloseModal = () => {
  const currentHtml = articleTextareaRef.current?.innerHTML || "";
  const safeHtml = DOMPurify.sanitize(currentHtml);
  const plainText = safeHtml.replace(/<[^>]*>/g, '').trim();
  const safeTitle = newArticleTitle.trim().replace(/[<&>]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c));
  if (safeTitle || plainText || newArticleCover) {
    const d = new Date();
    const now = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const draftId = currentDraftId || `draft_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newDraft = { id: draftId, title: safeTitle, content: safeHtml, coverUrl: newArticleCover, date: now };
    setDraftArticles(prev => {
      const exists = prev.some(d => d.id === draftId);
      const updated = exists ? prev.map(d => d.id === draftId ? newDraft : d) : [newDraft, ...prev];
      try {
        localStorage.setItem('echoes_drafts_v2', JSON.stringify(updated));
      } catch (e) {
        showToast(t("ArticleStorageQuotaExceeded"), "error");
      }
      return updated;
    });
  }
  resetEditorState();
};
const handleSaveDraft = () => {
  const currentHtml = articleTextareaRef.current?.innerHTML || "";
  const safeHtml = DOMPurify.sanitize(currentHtml);
  const plainText = safeHtml.replace(/<[^>]*>/g, '').trim();
  const safeTitle = newArticleTitle.trim().replace(/[<&>]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c));
  if (!safeTitle && !plainText && !newArticleCover) {
    showToast(t("ArticleEmptyDraft"), "error");
    return;
  }
  const d = new Date();
  const now = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  const draftId = currentDraftId || `draft_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const newDraft = { id: draftId, title: safeTitle, content: safeHtml, coverUrl: newArticleCover, date: now };
  setDraftArticles(prev => {
    const exists = prev.some(d => d.id === draftId);
    const updated = exists ? prev.map(d => d.id === draftId ? newDraft : d) : [newDraft, ...prev];
    try {
      localStorage.setItem('echoes_drafts_v2', JSON.stringify(updated));
    } catch {
      showToast(t("ArticleStorageQuotaExceeded"), "error");
    }
    return updated;
  });
  resetEditorState();
  showToast(t("Success"), "success");
};
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDrafts = localStorage.getItem('echoes_drafts_v2');
      if (savedDrafts) {
        try {
          const parsed = JSON.parse(savedDrafts);
          if (Array.isArray(parsed)) {
            setDraftArticles(parsed);
          }
        } catch (e) {
          console.warn(e);
        }
      }
    }
  }, []);
  const insertFormatting = (prefix: string, suffix: string) => {
    const textarea = articleTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = newArticleContent;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);
    const insertedText = selected || "text";
    const newText = before + prefix + insertedText + suffix + after;
    setNewArticleContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + insertedText.length
      );
    }, 0);
  };
  // 💡 トレンド順（いいね順）とフォロー順の切り替えロジック
  const displayArticles = useMemo(() => {
    let list = [...articles];
    if (articleTabMode === 'trend') {
      list.sort((a, b) => b.likes - a.likes);
    } else if (articleTabMode === 'following') {
      list = list.filter(a => followedUsers.has(a.author.id) || a.author.id === 'ai_system');
    } else if (articleTabMode === 'liked') {
      list = list.filter(a => a.isLiked);
    } else if (articleTabMode === 'my_posts') {
      list = list.filter(a => a.author.id === myProfile.id);
    }
    return list;
  }, [articles, articleTabMode, followedUsers, myProfile.id]);
  const toggleArticleLike = async (id: string) => {
  if (!currentUser) return;
  let isCurrentlyLiked = false;
  let targetAuthorId = "";
  const updateFn = (a: any) => {
    if (a.id === id) {
      isCurrentlyLiked = a.isLiked;
      targetAuthorId = a.author?.id || "";
      return { ...a, isLiked: !a.isLiked, likes: a.isLiked ? a.likes - 1 : a.likes + 1 };
    }
    return a;
  };
  const rollbackFn = (a: any) => {
    if (a.id === id) {
      return { ...a, isLiked: isCurrentlyLiked, likes: isCurrentlyLiked ? a.likes + 1 : a.likes - 1 };
    }
    return a;
  };
  setArticles(prev => prev.map(updateFn));
  setViewingArticle((prev: any) => prev && prev.id === id ? updateFn(prev) : prev);
  try {
    if (isCurrentlyLiked) {
      const { error } = await supabase
        .from('article_likes')
        .delete()
        .eq('article_id', id)
        .eq('user_id', currentUser.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('article_likes')
        .insert([{ article_id: id, user_id: currentUser.id }]);
      if (error) throw error;
      if (targetAuthorId && targetAuthorId !== currentUser.id && targetAuthorId !== 'ai_system') {
        await supabase.from('notifications').insert([{
          user_id: targetAuthorId,
          sender_id: currentUser.id,
          type: 'like',
          text: `${myProfile.name} liked your article`
        }]);
      }
    }
  } catch (err) {
    setArticles(prev => prev.map(rollbackFn));
    setViewingArticle((prev: any) => prev && prev.id === id ? rollbackFn(prev) : prev);
    showToast(t("UpdateFailed"), "error");
  }
};
  const submitArticleComment = async (e?: React.FormEvent) => {
  if (e) e.preventDefault();
  const trimmedInput = articleCommentInput.trim();
  if (!trimmedInput || !currentUser || !viewingArticle) return;
  if (trimmedInput.length > 500) {
    showToast(t("CommentTooLong"), "error");
    return;
  }
  const escapeHtml = (str: string) => str.replace(/[<&>]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c));
  const safeText = escapeHtml(trimmedInput);
  setArticleCommentInput("");
  try {
    // 💡 新しく作った専用テーブル（article_comments）に保存する！
    const { data: dbComment, error } = await supabase
      .from('article_comments')
      .insert([{ 
        article_id: viewingArticle.id, 
        user_id: currentUser.id, 
        text: safeText 
      }])
      .select()
      .single();
    if (error) {
      showToast(t("InsertFailed"), "error");
      return;
    }
    const newComment = {
      id: dbComment.id,
      user: myProfile,
      text: safeText
    };
    const updateFn = (a: any) => a.id === viewingArticle.id ? { ...a, comments: [...a.comments, newComment] } : a;
    setArticles(prev => prev.map(updateFn));
    setViewingArticle((prev: any) => prev && prev.id === viewingArticle.id ? updateFn(prev) : prev);
    showToast(t("Success"), "success");
    const targetAuthorId = viewingArticle.author?.id;
    if (targetAuthorId && targetAuthorId !== currentUser.id && targetAuthorId !== 'ai_system') {
      await supabase.from('notifications').insert([{
        user_id: targetAuthorId,
        sender_id: currentUser.id,
        type: 'comment',
        text: `${myProfile.name}: "${safeText}"`
      }]);
    }
  } catch (err) {
    showToast(t("SystemError"), "error");
  }
};
  const deleteArticle = async (id: string) => {
    if (!currentUser) return;
    const targetArticle = articles.find(a => a.id === id);
    if (!targetArticle || targetArticle.author.id !== currentUser.id) {
      showToast(t("ArticleDeletePermissionDenied"), "error");
      return;
    }
    if (window.confirm(t("ArticleDeleteConfirm"))) {
      const originalArticles = [...articles];
      setArticles(prev => prev.filter(a => a.id !== id));
      if (viewingArticle?.id === id) {
        setViewingArticle(null);
      }
      try {
        const { error } = await supabase
          .from('articles')
          .delete()
          .eq('id', id)
          .eq('author_id', currentUser.id);
        if (error) throw error;
        showToast(t("ArticleDeleteSuccess"), "success");
      } catch (err) {
        console.warn("削除エラー:", err);
        setArticles(originalArticles);
        showToast(t("ArticleDeleteServerFailed"), "error");
      }
    }
  };
  const handlePurchaseArticle = async (article: any) => {
    if (!currentUser || !article || !article.id) {
      showToast(t("invalidArticleInfo"), "error");
      return;
    }
    if (article.author && article.author.id === currentUser.id) {
      showToast(t("cannotPurchaseOwnArticle"), "error");
      return;
    }
    const articlePrice = Math.floor(Number(article.price));
    if (isNaN(articlePrice) || articlePrice <= 0) {
      showToast(t("ArticleInvalidPrice"), "error");
      return;
    }

    try {
      const receiverId = article.author && article.author.id !== 'unknown' ? article.author.id : currentUser.id;
      
      // 💡 サーバー側のRPC（ストアドプロシージャ）を呼び出して全処理を安全に一括実行
      const { data, error } = await supabase.rpc('purchase_article', {
        buyer_id: currentUser.id,
        author_id: receiverId,
        target_article_id: String(article.id),
        price: articlePrice
      });

      if (error) {
        if (error.message.includes('Insufficient')) {
          showToast(t("insufficientCoins"), "error");
        } else {
          throw error; // その他の予期せぬエラー
        }
        return;
      }

	      // 💡 サーバーで計算された最新のコイン残高を画面に反映
	      setMyProfile(prev => ({ 
	        ...prev, 
	        free_coin: data.new_free_coin, 
	        paid_coin: data.new_paid_coin 
	      } as any));

	      showToast(t("articlePurchaseSuccess"), "success");
	      mutatePurchase(true); // 記事のロックを解除
	      void handleOpenArticle(article);

	    } catch (err) {
	      showToast(t("NetworkError"), "error");
	    }
	  };
  const handleUnlockArticle = (article: any) => {
    const currentBalance = getAvailableCoins(myProfile as User & CoinFields);
    if (currentBalance < article.price) {
      setShowCoinChargeModal(true);
      showToast(t("insufficientCoinsCharge"), "error");
    } else {
      handlePurchaseArticle(article);
    }
  };
  const handleSendArticleGift = async (amount: number) => {
    if (!currentUser || !viewingArticle) {
      showToast(t("Unauthorized"), "error");
      return;
    }
    const currentBalance = getAvailableCoins(myProfile as User & CoinFields);
    if (currentBalance < amount) {
      setShowCoinChargeModal(true);
      showToast(t("insufficientCoinsCharge"), "error");
      return;
    }
    if (!window.confirm(t("articleGiftConfirm").replace("{amount}", amount.toLocaleString()))) return;
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (sessionError || !accessToken) {
        throw new Error("Unauthorized");
      }
      const response = await fetch('/api/send-article-gift', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ articleId: viewingArticle.id, amount }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "GiftSendFailed");
      }
      setMyProfile(prev => ({
        ...prev,
        coin_balance: data.coin_balance,
        free_coin: data.free_coin,
        paid_coin: data.paid_coin,
      } as User & CoinFields));
      showToast(t("creatorSupportSuccess"), "success");
    } catch (e) {
      showToast(t("SystemError"), "error");
    }
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchArtistInfo, setSearchArtistInfo] = useState<any>(null);
  const [trendingSongs, setTrendingSongs] = useState<any[]>([]);
  const [trendingSongsSource, setTrendingSongsSource] = useState<'ranking' | 'fallback'>('fallback');
  const [recommendedSongs, setRecommendedSongs] = useState<any[]>([]);
  const [draftSong, setDraftSong] = useState<any>(null);
  const [draftCaption, setDraftCaption] = useState("");
  const [showPostOverrideConfirm, setShowPostOverrideConfirm] = useState<Song | null>(null);
  const [isPosting, setIsPosting] = useState(false); // 💡 二重投稿防止（連打ロック）用の箱
  const [showPostSuccessCard, setShowPostSuccessCard] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]); // 💡 AIが選んだ3曲を入れる箱
  const [aiMessage, setAiMessage] = useState(t('aiRecommendationsAnalyzingFromHistory')); // 💡 AIの分析メッセージ
  const [isAiRecommendationsLoading, setIsAiRecommendationsLoading] = useState(false);
  const [activeArtistProfile, setActiveArtistProfile] = useState<any>(null);
  const [artistSongs, setArtistSongs] = useState<any[]>([]);
  const [isArtistLoading, setIsArtistLoading] = useState(false);
  const [favoriteArtists, setFavoriteArtists] = useState<FavoriteArtist[]>([]);
  const [artistFavoriteCounts, setArtistFavoriteCounts] = useState<Record<string, number>>({});
  const [activeAlbumProfile, setActiveAlbumProfile] = useState<any>(null);
  const [albumSongs, setAlbumSongs] = useState<any[]>([]);
  const [isAlbumLoading, setIsAlbumLoading] = useState(false);
  const uniqueAlbums = useMemo(() => {
    const arr: any[] = []; const seen = new Set();
    artistSongs.forEach(s => { if (s.collectionId && s.trackCount > 3 && !seen.has(s.collectionId)) { seen.add(s.collectionId); arr.push(s); } });
    return arr;
  }, [artistSongs]);
  const latestReleaseSong = useMemo(() => {
    if (!artistSongs || artistSongs.length === 0) return null;
    return [...artistSongs].sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())[0];
  }, [artistSongs]);
  const [playingSong, setPlayingSong] = useState<string | null>(null);
  const [activeTrackInfo, setActiveTrackInfo] = useState<{ title: string, artist: string, imgUrl: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchFocused, setUserSearchFocused] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [communitySearchQuery, setCommunitySearchQuery] = useState("");
  const [communitySearchFocused, setCommunitySearchFocused] = useState(false);
  const [communityDateFilter, setCommunityDateFilter] = useState("");
  const [activeCommunityDetail, setActiveCommunityDetail] = useState<LiveCommunity | null>(null);
  // 💡 ユーザー自身にライブを作成させるための箱
  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);
  const [newCommName, setNewCommName] = useState("");
  const [newCommYear, setNewCommYear] = useState("");
  const [newCommMonth, setNewCommMonth] = useState("");
  const [newCommDay, setNewCommDay] = useState("");
  const yearInputRef = useRef<HTMLInputElement>(null);
  const monthInputRef = useRef<HTMLInputElement>(null);
  const dayInputRef = useRef<HTMLInputElement>(null);
  // 💡 カレンダー表示用の箱
  const [showCommCalendar, setShowCommCalendar] = useState(false);
  // 💡 カレンダーの初期表示を「今日」のリアルタイムな日時にする
  const [commCalDate, setCommCalDate] = useState(new Date());
  const [selectedModalDate, setSelectedModalDate] = useState<string | null>(null); // カレンダー内でタップした日付を記憶
  const [showCommDrumroll, setShowCommDrumroll] = useState(false);
  const [realCommunities, setRealCommunities] = useState<LiveCommunity[]>([]);
  const [communityMemberCounts, setCommunityMemberCounts] = useState<Record<string, number>>({});
  const [communityRecentMemberCounts, setCommunityRecentMemberCounts] = useState<Record<string, number>>({});
  const [recentArtistPostCounts, setRecentArtistPostCounts] = useState<Record<string, number>>({});
  const [artistImageOverrides, setArtistImageOverrides] = useState<Record<string, string>>({});
  const requestedArtistImageKeys = useRef<Set<string>>(new Set());
  useEffect(() => {
    const fetchLiveSchedules = async () => {
      let apiLives: LiveCommunity[] = [];
      const fallbackLives: LiveCommunity[] = [
        { id: "fb1", name: "ROCK IN JAPAN FESTIVAL 2026", date: "2026-08-01", memberCount: 0, isJoined: false, isVerified: true, reportedBy: [] },
        { id: "fb2", name: "ROCK IN JAPAN FESTIVAL 2026", date: "2026-08-02", memberCount: 0, isJoined: false, isVerified: true, reportedBy: [] },
        { id: "fb3", name: "SUMMER SONIC 2026 TOKYO", date: "2026-08-15", memberCount: 0, isJoined: false, isVerified: true, reportedBy: [] },
        { id: "fb4", name: "SUMMER SONIC 2026 OSAKA", date: "2026-08-16", memberCount: 0, isJoined: false, isVerified: true, reportedBy: [] },
        { id: "fb5", name: "SWEET LOVE SHOWER 2026", date: "2026-08-29", memberCount: 0, isJoined: false, isVerified: true, reportedBy: [] },
        { id: "fb6", name: "Vaundy one man live ARENA tour 2026", date: "2026-09-10", memberCount: 0, isJoined: false, isVerified: true, reportedBy: [] },
        { id: "fb7", name: "King Gnu Live Tour 2026", date: "2026-10-05", memberCount: 0, isJoined: false, isVerified: true, reportedBy: [] },
        { id: "fb8", name: "COUNTDOWN JAPAN 26/27", date: "2026-12-28", memberCount: 0, isJoined: false, isVerified: true, reportedBy: [] }
      ];
      try {
        const apiKey = process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY;
        const startDateTime = new Date().toISOString().split('.')[0] + 'Z';
        const response = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?classificationName=music&countryCode=JP&size=200&startDateTime=${startDateTime}&sort=date,asc&apikey=${apiKey}`);
        if (!response.ok) {
          throw new Error("NetworkError");
        }
        const data = await response.json();
        if (data._embedded && data._embedded.events) {
          apiLives = data._embedded.events.map((event: any) => ({
            id: event.id,
            name: event.name,
            date: event.dates?.start?.localDate || "日程未定",
            memberCount: 0,
            isJoined: false,
            isVerified: true,
            reportedBy: []
          }));
        } else {
          apiLives = fallbackLives;
        }
      } catch (error) {
        showToast(t('officialLiveFetchFailed'), "error");
        apiLives = fallbackLives;
      }
      let customLives: LiveCommunity[] = [];
      try {
        const { data: dbData, error: dbError } = await supabase.from('custom_communities').select('*').limit(200);
        if (dbError) {
          throw dbError;
        }
        if (dbData) {
          customLives = dbData.map((c: any) => ({
            id: c.id,
            name: c.name,
            date: c.community_type === 'artist' ? "常設" : c.date,
            memberCount: 0,
            isJoined: false,
            isVerified: c.community_type === 'artist',
            reportedBy: [],
            communityType: c.community_type || 'live',
            artistId: c.artist_id || undefined,
            artistName: c.artist_name || undefined,
            description: c.description || undefined,
            artworkUrl: c.artwork_url || undefined
          }));
        }
      } catch (dbErr) {
        showToast(t('customLiveFetchFailed'), "error");
      }
      setRealCommunities([...apiLives, ...customLives]);
    };
    fetchLiveSchedules();
  }, []);
  useEffect(() => {
    if (!currentUser) return;
    const fetchJoinedCommunities = async () => {
      try {
        let { data, error }: { data: any[] | null; error: any } = await supabase
          .from('community_members')
          .select('community_id, user_id, created_at')
          .limit(1000);
        if (error && (error.code === '42703' || error.code === 'PGRST204')) {
          const fallback = await supabase
            .from('community_members')
            .select('community_id, user_id')
            .limit(1000);
          data = fallback.data;
          error = fallback.error;
        }
        if (data && !error) {
          const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const joinedIds = new Set(data.filter((d: any) => d.user_id === currentUser.id).map((d: any) => d.community_id));
          const counts = data.reduce((acc: Record<string, number>, d: any) => {
            acc[d.community_id] = (acc[d.community_id] || 0) + 1;
            return acc;
          }, {});
          const recentCounts = data.reduce((acc: Record<string, number>, d: any) => {
            if (d.created_at && new Date(d.created_at).getTime() >= recentCutoff) {
              acc[d.community_id] = (acc[d.community_id] || 0) + 1;
            }
            return acc;
          }, {});
          setCommunityMemberCounts(counts);
          setCommunityRecentMemberCounts(recentCounts);
          const missingJoinedIds = [...joinedIds].filter(id => !realCommunities.some(c => c.id === id));
          let recoveredCommunities: LiveCommunity[] = [];
          if (missingJoinedIds.length > 0) {
            const { data: missingRows, error: missingError } = await supabase
              .from('custom_communities')
              .select('*')
              .in('id', missingJoinedIds);
            if (missingError) {
              console.warn("Joined community recovery failed", {
                code: missingError.code,
                message: missingError.message,
                details: missingError.details,
                hint: missingError.hint,
                communityIds: missingJoinedIds
              });
            } else {
              recoveredCommunities = (missingRows || []).map((row: any) => toLiveCommunityFromDb(row, {
                id: row.id,
                name: row.name || "コミュニティ",
                date: row.date || "常設",
                memberCount: counts[row.id] || 1,
                isJoined: true,
                isVerified: row.community_type === 'artist',
                reportedBy: [],
                communityType: row.community_type || (String(row.id).startsWith('artist:') ? 'artist' : 'live')
              }));
            }
          }
          const joined = [...realCommunities, ...recoveredCommunities]
            .filter(c => joinedIds.has(c.id))
            .map(c => ({ ...c, isJoined: true, memberCount: counts[c.id] || c.memberCount }));
          setChatCommunities(joined);
          if (recoveredCommunities.length > 0) {
            setRealCommunities(prev => {
              const next = [...prev];
              recoveredCommunities.forEach(c => {
                if (!next.some(existing => existing.id === c.id)) next.push(c);
              });
              return next;
            });
          }
        }
      } catch (err) {
        console.warn(err);
      }
    };
    fetchJoinedCommunities();
  }, [currentUser, realCommunities]);
  useEffect(() => {
    if (!currentUser) return;
    const fetchRecentArtistPosts = async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      try {
        const { data, error } = await supabase
          .from('vibes')
          .select('artist, created_at')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(200);
        if (error) throw error;
        const counts = (data || []).reduce((acc: Record<string, number>, row: any) => {
          const key = getArtistCommunityMetricKey(row.artist);
          if (key) acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        setRecentArtistPostCounts(counts);
      } catch (err) {
        console.warn("Recent artist posts load failed", err);
        setRecentArtistPostCounts({});
      }
    };
    fetchRecentArtistPosts();
  }, [currentUser]);
  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;
    const fetchJoinedGroups = async () => {
      try {
        const { data: memberships, error: membershipError } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', currentUser.id);
        if (membershipError) throw membershipError;
        const groupIds = [...new Set((memberships || []).map((m: any) => m.group_id).filter(Boolean))];
        if (groupIds.length === 0) {
          if (isMounted) setChatGroups([]);
          return;
        }
        const [{ data: groups, error: groupsError }, { data: members, error: membersError }] = await Promise.all([
          supabase.from('chat_groups').select('id, name, avatar').in('id', groupIds),
          supabase.from('group_members').select('group_id, user_id').in('group_id', groupIds),
        ]);
        if (groupsError || membersError) throw groupsError || membersError;
        if (!isMounted) return;
        setChatGroups((groups || []).map((group: any) => ({
          id: group.id,
          name: group.name,
          avatar: group.avatar,
          memberIds: (members || []).filter((member: any) => member.group_id === group.id).map((member: any) => member.user_id),
        })));
      } catch (err) {
        console.warn(err);
      }
    };
    fetchJoinedGroups();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [showMatchFilterModal, setShowMatchFilterModal] = useState(false);
  const [matchFilter, setMatchFilter] = useState({ artists: [] as any[], hashtags: [] as string[], liveHistories: [] as string[], ageMin: 18, ageMax: 100, gender: "All" });
  const [peopleMusicFilter, setPeopleMusicFilter] = useState({ hashtags: [] as string[], liveHistories: [] as string[] });
  const [filterArtistInput, setFilterArtistInput] = useState("");
  const [filterArtistSuggestions, setFilterArtistSuggestions] = useState<any[]>([]);
  const [filterHashtagInput, setFilterHashtagInput] = useState("");
  // 💡 Match画面：スワイプアニメーション用の状態管理
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    dragStartX.current = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
  };
  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const currentX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setSwipeOffset(currentX - dragStartX.current);
  };
  const handleSwipeFollow = async (uid: string, uname: string) => {
    setMatchIndex(p => p + 1);
    if (!currentUser) return;
    const { error } = await supabase.from('follows').insert([{ follower_id: currentUser.id, following_id: uid }]);
    if (!error) {
      setFollowedUsers(prev => { const next = new Set(prev); next.add(uid); return next; });
      showToast(t('FollowedUserToast').replace('{name}', uname), "success");
      await supabase.from('notifications').insert([{ user_id: uid, sender_id: currentUser.id, type: 'follow', text: `${myProfile.name}さんにフォローされました` }]);
    }
  };
  const handleDragEnd = () => {
    setIsDragging(false);
    if (swipeOffset > 100) {
      handleSwipeFollow(filteredMatchUsers[matchIndex].id, filteredMatchUsers[matchIndex].name);
    } else if (swipeOffset < -100) {
      setMatchIndex(prev => prev + 1);
    }
    setSwipeOffset(0);
  };
  const filteredMatchUsers = useMemo(() => {
    return allProfiles.filter(u => {
      if (u.id === currentUser?.id || blockedUsers.has(u.id) || followedUsers.has(u.id)) return false;
      if (matchFilter.artists.length > 0 && !matchFilter.artists.some(fa => u.topArtists?.map((x: any) => x.toLowerCase())?.includes(fa.artistName.toLowerCase()))) return false;
      if (matchFilter.hashtags.length > 0 && !matchFilter.hashtags.some(fh => u.hashtags?.map((x: any) => getMusicTagLabel(x).toLowerCase())?.includes(fh.toLowerCase()))) return false;
      if (matchFilter.liveHistories.length > 0 && !matchFilter.liveHistories.some(fl => u.liveHistory?.map((x: any) => x.toLowerCase())?.includes(fl.toLowerCase()))) return false;
      if (u.age && (u.age < matchFilter.ageMin || u.age > matchFilter.ageMax)) return false;
      if (matchFilter.gender !== "All" && u.gender !== matchFilter.gender.toLowerCase()) return false;
      return true;
    });
  }, [matchFilter, allProfiles, currentUser, blockedUsers, followedUsers]);
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [chatMessageInput, setChatMessageInput] = useState("");
  const [showChatPlusMenu, setShowChatPlusMenu] = useState(false);
  const { data: activeCommunityMemberIds, mutate: mutateActiveCommunityMemberIds } = useSWR(
    activeChatUserId && isCommunityChatId(activeChatUserId) ? ['community_members', activeChatUserId] : null,
    async ([_, commId]) => {
      const { data, error } = await supabase.from('community_members').select('user_id').eq('community_id', commId);
      if (error) throw error;
      return data.map((d: any) => d.user_id);
    }
  );
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPlayingDraft, setIsPlayingDraft] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const draftAudioRef = useRef<HTMLAudioElement | null>(null);
  const [draftVoice, setDraftVoice] = useState<{ blob: Blob, url: string } | null>(null);
  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>({});
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);
  const [chatCommunities, setChatCommunities] = useState<LiveCommunity[]>([]);
  const joinedCommunityIds = useMemo(() => new Set(chatCommunities.map(c => c.id)), [chatCommunities]);
  const artistCommunities = useMemo(() => {
    const trendingArtistSignals = new Map<string, { artistName: string; artistId?: string | number; artworkUrl?: string; trendScore: number }>();
    trendingSongs.slice(0, 30).forEach((song, index) => {
      const artistName = String(song.artistName || "").trim();
      if (!artistName) return;
      const artistId = song.artistId && Number(song.artistId) !== 0 ? song.artistId : undefined;
      const signalKey = artistId ? `id:${artistId}` : `name:${getArtistCommunityMetricKey(artistName)}`;
      const rankScore = Math.max(1, 30 - index);
      const existing = trendingArtistSignals.get(signalKey);
      trendingArtistSignals.set(signalKey, {
        artistName,
        artistId,
        artworkUrl: song.artworkUrl100 || song.artworkUrl60,
        trendScore: (existing?.trendScore || 0) + rankScore
      });
    });
    const enrichCommunity = (community: LiveCommunity): LiveCommunity => {
      const memberCount = communityMemberCounts[community.id] || community.memberCount || 0;
      const recentMemberCount = communityRecentMemberCounts[community.id] || community.recentMemberCount || 0;
      const recentPostCount = recentArtistPostCounts[getArtistCommunityMetricKey(community.artistName || community.name.replace(' ファンコミュニティ', ''))] || community.recentPostCount || 0;
      const artworkUrl = artistImageOverrides[community.id] || community.artworkUrl;
      const enriched = {
        ...community,
        memberCount,
        recentMemberCount,
        recentPostCount,
        artworkUrl,
        isJoined: joinedCommunityIds.has(community.id) || community.isJoined
      };
      return {
        ...enriched,
        recommendationScore: getArtistCommunityRecommendationScore(enriched)
      };
    };
    const existing = realCommunities.filter(c => c.communityType === 'artist');
    const byId = new Map<string, LiveCommunity>();
    const idByArtistKey = new Map<string, string>();
    const upsertCommunity = (community: LiveCommunity) => {
      const enriched = enrichCommunity(community);
      const artistKey = getArtistCommunityMetricKey(enriched.artistName || enriched.name.replace(' ファンコミュニティ', ''));
      const existingId = byId.has(enriched.id) ? enriched.id : (artistKey ? idByArtistKey.get(artistKey) : undefined);
      if (existingId) {
        const current = byId.get(existingId);
        if (!current) return;
        const merged = enrichCommunity({
          ...current,
          artworkUrl: current.artworkUrl || enriched.artworkUrl,
          artistId: current.artistId || enriched.artistId,
          artistName: current.artistName || enriched.artistName,
          trendScore: (current.trendScore || 0) + (enriched.trendScore || 0)
        });
        byId.set(existingId, merged);
        return;
      }
      byId.set(enriched.id, enriched);
      if (artistKey) idByArtistKey.set(artistKey, enriched.id);
    };
    existing.forEach(upsertCommunity);
    const addArtist = (artistName?: string, artistId?: string | number, artworkUrl?: string, trendScore = 0) => {
      const cleanName = (artistName || "").trim();
      if (!cleanName) return;
      upsertCommunity({
        ...buildArtistCommunity({ artistId, artistName: cleanName, artworkUrl }, joinedCommunityIds, communityMemberCounts),
        trendScore
      });
    };
    trendingArtistSignals.forEach(signal => addArtist(signal.artistName, signal.artistId, signal.artworkUrl, signal.trendScore));
    favoriteArtists.forEach(a => addArtist(a.artistName, a.favoriteKey || a.artistId, a.artworkUrl));
    (myProfile.topArtists || []).forEach(a => addArtist(a));
    allProfiles.forEach(u => (u.topArtists || []).forEach(a => addArtist(a)));
    vibes.slice(0, 20).forEach(v => addArtist(v.artist, v.artistId, v.imgUrl));
    if (activeArtistProfile) addArtist(activeArtistProfile.artistName, activeArtistProfile.artistId, activeArtistProfile.artworkUrl);
    return Array.from(byId.values()).sort((a, b) =>
      (b.recommendationScore || 0) - (a.recommendationScore || 0) ||
      (b.trendScore || 0) - (a.trendScore || 0) ||
      (b.recentMemberCount || 0) - (a.recentMemberCount || 0) ||
      (b.recentPostCount || 0) - (a.recentPostCount || 0) ||
      (b.memberCount || 0) - (a.memberCount || 0) ||
      a.name.localeCompare(b.name)
    ).slice(0, 8);
  }, [realCommunities, communityMemberCounts, communityRecentMemberCounts, recentArtistPostCounts, artistImageOverrides, joinedCommunityIds, trendingSongs, favoriteArtists, myProfile.topArtists, allProfiles, vibes, activeArtistProfile]);
  const activeArtistCommunity = useMemo(() => {
    if (!activeArtistProfile?.artistName) return null;
    const id = getArtistCommunityId(activeArtistProfile.artistId, activeArtistProfile.artistName);
    const existingCommunity = artistCommunities.find(c => c.id === id);
    if (existingCommunity) {
      return {
        ...existingCommunity,
        artworkUrl: activeArtistProfile.artistImageUrl || existingCommunity.artworkUrl
      };
    }
    return buildArtistCommunity({
      artistId: activeArtistProfile.artistId,
      artistName: activeArtistProfile.artistName,
      artworkUrl: activeArtistProfile.artistImageUrl || activeArtistProfile.artworkUrl
    }, joinedCommunityIds, communityMemberCounts);
  }, [activeArtistProfile, artistCommunities, joinedCommunityIds, communityMemberCounts]);
  const suggestedCommunities = useMemo(() => {
    // // 💡 3人以上の異なるユーザーから通報されたものは、一般リストから「検疫（非表示）」にする
    let f = [...realCommunities].filter(c => c.communityType !== 'artist' && (c.reportedBy?.length || 0) < 3);
    // 💡 自分がコミュニティに参加しているかどうかを判定し、リアルタイムで人数に+1する
    f = f.map(c => ({
      ...c,
      memberCount: communityMemberCounts[c.id] || c.memberCount + (chatCommunities.some(chat => chat.id === c.id) ? 1 : 0)
    }));
    if (communitySearchQuery.trim()) f = f.filter(c => c.name.toLowerCase().includes(communitySearchQuery.toLowerCase()));
    if (communityDateFilter) f = f.filter(c => c.date.startsWith(communityDateFilter));
    return f;
  }, [communitySearchQuery, communityDateFilter, realCommunities, chatCommunities, communityMemberCounts]);
  const visibleArtistCommunities = useMemo(() => {
    const q = communitySearchQuery.trim().toLowerCase();
    return artistCommunities.filter(c => !q || c.name.toLowerCase().includes(q) || (c.artistName || "").toLowerCase().includes(q));
  }, [artistCommunities, communitySearchQuery]);
  const formatTemplate = (key: string, values: Record<string, string | number>) =>
    Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), String(t(key) || ""));
  const formatCountTemplate = (key: string, count: number) => formatTemplate(key, { count });
  const formatArtistCommunityStats = (community: LiveCommunity) => formatCountTemplate('communityJoinedCount', community.memberCount || 0);
  const formatArtistCommunityDisplayName = (community: LiveCommunity) =>
    community.communityType === 'artist' && community.artistName
      ? formatTemplate('artistCommunityName', { artist: community.artistName })
      : community.name;
  const formatCommunityDescription = (community: LiveCommunity) =>
    community.communityType === 'artist' && community.artistName
      ? formatTemplate('artistCommunityDescription', { artist: community.artistName })
      : community.description;
  const formatCommunityDate = (date: string) => date === "日程未定" ? t('dateTbd') : date === "常設" ? t('permanentFanCommunity') : date;
  const formatDatePerformances = (date: string) => formatTemplate('communityDatePerformances', { date: date.replace(/-/g, '/') });
  const weekdayLabels = String(t('weekdaysShort') || "").split(",");
  const fetchArtistImage = async (artist: { artistId?: string | number; artistName?: string; fallbackArtworkUrl?: string }) => {
    const artistName = (artist.artistName || "").trim();
    if (!artistName) return null;
    try {
      const response = await fetch('/api/artist-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId: artist.artistId,
          artistName,
          fallbackArtworkUrl: artist.fallbackArtworkUrl || "",
        }),
      });
      if (!response.ok) throw new Error(`Artist image API returned ${response.status}`);
      const data = await response.json();
      return typeof data.artistImageUrl === 'string' && data.artistImageUrl ? data.artistImageUrl : null;
    } catch (error) {
      console.warn("Artist image lookup failed", { artistName, error });
      return null;
    }
  };
  useEffect(() => {
    visibleArtistCommunities.slice(0, 8).forEach((community) => {
      const requestKey = `community:${community.id}:${community.artworkUrl || ""}`;
      if (requestedArtistImageKeys.current.has(requestKey)) return;
      requestedArtistImageKeys.current.add(requestKey);
      fetchArtistImage({
        artistId: community.artistId,
        artistName: community.artistName || community.name.replace(' ファンコミュニティ', ''),
        fallbackArtworkUrl: community.artworkUrl,
      }).then((artistImageUrl) => {
        if (!artistImageUrl) return;
        setArtistImageOverrides(prev => prev[community.id] === artistImageUrl ? prev : { ...prev, [community.id]: artistImageUrl });
        setRealCommunities(prev => prev.map(c => c.id === community.id ? { ...c, artworkUrl: artistImageUrl } : c));
      });
    });
  }, [visibleArtistCommunities]);
  useEffect(() => {
    if (!activeArtistProfile?.artistName) return;
    const requestKey = `active:${activeArtistProfile.artistId || ""}:${activeArtistProfile.artistName}:${activeArtistProfile.artworkUrl || ""}`;
    if (requestedArtistImageKeys.current.has(requestKey)) return;
    requestedArtistImageKeys.current.add(requestKey);
    fetchArtistImage({
      artistId: activeArtistProfile.artistId,
      artistName: activeArtistProfile.artistName,
      fallbackArtworkUrl: activeArtistProfile.artworkUrl,
    }).then((artistImageUrl) => {
      if (!artistImageUrl) return;
      setActiveArtistProfile((prev: any) => prev?.artistName === activeArtistProfile.artistName ? { ...prev, artworkUrl: artistImageUrl, artistImageUrl } : prev);
    });
  }, [activeArtistProfile?.artistId, activeArtistProfile?.artistName, activeArtistProfile?.artworkUrl]);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState<Set<string>>(new Set());
  const [showChatDetails, setShowChatDetails] = useState<boolean>(false);
  const [chatDetailsTab, setChatDetailsTab] = useState<'menu' | 'members' | 'album' | 'notes' | 'files'>('menu');
  const [viewingChatImage, setViewingChatImage] = useState<any | null>(null);
  const [isViewerUiHidden, setIsViewerUiHidden] = useState<boolean>(false);
  const [jumpToMessageId, setJumpToMessageId] = useState<string | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<{ type: 'image' | 'file', data: string, name: string, file: File }[]>([]);
  const [showChatMusicSelector, setShowChatMusicSelector] = useState(false);
  const [selectedChatSong, setSelectedChatSong] = useState<any>(null);
  const [chatMusicComment, setChatMusicComment] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  useEffect(() => {
            if (jumpToMessageId && messageRefs.current[jumpToMessageId]) {
              messageRefs.current[jumpToMessageId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              const timer = setTimeout(() => setJumpToMessageId(null), 3000);
              return () => clearTimeout(timer);
            }
          }, [jumpToMessageId]);
          const prevChatLengthRef = useRef(0);
          // 💡 チャットを開いた時＆新着メッセージが来た時に一番下へ自動スクロールするエンジン
          useEffect(() => {
            if (activeChatUserId && chatHistory[activeChatUserId]) {
              const currentLength = chatHistory[activeChatUserId].length;
              if (currentLength > prevChatLengthRef.current || prevChatLengthRef.current === 0) {
                const timer = setTimeout(() => {
                  chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
                prevChatLengthRef.current = currentLength;
                return () => clearTimeout(timer);
              } else {
                prevChatLengthRef.current = currentLength;
              }
            } else {
              prevChatLengthRef.current = 0;
            }
          }, [activeChatUserId, chatHistory]);
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showDrumrollModal, setShowDrumrollModal] = useState(false);
  const [selectedCalendarPopupVibe, setSelectedCalendarPopupVibe] = useState<Song | null>(null);
  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth() + 1;
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showInitialOnboarding, setShowInitialOnboarding] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showRevenueDashboard, setShowRevenueDashboard] = useState(false);
  const [revenueData, setRevenueData] = useState<{ total: number, article: number, gift: number, history: any[] }>({ total: 0, article: 0, gift: 0, history: [] });
  const [stripeConnectStatus, setStripeConnectStatus] = useState<StripeConnectStatus>({ connected: false, detailsSubmitted: false, payoutsEnabled: false });
  const [isStartingStripeConnect, setIsStartingStripeConnect] = useState(false);
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false); // 💡 運営ダッシュボード用の箱
  const [showVibeMatchDetails, setShowVibeMatchDetails] = useState(false);
  const [showAppInfoModal, setShowAppInfoModal] = useState<{ title: string, content: string } | null>(null);
  const [showUserListModal, setShowUserListModal] = useState<'FOLLOWERS' | 'FOLLOWING' | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const getAuthAccessToken = async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (sessionError || !accessToken) throw new Error("Unauthorized");
    return accessToken;
  };
  const loadRevenueDashboard = async () => {
    if (!currentUser) return;
    setShowSettingsMenu(false);
    setShowRevenueDashboard(true);
    const { data } = await supabase.from('transactions').select('*').eq('receiver_id', currentUser.id);
    if (data) {
      let total = 0, article = 0, gift = 0;
      data.forEach(tx => {
        total += tx.amount;
        if (tx.transaction_type?.startsWith('article')) article += tx.amount;
        if (tx.transaction_type?.startsWith('gift')) gift += tx.amount;
      });
      const history = data.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRevenueData({ total, article, gift, history });
    }
    try {
      const accessToken = await getAuthAccessToken();
      const response = await fetch('/api/stripe-connect/status', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        setStripeConnectStatus(await response.json());
      }
    } catch (err) {
      setStripeConnectStatus({ connected: false, detailsSubmitted: false, payoutsEnabled: false });
    }
  };
  const startStripeConnectOnboarding = async () => {
    if (!currentUser || isStartingStripeConnect) return;
    setIsStartingStripeConnect(true);
    try {
      const accessToken = await getAuthAccessToken();
      const response = await fetch('/api/stripe-connect/onboarding', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
    if (!response.ok || !data.onboardingUrl) throw new Error(data.error || "ConnectOnboardingFailed");
      window.location.href = data.onboardingUrl;
    } catch (err) {
      showToast(t("stripeConnectStartFailed"), "error");
      setIsStartingStripeConnect(false);
    }
  };
  const requestCreatorPayout = async () => {
    if (!currentUser || isRequestingPayout) return;
    setIsRequestingPayout(true);
    try {
      const accessToken = await getAuthAccessToken();
      const response = await fetch('/api/payouts/request', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "PayoutRequestFailed");
      showToast(t("payoutRequestSuccess").replace("{amount}", Number(data.amountJpy).toLocaleString()), "success");
      await loadRevenueDashboard();
    } catch (err) {
      showToast(t("payoutRequestFailed"), "error");
    } finally {
      setIsRequestingPayout(false);
    }
  };
  const [editName, setEditName] = useState(myProfile.name);
  const [editHandle, setEditHandle] = useState(myProfile.handle);
  const [editBio, setEditBio] = useState(myProfile.bio);
  const [editIsPrivate, setEditIsPrivate] = useState(myProfile.isPrivate);
  const [editAvatar, setEditAvatar] = useState(myProfile.avatar);
  const [editHashtags, setEditHashtags] = useState(myProfile.hashtags?.join(', ') || "");
  const [editLiveHistory, setEditLiveHistory] = useState(myProfile.liveHistory?.join(', ') || "");
  const [editTwitter, setEditTwitter] = useState((myProfile as any).twitterUrl || "");
  const [editInstagram, setEditInstagram] = useState((myProfile as any).instagramUrl || "");
  const [onboardingArtistInput, setOnboardingArtistInput] = useState("");
  const [onboardingHashtagInput, setOnboardingHashtagInput] = useState("");
  const [onboardingLiveInput, setOnboardingLiveInput] = useState("");
  const [onboardingGenres, setOnboardingGenres] = useState<string[]>([]);
  const [onboardingArtists, setOnboardingArtists] = useState<string[]>([]);
  const [onboardingHashtags, setOnboardingHashtags] = useState<string[]>([]);
  const [onboardingLiveHistory, setOnboardingLiveHistory] = useState<string[]>([]);
  const [debouncedOnboardingArtistInput, setDebouncedOnboardingArtistInput] = useState("");
  const [viewingUserStats, setViewingUserStats] = useState({ followers: 0, following: 0 });
  useEffect(() => {
    if (!viewingUser) return;
    const fetchStats = async () => {
      const { count: followersCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', viewingUser.id);
      const { count: followingCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', viewingUser.id);
      setViewingUserStats({ followers: followersCount || 0, following: followingCount || 0 });
    };
    fetchStats();
  }, [viewingUser]);
  const openEditProfile = () => {
    setEditName(myProfile.name);
    setEditHandle(myProfile.handle);
    setEditBio(myProfile.bio || "");
    setEditAvatar(myProfile.avatar);
    setEditHashtags(myProfile.hashtags?.join(', ') || "");
    setEditLiveHistory(myProfile.liveHistory?.join(', ') || "");
    setEditIsPrivate(myProfile.isPrivate);
    setEditTwitter((myProfile as any).twitterUrl || "");
    setEditInstagram((myProfile as any).instagramUrl || "");
    setIsEditingProfile(true);
  };
  const [activeCommentSongId, setActiveCommentSongId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const profileBackTarget = { tab: 'search', chatUserId: null }; // 💡 読み込み用のダミー箱
  const setProfileBackTarget = (data?: any) => { }; // 💡 書き込み用のダミー
  // 💡 完璧な「戻る」システム（自動履歴トラッカー）
  const [historyStack, setHistoryStack] = useState<any[]>([]);
  const skipHistoryRef = useRef(false);
  const currentScreenState = useMemo(() => ({
    tab: activeTab,
    user: viewingUser,
    chatId: activeChatUserId,
    artist: activeArtistProfile,
    album: activeAlbumProfile
  }), [activeTab, viewingUser, activeChatUserId, activeArtistProfile, activeAlbumProfile]);
  const prevStateRef = useRef(currentScreenState);
  const restoreScreenState = (state: any | null) => {
    const target = state || { tab: 'home', user: null, chatId: null, artist: null, album: null };
    const currentArtistKey = getArtistScreenKey(activeArtistProfile);
    const currentAlbumKey = getAlbumScreenKey(activeAlbumProfile);
    const targetArtistKey = getArtistScreenKey(target.artist);
    const targetAlbumKey = getAlbumScreenKey(target.album);

    setActiveTab(target.tab || 'home');
    setViewingUser(target.user || null);
    setActiveChatUserId(target.chatId || null);
    setActiveArtistProfile(target.artist || null);
    setActiveAlbumProfile(target.album || null);
    if (!targetArtistKey || targetArtistKey !== currentArtistKey) setArtistSongs([]);
    if (!targetAlbumKey || targetAlbumKey !== currentAlbumKey) setAlbumSongs([]);
  };
  useEffect(() => {
    if (!skipHistoryRef.current) {
      const prev = prevStateRef.current;
      if (prev.tab !== currentScreenState.tab || prev.user?.id !== currentScreenState.user?.id || prev.chatId !== currentScreenState.chatId || getArtistScreenKey(prev.artist) !== getArtistScreenKey(currentScreenState.artist) || getAlbumScreenKey(prev.album) !== getAlbumScreenKey(currentScreenState.album)) {
        setHistoryStack(stack => [...stack, prev]);
      }
    } else {
      skipHistoryRef.current = false;
    }
    prevStateRef.current = currentScreenState;
  }, [currentScreenState]);
  const handleGoBack = () => {
    setHistoryStack(stack => {
      if (stack.length === 0) {
        restoreScreenState(null);
        return stack;
      }
      const newStack = [...stack];
      let lastState = newStack.pop();
      const currentArtistKey = getArtistScreenKey(currentScreenState.artist);
      while (
        lastState &&
        currentArtistKey &&
        !currentScreenState.album &&
        getArtistScreenKey(lastState.artist) === currentArtistKey
      ) {
        lastState = newStack.pop();
      }
      skipHistoryRef.current = true;
      restoreScreenState(lastState || null);
      return newStack;
    });
  };
  const switchBottomTab = (tab: any) => {
    skipHistoryRef.current = true;
    setHistoryStack([]);
    setActiveTab(tab);
    setViewingUser(null);
    setActiveChatUserId(null);
    setActiveArtistProfile(null);
    setActiveAlbumProfile(null);
    setArtistSongs([]);
    setAlbumSongs([]);
  };
  const getRecentArtistSeeds = React.useCallback((targetVibes: Song[], limit = 3) => {
    const counts = new Map<string, { artistName: string; count: number; latest: number }>();
    targetVibes.forEach(vibe => {
      const artistName = String(vibe.artist || "").trim();
      const key = normalizeMusicLabel(artistName);
      if (!artistName || !key) return;
      const current = counts.get(key) || { artistName, count: 0, latest: 0 };
      counts.set(key, {
        artistName: current.artistName,
        count: current.count + 1,
        latest: Math.max(current.latest, vibe.timestamp),
      });
    });
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count || b.latest - a.latest)
      .slice(0, limit)
      .map(item => item.artistName);
  }, []);
  // 💡 共通の友達を計算する関数
  const getMutualFriends = React.useCallback((userId: string) => {
    if (!currentUser) return [];
    const myFollowings = Array.from(followedUsers);
    const theirFollowings = allFollows.filter(f => f.follower_id === userId).map(f => f.following_id);
    const theirFollowers = allFollows.filter(f => f.following_id === userId).map(f => f.follower_id);
    const theirNetwork = new Set([...theirFollowings, ...theirFollowers]);
    return myFollowings.filter(id => theirNetwork.has(id));
  }, [currentUser, followedUsers, allFollows]);
  // 💡 本番用：おすすめユーザー（共通の友達が多い順。有名人は除外）
  const suggestedFriends = useMemo(() => {
    if (!currentUser) return [];
    return allProfiles
      .filter(u => u.id !== currentUser.id && !followedUsers.has(u.id) && !blockedUsers.has(u.id) && !(u as any).isVerified)
      .map(u => ({ user: u, mutualCount: getMutualFriends(u.id).length }))
      .sort((a, b) => b.mutualCount - a.mutualCount)
      .slice(0, 5);
  }, [allProfiles, currentUser, followedUsers, blockedUsers, getMutualFriends]);
  const similarMusicUsers = useMemo(() => {
    if (!currentUser) return [];
    const myArtistLabels = [
      ...(myProfile.topArtists || []),
      ...vibes.filter(v => v.user.id === currentUser.id || v.user.id === myProfile.id).map(v => v.artist)
    ].map(value => value.trim()).filter(Boolean);
    const myHashtagLabels = (myProfile.hashtags || []).map(getMusicTagLabel).map(value => value.trim()).filter(Boolean);
    const myLiveLabels = (myProfile.liveHistory || []).map(value => value.trim()).filter(Boolean);
    return allProfiles
      .filter(u => u.id !== currentUser.id && !followedUsers.has(u.id) && !blockedUsers.has(u.id) && !(u as any).isVerified)
      .map(u => {
        const theirArtistKeys = new Set([
          ...(u.topArtists || []),
          ...vibes.filter(v => v.user.id === u.id).map(v => v.artist)
        ].map(normalizeMusicLabel).filter(Boolean));
        const theirHashtagKeys = new Set((u.hashtags || []).map(normalizeMusicLabel).filter(Boolean));
        const theirLiveKeys = new Set((u.liveHistory || []).map(value => value.trim().toLowerCase()).filter(Boolean));
        const sharedArtists = myArtistLabels.filter(a => theirArtistKeys.has(normalizeMusicLabel(a)));
        const sharedTags = myHashtagLabels.filter(h => theirHashtagKeys.has(h.toLowerCase()));
        const sharedLives = myLiveLabels.filter(l => theirLiveKeys.has(l.toLowerCase()));
        const shared = [...sharedArtists, ...sharedTags, ...sharedLives];
        const topShared = sharedArtists[0] || sharedTags[0] || sharedLives[0];
        const sharedReasonKey = sharedLives[0] && !sharedArtists[0] && !sharedTags[0] ? 'commonLiveReason' : 'commonMusicReason';
        const sharedReasonLabel = sharedLives[0] && !sharedArtists[0] && !sharedTags[0] ? sharedLives[0] : topShared;
        return { user: u, sharedCount: shared.length, topShared, sharedReasonKey, sharedReasonLabel };
      })
      .filter(item => item.sharedCount > 0)
      .sort((a, b) => b.sharedCount - a.sharedCount)
      .slice(0, 5);
  }, [allProfiles, currentUser, myProfile.id, myProfile.topArtists, myProfile.hashtags, myProfile.liveHistory, followedUsers, blockedUsers, vibes]);
  // 💡 本番用：人気のアカウント（isVerifiedがtrueの有名人のみを表示）
  const popularUsers = useMemo(() => {
    if (!currentUser) return [];
    return allProfiles
      .filter(u => u.id !== currentUser.id && !blockedUsers.has(u.id) && (u as any).isVerified)
      .map(u => ({ user: u, postCount: vibes.filter(v => v.user.id === u.id).length }))
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, 5);
  }, [allProfiles, currentUser, blockedUsers, vibes]);
  const hasPeopleMusicFilter = peopleMusicFilter.hashtags.length > 0 || peopleMusicFilter.liveHistories.length > 0;
  const matchesPeopleMusicFilter = React.useCallback((u: User) => {
    const userHashtags = (u.hashtags || []).map(h => getMusicTagLabel(h).toLowerCase());
    const userLiveHistories = (u.liveHistory || []).map(l => l.toLowerCase());
    const matchesHashtag = peopleMusicFilter.hashtags.length === 0 || peopleMusicFilter.hashtags.some(h => userHashtags.includes(h.toLowerCase()));
    const matchesLiveHistory = peopleMusicFilter.liveHistories.length === 0 || peopleMusicFilter.liveHistories.some(l => userLiveHistories.includes(l.toLowerCase()));
    return matchesHashtag && matchesLiveHistory;
  }, [peopleMusicFilter]);
  const filteredSuggestedFriends = useMemo(() => suggestedFriends.filter(({ user }) => matchesPeopleMusicFilter(user)), [suggestedFriends, matchesPeopleMusicFilter]);
  const filteredSimilarMusicUsers = useMemo(() => similarMusicUsers.filter(({ user }) => matchesPeopleMusicFilter(user)), [similarMusicUsers, matchesPeopleMusicFilter]);
  const filteredPopularUsers = useMemo(() => popularUsers.filter(({ user }) => matchesPeopleMusicFilter(user)), [popularUsers, matchesPeopleMusicFilter]);
  // 💡 プロフィール表示用の共通の友達リスト
  const mutualFriendsList = useMemo(() => {
    if (!viewingUser) return [];
    const mutualIds = getMutualFriends(viewingUser.id);
    return allProfiles.filter(p => mutualIds.includes(p.id));
  }, [viewingUser, getMutualFriends, allProfiles]);
  const displayModalUsers = useMemo(() => {
    const targetUserId = activeTab === 'profile' ? currentUser?.id : viewingUser?.id;
    if (!targetUserId) return [];
    let filteredList: User[] = [];
    if (showUserListModal === 'FOLLOWING') {
      filteredList = allProfiles.filter(p => followedUsers.has(p.id));
    } else {
      filteredList = allProfiles.filter(p => myFollowers.has(p.id));
    }
    return filteredList.filter(u =>
      u.name?.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
      u.handle?.toLowerCase().includes(modalSearchQuery.toLowerCase())
    );
  }, [showUserListModal, allProfiles, followedUsers, myFollowers, modalSearchQuery, activeTab, currentUser, viewingUser]);
  useEffect(() => {
    const handleSession = async (session: any) => {
      setCurrentUser(session.user);
      setIsLoggedIn(true);
      let { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      // 💡 プロフィールが存在しない場合（新規登録の初回ログイン時）は確実に作成する
      if (!profile) {
        const defaultName = session.user.email?.split('@')[0] || "ゲスト";
        const newProfile = {
          id: session.user.id,
          name: defaultName,
          handle: defaultName,
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80",
          bio: "よろしくお願いします！"
        };
        await supabase.from('profiles').insert([newProfile]);
        profile = newProfile;
      }
      setMyProfile(prev => ({ ...prev, ...profile }));
      const hasMusicProfile = (profile.hashtags || []).length > 0 || (profile.liveHistory || []).length > 0;
      const hasSkippedOnboarding = window.localStorage.getItem(getOnboardingSkippedKey(session.user.id)) === 'true';
      const shouldShowInitialOnboarding = !hasMusicProfile && !hasSkippedOnboarding;
      if (shouldShowInitialOnboarding) {
        setEditName(profile.name || "");
        setEditHandle(profile.handle || "");
        setEditAvatar(profile.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80");
        setOnboardingGenres([]);
        setOnboardingArtists([]);
        setOnboardingHashtags([]);
        setOnboardingLiveHistory([]);
        setOnboardingArtistInput("");
        setOnboardingHashtagInput("");
        setOnboardingLiveInput("");
        setShowInitialOnboarding(true);
      }
      const { data: followingData } = await supabase.from('follows').select('following_id').eq('follower_id', session.user.id);
      // 💡 全ユーザーのフォロー・フォロワー関係を取得（共通の友達計算用）
      const { data: allFollowsData } = await supabase.from('follows').select('*');
      if (allFollowsData) setAllFollows(allFollowsData);
      if (followingData) setFollowedUsers(new Set(followingData.map(d => d.following_id)));
      const { data: followersData } = await supabase.from('follows').select('follower_id').eq('following_id', session.user.id);
      // 💡 ブロックリストをデータベースから取得して箱に入れる
      const { data: blocksData } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', session.user.id);
      if (blocksData) setBlockedUsers(new Set(blocksData.map(d => d.blocked_id)));
      if (followersData) setMyFollowers(new Set(followersData.map(d => d.follower_id)));
      const { data: artistFavoritesData, error: artistFavoritesError } = await supabase
        .from('artist_favorites')
        .select('artist_id, artist_name, artwork_url')
        .eq('user_id', session.user.id);
      if (artistFavoritesError) {
        logArtistFavoritesError("Artist favorites load failed", artistFavoritesError, { userId: session.user.id });
      } else if (artistFavoritesData) {
        setFavoriteArtists(artistFavoritesData.map(row => ({
          artistId: Number(row.artist_id) || 0,
          favoriteKey: row.artist_id,
          artistName: row.artist_name,
          artworkUrl: row.artwork_url || ""
        })));
        setArtistFavoriteCounts(prev => {
          const next = { ...prev };
          artistFavoritesData.forEach(row => {
            next[row.artist_id] = Math.max(next[row.artist_id] || 0, 1);
          });
          return next;
        });
      }
      if (shouldShowInitialOnboarding) showToast(t("OnboardingPrompt"), "success");
    };
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await handleSession(session);
      setIsInitializing(false);
    };
    checkSession();
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await handleSession(session);
      } else {
        setCurrentUser(null);
        setIsLoggedIn(false);
      }
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, []);
  useEffect(() => { try { setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone); } catch (e) { setTimeZone("Asia/Tokyo"); } }, []);
  useEffect(() => { if (audioRef.current) audioRef.current.muted = !settings.audio; }, [settings.audio]);
  useEffect(() => { if (draftSong && draftSong.previewUrl && audioRef.current && settings.audio) { audioRef.current.src = draftSong.previewUrl; audioRef.current.play().then(() => setPlayingSong(draftSong.previewUrl)).catch(() => { }); } }, [draftSong]);
  const isArtistFavoritesTableMissing = (err: any) => {
    const code = String(err?.code || "");
    const message = String(err?.message || "");
    return (
      code === "42P01" ||
      code === "PGRST205" ||
      /relation .*artist_favorites.* does not exist/i.test(message) ||
      /could not find .*artist_favorites.* schema cache/i.test(message)
    );
  };
  const logArtistFavoritesError = (context: string, error: any, meta?: Record<string, unknown>) => {
    console.warn(context, {
      error: getSupabaseErrorInfo(error),
      ...meta
    });
  };
  const getArtistFavoriteCountLabel = (count: number) => `${t('artistFavoriteCountPrefix')}${count}${t('artistFavoriteCountSuffix')}`;
  const isFavoriteArtist = (artist: any) => {
    const artistId = getArtistFavoriteId(artist);
    return favoriteArtists.some(a => (a.favoriteKey || String(a.artistId)) === artistId);
  };
  const fetchArtistFavoriteCount = async (artistId: string) => {
    if (!artistId || !currentUser) return;
    const { data, error } = await supabase
      .from('artist_favorites')
      .select('artist_id')
      .eq('artist_id', artistId);
    if (error) {
      logArtistFavoritesError("Artist favorite count load failed", error, { artistId, userId: currentUser.id });
      return;
    }
    setArtistFavoriteCounts(prev => ({ ...prev, [artistId]: data?.length || 0 }));
  };
  useEffect(() => {
    if (!activeArtistProfile) return;
    fetchArtistFavoriteCount(getArtistFavoriteId(activeArtistProfile));
  }, [activeArtistProfile?.artistId, activeArtistProfile?.artistName, currentUser?.id]);
  const { data: trendingData, error: trendingError } = useSWR("/api/trending-songs", fetcher);
  useEffect(() => {
    if (trendingData?.songs) {
      setTrendingSongs(trendingData.songs);
      setTrendingSongsSource(trendingData.source === 'apple-music-rss' ? 'ranking' : 'fallback');
    }
    if (trendingError) console.warn("Trending songs load failed", trendingError);
  }, [trendingData, trendingError]);
  const trendingSongsLabel = trendingSongsSource === 'ranking' ? t('popularSongsInJapan') : t('recommendedSongs');
  const myRecentVibesForRecommendation = useMemo(() => {
    const userId = currentUser?.id || myProfile.id;
    if (!userId) return [];
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return vibes.filter(v => v.user.id === userId && v.timestamp >= thirtyDaysAgo);
  }, [vibes, currentUser?.id, myProfile.id]);
  const myRecentSevenDayVibesForRecommendation = useMemo(() => {
    const userId = currentUser?.id || myProfile.id;
    if (!userId) return [];
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return vibes.filter(v => v.user.id === userId && v.timestamp >= sevenDaysAgo);
  }, [vibes, currentUser?.id, myProfile.id]);
  const myRecentArtistSeeds = useMemo(() => {
    return getRecentArtistSeeds(myRecentVibesForRecommendation, 3);
  }, [getRecentArtistSeeds, myRecentVibesForRecommendation]);
  const myRecentSevenDayArtistSeeds = useMemo(() => {
    return getRecentArtistSeeds(myRecentSevenDayVibesForRecommendation, 3);
  }, [getRecentArtistSeeds, myRecentSevenDayVibesForRecommendation]);
  useEffect(() => {
    if (!currentUser) {
      setRecommendedSongs([]);
      return;
    }
    if (myRecentArtistSeeds.length === 0) {
      setRecommendedSongs([]);
      return;
    }

    const controller = new AbortController();
    const loadRecommendedSongs = async () => {
      try {
        const response = await fetch('/api/recommended-songs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'home',
            artists: myRecentArtistSeeds,
            hashtags: myProfile.hashtags || [],
            recordedTrackIds: myRecentVibesForRecommendation.map(v => v.trackId),
          }),
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        setRecommendedSongs(Array.isArray(data?.songs) ? data.songs : []);
      } catch (error: any) {
        if (error?.name !== 'AbortError') console.warn("Recommended songs load failed", error);
      }
    };

    loadRecommendedSongs();
    return () => controller.abort();
  }, [currentUser?.id, myProfile.hashtags, myRecentArtistSeeds, myRecentVibesForRecommendation]);
  const todayRecommendedSongs = useMemo(() => {
    if (recommendedSongs.length > 0) return recommendedSongs.slice(0, 3);
    const seedArtist = myRecentArtistSeeds[0];
    return trendingSongs.slice(0, 3).map((song, index) => ({
      ...song,
      reason: seedArtist && index === 0 ? `最近${seedArtist}をよく記録しているので` : "Echoesで人気の曲から",
    }));
  }, [recommendedSongs, trendingSongs, myRecentArtistSeeds]);
  useEffect(() => {
    if (!currentUser) {
      setAiRecommendations([]);
      setIsAiRecommendationsLoading(false);
      setAiMessage(t('aiStart'));
      return;
    }
    if (myRecentArtistSeeds.length === 0) {
      setAiRecommendations([]);
      setIsAiRecommendationsLoading(false);
      setAiMessage(t('aiRecommendationsEmpty'));
      return;
    }

    const fallbackMessage = t('aiRecommendationsFromArtists').replace('{artists}', myRecentArtistSeeds.join(', '));
    setAiMessage(fallbackMessage);
    setIsAiRecommendationsLoading(true);
    const controller = new AbortController();
    const loadDiaryRecommendations = async () => {
      try {
        const response = await fetch('/api/recommended-songs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'diary',
            artists: myRecentArtistSeeds,
            recentArtists7: myRecentSevenDayArtistSeeds,
            recentArtists30: myRecentArtistSeeds,
            hashtags: myProfile.hashtags || [],
            recordedTrackIds: myRecentVibesForRecommendation.map(v => v.trackId),
          }),
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        setAiMessage(data?.analysisMessage || fallbackMessage);
        setAiRecommendations(Array.isArray(data?.songs) ? data.songs.slice(0, 3) : []);
      } catch (error: any) {
        if (error?.name !== 'AbortError') console.warn("Diary recommendations load failed", error);
        setAiRecommendations([]);
      } finally {
        setIsAiRecommendationsLoading(false);
      }
    };

    loadDiaryRecommendations();
    return () => controller.abort();
  }, [currentUser?.id, myProfile.hashtags, myRecentArtistSeeds, myRecentSevenDayArtistSeeds, myRecentVibesForRecommendation, language]);
  const [vibePage, setVibePage] = useState(0);
  const [hasMoreVibes, setHasMoreVibes] = useState(true);
  const [isLoadingVibes, setIsLoadingVibes] = useState(false);
  const VIBES_PER_PAGE = 5; // 💡 動作確認しやすくするため最初は5件ずつ読み込む
  const fetchVibes = async (pageNumber = 0, isRefresh = false) => {
  if (isLoadingVibes || (!hasMoreVibes && !isRefresh)) return;
  setIsLoadingVibes(true);
  try {
    const from = pageNumber * VIBES_PER_PAGE;
    const to = from + VIBES_PER_PAGE - 1;
    const { data: vibesData, error: vibesError } = await supabase
      .from('vibes')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);
    if (vibesError) throw vibesError;
    if (!vibesData || vibesData.length === 0) {
      if (isRefresh || pageNumber === 0) setVibes([]);
      setHasMoreVibes(false);
      return;
    }
    const vibeIds = vibesData.map(v => v.id);
    const [likesRes, commentsRes] = await Promise.all([
      supabase.from('likes').select('*').in('vibe_id', vibeIds),
      supabase.from('comments').select('*').in('vibe_id', vibeIds)
    ]);
    if (likesRes.error) throw likesRes.error;
    if (commentsRes.error) throw commentsRes.error;
    const likesData = likesRes.data || [];
    const commentsData = commentsRes.data || [];
    const userIds = [...new Set([
      ...vibesData.map(v => v.user_id),
      ...commentsData.map(c => c.user_id)
    ])];
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);
    if (profilesError) throw profilesError;
    const validProfiles = profilesData || [];
    const currentUserId = currentUser?.id;
    const formatted = vibesData
      .filter(v => validProfiles.some(p => p.id === v.user_id))
      .map(v => {
        const authorProfile = validProfiles.find(p => p.id === v.user_id);
        const postUser = authorProfile ? { 
          id: authorProfile.id, 
          name: authorProfile.name, 
          handle: authorProfile.handle, 
          avatar: authorProfile.avatar, 
          bio: authorProfile.bio, 
          followers: 0, 
          following: 0, 
          isPrivate: false, 
          category: 'suggested' 
        } : myProfile;
        const postLikes = likesData.filter(l => l.vibe_id === v.id);
        const postComments = commentsData.filter(c => c.vibe_id === v.id);
        const isLikedByMe = currentUserId ? postLikes.some(l => l.user_id === currentUserId) : false;
        const formattedComments = postComments.map(c => {
          const commenterProfile = validProfiles.find(p => p.id === c.user_id) || postUser;
          return { 
            id: c.id, 
            text: c.text, 
            user: { 
              id: commenterProfile.id, 
              handle: commenterProfile.handle, 
              name: commenterProfile.name, 
              avatar: commenterProfile.avatar 
            } 
          };
        });
        const createdAt = new Date(v.created_at);
        return {
          id: v.id,
          trackId: parseInt(v.track_id, 10) || 0,
          title: v.title,
          artist: v.artist,
          artistId: 0,
          imgUrl: v.img_url,
          previewUrl: v.preview_url,
          date: createdAt.toLocaleDateString('ja-JP'),
          year: createdAt.getFullYear(),
          month: createdAt.getMonth() + 1,
          dayIndex: createdAt.getDate(),
          timestamp: createdAt.getTime(),
          time: createdAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
          caption: v.caption || "",
          user: postUser,
          likes: postLikes.length,
          isLiked: isLikedByMe,
          comments: formattedComments
        };
      });
    if (isRefresh || pageNumber === 0) {
      setVibes(formatted as Song[]);
    } else {
      setVibes(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newItems = formatted.filter(f => !existingIds.has(f.id));
        return [...prev, ...newItems] as Song[];
      });
    }
    setHasMoreVibes(vibesData.length === VIBES_PER_PAGE);
    setVibePage(pageNumber);
  } catch (error) {
    showToast(t("DataFetchFailed"), "error");
  } finally {
    setIsLoadingVibes(false);
  }
};
        useEffect(() => {
          if (!isInitializing) {
            fetchVibes(0, true);
          }
        }, [isInitializing]);
  // 💡 画面の最下部を検知して次のデータを読み込むシステム
  const observerTarget = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMoreVibes && !isLoadingVibes) {
          fetchVibes(vibePage + 1);
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => observer.disconnect();
  }, [hasMoreVibes, isLoadingVibes, vibePage]);
  // 💡 監視用の「分身（Ref）」を作ることで、再接続のループを防ぐ
	const activeChatUserIdRef = useRef<string | null>(activeChatUserId);
	useEffect(() => {
	  activeChatUserIdRef.current = activeChatUserId;
	}, [activeChatUserId]);
		const chatGroupIds = useMemo(() => chatGroups.map(g => g.id), [chatGroups]);
		const chatCommunityIds = useMemo(() => chatCommunities.map(c => c.id), [chatCommunities]);
		const canAccessChatTarget = React.useCallback((targetId: string) => {
		  if (!targetId.startsWith('g') && !isCommunityChatId(targetId)) return true;
		  return chatGroupIds.includes(targetId) || chatCommunityIds.includes(targetId);
		}, [chatGroupIds, chatCommunityIds]);
	useEffect(() => {
	  if (!currentUser) return;
	  let isMounted = true;
	
	  const fetchChats = async () => {
	    try {
	      const filters = [
	        `sender_id.eq.${currentUser.id}`,
	        `target_id.eq.${currentUser.id}`,
	        ...chatGroupIds.map(id => `target_id.eq.${id}`),
	        ...chatCommunityIds.map(id => `target_id.eq.${id}`),
	      ];
	      const { data, error } = await supabase
	        .from('chat_messages')
	        .select('*')
	        .or(filters.join(','))
	        .order('created_at', { ascending: true });
	      if (error) throw error;
	      if (data && isMounted) {
	        const history: Record<string, ChatMessage[]> = {};
	        data.forEach(msg => {
	          const isGroup = msg.target_id.startsWith('g') || isCommunityChatId(msg.target_id);
	          const partnerId = isGroup ? msg.target_id : (msg.sender_id === currentUser.id ? msg.target_id : msg.sender_id);
	          if (!history[partnerId]) history[partnerId] = [];
	          history[partnerId].push(toChatMessage(msg));
	        });
	        setChatHistory(history);
	      }
	    } catch (e) {}
	  };

  const fetchNotifications = async () => {
    try {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
      if (data && isMounted) {
        setNotifications(data.map(n => ({ id: n.id, type: n.type, text: n.text, time: new Date(n.created_at).toLocaleDateString('en-US'), read: n.is_read })) as any);
      }
    } catch (e) {}
  };

  fetchChats();
  fetchNotifications();

	  let channel = supabase.channel(`rt_${currentUser.id}`);
	  const readableChatTargets = [currentUser.id, ...chatGroupIds, ...chatCommunityIds];
	  const handleChatInsert = async (payload: any) => {
	    const msg = payload.new;
	    if (msg.sender_id === currentUser.id) return;
	    const isGroup = msg.target_id.startsWith('g') || isCommunityChatId(msg.target_id);
	    const partnerId = isGroup ? msg.target_id : msg.sender_id;
	    let isRead = msg.is_read;
	    const currentActiveId = activeChatUserIdRef.current;

	    if (currentActiveId === partnerId) {
	      isRead = true;
	      await supabase.from('chat_messages').update({ is_read: true }).eq('id', msg.id);
	    } else {
	      const { data: senderData } = await supabase.from('profiles').select('name').eq('id', msg.sender_id).single();
	      const senderName = senderData ? senderData.name : "NewMessage";
	      const msgPreview = msg.text.startsWith('[IMAGE]') ? "Image" : msg.text.startsWith('[FILE]') ? "File" : msg.text.startsWith('[VOICE]') ? "Voice" : msg.text;
	      showToast(`${senderName}: ${msgPreview}`);
	    }

	    const newChatMsg = { ...toChatMessage(msg), isRead };
	    setChatHistory(prev => ({ ...prev, [partnerId]: [...(prev[partnerId] || []), newChatMsg] }));
	  };
	  const handleChatUpdate = (payload: any) => {
	    const updatedMsg = payload.new;
	    setChatHistory(prev => {
	      const newHistory = { ...prev };
	      Object.keys(newHistory).forEach(pId => { newHistory[pId] = newHistory[pId].map(m => (m.id === updatedMsg.id ? { ...m, isRead: updatedMsg.is_read } as any : m)); });
	      return newHistory;
	    });
	  };
	  const handleChatDelete = (payload: any) => {
	    const deletedMsgId = payload.old.id;
	    setChatHistory(prev => {
	      const newHistory = { ...prev };
	      Object.keys(newHistory).forEach(pId => { newHistory[pId] = newHistory[pId].filter(m => m.id !== deletedMsgId); });
	      return newHistory;
	    });
	  };

	  readableChatTargets.forEach(targetId => {
	    channel = channel
	      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `target_id=eq.${targetId}` }, handleChatInsert)
	      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `target_id=eq.${targetId}` }, handleChatUpdate)
	      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `target_id=eq.${targetId}` }, handleChatDelete);
	  });
	  channel = channel
	    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `sender_id=eq.${currentUser.id}` }, handleChatUpdate)
	    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `sender_id=eq.${currentUser.id}` }, handleChatDelete)
	    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` }, (payload) => {
	      const newNotif = { id: payload.new.id, type: payload.new.type, text: payload.new.text, time: "Now", read: payload.new.is_read };
	      setNotifications(prev => [newNotif as any, ...prev]);
	      showToast(t("Success"), "success");
	    })
	    .subscribe();

  return () => { 
    isMounted = false;
    supabase.removeChannel(channel); 
  };
	}, [currentUser, chatGroupIds, chatCommunityIds]);

 // 💡 最重要: activeChatUserId を依存リストから消し去ることで、無限リロードを阻止！
  useEffect(() => {
    if (!activeChatUserId || !currentUser) return;
    const markAsRead = async () => {
      const { error } = await supabase.from('chat_messages').update({ is_read: true }).eq('target_id', currentUser.id).eq('sender_id', activeChatUserId).eq('is_read', false);
      if (!error) {
        setChatHistory(prev => {
          const currentChat = prev[activeChatUserId] || [];
          return { ...prev, [activeChatUserId]: currentChat.map(m => (m.senderId === activeChatUserId ? { ...m, isRead: true } as any : m)) };
        });
      }
    };
    markAsRead();
  }, [activeChatUserId, currentUser]);
  const [realUserSearchResults, setRealUserSearchResults] = useState<User[]>([]);
  const [debouncedUserSearchQuery, setDebouncedUserSearchQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedUserSearchQuery(userSearchQuery), 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery]);
  const cleanUserQuery = debouncedUserSearchQuery.trim().replace(/^@/, '');
  const { data: userData, error: userError } = useSWR(
    cleanUserQuery ? `profiles_search_${cleanUserQuery}` : null,
    async () => {
      const { data, error } = await supabase.from('profiles').select('*').or(`handle.ilike.%${cleanUserQuery}%,name.ilike.%${cleanUserQuery}%`).limit(10);
      if (error) throw error;
      return data;
    }
  );
  useEffect(() => {
    if (!cleanUserQuery) {
      setRealUserSearchResults([]);
      return;
    }
    if (userData) {
      setRealUserSearchResults(userData as User[]);
    }
    if (userError) {
      showToast(t("UserSearchFailed"), "error");
      setRealUserSearchResults([]);
    }
  }, [cleanUserQuery, userData, userError]);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const { data: searchData, error: searchError } = useSWR(
    debouncedSearchQuery.trim() ? `https://itunes.apple.com/search?term=${encodeURIComponent(debouncedSearchQuery)}&entity=song&country=jp&limit=5` : null,
    fetcher
  );
  useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      setSearchResults([]);
      setSearchArtistInfo(null);
      return;
    }
    if (searchData) {
      setSearchResults(searchData.results);
      if (searchData.results.length > 0) {
        setSearchArtistInfo({
          artistId: searchData.results[0].artistId,
          artistName: searchData.results[0].artistName,
          artworkUrl: searchData.results[0].artworkUrl100.replace('100x100bb', '300x300bb')
        });
      } else {
        setSearchArtistInfo(null);
      }
    }
    if (searchError) {
      showToast(t("SearchFailed"), "error");
      setSearchResults([]);
      setSearchArtistInfo(null);
    }
  }, [debouncedSearchQuery, searchData, searchError]);
  const [debouncedFilterArtistInput, setDebouncedFilterArtistInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilterArtistInput(filterArtistInput), 500);
    return () => clearTimeout(timer);
  }, [filterArtistInput]);
  const { data: filterArtistData, error: filterArtistError } = useSWR(
    debouncedFilterArtistInput.trim() ? `https://itunes.apple.com/search?term=${encodeURIComponent(debouncedFilterArtistInput)}&entity=song&country=jp&limit=10` : null,
    fetcher
  );
  useEffect(() => {
    if (!debouncedFilterArtistInput.trim()) {
      setFilterArtistSuggestions([]);
      return;
    }
    if (filterArtistData) {
      const unique: any[] = [];
      const seen = new Set();
      filterArtistData.results.forEach((r: any) => {
        if (!seen.has(r.artistId)) {
          seen.add(r.artistId);
          unique.push({ artistId: r.artistId, artistName: r.artistName, artworkUrl: r.artworkUrl60 });
        }
      });
      setFilterArtistSuggestions(unique.slice(0, 5));
    }
    if (filterArtistError) {
      showToast(t("ArtistSearchFailed"), "error");
      setFilterArtistSuggestions([]);
    }
  }, [debouncedFilterArtistInput, filterArtistData, filterArtistError]);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedOnboardingArtistInput(onboardingArtistInput), 400);
    return () => clearTimeout(timer);
  }, [onboardingArtistInput]);
  const { data: onboardingArtistData, error: onboardingArtistError } = useSWR(
    debouncedOnboardingArtistInput.trim() ? `https://itunes.apple.com/search?term=${encodeURIComponent(debouncedOnboardingArtistInput)}&entity=song&country=jp&limit=10` : null,
    fetcher
  );
  const onboardingArtistSuggestions = useMemo(() => {
    if (!onboardingArtistData?.results) return [];
    const unique: { artistId: number, artistName: string, artworkUrl: string }[] = [];
    const seen = new Set();
    onboardingArtistData.results.forEach((r: any) => {
      if (!seen.has(r.artistId)) {
        seen.add(r.artistId);
        unique.push({ artistId: r.artistId, artistName: r.artistName, artworkUrl: r.artworkUrl60 });
      }
    });
    return unique.slice(0, 5);
  }, [onboardingArtistData]);
  useEffect(() => {
    if (onboardingArtistError) showToast(t("ArtistSearchFailed"), "error");
  }, [onboardingArtistError]);
  const { data: artistData, error: artistError } = useSWR(
    activeArtistProfile ? `https://itunes.apple.com/search?term=${encodeURIComponent(activeArtistProfile.artistName)}&entity=song&country=jp&limit=50` : null,
    fetcher
  );
  useEffect(() => {
    if (!activeArtistProfile) return;
    if (!artistData && !artistError) {
      setIsArtistLoading(true);
      return;
    }
    if (artistData) {
      const term = activeArtistProfile.artistName;
      const filtered = artistData.results.filter((i: any) => i.wrapperType === 'track' && i.artistName.toLowerCase().includes(term.toLowerCase()));
      const sortedSongs = filtered.sort((a: any, b: any) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
      setArtistSongs(sortedSongs);
      if (sortedSongs.length > 0 && !activeArtistProfile.isVerifiedReal) {
        setActiveArtistProfile((prev: any) => ({
          ...prev,
          artistId: sortedSongs[0].artistId,
          artworkUrl: sortedSongs[0].artworkUrl100.replace('100x100bb', '600x600bb'),
          isVerifiedReal: true
        }));
      }
    }
    if (artistError) {
      showToast(t("ArtistInfoFetchFailed"), "error");
      setArtistSongs([]);
    }
    setIsArtistLoading(false);
  }, [activeArtistProfile?.artistName, artistData, artistError]);
  const { data: albumData, error: albumError } = useSWR(
    activeAlbumProfile ? `https://itunes.apple.com/lookup?id=${activeAlbumProfile.collectionId}&entity=song&country=jp` : null,
    fetcher
  );
  useEffect(() => {
    if (!activeAlbumProfile) return;
    if (!albumData && !albumError) {
      setIsAlbumLoading(true);
      return;
    }
    if (albumData) {
      setAlbumSongs(albumData.results.filter((i: any) => i.wrapperType === 'track'));
    }
    if (albumError) {
      showToast(t("AlbumInfoFetchFailed"), "error");
      setAlbumSongs([]);
    }
    setIsAlbumLoading(false);
  }, [activeAlbumProfile?.collectionId, albumData, albumError]);
  const allAvailableHashtags = useMemo(() => {
    const s = new Set<string>();
    allProfiles.forEach(u => u.hashtags?.forEach(h => {
      if (isMusicTagCategory(h, "artist")) return;
      s.add(getMusicTagLabel(h));
    }));
    return Array.from(s);
  }, [allProfiles]);
  const allAvailableLiveHistories = useMemo(() => { const s = new Set<string>(); allProfiles.forEach(u => u.liveHistory?.forEach(l => s.add(l))); return Array.from(s); }, [allProfiles]);
  const vibeMatchData = useMemo(() => {
    if (!viewingUser) return null;
    return { score: getVibeMatchScore(myProfile.id, viewingUser.id), genre1: "J-Pop", genre1Score: 85, genre2: "Rock", genre2Score: 65, sharedArtists: viewingUser.topArtists || ["Tele"], persona: "Midnight Listeners" };
  }, [viewingUser, myProfile.id]);
  const togglePlay = async (url: string | null, meta?: { title: string, artist: string, imgUrl: string }) => {
    if (!url) { showToast(t('noPreview'), 'error'); return; }
    if (!settings.audio) { showToast(t("AudioOff"), 'error'); return; }
    if (playingSong === url) {
      audioRef.current?.pause();
      setPlayingSong(null);
      setActiveTrackInfo(null);
    } else {
      audioRef.current!.src = url;
      try {
        await audioRef.current!.play();
        setPlayingSong(url);
        if (meta) setActiveTrackInfo(meta); // 💡 曲情報をセットする
      } catch (e) {
        setPlayingSong(null);
        setActiveTrackInfo(null);
      }
    }
  };
  const handleArtistClick = (e: React.MouseEvent, id: number | string | undefined, name: string, url: string) => {
    e.preventDefault(); e.stopPropagation();
    setShowMatchFilterModal(false); setSelectedCalendarPopupVibe(null); activeAlbumProfile && setActiveAlbumProfile(null);
    if (name) { setActiveArtistProfile({ artistId: id || 0, artistName: name, artworkUrl: url.replace('100x100bb', '600x600bb'), isVerifiedReal: false }); }
    else { setSearchQuery(name); setActiveTab('home'); setIsSearchFocused(true); }
  };
  const toggleFavoriteArtist = async (a: any) => {
    const artistId = getArtistFavoriteId(a);
    if (!artistId || artistId === "unknown") {
      console.warn("Artist favorite save skipped: invalid artist id", {
        artistId,
        artistName: a?.artistName,
        rawArtistId: a?.artistId
      });
      showToast(t('SaveFailed'), "error");
      return;
    }
    const favoriteArtist: FavoriteArtist = {
      artistId: Number(artistId) || 0,
      favoriteKey: artistId,
      artistName: a.artistName,
      artworkUrl: a.artistImageUrl || a.artworkUrl || ""
    };
    const wasFavorite = isFavoriteArtist(a);
    const { data: authUserData, error: authUserError } = await supabase.auth.getUser();
    if (authUserError) {
      logArtistFavoritesError("Artist favorite auth user load failed", authUserError, {
        currentUserId: currentUser?.id,
        artistId
      });
    }
    const userId = authUserData?.user?.id || currentUser?.id;
    if (!userId) {
      showToast(t('Unauthorized'), "error");
      return;
    }
    setFavoriteArtists(prev => wasFavorite ? prev.filter(x => (x.favoriteKey || String(x.artistId)) !== artistId) : [...prev, favoriteArtist]);
    setArtistFavoriteCounts(prev => ({ ...prev, [artistId]: Math.max(0, (prev[artistId] || 0) + (wasFavorite ? -1 : 1)) }));

    const result = wasFavorite
      ? await supabase.from('artist_favorites').delete().eq('user_id', userId).eq('artist_id', artistId)
      : await supabase.from('artist_favorites').insert({
          user_id: userId,
          artist_id: artistId,
          artist_name: favoriteArtist.artistName,
          artwork_url: favoriteArtist.artworkUrl
        });

    if (!wasFavorite && result.error?.code === '23505') {
      fetchArtistFavoriteCount(artistId);
      return;
    }

    if (result.error) {
      setFavoriteArtists(prev => wasFavorite ? [...prev, favoriteArtist] : prev.filter(x => (x.favoriteKey || String(x.artistId)) !== artistId));
      setArtistFavoriteCounts(prev => ({ ...prev, [artistId]: Math.max(0, (prev[artistId] || 0) + (wasFavorite ? 1 : -1)) }));
      showToast(isArtistFavoritesTableMissing(result.error) ? t('ArtistFavoritesSetupRequired') : t('SaveFailed'), "error");
      logArtistFavoritesError("Artist favorite save failed", result.error, {
        action: wasFavorite ? "delete" : "insert",
        userId,
        authUserId: authUserData?.user?.id,
        currentUserId: currentUser?.id,
        artistId,
        rawArtistId: a?.artistId,
        artistName: favoriteArtist.artistName,
        userIdType: typeof userId,
        artistIdType: typeof artistId
      });
      return;
    }
    showToast(wasFavorite ? t('FavoriteRemoved') : t('FavoriteSaved'), "success");
    fetchArtistFavoriteCount(artistId);
  };
  const cancelDraft = () => { if (audioRef.current) audioRef.current.pause(); setPlayingSong(null); setDraftSong(null); setDraftCaption(""); setShowPostOverrideConfirm(null); };
  const isAlreadyPostedToday = () => vibes.find(v => v.year === new Date().getFullYear() && v.month === (new Date().getMonth() + 1) && v.dayIndex === new Date().getDate() && v.user.id === myProfile.id);
  const checkAndPost = () => {
    if (!draftSong) return;
    const existingPost = isAlreadyPostedToday();
    if (existingPost) setShowPostOverrideConfirm(existingPost);
    else executePost(new Date());
  };
  const executePost = async (now: Date) => {
  if (!draftSong || isPosting || !currentUser) {
    return;
  }
  const tCaption = draftCaption.trim();
  if (tCaption.length > 300) {
    showToast(t("CaptionTooLong"), "error");
    return;
  }
  const escapeHtml = (str: string) => str.replace(/[<&>]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c));
  const safeCaption = escapeHtml(tCaption);
  setIsPosting(true);
  try {
    const existingPost = isAlreadyPostedToday();
    if (existingPost) {
      const { error: deleteError } = await supabase
        .from('vibes')
        .delete()
        .eq('id', existingPost.id)
        .eq('user_id', currentUser.id);
      if (deleteError) {
        showToast(t("DeleteFailed"), "error");
        return;
      }
    }
    const newId = `vibe_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newVibeData = {
      id: newId,
      user_id: currentUser.id,
      track_id: draftSong.trackId.toString(),
      title: draftSong.trackName,
      artist: draftSong.artistName,
      img_url: draftSong.artworkUrl100.replace('100x100bb', '600x600bb'),
      preview_url: draftSong.previewUrl || null,
      caption: safeCaption,
      created_at: now.toISOString()
    };
    const { error: insertError } = await supabase.from('vibes').insert([newVibeData]);
    if (insertError) {
      showToast(t("InsertFailed"), "error");
      return;
    }
    const postedAt = new Date(newVibeData.created_at);
    const newVibe: Song = {
      id: newVibeData.id,
      trackId: parseInt(newVibeData.track_id, 10) || 0,
      title: newVibeData.title,
      artist: newVibeData.artist,
      artistId: draftSong.artistId || 0,
      imgUrl: newVibeData.img_url,
      previewUrl: newVibeData.preview_url,
      date: postedAt.toLocaleDateString('ja-JP'),
      year: postedAt.getFullYear(),
      month: postedAt.getMonth() + 1,
      dayIndex: postedAt.getDate(),
      timestamp: postedAt.getTime(),
      time: postedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      caption: newVibeData.caption || "",
      user: myProfile,
      likes: 0,
      isLiked: false,
      comments: []
    };
    setVibes(prev => [newVibe, ...prev.filter(v => v.id !== existingPost?.id && v.id !== newVibe.id)]);
    void fetchVibes(0, true);
    cancelDraft();
    setSearchQuery("");
    setSearchResults([]);
    setSearchArtistInfo(null);
    setIsSearchFocused(false);
    setActiveArtistProfile(null);
    setActiveAlbumProfile(null);
    setArtistSongs([]);
    setAlbumSongs([]);
    setShowPostSuccessCard(true);
    setActiveTab('home');
    showToast(t("Success"), "success");
  } catch (err) {
    showToast(t("SystemError"), "error");
  } finally {
    setIsPosting(false);
  }
};
  const toggleLike = async (vibeId: string) => {
  if (!currentUser) return;
  let isCurrentlyLiked = false;
  let targetUserId = "";
  const updateFn = (s: any) => {
    if (s.id === vibeId) {
      isCurrentlyLiked = s.isLiked;
      targetUserId = s.user.id;
      return { ...s, isLiked: !s.isLiked, likes: s.isLiked ? s.likes - 1 : s.likes + 1 };
    }
    return s;
  };
  const rollbackFn = (s: any) => {
    if (s.id === vibeId) {
      return { ...s, isLiked: isCurrentlyLiked, likes: isCurrentlyLiked ? s.likes + 1 : s.likes - 1 };
    }
    return s;
  };
  setVibes(prev => prev.map(updateFn));
  setCommunityVibes(prev => prev.map(updateFn));
  try {
    if (isCurrentlyLiked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('vibe_id', vibeId)
        .eq('user_id', currentUser.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('likes')
        .insert([{ vibe_id: vibeId, user_id: currentUser.id }]);
      if (error) throw error;
      if (targetUserId && targetUserId !== currentUser.id) {
        await supabase.from('notifications').insert([{
          user_id: targetUserId,
          sender_id: currentUser.id,
          type: 'like',
          text: `${myProfile.name} liked your post`
        }]);
      }
    }
  } catch (err) {
    setVibes(prev => prev.map(rollbackFn));
    setCommunityVibes(prev => prev.map(rollbackFn));
    showToast(t("UpdateFailed"), "error");
  }
};
  // 💡 DBと連動する「コメント」機能 (通知送信付き)
  const submitComment = async (vibeId: string) => {
  const trimmedInput = commentInput.trim();
  if (!trimmedInput || !currentUser) {
    return;
  }
  if (trimmedInput.length > 200) {
    showToast(t("LengthLimitExceeded"), "error");
    return;
  }
  const sanitizedText = trimmedInput.replace(/[<&>]/g, (char) => {
    const escapeMap: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;' };
    return escapeMap[char] || char;
  });
  setCommentInput("");
  try {
    const { data: newDbComment, error } = await supabase
      .from('comments')
      .insert([{ vibe_id: vibeId, user_id: currentUser.id, text: sanitizedText }])
      .select()
      .single();
    if (error) {
      showToast(t("InsertFailed"), "error");
      return;
    }
    const newComment = { id: newDbComment.id, user: myProfile, text: sanitizedText };
    let targetUserId = "";
    const updateStateFn = (prev: Song[]) => prev.map((s) => {
      if (s.id === vibeId) {
        targetUserId = s.user.id;
        return { ...s, comments: [...s.comments, newComment] };
      }
      return s;
    });
    setVibes(updateStateFn);
    setCommunityVibes(updateStateFn);
    showToast(t("Success"), "success");
    if (targetUserId && targetUserId !== currentUser.id) {
      await supabase.from('notifications').insert([{
        user_id: targetUserId,
        sender_id: currentUser.id,
        type: 'comment',
        text: `${myProfile.name}: "${sanitizedText}"`
      }]);
    }
  } catch (err) {
    showToast(t("SystemError"), "error");
  }
};
  const deleteVibe = async (id: string) => {
  if (!currentUser) {
    showToast(t("Unauthorized"), "error");
    return;
  }
  if (window.confirm(t("feedDeleteConfirm"))) {
    const targetVibe = vibes.find(v => v.id === id) || communityVibes.find(v => v.id === id);
    if (targetVibe && targetVibe.user.id !== currentUser.id) {
      showToast(t("PermissionDenied"), "error");
      return;
    }
    try {
      const { error } = await supabase
        .from('vibes')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser.id);
      if (error) {
        showToast(t("DeleteFailed"), "error");
        return;
      }
      setVibes(prev => prev.filter(v => v.id !== id));
      setCommunityVibes(prev => prev.filter(v => v.id !== id));
      showToast(t("Success"), "success");
    } catch (err) {
      showToast(t("SystemError"), "error");
    }
  }
};
	 const submitChatMessage = async (targetId: string) => {
	  if (!currentUser) return;
	  if (!canAccessChatTarget(targetId)) {
	    showToast(t("Unauthorized"), "error");
	    return;
	  }
	  const textToSend = chatMessageInput.trim();
  const attachmentsToSend = [...pendingAttachments];
  if (!textToSend && attachmentsToSend.length === 0) {
    return;
  }
  if (textToSend.length > 1000) {
    showToast(t("TextLimitExceeded"), "error");
    return;
  }
  if (attachmentsToSend.length > 5) {
    showToast(t("TooManyFiles"), "error");
    return;
  }
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  for (const att of attachmentsToSend) {
    if (att.file && att.file.size > MAX_FILE_SIZE) {
      showToast(t('chatFileSizeLimitExceeded'), "error");
      return;
    }
  }
  const escapeHtml = (str: string) => str.replace(/[<&>]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c));
  const safeText = escapeHtml(textToSend);
  setChatMessageInput("");
  setPendingAttachments([]);
  if (safeText) {
    const tempId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newMsg = { id: tempId, senderId: currentUser.id, text: safeText, timestamp: Date.now(), isRead: false };
    setChatHistory(prev => ({ ...prev, [targetId]: [...(prev[targetId] || []), newMsg as any] }));
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{ sender_id: currentUser.id, target_id: targetId, text: safeText }])
        .select()
        .single();
      if (!error && data) {
        setChatHistory(prev => {
          const history = prev[targetId] || [];
          return { ...prev, [targetId]: history.map(m => m.id === tempId ? { ...m, id: data.id } as any : m) };
        });
      }
    } catch (err) {
      showToast(t('chatMessageSendFailed'), "error");
      setChatHistory(prev => ({ ...prev, [targetId]: (prev[targetId] || []).filter(m => m.id !== tempId) }));
    }
  }
  if (attachmentsToSend.length > 0) {
    showToast(t('chatUploading'), "success");
    for (const att of attachmentsToSend) {
      const isImage = att.type === 'image';
      const sizeMB = att.file ? (att.file.size / (1024 * 1024)).toFixed(2) + " MB" : "Unknown";
      const safeFileName = escapeHtml(att.name);
      const tempFileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const tempFileText = isImage ? `[IMAGE]${att.data}` : `[FILE]${safeFileName}|${att.data}|${sizeMB}`;
      const newTempMsg = { id: tempFileId, senderId: currentUser.id, text: tempFileText, timestamp: Date.now(), isRead: false };
      setChatHistory(prev => ({ ...prev, [targetId]: [...(prev[targetId] || []), newTempMsg as any] }));
      try {
        let uploadFile = att.file;
        if (isImage) {
          try {
            uploadFile = await compressImage(att.file);
          } catch (compressErr) {
            uploadFile = att.file;
          }
        }
        const fileExt = uploadFile.name.split('.').pop() || "bin";
        const fileName = `${currentUser.id}-chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, uploadFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        const realFileText = isImage ? `[IMAGE]${urlData.publicUrl}` : `[FILE]${safeFileName}|${urlData.publicUrl}|${sizeMB}`;
        const { data: dbData } = await supabase
          .from('chat_messages')
          .insert([{ sender_id: currentUser.id, target_id: targetId, text: realFileText }])
          .select()
          .single();
        if (dbData) {
          setChatHistory(prev => {
            const history = prev[targetId] || [];
            return { ...prev, [targetId]: history.map(m => m.id === tempFileId ? { ...m, id: dbData.id, text: realFileText } as any : m) };
          });
        }
      } catch (err) {
        showToast(t("UploadFailed"), "error");
        setChatHistory(prev => ({ ...prev, [targetId]: (prev[targetId] || []).filter(m => m.id !== tempFileId) }));
      }
    }
  }
};
  const deleteChatMessage = async (msgId: string, partnerId: string) => {
    if (!currentUser) return;
    setChatHistory(prev => {
      const currentHistory = prev[partnerId] || [];
      return { ...prev, [partnerId]: currentHistory.filter(m => m.id !== msgId) };
    });
    showToast(t('chatMessageUnsent'));
    await supabase.from('chat_messages').delete().eq('id', msgId).eq('sender_id', currentUser.id);
  };
  const handleCreateGroup = async () => {
  if (!currentUser) return;
  const tName = newGroupName.trim();
  if (!tName || tName.length > 50) {
    showToast(t('chatInvalidGroupName'), "error");
    return;
  }
  if (newGroupMembers.size === 0) {
    showToast(t('chatNoMembersSelected'), "error");
    return;
  }
  const escapeHtml = (str: string) => str.replace(/[<&>]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c));
  const safeName = escapeHtml(tName);
  const groupId = `g_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const memberArray = Array.from(newGroupMembers);
  memberArray.push(currentUser.id);
  try {
    const { error: groupError } = await supabase.from('chat_groups').insert([{
      id: groupId,
      name: safeName,
      creator_id: currentUser.id,
      avatar: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80"
    }]);
    if (groupError) {
      showToast(t('chatGroupCreationError'), "error");
      return;
    }
    const memberInserts = memberArray.map(uid => ({
      group_id: groupId,
      user_id: uid
    }));
    const { error: memberError } = await supabase.from('group_members').insert(memberInserts);
    if (memberError) {
      showToast(t('chatMemberAdditionError'), "error");
      return;
    }
    const newGroup = {
      id: groupId,
      name: safeName,
      memberIds: memberArray,
      avatar: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80"
    };
    setChatGroups(prev => [...prev, newGroup as any]);
    setShowCreateGroupModal(false);
    setNewGroupName("");
    setNewGroupMembers(new Set());
    setActiveChatUserId(groupId);
    setChatTabMode('groups');
    setActiveTab('chat');
    showToast(t("Success"), "success");
  } catch (err) {
    showToast(t("SystemError"), "error");
  }
};
  const logCommunityJoinError = (stage: string, err: any, communityId: string, context?: Record<string, unknown>) => {
    console.warn("Community join failed", {
      stage,
      communityId,
      code: err?.code,
      message: err?.message || String(err),
      details: err?.details,
      hint: err?.hint,
      ...context
    });
  };
  const isMissingCustomCommunityMetadataError = (err: any) => {
    const message = `${err?.message || ""} ${err?.details || ""} ${err?.hint || ""}`;
    return err?.code === '42703' || err?.code === 'PGRST204' || /community_type|artist_id|artist_name|description|artwork_url/i.test(message);
  };
  const ensureCurrentUserProfile = async () => {
    if (!currentUser) throw new Error("Missing currentUser");
    const profilePayload = {
      id: currentUser.id,
      name: myProfile.name || currentUser.email?.split('@')[0] || 'User',
      handle: myProfile.handle || `user_${currentUser.id.slice(0, 8)}`,
      avatar: myProfile.avatar || '/default-avatar.png',
      bio: myProfile.bio || '',
      hashtags: myProfile.hashtags || [],
      liveHistory: myProfile.liveHistory || [],
      topArtists: myProfile.topArtists || [],
      isPrivate: myProfile.isPrivate || false,
      age: myProfile.age || null,
      gender: myProfile.gender || null
    };
    const { error } = await supabase
      .from('profiles')
      .upsert([profilePayload], { onConflict: 'id', ignoreDuplicates: true });
    if (error) {
      logCommunityJoinError("profiles.upsert_self", error, "profile", { payload: { id: profilePayload.id } });
      throw error;
    }
  };
  const ensureCommunityMembership = async (communityId: string) => {
    if (!currentUser) throw new Error("Missing currentUser");
    const membershipPayload = {
      community_id: communityId,
      user_id: currentUser.id
    };
    const { error: upsertError } = await supabase
      .from('community_members')
      .upsert([membershipPayload], { onConflict: 'community_id,user_id', ignoreDuplicates: true });
    if (!upsertError) return;
    logCommunityJoinError("community_members.upsert_self_retrying", upsertError, communityId, { payload: membershipPayload });
    const { data: existingMembership, error: selectError } = await supabase
      .from('community_members')
      .select('community_id, user_id')
      .eq('community_id', membershipPayload.community_id)
      .eq('user_id', membershipPayload.user_id)
      .maybeSingle();
    if (selectError) {
      logCommunityJoinError("community_members.select_self", selectError, communityId, { payload: membershipPayload });
      throw selectError;
    }
    if (existingMembership) return;
    const { error: insertError } = await supabase
      .from('community_members')
      .insert([membershipPayload]);
    if (insertError && insertError.code !== '23505') {
      logCommunityJoinError("community_members.insert_self", insertError, communityId, { payload: membershipPayload });
      throw insertError;
    }
  };
  const toLiveCommunityFromDb = (row: any, fallback: LiveCommunity): LiveCommunity => ({
    ...fallback,
    id: row.id || fallback.id,
    name: row.name || fallback.name,
    date: row.community_type === 'artist' ? "常設" : (row.date || fallback.date),
    isVerified: row.community_type === 'artist' ? true : fallback.isVerified,
    communityType: row.community_type || fallback.communityType || 'live',
    artistId: row.artist_id || fallback.artistId,
    artistName: row.artist_name || fallback.artistName,
    description: row.description || fallback.description,
    artworkUrl: row.artwork_url || fallback.artworkUrl
  });
  const ensureArtistCommunity = async (c: LiveCommunity): Promise<LiveCommunity> => {
    if (c.communityType !== 'artist' || !currentUser) return c;
    const artistId = c.artistId || c.id.replace(/^artist:/, '').replace(/^com_artist_/, '');
    const safeName = c.name.replace(/[<&>]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[char] || char));
    const safeDescription = (c.description || "").replace(/[<&>]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[char] || char));
    const communityPayload = {
      id: c.id,
      name: safeName,
      date: new Date().toISOString().slice(0, 10),
      creator_id: null,
      community_type: 'artist',
      artist_id: artistId,
      artist_name: c.artistName || c.name.replace(' ファンコミュニティ', ''),
      description: safeDescription,
      artwork_url: c.artworkUrl || null
    };
    const minimalCommunityPayload = {
      id: c.id,
      name: safeName,
      date: new Date().toISOString().slice(0, 10),
      creator_id: null
    };
    const { data: existingById, error: existingByIdError } = await supabase
      .from('custom_communities')
      .select('*')
      .eq('id', c.id)
      .maybeSingle();
    if (existingByIdError) {
      logCommunityJoinError("custom_communities.select_by_id", existingByIdError, c.id);
      throw existingByIdError;
    }
    let existingCommunity = existingById;
    if (!existingCommunity && artistId) {
      const { data: existingByArtist, error: existingByArtistError } = await supabase
        .from('custom_communities')
        .select('*')
        .eq('community_type', 'artist')
        .eq('artist_id', artistId)
        .maybeSingle();
      if (existingByArtistError) {
        if (isMissingCustomCommunityMetadataError(existingByArtistError)) {
          logCommunityJoinError("custom_communities.select_by_artist_metadata_missing", existingByArtistError, c.id);
        } else {
          logCommunityJoinError("custom_communities.select_by_artist", existingByArtistError, c.id);
          throw existingByArtistError;
        }
      } else {
        existingCommunity = existingByArtist;
      }
    }
    const ensuredCommunity = existingCommunity
      ? toLiveCommunityFromDb(existingCommunity, c)
      : await (async () => {
        let { error: insertError } = await supabase
          .from('custom_communities')
          .upsert([communityPayload], { onConflict: 'id', ignoreDuplicates: true });
        if (insertError && isMissingCustomCommunityMetadataError(insertError)) {
          logCommunityJoinError("custom_communities.insert_artist_metadata_missing_retry_minimal", insertError, c.id, { payload: communityPayload });
          const minimalInsert = await supabase
            .from('custom_communities')
            .upsert([minimalCommunityPayload], { onConflict: 'id', ignoreDuplicates: true });
          insertError = minimalInsert.error;
        }
        if (insertError?.code === '23505') {
          const duplicateQuery = supabase
            .from('custom_communities')
            .select('*')
            .eq('id', c.id)
            .maybeSingle();
          const { data: duplicatedCommunity, error: duplicateSelectError } = await duplicateQuery;
          if (duplicateSelectError) {
            logCommunityJoinError("custom_communities.select_after_duplicate", duplicateSelectError, c.id, { payload: minimalCommunityPayload });
            throw duplicateSelectError;
          }
          return duplicatedCommunity ? toLiveCommunityFromDb(duplicatedCommunity, c) : c;
        }
        if (insertError) {
          logCommunityJoinError("custom_communities.insert_artist", insertError, c.id, { payload: minimalCommunityPayload });
          throw insertError;
        }
        return c;
      })();
    setRealCommunities(prev => prev.some(x => x.id === ensuredCommunity.id)
      ? prev.map(x => x.id === ensuredCommunity.id ? { ...x, ...ensuredCommunity } : x).filter(x => x.id === ensuredCommunity.id || x.id !== c.id)
      : [...prev.filter(x => x.id !== c.id), ensuredCommunity]
    );
    return ensuredCommunity;
  };
  const openCommunityChat = (c: LiveCommunity) => {
    const knownCount = communityMemberCounts[c.id] || c.memberCount || 0;
    const openCommunity = {
      ...c,
      isJoined: c.isJoined || chatCommunities.some(x => x.id === c.id),
      memberCount: Math.max(1, knownCount)
    };
    setChatCommunities(prev => prev.some(x => x.id === c.id)
      ? prev.map(x => x.id === c.id ? { ...x, ...openCommunity } : x)
      : [...prev, openCommunity]
    );
    setCommunityMemberCounts(prev => ({ ...prev, [c.id]: Math.max(1, prev[c.id] || knownCount) }));
    setActiveCommunityDetail(null);
    setActiveArtistProfile(null);
    setActiveAlbumProfile(null);
    setArtistSongs([]);
    setAlbumSongs([]);
    setChatTabMode('groups');
    setActiveTab('chat');
    setActiveChatUserId(c.id);
  };
  const joinCommunity = async (c: LiveCommunity) => {
    if (!currentUser) {
      showToast(t("Unauthorized"), "error");
      return;
    }
    const wasJoined = chatCommunities.some(x => x.id === c.id) || c.isJoined;
    const nextCount = Math.max(1, (communityMemberCounts[c.id] || c.memberCount || 0) + (wasJoined ? 0 : 1));
    try {
      await ensureCurrentUserProfile();
      const ensuredCommunity = await ensureArtistCommunity(c);
      await ensureCommunityMembership(ensuredCommunity.id);
      const persistedCommunity = { ...ensuredCommunity, isJoined: true, memberCount: nextCount };
      setChatCommunities(p => p.some(x => x.id === persistedCommunity.id) ? p.map(x => x.id === persistedCommunity.id ? { ...x, ...persistedCommunity } : x) : [...p, persistedCommunity]);
      setCommunityMemberCounts(prev => ({ ...prev, [persistedCommunity.id]: nextCount }));
      if (!wasJoined) setCommunityRecentMemberCounts(prev => ({ ...prev, [persistedCommunity.id]: (prev[persistedCommunity.id] || 0) + 1 }));
      openCommunityChat(persistedCommunity);
      void mutateActiveCommunityMemberIds?.((ids = []) => Array.from(new Set([...(ids as string[]), currentUser.id])), { revalidate: true });
      showToast(t("CommunityJoined"), "success");
    } catch (err) {
      logCommunityJoinError("joinCommunity", err, c.id);
      showToast(t("JoinFailed"), "error");
    }
  };
  const leaveActiveChat = async () => {
    if (!currentUser || !activeChatUserId) return;
    const leavingChatId = activeChatUserId;
    const isCommunity = isCommunityChatId(leavingChatId);
    const isChatGroup = leavingChatId.startsWith('g');
    try {
      if (isCommunity) {
        const previousCount = communityMemberCounts[leavingChatId] || chatCommunities.find(c => c.id === leavingChatId)?.memberCount || 1;
        const { error } = await supabase
          .from('community_members')
          .delete()
          .eq('community_id', leavingChatId)
          .eq('user_id', currentUser.id);
        if (error) {
          logCommunityJoinError("community_members.delete_self", error, leavingChatId);
          throw error;
        }
        setChatCommunities(prev => prev.filter(c => c.id !== leavingChatId));
        setCommunityMemberCounts(prev => ({ ...prev, [leavingChatId]: Math.max(0, previousCount - 1) }));
        void mutateActiveCommunityMemberIds?.((ids = []) => (ids as string[]).filter(id => id !== currentUser.id), { revalidate: true });
      } else if (isChatGroup) {
        const { error } = await supabase
          .from('group_members')
          .delete()
          .eq('group_id', leavingChatId)
          .eq('user_id', currentUser.id);
        if (error) throw error;
        setChatGroups(prev => prev.filter(g => g.id !== leavingChatId));
      }
      setShowChatDetails(false);
      setActiveChatUserId(null);
      setChatTabMode('groups');
      setActiveTab('chat');
      showToast(t("CommunityLeft"), "success");
    } catch (err) {
      console.warn("Chat leave failed", { chatId: leavingChatId, error: err });
      showToast(t("LeaveFailed"), "error");
    }
  };
  const handleCreateCommunity = async () => {
  if (!currentUser) {
    showToast(t("Unauthorized"), "error");
    return;
  }
  const tName = newCommName.trim();
  if (!tName || tName.length > 50) {
    showToast(t("InvalidNameLength"), "error");
    return;
  }
  const y = parseInt(newCommYear, 10);
  const m = parseInt(newCommMonth, 10);
  const d = parseInt(newCommDay, 10);
  if (isNaN(y) || isNaN(m) || isNaN(d) || y < 2024 || m < 1 || m > 12 || d < 1 || d > 31) {
    showToast(t("InvalidDateFormat"), "error");
    return;
  }
  const testDate = new Date(y, m - 1, d);
  if (testDate.getFullYear() !== y || testDate.getMonth() !== m - 1 || testDate.getDate() !== d) {
    showToast(t("InvalidCalendarDate"), "error");
    return;
  }
  const escapeHtml = (str: string) => str.replace(/[<&>]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c));
  const safeName = escapeHtml(tName);
  const formattedDate = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
  const commId = `com_custom_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  try {
    const { error: commError } = await supabase.from('custom_communities').insert([{
      id: commId,
      name: safeName,
      date: formattedDate,
      creator_id: currentUser.id
    }]);
    if (commError) {
      showToast(t("DatabaseInsertFailed"), "error");
      return;
    }
    const { error: memberError } = await supabase.from('community_members').insert([{
      community_id: commId,
      user_id: currentUser.id
    }]);
    if (memberError) {
      showToast(t("MembershipSaveFailed"), "error");
      return;
    }
    const newComm = {
      id: commId,
      name: safeName,
      date: formattedDate,
      memberCount: 1,
      isJoined: true,
      isVerified: false,
      reportedBy: []
    };
    setRealCommunities(prev => [...prev, newComm as any]);
    setChatCommunities(prev => [...prev, newComm as any]);
    setShowCreateCommunityModal(false);
    setNewCommName("");
    setNewCommYear("");
    setNewCommMonth("");
    setNewCommDay("");
    setChatTabMode('groups');
    setActiveTab('chat');
    setActiveChatUserId(commId);
    showToast(t("Success"), "success");
  } catch (err) {
    showToast(t("SystemError"), "error");
  }
};
  const handleReportCommunity = async (id: string) => {
  if (!currentUser) return;
  
  const target = realCommunities.find(c => c.id === id);
  if (target?.reportedBy?.includes(currentUser.id)) {
    showToast(t("ReportAlreadySubmitted"), "error");
    return;
  }

  if (window.confirm(t("ReportConfirm"))) {
    setRealCommunities(prev => prev.map(c =>
      c.id === id ? { ...c, reportedBy: [...(c.reportedBy || []), currentUser.id] } : c
    ));
    setActiveCommunityDetail(null);
    
    try {
      const { error } = await supabase
        .from('reports')
        .insert([{ reporter_id: currentUser.id, reported_id: id, type: 'community' }]);
        
      if (error) throw error;
      showToast(t("Success"), "success");
    } catch (err) {
      showToast(t("SystemError"), "error");
    }
  }
};

const handleRestoreCommunity = async (id: string) => {
  setRealCommunities(prev => prev.map(c => c.id === id ? { ...c, reportedBy: [] } : c));
  
  try {
    await supabase
      .from('reports')
      .delete()
      .eq('reported_id', id)
      .eq('type', 'community');
      
    showToast(t("Success"), "success");
  } catch (err) {
    showToast(t("SystemError"), "error");
  }
};

const handleDeleteCommunity = async (id: string) => {
  if (window.confirm(t("DeleteConfirm"))) {
    setRealCommunities(prev => prev.filter(c => c.id !== id));
    
    try {
      if (id.startsWith('com_custom_')) {
        await supabase
          .from('custom_communities')
          .delete()
          .eq('id', id);
      }
      
      await supabase
        .from('reports')
        .delete()
        .eq('reported_id', id)
        .eq('type', 'community');
        
      showToast(t("Success"), "success");
    } catch (err) {
      showToast(t("SystemError"), "error");
    }
  }
};
  // 💡 ステップ11: @メンションに加えて、#ハッシュタグもタップ可能にする（緑色のリンク化）
  // 💡 ステップ11: @メンションはプロフィールへ、#ハッシュタグはコミュニティ検索へ飛ぶ
  const parseMention = (cap: string) => {
    if (!cap) return "";
    const parts = cap.split(/(@[\w._]+|#[\wぁ-んァ-ヶA-Za-z0-9_]+)/);
    return parts.map((x, i) => {
      if (x.startsWith('@')) {
        const h = x.substring(1);
        const u = [...allProfiles, myProfile].find(y => y.handle === h);
        if (u) {
          return <span key={i} onClick={(e) => { e.stopPropagation(); if (u.id === myProfile.id) setActiveTab('profile'); else { setViewingUser(u); setActiveTab('other_profile'); } }} className="text-[#1DB954] font-bold cursor-pointer hover:underline relative z-20 pointer-events-auto">@{h}</span>;
        }
      } else if (x.startsWith('#')) {
        // 💡 ここを変更！ コミュニティ検索のタブに切り替え、キーワードをセットする
        return <span key={i} onClick={(e) => { e.stopPropagation(); switchBottomTab('search'); setDiscoverTabMode('communities'); setCommunitySearchQuery(x.substring(1)); }} className="text-[#1DB954] font-bold cursor-pointer hover:underline relative z-20 pointer-events-auto">{x}</span>;
      }
      return x;
    });
  };
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !currentUser) {
    return;
  }
  if (!file.type.startsWith("image/")) {
    showToast(t("InvalidFileType"), "error");
    e.target.value = "";
    return;
  }
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    showToast(t("FileSizeLimitExceeded"), "error");
    e.target.value = "";
    return;
  }
  showToast(t("Uploading"), "success");
  try {
    let uploadFile = file;
    try {
      uploadFile = await compressImage(file);
    } catch (compressErr) {
      uploadFile = file;
    }
    const fileName = `avatar_${currentUser.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpeg`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, uploadFile);
    if (uploadError) {
      showToast(t("UploadFailed"), "error");
      return;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    if (data && data.publicUrl) {
      setEditAvatar(data.publicUrl);
      showToast(t("Success"), "success");
    }
  } catch (err) {
    showToast(t("SystemError"), "error");
  } finally {
    e.target.value = "";
  }
};
  // 💡 チャットで画像・ファイルを送る機能（画像の場合は自動圧縮）
	  const handleChatFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
	    let file = e.target.files?.[0];
	    if (!file || !currentUser || !activeChatUserId) return;
	    if (!canAccessChatTarget(activeChatUserId)) {
	      showToast(t("Unauthorized"), "error");
	      e.target.value = "";
	      return;
	    }
		    showToast(t('chatFileSending'), "success");
    const isImage = file.type.startsWith('image/');
    try {
      // 💡 画像なら圧縮し、それ以外のファイル（PDFなど）はそのまま扱う
      if (isImage) { file = await compressImage(file); }
      const fileExt = file.name.split('.').pop() || "jpeg";
      const fileName = `chat-${currentUser.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const tempId = Date.now().toString();
      const fileText = isImage ? `[IMAGE]${data.publicUrl}` : `[FILE]${file.name}|${data.publicUrl}`;
      const newMsg = { id: tempId, senderId: currentUser.id, text: fileText, timestamp: Date.now(), isRead: false };
      setChatHistory(prev => ({ ...prev, [activeChatUserId]: [...(prev[activeChatUserId] || []), newMsg as any] }));
      const { data: dbData } = await supabase.from('chat_messages').insert([{ sender_id: currentUser.id, target_id: activeChatUserId, text: fileText }]).select().single();
      if (dbData) {
        setChatHistory(prev => {
          const history = prev[activeChatUserId] || [];
          return { ...prev, [activeChatUserId]: history.map(m => m.id === tempId ? { ...m, id: dbData.id } as any : m) };
        });
      }
    } catch (err) {
	      showToast(t('chatFileSendFailed'), "error");
    }
  };
  // 💡 音声録音パネルの機能（録音開始、停止、キャンセル、プレビュー再生、送信）
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setDraftVoice({ blob: audioBlob, url: audioUrl });
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      showToast(t("MicrophonePermissionRequired"), "error");
    }
  };
  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };
  const cancelVoiceRecording = () => {
    stopVoiceRecording();
    setDraftVoice(null);
    setRecordingSeconds(0);
    setShowVoiceMenu(false);
    setIsPlayingDraft(false);
  };
  const toggleDraftPlay = () => {
    if (!draftAudioRef.current) return;
    if (isPlayingDraft) {
      draftAudioRef.current.pause();
      setIsPlayingDraft(false);
    } else {
      draftAudioRef.current.play();
      setIsPlayingDraft(true);
    }
  };
	  const sendVoiceMessage = async () => {
	  if (!draftVoice || !currentUser || !activeChatUserId) {
	    return;
	  }
	  if (!canAccessChatTarget(activeChatUserId)) {
	    showToast(t("Unauthorized"), "error");
	    return;
	  }
	  const MAX_AUDIO_SIZE = 15 * 1024 * 1024;
  if (draftVoice.blob.size > MAX_AUDIO_SIZE) {
    showToast(t("AudioSizeLimitExceeded"), "error");
    return;
  }
  const tempVoice = draftVoice;
  cancelVoiceRecording();
  const tempId = `msg_voice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const tempFileText = `[VOICE]${tempVoice.url}`;
  const newTempMsg = { id: tempId, senderId: currentUser.id, text: tempFileText, timestamp: Date.now(), isRead: false };
  setChatHistory(prev => ({ ...prev, [activeChatUserId]: [...(prev[activeChatUserId] || []), newTempMsg as any] }));
  try {
    const fileName = `voice_${currentUser.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.webm`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, tempVoice.blob);
    if (uploadError) {
      throw uploadError;
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const realFileText = `[VOICE]${urlData.publicUrl}`;
    const { data: dbData, error: dbError } = await supabase
      .from('chat_messages')
      .insert([{ sender_id: currentUser.id, target_id: activeChatUserId, text: realFileText }])
      .select()
      .single();
    if (dbError) {
      throw dbError;
    }
    if (dbData) {
      setChatHistory(prev => {
        const history = prev[activeChatUserId] || [];
        return { ...prev, [activeChatUserId]: history.map(m => m.id === tempId ? { ...m, id: dbData.id, text: realFileText } as any : m) };
      });
    }
  } catch (err) {
    showToast(t("VoiceSendFailed"), "error");
    setChatHistory(prev => ({ ...prev, [activeChatUserId]: (prev[activeChatUserId] || []).filter(m => m.id !== tempId) }));
  }
};
  const toggleFollow = async (targetUserId: string) => {
    if (!currentUser || !currentUser.id) return;
    const isFollowing = followedUsers.has(targetUserId);
    setFollowedUsers(prev => {
      const next = new Set(prev);
      if (isFollowing) {
        next.delete(targetUserId);
      } else {
        next.add(targetUserId);
      }
      return next;
    });
    setAllFollows(prev => {
      if (isFollowing) {
        return prev.filter(f => !(f.follower_id === currentUser.id && f.following_id === targetUserId));
      } else {
        return [...prev, { follower_id: currentUser.id, following_id: targetUserId }];
      }
    });
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetUserId);
        if (error) throw error;
        showToast(t("UnfollowedToast"), "success");
      } else {
        const { error } = await supabase
          .from('follows')
          .insert([{ follower_id: currentUser.id, following_id: targetUserId }]);
        if (error) throw error;
        showToast(t("FollowedToast"), "success");
      }
    } catch (err) {
      setFollowedUsers(prev => {
        const next = new Set(prev);
        if (isFollowing) {
          next.add(targetUserId);
        } else {
          next.delete(targetUserId);
        }
        return next;
      });
      setAllFollows(prev => {
        if (isFollowing) {
          return [...prev, { follower_id: currentUser.id, following_id: targetUserId }];
        } else {
          return prev.filter(f => !(f.follower_id === currentUser.id && f.following_id === targetUserId));
        }
      });
      showToast(t("OperationFailed"), "error");
    }
  };
  const handleBlockUser = async (userId: string) => {
    if (!currentUser) return;
    if (window.confirm(t("BlockUserConfirm"))) {
      setBlockedUsers(prev => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
      handleGoBack();
      try {
        const { error } = await supabase
          .from('blocks')
          .insert([{ blocker_id: currentUser.id, blocked_id: userId }]);
        if (error) throw error;
        showToast(t("UserBlocked"), "success");
      } catch (err) {
        console.error(err);
        setBlockedUsers(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
        showToast(t("BlockFailed"), "error");
      }
    }
  };
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);
  const displayBlockedUsers = useMemo(() => allProfiles.filter(u => blockedUsers.has(u.id)), [allProfiles, blockedUsers]);
  const handleUnblockUser = async (userId: string) => {
    if (!currentUser) return;
    setBlockedUsers(prev => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
    try {
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', currentUser.id)
        .eq('blocked_id', userId);
      if (error) throw error;
      showToast(t("UserUnblocked"), "success");
    } catch (err) {
      console.warn(err);
      setBlockedUsers(prev => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
      showToast(t("NetworkError"), "error");
    }
  };
  useEffect(() => {
    if (!currentUser) return;
    const fetchBlockedUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('blocks')
          .select('blocked_id')
          .eq('blocker_id', currentUser.id);
        if (data && !error) {
          setBlockedUsers(new Set(data.map((d: any) => d.blocked_id)));
        }
      } catch (err) {
        console.warn(err);
      }
    };
    fetchBlockedUsers();
  }, [currentUser]);
  const handleReportUser = async (userId: string) => {
    if (!currentUser) return;
    if (window.confirm(t("ReportUserConfirm"))) {
      try {
        const { error } = await supabase
          .from('reports')
          .insert([{ reporter_id: currentUser.id, reported_id: userId, type: 'user' }]);
        if (error) throw error;
        showToast(t("UserReported"), "success");
      } catch (err: any) {
        console.error("通報エラー:", err);
        showToast(t("ReportFailed"), "error");
      }
    }
  };
  const saveProfile = () => {
    setMyProfile({ ...myProfile, name: editName, handle: editHandle.replace('@', ''), bio: editBio, isPrivate: editIsPrivate, avatar: editAvatar, hashtags: (editHashtags || "").split(',').map(s => s.trim()).filter(s => s), liveHistory: (editLiveHistory || "").split(',').map(s => s.trim()).filter(s => s) });
    setIsEditingProfile(false); showToast(t("ProfileSaved"));
  };
  const handleShareVibe = (s: Song) => {
    if (navigator.share) { navigator.share({ title: `Echoes - ${s.title}`, text: `${s.user.name}のVibeをチェック！`, url: 'https://echo.es' }).catch(() => { }); }
    else { showToast(t("CopiedUrl")); }
  };
  const handleShareApp = () => {
    if (navigator.share) { navigator.share({ title: 'Echoes', url: 'https://echo.es' }).catch(() => { }); }
    else { showToast(t("CopiedUrl")); }
  };
  const handleLogin = async () => {
  if (!email || !password) {
    showToast(t("ValidationError"), "error");
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast(t("InvalidEmailFormat"), "error");
    return;
  }
  setIsAuthLoading(true);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showToast(t("AuthFailed"), "error");
    } else if (data.user) {
      setCurrentUser(data.user);
      setIsLoggedIn(true);
      showToast(t("Success"), "success");
    }
  } catch (err) {
    showToast(t("SystemError"), "error");
  } finally {
    setIsAuthLoading(false);
  }
};
  const handlePasswordResetRequest = async () => {
    if (!email) {
      showToast(getPasswordResetText("missingEmail"), "error");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast(getPasswordResetText("invalidEmail"), "error");
      return;
    }
    setIsAuthLoading(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        showToast(mapPasswordResetAuthError(error), "error");
        return;
      }
      showToast(getPasswordResetText("sent"), "success");
      setAuthMode('login');
      setPassword("");
    } catch {
      showToast(getPasswordResetText("sendFailed"), "error");
    } finally {
      setIsAuthLoading(false);
    }
  };
  const saveProfileChanges = async () => {
  if (!currentUser) return;
  const tName = editName.trim();
  const tHandle = editHandle.trim().replace(/^@/, '');
  const tBio = editBio.trim();
  if (!tName || tName.length > 50) {
    showToast(t("InvalidNameLength"), "error");
    return;
  }
  if (!/^[A-Za-z0-9_]{3,20}$/.test(tHandle)) {
    showToast(t("InvalidHandleFormat"), "error");
    return;
  }
  if (tBio.length > 160) {
    showToast(t("BioTooLong"), "error");
    return;
  }
  const escapeHtml = (str: string) => {
    return str.replace(/[<&>]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c));
  };
  const safeBio = escapeHtml(tBio);
  const sanitizeUrl = (url: string) => {
    if (!url) return "";
    try {
      const u = new URL(url.trim());
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return "";
      }
      return u.origin + u.pathname;
    } catch {
      return "";
    }
  };
  const cleanTwitter = sanitizeUrl(editTwitter);
  const cleanInstagram = sanitizeUrl(editInstagram);
  const newHashtags = (editHashtags || "").split(',').map(s => s.trim()).filter(Boolean);
  const newLiveHistory = (editLiveHistory || "").split(',').map(s => s.trim()).filter(Boolean);
  try {
    const dbUpdateData = {
      name: tName,
      handle: tHandle,
      bio: safeBio,
      avatar: editAvatar,
      twitterUrl: cleanTwitter,
      instagramUrl: cleanInstagram,
      isPrivate: editIsPrivate,
      hashtags: newHashtags,
      liveHistory: newLiveHistory
    };
    const { error } = await supabase
      .from('profiles')
      .update(dbUpdateData)
      .eq('id', currentUser.id);
    if (error) {
      showToast(t("UpdateFailed"), "error");
      return;
    }
    setMyProfile(prev => ({ ...prev, ...dbUpdateData } as any));
    setAllProfiles(prev => prev.map(p => p.id === currentUser.id ? { ...p, ...dbUpdateData } as any : p));
    setIsEditingProfile(false);
    showToast(t("Success"), "success");
  } catch (err) {
    showToast(t("SystemError"), "error");
  }
};
  const addOnboardingTag = (
    value: string,
    setValue: (value: string) => void,
    items: string[],
    setItems: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const nextValue = value.trim().replace(/^#/, '');
    if (!nextValue) return;
    if (items.some(item => item.toLowerCase() === nextValue.toLowerCase())) {
      setValue("");
      return;
    }
    setItems(prev => [...prev, nextValue].slice(0, 8));
    setValue("");
  };
  const removeOnboardingTag = (value: string, setItems: React.Dispatch<React.SetStateAction<string[]>>) => {
    setItems(prev => prev.filter(item => item !== value));
  };
  const handleOnboardingTextKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    value: string,
    setValue: (value: string) => void,
    items: string[],
    setItems: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addOnboardingTag(value, setValue, items, setItems);
  };
  const saveInitialOnboarding = async () => {
    if (!currentUser) return;
    const tName = editName.trim();
    const tHandle = editHandle.trim().replace(/^@/, '');
    if (!tName || tName.length > 50) {
      showToast(t("InvalidNameLength"), "error");
      return;
    }
    if (!/^[A-Za-z0-9_]{3,20}$/.test(tHandle)) {
      showToast(t("InvalidHandleFormat"), "error");
      return;
    }
    const newHashtags = [
      ...onboardingGenres.map(tag => makeMusicTag("genre", tag)),
      ...onboardingArtists.map(tag => makeMusicTag("artist", tag)),
      ...onboardingHashtags.map(tag => makeMusicTag("tag", tag)),
    ]
      .map(tag => tag.trim().replace(/^#/, ''))
      .filter(Boolean)
      .filter((tag, index, arr) => arr.findIndex(item => item.toLowerCase() === tag.toLowerCase()) === index);
    const newLiveHistory = onboardingLiveHistory
      .map(item => item.trim())
      .filter(Boolean)
      .filter((item, index, arr) => arr.findIndex(x => x.toLowerCase() === item.toLowerCase()) === index);
    const newTopArtists = onboardingArtists
      .map(item => item.trim())
      .filter(Boolean)
      .filter((item, index, arr) => arr.findIndex(x => x.toLowerCase() === item.toLowerCase()) === index);

    if (newHashtags.length === 0 && newLiveHistory.length === 0) {
      showToast(t("MusicProfileRequired"), "error");
      return;
    }

    try {
      const dbUpdateData = {
        name: tName,
        handle: tHandle,
        avatar: editAvatar,
        hashtags: newHashtags,
        liveHistory: newLiveHistory,
        topArtists: newTopArtists
      };
      const { error } = await supabase
        .from('profiles')
        .update(dbUpdateData)
        .eq('id', currentUser.id);
      if (error) {
        showToast(t("UpdateFailed"), "error");
        return;
      }
      setMyProfile(prev => ({ ...prev, ...dbUpdateData } as any));
      setAllProfiles(prev => prev.map(p => p.id === currentUser.id ? { ...p, ...dbUpdateData } as any : p));
      window.localStorage.setItem(getOnboardingSkippedKey(currentUser.id), 'true');
      setShowInitialOnboarding(false);
      setPeopleMusicFilter({ hashtags: newHashtags.map(getMusicTagLabel), liveHistories: newLiveHistory });
      setDiscoverTabMode('users');
      skipHistoryRef.current = true;
      setHistoryStack([]);
      setViewingUser(null);
      setActiveTab('search');
      showToast(t("MusicProfileSaved"), "success");
    } catch (err) {
      showToast(t("SystemError"), "error");
    }
  };
  const handleSignUp = async () => {
  if (!email || !password) {
    showToast(t("ValidationError"), "error");
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast(t("InvalidEmailFormat"), "error");
    return;
  }
  const pwRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
  if (!pwRegex.test(password)) {
    showToast(t("WeakPassword"), "error");
    return;
  }
  setIsAuthLoading(true);
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      showToast(t("SignupFailed"), "error");
      return;
    }
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      showToast(t("EmailAlreadyInUse"), "error");
      return;
    }
    if (data.user) {
      const defaultName = email.split('@')[0];
      const { error: profileError } = await supabase.from('profiles').insert([{
        id: data.user.id,
        name: defaultName,
        handle: defaultName,
        avatar: "/default-avatar.png",
        bio: "Hello"
      }]);
      if (profileError) {
        showToast(t("ProfileCreationError"), "error");
        return;
      }
      setSignupSuccess(true);
    }
  } catch (err) {
    showToast(t("SystemError"), "error");
  } finally {
    setIsAuthLoading(false);
  }
};
  // 💡 ステップ8: ログアウト・退会機能の完全実装
  const handleLogout = async () => {
    showToast(t("LoggingOut"));
    await supabase.auth.signOut();
    // キャッシュやReactの状態を完全にリセットしてトップへ戻す
    window.location.href = '/';
  };
  const handleDeleteAccount = async () => {
  if (!currentUser) return;
  showToast(t("DeletingAccount"), "success");
  try {
    const { error: rpcError } = await supabase.rpc('delete_user', { target_id: currentUser.id });
    if (rpcError) {
      showToast(t("DeleteFailed"), "error");
      return;
    }
    await supabase.auth.signOut();
    window.location.href = '/';
  } catch (err) {
    showToast(t("SystemError"), "error");
  }
};
  const DrumrollPickerModal = () => {
    const monthList = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
    const yearList = useMemo(() => Array.from({ length: 10 }, (_, i) => 2024 + i), []);
    const monthRef = useRef<HTMLDivElement>(null);
    const yearRef = useRef<HTMLDivElement>(null);
    const [selectedM, setSelectedM] = useState(currentMonth);
    const [selectedY, setSelectedY] = useState(currentYear);
    // 💡 開いた瞬間に、今の年月の位置へ正確にスクロールさせる
    useEffect(() => {
      if (monthRef.current) monthRef.current.scrollTop = (currentMonth - 1) * 50;
      if (yearRef.current) {
        const index = yearList.indexOf(currentYear);
        if (index !== -1) yearRef.current.scrollTop = index * 50;
      }
    }, []);
    const confirmSelection = () => { setCalendarDate(new Date(selectedY, selectedM - 1, 1)); setShowDrumrollModal(false); };
    const handleYearScroll: React.UIEventHandler<HTMLDivElement> = (e) => { const i = Math.round(e.currentTarget.scrollTop / 50); const y = yearList[i]; if (y) setSelectedY(y); };
    const handleMonthScroll: React.UIEventHandler<HTMLDivElement> = (e) => { const i = Math.round(e.currentTarget.scrollTop / 50); const m = monthList[i]; if (m) setSelectedM(m); };
    return (
      <CalendarMonthYearPicker
        monthRef={monthRef}
        yearRef={yearRef}
        monthList={monthList}
        yearList={yearList}
        selectedMonth={selectedM}
        selectedYear={selectedY}
        cancelLabel={t('cancel')}
        titleLabel={t('selectYearMonth')}
        setLabel={t('set')}
        formatMonth={(m) => t('monthSuffix').replace('{month}', m.toString().padStart(2, '0'))}
        formatYear={(y) => t('yearSuffix').replace('{year}', String(y))}
        onClose={() => setShowDrumrollModal(false)}
        onConfirm={confirmSelection}
        onMonthScroll={handleMonthScroll}
        onYearScroll={handleYearScroll}
      />
    );
  };
  const renderCalendar = () => (
    <div className="w-full max-w-md mx-auto mt-4 px-4 animate-fade-in">
      <div className="flex justify-between items-center mb-8 h-12">
        <button onClick={() => setCalendarDate(new Date(currentYear, currentMonth - 2, 1))} className="text-zinc-500 hover:text-white p-2"><IconChevronLeft /></button>
        <div className="relative group cursor-pointer flex justify-center items-center h-full px-4" onClick={() => setShowDrumrollModal(true)}>
          <div className="inline-flex items-center gap-2 text-xl font-bold tracking-widest text-zinc-300">{currentYear} . {currentMonth.toString().padStart(2, '0')} <IconChevronDown /></div>
        </div>
        <button onClick={() => setCalendarDate(new Date(currentYear, currentMonth, 1))} className="text-zinc-500 hover:text-white p-2"><IconChevronRight /></button>
      </div>
      {/* 💡 修正ポイント: gap-y-12 にして、上下のマス目の間隔（空白）をガッツリ広げた！ */}
      <div className="grid grid-cols-7 gap-x-2 gap-y-12">
        {[...Array(daysInMonth)].map((_, i) => {
          const day = i + 1;
          const userVibes = (activeTab === 'calendar' || activeTab === 'profile') ? vibes.filter(v => v.user.id === myProfile.id) : allFeedVibes.filter(v => v.user.id === viewingUser?.id);
          const v = userVibes.find(x => x.year === currentYear && x.month === currentMonth && x.dayIndex === day);
          return (
            <div key={i} className="relative flex flex-col items-center group">
              {/* 💡 ジャケット画像のサイズは通常のまま（小さくしない） */}
              <div className={`w-full aspect-square rounded-[10px] flex items-center justify-center relative overflow-hidden ${v ? 'bg-[#1c1c1e] border border-zinc-800/50 shadow-md' : 'bg-black border border-zinc-800/30'}`}>
                {v ? (
                  <>
                    <img src={v.imgUrl} className="absolute inset-0 w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setSelectedCalendarPopupVibe(v)} />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-black/40">
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePlay(v.previewUrl, { title: v.title, artist: v.artist, imgUrl: v.imgUrl }); }} className="w-8 h-8 bg-black/80 rounded-full flex items-center justify-center text-white pointer-events-auto shadow-xl hover:scale-110 transition-transform relative z-50">
                        {playingSong === v.previewUrl ? <IconStop /> : <IconPlay />}
                      </button>
                    </div>
                  </>
                ) : (
                  <span className="text-[10px] text-zinc-700 font-bold">{day}</span>
                )}
              </div>
              {/* 💡 広げた下の空白スペースに、曲名とアーティスト名を配置！ */}
              {v && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-[180%] mt-1.5 flex flex-col items-center justify-start z-20 pointer-events-none">
                  <p className="text-[9px] font-bold text-white truncate w-full text-center drop-shadow-md leading-tight">{v.title}</p>
                  {/* アーティスト名をクリック可能にして、詳細画面へ飛べるように設定 */}
                  <p
                    onClick={(e) => handleArtistClick(e, v.artistId, v.artist, v.imgUrl)}
                    className="text-[8px] font-black text-[#1DB954] hover:underline cursor-pointer truncate w-full text-center drop-shadow-md mt-0.5 pointer-events-auto relative z-30"
                  >
                    {v.artist}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
  // 💡 追加: ダイアリー画面専用の縦型タイムライン（自分の投稿の全貌を表示）
  const renderDiaryTimeline = () => (
    <div className="w-full max-w-md mx-auto mt-4 px-4 animate-fade-in">
      <div className="flex justify-between items-center mb-10 h-12">
        <button onClick={() => setCalendarDate(new Date(currentYear, currentMonth - 2, 1))} className="text-zinc-500 hover:text-white p-2"><IconChevronLeft /></button>
        <div className="relative group cursor-pointer flex justify-center items-center h-full px-4" onClick={() => setShowDrumrollModal(true)}>
          <div className="inline-flex items-center gap-2 text-xl font-bold tracking-widest text-zinc-300">{currentYear} . {currentMonth.toString().padStart(2, '0')} <IconChevronDown /></div>
        </div>
        <button onClick={() => setCalendarDate(new Date(currentYear, currentMonth, 1))} className="text-zinc-500 hover:text-white p-2"><IconChevronRight /></button>
      </div>
      <div className="flex flex-col gap-6 relative">
        <div className="absolute left-[23px] top-2 bottom-2 w-px bg-zinc-800/80 z-0"></div>
        {[...Array(daysInMonth)].map((_, i) => {
          const day = i + 1;
          const userVibes = vibes.filter(v => v.user.id === myProfile.id);
          const v = userVibes.find(x => x.year === currentYear && x.month === currentMonth && x.dayIndex === day);
          return (

            <div key={i} className="flex items-start gap-5 relative z-10">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm transition-colors mt-2 ${v ? 'bg-[#1c1c1e] border-2 border-[#1DB954] text-white shadow-[0_0_15px_rgba(29,185,84,0.2)]' : 'bg-black border border-zinc-800 text-zinc-600'}`}>
                {day}
              </div>
              <div className="flex-1 min-h-[64px] flex items-center">
                {v ? (
                  <div className="bg-[#1c1c1e] rounded-[24px] p-4 w-full border border-zinc-800/50 shadow-lg flex flex-col">
                    <div className="flex gap-4 items-center mb-3">
                      <div className="relative w-16 h-16 flex-shrink-0 group rounded-xl overflow-hidden shadow-md cursor-pointer" onClick={() => setSelectedCalendarPopupVibe(v)}>
                        <img src={v.imgUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePlay(v.previewUrl, { title: v.title, artist: v.artist, imgUrl: v.imgUrl }); }} className="w-8 h-8 bg-black/80 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform" title={playingSong === v.previewUrl ? t('feedStopPreview') : t('feedPlayPreview')} aria-label={playingSong === v.previewUrl ? t('feedStopPreview') : t('feedPlayPreview')}>
                            {playingSong === v.previewUrl ? <IconStop /> : <IconPlay />}
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-hidden flex flex-col justify-center">
                        <p className="font-bold text-sm text-white truncate leading-tight">{v.title}</p>
                        <p onClick={(e) => handleArtistClick(e, v.artistId, v.artist, v.imgUrl)} className="text-xs font-black text-[#1DB954] hover:underline cursor-pointer truncate mt-1 inline-block w-fit relative z-20">
                          {v.artist}
                        </p>
                      </div>
                    </div>
                    {/* 💡 投稿のテキスト（キャプション）を表示 */}
                    {v.caption && (
                      <p className="text-xs text-white mb-3 leading-relaxed">{parseMention(v.caption)}</p>
                    )}
                    {/* 💡 いいね・コメント・削除ボタンを追加 */}
                    <div className="flex gap-6 border-t border-zinc-800/60 pt-3">
                      <button onClick={() => toggleLike(v.id)} className="flex items-center gap-2 text-xs" title={t('feedLike')} aria-label={t('feedLike')}><IconHeart filled={v.isLiked} />{formatCount(v.likes)}</button>
                      <button onClick={() => setActiveCommentSongId(activeCommentSongId === v.id ? null : v.id)} className="flex items-center gap-2 text-xs" title={t('feedComments')} aria-label={t('feedComments')}><IconComment />{formatCount(v.comments.length)}</button>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteVibe(v.id); }} className="text-[10px] font-bold text-zinc-600 hover:text-red-500 uppercase tracking-widest ml-auto p-1" title={t('feedDelete')} aria-label={t('feedDelete')}>{t('feedDelete')}</button>
                    </div>
                    {activeCommentSongId === v.id && (
                      <div className="mt-3 bg-black border border-zinc-800/80 rounded-xl p-3 animate-fade-in">
                        <div className="flex flex-col gap-2 mb-3 max-h-[100px] overflow-y-auto scrollbar-hide">
                          {v.comments.map(c => (<div key={c.id} className="text-[11px]"><span className="font-bold text-[#1DB954] mr-2">@{c.user.handle}</span><span className="text-zinc-300">{c.text}</span></div>))}
                          {v.comments.length === 0 && <p className="text-[10px] text-zinc-500">{t('feedNoComments')}</p>}
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); submitComment(v.id); }} className="flex gap-2 items-center">
                          <input type="text" placeholder={t('feedCommentPlaceholder')} value={commentInput} onChange={e => setCommentInput(e.target.value)} className="flex-1 bg-[#1c1c1e] rounded-full px-3 py-1.5 text-xs focus:outline-none" />
                          <button type="submit" className="text-[10px] font-bold text-black bg-white px-3 py-1.5 rounded-full">{t('feedPostComment')}</button>
                        </form>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full border-b border-zinc-900 flex items-center opacity-50"></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
const renderFeedCard = (s: Song) => (
  <FeedCard
    key={s.id}
    song={s}
    timeZone={timeZone}
    myProfileId={myProfile.id}
    currentUserId={currentUser?.id}
    playingSong={playingSong}
    activeCommentSongId={activeCommentSongId}
    commentInput={commentInput}
    formatCount={formatCount}
    displayLocalTime={displayLocalTime}
    renderCaption={parseMention}
    labels={{
      share: t('feedShare'),
      delete: t('feedDelete'),
      like: t('feedLike'),
      comments: t('feedComments'),
      playPreview: t('feedPlayPreview'),
      stopPreview: t('feedStopPreview'),
      noComments: t('feedNoComments'),
      commentPlaceholder: t('feedCommentPlaceholder'),
      postComment: t('feedPostComment'),
    }}
    onOpenUser={(user) => { setViewingUser(user); setActiveTab('other_profile'); }}
    onOpenOwnProfile={() => setActiveTab('profile')}
    onShareVibe={handleShareVibe}
    onDeleteVibe={deleteVibe}
    onTogglePlay={togglePlay}
    onArtistClick={handleArtistClick}
    onToggleLike={toggleLike}
    onToggleComments={(id) => setActiveCommentSongId(activeCommentSongId === id ? null : id)}
    onCommentInputChange={setCommentInput}
    onSubmitComment={submitComment}
  />
);
  useEffect(() => {
    const hasOpenModal = 
      showSettingsMenu || showRevenueDashboard || isEditingProfile || showInitialOnboarding || showBlockedUsersModal || 
      showAppInfoModal || showUserListModal !== null || showMutualFriendsModal || showWriteArticleModal || 
      showPublishSettingsModal || showCoinChargeModal || showCommCalendar || showMatchFilterModal || 
      showCreateGroupModal || showCreateCommunityModal || showNotifications || showDeleteAccountConfirm || 
      showAdminDashboard || showPastArticleModal || showDrumrollModal || showCommDrumroll || 
      showDraftSaveDialog || showPostOverrideConfirm !== null || draftSong !== null || 
      viewingChatImage !== null || viewingArticle !== null || activeArtistProfile !== null || activeAlbumProfile !== null;

    if (hasOpenModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => { 
      document.body.style.overflow = ''; 
    };
  }, [
    showSettingsMenu, showRevenueDashboard, isEditingProfile, showInitialOnboarding, showBlockedUsersModal, 
    showAppInfoModal, showUserListModal, showMutualFriendsModal, showWriteArticleModal, 
    showPublishSettingsModal, showCoinChargeModal, showCommCalendar, showMatchFilterModal, 
    showCreateGroupModal, showCreateCommunityModal, showNotifications, showDeleteAccountConfirm, 
    showAdminDashboard, showPastArticleModal, showDrumrollModal, showCommDrumroll, 
    showDraftSaveDialog, showPostOverrideConfirm, draftSong, viewingChatImage, viewingArticle,
    activeArtistProfile, activeAlbumProfile
  ]);

  const onboardingGenreCandidates = useMemo(() => {
    const fromProfiles = allProfiles
      .flatMap(profile => profile.hashtags || [])
      .filter(tag => isMusicTagCategory(tag, "genre"))
      .map(getMusicTagLabel);
    return [...new Set([...DEFAULT_ONBOARDING_GENRES, ...fromProfiles])].slice(0, 16);
  }, [allProfiles]);
  const onboardingHashtagCandidates = useMemo(() => {
    const fromProfiles = allProfiles
      .flatMap(profile => profile.hashtags || [])
      .filter(tag => isMusicTagCategory(tag, "tag"))
      .map(getMusicTagLabel);
    return [...new Set([...DEFAULT_ONBOARDING_HASHTAGS, ...fromProfiles])].slice(0, 16);
  }, [allProfiles]);
  const onboardingLiveCandidates = useMemo(() => {
    const fromProfiles = allProfiles
      .flatMap(profile => profile.liveHistory || [])
      .filter(isOnboardingLiveCandidate);
    return [...new Set([...DEFAULT_ONBOARDING_LIVE_HISTORY, ...fromProfiles])].slice(0, 16);
  }, [allProfiles]);
  const toggleOnboardingChoice = (
    value: string,
    items: string[],
    setItems: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (items.includes(value)) {
      setItems(prev => prev.filter(item => item !== value));
      return;
    }
    setItems(prev => [...prev, value].slice(0, 8));
  };
  const getOnboardingChoiceDisplayLabel = (candidate: string) => {
    const labels = localI18n[language]?.onboardingDefaultChoiceLabels;
    return labels?.[candidate] || candidate;
  };
  const renderOnboardingChipPicker = (
    label: string,
    candidates: string[],
    items: string[],
    setItems: React.Dispatch<React.SetStateAction<string[]>>,
    prefix = ""
  ) => (
    <div>
      <label className="text-[10px] text-zinc-500 ml-1 mb-2 block font-bold">{label}</label>
      <div className="flex flex-wrap gap-2">
        {candidates.map(candidate => {
          const isSelected = items.includes(candidate);
          return (
            <button
              key={candidate}
              type="button"
              onClick={() => toggleOnboardingChoice(candidate, items, setItems)}
              className={`px-3 py-2 rounded-full border text-[11px] font-bold transition-colors ${isSelected ? 'bg-[#1DB954] border-[#1DB954] text-black' : 'bg-black border-zinc-800 text-zinc-300 hover:text-white'}`}
            >
              {prefix}{getOnboardingChoiceDisplayLabel(candidate)}
            </button>
          );
        })}
      </div>
    </div>
  );
  const renderOnboardingTextAdd = (
    placeholder: string,
    value: string,
    setValue: (value: string) => void,
    items: string[],
    setItems: React.Dispatch<React.SetStateAction<string[]>>
  ) => (
    <div className="flex gap-2 mt-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => handleOnboardingTextKeyDown(e, value, setValue, items, setItems)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-black border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-zinc-500"
      />
      <button
        type="button"
        onClick={() => addOnboardingTag(value, setValue, items, setItems)}
        className="px-4 bg-white text-black rounded-xl text-xs font-bold shrink-0"
      >
        {t('add')}
      </button>
    </div>
  );

  const closeChatMusicPicker = () => { setShowChatMusicSelector(false); setSelectedChatSong(null); setChatMusicComment(""); };
  const handleSendChatMusicShare = async () => {
    if (!activeChatUserId || !currentUser || !selectedChatSong) return;
    if (!canAccessChatTarget(activeChatUserId)) {
      showToast(t("Unauthorized"), "error");
      return;
    }

    const commentText = chatMusicComment.trim();
    if (commentText.length > 500) {
      showToast(t("TextLimitExceeded"), "error");
      return;
    }

    const escapeHtml = (str: string) => str.replace(/[<&>|]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '|': '&#124;' }[c] || c));
    
    const safeTrackName = escapeHtml(selectedChatSong.trackName || "");
    const safeArtistName = escapeHtml(selectedChatSong.artistName || "");
    const safeComment = escapeHtml(commentText);

    const now = Date.now();
    const tempMusicId = `msg_music_${now}_${Math.random().toString(36).substring(2, 9)}`;
    const tempTextId = `msg_text_${now}_${Math.random().toString(36).substring(2, 9)}`;

    const fileText = `[MUSIC]${selectedChatSong.trackId}|${safeTrackName}|${safeArtistName}|${selectedChatSong.artworkUrl100}|${selectedChatSong.previewUrl}`;

    const newMessages = [{ id: tempMusicId, senderId: currentUser.id, text: fileText, timestamp: now, isRead: false }];
    if (safeComment) {
      newMessages.push({ id: tempTextId, senderId: currentUser.id, text: safeComment, timestamp: now + 1, isRead: false });
    }

    setChatHistory(prev => ({
      ...prev,
      [activeChatUserId]: [...(prev[activeChatUserId] || []), ...(newMessages as any)]
    }));

    setShowChatMusicSelector(false);
    setSelectedChatSong(null);
    setChatMusicComment("");
    setSearchQuery("");
    setActiveArtistProfile(null);
    setActiveAlbumProfile(null);

    try {
      const { data: musicData, error: musicError } = await supabase
        .from('chat_messages')
        .insert([{ sender_id: currentUser.id, target_id: activeChatUserId, text: fileText }])
        .select()
        .single();

      if (musicError) throw musicError;

      let textData = null;
      if (safeComment) {
        const { data, error: textError } = await supabase
          .from('chat_messages')
          .insert([{ sender_id: currentUser.id, target_id: activeChatUserId, text: safeComment }])
          .select()
          .single();
        if (textError) throw textError;
        textData = data;
      }

      setChatHistory(prev => {
        const history = prev[activeChatUserId] || [];
        return {
          ...prev,
          [activeChatUserId]: history.map(m => {
            if (m.id === tempMusicId) return { ...m, id: musicData.id };
            if (safeComment && m.id === tempTextId && textData) return { ...m, id: textData.id };
            return m;
          }) as any
        };
      });
    } catch (err) {
      showToast(t('chatMessageSendFailed'), "error");
      setChatHistory(prev => ({
        ...prev,
        [activeChatUserId]: (prev[activeChatUserId] || []).filter(m => m.id !== tempMusicId && m.id !== tempTextId)
      }));
    }
  };

  if (isInitializing) return <div className="min-h-screen bg-black flex items-center justify-center"><h1 className="text-5xl font-black italic text-white animate-pulse">Echoes.</h1></div>;
  if (!isLoggedIn) return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 animate-fade-in relative">
      {toastMsg && (
        <div className={`absolute top-12 left-1/2 transform -translate-x-1/2 z-[1000] px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 animate-fade-in ${toastMsg.type === 'error' ? 'bg-red-500 text-white' : 'bg-[#1DB954] text-black'}`}>
          <IconCheck /> {toastMsg.text}
        </div>
      )}
      <h1 className="text-5xl font-black italic mb-8">Echoes.</h1>
      <div className="w-full max-w-sm flex flex-col gap-4">
        {signupSuccess ? (
          <div className="bg-[#1c1c1e] border border-zinc-800 p-8 rounded-3xl text-center animate-fade-in">
            <div className="w-16 h-16 bg-[#1DB954]/20 text-[#1DB954] rounded-full flex items-center justify-center mx-auto mb-6"><IconBell /></div>
            <h2 className="text-xl font-bold mb-4">{t('AuthSignupSuccessTitle')}</h2>
            <p className="text-sm text-zinc-400 mb-8 leading-relaxed">{String(t('AuthSignupSuccessBodyLine1')).replace("{email}", email)}<br />{t('AuthSignupSuccessBodyLine2')}</p>
            <button onClick={() => { setSignupSuccess(false); setAuthMode('login'); }} className="w-full bg-white text-black font-bold py-3.5 rounded-xl">{t('AuthBackToLoginScreen')}</button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-center mb-2">{authMode === 'login' ? t('AuthLoginHeading') : authMode === 'reset' ? t('AuthResetHeading') : t('AuthSignupHeading')}</h2>
            <input type="email" placeholder={t('AuthEmailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#1c1c1e] border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none" />
            {authMode !== 'reset' && (
              <input type="password" placeholder={t('AuthPasswordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#1c1c1e] border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none" />
            )}
            {authMode === 'reset' ? (
              <>
                <p className="text-xs text-zinc-500 leading-relaxed text-center px-2">{t('AuthResetDescription')}</p>
                <button onClick={handlePasswordResetRequest} disabled={isAuthLoading} className="w-full bg-white text-black font-bold py-3.5 rounded-xl mt-4 disabled:opacity-50 transition-transform active:scale-95">{isAuthLoading ? t('AuthSending') : t('AuthSendResetEmail')}</button>
                <p className="text-center text-xs text-zinc-500 mt-4">{t('AuthReturnToLoginPrompt')} <button onClick={() => { setAuthMode('login'); setPassword(""); }} className="text-white font-bold hover:underline">{t('AuthLoginButton')}</button></p>
              </>
            ) : authMode === 'login' ? (
              <>
                <button onClick={handleLogin} disabled={isAuthLoading} className="w-full bg-white text-black font-bold py-3.5 rounded-xl mt-4 disabled:opacity-50 transition-transform active:scale-95">{isAuthLoading ? t('AuthProcessing') : t('AuthLoginButton')}</button>
                <p className="text-center text-xs text-zinc-500 mt-4"><button onClick={() => { setAuthMode('reset'); setPassword(""); }} className="text-white font-bold hover:underline">{t('AuthForgotPassword')}</button></p>
                <p className="text-center text-xs text-zinc-500 mt-4">{t('AuthNoAccountPrompt')} <button onClick={() => { setAuthMode('signup'); setEmail(""); setPassword(""); }} className="text-white font-bold hover:underline">{t('AuthSignupButton')}</button></p>
              </>
            ) : (
              <>
                <div className="flex items-start gap-2 mt-4 px-1">
  <input type="checkbox" id="terms-checkbox" className="mt-1 w-4 h-4 rounded border-zinc-700 bg-black accent-[#1DB954] cursor-pointer shrink-0" />
  <label htmlFor="terms-checkbox" className="text-xs text-zinc-400 leading-relaxed cursor-pointer select-none">
    {t('AuthAgreementPrefix')}
    <button type="button" className="text-[#1DB954] hover:underline" onClick={(e) => { 
      e.preventDefault(); 
      e.stopPropagation(); 
      setShowAppInfoModal({ 
        title: t('TermsTitle'), 
        content: t('TermsContent') 
      }); 
    }}>{t('TermsTitle')}</button>{t('AuthAgreementJoiner')}
    <button type="button" className="text-[#1DB954] hover:underline" onClick={(e) => { 
      e.preventDefault(); 
      e.stopPropagation(); 
      setShowAppInfoModal({ 
        title: t('PrivacyPolicyTitle'), 
        content: t('PrivacyPolicyContent') 
      }); 
    }}>{t('PrivacyPolicyTitle')}</button>{t('AuthAgreementSuffix')}
  </label>
</div>
                <button 
                  onClick={() => {
                    const cb = document.getElementById('terms-checkbox') as HTMLInputElement;
                    if (cb && !cb.checked) {
                      showToast(t("TermsAgreementRequired"), "error");
                      return;
                    }
                    handleSignUp();
                  }} 
                  disabled={isAuthLoading} 
                  className="w-full bg-[#1DB954] text-black font-bold py-3.5 rounded-xl mt-4 disabled:opacity-50 transition-transform active:scale-95"
                >
                  {isAuthLoading ? t('AuthProcessing') : t('AuthCreateAccountButton')}
                </button>
                <p className="text-center text-xs text-zinc-500 mt-4">{t('AuthAlreadyHaveAccountPrompt')} <button onClick={() => { setAuthMode('login'); setEmail(""); setPassword(""); }} className="text-white font-bold hover:underline">{t('AuthLoginButton')}</button></p>
              </>
            )}
          </>
        )}
      </div>
      {showAppInfoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[950] flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowAppInfoModal(null)}>
          <div className="bg-[#1c1c1e] border border-zinc-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative text-center" onClick={e => e.stopPropagation()}>
            <div className="mx-auto w-12 h-12 bg-black rounded-full flex items-center justify-center mb-4 text-white"><IconInfo /></div>
            <h3 className="font-bold text-lg mb-4 text-white">{showAppInfoModal.title}</h3>
            <div className="max-h-[50vh] overflow-y-auto mb-8 scrollbar-hide text-left">
              <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">{showAppInfoModal.content}</p>
            </div>
            <button onClick={() => setShowAppInfoModal(null)} className="w-full py-3 bg-white text-black rounded-xl text-sm font-bold uppercase hover:bg-zinc-200 transition-colors">{t('AuthClose')}</button>
          </div>
        </div>
      )}
    </div>
  );
  return (
    <main className="min-h-screen bg-black text-white pb-24 font-sans relative selection:bg-zinc-800 overflow-x-hidden">
      <audio ref={audioRef} onEnded={() => setPlayingSong(null)} />
      {toastMsg && (
        <div className={`fixed top-12 left-1/2 transform -translate-x-1/2 z-[1300] px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 animate-fade-in ${toastMsg.type === 'error' ? 'bg-red-500 text-white' : 'bg-[#1DB954] text-black'}`}>
          <IconCheck /> {toastMsg.text}
        </div>
      )}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[1000] flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-[#1c1c1e] border border-zinc-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <p className="text-center font-bold text-lg mb-8 leading-relaxed">{t('logoutConfirmTitle')}</p>
            <div className="flex gap-4">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3.5 border border-zinc-800 rounded-xl text-xs font-bold uppercase">{t('cancel')}</button>
              <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="flex-1 py-3.5 bg-red-500 text-white rounded-xl text-xs font-bold uppercase">{t('logout')}</button>
            </div>
          </div>
        </div>
      )}
      <SongPostModal
        draftSong={draftSong}
        showOverrideConfirm={showPostOverrideConfirm !== null}
        draftCaption={draftCaption}
        playingSong={playingSong}
        cancelLabel={t('cancel')}
        postLabel={t('postVibe')}
        captionPlaceholder={t('songPostCaptionPlaceholder')}
        overrideConfirmLabel={t('songPostOverrideConfirm')}
        overwriteLabel={t('songPostOverwrite')}
        onCancelDraft={cancelDraft}
        onCaptionChange={setDraftCaption}
        onPost={checkAndPost}
        onCancelOverride={() => setShowPostOverrideConfirm(null)}
        onOverwrite={() => executePost(new Date())}
      />
      {activeArtistProfile && (
        <ArtistDetailOverlay
          artist={activeArtistProfile}
          artistSongs={artistSongs}
          latestReleaseSong={latestReleaseSong}
          uniqueAlbums={uniqueAlbums}
          activeArtistCommunity={activeArtistCommunity}
          chatCommunities={chatCommunities}
          isArtistLoading={isArtistLoading}
          isFavoriteArtist={isFavoriteArtist(activeArtistProfile)}
          playingSong={playingSong}
          favoriteCountLabel={getArtistFavoriteCountLabel(artistFavoriteCounts[getArtistFavoriteId(activeArtistProfile)] || 0)}
          labels={{
            back: t('artistDetailBackLabel'),
            favoriteArtists: t('favoriteArtists'),
            latestRelease: t('latestRelease'),
            popularSongs: t('popularSongs'),
            popularAlbums: t('popularAlbums'),
            artistTracksLoading: t('artistTracksLoading'),
            viewCommunity: t('viewCommunity'),
            joinCommunityAction: t('joinCommunityAction'),
          }}
          formatArtistCommunityDisplayName={formatArtistCommunityDisplayName}
          formatCommunityDescription={formatCommunityDescription}
          formatCommunityJoinedCount={(count) => formatCountTemplate('communityJoinedCount', count)}
          onBack={() => { setPlayingSong(null); handleGoBack(); }}
          onPlayTopSong={() => { if (artistSongs[0]) togglePlay(artistSongs[0].previewUrl); }}
          onToggleFavoriteArtist={() => toggleFavoriteArtist(activeArtistProfile)}
          onOpenCommunityChat={openCommunityChat}
          onJoinCommunity={joinCommunity}
          onSelectSong={(song) => { if ((activeTab === 'chat' && activeChatUserId) || (activeTab === 'other_profile' && viewingUser)) { if (activeTab === 'other_profile' && viewingUser) setActiveChatUserId(viewingUser.id); setSelectedChatSong(song); setShowChatMusicSelector(true); } else { setDraftSong(song); } }}
          onSendSong={(song) => { if (activeTab === 'other_profile' && viewingUser) setActiveChatUserId(viewingUser.id); setSelectedChatSong(song); setShowChatMusicSelector(true); }}
          onPlaySongPreview={(song) => togglePlay(song.previewUrl, { title: song.trackName, artist: song.artistName, imgUrl: song.artworkUrl100 })}
          onOpenAlbum={(album) => setActiveAlbumProfile({ collectionId: album.collectionId, collectionName: album.collectionName, artworkUrl: album.artworkUrl100.replace('100x100bb', '600x600bb'), artistName: album.artistName })}
          canSendSong={Boolean((activeTab === 'chat' && activeChatUserId) || (activeTab === 'other_profile' && viewingUser))}
        />
      )}
      {activeAlbumProfile && (
        <div className="fixed inset-0 bg-black z-[1000] animate-fade-in flex flex-col overflow-y-auto">
          <div className="flex items-center p-4 sticky top-0 bg-gradient-to-b from-black/90 to-transparent z-10 pb-12">
            <button onClick={() => { setAlbumSongs([]); setPlayingSong(null); audioRef.current?.pause(); handleGoBack(); }} className="text-white bg-black/40 backdrop-blur p-2 rounded-full"><IconChevronLeft /></button>
          </div>
          <div className="flex flex-col items-center px-6 relative -mt-10">
            <img src={activeAlbumProfile.artworkUrl} className="w-48 h-48 rounded-xl object-cover shadow-2xl mb-6 border border-zinc-800" />
            <h1 className="text-2xl font-black tracking-tight mb-1 text-center">{activeAlbumProfile.collectionName}</h1>
            <p className="text-sm text-zinc-400 mb-6">{activeAlbumProfile.artistName}</p>
          </div>
          <div className="px-4 pb-24">
            {isAlbumLoading ? <p className="text-center text-zinc-500 py-12">{t('artistTracksLoading')}</p> : (
              <div className="flex flex-col gap-2">
                {albumSongs.map((tItem, i) => (
                  <div key={i} onClick={() => { if ((activeTab === 'chat' && activeChatUserId) || (activeTab === 'other_profile' && viewingUser)) { if (activeTab === 'other_profile' && viewingUser) setActiveChatUserId(viewingUser.id); setSelectedChatSong(tItem); setShowChatMusicSelector(true); } else { setDraftSong(tItem); } }} className="flex items-center gap-4 py-3 px-2 hover:bg-zinc-800/50 rounded-xl cursor-pointer border-b border-zinc-900/50 last:border-0 group">
                    <p className="text-zinc-500 font-bold text-sm w-6 text-right group-hover:hidden">{i + 1}</p>
                    <div className="w-6 hidden group-hover:flex justify-end text-[#1DB954]"><IconPlay /></div>
                    <div className="flex-1 overflow-hidden"><p className="font-bold text-sm truncate group-hover:text-[#1DB954] transition-colors">{tItem.trackName}</p></div>
                    {(activeTab === 'chat' && activeChatUserId) || (activeTab === 'other_profile' && viewingUser) ? (
                      <button onClick={(e) => {
                        e.stopPropagation();
                        if (activeTab === 'other_profile' && viewingUser) setActiveChatUserId(viewingUser.id);
                        setSelectedChatSong(tItem);
                        setShowChatMusicSelector(true);
                      }} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-[#1DB954] hover:text-black transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                        <IconSend />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {showDrumrollModal && <DrumrollPickerModal />}
      {/* 💡 コミュニティカレンダー専用の年月選択ドラムロール（ズレ修正版） */}
      {showCommDrumroll && (
        <CommunityCalendarPicker
          selectedYear={commCalDate.getFullYear()}
          selectedMonth={commCalDate.getMonth() + 1}
          yearOptions={[2024, 2025, 2026, 2027, 2028]}
          monthOptions={Array.from({ length: 12 }, (_, i) => i + 1)}
          cancelLabel={t('cancel')}
          titleLabel={t('selectYearMonth')}
          setLabel={t('set')}
          formatYear={(y) => formatTemplate('yearSuffix', { year: y })}
          formatMonth={(m) => formatTemplate('monthSuffix', { month: m.toString().padStart(2, '0') })}
          onClose={() => setShowCommDrumroll(false)}
          onYearScroll={e => { const st = e.currentTarget.scrollTop; const y = 2024 + Math.round(st / 50); if (y >= 2024 && y <= 2028) setCommCalDate(new Date(y, commCalDate.getMonth(), 1)); }}
          onMonthScroll={e => { const st = e.currentTarget.scrollTop; const m = Math.round(st / 50) + 1; if (m >= 1 && m <= 12) setCommCalDate(new Date(commCalDate.getFullYear(), m - 1, 1)); }}
        />
      )}
      {/* 💡 カレンダーモーダル（タップしてリストを表示するUI ＆ ドラムロール対応 ＆ 10人以上制限） */}
      {showCommCalendar && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[950] flex justify-center items-end md:items-center animate-fade-in" onClick={() => { setShowCommCalendar(false); setSelectedModalDate(null); }}>
          <div className="bg-[#1c1c1e] w-full md:max-w-[420px] h-[85vh] md:max-h-[80vh] rounded-t-[32px] md:rounded-[32px] p-6 shadow-2xl relative flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="font-bold text-lg">{t('findLive')}</h3>
              <button onClick={() => { setShowCommCalendar(false); setSelectedModalDate(null); }} className="text-zinc-500 hover:text-white"><IconCross /></button>
            </div>
            <div className="flex justify-between items-center mb-6 px-2 shrink-0">
              <button onClick={() => setCommCalDate(new Date(commCalDate.getFullYear(), commCalDate.getMonth() - 1, 1))} className="p-2 text-zinc-400 hover:text-white bg-black rounded-full"><IconChevronLeft /></button>
              {/* 💡 ここをタップするとドラムロールが開く */}
              <div className="cursor-pointer hover:opacity-70 transition-opacity" onClick={() => setShowCommDrumroll(true)}>
                <span className="font-bold text-xl tracking-widest flex items-center gap-2">
                  {commCalDate.getFullYear()} . {(commCalDate.getMonth() + 1).toString().padStart(2, '0')}
                  <IconChevronDown />
                </span>
              </div>
              <button onClick={() => setCommCalDate(new Date(commCalDate.getFullYear(), commCalDate.getMonth() + 1, 1))} className="p-2 text-zinc-400 hover:text-white bg-black rounded-full"><IconChevronRight /></button>
            </div>
            <div className="grid grid-cols-7 gap-2 mb-4 shrink-0">
              {weekdayLabels.map(d => <div key={d} className="text-center text-[10px] text-zinc-500 font-bold mb-2">{d}</div>)}
              {Array.from({ length: new Date(commCalDate.getFullYear(), commCalDate.getMonth(), 1).getDay() }).map((_, i) => <div key={`empty-${i}`} />)}
             　{Array.from({ length: new Date(commCalDate.getFullYear(), commCalDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${commCalDate.getFullYear()}-${(commCalDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                const eventsToday = realCommunities.filter(c => c.date === dateStr && (c.memberCount >= 10 || c.isJoined));
                const isSelected = selectedModalDate === dateStr;
                return (
                  <div
                    key={day}
                    onClick={() => { if (eventsToday.length > 0) setSelectedModalDate(dateStr); }}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-colors ${eventsToday.length > 0 ? 'cursor-pointer' : 'opacity-50'} ${isSelected ? 'bg-[#1DB954] text-black shadow-lg scale-105 z-10' : 'bg-black hover:bg-zinc-800 text-white'}`}
                  >
                    <span className={`text-sm ${isSelected ? 'font-black' : 'font-medium'}`}>{day}</span>
                    {eventsToday.length > 0 && (
                      <span className={`text-[9px] font-bold mt-0.5 ${isSelected ? 'text-black' : 'text-[#1DB954]'}`}>{formatCountTemplate('eventCount', eventsToday.length)}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide mt-4 border-t border-zinc-800 pt-4">
              {selectedModalDate ? (
                <div className="flex flex-col gap-3 animate-fade-in">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{formatDatePerformances(selectedModalDate)}</p>
                  {realCommunities.filter(c => c.date === selectedModalDate && (c.memberCount >= 10 || c.isJoined)).map(c => (
                    <div key={c.id} onClick={() => { setActiveCommunityDetail(c); setShowCommCalendar(false); setSelectedModalDate(null); }} className="bg-black p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-zinc-800 border border-zinc-800 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-[#1DB954] flex-shrink-0"><IconTicket /></div>
                        <div className="flex-1 overflow-hidden"><p className="font-bold text-sm text-white truncate">{formatArtistCommunityDisplayName(c)}</p><p className="text-[10px] text-zinc-500">{formatCountTemplate('communityScheduledCount', c.memberCount)}</p></div>
                      </div>
                      <IconChevronRight />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-zinc-500 font-bold">{t('tapDateToViewLives')}</p>
                </div>
              )}
            </div>
            <button onClick={() => { setCommunityDateFilter(""); setShowCommCalendar(false); setSelectedModalDate(null); }} className="w-full mt-4 py-4 bg-zinc-800 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-zinc-700 transition-colors shrink-0">
              {t('showAllDates')}
            </button>
          </div>
        </div>
      )}
      {selectedCalendarPopupVibe && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[850] flex flex-col justify-end animate-fade-in" onClick={() => setSelectedCalendarPopupVibe(null)}>
          <div className="bg-[#1c1c1e] rounded-t-[32px] p-6 shadow-2xl relative flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-zinc-800 rounded-full mb-6 cursor-pointer" onClick={() => setSelectedCalendarPopupVibe(null)}></div>
            <img src={selectedCalendarPopupVibe.imgUrl} className="w-48 h-48 rounded-xl object-cover shadow-2xl mb-6 border border-zinc-800" />
            <h2 className="text-xl font-bold text-center mb-1">{selectedCalendarPopupVibe.title}</h2>
            <p onClick={(e) => handleArtistClick(e, selectedCalendarPopupVibe.artistId, selectedCalendarPopupVibe.artist, selectedCalendarPopupVibe.imgUrl)} className="text-sm text-[#1DB954] font-bold mb-8 cursor-pointer hover:underline">{selectedCalendarPopupVibe.artist}</p>
            <button onClick={(e) => handleArtistClick(e, selectedCalendarPopupVibe.artistId, selectedCalendarPopupVibe.artist, selectedCalendarPopupVibe.imgUrl)} className="w-full py-4 bg-white text-black rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-gray-200 transition-colors">
              {t('viewArtistDetail')} <IconChevronRight />
            </button>
          </div>
        </div>
      )}
      {activeCommunityDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[950] flex items-center justify-center p-6 animate-fade-in" onClick={() => setActiveCommunityDetail(null)}>
          <div className="bg-[#1c1c1e] border border-zinc-800 p-8 rounded-[32px] w-full max-w-sm relative flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">{t('communityDetailTitle')}</h3>
              <button onClick={() => setActiveCommunityDetail(null)} className="text-zinc-500 hover:text-white"><IconCross /></button>
            </div>
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 mb-4 shadow-lg overflow-hidden">
                {activeCommunityDetail.artworkUrl ? (
                  <>
                    <img src={activeCommunityDetail.artworkUrl} className="w-full h-full object-cover" onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                      if (fallback) fallback.style.display = 'flex';
                    }} />
                    <div className="hidden w-full h-full items-center justify-center text-zinc-500">{activeCommunityDetail.communityType === 'artist' ? <IconUsers /> : <IconTicket />}</div>
                  </>
                ) : activeCommunityDetail.communityType === 'artist' ? <IconUsers /> : <IconTicket />}
              </div>
              {/* 💡 公式マークを表示 */}
              <h2 className="text-2xl font-black text-center mb-2 flex items-center justify-center gap-2">
                {formatArtistCommunityDisplayName(activeCommunityDetail)}
                {activeCommunityDetail.isVerified && <span className="text-[#1DB954] w-5 h-5 flex items-center"><IconVerified /></span>}
              </h2>
              {formatCommunityDescription(activeCommunityDetail) && <p className="text-sm text-zinc-300 text-center leading-relaxed mb-3">{formatCommunityDescription(activeCommunityDetail)}</p>}
              <p className="text-sm text-[#1DB954] font-bold mb-4">{activeCommunityDetail.communityType === 'artist' ? t('permanentFanCommunity') : formatCommunityDate(activeCommunityDetail.date)}</p>
              <div className="flex -space-x-3 justify-center mb-2">
                {(() => {
                  const me = allProfiles.find(u => u.id === currentUser?.id) || myProfile;
                  const participants = activeCommunityDetail.memberCount <= 1 
                    ? [me].slice(0, activeCommunityDetail.memberCount)
                    : [me, ...allProfiles.filter(u => u.id !== me.id)].slice(0, activeCommunityDetail.memberCount);
                  return (
                    <>
                      {participants.slice(0, 3).map(u => <img key={u.id} src={u.avatar} className="w-9 h-9 rounded-full border-2 border-[#1c1c1e] object-cover" />)}
                      {activeCommunityDetail.memberCount > 3 && (
                        <div className="w-9 h-9 rounded-full bg-zinc-800 border-2 border-[#1c1c1e] flex items-center justify-center text-[10px] font-bold text-zinc-400 z-10">
                          +{activeCommunityDetail.memberCount - 3}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <p className="text-xs text-zinc-400">{formatCountTemplate('communityJoinedCount', activeCommunityDetail.memberCount)}</p>
            </div>
            {chatCommunities.some(c => c.id === activeCommunityDetail.id) || activeCommunityDetail.isJoined ? (
              <button onClick={() => openCommunityChat(activeCommunityDetail)} className="w-full py-4 bg-[#1DB954] text-black rounded-xl text-sm font-bold shadow-lg hover:scale-105 transition-transform mb-2">{t('viewCommunity')}</button>
            ) : (
              <button onClick={() => joinCommunity(activeCommunityDetail)} className="w-full py-4 bg-white text-black rounded-xl text-sm font-bold shadow-lg hover:scale-105 transition-transform mb-2">{t('joinCommunityAction')}</button>
            )}
            {/* 💡 ユーザー作成の非公式ライブの場合のみ、通報ボタンを表示 */}
            {!activeCommunityDetail.isVerified && activeCommunityDetail.communityType !== 'artist' && (
              <button onClick={() => handleReportCommunity(activeCommunityDetail.id)} className="w-full py-3 bg-transparent text-zinc-600 hover:text-red-500 rounded-xl text-[10px] font-bold transition-colors flex items-center justify-center gap-1.5 mt-2">
                <IconWarning /> {t('reportFalseLiveInfo')}
              </button>
            )}
          </div>
        </div>
      )}
      {activeChatUserId && (
        <div className={`fixed inset-0 bg-black animate-fade-in flex flex-col ${showChatMusicSelector ? 'z-[1200]' : 'z-[900]'}`}>
          <ChatRoomHeader
            activeChatUserId={activeChatUserId}
            allProfiles={allProfiles}
            chatGroups={chatGroups}
            chatCommunities={chatCommunities}
            activeCommunityMemberIds={activeCommunityMemberIds}
            labels={{
              communityFallback: t('chatCommunityFallback'),
              groupFallback: t('chatGroupFallback'),
              backAria: t('chatBackAria'),
              detailsAria: t('chatDetailsAria'),
              membersCount: t('chatMembersCount'),
            }}
            onBack={handleGoBack}
            onOpenDetails={() => setShowChatDetails(true)}
          />
          <ChatMessages
            activeChatUserId={activeChatUserId}
            messages={chatHistory[activeChatUserId] || []}
            allProfiles={allProfiles}
            currentUserId={currentUser?.id}
            labels={{
              unknownFile: t('chatUnknownFile'),
              fileSize: t('chatFileSize'),
              fileSizeUnknown: t('chatFileSizeUnknown'),
              unsend: t('chatUnsend'),
              cancel: t('cancel'),
              unsendConfirmTitle: t('chatUnsendConfirmTitle'),
              unsendConfirmDescriptionLine1: t('chatUnsendConfirmDescriptionLine1'),
              unsendConfirmDescriptionLine2: t('chatUnsendConfirmDescriptionLine2'),
              unsendConfirmAction: t('chatUnsendConfirmAction'),
              read: t('chatRead'),
              readCount: t('chatReadCount'),
            }}
            timeZone={timeZone}
            playingSong={playingSong}
            activeMenuId={activeCommentSongId}
            jumpToMessageId={jumpToMessageId}
            messageRefs={messageRefs}
            chatEndRef={chatEndRef}
            displayLocalTime={displayLocalTime}
            onOpenSenderProfile={(sender) => {
              setProfileBackTarget({ tab: 'chat', chatUserId: activeChatUserId });
              setViewingUser(sender);
              setActiveTab('other_profile');
              setActiveChatUserId(null);
            }}
            onOpenImage={setViewingChatImage}
            onTogglePlay={togglePlay}
            onArtistClick={handleArtistClick}
            onSetActiveMenuId={setActiveCommentSongId}
            onDeleteMessage={deleteChatMessage}
          />
          {/* 💡 音楽選択モーダル（投稿作成画面風UI・最前面表示） */}
          {showChatMusicSelector && (
            <ChatMusicPickerModal
              selectedChatSong={selectedChatSong}
              searchQuery={searchQuery}
              searchArtistInfo={searchArtistInfo}
              searchResults={searchResults}
              trendingSongs={trendingSongs}
              trendingSongsLabel={trendingSongsLabel}
              chatMusicComment={chatMusicComment}
              currentUserExists={Boolean(currentUser)}
              myProfileAvatar={myProfile.avatar}
              labels={{
                confirmMusic: t('chatConfirmMusic'),
                shareMusic: t('chatShareMusic'),
                searchPlaceholder: t('searchPlaceholder'),
                chatArtist: t('chatArtist'),
                topResults: t('topResults'),
                addMessage: t('chatAddMessage'),
                commentPlaceholder: t('chatMusicCommentPlaceholder'),
                sendToChat: t('chatSendToChat'),
              }}
              onClose={closeChatMusicPicker}
              onSearchQueryChange={setSearchQuery}
              onArtistMouseDown={(e) => {
                handleArtistClick(e, searchArtistInfo.artistId, searchArtistInfo.artistName, searchArtistInfo.artworkUrl);
                setShowChatMusicSelector(false);
              }}
              onSelectSong={setSelectedChatSong}
              onClearSelectedSong={() => setSelectedChatSong(null)}
              onCommentChange={setChatMusicComment}
              onCommentKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleSendChatMusicShare(); } }}
              onSendMusicShare={handleSendChatMusicShare}
            />
          )}
          <ChatInputBar
            messageInput={chatMessageInput}
            pendingAttachments={pendingAttachments}
            showChatPlusMenu={showChatPlusMenu}
            showVoiceMenu={showVoiceMenu}
            isRecording={isRecording}
            recordingSeconds={recordingSeconds}
            draftVoice={draftVoice}
            draftAudioRef={draftAudioRef}
            isPlayingDraft={isPlayingDraft}
            labels={{
              file: t('chatFile'),
              music: t('chatMusic'),
              voicePrompt: t('chatVoicePrompt'),
              messagePlaceholder: t('chatMessagePlaceholder'),
            }}
            onMessageChange={setChatMessageInput}
            onTogglePlusMenu={() => { setShowChatPlusMenu(!showChatPlusMenu); setShowVoiceMenu(false); }}
            onToggleVoiceMenu={() => { setShowVoiceMenu(!showVoiceMenu); setShowChatPlusMenu(false); }}
            onAddAttachments={(attachments) => {
              setPendingAttachments(prev => [...prev, ...attachments]);
              setShowChatPlusMenu(false);
            }}
            onRemoveAttachment={(index) => setPendingAttachments(prev => prev.filter((_, i) => i !== index))}
            onOpenMusicSelector={() => { setShowChatMusicSelector(true); setShowChatPlusMenu(false); }}
            onSubmitMessage={() => submitChatMessage(activeChatUserId!)}
            onCancelVoiceRecording={cancelVoiceRecording}
            onStartVoiceRecording={startVoiceRecording}
            onStopVoiceRecording={stopVoiceRecording}
            onToggleDraftPlay={toggleDraftPlay}
            onSendVoiceMessage={sendVoiceMessage}
            onDraftAudioEnded={() => setIsPlayingDraft(false)}
          />
          {showChatDetails && (
            <div className="absolute inset-0 bg-[#0a0a0a] z-[950] flex flex-col animate-fade-in">
              <div className="flex items-center p-4 border-b border-zinc-900 sticky top-0 bg-[#0a0a0a]">
                <button onClick={() => chatDetailsTab === 'menu' ? setShowChatDetails(false) : setChatDetailsTab('menu')} className="p-2 -ml-2 text-white hover:opacity-80 transition-opacity"><IconChevronLeft /></button>
                <h2 className="text-white font-bold text-lg mx-auto pr-8">
                  {chatDetailsTab === 'menu' ? t('chatDetailsTitle') : chatDetailsTab === 'members' ? t('chatMembers') : chatDetailsTab === 'album' ? t('chatAlbum') : chatDetailsTab === 'files' ? t('chatFile') : t('chatNotes')}
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto pb-20">
                {chatDetailsTab === 'menu' && (
                  <div className="flex flex-col animate-fade-in">
                    <div className="grid grid-cols-4 gap-4 p-6 border-b border-zinc-900/80">
                      <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => showToast(t('chatNotificationsOff'))}>
                        <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconBell /></div>
                        <span className="text-[11px] font-bold text-zinc-400">{t('chatNotificationsOff')}</span>
                      </div>
                      <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => setChatDetailsTab('members')}>
                        <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconUsers /></div>
                        <span className="text-[11px] font-bold text-zinc-400">{t('chatMembers')}</span>
                      </div>
                      <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => showToast(t('chatInviteCopied'))}>
                        <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconUserPlus /></div>
                        <span className="text-[11px] font-bold text-zinc-400">{t('chatInvite')}</span>
                      </div>
                      <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={leaveActiveChat}>
                        <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-red-500 group-hover:bg-zinc-800 transition-colors">
                          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        </div>
                        <span className="text-[11px] font-bold text-zinc-400">{t('chatLeave')}</span>
                      </div>
                    </div>
                    <div className="flex flex-col mt-2">
                      <div className="flex items-center justify-between p-4 hover:bg-[#1c1c1e] cursor-pointer transition-colors" onClick={() => setChatDetailsTab('album')}>
                        <div className="flex items-center gap-4 text-white"><IconImage /><span className="text-[15px] font-bold">{t('chatMedia')}</span></div>
                        <span className="text-zinc-600"><IconChevronRight /></span>
                      </div>
                      <div className="flex items-center justify-between p-4 hover:bg-[#1c1c1e] cursor-pointer transition-colors" onClick={() => setChatDetailsTab('notes')}>
                        <div className="flex items-center gap-4 text-white"><IconPin /><span className="text-[15px] font-bold">{t('chatNotes')}</span></div>
                        <span className="text-zinc-600"><IconChevronRight /></span>
                      </div>
                      <div className="flex items-center justify-between p-4 hover:bg-[#1c1c1e] cursor-pointer transition-colors" onClick={() => showToast(t('chatComingSoon'))}>
                        <div className="flex items-center gap-4 text-white"><IconCalendar /><span className="text-[15px] font-bold">{t('chatEvents')}</span></div>
                        <span className="text-zinc-600"><IconChevronRight /></span>
                      </div>
                      <div className="flex items-center justify-between p-4 hover:bg-[#1c1c1e] cursor-pointer transition-colors" onClick={() => setChatDetailsTab('files')}>
                        <div className="flex items-center gap-4 text-white"><IconFile /><span className="text-[15px] font-bold">{t('chatFile')}</span></div>
                        <span className="text-zinc-600"><IconChevronRight /></span>
                      </div>
                    </div>
                  </div>
                )}
                {chatDetailsTab === 'members' && (() => {
                  const isCommunity = isCommunityChatId(activeChatUserId);
                  const isChatGroup = activeChatUserId.startsWith('g');
                  let memberList = allProfiles;
                  let displayCount = 0;
                  if (isChatGroup) {
                    const g = chatGroups.find(x => x.id === activeChatUserId);
                    if (g) {
                      memberList = allProfiles.filter(u => g.memberIds.includes(u.id) || u.id === currentUser?.id);
                      displayCount = memberList.length;
                    }
                  } else if (isCommunity) {
                    // 💡 SWRで取得した本物の参加者IDリストを使ってメンバーをフィルタリングする
                    if (activeCommunityMemberIds) {
                      const memberIds = new Set(activeCommunityMemberIds);
                      if (chatCommunities.some(c => c.id === activeChatUserId) && currentUser?.id) memberIds.add(currentUser.id);
                      memberList = allProfiles.filter(u => memberIds.has(u.id));
                      if (currentUser?.id && memberIds.has(currentUser.id) && !memberList.some(u => u.id === currentUser.id)) {
                        memberList = [myProfile, ...memberList];
                      }
                      displayCount = memberIds.size;
                    } else {
                      // まだデータが取得できていない時のフォールバック（自分だけ表示）
                      const me = allProfiles.find(u => u.id === currentUser?.id) || myProfile;
                      memberList = [me];
                      displayCount = 1;
                    }
                  } else {
                    displayCount = memberList.length;
                  }
                  return (
                    <div className="flex flex-col animate-fade-in">
                      <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-[#1c1c1e] transition-colors" onClick={async () => {
                        const inviteUrl = `https://echo.es/join/${activeChatUserId}`;
                        if (navigator.share) {
                          try {
                            await navigator.share({
                              title: t('chatInviteTitle'),
                              text: t('chatInviteText'),
                              url: inviteUrl
                            });
                          } catch (err) {}
                        } else {
                          navigator.clipboard.writeText(inviteUrl);
                          showToast(t('chatInviteCopiedSuccess'), "success");
                        }
                      }}>
                        <div className="w-12 h-12 rounded-full bg-[#1DB954]/10 text-[#1DB954] flex items-center justify-center border border-[#1DB954]/20"><IconUserPlus /></div>
                        <span className="font-bold text-[15px] text-[#1DB954]">{t('chatInviteFriend')}</span>
                      </div>
                      <div className="w-full h-2 bg-black"></div>
                      <div className="px-4 py-3 text-xs font-bold text-zinc-500 bg-[#0a0a0a]">
                        {t('chatMembersParticipants').replace('{count}', String(displayCount))}
                      </div>
                      <div className="flex flex-col p-2">
                        {memberList.map(u => (
                          <div key={u.id} className="flex items-center justify-between p-2 hover:bg-[#1c1c1e] rounded-2xl cursor-pointer transition-colors">
                            <div className="flex items-center gap-4 flex-1" onClick={() => { setViewingUser(u); setActiveTab('other_profile'); setShowChatDetails(false); setActiveChatUserId(null); }}>
                              <img src={u.avatar} className="w-12 h-12 rounded-full object-cover border border-zinc-800" />
                              <div>
                                <p className="font-bold text-[15px] text-white flex items-center gap-2">
                                  {u.name} {u.id === currentUser?.id && <span className="bg-zinc-800 text-zinc-400 text-[9px] px-1.5 py-0.5 rounded-sm">{t('chatYou')}</span>}
                                </p>
                                <p className="text-xs text-zinc-500">@{u.handle}</p>
                              </div>
                            </div>
                            {u.id !== currentUser?.id && (
                              <button onClick={(e) => { e.stopPropagation(); setShowChatDetails(false); setActiveChatUserId(u.id); }} className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center hover:bg-zinc-700 transition-colors text-white flex-shrink-0"><IconMessagePlus /></button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                {chatDetailsTab === 'album' && (() => {
                  const chatMsgs = chatHistory[activeChatUserId] || [];
                  const images = chatMsgs.filter(m => m.text.startsWith('[IMAGE]'));
                  return (
                    <div className="p-2 animate-fade-in">
                      {images.length > 0 ? (
                        <div className="grid grid-cols-3 gap-1.5">
                          {images.map(imgMsg => {
                            const sender = allProfiles.find(u => u.id === imgMsg.senderId) || (imgMsg.senderId === currentUser?.id ? myProfile : null);
                            return (
                              <div key={imgMsg.id} className="flex flex-col gap-1 cursor-pointer group" onClick={() => setViewingChatImage({ ...imgMsg, sender })}>
                                <div className="aspect-square w-full relative overflow-hidden rounded-md border border-zinc-800/50">
                                  <img src={imgMsg.text.replace('[IMAGE]', '')} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                </div>
                                {sender && (
                                  <div className="flex items-center gap-1.5 px-0.5">
                                    <img src={sender.avatar} className="w-4 h-4 rounded-full object-cover" />
                                    <span className="text-[10px] text-zinc-400 truncate flex-1">{sender.name}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-500">
                          <IconImage /><p className="mt-4 text-sm font-bold">{t('chatNoPhotos')}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {chatDetailsTab === 'files' && (() => {
                  const chatMsgs = chatHistory[activeChatUserId] || [];
                  const files = chatMsgs.filter(m => m.text.startsWith('[FILE]'));
                  return (
                    <div className="p-4 animate-fade-in flex flex-col gap-2">
                      {files.length > 0 ? (
                        files.map(fileMsg => {
                          const [fileName, fileUrl] = fileMsg.text.replace('[FILE]', '').split('|');
                          const sender = allProfiles.find(u => u.id === fileMsg.senderId) || (fileMsg.senderId === currentUser?.id ? myProfile : null);
                          return (
                            <a key={fileMsg.id} href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-3 bg-[#1c1c1e] hover:bg-zinc-800 rounded-xl transition-colors border border-zinc-800/50 group">
                              <div className="w-12 h-12 bg-zinc-800/50 rounded-lg flex items-center justify-center text-[#1DB954] group-hover:bg-zinc-700 transition-colors shrink-0">
                                <IconFile />
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <p className="font-bold text-sm text-white truncate">{fileName}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {sender && <img src={sender.avatar} className="w-3.5 h-3.5 rounded-full object-cover border border-zinc-700" />}
                                  <span className="text-[10px] text-zinc-500 truncate">{sender?.name || t('chatUserFallback')}</span>
                                  <span className="text-[10px] text-zinc-500">• {displayLocalTime(fileMsg.timestamp, timeZone)}</span>
                                </div>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors shrink-0">
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                              </div>
                            </a>
                          );
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-500">
                          <IconFile />
                          <p className="mt-4 text-sm font-bold">{t('chatNoFiles')}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
          {/* 全画面ビューア (チャット全体で使えるように移動) */}
          {viewingChatImage && (
            <div className="fixed inset-0 bg-black z-[1300] flex flex-col animate-fade-in">
              <div className={`flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10 transition-opacity duration-300 ${isViewerUiHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex items-center gap-4">
                  <button onClick={() => setViewingChatImage(null)} className="p-2 -ml-2 text-white hover:opacity-80"><IconChevronLeft /></button>
                  {viewingChatImage.sender && (
                    <div className="flex items-center gap-2 cursor-pointer hover:opacity-80" onClick={() => {
                      setJumpToMessageId(viewingChatImage.id);
                      setShowChatDetails(false);
                      setViewingChatImage(null);
                    }}>
                      <img src={viewingChatImage.sender.avatar} className="w-8 h-8 rounded-full object-cover border border-zinc-800" />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white leading-tight">{viewingChatImage.sender.name}</span>
                        <span className="text-[10px] text-zinc-400">{t('chatOpenOriginalMessage')}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center overflow-hidden relative cursor-pointer" onClick={() => setIsViewerUiHidden(!isViewerUiHidden)}>
                <img src={viewingChatImage.text.replace('[IMAGE]', '')} className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
              </div>
              <div className={`flex items-center justify-around p-6 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 w-full z-10 transition-opacity duration-300 ${isViewerUiHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <button onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const imgUrl = viewingChatImage.text ? viewingChatImage.text.replace('[IMAGE]', '') : '';
                    if (!imgUrl) throw new Error(t('chatImageMissingUrl'));
                    const response = await fetch(imgUrl);
                    const blob = await response.blob();
                    const objectUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = objectUrl;
                    a.download = `echoes_image_${Date.now()}.jpg`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(objectUrl);
                  } catch (err) {
                    showToast(t('chatImageSaveFailed'), "error");
                  }
                }} className="flex flex-col items-center gap-2 text-white hover:opacity-80">
                  <IconPlus /> <span className="text-[10px] font-bold">{t('save')}</span>
                </button>
                <button onClick={async (e) => {
                  e.stopPropagation();
                  const imgUrl = viewingChatImage.text ? viewingChatImage.text.replace('[IMAGE]', '') : '';
                  if (!imgUrl) {
                    showToast(t('chatImageMissingUrl'), "error");
                    return;
                  }
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: 'Echoes Image',
                        text: t('chatImageShareText'),
                        url: imgUrl
                      });
                    } catch (err) {}
                  } else {
                    navigator.clipboard.writeText(imgUrl);
                    showToast(t('chatImageUrlCopySuccess'), "success");
                  }
                }} className="flex flex-col items-center gap-2 text-white hover:opacity-80">
                  <IconShareExternal /> <span className="text-[10px] font-bold">{t('chatShare')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {showMatchFilterModal && (
        <MatchFilterModal
          matchFilter={matchFilter}
          filterArtistInput={filterArtistInput}
          filterArtistSuggestions={filterArtistSuggestions}
          filterHashtagInput={filterHashtagInput}
          allAvailableHashtags={allAvailableHashtags}
          allAvailableLiveHistories={allAvailableLiveHistories}
          labels={{
            title: t('matchFilterTitle'),
            artist: t('artist'),
            artistPlaceholder: t('matchFilterArtistPlaceholder'),
            tagLive: t('matchFilterTagLiveLabel'),
            tagLivePlaceholder: t('matchFilterTagLivePlaceholder'),
            ageRange: t('matchFilterAgeRange'),
            sex: t('matchFilterSex'),
            sexAll: t('matchFilterSexAll'),
            sexMale: t('matchFilterSexMale'),
            sexFemale: t('matchFilterSexFemale'),
            apply: t('matchFilterApply'),
          }}
          getMusicTagLabel={getMusicTagLabel}
          onClose={() => setShowMatchFilterModal(false)}
          onArtistInputChange={setFilterArtistInput}
          onHashtagInputChange={setFilterHashtagInput}
          onArtistClick={handleArtistClick}
          onRemoveArtist={(artistId) => setMatchFilter({ ...matchFilter, artists: matchFilter.artists.filter(fa => fa.artistId !== artistId) })}
          onSelectArtistSuggestion={(artist) => { if (!matchFilter.artists.some(fa => fa.artistId === artist.artistId)) { setMatchFilter({ ...matchFilter, artists: [...matchFilter.artists, artist] }); } setFilterArtistInput(""); }}
          onRemoveHashtag={(hashtag) => setMatchFilter({ ...matchFilter, hashtags: matchFilter.hashtags.filter(fh => fh !== hashtag) })}
          onRemoveLiveHistory={(liveHistory) => setMatchFilter({ ...matchFilter, liveHistories: matchFilter.liveHistories.filter(fl => fl !== liveHistory) })}
          onSelectHashtagSuggestion={(hashtag) => { if (!matchFilter.hashtags.includes(hashtag)) setMatchFilter({ ...matchFilter, hashtags: [...matchFilter.hashtags, hashtag] }); setFilterHashtagInput(""); }}
          onSelectLiveHistorySuggestion={(liveHistory) => { if (!matchFilter.liveHistories.includes(liveHistory)) setMatchFilter({ ...matchFilter, liveHistories: [...matchFilter.liveHistories, liveHistory] }); setFilterHashtagInput(""); }}
          onAgeMinChange={(ageMin) => setMatchFilter({ ...matchFilter, ageMin })}
          onAgeMaxChange={(ageMax) => setMatchFilter({ ...matchFilter, ageMax })}
          onGenderChange={(gender) => setMatchFilter({ ...matchFilter, gender })}
        />
      )}
      {showCreateGroupModal && (
        <CreateGroupModal
          newGroupName={newGroupName}
          followedUsers={followedUsers}
          allProfiles={allProfiles}
          newGroupMembers={newGroupMembers}
          labels={{
            title: t('chatCreateGroup'),
            groupName: t('chatGroupName'),
            groupNamePlaceholder: t('chatGroupNamePlaceholder'),
            selectMembers: t('chatSelectMembers'),
            createAction: t('chatCreateAction'),
          }}
          onClose={() => setShowCreateGroupModal(false)}
          onGroupNameChange={setNewGroupName}
          onToggleMember={(uid) => setNewGroupMembers(prev => { const next = new Set(prev); if (next.has(uid)) next.delete(uid); else next.add(uid); return next; })}
          onCreateGroup={handleCreateGroup}
        />
      )}
      {/* 💡 新しいライブコミュニティを作成するモーダル */}
      {showCreateCommunityModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[950] flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowCreateCommunityModal(false)}>
          <div className="bg-[#1c1c1e] border border-zinc-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">{t('createLiveTitle')}</h3>
              <button onClick={() => setShowCreateCommunityModal(false)} className="text-zinc-500 hover:text-white"><IconCross /></button>
            </div>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">{t('createLiveDescription')}</p>
            <div className="mb-4">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">{t('liveName')}</label>
              <input type="text" placeholder={t('liveNamePlaceholder')} value={newCommName} onChange={(e) => setNewCommName(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#1DB954]" />
            </div>
            <div className="mb-8">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">{t('dateLabel')}</label>
              <div className="flex items-center gap-2">
                <input
                  ref={yearInputRef}
                  type="text"
                  maxLength={4}
                  placeholder="YYYY"
                  value={newCommYear}
                  onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setNewCommYear(v); if (v.length === 4) monthInputRef.current?.focus(); }}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-center text-white focus:outline-none focus:border-[#1DB954] transition-colors"
                />
                <span className="text-zinc-500 font-bold">/</span>
                <input
                  ref={monthInputRef}
                  type="text"
                  maxLength={2}
                  placeholder="MM"
                  value={newCommMonth}
                  onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setNewCommMonth(v); if (v.length === 2) dayInputRef.current?.focus(); }}
                  onKeyDown={(e) => { if (e.key === 'Backspace' && newCommMonth === '') yearInputRef.current?.focus(); }}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-center text-white focus:outline-none focus:border-[#1DB954] transition-colors"
                />
                <span className="text-zinc-500 font-bold">/</span>
                <input
                  ref={dayInputRef}
                  type="text"
                  maxLength={2}
                  placeholder="DD"
                  value={newCommDay}
                  onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setNewCommDay(v); }}
                  onKeyDown={(e) => { if (e.key === 'Backspace' && newCommDay === '') monthInputRef.current?.focus(); }}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-center text-white focus:outline-none focus:border-[#1DB954] transition-colors"
                />
              </div>
            </div>
            <button onClick={handleCreateCommunity} className="w-full py-4 bg-[#1DB954] text-black rounded-xl text-sm font-bold shadow-lg hover:scale-105 transition-transform flex justify-center items-center gap-2">
              {t('createAndJoinLive')}
            </button>
          </div>
        </div>
      )}
      {showNotifications && (
        <NotificationsModal
          notifications={notifications}
          labels={{
            title: t('notifications'),
            empty: t('notificationsEmpty'),
          }}
          onClose={() => setShowNotifications(false)}
          onNotificationClick={async (n) => {
      if (n.read) return;
      setNotifications(prev => prev.map(p => p.id === n.id ? { ...p, read: true } : p));
      try {
        const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
        if (error) throw error;
      } catch (err) {
        setNotifications(prev => prev.map(p => p.id === n.id ? { ...p, read: false } : p));
      }
    }}
        />
      )}
      {showSettingsMenu && (
        <div className="fixed inset-0 bg-black z-[800] animate-fade-in overflow-y-auto">
          <div className="flex items-center px-4 py-4 border-b border-zinc-900 sticky top-0 bg-black/90 backdrop-blur-md z-10"><button onClick={() => setShowSettingsMenu(false)}><IconChevronLeft /></button><h2 className="text-white font-bold text-lg mx-auto pr-8">{t('settings')}</h2></div>
          <div className="px-4 py-6">
            <div className="bg-[#1c1c1e] rounded-[22px] p-4 flex items-center justify-between mb-8 cursor-pointer" onClick={() => { setShowSettingsMenu(false); openEditProfile(); }}><div className="flex items-center gap-4"><img src={myProfile.avatar} className="w-12 h-12 rounded-full object-cover border border-zinc-800" /><div><p className="font-bold text-lg">{myProfile.name}</p><p className="text-sm text-zinc-500">@{myProfile.handle}</p></div></div><IconChevronRight /></div>
            <p className="text-xs font-bold text-zinc-500 mb-2 px-2">{t('creatorTools')}</p>
            <div className="bg-[#1c1c1e] rounded-2xl mb-8 flex flex-col">
	              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors" onClick={loadRevenueDashboard}>
                <div className="flex items-center gap-3 text-yellow-500"><IconYen /><p className="font-bold text-sm text-white">{t('revenueDashboard')}</p></div>
                <IconChevronRight />
              </div>
            </div>
            <p className="text-xs font-bold text-zinc-500 mb-2 px-2">{t('features')}</p>
            <div className="bg-[#1c1c1e] rounded-2xl mb-8"><div className="flex items-center justify-between p-4"><div className="flex items-center gap-3"><IconMusic /><p className="font-bold text-sm">{t('audio')}</p></div><button onClick={() => setSettings({ ...settings, audio: !settings.audio })} className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.audio ? 'bg-[#1DB954]' : 'bg-zinc-700'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${settings.audio ? 'translate-x-6' : 'translate-x-0'}`}></div></button></div></div>
            <p className="text-xs font-bold text-zinc-500 mb-2 px-2">{t('settings')}</p>
            <div className="bg-[#1c1c1e] rounded-2xl mb-8 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800/50"><div className="flex items-center gap-3"><IconBell /><p className="font-bold text-sm">{t('notifications')}</p></div><button onClick={() => { setSettings({ ...settings, notifications: !settings.notifications }); }} className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.notifications ? 'bg-[#1DB954]' : 'bg-zinc-700'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${settings.notifications ? 'translate-x-6' : 'translate-x-0'}`}></div></button></div>
              <div className="flex items-center justify-between p-4 border-b border-zinc-800/50"><div className="flex items-center gap-3"><IconLockSetting /><p className="font-bold text-sm">{t('privateAcc')}</p></div><button onClick={() => { setEditIsPrivate(!myProfile.isPrivate); setMyProfile({ ...myProfile, isPrivate: !myProfile.isPrivate }); }} className={`w-12 h-6 rounded-full p-1 transition-colors ${myProfile.isPrivate ? 'bg-white' : 'bg-zinc-700'}`}><div className={`w-4 h-4 rounded-full shadow-md transform transition-transform ${myProfile.isPrivate ? 'translate-x-6 bg-black' : 'translate-x-0 bg-white'}`}></div></button></div>
              <div className="relative flex items-center justify-between p-4 border-b border-zinc-800/50 cursor-pointer"><div className="flex items-center gap-3"><IconClock /><p className="font-bold text-sm">{t('timezone')}: {timeZone.split('/').pop()?.replace('_', ' ')}</p></div><IconChevronRight /><select value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"><optgroup label="Asia"><option value="Asia/Tokyo">Tokyo (JST)</option><option value="Asia/Seoul">Seoul (KST)</option><option value="Asia/Shanghai">Shanghai (CST)</option></optgroup><optgroup label="America"><option value="America/New_York">New York (EST/EDT)</option><option value="America/Los_Angeles">Los Angeles (PST/PDT)</option></optgroup><optgroup label="Europe"><option value="Europe/London">London (GMT/BST)</option><option value="Europe/Paris">Paris (CET/CEST)</option></optgroup></select></div>
              <div className="relative flex items-center justify-between p-4 cursor-pointer"><div className="flex items-center gap-3"><IconGlobe /><p className="font-bold text-sm">{t('language')}: {language}</p></div><IconChevronRight /><select value={language} onChange={(e) => handleLanguageChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"><option value="日本語">日本語</option><option value="English">English</option><option value="中文">中文</option></select></div>
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors" onClick={() => { setShowSettingsMenu(false); setShowBlockedUsersModal(true); }}><div className="flex items-center gap-3"><IconLock /><p className="font-bold text-sm">{t('blockedUsers')}</p></div><IconChevronRight /></div>
            </div>
            <p className="text-xs font-bold text-zinc-500 mb-2 px-2">{t('appInfo')}</p>
            <div className="bg-[#1c1c1e] rounded-2xl mb-8 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800/50 cursor-pointer" onClick={handleShareApp}><div className="flex items-center gap-3"><IconShareExternal /><p className="font-bold text-sm">{t('shareApp')}</p></div><IconChevronRight /></div>
              <div className="flex items-center justify-between p-4 border-b border-zinc-800/50 cursor-pointer"><div className="flex items-center gap-3"><IconStar /><p className="font-bold text-sm">{t('rateApp')}</p></div><IconChevronRight /></div>
              <div className="flex items-center justify-between p-4 border-b border-zinc-800/50 cursor-pointer" onClick={() => setShowAppInfoModal({ title: t('help'), content: t('HelpSupportContent') })}><div className="flex items-center gap-3"><IconHelp /><p className="font-bold text-sm">{t('help')}</p></div><IconChevronRight /></div>
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setShowAppInfoModal({ title: t('appInfo'), content: t('AppInfoContent') })}><div className="flex items-center gap-3"><IconInfo /><p className="font-bold text-sm">{t('appInfo')}</p></div><IconChevronRight /></div>
            </div>
            {currentUser?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
              <>
                <p className="text-xs font-bold text-red-500 mb-2 px-2">{t('adminOnly')}</p>
                <div className="bg-[#1c1c1e] rounded-2xl mb-8 flex flex-col border border-red-500/30">
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-red-500/10 transition-colors rounded-2xl" onClick={() => { setShowSettingsMenu(false); setShowAdminDashboard(true); }}>
                    <div className="flex items-center gap-3 text-red-500"><IconWarning /><p className="font-bold text-sm">{t('adminDashboard')}</p></div>
                    <IconChevronRight />
                  </div>
                </div>
              </>
            )}
            <button onClick={() => setShowLogoutConfirm(true)} className="w-full bg-[#1c1c1e] hover:bg-zinc-900 transition-colors text-white font-bold py-4 rounded-2xl text-center mb-4 shadow-sm">{t('logout')}</button>
            <button onClick={() => setShowDeleteAccountConfirm(true)} className="w-full bg-transparent border border-red-500/30 hover:bg-red-500/10 transition-colors text-red-500 font-bold py-4 rounded-2xl text-center mb-10 shadow-sm">{t('deleteAccFull')}</button>
          </div>
        </div>
      )}
      {showRevenueDashboard && (
        <div className="fixed inset-0 bg-black/95 z-[1500] flex flex-col animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center p-4 border-b border-zinc-900 sticky top-0 bg-black/90 backdrop-blur-md z-10">
            <button onClick={() => setShowRevenueDashboard(false)} className="p-2 -ml-2 text-white hover:opacity-80 transition-opacity"><IconChevronLeft /></button>
            <h2 className="text-white font-bold text-lg mx-auto pr-8">{t('revenueDashboard')}</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 scrollbar-hide">
            {(() => {
              const validHistory = revenueData.history.filter(tx => tx.transaction_type !== 'charge');
              const paidTotal = validHistory.filter(tx => tx.transaction_type?.endsWith('_paid')).reduce((sum, tx) => sum + tx.amount, 0);
              const jpyRevenue = Math.floor(paidTotal * 0.5);
              const canWithdraw = jpyRevenue >= 1000;
              
              return (
                <>
                  <div className="bg-gradient-to-br from-[#1DB954]/20 to-[#1DB954]/5 border border-[#1DB954]/30 rounded-[32px] p-8 mb-4 flex flex-col items-center text-center shadow-[0_0_40px_rgba(29,185,84,0.15)] relative overflow-hidden">
                    <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-[#1DB954] to-transparent opacity-50"></div>
                    <p className="text-[#1DB954] text-[10px] font-black uppercase tracking-widest mb-3">{t('availableRevenue')}</p>
                    <div className="flex items-end gap-1 mb-3">
                      <span className="text-2xl font-bold text-white mb-1">¥</span>
                      <span className="text-5xl font-black text-white tracking-tighter">{jpyRevenue.toLocaleString()}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-bold bg-black/40 px-3 py-1 rounded-full border border-zinc-800 mb-6">
                      {t('payoutEligiblePaidCoins').replace('{coins}', paidTotal.toLocaleString())}
                    </p>
	                    <div className="w-full bg-black/35 border border-zinc-800 rounded-2xl p-3 mb-3 text-left">
	                      <p className="text-[10px] font-bold text-zinc-500 mb-1">{t('payoutSettings')}</p>
	                      <p className="text-xs text-zinc-300 leading-relaxed">
	                        {stripeConnectStatus.lastPayoutFailure ? t('payoutLastFailure').replace('{reason}', stripeConnectStatus.lastPayoutFailure.message || stripeConnectStatus.lastPayoutFailure.code || t('payoutDefaultFailureReason')) : stripeConnectStatus.payoutsEnabled ? t('stripePayoutsReady') : stripeConnectStatus.connected ? t('stripePayoutsIncomplete') : t('stripePayoutsRequired')}
	                      </p>
	                    </div>
	                    {!stripeConnectStatus.payoutsEnabled ? (
	                      <button
	                        onClick={startStripeConnectOnboarding}
	                        disabled={isStartingStripeConnect}
	                        className="w-full py-3.5 rounded-full font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 active:scale-95 disabled:opacity-50"
	                      >
	                        {isStartingStripeConnect ? t('stripeConnecting') : stripeConnectStatus.connected ? t('payoutSetupContinue') : t('payoutSetupStart')}
	                      </button>
	                    ) : (
	                      <button 
	                        disabled={!canWithdraw || isRequestingPayout}
	                        onClick={requestCreatorPayout}
	                        className={`w-full py-3.5 rounded-full font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${canWithdraw ? 'bg-white text-black hover:bg-zinc-200 active:scale-95' : 'bg-black/50 text-zinc-500 border border-zinc-700 cursor-not-allowed'}`}
	                      >
	                        {isRequestingPayout ? t('payoutRequesting') : canWithdraw ? t('payoutRequestButton') : t('payoutMinimum')}
	                      </button>
	                    )}
                  </div>
                  <div className="bg-[#1c1c1e] border border-zinc-800 rounded-3xl p-5 mb-6 flex items-center justify-between shadow-inner">
                    <div className="flex flex-col">
                      <span className="text-zinc-400 text-[10px] font-bold mb-1">{t('totalEarnedCoins')}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center text-black shadow-md">
                          <span className="text-[12px] font-black mt-[1px]">C</span>
                        </div>
                        <span className="text-xl font-black text-white">{revenueData.total.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-4 text-[10px] font-bold text-zinc-500 text-right">
                      <div className="flex flex-col"><span className="mb-0.5">{t('revenueArticle')}</span><span className="text-white">{revenueData.article.toLocaleString()}</span></div>
                      <div className="flex flex-col"><span className="mb-0.5">{t('revenueGift')}</span><span className="text-white">{revenueData.gift.toLocaleString()}</span></div>
                    </div>
                  </div>
                  <h3 className="font-bold text-xs text-zinc-500 mb-4 px-2 uppercase tracking-widest flex items-center gap-2"><IconList /> {t('transactionHistory')}</h3>
                  <div className="flex flex-col gap-3">
                    {validHistory.length > 0 ? validHistory.map((tx: any) => {
                      const isGift = tx.transaction_type?.startsWith('gift');
                      const isPaid = tx.transaction_type?.endsWith('_paid');
                      const sender = allProfiles.find(u => u.id === tx.sender_id);
                      return (
                        <div key={tx.id} className="bg-[#1c1c1e] p-4 rounded-2xl border border-zinc-800 flex items-center justify-between shadow-sm relative overflow-hidden">
                          {isPaid && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1DB954]"></div>}
                          <div className="flex items-center gap-3 pl-1">
                            <img src={sender?.avatar || '/default-avatar.png'} className="w-10 h-10 rounded-full object-cover border border-zinc-700 shrink-0" />
                            <div className="flex flex-col justify-center">
                              <p className="font-bold text-sm text-white leading-tight mb-1.5">{sender?.name || t('userFallback')}</p>
                              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mb-0.5">
                                <div className="w-3 h-3 flex items-center justify-center opacity-80">
                                  {isGift ? <IconSparkles /> : <IconArticle />}
                                </div>
                                <span>{isGift ? t('revenueGiftReceived') : t('revenueArticlePurchased')}</span>
                                <span className={isPaid ? 'text-[#1DB954] font-bold ml-1' : 'text-zinc-500 ml-1'}>
                                  ({isPaid ? t('paidCoin') : t('freeCoin')})
                                </span>
                              </div>
                              <p className="text-[9px] text-zinc-600">{new Date(tx.created_at).toLocaleDateString('ja-JP')} {new Date(tx.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`font-black text-lg ${isPaid ? 'text-[#1DB954]' : 'text-yellow-500'}`}>+{tx.amount.toLocaleString()}</p>
                            <p className="text-[9px] text-zinc-500">{t('coinUnit')}</p>
                          </div>
                        </div>
                      )
                    }) : (
                      <div className="text-center py-16 bg-[#1c1c1e] rounded-3xl border border-zinc-800 border-dashed">
                        <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-600 mx-auto mb-3"><IconYen /></div>
                        <p className="text-zinc-400 text-sm font-bold">{t('noRevenueData')}</p>
                        <p className="text-[10px] text-zinc-500 mt-2 px-6">{t('noRevenueDataDescription').split('\n').map((line: string, index: number) => <React.Fragment key={line}>{index > 0 && <br />}{line}</React.Fragment>)}</p>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
      {/* 💡 ブロックリスト確認・解除モーダル */}
      {showBlockedUsersModal && (
        <BlockedUsersModal
          users={displayBlockedUsers}
          labels={{
            title: t('blockedUsers'),
            empty: t('noBlockedUsers'),
            unblock: t('unblock'),
          }}
          onClose={() => setShowBlockedUsersModal(false)}
          onUnblockUser={handleUnblockUser}
        />
      )}
      {/* 💡 共通の友達リストモーダル */}
      {showMutualFriendsModal && (
        <div className="fixed inset-0 bg-black/95 z-[900] flex flex-col animate-fade-in">
          <div className="flex items-center p-4 border-b border-zinc-900 sticky top-0 bg-black/90 backdrop-blur-md z-10">
            <button onClick={() => setShowMutualFriendsModal(false)}><IconChevronLeft /></button>
            <h2 className="text-white font-bold text-lg mx-auto pr-8">{t('mutualFriends')}</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-4">
              {mutualFriendsList.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-[#1c1c1e] rounded-2xl border border-zinc-800 cursor-pointer hover:bg-zinc-800" onClick={() => { setShowMutualFriendsModal(false); setViewingUser(u); setActiveTab('other_profile'); }}>
                  <div className="flex items-center gap-3">
                    <img src={u.avatar} className="w-12 h-12 rounded-full object-cover" />
                    <div><p className="font-bold text-sm text-white">{u.name}</p><p className="text-[10px] text-zinc-500">@{u.handle}</p></div>
                  </div>
                  <IconChevronRight />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* 💡 アカウント削除確認モーダル */}
      {showDeleteAccountConfirm && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[1000] flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowDeleteAccountConfirm(false)}>
          <div className="bg-[#1c1c1e] border border-red-500/50 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><IconWarning /></div>
            <p className="text-center font-bold text-lg mb-4 text-white">{t('deleteAccountConfirmTitle')}</p>
            <p className="text-xs text-zinc-400 text-center mb-8 leading-relaxed">
              {t('deleteAccountWarningLine1')}<br />{t('deleteAccountWarningLine2')}<br />{t('deleteAccountWarningLine3')}
            </p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteAccountConfirm(false)} className="flex-1 py-3.5 border border-zinc-800 rounded-xl text-xs font-bold uppercase hover:bg-zinc-800">{t('cancel')}</button>
              <button onClick={handleDeleteAccount} className="flex-1 py-3.5 bg-red-500 text-white rounded-xl text-xs font-bold uppercase hover:scale-105 transition-transform shadow-lg">{t('deleteAccountAction')}</button>
            </div>
          </div>
        </div>
      )}
      {/* 💡 運営専用：{t('adminDashboard')}画面 */}
      {showAdminDashboard && (
        <div className="fixed inset-0 bg-black/95 z-[900] animate-fade-in flex flex-col">
          <div className="flex items-center p-4 border-b border-zinc-900 sticky top-0 bg-black/90 backdrop-blur-md z-10">
            <button onClick={() => setShowAdminDashboard(false)}><IconChevronLeft /></button>
            <h2 className="text-red-500 font-bold text-lg mx-auto pr-8 flex items-center gap-2"><IconWarning /> {t('adminDashboard')}</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">{t('adminDashboardDescriptionLine1')}<br />{t('adminDashboardDescriptionLine2')}</p>
            <div className="flex flex-col gap-4 pb-12">
              {realCommunities.filter(c => (c.reportedBy?.length || 0) >= 3).map(c => (
                <div key={c.id} className="bg-[#1c1c1e] border border-red-500/30 rounded-2xl p-5 shadow-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-base text-white">{c.name}</h3>
                      <p className="text-xs text-[#1DB954] mt-1">{c.date}</p>
                    </div>
                    <span className="bg-red-500/20 text-red-500 text-[10px] font-bold px-3 py-1 rounded-full border border-red-500/30">{t('adminReportCount').replace('{count}', String(c.reportedBy?.length || 0))}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mb-5">{t('adminParticipantsCount').replace('{count}', String(c.memberCount))} | ID: {c.id}</p>
                  <div className="flex gap-3">
                    <button onClick={() => handleDeleteCommunity(c.id)} className="flex-1 py-3 bg-red-500 text-white rounded-xl text-xs font-bold transition-transform active:scale-95 shadow-md">{t('adminDeletePermanently')}</button>
                    <button onClick={() => handleRestoreCommunity(c.id)} className="flex-1 py-3 border border-zinc-600 text-white rounded-xl text-xs font-bold transition-transform active:scale-95 hover:bg-zinc-800">{t('adminRestoreSafe')}</button>
                  </div>
                </div>
              ))}
              {realCommunities.filter(c => (c.reportedBy?.length || 0) >= 3).length === 0 && (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 text-[#1DB954]"><IconCheck /></div>
                  <p className="font-bold text-zinc-400">{t('adminNoReportedCommunities')}</p>
                  <p className="text-[10px] text-zinc-600 mt-2">{t('adminPeacefulState')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <EditProfileModal
        isOpen={isEditingProfile}
        title={t('editProfile')}
        cancelLabel={t('cancel')}
        saveLabel={t('save')}
        namePlaceholder={t('name')}
        handlePlaceholder={t('handle')}
        bioPlaceholder={t('bio')}
        hashtagsLabel={t('hashtagsCommaSeparated')}
        hashtagsPlaceholder={t('hashtagExample')}
        liveHistoryLabel={t('liveHistoryCommaSeparated')}
        liveHistoryPlaceholder={t('liveHistoryExample')}
        twitterLabel={t('twitterLink')}
        twitterPlaceholder={t('urlExample')}
        instagramLabel={t('instagramLink')}
        instagramPlaceholder={t('instagramUrlExample')}
        editAvatar={editAvatar}
        editName={editName}
        editHandle={editHandle}
        editBio={editBio}
        editHashtags={editHashtags}
        editLiveHistory={editLiveHistory}
        editTwitter={editTwitter}
        editInstagram={editInstagram}
        onClose={() => setIsEditingProfile(false)}
        onSave={saveProfileChanges}
        onImageUpload={handleImageUpload}
        onNameChange={setEditName}
        onHandleChange={setEditHandle}
        onBioChange={setEditBio}
        onHashtagsChange={setEditHashtags}
        onLiveHistoryChange={setEditLiveHistory}
        onTwitterChange={setEditTwitter}
        onInstagramChange={setEditInstagram}
      />
      {showInitialOnboarding && (
        <div className="fixed inset-0 bg-black/90 z-[520] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[#1c1c1e] w-full max-w-sm rounded-[24px] p-6 flex flex-col gap-5 shadow-2xl max-h-[86vh] overflow-y-auto">
            <div>
              <div className="w-12 h-12 rounded-full bg-[#1DB954]/20 text-[#1DB954] flex items-center justify-center mb-4">
                <IconHeadphones />
              </div>
              <h3 className="font-bold text-xl mb-2">{t('onboardingTitle')}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {t('onboardingDescription')}
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-bold text-white">{t('profileSection')}</p>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 shrink-0 group cursor-pointer">
                  <img src={editAvatar} alt="" className="w-full h-full rounded-full object-cover opacity-80 group-hover:opacity-60" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><IconCamera /></div>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" aria-label={t('profileSection')} />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={t('name')} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-zinc-500" />
                  <div className="flex items-center bg-black border border-zinc-800 rounded-xl overflow-hidden focus-within:border-zinc-500">
                    <span className="pl-3 text-zinc-500 font-bold">@</span>
                    <input type="text" value={editHandle} onChange={(e) => setEditHandle(e.target.value)} placeholder={t('handle')} className="min-w-0 w-full bg-transparent p-3 text-sm text-white focus:outline-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[11px] font-bold text-white">{t('musicTaste')}</p>
              {renderOnboardingChipPicker(
                t('favoriteGenres'),
                onboardingGenreCandidates,
                onboardingGenres,
                setOnboardingGenres
              )}
              <div>
                <label className="text-[10px] text-zinc-500 ml-1 mb-2 block font-bold">{t('favoriteArtist')}</label>
                <input
                  type="text"
                  value={onboardingArtistInput}
                  onChange={(e) => setOnboardingArtistInput(e.target.value)}
                  placeholder={t('artistSearchPlaceholder')}
                  aria-label={t('favoriteArtistSearchLabel')}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-zinc-500"
                />
                {onboardingArtists.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {onboardingArtists.map(artist => (
                      <button
                        key={artist}
                        type="button"
                        onClick={() => removeOnboardingTag(artist, setOnboardingArtists)}
                        className="px-3 py-1.5 bg-[#1DB954] text-black rounded-full text-[11px] font-bold"
                      >
                        {artist} ×
                      </button>
                    ))}
                  </div>
                )}
                {onboardingArtistInput.trim() && (
                  <div className="mt-2 bg-black border border-zinc-800 rounded-xl overflow-hidden">
                    {onboardingArtistSuggestions.length > 0 ? onboardingArtistSuggestions.map(artist => (
                      <button
                        key={artist.artistId}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addOnboardingTag(artist.artistName, setOnboardingArtistInput, onboardingArtists, setOnboardingArtists);
                        }}
                        className="w-full flex items-center gap-3 p-3 text-left text-xs text-white hover:bg-zinc-800 border-b border-zinc-900 last:border-0"
                      >
                        <img src={artist.artworkUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                        <span className="font-bold truncate">{artist.artistName}</span>
                      </button>
                    )) : (
                      <p className="p-3 text-[11px] text-zinc-500">{t('searchingCandidates')}</p>
                    )}
                  </div>
                )}
              </div>
              {renderOnboardingChipPicker(
                t('hashtags'),
                onboardingHashtagCandidates,
                onboardingHashtags,
                setOnboardingHashtags,
                "#"
              )}
              {renderOnboardingTextAdd(
                t('customHashtagPlaceholder'),
                onboardingHashtagInput,
                setOnboardingHashtagInput,
                onboardingHashtags,
                setOnboardingHashtags
              )}
              {renderOnboardingChipPicker(
                t('liveHistory'),
                onboardingLiveCandidates,
                onboardingLiveHistory,
                setOnboardingLiveHistory
              )}
              {renderOnboardingTextAdd(
                t('customLiveHistoryPlaceholder'),
                onboardingLiveInput,
                setOnboardingLiveInput,
                onboardingLiveHistory,
                setOnboardingLiveHistory
              )}
            </div>

            <div className="flex gap-3 sticky bottom-0 bg-[#1c1c1e] pt-2">
              <button
                type="button"
                onClick={() => {
                  if (currentUser?.id) window.localStorage.setItem(getOnboardingSkippedKey(currentUser.id), 'true');
                  setShowInitialOnboarding(false);
                }}
                className="flex-1 py-3.5 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                {t('later')}
              </button>
              <button
                type="button"
                onClick={saveInitialOnboarding}
                className="flex-1 py-3.5 bg-[#1DB954] text-black rounded-xl text-xs font-bold hover:brightness-110 transition-colors"
              >
                {t('saveAndStart')}
              </button>
            </div>
          </div>
        </div>
      )}
      {showAppInfoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[950] flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowAppInfoModal(null)}>
          <div className="bg-[#1c1c1e] border border-zinc-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative text-center" onClick={e => e.stopPropagation()}>
            <div className="mx-auto w-12 h-12 bg-black rounded-full flex items-center justify-center mb-4 text-white"><IconInfo /></div>
            <h3 className="font-bold text-lg mb-2">{showAppInfoModal.title}</h3>
            <p className="text-sm text-zinc-400 leading-relaxed mb-8 whitespace-pre-line">{showAppInfoModal.content}</p>
            <button onClick={() => setShowAppInfoModal(null)} className="w-full py-3 bg-white text-black rounded-xl text-xs font-bold uppercase">{t('close')}</button>
          </div>
        </div>
      )}
      <UserListModal
        title={showUserListModal ? t(showUserListModal === 'FOLLOWING' ? 'following' : 'followers') : null}
        users={displayModalUsers}
        searchQuery={modalSearchQuery}
        followedUsers={followedUsers}
        searchPlaceholder={t('searchUsers')}
        followLabel={t('follow')}
        followingLabel={t('following')}
        onClose={() => { setShowUserListModal(null); setModalSearchQuery(""); }}
        onSearchChange={setModalSearchQuery}
        onOpenUser={(u) => { setViewingUser(u); setActiveTab('other_profile'); setShowUserListModal(null); }}
        onToggleFollow={toggleFollow}
      />
      <div className="p-4 sm:p-6">
        {/* 🏠 Home タブ */}
        {activeTab === 'home' && (
          <div className="animate-fade-in mt-4">
            <header className="flex justify-between items-center mb-6 relative z-50">
              <h1 className="text-4xl font-bold italic">Echoes</h1>
              <button onClick={() => setShowNotifications(true)} className="relative p-2 z-50 pointer-events-auto">
                <IconBell />
                {unreadNotificationsCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black"></span>}
              </button>
            </header>
            <div className="flex gap-6 mb-6 px-1 border-b border-zinc-900">
              <button onClick={() => setHomeFeedMode('all')} className={`pb-2 text-sm font-bold transition-colors ${homeFeedMode === 'all' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}>{t('global')}</button>
              <button onClick={() => setHomeFeedMode('following')} className={`pb-2 text-sm font-bold transition-colors ${homeFeedMode === 'following' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}>{t('following')}</button>
            </div>
            <MusicSearchBox
              placeholder={t('searchPlaceholder')}
              searchQuery={searchQuery}
              isSearchFocused={isSearchFocused}
              searchArtistInfo={searchArtistInfo}
              searchResults={searchResults}
              trendingSongs={trendingSongs}
              topResultsLabel={t('topResults')}
              trendingSongsLabel={trendingSongsLabel}
              artistLabel={t('artist')}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              onSearchQueryChange={setSearchQuery}
              onArtistMouseDown={handleArtistClick}
              onSelectSong={setDraftSong}
            />
            {!isSearchFocused && <section className="mb-6" data-testid="today-recommended-songs">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <IconSparkles /> {t('todayRecommendedSongs')}
                </h2>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {todayRecommendedSongs.length > 0 ? todayRecommendedSongs.map((song, index) => (
                  <div
                    key={`${song.trackId || song.trackName}-${index}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDraftSong(song)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDraftSong(song); }}
                    className="min-w-[240px] max-w-[260px] flex items-center gap-3 rounded-2xl border border-zinc-800 bg-[#1c1c1e] p-3 text-left hover:bg-zinc-800 transition-colors"
                  >
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-zinc-800 flex-shrink-0">
                      <img src={song.artworkUrl100 || song.artworkUrl60} alt="" className="w-full h-full object-cover" />
                      {song.previewUrl && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white">
                          <IconPlay />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-white truncate">{song.trackName}</p>
                      <p className="text-[10px] text-zinc-400 truncate mt-0.5">{song.artistName}</p>
                      <p className="text-[10px] text-[#1DB954] mt-2 line-clamp-2">{song.reason || t('similarSongReason')}</p>
                    </div>
                  </div>
                )) : (
                  <div className="w-full rounded-2xl border border-zinc-900 bg-[#1c1c1e]/60 px-4 py-5 text-xs text-zinc-500">
                    {t('feedRecommendationEmpty')}
                  </div>
                )}
              </div>
            </section>}
            {showPostSuccessCard && (
              <div className="mb-6 rounded-2xl border border-[#1DB954]/20 bg-[#1DB954]/10 px-4 py-4">
                <p className="text-sm font-bold text-white">{t('feedPostSuccessTitle')}</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowPostSuccessCard(false);
                    setDiscoverTabMode('users');
                    setActiveTab('search');
                  }}
                  className="mt-3 px-4 py-2 rounded-full bg-[#1DB954] text-black text-[11px] font-bold"
                >
                  {t('feedPostSuccessAction')}
                </button>
              </div>
            )}
            <div className="flex flex-col gap-6">
              {allFeedVibes.length === 0 && !isLoadingVibes ? (
                <div className="text-center text-zinc-500 py-20">
                  <p className="text-sm font-bold text-zinc-300">{t('feedEmptyTitle')}</p>
                  <p className="text-xs mt-2">{t('feedEmptyBody')}</p>
                </div>
              ) : (
                allFeedVibes.map(renderFeedCard)
              )}
              {hasMoreVibes && (
                <div ref={observerTarget} className="py-10 flex justify-center items-center">
                  <div className="w-6 h-6 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              {!hasMoreVibes && allFeedVibes.length > 0 && (
                <p className="text-center text-zinc-500 py-10 text-xs font-bold">{t('feedAllPostsLoaded')}</p>
              )}
            </div>
          </div>
        )}
        {/* 🔍 Search / Discover タブ */}
        {activeTab === 'search' && (
          <div className="mt-6 animate-fade-in px-1 pb-10">
            <header className="flex justify-center mb-6"><h2 className="text-xl font-black tracking-tight">Echoes.</h2></header>
            {/* 💡 3つの切り替えタブ */}
            <div className="flex bg-[#1c1c1e] p-1 rounded-xl mb-6 mx-2 border border-zinc-800">
              <button onClick={() => setDiscoverTabMode('users')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-colors ${discoverTabMode === 'users' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>{t('people')}</button>
              <button onClick={() => setDiscoverTabMode('communities')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-colors ${discoverTabMode === 'communities' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>{t('community')}</button>
              <button onClick={() => setDiscoverTabMode('match')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-colors ${discoverTabMode === 'match' ? 'bg-[#1DB954] text-black shadow-sm' : 'text-zinc-500 hover:text-white'}`}>{t('match')}</button>
            </div>
            {/* 👤 People モード */}
            {discoverTabMode === 'users' && (
              <div className="px-2">
                <div className="relative mb-6">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500"><IconSearch /></div>
                  <input type="text" placeholder={t('searchUser')} className="w-full bg-[#1c1c1e] border border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-[13px] font-bold text-white focus:outline-none" value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} onFocus={() => setUserSearchFocused(true)} onBlur={() => setTimeout(() => setUserSearchFocused(false), 200)} />
                  {userSearchFocused && userSearchQuery && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden z-50 shadow-2xl">
                      {realUserSearchResults.map(u => (
                        <div key={u.id} onMouseDown={(e) => { e.preventDefault(); setViewingUser(u); setActiveTab('other_profile'); }} className="flex items-center gap-3 p-3 text-xs text-white hover:bg-zinc-700 cursor-pointer border-b border-zinc-700 last:border-0">
                          <img src={u.avatar} className="w-8 h-8 rounded-full object-cover" />
                          <div className="flex flex-col"><span className="font-bold">{u.name}</span><span className="text-[10px] text-zinc-400">@{u.handle}</span></div>
                        </div>
                      ))}
                      {realUserSearchResults.length === 0 && <div className="p-4 text-xs text-zinc-500 text-center">{t('notFound')}</div>}
                    </div>
                  )}
                </div>
                {hasPeopleMusicFilter && (
                  <div className="mb-5 mx-1 rounded-2xl border border-[#1DB954]/20 bg-[#1DB954]/10 px-4 py-3">
                    <p className="text-[11px] font-bold text-[#1DB954]">{t('peopleFilterNotice')}</p>
                  </div>
                )}
                {(allAvailableHashtags.length > 0 || allAvailableLiveHistories.length > 0) && (
                  <div className="mb-8 px-1">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <p className="text-xs font-bold text-white">{t('musicTags')}</p>
                      {hasPeopleMusicFilter && (
                        <button onClick={() => setPeopleMusicFilter({ hashtags: [], liveHistories: [] })} className="text-[10px] font-bold text-zinc-500 hover:text-white transition-colors">{t('clear')}</button>
                      )}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {allAvailableHashtags.slice(0, 8).map(h => {
                        const isSelected = peopleMusicFilter.hashtags.includes(h);
                        return (
                          <button key={h} onClick={() => setPeopleMusicFilter(prev => ({ ...prev, hashtags: isSelected ? prev.hashtags.filter(x => x !== h) : [...prev.hashtags, h] }))} className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition-colors ${isSelected ? 'bg-[#1DB954] border-[#1DB954] text-black' : 'bg-[#1c1c1e] border-zinc-800 text-zinc-400 hover:text-white'}`}>
                            #{getMusicTagLabel(h)}
                          </button>
                        );
                      })}
                      {allAvailableLiveHistories.slice(0, 6).map(l => {
                        const isSelected = peopleMusicFilter.liveHistories.includes(l);
                        return (
                          <button key={l} onClick={() => setPeopleMusicFilter(prev => ({ ...prev, liveHistories: isSelected ? prev.liveHistories.filter(x => x !== l) : [...prev.liveHistories, l] }))} className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition-colors flex items-center gap-1.5 ${isSelected ? 'bg-[#1DB954] border-[#1DB954] text-black' : 'bg-[#1c1c1e] border-zinc-800 text-zinc-400 hover:text-white'}`}>
                            <IconTicket /> {l}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="mb-10">
                  <p className="text-xs font-bold text-white mb-4 px-2">{t('suggestedFriends')}</p>
                  {filteredSuggestedFriends.length > 0 ? filteredSuggestedFriends.map(({ user: u, mutualCount }) => (
                    <div key={u.id} className="flex items-center justify-between py-3 px-3 hover:bg-zinc-800/30 rounded-2xl transition-colors">
                      <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => { setViewingUser(u); setActiveTab('other_profile'); }}>
                        <img src={u.avatar} className="w-[52px] h-[52px] rounded-full object-cover border border-zinc-800" />
                        <div className="flex-1">
                          <p className="font-bold text-[15px] text-white flex items-center gap-1">{u.name} {(u as any).isVerified && <IconVerified />}</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">@{u.handle}</p>
                          {mutualCount > 0 && <p className="text-[10px] text-zinc-500 mt-1">{formatCountTemplate('mutualFriendsCount', mutualCount)}</p>}
                        </div>
                      </div>
                      <button onClick={() => toggleFollow(u.id)} className={`px-5 py-2 rounded-full text-[11px] font-bold transition-colors ${followedUsers.has(u.id) ? 'bg-transparent border border-zinc-700 text-zinc-400' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}>{followedUsers.has(u.id) ? t('following') : t('add')}</button>
                    </div>
                  )) : <p className="text-xs text-zinc-500 px-3 py-4 bg-[#1c1c1e]/50 rounded-2xl border border-zinc-800/50">{t(hasPeopleMusicFilter ? 'suggestedFriendsEmptyFiltered' : 'suggestedFriendsEmpty')}</p>}
                </div>
                <div className="mb-10">
                  <p className="text-xs font-bold text-white mb-4 px-2">{t('similarPeople')}</p>
                  {filteredSimilarMusicUsers.length > 0 ? filteredSimilarMusicUsers.map(({ user: u, sharedReasonKey, sharedReasonLabel }) => (
                    <div key={u.id} className="flex items-center justify-between py-3 px-3 hover:bg-zinc-800/30 rounded-2xl transition-colors">
                      <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => { setViewingUser(u); setActiveTab('other_profile'); }}>
                        <div className="relative">
                          <img src={u.avatar} className="w-[52px] h-[52px] rounded-full object-cover border border-zinc-800" />
                          <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-0.5 text-[10px] border border-[#1c1c1e] flex items-center justify-center w-6 h-6 shadow-lg"><IconMusicSmall /></div>
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-[15px] text-white flex items-center gap-1">{u.name} {(u as any).isVerified && <IconVerified />}</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">@{u.handle}</p>
                          <p className="text-[10px] text-[#1DB954] mt-1.5 font-bold">{formatTemplate(sharedReasonKey, { label: sharedReasonLabel })}</p>
                          <p className="text-[10px] text-zinc-500 mt-1">{t('followUserPrompt')}</p>
                        </div>
                      </div>
                      <button onClick={() => toggleFollow(u.id)} className={`px-5 py-2 rounded-full text-[11px] font-bold transition-colors ${followedUsers.has(u.id) ? 'bg-transparent border border-zinc-700 text-zinc-400' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}>{followedUsers.has(u.id) ? t('following') : t('follow')}</button>
                    </div>
                  )) : <p className="text-xs text-zinc-500 px-3 py-4 bg-[#1c1c1e]/50 rounded-2xl border border-zinc-800/50">{t(hasPeopleMusicFilter ? 'similarPeopleEmptyFiltered' : 'similarPeopleEmpty')}</p>}
                </div>
                <div className="mb-10">
                  <p className="text-xs font-bold text-white mb-4 px-2">{t('popularAccounts')}</p>
                  {filteredPopularUsers.length > 0 ? filteredPopularUsers.map(({ user: u, postCount }) => (
                    <div key={u.id} className="flex items-center justify-between py-3 px-3 hover:bg-zinc-800/30 rounded-2xl transition-colors">
                      <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => { setViewingUser(u); setActiveTab('other_profile'); }}>
                        <div className="relative">
                          <img src={u.avatar} className="w-[52px] h-[52px] rounded-full object-cover border border-zinc-800" />
                          <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-0.5 text-[10px] border border-[#1c1c1e] flex items-center justify-center w-6 h-6 shadow-lg"><IconFlame /></div>
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-[15px] text-white flex items-center gap-1">{u.name} {(u as any).isVerified && <IconVerified />}</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">@{u.handle}</p>
                          <p className="text-[10px] text-orange-500 mt-1.5 font-bold">{formatCountTemplate('totalPostCount', postCount)}</p>
                        </div>
                      </div>
                      <button onClick={() => toggleFollow(u.id)} className={`px-5 py-2 rounded-full text-[11px] font-bold transition-colors ${followedUsers.has(u.id) ? 'bg-transparent border border-zinc-700 text-zinc-400' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}>{followedUsers.has(u.id) ? t('following') : t('add')}</button>
                    </div>
                  )) : <p className="text-xs text-zinc-500 px-3 py-4 bg-[#1c1c1e]/50 rounded-2xl border border-zinc-800/50">{t(hasPeopleMusicFilter ? 'popularAccountsEmptyFiltered' : 'popularAccountsEmpty')}</p>}
                </div>
              </div>
            )}
            {/* 🎪 Community モード */}
            {discoverTabMode === 'communities' && (
              <div className="px-2">
                <div className="relative mb-6">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500"><IconSearch /></div>
                  <input type="text" placeholder={t('searchLive')} className="w-full bg-[#1c1c1e] border border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-[13px] font-bold text-white focus:outline-none" value={communitySearchQuery} onChange={(e) => setCommunitySearchQuery(e.target.value)} onFocus={() => setCommunitySearchFocused(true)} onBlur={() => setTimeout(() => setCommunitySearchFocused(false), 200)} />
                  {communitySearchFocused && suggestedCommunities.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden z-50 shadow-2xl">
                      {suggestedCommunities.map(c => (
                        <div key={c.id} onMouseDown={(e) => { e.preventDefault(); setActiveCommunityDetail(c); }} className="flex items-center gap-3 p-3 text-xs text-white hover:bg-zinc-700 cursor-pointer border-b border-zinc-700 last:border-0"><IconTicket /><span className="font-bold">{formatArtistCommunityDisplayName(c)}</span></div>
                      ))}
                    </div>
                  )}
                </div>
                <div onClick={() => setShowCommCalendar(true)} className="mb-6 relative bg-[#1c1c1e] p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-zinc-800 transition-colors shadow-sm">
                  <div className="flex items-center gap-3"><IconCalendar /><span className="text-sm font-bold text-white">{communityDateFilter ? formatDatePerformances(communityDateFilter) : t('searchFromCalendar')}</span></div>
                  {communityDateFilter ? <button onClick={(e) => { e.stopPropagation(); setCommunityDateFilter(""); }} className="w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white"><IconCross /></button> : <IconChevronRight />}
                </div>
                {visibleArtistCommunities.length > 0 && (
                  <div className="bg-[#1c1c1e] rounded-3xl p-5 mb-8 shadow-sm">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><IconUsers /> {t('artistCommunities')}</h3>
                    <div className="flex flex-col">
                      {visibleArtistCommunities.map(c => (
                        <div key={c.id} className="flex items-center justify-between py-3 border-b border-zinc-800/50 last:border-0 cursor-pointer group" onClick={() => setActiveCommunityDetail(c)}>
                          <div className="flex items-center gap-4 flex-1 overflow-hidden">
                            <div className="w-11 h-11 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0">
                              {c.artworkUrl ? (
                                <>
                                  <img src={c.artworkUrl} className="w-full h-full object-cover" onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                                    if (fallback) fallback.style.display = 'flex';
                                  }} />
                                  <div className="hidden w-full h-full items-center justify-center text-zinc-500"><IconUsers /></div>
                                </>
                              ) : <div className="w-full h-full flex items-center justify-center text-zinc-500"><IconUsers /></div>}
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="font-bold text-sm text-white truncate group-hover:text-[#1DB954] transition-colors">{formatArtistCommunityDisplayName(c)}</p>
                              <p className="text-[10px] text-zinc-500 truncate">{formatArtistCommunityStats(c)}</p>
                            </div>
                          </div>
                          <IconChevronRight />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="bg-[#1c1c1e] rounded-3xl p-5 mb-8 shadow-sm">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><IconCrown /> {t('popularLiveCommunity')}</h3>
                  <div className="flex flex-col">{suggestedCommunities.map((c, i) => (
                    <div key={c.id} className="flex items-center justify-between py-3 border-b border-zinc-800/50 last:border-0 cursor-pointer group" onClick={() => setActiveCommunityDetail(c)}>
                      <div className="flex items-center gap-4 flex-1 overflow-hidden">
                        <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 font-bold text-[10px] flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-bold text-sm text-white truncate group-hover:text-[#1DB954] transition-colors flex items-center gap-1.5">{formatArtistCommunityDisplayName(c)} {c.isVerified && <span className="text-[#1DB954] w-3.5 h-3.5 flex items-center"><IconVerified /></span>}</p>
                          <p className="text-[10px] text-zinc-500">{formatCommunityDate(c.date)} • {formatCountTemplate('communityJoinedCount', c.memberCount)}</p>
                        </div>
                      </div>
                      <IconChevronRight />
                    </div>
                  ))}
                  </div>
                  <button onClick={() => setShowCreateCommunityModal(true)} className="w-full mt-4 py-4 border border-dashed border-zinc-700 text-zinc-400 rounded-xl text-sm font-bold hover:bg-zinc-800 hover:text-white transition-colors flex items-center justify-center gap-2">
                    <IconPlus /> {t('createLiveIfNotFound')}
                  </button>
                </div>
              </div>
            )}
            {/* 💖 Match モード（スワイプ画面） */}
            {discoverTabMode === 'match' && (
              <div className="animate-fade-in flex flex-col items-center justify-center h-[calc(100vh-250px)] overflow-hidden relative">
                <div className="absolute top-0 w-full px-2 flex justify-end items-center z-10 mb-4">
                  <button onClick={() => setShowMatchFilterModal(true)} className="p-2 bg-[#1c1c1e] border border-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors shadow-lg"><IconFilter /></button>
                </div>
                {matchIndex < filteredMatchUsers.length ? (
                  <div
                    className="w-full max-w-sm bg-[#1c1c1e] border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col max-h-[65vh] mt-10"
                    style={{ transform: `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.05}deg)`, transition: isDragging ? 'none' : 'transform 0.3s ease-out' }}
                    onTouchStart={handleDragStart} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd} onMouseDown={handleDragStart} onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}
                  >
                    {swipeOffset > 20 && <div className="absolute top-10 left-6 z-50 border-4 border-[#1DB954] text-[#1DB954] font-black text-3xl px-4 py-1 rounded-xl transform -rotate-12 uppercase tracking-widest opacity-80">{t('follow')}</div>}
                    {swipeOffset < -20 && <div className="absolute top-10 right-6 z-50 border-4 border-zinc-500 text-zinc-500 font-black text-3xl px-4 py-1 rounded-xl transform rotate-12 uppercase tracking-widest opacity-80">{t('pass')}</div>}
                    <div className="relative h-64 w-full flex-shrink-0 cursor-pointer" onClick={() => { setViewingUser(filteredMatchUsers[matchIndex]); setActiveTab('other_profile'); }}>
                      <img src={filteredMatchUsers[matchIndex].avatar} className="w-full h-full object-cover pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1e] via-transparent to-transparent pointer-events-none"></div>
                      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-1.5 border border-white/10"><IconSparkles /><span className="text-xs font-bold text-white">{getVibeMatchScore(myProfile.id, filteredMatchUsers[matchIndex].id)}{t('matchPercentSuffix')}</span></div>
                      <div className="absolute bottom-4 left-4 right-4"><h3 className="text-2xl font-black text-white flex items-center gap-2">{filteredMatchUsers[matchIndex].name} <span className="text-xs font-bold text-zinc-400 bg-black/50 px-2 py-0.5 rounded-full">{filteredMatchUsers[matchIndex].age || ''}</span></h3><p className="text-sm text-zinc-300">@{filteredMatchUsers[matchIndex].handle}</p></div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 pb-28 scrollbar-hide pointer-events-none">
                      <p className="text-sm text-white mb-4 leading-relaxed">{filteredMatchUsers[matchIndex].bio}</p>
                      <div className="flex flex-wrap gap-2 mb-4">{(filteredMatchUsers[matchIndex].hashtags || []).map((h, i) => (<span key={`h-${i}`} className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded text-[10px]">#{getMusicTagLabel(h)}</span>))}</div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1">{t('topArtists')}</p>
                      <div className="flex flex-wrap gap-2 mb-4">{(filteredMatchUsers[matchIndex].topArtists || []).map((a, i) => (<span key={i} className="px-3 py-1.5 bg-[#1DB954]/10 text-[#1DB954] rounded-full text-xs font-bold flex items-center"><IconMusicSmall /> {a}</span>))}</div>
                    </div>
                    <div className="absolute bottom-6 left-0 w-full flex justify-center gap-4 px-6 bg-gradient-to-t from-[#1c1c1e] pt-6 z-40">
                      <button onClick={() => setMatchIndex(prev => prev + 1)} className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:bg-zinc-700 transition-colors shadow-lg flex-shrink-0"><IconCross /></button>
                      <button onClick={() => handleSwipeFollow(filteredMatchUsers[matchIndex].id, filteredMatchUsers[matchIndex].name)} className="flex-1 h-14 bg-[#1DB954] text-black rounded-full flex items-center justify-center font-bold text-sm hover:scale-105 transition-transform shadow-lg gap-2"><IconUserPlus /> {t('follow')}</button>
                    </div>
                  </div>
                ) : <div className="text-center mt-20"><IconSearch /><p className="font-bold mt-4">{t('noUsersFound')}</p></div>}
              </div>
            )}
          </div>
        )}
        {/* 📝 Article (Read) タブ：本番・AI分析連携版 */}
        {activeTab === 'article' && (
	          <ArticleListSection
	            articleTabMode={articleTabMode}
	            displayArticles={displayArticles}
	            draftArticles={draftArticles}
	            myProfileId={myProfile.id}
	            labels={{
	              articles: t('articles'),
	              trend: t('trend'),
	              global: t('global'),
	              following: t('following'),
	              liked: t('liked'),
	              mine: t('mine'),
	              drafts: t('drafts'),
	              emptyArticles: t('emptyArticles'),
	              emptyDrafts: t('emptyDrafts'),
	              draftUntitled: t('articleListDraftUntitled'),
	              draftNoContent: t('articleListDraftNoContent'),
	              share: t('articleListShare'),
	              edit: t('articleListEdit'),
	              delete: t('articleListDelete'),
	            }}
	            onChangeTab={setArticleTabMode}
            onOpenWriter={() => setShowWriteArticleModal(true)}
            onOpenArticle={setViewingArticle}
            onOpenAuthor={(author) => { setViewingUser(author); setActiveTab('other_profile'); }}
            onOpenDraft={(draft) => {
              setNewArticleTitle(draft.title);
              setNewArticleContent(draft.content);
              setNewArticleCover(draft.coverUrl || null);
              setCurrentDraftId(draft.id);
              setEditingArticleId(null);
              setShowWriteArticleModal(true);
            }}
            onDeleteDraft={(draftId) => {
              if(window.confirm(t("ArticleDraftDeleteConfirm"))) {
                setDraftArticles(prev => {
                  const next = prev.filter(d => d.id !== draftId);
                  localStorage.setItem('echoes_drafts_v2', JSON.stringify(next));
                  return next;
                });
              }
            }}
            onToggleArticleLike={toggleArticleLike}
            onStartEditingArticle={startEditingArticle}
            onDeleteArticle={deleteArticle}
            onShareArticle={(article) => {
              if (navigator.share) {
                navigator.share({ title: `Echoes - ${article.title}`, text: `${article.author.name}の記事をチェック！`, url: 'https://echo.es' }).catch(() => { });
              } else {
                showToast(t("CopiedUrl"));
              }
            }}
          />
        )}
        {/* 💬 Chat タブ */}
        {activeTab === 'chat' && (
          <ChatListSection
            chatTabMode={chatTabMode}
            labels={{
              chat: t('chat'),
              friendsChat: t('Friends'),
              groupsChat: t('Groups'),
              createGroup: t('chatCreateGroup'),
              userFallback: t('chatUserFallback'),
              voiceMessage: t('chatVoiceMessage'),
              imageSent: t('chatImageSent'),
              fileSent: t('chatFileSent'),
              sendPrompt: t('chatSendPrompt'),
              emptyMessages: t('chatEmptyMessages'),
              groupsSection: t('chatGroupsSection'),
              joined: t('chatJoined'),
              artistCommunities: t('chatArtistCommunities'),
              liveCommunities: t('chatLiveCommunities'),
              membersCount: t('chatMembersCount'),
              emptyGroups: t('chatEmptyGroups'),
            }}
            chatHistory={chatHistory}
            allProfiles={allProfiles}
            chatGroups={chatGroups}
            chatCommunities={chatCommunities}
            currentUserId={currentUser?.id}
            timeZone={timeZone}
            displayLocalTime={displayLocalTime}
            onTabChange={setChatTabMode}
            onCreateGroup={() => setShowCreateGroupModal(true)}
            onOpenChat={setActiveChatUserId}
            onOpenProfile={(u) => {
              setProfileBackTarget({ tab: 'chat', chatUserId: null });
              setViewingUser(u);
              setActiveTab('other_profile');
            }}
          />
        )}
        {/* 📅 Calendar (Diary) タブ */}
        {activeTab === 'calendar' && (
          <div className="mt-8 animate-fade-in pb-10">
            {renderDiaryTimeline()}
            <div className="mt-12 px-4 max-w-md mx-auto">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-4"><IconSparkles /> AI Vibe Analysis</h3>
              <div className="bg-gradient-to-br from-[#1c1c1e] to-black border border-[#1DB954]/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#1DB954]/0 via-[#1DB954]/50 to-[#1DB954]/0"></div>
                <p className="text-sm font-bold text-white mb-6 leading-relaxed">
                  {aiMessage}
                </p>
                {/* 💡 おすすめ3曲のリストを表示 */}
                <div className="flex flex-col gap-3 mb-6">
                  {aiRecommendations.length > 0 ? aiRecommendations.map((recSong, idx) => (
                    <div key={idx} className="flex items-center gap-4 bg-black/40 p-3 rounded-2xl group cursor-pointer hover:bg-zinc-800 transition-colors" onClick={() => setDraftSong(recSong)}>
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-zinc-800 flex-shrink-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (recSong.previewUrl) togglePlay(recSong.previewUrl); }}>
                        <img src={recSong.artworkUrl100 || recSong.artworkUrl60} className={`w-full h-full object-cover ${playingSong === recSong.previewUrl ? 'opacity-50' : 'group-hover:opacity-70'} transition-opacity`} />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          {playingSong === recSong.previewUrl ? <IconStop /> : <IconPlay />}
                        </div>
                      </div>
                      <div className="flex-1 overflow-hidden pointer-events-none">
                        <p className="font-bold text-sm text-white truncate">{recSong.trackName}</p>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5">{recSong.artistName}</p>
                      </div>
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDraftSong(recSong); }} className="w-8 h-8 rounded-full bg-zinc-800 text-[#1DB954] flex items-center justify-center pointer-events-auto hover:scale-110 transition-transform" aria-label={t('songPostRecordAria').replace('{title}', recSong.trackName)}>
                        <IconPlus />
                      </button>
                    </div>
                  )) : isAiRecommendationsLoading ? (
                    <div className="py-6 text-center text-zinc-500 text-xs font-bold animate-pulse">{t('aiAnalyzing')}</div>
                  ) : (
                    <div className="py-6 text-center text-zinc-500 text-xs font-bold">{t('aiRecommendationsEmpty')}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* 👤 Profile タブ */}
        {(activeTab === 'profile' || activeTab === 'other_profile') && (
          <ProfileSection
            activeTab={activeTab}
            myProfile={myProfile}
            viewingUser={viewingUser}
            myStreak={myStreak}
            followedUsers={followedUsers}
            myFollowersCount={myFollowers.size}
            viewingUserStats={viewingUserStats}
            mutualFriendsList={mutualFriendsList}
            favoriteArtists={favoriteArtists}
            vibeMatchData={vibeMatchData}
            showVibeMatchDetails={showVibeMatchDetails}
            profileTabMode={profileTabMode}
            labels={{
              following: t('following'),
              followers: t('followers'),
              follow: t('follow'),
              block: t('block'),
              report: t('report'),
              favoriteArtists: t('favoriteArtists'),
              editProfileFull: t('editProfileFull'),
              myEchoes: t('myEchoes'),
              likedPosts: t('likedPosts'),
              paidCoin: t('paidCoin'),
              freeCoin: t('freeCoin'),
              dayStreak: t('dayStreak'),
              mutualFriendsCount: t('mutualFriendsCount'),
              vibeMatchDescription: t('vibeMatchDescription'),
              topSharedArtists: t('topSharedArtists'),
              sharedGenres: t('sharedGenres'),
              sharedArtistsDescription: t('sharedArtistsDescription'),
              sendVibeMatchMessage: t('sendVibeMatchMessage'),
            }}
            likedPostsContent={likedVibes.length === 0 ? <p className="text-center text-zinc-500 py-10 text-xs">{t('likedPostsEmpty').replace('{label}', t('likedPosts'))}</p> : likedVibes.map(renderFeedCard)}
            calendarContent={renderCalendar()}
            formatCount={formatCount}
            onGoBack={handleGoBack}
            onShowCoinCharge={() => setShowCoinChargeModal(true)}
            onShowSettings={() => setShowSettingsMenu(true)}
            onShowUserList={setShowUserListModal}
            onShowMutualFriends={() => setShowMutualFriendsModal(true)}
            onArtistClick={handleArtistClick}
            onShowVibeMatchDetails={() => setShowVibeMatchDetails(true)}
            onCloseVibeMatchDetails={() => setShowVibeMatchDetails(false)}
            onOpenChat={(userId) => { setActiveChatUserId(userId); setActiveTab('chat'); }}
            onOpenEditProfile={openEditProfile}
            onToggleFollow={toggleFollow}
            onBlockUser={handleBlockUser}
            onReportUser={handleReportUser}
            onProfileTabChange={setProfileTabMode}
          />
        )}
      </div>
      <nav className="fixed bottom-0 left-0 w-full bg-[#0a0a0a]/95 backdrop-blur-2xl border-t border-zinc-900 flex justify-around p-3 z-[100] pb-8">
        <button onClick={() => switchBottomTab('home')} className={`flex flex-col items-center gap-1 w-12 ${activeTab === 'home' ? 'text-white' : 'text-zinc-600'}`}><IconMusic /><span className="text-[8px] font-bold uppercase">{t('feed')}</span></button>
        <button onClick={() => switchBottomTab('search')} className={`flex flex-col items-center gap-1 w-12 ${activeTab === 'search' ? 'text-white' : 'text-zinc-600'}`}><IconSearch /><span className="text-[8px] font-bold uppercase">{t('discover')}</span></button>
        <button onClick={() => switchBottomTab('article')} className={`flex flex-col items-center gap-1 w-12 ${activeTab === 'article' ? 'text-white' : 'text-zinc-600'}`}><IconArticle /><span className="text-[8px] font-bold uppercase">{t('read')}</span></button>
        <button onClick={() => switchBottomTab('calendar')} className={`flex flex-col items-center gap-1 w-12 ${activeTab === 'calendar' ? 'text-white' : 'text-zinc-600'}`}><IconClock /><span className="text-[8px] font-bold uppercase">{t('diary')}</span></button>
        <button onClick={() => switchBottomTab('chat')} className={`flex flex-col items-center gap-1 w-12 relative ${activeTab === 'chat' ? 'text-white' : 'text-zinc-600'}`}>
          <IconChatTab />
          {Object.values(chatHistory).some(msgs => msgs.some(m => m.senderId !== currentUser?.id && !m.isRead)) && (
            <span className="absolute top-0 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-black"></span>
          )}
	          <span className="text-[8px] font-bold uppercase">{t('chat')}</span>
	        </button>
        <button onClick={() => switchBottomTab('profile')} className={`flex flex-col items-center gap-1 w-12 ${activeTab === 'profile' || activeTab === 'other_profile' ? 'text-white' : 'text-zinc-600'}`}><IconUser /><span className="text-[8px] font-bold uppercase">{t('profile')}</span></button>
      </nav>
      <ArticleEditorModal
        isOpen={showWriteArticleModal}
        lastSaved={lastSaved}
        newArticleCover={newArticleCover}
        newArticleTitle={newArticleTitle}
        newArticleContent={newArticleContent}
        isArticleUploading={isArticleUploading}
        articleTextareaRef={articleTextareaRef}
        onClose={handleCloseModal}
        onSaveDraft={handleSaveDraft}
        onOpenPublishSettings={() => setShowPublishSettingsModal(true)}
        onCoverUpload={handleArticleCoverUpload}
        onTitleChange={setNewArticleTitle}
        onContentChange={setNewArticleContent}
        onOpenElementMenu={() => setShowElementMenu(true)}
        onOpenHeadingMenu={() => setShowHeadingMenu(true)}
        onOpenAlignmentMenu={() => setShowAlignmentMenu(true)}
        onOpenListMenu={() => setShowListMenu(true)}
        labels={{
          savedSuffix: t('articleEditorSavedSuffix'),
          saveDraft: t('articleEditorSaveDraft'),
          publishSettings: t('articleEditorPublishSettings'),
          changeCover: t('articleEditorChangeCover'),
          addCover: t('articleEditorAddCover'),
          titlePlaceholder: t('articleEditorTitlePlaceholder'),
          bodyPlaceholder: t('articleEditorBodyPlaceholder'),
          quoteTextPlaceholder: t('articleEditorQuoteTextPlaceholder'),
          quoteSourcePlaceholder: t('articleEditorQuoteSourcePlaceholder'),
          characterUnit: t('articleEditorCharacterUnit'),
          bold: t('articleEditorBold'),
          strikethrough: t('articleEditorStrikethrough'),
          heading: t('articleEditorHeading'),
          alignment: t('articleEditorAlignment'),
          list: t('articleEditorList'),
        }}
      >
          {showHeadingMenu && (
            <div className="absolute inset-0 z-50 flex flex-col justify-end animate-fade-in">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHeadingMenu(false)}></div>
              <div className="bg-[#1c1c1e] rounded-t-[32px] w-full pb-10 pt-4 px-4 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setShowHeadingMenu(false)}></div>
                <div className="flex justify-between items-center mb-6 px-2">
                  <div className="w-8"></div>
                  <h3 className="text-[15px] font-bold text-white">{t('articleEditorHeading')}</h3>
                  <button onClick={() => setShowHeadingMenu(false)} className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"><IconCross /></button>
                </div>
                <div className="flex flex-col gap-2">
                  <button onMouseDown={e => { e.preventDefault(); document.execCommand('formatBlock', false, 'DIV'); setShowHeadingMenu(false); }} className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl transition-colors">
                    <span className="text-sm font-bold text-white">{t('articleEditorHeadingStandard')}</span>
                  </button>
                  <button onMouseDown={e => { e.preventDefault(); document.execCommand('formatBlock', false, 'H2'); setShowHeadingMenu(false); }} className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl transition-colors">
                    <span className="text-xl font-black text-white">{t('articleEditorHeadingLarge')}</span>
                  </button>
                  <button onMouseDown={e => { e.preventDefault(); document.execCommand('formatBlock', false, 'H3'); setShowHeadingMenu(false); }} className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl transition-colors">
                    <span className="text-lg font-bold text-white">{t('articleEditorHeadingSmall')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          {showAlignmentMenu && (
            <div className="absolute inset-0 z-50 flex flex-col justify-end animate-fade-in">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAlignmentMenu(false)}></div>
              <div className="bg-[#1c1c1e] rounded-t-[32px] w-full pb-10 pt-4 px-4 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setShowAlignmentMenu(false)}></div>
                <div className="flex justify-between items-center mb-6 px-2">
                  <div className="w-8"></div>
                  <h3 className="text-[15px] font-bold text-white">{t('articleEditorAlignmentTitle')}</h3>
                  <button onClick={() => setShowAlignmentMenu(false)} className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"><IconCross /></button>
                </div>
                <div className="flex flex-col gap-2">
                  <button onMouseDown={e => { e.preventDefault(); document.execCommand('justifyLeft', false, ''); setShowAlignmentMenu(false); }} className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl transition-colors">
                    <span className="text-sm font-bold text-white flex items-center gap-3"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="15" y2="12"></line><line x1="3" y1="18" x2="19" y2="18"></line></svg> {t('articleEditorAlignLeft')}</span>
                  </button>
                  <button onMouseDown={e => { e.preventDefault(); document.execCommand('justifyCenter', false, ''); setShowAlignmentMenu(false); }} className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl transition-colors">
                    <span className="text-sm font-bold text-white flex items-center gap-3"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="5" y1="18" x2="19" y2="18"></line></svg> {t('articleEditorAlignCenter')}</span>
                  </button>
                  <button onMouseDown={e => { e.preventDefault(); document.execCommand('justifyRight', false, ''); setShowAlignmentMenu(false); }} className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl transition-colors">
                    <span className="text-sm font-bold text-white flex items-center gap-3"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="9" y1="12" x2="21" y2="12"></line><line x1="5" y1="18" x2="21" y2="18"></line></svg> {t('articleEditorAlignRight')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          {showListMenu && (
            <div className="absolute inset-0 z-50 flex flex-col justify-end animate-fade-in">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowListMenu(false)}></div>
              <div className="bg-[#1c1c1e] rounded-t-[32px] w-full pb-10 pt-4 px-4 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setShowListMenu(false)}></div>
                <div className="flex justify-between items-center mb-6 px-2">
                  <div className="w-8"></div>
                  <h3 className="text-[15px] font-bold text-white">{t('articleEditorListTitle')}</h3>
                  <button onClick={() => setShowListMenu(false)} className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"><IconCross /></button>
                </div>
                <div className="flex flex-col gap-2">
                  <button onMouseDown={e => { e.preventDefault(); if (articleTextareaRef.current) { articleTextareaRef.current.focus(); document.execCommand('insertUnorderedList', false, ''); setNewArticleContent(articleTextareaRef.current.innerHTML); } setShowListMenu(false); }} className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl transition-colors">
                    <span className="text-sm font-bold text-white flex items-center gap-3"><IconList /> {t('articleEditorBulletedList')}</span>
                  </button>
                  <button onMouseDown={e => { e.preventDefault(); if (articleTextareaRef.current) { articleTextareaRef.current.focus(); document.execCommand('insertOrderedList', false, ''); setNewArticleContent(articleTextareaRef.current.innerHTML); } setShowListMenu(false); }} className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl transition-colors">
                    <span className="text-sm font-bold text-white flex items-center gap-3">
                      <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path></svg>
                      {t('articleEditorNumberedList')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* 💡 要素追加メニュー（Bottom Sheet） */}
          {showElementMenu && (
            <div className="absolute inset-0 z-50 flex flex-col justify-end animate-fade-in">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowElementMenu(false)}></div>
              <div className="bg-[#1c1c1e] rounded-t-[32px] w-full pb-10 pt-4 px-4 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setShowElementMenu(false)}></div>
                <div className="flex justify-between items-center mb-6 px-2">
                  <div className="w-8"></div>
                  <h3 className="text-[15px] font-bold text-white">{t('articleEditorElementMenuTitle')}</h3>
                  <button onClick={() => setShowElementMenu(false)} className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"><IconCross /></button>
                </div>
                <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                  <label className="flex flex-col items-center gap-2 cursor-pointer group relative">
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconImage /></div>
                    <span className="text-[10px] text-zinc-300 font-bold">{t('articleEditorElementImage')}</span>
                    <input type="file" accept="image/*" onChange={handleArticleBodyImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </label>
                  <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={handleEmbedLink}>
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconLink /></div>
                    <span className="text-[10px] text-zinc-300 font-bold">{t('articleEditorElementEmbed')}</span>
                  </div>
                  <label className="flex flex-col items-center gap-2 cursor-pointer group relative">
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconFile /></div>
                    <span className="text-[10px] text-zinc-300 font-bold">{t('articleEditorElementFile')}</span>
                    <input type="file" onChange={handleArticleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </label>
                  <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => { showToast(t('articleEditorTocGenerating')); setShowElementMenu(false); }}>
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors">
                      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                    </div>
                    <span className="text-[10px] text-zinc-300 font-bold">{t('articleEditorElementToc')}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 cursor-pointer group" onMouseDown={e => { e.preventDefault(); if (articleTextareaRef.current) { articleTextareaRef.current.focus(); document.execCommand('insertHTML', false, '<br/><blockquote style="border-left: 4px solid #52525b; padding: 16px; margin: 16px 0; background: #27272a; border-radius: 8px;"><div class="quote-text" style="color: #e4e4e7;"></div><div class="quote-source" style="text-align: right; font-size: 10px; color: #a1a1aa; margin-top: 12px; font-style: normal;"></div></blockquote><br/><p><br/></p>'); setNewArticleContent(articleTextareaRef.current.innerHTML); } setShowElementMenu(false); }}>
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconQuote /></div>
                    <span className="text-[10px] text-zinc-300 font-bold">{t('articleEditorElementQuote')}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 cursor-pointer group" onMouseDown={e => { e.preventDefault(); document.execCommand('insertHTML', false, `<br/><pre style="background:#27272a;padding:16px;border-radius:12px;overflow-x:auto;color:#e4e4e7;font-family:monospace;border:1px solid #52525b;"><code>${t('articleEditorCodePlaceholder')}</code></pre><br/>`); setShowElementMenu(false); }}>
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconCode /></div>
                    <span className="text-[10px] text-zinc-300 font-bold">{t('articleEditorElementCode')}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 cursor-pointer group" onMouseDown={e => { e.preventDefault(); document.execCommand('insertHorizontalRule', false, ''); setShowElementMenu(false); }}>
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconMinus /></div>
                    <span className="text-[10px] text-zinc-300 font-bold">{t('articleEditorElementDivider')}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 cursor-pointer group" onMouseDown={e => { e.preventDefault(); document.execCommand('insertHTML', false, getPaywallSeparatorHtml()); setShowElementMenu(false); }}>
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconYen /></div>
                    <span className="text-[10px] text-zinc-300 font-bold">{t('articleEditorElementPaidArea')}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => { setShowPastArticleModal(true); setShowElementMenu(false); }}>
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconArticle /></div>
                    <span className="text-[10px] text-zinc-300 font-bold">{t('articleEditorElementInsertArticle')}</span>
                  </div>
                  <label className="flex flex-col items-center gap-2 cursor-pointer group relative">
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconHeadphones /></div>
                    <span className="text-[10px] text-zinc-300 font-bold">{t('articleEditorElementAudioFile')}</span>
                    <input type="file" accept="audio/*" onChange={handleArticleAudioUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </label>
                  <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => { setShowEditorVoiceMenu(true); setShowElementMenu(false); }}>
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconMic /></div>
                    <span className="text-[10px] text-zinc-300 font-bold">{t('articleEditorElementRecord')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {showEditorVoiceMenu && (
            <div className="absolute inset-0 z-50 flex flex-col justify-end animate-fade-in">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { cancelVoiceRecording(); setShowEditorVoiceMenu(false); }}></div>
              <div className="bg-[#1c1c1e] rounded-t-[32px] w-full pb-10 pt-8 px-4 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col items-center">
                <div className="w-12 h-1.5 bg-zinc-700 rounded-full absolute top-4 left-1/2 -translate-x-1/2 cursor-pointer" onClick={() => { cancelVoiceRecording(); setShowEditorVoiceMenu(false); }}></div>
                {draftVoice && <audio ref={draftAudioRef} src={draftVoice.url} onEnded={() => setIsPlayingDraft(false)} className="hidden" />}
                {!isRecording && !draftVoice && (
                  <>
                    <p className="text-zinc-400 text-sm font-bold mb-8">{t('articleEditorVoicePrompt')}</p>
                    <div onClick={startVoiceRecording} className="w-24 h-24 rounded-full border-4 border-zinc-800 flex items-center justify-center cursor-pointer hover:bg-zinc-800/50 transition-colors">
                      <div className="w-8 h-8 bg-red-500 rounded-full"></div>
                    </div>
                  </>
                )}
                {isRecording && (
                  <>
                    <p className="text-red-500 text-3xl font-bold mb-8 tracking-widest">{Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}</p>
                    <div onClick={stopVoiceRecording} className="w-24 h-24 rounded-full border-4 border-red-500/30 flex items-center justify-center cursor-pointer hover:bg-red-500/10 transition-colors animate-pulse">
                      <div className="w-8 h-8 bg-red-500 rounded-sm"></div>
                    </div>
                  </>
                )}
                {draftVoice && (
                  <>
                    <p className="text-[#1DB954] text-3xl font-bold mb-8 tracking-widest">{Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}</p>
                    <div className="flex items-center gap-8">
                      <button onClick={() => { cancelVoiceRecording(); setShowEditorVoiceMenu(false); }} className="w-14 h-14 rounded-full border-2 border-zinc-700 flex items-center justify-center text-red-500 hover:bg-zinc-800 transition-colors">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                      <button onClick={toggleDraftPlay} className="w-20 h-20 rounded-full border-4 border-[#1DB954] flex items-center justify-center text-[#1DB954] hover:bg-[#1DB954]/10 transition-colors">
                        {isPlayingDraft ? <IconStop /> : <IconPlay />}
                      </button>
                      <button onClick={insertEditorVoice} className="w-14 h-14 rounded-full border-2 border-zinc-700 flex items-center justify-center text-blue-500 hover:bg-zinc-800 pl-1 transition-colors">
                        <IconSend />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          {showDraftSaveDialog && (
            <div className="absolute inset-0 z-[1100] flex items-center justify-center p-6 animate-fade-in bg-black/60 backdrop-blur-sm">
              <div className="bg-[#1c1c1e] rounded-3xl p-6 w-full max-w-xs shadow-2xl border border-zinc-800 flex flex-col items-center text-center">
                <h3 className="text-lg font-bold text-white mb-2">{t('articleEditorDraftSavedTitle')}</h3>
                <p className="text-xs text-zinc-400 mb-6 leading-relaxed">{t('articleEditorDraftSavedBody')}</p>
                <div className="flex gap-3 w-full">
                  <button onClick={() => setShowDraftSaveDialog(false)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-colors">{t('articleEditorContinueEditing')}</button>
                  <button onClick={() => { setShowDraftSaveDialog(false); setShowWriteArticleModal(false); }} className="flex-1 py-3 bg-white hover:bg-gray-200 text-black rounded-xl text-xs font-bold transition-colors">{t('close')}</button>
                </div>
              </div>
            </div>
          )}
          {showPastArticleModal && (
            <div className="absolute inset-0 z-[1100] flex flex-col justify-end animate-fade-in">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPastArticleModal(false)}></div>
              <div className="bg-[#1c1c1e] rounded-t-[32px] w-full pb-10 pt-4 px-4 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] h-[60vh] flex flex-col">
                <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setShowPastArticleModal(false)}></div>
                <div className="flex justify-between items-center mb-4 px-2 shrink-0">
                  <div className="w-8"></div>
                  <h3 className="text-[15px] font-bold text-white">{t('articleEditorElementInsertArticle')}</h3>
                  <button onClick={() => setShowPastArticleModal(false)} className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"><IconCross /></button>
                </div>
                <div className="flex-1 overflow-y-auto flex flex-col gap-3 px-2 pb-4 scrollbar-hide">
                  {articles.filter(a => a.author.id === myProfile.id).length > 0 ? articles.filter(a => a.author.id === myProfile.id).map(a => (
                    <div key={a.id} onMouseDown={e => { e.preventDefault(); if (articleTextareaRef.current) { articleTextareaRef.current.focus(); document.execCommand('insertHTML', false, `<br/><a href="/?article=${a.id}" target="_blank" contenteditable="false" style="display:flex;align-items:center;gap:12px;padding:12px;background:#27272a;border-radius:12px;color:#e4e4e7;text-decoration:none;border:1px solid #52525b;margin:8px 0;width:100%;max-width:320px;"><img src="${a.coverUrl}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;flex-shrink:0;"/><div style="flex:1;overflow:hidden;"><p style="font-weight:bold;font-size:14px;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.title}</p><p style="font-size:10px;color:#a1a1aa;margin:4px 0 0 0;">${a.date}</p></div></a><br/>`); setNewArticleContent(articleTextareaRef.current.innerHTML); } setShowPastArticleModal(false); }} className="flex items-center gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl cursor-pointer transition-colors">
                      <img src={a.coverUrl} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-sm text-white truncate">{a.title}</p>
                        <p className="text-[10px] text-zinc-500 mt-1">{a.date}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2">
                      <IconArticle />
                      <p className="text-xs font-bold mt-2">{t('articleEditorPastArticleEmpty')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
      </ArticleEditorModal>
      <ArticlePublishSettingsModal
        isOpen={showPublishSettingsModal}
        newArticleCover={newArticleCover}
        newArticleTitle={newArticleTitle}
        myProfile={myProfile}
        isArticlePremium={isArticlePremium}
        articlePriceInput={articlePriceInput}
        isPosting={isPosting}
        onClose={() => setShowPublishSettingsModal(false)}
        onTogglePremium={() => setIsArticlePremium(!isArticlePremium)}
        onPriceInputChange={setArticlePriceInput}
        onPostArticle={handlePostArticle}
        labels={{
          title: t('articlePublishSettingsTitle'),
          preview: t('articlePublishPreview'),
          untitledArticle: t('articlePublishUntitled'),
          publishAsPremium: t('articlePublishAsPremium'),
          premiumDividerHint: t('articlePublishPremiumDividerHint'),
          salePrice: t('articlePublishSalePrice'),
          coin: t('articlePublishCoin'),
          posting: t('articlePublishPosting'),
          postArticle: t('articlePublishPostArticle'),
        }}
      />
      {showCoinChargeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1200] flex justify-center items-end sm:items-center animate-fade-in" onClick={() => {
          if (!isCharging) {
            setShowCoinChargeModal(false);
            setSelectedChargePlan(null);
          }
        }}>
          <div className="bg-[#1c1c1e] w-full sm:max-w-md h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col" onClick={e => e.stopPropagation()}>
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-4 bg-[#1c1c1e] shrink-0 border-b border-zinc-800/50 relative z-20">
              <div className="w-10">
                {selectedChargePlan ? (
                  <button onClick={() => !isCharging && setSelectedChargePlan(null)} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                    <IconChevronLeft />
                  </button>
                ) : (
                  <button onClick={() => setShowCoinChargeModal(false)} className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                    <IconCross />
                  </button>
                )}
              </div>
              <h3 className="font-bold text-[15px] text-white tracking-wide">{selectedChargePlan ? t('paymentConfirmationTitle') : t('coinChargeTitle')}</h3>
              <div className="w-10"></div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col bg-[#121212]">
              {!selectedChargePlan ? (
                <div className="animate-fade-in flex flex-col">
                  {/* 保有コイン表示 */}
                  <div className="flex flex-col items-center justify-center py-4 bg-[#1c1c1e] border-b border-zinc-800 shrink-0 w-full gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 text-sm font-bold">{t('ownedCoins')}</span>
                      <div className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center text-black shadow-sm">
                        <span className="text-[12px] font-black leading-none mt-[1px]">C</span>
                      </div>
                      <span className="text-xl font-black text-white">{(Number((myProfile as any).free_coin) || 0) + (Number((myProfile as any).paid_coin) || 0)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-500">
                      <span>{t('paidCoin')} {Number((myProfile as any).paid_coin) || 0} C</span>
                      <span>{t('freeCoin')} {Number((myProfile as any).free_coin) || 0} C</span>
                    </div>
                  </div>
                  {/* リスト表示 */}
                  <div className="flex flex-col px-4 pb-8">
                    {COIN_CHARGE_PLANS.map((plan) => (
                      <div
                        key={plan.id}
                        className="flex items-center justify-between py-4 border-b border-zinc-800/60 last:border-0"
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-3">
                            <div className="w-[18px] h-[18px] bg-[#d4af37] rounded-full flex items-center justify-center text-black shadow-sm shrink-0">
                              <span className="text-[10px] font-black leading-none mt-[0.5px]">C</span>
                            </div>
                            <span className="font-bold text-[17px] text-white tracking-wide">{plan.coins.toLocaleString()}</span>
                          </div>
                          {plan.bonusCoins && (
                            <span className="text-zinc-400 text-[11px] font-medium mt-1 ml-[30px] tracking-wide">{t('coinPlanBonus').replace('{count}', plan.bonusCoins.toLocaleString())}</span>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectedChargePlan(plan)}
                          className="bg-white text-black font-black px-5 py-2.5 rounded-full text-sm hover:bg-zinc-200 transition-colors active:scale-95 w-[90px] text-center shrink-0 shadow-sm"
                        >
                          ¥{plan.price.toLocaleString()}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="animate-fade-in flex flex-col w-full h-full p-6">
                  <div className="mb-10 flex flex-col items-center text-center mt-6">
                    <div className="w-16 h-16 bg-[#d4af37] rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(212,175,55,0.2)] mb-5 border border-yellow-500/20">
                      <span className="text-3xl font-black leading-none mt-[2px]">C</span>
                    </div>
                    <h4 className="text-white font-black text-[32px] mb-2 tracking-tighter">{selectedChargePlan.coins.toLocaleString()}</h4>
                    <p className="text-zinc-400 text-sm font-bold">{t('paymentAmount').replace('{amount}', selectedChargePlan.price.toLocaleString())}</p>
                  </div>
                  <div className="bg-[#1c1c1e] border border-zinc-800 rounded-2xl p-5 mb-auto shadow-inner">
                    <div className="flex items-start gap-3">
                      <div className="text-zinc-500 mt-0.5"><IconLock /></div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed text-left">
                        {t('stripeSecureNotice')}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleChargeCoins()} 
                    disabled={isCharging} 
                    className="w-full py-4 mt-8 bg-white text-black rounded-full text-[15px] font-black shadow-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 active:scale-95"
                  >
                    {isCharging ? (
                      <span className="flex items-center gap-2"><div className="w-5 h-5 border-[3px] border-black border-t-transparent rounded-full animate-spin"></div>{t('stripeConnecting')}</span>
                    ) : (
                      <>{t('goToCheckout')} <IconChevronRight /></>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {viewingArticle && (
        <ArticleDetailModal
          article={viewingArticle}
          myProfile={myProfile}
          currentUserId={currentUser?.id}
          hasPurchasedArticle={hasPurchasedArticle}
          articleCommentInput={articleCommentInput}
          onClose={() => setViewingArticle(null)}
          onOpenAuthor={(author) => { setViewingArticle(null); setViewingUser(author); setActiveTab('other_profile'); }}
          onOpenCoinCharge={() => setShowCoinChargeModal(true)}
          onUnlockArticle={handleUnlockArticle}
          onSendGift={handleSendArticleGift}
          onToggleArticleLike={toggleArticleLike}
          onSubmitArticleComment={submitArticleComment}
          onArticleCommentInputChange={setArticleCommentInput}
          labels={{
            follow: t('follow'),
            premiumUnlocked: t('articleDetailPremiumUnlocked'),
            premiumPreviewLine1: t('articleDetailPremiumPreviewLine1'),
            premiumPreviewLine2: t('articleDetailPremiumPreviewLine2'),
            premiumPreviewLine3: t('articleDetailPremiumPreviewLine3'),
            premiumLockedTitle: t('articleDetailPremiumLockedTitle'),
            articlePrice: t('articleDetailArticlePrice'),
            currentCoins: t('articleDetailCurrentCoins'),
            unlockArticle: t('articleDetailUnlockArticle'),
            supportCreator: t('articleDetailSupportCreator'),
            supportCreatorDescriptionLine1: t('articleDetailSupportCreatorDescriptionLine1'),
            supportCreatorDescriptionLine2: t('articleDetailSupportCreatorDescriptionLine2'),
            likes: t('articleDetailLikes'),
            comments: t('articleDetailComments'),
            commentPlaceholder: t('articleDetailCommentPlaceholder'),
            postComment: t('articleDetailPostComment'),
          }}
        />
      )}
      {/* 💡 コンポーネント化したミニプレイヤー */}
      <MiniPlayer 
        activeTrackInfo={activeTrackInfo} 
        playingSong={playingSong} 
        togglePlay={togglePlay} 
      />
    </main>
  );
}
export default function Home() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><h1 className="text-5xl font-black italic text-white animate-pulse">Echoes.</h1></div>}>
      <MainApp />
    </React.Suspense>
  );
}
