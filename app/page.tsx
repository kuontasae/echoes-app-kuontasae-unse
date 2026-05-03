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
import { MusicSearchBox } from './components/music/MusicSearchBox';
import { SongPostModal } from './components/music/SongPostModal';
import { EditProfileModal } from './components/profile/EditProfileModal';
import { ProfileSection } from './components/profile/ProfileSection';
import { UserListModal } from './components/profile/UserListModal';
import { ChatInputBar } from './components/chat/ChatInputBar';
import { ChatListSection } from './components/chat/ChatListSection';
import { ChatMessages } from './components/chat/ChatMessages';
import { ChatRoomHeader } from './components/chat/ChatRoomHeader';
import { MiniPlayer } from './components/MiniPlayer';
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
  clear: "クリア",
  Success: "成功しました",
  UpdateFailed: "保存に失敗しました",
  SystemError: "エラーが発生しました",
  Unauthorized: "ログインが必要です",
  ValidationError: "入力内容を確認してください",
  InvalidNameLength: "名前は1〜50文字で入力してください",
  InvalidHandleFormat: "ユーザーIDは3〜20文字の英数字とアンダーバーで入力してください",
  InsertFailed: "保存に失敗しました",
  DeleteFailed: "削除に失敗しました",
  UploadFailed: "アップロードに失敗しました",
  ProfileUpdated: "プロフィールを更新しました",
  PostSuccess: "投稿しました",
  SaveFailed: "保存に失敗しました",
  DeleteSuccess: "削除しました"
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
  DeleteSuccess: "Deleted"
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
  DeleteSuccess: "已删除"
});
function MainApp() {
  const searchParams = useSearchParams();
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showAlignmentMenu, setShowAlignmentMenu] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [settings, setSettings] = useState({ audio: true, notifications: true });
  const [spotifyAccessToken, setSpotifyAccessToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      if (code) {
        const getToken = async () => {
          const codeVerifier = window.localStorage.getItem('code_verifier');
          const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID as string;
          const redirectUri = window.location.origin;
          const payload = new URLSearchParams({
            client_id: clientId,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier || '',
          });
          try {
            const targetEndpoint = ["https:", "", "accounts.spotify.com", "api", "token"].join("/");
            const response = await fetch(targetEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: payload.toString()
            });
            const data = await response.json();
            if (data.access_token) {
              setSpotifyAccessToken(data.access_token);
              window.history.replaceState(null, '', window.location.pathname);
            }
          } catch (err) {
          }
        };
        getToken();
      }
    }
  }, []);

  const handleSpotifyLoginPkce = async () => {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID as string;
    if (!clientId) {
      return;
    }
    const redirectUri = window.location.origin + '/';
    const scope = 'streaming user-read-email user-read-private';
    const generateRandomString = (length: number) => {
      const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const values = crypto.getRandomValues(new Uint8Array(length));
      return values.reduce((acc, x) => acc + possible[x % possible.length], "");
    };
    const sha256 = async (plain: string) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(plain);
      return window.crypto.subtle.digest('SHA-256', data);
    };
    const base64encode = (input: ArrayBuffer) => {
      return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    };
    const codeVerifier = generateRandomString(64);
    window.localStorage.setItem('code_verifier', codeVerifier);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: scope,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      redirect_uri: redirectUri,
    });
    const targetEndpoint = ["https:", "", "accounts.spotify.com", "authorize"].join("/");
    window.location.href = targetEndpoint + "?" + params.toString();
  };

  const [timeZone, setTimeZone] = useState("Asia/Tokyo");
  const [language, setLanguage] = useState("日本語");
  const t = (k: string) => localI18n[language]?.[k] || localI18n["日本語"][k];
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
  useEffect(() => {
  const fetchArticlesFromDB = async () => {
    try {
      const { data: articlesData, error: articlesError } = await supabase
        .from('articles')
        .select('*')
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
          premium_content: a.premium_content || "",
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
        setViewingArticle(targetArticle);
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
    showToast("画像をアップロードしています...");
    try {
      const compressedFile = await compressImage(file);
      const fileName = `article-cover-${currentUser.id}-${Date.now()}.jpeg`;
      // 💡 既存の avatars バケットを再利用して画像を安全に保存
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, compressedFile);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setNewArticleCover(data.publicUrl);
      showToast("画像のアップロードが完了しました！", "success");
    } catch (err) {
          showToast("画像のアップロードに失敗しました", "error");
        } finally {
          setIsArticleUploading(false);
        }
      };
      const handleArticleBodyImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;
        e.target.value = '';
        showToast("画像を挿入しています...");
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
          showToast("画像を挿入しました！", "success");
          setShowElementMenu(false);
        } catch (err) {
          showToast("画像の挿入に失敗しました", "error");
        }
      };
      const handleArticleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;
        e.target.value = '';
        showToast("音声ファイルをアップロードしています...");
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
          showToast("音声ファイルを挿入しました！", "success");
          setShowElementMenu(false);
        } catch (err) {
          showToast("音声の挿入に失敗しました", "error");
        }
      };
      const handleEmbedLink = () => {
  let url = window.prompt("EnterURL");
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
    } else if (safeUrl.includes('open.spotify.com/')) {
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      const type = pathParts[0];
      const id = pathParts[1];
      if ((type === 'track' || type === 'album' || type === 'playlist') && /^[a-zA-Z0-9]+$/.test(id)) {
        embedHtml = `<br/><iframe src="https://open.spotify.com/embed/${type}/${id}" width="100%" height="152" frameborder="0" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" style="border-radius: 12px; margin: 16px 0;"></iframe><br/>`;
      }
    }
    if (articleTextareaRef.current) {
      articleTextareaRef.current.focus();
      document.execCommand('insertHTML', false, embedHtml);
      setNewArticleContent(articleTextareaRef.current.innerHTML);
    }
  } catch (err) {
    showToast("InvalidURL", "error");
  }
  setShowElementMenu(false);
};
      const insertEditorVoice = async () => {
        if (!draftVoice || !currentUser) return;
        showToast("録音した音声を挿入しています...");
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
          showToast("音声を挿入しました！", "success");
        } catch (err) {
          showToast("音声の挿入に失敗しました", "error");
        }
      };
      const handleArticleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;
        e.target.value = '';
        showToast("ファイルをアップロードしています...");
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
          showToast("ファイルを挿入しました！", "success");
          setShowElementMenu(false);
        } catch (err) {
          showToast("ファイルの挿入に失敗しました", "error");
        }
      };
  const [isArticlePremium, setIsArticlePremium] = useState(false);
  const [articlePriceInput, setArticlePriceInput] = useState(300);
  const [showPublishSettingsModal, setShowPublishSettingsModal] = useState(false);
  const [showCoinChargeModal, setShowCoinChargeModal] = useState(false);
  const [isCharging, setIsCharging] = useState(false);
  const [selectedChargePlan, setSelectedChargePlan] = useState<CoinChargePlan | null>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      if (paymentStatus === 'success') {
        showToast("決済が完了し、コインがチャージされました！ 🎉", "success");
        window.history.replaceState(null, '', window.location.pathname);
      } else if (paymentStatus === 'cancel') {
        showToast("決済をキャンセルしました", "error");
        window.history.replaceState(null, '', window.location.pathname);
      }
      const stripeConnectStatus = urlParams.get('stripe_connect');
      if (stripeConnectStatus === 'return') {
        showToast("換金設定を確認しています", "success");
        window.history.replaceState(null, '', window.location.pathname);
      } else if (stripeConnectStatus === 'refresh') {
        showToast("換金設定をもう一度開始してください", "error");
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);
  const [cardInfo, setCardInfo] = useState({ number: "", expiry: "", cvc: "", name: "" });
  const handleChargeCoins = async () => {
  if (!currentUser) return;
  if (!selectedChargePlan) {
    showToast("InvalidCoinAmount", "error");
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
    showToast("PaymentInitFailed", "error");
    setIsCharging(false);
  }
};
  const handlePostArticle = async () => {
  if (!currentUser) return;
  const trimmedTitle = newArticleTitle.trim();
  const rawContent = newArticleContent.trim();
  if (!trimmedTitle || !rawContent) {
    showToast("ValidationError", "error");
    return;
  }
  if (trimmedTitle.length > 100) {
    showToast("TitleTooLong", "error");
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
    const paywallRegex = /(?:<br\s*\/?>\s*)*(?:<div[^>]*>\s*)?<hr[^>]*>[\s\S]*?ここから先は有料エリアです[\s\S]*?<\/p>(?:\s*<\/div>)?(?:<br\s*\/?>\s*)*/i;
    if (!paywallRegex.test(trimmedContent)) {
      showToast("MissingPaywallSeparator", "error");
      return;
    }
    const parsedPrice = Math.floor(Number(articlePriceInput));
    if (isNaN(parsedPrice) || parsedPrice < 1) {
      showToast("InvalidPrice", "error");
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
    showToast("Success", "success");
  } catch (err) {
    setArticles(previousArticles);
    showToast("DatabaseError", "error");
  }
};
  // 💡 記事の編集を開始する（画像もセットする）
  const startEditingArticle = (article: any) => {
    setNewArticleTitle(article.title);
    setNewArticleContent(article.content);
    setNewArticleCover(article.coverUrl);
    setEditingArticleId(article.id);
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
        showToast("StorageQuotaExceeded", "error");
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
    showToast("EmptyDraft", "error");
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
      showToast("StorageQuotaExceeded", "error");
    }
    return updated;
  });
  resetEditorState();
  showToast("Success", "success");
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
    showToast("UpdateFailed", "error");
  }
};
  const submitArticleComment = async (e?: React.FormEvent) => {
  if (e) e.preventDefault();
  const trimmedInput = articleCommentInput.trim();
  if (!trimmedInput || !currentUser || !viewingArticle) return;
  if (trimmedInput.length > 500) {
    showToast("CommentTooLong", "error");
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
      showToast("InsertFailed", "error");
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
    showToast("Success", "success");
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
    showToast("SystemError", "error");
  }
};
  const deleteArticle = async (id: string) => {
    if (!currentUser) return;
    const targetArticle = articles.find(a => a.id === id);
    if (!targetArticle || targetArticle.author.id !== currentUser.id) {
      showToast("他人の記事は削除できません", "error");
      return;
    }
    if (window.confirm("本当にこの記事を削除しますか？\n（この操作は取り消せません）")) {
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
        showToast("記事を削除しました！", "success");
      } catch (err) {
        console.warn("削除エラー:", err);
        setArticles(originalArticles);
        showToast("サーバーでの削除に失敗しました", "error");
      }
    }
  };
  const handlePurchaseArticle = async (article: any) => {
    if (!currentUser || !article || !article.id) {
      showToast("記事の情報が不正です", "error");
      return;
    }
    if (article.author && article.author.id === currentUser.id) {
      showToast("自分の記事は購入できません", "error");
      return;
    }
    const articlePrice = Math.floor(Number(article.price));
    if (isNaN(articlePrice) || articlePrice <= 0) {
      showToast("価格が不正です", "error");
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
          showToast("コインが不足しています", "error");
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

      showToast("記事を購入しました！", "success");
      mutatePurchase(true); // 記事のロックを解除

    } catch (err) {
      showToast("通信エラーが発生しました", "error");
    }
  };
  const handleUnlockArticle = (article: any) => {
    const currentBalance = getAvailableCoins(myProfile as User & CoinFields);
    if (currentBalance < article.price) {
      setShowCoinChargeModal(true);
      showToast("コインが不足しています。チャージしてください。", "error");
    } else {
      handlePurchaseArticle(article);
    }
  };
  const handleSendArticleGift = async (amount: number) => {
    if (!currentUser || !viewingArticle) {
      showToast("ログインが必要です", "error");
      return;
    }
    const currentBalance = getAvailableCoins(myProfile as User & CoinFields);
    if (currentBalance < amount) {
      setShowCoinChargeModal(true);
      showToast("コインが不足しています。チャージしてください。", "error");
      return;
    }
    if (!window.confirm(`${amount}C を贈りますか？`)) return;
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
      showToast("クリエイターをサポートしました！", "success");
    } catch (e) {
      showToast("エラーが発生しました", "error");
    }
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchArtistInfo, setSearchArtistInfo] = useState<any>(null);
  const [trendingSongs, setTrendingSongs] = useState<any[]>([]);
  const [draftSong, setDraftSong] = useState<any>(null);
  const [draftCaption, setDraftCaption] = useState("");
  const [showPostOverrideConfirm, setShowPostOverrideConfirm] = useState<Song | null>(null);
  const [isPosting, setIsPosting] = useState(false); // 💡 二重投稿防止（連打ロック）用の箱
  const [showPostSuccessCard, setShowPostSuccessCard] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]); // 💡 AIが選んだ3曲を入れる箱
  const [aiMessage, setAiMessage] = useState("過去の記録から、あなたにおすすめの曲を分析しています..."); // 💡 AIの分析メッセージ
  const [activeArtistProfile, setActiveArtistProfile] = useState<any>(null);
  const [artistSongs, setArtistSongs] = useState<any[]>([]);
  const [isArtistLoading, setIsArtistLoading] = useState(false);
  const [favoriteArtists, setFavoriteArtists] = useState<FavoriteArtist[]>([]);
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
        showToast("公式ライブの取得に失敗しました。標準データを表示します", "error");
        apiLives = fallbackLives;
      }
      let customLives: LiveCommunity[] = [];
      try {
        const { data: dbData, error: dbError } = await supabase.from('custom_communities').select('*');
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
        showToast("ユーザー作成ライブの取得に失敗しました", "error");
      }
      setRealCommunities([...apiLives, ...customLives]);
    };
    fetchLiveSchedules();
  }, []);
  useEffect(() => {
    if (!currentUser) return;
    const fetchJoinedCommunities = async () => {
      try {
        const { data, error } = await supabase
          .from('community_members')
          .select('community_id, user_id');
        if (data && !error) {
          const joinedIds = new Set(data.filter((d: any) => d.user_id === currentUser.id).map((d: any) => d.community_id));
          const counts = data.reduce((acc: Record<string, number>, d: any) => {
            acc[d.community_id] = (acc[d.community_id] || 0) + 1;
            return acc;
          }, {});
          setCommunityMemberCounts(counts);
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
      showToast(`${uname}さんをフォローしました`, "success");
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
    const existing = realCommunities.filter(c => c.communityType === 'artist');
    const byId = new Map(existing.map(c => [
      c.id,
      {
        ...c,
        memberCount: communityMemberCounts[c.id] || c.memberCount,
        isJoined: joinedCommunityIds.has(c.id) || c.isJoined
      }
    ]));
    const addArtist = (artistName?: string, artistId?: string | number, artworkUrl?: string) => {
      const cleanName = (artistName || "").trim();
      if (!cleanName) return;
      const community = buildArtistCommunity({ artistId, artistName: cleanName, artworkUrl }, joinedCommunityIds, communityMemberCounts);
      if (!byId.has(community.id)) byId.set(community.id, community);
    };
    favoriteArtists.forEach(a => addArtist(a.artistName, a.artistId, a.artworkUrl));
    (myProfile.topArtists || []).forEach(a => addArtist(a));
    allProfiles.forEach(u => (u.topArtists || []).forEach(a => addArtist(a)));
    vibes.slice(0, 20).forEach(v => addArtist(v.artist, v.artistId, v.imgUrl));
    if (activeArtistProfile) addArtist(activeArtistProfile.artistName, activeArtistProfile.artistId, activeArtistProfile.artworkUrl);
    return Array.from(byId.values()).slice(0, 8);
  }, [realCommunities, communityMemberCounts, joinedCommunityIds, favoriteArtists, myProfile.topArtists, allProfiles, vibes, activeArtistProfile]);
  const activeArtistCommunity = useMemo(() => {
    if (!activeArtistProfile?.artistName) return null;
    const id = getArtistCommunityId(activeArtistProfile.artistId, activeArtistProfile.artistName);
    return artistCommunities.find(c => c.id === id) || buildArtistCommunity({
      artistId: activeArtistProfile.artistId,
      artistName: activeArtistProfile.artistName,
      artworkUrl: activeArtistProfile.artworkUrl
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
      showToast("換金設定を開始できませんでした", "error");
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
      showToast(`¥${Number(data.amountJpy).toLocaleString()} の振込申請を受け付けました`, "success");
      await loadRevenueDashboard();
    } catch (err) {
      showToast("振込申請に失敗しました", "error");
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
  // 💡 AI Vibe Analysis (本番用): 過去の記録からアーティストを抽出し、新しい曲を提案する
  useEffect(() => {
    if (!currentUser || vibes.length === 0) return;
    const analyzeVibes = async () => {
      const myVibes = vibes.filter(v => v.user.id === currentUser.id || v.user.id === myProfile.id);
      if (myVibes.length === 0) {
        setAiMessage(t('aiStart'));
        setAiRecommendations([]);
        return;
      }
      // 直近に聴いたアーティストを最大3組抽出
      const recentArtists = [...new Set(myVibes.slice(0, 10).map(v => v.artist))].slice(0, 3);
      setAiMessage(`${recentArtists.join(', ')} ${t('aiRec')}`);
      try {
        let recs: any[] = [];
        // 各アーティストごとに、自分がまだ記録していない曲をiTunes APIから検索する
        for (const artist of recentArtists) {
          const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artist)}&entity=song&country=jp&limit=5`);
          const d = await res.json();
          const newSongs = d.results.filter((r: any) => !myVibes.some(v => v.trackId === r.trackId));
          if (newSongs.length > 0) recs.push(newSongs[0]); // 各アーティストから1曲ずつ選抜
        }
        // もし3曲に満たない場合は、トレンド曲で補う
        if (recs.length < 3 && trendingSongs.length > 0) {
          const trends = trendingSongs.filter(ts => !recs.some(r => r.trackId === ts.trackId));
          recs = [...recs, ...trends.slice(0, 3 - recs.length)];
        }
        setAiRecommendations(recs);
      } catch (e) {
        console.error("AI分析エラー:", e);
      }
    };
    analyzeVibes();
  }, [vibes, currentUser, myProfile.id, trendingSongs, language]);
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
        const sharedReason = sharedLives[0] && !sharedArtists[0] && !sharedTags[0] ? `共通ライブ: ${sharedLives[0]}` : `共通: ${topShared}`;
        return { user: u, sharedCount: shared.length, topShared, sharedReason };
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
      if (shouldShowInitialOnboarding) showToast("好きな音楽を登録して、つながりやすくしましょう", "success");
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
  const { data: trendingData, error: trendingError } = useSWR("https://itunes.apple.com/search?term=jpop+top&entity=song&country=jp&limit=5", fetcher);
  useEffect(() => {
    if (trendingData) setTrendingSongs(trendingData.results);
    if (trendingError) showToast("Network Error", "error");
  }, [trendingData, trendingError]);
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
    showToast("DataFetchFailed", "error");
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
	      showToast("Success", "success");
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
      showToast("ユーザー検索に失敗しました", "error");
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
      showToast("Search Error", "error");
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
      showToast("Artist Search Error", "error");
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
    if (onboardingArtistError) showToast("Artist Search Error", "error");
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
      showToast("アーティスト情報の取得に失敗しました", "error");
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
      showToast("アルバム情報の取得に失敗しました", "error");
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
    if (!settings.audio) { showToast("Audio is OFF", 'error'); return; }
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
  const handleArtistClick = (e: React.MouseEvent, id: number | undefined, name: string, url: string) => {
    e.preventDefault(); e.stopPropagation();
    setShowMatchFilterModal(false); setSelectedCalendarPopupVibe(null); activeAlbumProfile && setActiveAlbumProfile(null);
    if (name) { setActiveArtistProfile({ artistId: id || 0, artistName: name, artworkUrl: url.replace('100x100bb', '600x600bb'), isVerifiedReal: false }); }
    else { setSearchQuery(name); setActiveTab('home'); setIsSearchFocused(true); }
  };
  const toggleFavoriteArtist = (a: any) => { setFavoriteArtists(p => p.some(x => x.artistId === a.artistId) ? p.filter(x => x.artistId !== a.artistId) : [...p, a]); };
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
    showToast("CaptionTooLong", "error");
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
        showToast("DeleteFailed", "error");
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
      showToast("InsertFailed", "error");
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
    showToast("Success", "success");
  } catch (err) {
    showToast("SystemError", "error");
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
    showToast("UpdateFailed", "error");
  }
};
  // 💡 DBと連動する「コメント」機能 (通知送信付き)
  const submitComment = async (vibeId: string) => {
  const trimmedInput = commentInput.trim();
  if (!trimmedInput || !currentUser) {
    return;
  }
  if (trimmedInput.length > 200) {
    showToast("LengthLimitExceeded", "error");
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
      showToast("InsertFailed", "error");
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
    showToast("Success", "success");
    if (targetUserId && targetUserId !== currentUser.id) {
      await supabase.from('notifications').insert([{
        user_id: targetUserId,
        sender_id: currentUser.id,
        type: 'comment',
        text: `${myProfile.name}: "${sanitizedText}"`
      }]);
    }
  } catch (err) {
    showToast("SystemError", "error");
  }
};
  const deleteVibe = async (id: string) => {
  if (!currentUser) {
    showToast("Unauthorized", "error");
    return;
  }
  if (window.confirm("DeleteConfirm")) {
    const targetVibe = vibes.find(v => v.id === id) || communityVibes.find(v => v.id === id);
    if (targetVibe && targetVibe.user.id !== currentUser.id) {
      showToast("PermissionDenied", "error");
      return;
    }
    try {
      const { error } = await supabase
        .from('vibes')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser.id);
      if (error) {
        showToast("DeleteFailed", "error");
        return;
      }
      setVibes(prev => prev.filter(v => v.id !== id));
      setCommunityVibes(prev => prev.filter(v => v.id !== id));
      showToast("Success", "success");
    } catch (err) {
      showToast("SystemError", "error");
    }
  }
};
	 const submitChatMessage = async (targetId: string) => {
	  if (!currentUser) return;
	  if (!canAccessChatTarget(targetId)) {
	    showToast("Unauthorized", "error");
	    return;
	  }
	  const textToSend = chatMessageInput.trim();
  const attachmentsToSend = [...pendingAttachments];
  if (!textToSend && attachmentsToSend.length === 0) {
    return;
  }
  if (textToSend.length > 1000) {
    showToast("TextLimitExceeded", "error");
    return;
  }
  if (attachmentsToSend.length > 5) {
    showToast("TooManyFiles", "error");
    return;
  }
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  for (const att of attachmentsToSend) {
    if (att.file && att.file.size > MAX_FILE_SIZE) {
      showToast("FileSizeLimitExceeded", "error");
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
      showToast("MessageSendFailed", "error");
      setChatHistory(prev => ({ ...prev, [targetId]: (prev[targetId] || []).filter(m => m.id !== tempId) }));
    }
  }
  if (attachmentsToSend.length > 0) {
    showToast("Uploading", "success");
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
        showToast("UploadFailed", "error");
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
    showToast("送信を取り消しました");
    await supabase.from('chat_messages').delete().eq('id', msgId).eq('sender_id', currentUser.id);
  };
  const handleCreateGroup = async () => {
  if (!currentUser) return;
  const tName = newGroupName.trim();
  if (!tName || tName.length > 50) {
    showToast("InvalidGroupName", "error");
    return;
  }
  if (newGroupMembers.size === 0) {
    showToast("NoMembersSelected", "error");
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
      showToast("GroupCreationError", "error");
      return;
    }
    const memberInserts = memberArray.map(uid => ({
      group_id: groupId,
      user_id: uid
    }));
    const { error: memberError } = await supabase.from('group_members').insert(memberInserts);
    if (memberError) {
      showToast("MemberAdditionError", "error");
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
    showToast("Success", "success");
  } catch (err) {
    showToast("SystemError", "error");
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
      showToast("ログインが必要です", "error");
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
      openCommunityChat(persistedCommunity);
      void mutateActiveCommunityMemberIds?.((ids = []) => Array.from(new Set([...(ids as string[]), currentUser.id])), { revalidate: true });
      showToast("CommunityJoined", "success");
    } catch (err) {
      logCommunityJoinError("joinCommunity", err, c.id);
      showToast("JoinFailed", "error");
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
      showToast("CommunityLeft", "success");
    } catch (err) {
      console.warn("Chat leave failed", { chatId: leavingChatId, error: err });
      showToast("LeaveFailed", "error");
    }
  };
  const handleCreateCommunity = async () => {
  if (!currentUser) {
    showToast("Unauthorized", "error");
    return;
  }
  const tName = newCommName.trim();
  if (!tName || tName.length > 50) {
    showToast("InvalidNameLength", "error");
    return;
  }
  const y = parseInt(newCommYear, 10);
  const m = parseInt(newCommMonth, 10);
  const d = parseInt(newCommDay, 10);
  if (isNaN(y) || isNaN(m) || isNaN(d) || y < 2024 || m < 1 || m > 12 || d < 1 || d > 31) {
    showToast("InvalidDateFormat", "error");
    return;
  }
  const testDate = new Date(y, m - 1, d);
  if (testDate.getFullYear() !== y || testDate.getMonth() !== m - 1 || testDate.getDate() !== d) {
    showToast("InvalidCalendarDate", "error");
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
      showToast("DatabaseInsertFailed", "error");
      return;
    }
    const { error: memberError } = await supabase.from('community_members').insert([{
      community_id: commId,
      user_id: currentUser.id
    }]);
    if (memberError) {
      showToast("MembershipSaveFailed", "error");
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
    showToast("Success", "success");
  } catch (err) {
    showToast("SystemError", "error");
  }
};
  const handleReportCommunity = async (id: string) => {
  if (!currentUser) return;
  
  const target = realCommunities.find(c => c.id === id);
  if (target?.reportedBy?.includes(currentUser.id)) {
    showToast("ReportAlreadySubmitted", "error");
    return;
  }

  if (window.confirm("ReportConfirm")) {
    setRealCommunities(prev => prev.map(c =>
      c.id === id ? { ...c, reportedBy: [...(c.reportedBy || []), currentUser.id] } : c
    ));
    setActiveCommunityDetail(null);
    
    try {
      const { error } = await supabase
        .from('reports')
        .insert([{ reporter_id: currentUser.id, reported_id: id, type: 'community' }]);
        
      if (error) throw error;
      showToast("Success", "success");
    } catch (err) {
      showToast("SystemError", "error");
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
      
    showToast("Success", "success");
  } catch (err) {
    showToast("SystemError", "error");
  }
};

const handleDeleteCommunity = async (id: string) => {
  if (window.confirm("DeleteConfirm")) {
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
        
      showToast("Success", "success");
    } catch (err) {
      showToast("SystemError", "error");
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
    showToast("InvalidFileType", "error");
    e.target.value = "";
    return;
  }
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    showToast("FileSizeLimitExceeded", "error");
    e.target.value = "";
    return;
  }
  showToast("Uploading", "success");
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
      showToast("UploadFailed", "error");
      return;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    if (data && data.publicUrl) {
      setEditAvatar(data.publicUrl);
      showToast("Success", "success");
    }
  } catch (err) {
    showToast("SystemError", "error");
  } finally {
    e.target.value = "";
  }
};
  // 💡 チャットで画像・ファイルを送る機能（画像の場合は自動圧縮）
	  const handleChatFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
	    let file = e.target.files?.[0];
	    if (!file || !currentUser || !activeChatUserId) return;
	    if (!canAccessChatTarget(activeChatUserId)) {
	      showToast("Unauthorized", "error");
	      e.target.value = "";
	      return;
	    }
	    showToast("ファイルを送信しています...", "success");
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
      showToast("ファイルの送信に失敗しました", "error");
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
      showToast("マイクへのアクセスを許可してください", "error");
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
	    showToast("Unauthorized", "error");
	    return;
	  }
	  const MAX_AUDIO_SIZE = 15 * 1024 * 1024;
  if (draftVoice.blob.size > MAX_AUDIO_SIZE) {
    showToast("AudioSizeLimitExceeded", "error");
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
    showToast("VoiceSendFailed", "error");
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
        showToast(`${t('follow')}を解除しました`, "success");
      } else {
        const { error } = await supabase
          .from('follows')
          .insert([{ follower_id: currentUser.id, following_id: targetUserId }]);
        if (error) throw error;
        showToast(`${t('follow')}しました！`, "success");
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
      showToast("処理に失敗しました", "error");
    }
  };
  const handleBlockUser = async (userId: string) => {
    if (!currentUser) return;
    if (window.confirm("このユーザーをブロックしますか？\n（投稿やプロフィールがお互いに見えなくなります）")) {
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
        showToast("ユーザーをブロックしました", "success");
      } catch (err) {
        console.error(err);
        const errorMsg = err instanceof Error ? err.message : "通信エラーが発生しました";
        setBlockedUsers(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
        showToast(`ブロック失敗: ${errorMsg}`, "error");
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
      showToast("ブロックを解除しました", "success");
    } catch (err) {
      console.warn(err);
      setBlockedUsers(prev => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
      showToast("通信エラーが発生しました", "error");
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
    if (window.confirm("このユーザーを通報しますか？\n（運営が内容を確認し、適切な対応を行います）")) {
      try {
        const { error } = await supabase
          .from('reports')
          .insert([{ reporter_id: currentUser.id, reported_id: userId, type: 'user' }]);
        if (error) throw error;
        showToast("通報が完了しました。ご協力ありがとうございます。", "success");
      } catch (err: any) {
        console.error("通報エラー:", err);
        showToast(`エラー: ${err.message || "テーブルが存在しません"}`, "error");
      }
    }
  };
  const saveProfile = () => {
    setMyProfile({ ...myProfile, name: editName, handle: editHandle.replace('@', ''), bio: editBio, isPrivate: editIsPrivate, avatar: editAvatar, hashtags: (editHashtags || "").split(',').map(s => s.trim()).filter(s => s), liveHistory: (editLiveHistory || "").split(',').map(s => s.trim()).filter(s => s) });
    setIsEditingProfile(false); showToast("プロフィールを保存しました");
  };
  const handleShareVibe = (s: Song) => {
    if (navigator.share) { navigator.share({ title: `Echoes - ${s.title}`, text: `${s.user.name}のVibeをチェック！`, url: 'https://echo.es' }).catch(() => { }); }
    else { showToast("URLをクリップボードにコピーしました。"); }
  };
  const handleShareApp = () => {
    if (navigator.share) { navigator.share({ title: 'Echoes', url: 'https://echo.es' }).catch(() => { }); }
    else { showToast("URLをクリップボードにコピーしました。"); }
  };
  const handleLogin = async () => {
  if (!email || !password) {
    showToast("ValidationError", "error");
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast("InvalidEmailFormat", "error");
    return;
  }
  setIsAuthLoading(true);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showToast(error.message, "error");
    } else if (data.user) {
      setCurrentUser(data.user);
      setIsLoggedIn(true);
      showToast("Success", "success");
    }
  } catch (err) {
    showToast("SystemError", "error");
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
    showToast("InvalidNameLength", "error");
    return;
  }
  if (!/^[A-Za-z0-9_]{3,20}$/.test(tHandle)) {
    showToast("InvalidHandleFormat", "error");
    return;
  }
  if (tBio.length > 160) {
    showToast("BioTooLong", "error");
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
      showToast("UpdateFailed", "error");
      return;
    }
    setMyProfile(prev => ({ ...prev, ...dbUpdateData } as any));
    setAllProfiles(prev => prev.map(p => p.id === currentUser.id ? { ...p, ...dbUpdateData } as any : p));
    setIsEditingProfile(false);
    showToast("Success", "success");
  } catch (err) {
    showToast("SystemError", "error");
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
      showToast("InvalidNameLength", "error");
      return;
    }
    if (!/^[A-Za-z0-9_]{3,20}$/.test(tHandle)) {
      showToast("InvalidHandleFormat", "error");
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
      showToast("好きな音楽を1つ以上追加してください", "error");
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
        showToast("UpdateFailed", "error");
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
      showToast("音楽プロフィールを保存しました", "success");
    } catch (err) {
      showToast("SystemError", "error");
    }
  };
  const handleSignUp = async () => {
  if (!email || !password) {
    showToast("ValidationError", "error");
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast("InvalidEmailFormat", "error");
    return;
  }
  const pwRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
  if (!pwRegex.test(password)) {
    showToast("WeakPassword", "error");
    return;
  }
  setIsAuthLoading(true);
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      showToast(error.message, "error");
      return;
    }
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      showToast("EmailAlreadyInUse", "error");
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
        showToast("ProfileCreationError", "error");
        return;
      }
      setSignupSuccess(true);
    }
  } catch (err) {
    showToast("SystemError", "error");
  } finally {
    setIsAuthLoading(false);
  }
};
  // 💡 ステップ8: ログアウト・退会機能の完全実装
  const handleLogout = async () => {
    showToast(t('logout') + "しています...");
    await supabase.auth.signOut();
    // キャッシュやReactの状態を完全にリセットしてトップへ戻す
    window.location.href = '/';
  };
  const handleDeleteAccount = async () => {
  if (!currentUser) return;
  showToast("DeletingAccount", "success");
  try {
    const { error: rpcError } = await supabase.rpc('delete_user', { target_id: currentUser.id });
    if (rpcError) {
      showToast("DeleteFailed", "error");
      return;
    }
    await supabase.auth.signOut();
    window.location.href = '/';
  } catch (err) {
    showToast("SystemError", "error");
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
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[500] flex flex-col justify-end animate-fade-in" onClick={() => setShowDrumrollModal(false)}>
        <div className="bg-[#1c1c1e] rounded-t-3xl border-t border-zinc-800 p-8 w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-8">
            <button onClick={() => setShowDrumrollModal(false)} className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{t('cancel')}</button>
            <h4 className="font-bold text-sm">年月を選択</h4>
            <button onClick={confirmSelection} className="text-white text-xs font-bold uppercase tracking-widest bg-zinc-800 px-6 py-2 rounded-full">Set</button>
          </div>
          <div className="relative h-[250px] w-full flex gap-4 justify-center items-center overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[100px] bg-gradient-to-b from-[#1c1c1e] to-transparent z-40 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-full h-[100px] bg-gradient-to-t from-[#1c1c1e] to-transparent z-40 pointer-events-none" />
            {/* 💡 選択枠をピッタリ中央に配置 */}
            <div className="absolute top-1/2 left-0 w-full h-[50px] bg-white/10 -mt-[25px] rounded-xl z-10 pointer-events-none" />
            {/* 💡 左側：年（上下に100pxの余白を追加してズレを完全に解消） */}
            <div ref={yearRef} className="relative flex-1 h-full overflow-y-auto scroll-smooth snap-y snap-mandatory scrollbar-hide z-30 py-[100px]" onScroll={e => { const i = Math.round(e.currentTarget.scrollTop / 50); const y = yearList[i]; if (y) setSelectedY(y); }} style={{ WebkitOverflowScrolling: 'touch' }}>
              {yearList.map((y, i) => (<div key={i} className={`h-[50px] flex justify-center items-center snap-center transition-all ${y === selectedY ? 'text-white text-lg font-bold scale-110' : 'text-zinc-500 scale-90'}`}>{y}年</div>))}
            </div>
            {/* 💡 右側：月（上下に100pxの余白を追加してズレを完全に解消） */}
            <div ref={monthRef} className="relative flex-1 h-full overflow-y-auto scroll-smooth snap-y snap-mandatory scrollbar-hide z-30 py-[100px]" onScroll={e => { const i = Math.round(e.currentTarget.scrollTop / 50); const m = monthList[i]; if (m) setSelectedM(m); }} style={{ WebkitOverflowScrolling: 'touch' }}>
              {monthList.map((m, i) => (<div key={i} className={`h-[50px] flex justify-center items-center snap-center transition-all ${m === selectedM ? 'text-white text-lg font-bold scale-110' : 'text-zinc-500 scale-90'}`}>{m.toString().padStart(2, '0')}月</div>))}
            </div>
          </div>
        </div>
      </div>
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
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePlay(v.previewUrl, { title: v.title, artist: v.artist, imgUrl: v.imgUrl }); }} className="w-8 h-8 bg-black/80 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform">
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
                      <button onClick={() => toggleLike(v.id)} className="flex items-center gap-2 text-xs"><IconHeart filled={v.isLiked} />{formatCount(v.likes)}</button>
                      <button onClick={() => setActiveCommentSongId(activeCommentSongId === v.id ? null : v.id)} className="flex items-center gap-2 text-xs"><IconComment />{formatCount(v.comments.length)}</button>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteVibe(v.id); }} className="text-[10px] font-bold text-zinc-600 hover:text-red-500 uppercase tracking-widest ml-auto p-1">削除</button>
                    </div>
                    {activeCommentSongId === v.id && (
                      <div className="mt-3 bg-black border border-zinc-800/80 rounded-xl p-3 animate-fade-in">
                        <div className="flex flex-col gap-2 mb-3 max-h-[100px] overflow-y-auto scrollbar-hide">
                          {v.comments.map(c => (<div key={c.id} className="text-[11px]"><span className="font-bold text-[#1DB954] mr-2">@{c.user.handle}</span><span className="text-zinc-300">{c.text}</span></div>))}
                          {v.comments.length === 0 && <p className="text-[10px] text-zinc-500">まだコメントはありません</p>}
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); submitComment(v.id); }} className="flex gap-2 items-center">
                          <input type="text" placeholder="コメントを追加..." value={commentInput} onChange={e => setCommentInput(e.target.value)} className="flex-1 bg-[#1c1c1e] rounded-full px-3 py-1.5 text-xs focus:outline-none" />
                          <button type="submit" className="text-[10px] font-bold text-black bg-white px-3 py-1.5 rounded-full">Post</button>
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
              {prefix}{candidate}
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
        追加
      </button>
    </div>
  );

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
            <h2 className="text-xl font-bold mb-4">メールを送信しました</h2>
            <p className="text-sm text-zinc-400 mb-8 leading-relaxed">{email} 宛に確認メールを送りました。<br />リンクをクリックしてログインしてください。</p>
            <button onClick={() => { setSignupSuccess(false); setAuthMode('login'); }} className="w-full bg-white text-black font-bold py-3.5 rounded-xl">ログイン画面へ</button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-center mb-2">{authMode === 'login' ? 'ログインして始める' : '新しいアカウントを作成'}</h2>
            <input type="email" placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#1c1c1e] border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none" />
            <input type="password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#1c1c1e] border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none" />
            {authMode === 'login' ? (
              <>
                <button onClick={handleLogin} disabled={isAuthLoading} className="w-full bg-white text-black font-bold py-3.5 rounded-xl mt-4 disabled:opacity-50 transition-transform active:scale-95">{isAuthLoading ? "処理中..." : "ログイン"}</button>
                <p className="text-center text-xs text-zinc-500 mt-4">アカウントを持っていませんか？ <button onClick={() => { setAuthMode('signup'); setEmail(""); setPassword(""); }} className="text-white font-bold hover:underline">新規登録</button></p>
              </>
            ) : (
              <>
                <div className="flex items-start gap-2 mt-4 px-1">
  <input type="checkbox" id="terms-checkbox" className="mt-1 w-4 h-4 rounded border-zinc-700 bg-black accent-[#1DB954] cursor-pointer shrink-0" />
  <label htmlFor="terms-checkbox" className="text-xs text-zinc-400 leading-relaxed cursor-pointer select-none">
    <button type="button" className="text-[#1DB954] hover:underline" onClick={(e) => { 
      e.preventDefault(); 
      e.stopPropagation(); 
      setShowAppInfoModal({ 
        title: "利用規約", 
        content: "第1条（適用）\n本規約は、ユーザーと本アプリ「Echoes」の利用に関わる一切の関係に適用されます。\n\n第2条（禁止事項）\nユーザーは、以下の行為をしてはなりません。\n・法令または公序良俗に違反する行為\n・著作権、商標権などの知的財産権を侵害する行為\n・他のユーザーや第三者を誹謗中傷する行為\n・スパム、宣伝、勧誘を目的とする行為\n\n第3条（免責事項）\n運営は、本アプリに起因してユーザーに生じたあらゆる損害について、一切の責任を負いません。\n\n第4条（規約の変更）\n運営は、必要と判断した場合には、いつでも本規約を変更することができるものとします。" 
      }); 
    }}>利用規約</button>と
    <button type="button" className="text-[#1DB954] hover:underline" onClick={(e) => { 
      e.preventDefault(); 
      e.stopPropagation(); 
      setShowAppInfoModal({ 
        title: "プライバシーポリシー", 
        content: "1. 取得する情報\n本アプリは、アカウント登録時のメールアドレス、プロフィール情報、投稿された文章や画像、音声を取得します。\n\n2. 利用目的\n取得した情報は、本サービスの提供、ユーザー間のコミュニケーションの円滑化、AIによるおすすめコンテンツの提示のために利用されます。\n\n3. 第三者提供\n本アプリは、法令に定めがある場合を除き、ユーザーの同意を得ることなく第三者に個人情報を提供することはありません。\n\n4. データの削除\nユーザーはアカウント設定から退会処理を行うことで、紐づくすべてのデータをシステムから完全に消去することができます。" 
      }); 
    }}>プライバシーポリシー</button>に同意します。
  </label>
</div>
                <button 
                  onClick={() => {
                    const cb = document.getElementById('terms-checkbox') as HTMLInputElement;
                    if (cb && !cb.checked) {
                      showToast("利用規約とプライバシーポリシーへの同意が必要です", "error");
                      return;
                    }
                    handleSignUp();
                  }} 
                  disabled={isAuthLoading} 
                  className="w-full bg-[#1DB954] text-black font-bold py-3.5 rounded-xl mt-4 disabled:opacity-50 transition-transform active:scale-95"
                >
                  {isAuthLoading ? "処理中..." : "登録する"}
                </button>
                <p className="text-center text-xs text-zinc-500 mt-4">すでにアカウントをお持ちですか？ <button onClick={() => { setAuthMode('login'); setEmail(""); setPassword(""); }} className="text-white font-bold hover:underline">ログイン</button></p>
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
            <button onClick={() => setShowAppInfoModal(null)} className="w-full py-3 bg-white text-black rounded-xl text-sm font-bold uppercase hover:bg-zinc-200 transition-colors">閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
  function handleSpotifyLogin(event: React.MouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    if (!clientId) {
      showToast("Spotify client ID is not configured", "error");
      return;
    }

    const redirectUri = window.location.origin + '/';
    const scope = 'user-read-private user-read-email';

    const randomString = (length: number) =>
      Array.from(crypto.getRandomValues(new Uint8Array(length)))
        .map((b) => ('0' + (b % 36).toString(36)).slice(-1))
        .join('');

    const codeVerifier = randomString(64);
    localStorage.setItem('code_verifier', codeVerifier);

    const toBase64Url = (buffer: ArrayBuffer) =>
      btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))
      .then((digest) => {
        const codeChallenge = toBase64Url(digest);
        const params = new URLSearchParams({
          response_type: 'code',
          client_id: clientId,
          scope,
          redirect_uri: redirectUri,
          code_challenge_method: 'S256',
          code_challenge: codeChallenge,
        });
        window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
      })
      .catch(() => {
        showToast("Spotify login initialization failed", "error");
      });
  }

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
            <p className="text-center font-bold text-lg mb-8 leading-relaxed">ログアウトしますか？</p>
            <div className="flex gap-4">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3.5 border border-zinc-800 rounded-xl text-xs font-bold uppercase">キャンセル</button>
              <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="flex-1 py-3.5 bg-red-500 text-white rounded-xl text-xs font-bold uppercase">ログアウト</button>
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
        onCancelDraft={cancelDraft}
        onCaptionChange={setDraftCaption}
        onPost={checkAndPost}
        onCancelOverride={() => setShowPostOverrideConfirm(null)}
        onOverwrite={() => executePost(new Date())}
      />
      {activeArtistProfile && (
        <div className="fixed inset-0 bg-black z-[1000] animate-fade-in flex flex-col overflow-y-auto">
          <div className="absolute top-0 w-full h-[50vh] z-0 pointer-events-none">
            <img src={activeArtistProfile.artworkUrl} className="w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black"></div>
          </div>
          <div className="flex items-center p-4 sticky top-0 z-20">
            <button aria-label="アーティストページを戻る" onClick={() => { setPlayingSong(null); handleGoBack(); }} className="text-white bg-black/40 backdrop-blur p-2 rounded-full"><IconChevronLeft /></button>
          </div>
          <div className="px-6 relative z-10 mt-[15vh] mb-8">
            <h1 className="text-5xl font-black tracking-tighter mb-2 break-all leading-tight drop-shadow-lg flex items-center flex-wrap gap-4">
              {activeArtistProfile.artistName}
              {/* 💡 ステップ11: 本物のアーティスト情報が取得できた場合のみ、緑の公式マークを表示 */}
              {activeArtistProfile.isVerifiedReal && (
                <span className="text-[#1DB954] w-10 h-10 flex items-center justify-center bg-black/30 rounded-full backdrop-blur-md">
                  <IconVerified />
                </span>
              )}
            </h1>
            <p className="text-xs text-zinc-300 font-bold mb-6 drop-shadow">{activeArtistProfile.artistId.toString().substring(0, 3)}K Followers</p>
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => artistSongs[0] && togglePlay(artistSongs[0].previewUrl)} className="w-14 h-14 bg-[#1DB954] rounded-full flex items-center justify-center text-black shadow-xl hover:scale-105 transition-transform">
                {playingSong === artistSongs[0]?.previewUrl ? <IconStop /> : <IconPlay />}
              </button>
              <button onClick={() => toggleFavoriteArtist(activeArtistProfile)} className="w-12 h-12 bg-black/40 backdrop-blur rounded-full flex items-center justify-center border border-zinc-700/50">
                <IconHeart filled={favoriteArtists.some(a => a.artistId === activeArtistProfile.artistId)} />
              </button>
            </div>
            {activeArtistCommunity && (
              <div className="bg-[#1c1c1e]/90 border border-[#1DB954]/20 rounded-2xl p-4 shadow-2xl backdrop-blur-md">
                <div className="flex gap-4">
                  <div className="w-14 h-14 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0">
                    {activeArtistCommunity.artworkUrl ? <img src={activeArtistCommunity.artworkUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-500"><IconUsers /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-black text-white truncate">{activeArtistCommunity.name}</p>
                    <p className="text-xs text-zinc-300 leading-relaxed mt-1">{activeArtistCommunity.description}</p>
                    <p className="text-[11px] text-zinc-500 font-bold mt-2">{activeArtistCommunity.memberCount}人が参加中</p>
                  </div>
                </div>
                {activeArtistCommunity.isJoined || chatCommunities.some(c => c.id === activeArtistCommunity.id) ? (
                  <button onClick={() => openCommunityChat(activeArtistCommunity)} className="w-full mt-4 py-3 bg-[#1DB954] text-black rounded-xl text-xs font-bold">コミュニティを見る</button>
                ) : (
                  <button onClick={() => joinCommunity(activeArtistCommunity)} className="w-full mt-4 py-3 bg-white text-black rounded-xl text-xs font-bold">参加する</button>
                )}
              </div>
            )}
          </div>
          <div className="px-4 pb-24 relative z-10 bg-black min-h-[50vh]">
            {isArtistLoading ? <p className="text-center text-zinc-500 py-12">Loading tracks...</p> : (
              <>
                {latestReleaseSong && (
                  <div className="mb-10">
                    <h3 className="text-lg font-bold mb-4 px-2">{t('latestRelease')}</h3>
                    <div onClick={() => { if ((activeTab === 'chat' && activeChatUserId) || (activeTab === 'other_profile' && viewingUser)) { if (activeTab === 'other_profile' && viewingUser) setActiveChatUserId(viewingUser.id); setSelectedChatSong(latestReleaseSong); setShowChatMusicSelector(true); } else { setDraftSong(latestReleaseSong); } }} className="flex items-center gap-4 bg-[#1c1c1e] p-4 rounded-2xl cursor-pointer hover:bg-zinc-800 transition-colors group">
                      <div className="relative w-16 h-16 rounded overflow-hidden shadow-md flex-shrink-0 z-10 hover:scale-105 transition-transform" onClick={(e) => { e.stopPropagation(); togglePlay(latestReleaseSong.previewUrl, { title: latestReleaseSong.trackName, artist: latestReleaseSong.artistName, imgUrl: latestReleaseSong.artworkUrl100 }); }}>
                        <img src={latestReleaseSong.artworkUrl60.replace('60x60bb', '300x300bb')} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100"><IconPlay /></div>
                      </div>
                      <div className="flex-1 overflow-hidden"><p className="font-bold text-base truncate">{latestReleaseSong.trackName}</p><p className="text-xs text-[#1DB954] font-bold mt-1">NEW</p></div>
                      {(activeTab === 'chat' && activeChatUserId) || (activeTab === 'other_profile' && viewingUser) ? (
                        <button onClick={(e) => {
                          e.stopPropagation();
                          if (activeTab === 'other_profile' && viewingUser) setActiveChatUserId(viewingUser.id);
                          setSelectedChatSong(latestReleaseSong);
                          setShowChatMusicSelector(true);
                        }} className="w-10 h-10 rounded-full bg-zinc-800/80 flex items-center justify-center text-white hover:bg-[#1DB954] hover:text-black transition-colors shrink-0 shadow-md">
                          <IconSend />
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
                <h3 className="text-lg font-bold mb-4 px-2">{t('popularSongs')}</h3>
                <div className="flex flex-col gap-1 mb-10">
                  {artistSongs.slice(0, 10).map((s, i) => (
                    <div key={i} onClick={() => { if ((activeTab === 'chat' && activeChatUserId) || (activeTab === 'other_profile' && viewingUser)) { if (activeTab === 'other_profile' && viewingUser) setActiveChatUserId(viewingUser.id); setSelectedChatSong(s); setShowChatMusicSelector(true); } else { setDraftSong(s); } }} className="flex items-center gap-4 py-3 px-2 hover:bg-zinc-800/50 rounded-xl cursor-pointer group">
                      <p className="text-zinc-500 font-bold text-sm w-4 text-right group-hover:hidden">{i + 1}</p>
                      <div className="w-4 hidden group-hover:block text-[#1DB954]"><IconPlay /></div>
                      <img src={s.artworkUrl60} className="w-10 h-10 rounded object-cover shadow-sm z-10 relative hover:scale-105 transition-transform cursor-pointer" onClick={(e) => { e.stopPropagation(); togglePlay(s.previewUrl, { title: s.trackName, artist: s.artistName, imgUrl: s.artworkUrl100 }); }} />
                      <div className="flex-1 overflow-hidden"><p className="font-bold text-sm truncate group-hover:text-[#1DB954] transition-colors">{s.trackName}</p></div>
                      {(activeTab === 'chat' && activeChatUserId) || (activeTab === 'other_profile' && viewingUser) ? (
                        <button onClick={(e) => {
                          e.stopPropagation();
                          if (activeTab === 'other_profile' && viewingUser) setActiveChatUserId(viewingUser.id);
                          setSelectedChatSong(s);
                          setShowChatMusicSelector(true);
                        }} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-[#1DB954] hover:text-black transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                          <IconSend />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
                {uniqueAlbums.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold mb-4 px-2">{t('popularAlbums')}</h3>
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 px-2">
                      {uniqueAlbums.map((album, i) => (
                        <div key={i} onClick={() => setActiveAlbumProfile({ collectionId: album.collectionId, collectionName: album.collectionName, artworkUrl: album.artworkUrl100.replace('100x100bb', '600x600bb'), artistName: album.artistName })} className="flex-shrink-0 w-32 cursor-pointer group">
                          <img src={album.artworkUrl100.replace('100x100bb', '400x400bb')} className="w-32 h-32 rounded-xl object-cover shadow-md mb-2 group-hover:opacity-80 transition-opacity" />
                          <p className="font-bold text-xs truncate">{album.collectionName}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
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
            {isAlbumLoading ? <p className="text-center text-zinc-500 py-12">Loading tracks...</p> : (
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[1000] flex flex-col justify-end animate-fade-in" onClick={() => setShowCommDrumroll(false)}>
          <div className="bg-[#1c1c1e] rounded-t-3xl border-t border-zinc-800 p-8 w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <button onClick={() => setShowCommDrumroll(false)} className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Cancel</button>
              <h4 className="font-bold text-sm">年月を選択</h4>
              <button onClick={() => setShowCommDrumroll(false)} className="text-white text-xs font-bold uppercase tracking-widest bg-zinc-800 px-6 py-2 rounded-full">Set</button>
            </div>
            <div className="relative h-[200px] w-full flex gap-4 justify-center items-center overflow-hidden">
              {/* 💡 選択枠をピッタリ中央に配置 */}
              <div className="absolute top-1/2 left-0 w-full h-[50px] bg-white/10 -mt-[25px] rounded-xl pointer-events-none z-10" />
              {/* 💡 左側：年選択（上下に75pxの余白を追加してズレを解消） */}
              <div className="relative flex-1 h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory py-[75px] z-20" onScroll={e => { const st = e.currentTarget.scrollTop; const y = 2024 + Math.round(st / 50); if (y >= 2024 && y <= 2028) setCommCalDate(new Date(y, commCalDate.getMonth(), 1)); }}>
                {[2024, 2025, 2026, 2027, 2028].map(y => (
                  <div key={y} className={`h-[50px] flex justify-center items-center snap-center ${commCalDate.getFullYear() === y ? 'text-white font-bold text-lg' : 'text-zinc-500'}`}>{y}年</div>
                ))}
              </div>
              {/* 💡 右側：月選択（上下に75pxの余白を追加してズレを解消） */}
              <div className="relative flex-1 h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory py-[75px] z-20" onScroll={e => { const st = e.currentTarget.scrollTop; const m = Math.round(st / 50) + 1; if (m >= 1 && m <= 12) setCommCalDate(new Date(commCalDate.getFullYear(), m - 1, 1)); }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <div key={m} className={`h-[50px] flex justify-center items-center snap-center ${commCalDate.getMonth() + 1 === m ? 'text-white font-bold text-lg' : 'text-zinc-500'}`}>{m.toString().padStart(2, '0')}月</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 💡 カレンダーモーダル（タップしてリストを表示するUI ＆ ドラムロール対応 ＆ 10人以上制限） */}
      {showCommCalendar && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[950] flex justify-center items-end md:items-center animate-fade-in" onClick={() => { setShowCommCalendar(false); setSelectedModalDate(null); }}>
          <div className="bg-[#1c1c1e] w-full md:max-w-[420px] h-[85vh] md:max-h-[80vh] rounded-t-[32px] md:rounded-[32px] p-6 shadow-2xl relative flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="font-bold text-lg">ライブを探す</h3>
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
              {['日', '月', '火', '水', '木', '金', '土'].map(d => <div key={d} className="text-center text-[10px] text-zinc-500 font-bold mb-2">{d}</div>)}
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
                      <span className={`text-[9px] font-bold mt-0.5 ${isSelected ? 'text-black' : 'text-[#1DB954]'}`}>{eventsToday.length}件</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide mt-4 border-t border-zinc-800 pt-4">
              {selectedModalDate ? (
                <div className="flex flex-col gap-3 animate-fade-in">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{selectedModalDate.replace(/-/g, '/')} の公演</p>
                  {realCommunities.filter(c => c.date === selectedModalDate && (c.memberCount >= 10 || c.isJoined)).map(c => (
                    <div key={c.id} onClick={() => { setActiveCommunityDetail(c); setShowCommCalendar(false); setSelectedModalDate(null); }} className="bg-black p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-zinc-800 border border-zinc-800 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-[#1DB954] flex-shrink-0"><IconTicket /></div>
                        <div className="flex-1 overflow-hidden"><p className="font-bold text-sm text-white truncate">{c.name}</p><p className="text-[10px] text-zinc-500">{c.memberCount}人が参加予定</p></div>
                      </div>
                      <IconChevronRight />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-zinc-500 font-bold">日付をタップしてライブを確認</p>
                </div>
              )}
            </div>
            <button onClick={() => { setCommunityDateFilter(""); setShowCommCalendar(false); setSelectedModalDate(null); }} className="w-full mt-4 py-4 bg-zinc-800 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-zinc-700 transition-colors shrink-0">
              すべての日程を表示
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
              アーティスト詳細を見る <IconChevronRight />
            </button>
          </div>
        </div>
      )}
      {activeCommunityDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[950] flex items-center justify-center p-6 animate-fade-in" onClick={() => setActiveCommunityDetail(null)}>
          <div className="bg-[#1c1c1e] border border-zinc-800 p-8 rounded-[32px] w-full max-w-sm relative flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">Community Detail</h3>
              <button onClick={() => setActiveCommunityDetail(null)} className="text-zinc-500 hover:text-white"><IconCross /></button>
            </div>
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 mb-4 shadow-lg overflow-hidden">
                {activeCommunityDetail.artworkUrl ? <img src={activeCommunityDetail.artworkUrl} className="w-full h-full object-cover" /> : <IconTicket />}
              </div>
              {/* 💡 公式マークを表示 */}
              <h2 className="text-2xl font-black text-center mb-2 flex items-center justify-center gap-2">
                {activeCommunityDetail.name}
                {activeCommunityDetail.isVerified && <span className="text-[#1DB954] w-5 h-5 flex items-center"><IconVerified /></span>}
              </h2>
              {activeCommunityDetail.description && <p className="text-sm text-zinc-300 text-center leading-relaxed mb-3">{activeCommunityDetail.description}</p>}
              <p className="text-sm text-[#1DB954] font-bold mb-4">{activeCommunityDetail.communityType === 'artist' ? '常設ファンコミュニティ' : activeCommunityDetail.date}</p>
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
              <p className="text-xs text-zinc-400">{activeCommunityDetail.memberCount}人が参加中</p>
            </div>
            {chatCommunities.some(c => c.id === activeCommunityDetail.id) || activeCommunityDetail.isJoined ? (
              <button onClick={() => openCommunityChat(activeCommunityDetail)} className="w-full py-4 bg-[#1DB954] text-black rounded-xl text-sm font-bold shadow-lg hover:scale-105 transition-transform mb-2">コミュニティを見る</button>
            ) : (
              <button onClick={() => joinCommunity(activeCommunityDetail)} className="w-full py-4 bg-white text-black rounded-xl text-sm font-bold shadow-lg hover:scale-105 transition-transform mb-2">参加する</button>
            )}
            {/* 💡 ユーザー作成の非公式ライブの場合のみ、通報ボタンを表示 */}
            {!activeCommunityDetail.isVerified && activeCommunityDetail.communityType !== 'artist' && (
              <button onClick={() => handleReportCommunity(activeCommunityDetail.id)} className="w-full py-3 bg-transparent text-zinc-600 hover:text-red-500 rounded-xl text-[10px] font-bold transition-colors flex items-center justify-center gap-1.5 mt-2">
                <IconWarning /> このライブ情報を嘘として{t('report')}
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
            onBack={handleGoBack}
            onOpenDetails={() => setShowChatDetails(true)}
          />
          <ChatMessages
            activeChatUserId={activeChatUserId}
            messages={chatHistory[activeChatUserId] || []}
            allProfiles={allProfiles}
            currentUserId={currentUser?.id}
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
            <div className="fixed inset-0 z-[1200] flex flex-col justify-end animate-fade-in">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowChatMusicSelector(false); setSelectedChatSong(null); setChatMusicComment(""); }}></div>
              <div className={`bg-[#1c1c1e] rounded-t-[32px] w-full pb-10 pt-4 px-4 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-all duration-300 ${selectedChatSong ? 'h-[85vh]' : 'h-[70vh]'} flex flex-col`}>
                <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => { setShowChatMusicSelector(false); setSelectedChatSong(null); setChatMusicComment(""); }}></div>
                <div className="flex justify-between items-center mb-4 px-2 shrink-0">
                  <div className="w-8"></div>
                  <h3 className="text-[15px] font-bold text-white flex items-center gap-2"><IconMusic /> {selectedChatSong ? '音楽を確認' : '音楽をシェア'}</h3>
                  <button onClick={() => { setShowChatMusicSelector(false); setSelectedChatSong(null); setChatMusicComment(""); }} className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"><IconCross /></button>
                </div>
                {!selectedChatSong ? (
                  // 曲選択モード（検索UI）
                  <>
                    <div className="relative mb-4 px-2 shrink-0">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500"><IconSearch /></div>
                      <input type="text" placeholder="楽曲やアーティストを検索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none" />
                    </div>
                    <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-hide flex flex-col gap-2">
                      {searchQuery && searchArtistInfo && (
                        <>
                          <div className="p-3 border border-zinc-800 flex items-center gap-4 cursor-pointer hover:bg-zinc-800/50 rounded-2xl mb-2" onMouseDown={e => {
                            handleArtistClick(e, searchArtistInfo.artistId, searchArtistInfo.artistName, searchArtistInfo.artworkUrl);
                            setShowChatMusicSelector(false);
                          }}>
                            <img src={searchArtistInfo.artworkUrl} className="w-12 h-12 rounded-full object-cover" />
                            <div className="flex-1"><p className="font-bold text-sm text-white">{searchArtistInfo.artistName}</p><p className="text-[10px] text-zinc-400 mt-0.5">アーティスト</p></div>
                            <IconChevronRight />
                          </div>
                          {searchResults.length > 0 && <p className="text-[10px] font-bold text-zinc-500 uppercase px-2 pt-2 pb-1">ヒット</p>}
                        </>
                      )}
                      {!searchQuery && trendingSongs.length > 0 && <p className="text-[10px] font-bold text-zinc-500 uppercase px-2 pt-2 pb-1 flex items-center"><IconTrend />Trending Now</p>}
                      {(searchQuery && searchResults.length > 0 ? searchResults : trendingSongs).map((song, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-zinc-800/30 hover:bg-zinc-800 rounded-2xl cursor-pointer transition-colors group" onClick={() => setSelectedChatSong(song)}>
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-zinc-800">
                            <img src={song.artworkUrl60.replace('60x60', '100x100')} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><IconPlus /></div>
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="font-bold text-sm text-white truncate">{song.trackName}</p>
                            <p className="text-[10px] text-zinc-400 mt-1 truncate">{song.artistName}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  // 曲確認・送信モード（投稿作成画面風UI）
                  (() => {
	                    const handleSendMusicShare = async () => {
	  if (!activeChatUserId || !currentUser || !selectedChatSong) return;
	  if (!canAccessChatTarget(activeChatUserId)) {
	    showToast("Unauthorized", "error");
	    return;
	  }

	  const commentText = chatMusicComment.trim();
  if (commentText.length > 500) {
    showToast("TextLimitExceeded", "error");
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
    showToast("MessageSendFailed", "error");
    setChatHistory(prev => ({
      ...prev,
      [activeChatUserId]: (prev[activeChatUserId] || []).filter(m => m.id !== tempMusicId && m.id !== tempTextId)
    }));
  }
};
                    return (
                      <div className="flex-1 flex flex-col gap-6 animate-fade-in p-2">
                        <div className="flex items-center gap-4 bg-black p-4 rounded-2xl border border-zinc-800">
                          <img src={selectedChatSong.artworkUrl100} className="w-20 h-20 rounded-xl object-cover shadow-md" />
                          <div className="flex-1 overflow-hidden">
                            <p className="font-bold text-lg text-white truncate">{selectedChatSong.trackName}</p>
                            <p className="text-sm text-zinc-400 mt-1 truncate">{selectedChatSong.artistName}</p>
                          </div>
                          <button onClick={() => setSelectedChatSong(null)} className="text-zinc-600 hover:text-white transition-colors"><IconCross /></button>
                        </div>
                        <div className="flex-1 bg-black rounded-2xl border border-zinc-800 p-4 flex flex-col relative">
                          {currentUser && (
                            <div className="flex items-center gap-2 mb-3">
                              <img src={myProfile.avatar} className="w-6 h-6 rounded-full object-cover" />
                              <span className="text-xs font-bold text-zinc-400">メッセージを追加...</span>
                            </div>
                          )}
                          <textarea value={chatMusicComment} onChange={e => setChatMusicComment(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleSendMusicShare(); } }} placeholder="この曲について話そう..." className="w-full flex-1 bg-transparent text-white text-sm resize-none focus:outline-none scrollbar-hide" />
                          <div className="absolute bottom-3 right-3 text-xs text-zinc-600">{chatMusicComment.length}/100</div>
                        </div>
                        <button onClick={handleSendMusicShare} className="w-full bg-[#1DB954] text-black font-bold rounded-full py-4 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg">
                          <IconSend /> チャットに送信
                        </button>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
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
                  {chatDetailsTab === 'menu' ? '詳細設定' : chatDetailsTab === 'members' ? 'メンバー' : chatDetailsTab === 'album' ? 'アルバム' : 'ノート'}
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto pb-20">
                {chatDetailsTab === 'menu' && (
                  <div className="flex flex-col animate-fade-in">
                    <div className="grid grid-cols-4 gap-4 p-6 border-b border-zinc-900/80">
                      <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => showToast("通知をオフにしました")}>
                        <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconBell /></div>
                        <span className="text-[11px] font-bold text-zinc-400">通知オフ</span>
                      </div>
                      <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => setChatDetailsTab('members')}>
                        <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconUsers /></div>
                        <span className="text-[11px] font-bold text-zinc-400">メンバー</span>
                      </div>
                      <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => showToast("招待リンクをコピーしました")}>
                        <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconUserPlus /></div>
                        <span className="text-[11px] font-bold text-zinc-400">招待</span>
                      </div>
                      <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={leaveActiveChat}>
                        <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-red-500 group-hover:bg-zinc-800 transition-colors">
                          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        </div>
                        <span className="text-[11px] font-bold text-zinc-400">退会</span>
                      </div>
                    </div>
                    <div className="flex flex-col mt-2">
                      <div className="flex items-center justify-between p-4 hover:bg-[#1c1c1e] cursor-pointer transition-colors" onClick={() => setChatDetailsTab('album')}>
                        <div className="flex items-center gap-4 text-white"><IconImage /><span className="text-[15px] font-bold">写真・動画</span></div>
                        <span className="text-zinc-600"><IconChevronRight /></span>
                      </div>
                      <div className="flex items-center justify-between p-4 hover:bg-[#1c1c1e] cursor-pointer transition-colors" onClick={() => setChatDetailsTab('notes')}>
                        <div className="flex items-center gap-4 text-white"><IconPin /><span className="text-[15px] font-bold">ノート</span></div>
                        <span className="text-zinc-600"><IconChevronRight /></span>
                      </div>
                      <div className="flex items-center justify-between p-4 hover:bg-[#1c1c1e] cursor-pointer transition-colors" onClick={() => showToast("近日公開予定です")}>
                        <div className="flex items-center gap-4 text-white"><IconCalendar /><span className="text-[15px] font-bold">イベント</span></div>
                        <span className="text-zinc-600"><IconChevronRight /></span>
                      </div>
                      <div className="flex items-center justify-between p-4 hover:bg-[#1c1c1e] cursor-pointer transition-colors" onClick={() => setChatDetailsTab('files')}>
                        <div className="flex items-center gap-4 text-white"><IconFile /><span className="text-[15px] font-bold">ファイル</span></div>
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
                              title: 'Echoesに招待',
                              text: 'グループ/ライブに参加しよう！',
                              url: inviteUrl
                            });
                          } catch (err) {}
                        } else {
                          navigator.clipboard.writeText(inviteUrl);
                          showToast("招待リンクをコピーしました！", "success");
                        }
                      }}>
                        <div className="w-12 h-12 rounded-full bg-[#1DB954]/10 text-[#1DB954] flex items-center justify-center border border-[#1DB954]/20"><IconUserPlus /></div>
                        <span className="font-bold text-[15px] text-[#1DB954]">友だちを招待</span>
                      </div>
                      <div className="w-full h-2 bg-black"></div>
                      <div className="px-4 py-3 text-xs font-bold text-zinc-500 bg-[#0a0a0a]">
                        メンバー・参加者 ({displayCount})
                      </div>
                      <div className="flex flex-col p-2">
                        {memberList.map(u => (
                          <div key={u.id} className="flex items-center justify-between p-2 hover:bg-[#1c1c1e] rounded-2xl cursor-pointer transition-colors">
                            <div className="flex items-center gap-4 flex-1" onClick={() => { setViewingUser(u); setActiveTab('other_profile'); setShowChatDetails(false); setActiveChatUserId(null); }}>
                              <img src={u.avatar} className="w-12 h-12 rounded-full object-cover border border-zinc-800" />
                              <div>
                                <p className="font-bold text-[15px] text-white flex items-center gap-2">
                                  {u.name} {u.id === currentUser?.id && <span className="bg-zinc-800 text-zinc-400 text-[9px] px-1.5 py-0.5 rounded-sm">あなた</span>}
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
                          <IconImage /><p className="mt-4 text-sm font-bold">まだ写真はありません</p>
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
                                  <span className="text-[10px] text-zinc-500 truncate">{sender?.name || 'Unknown'}</span>
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
                          <p className="mt-4 text-sm font-bold">まだファイルはありません</p>
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
                        <span className="text-[10px] text-zinc-400">元のメッセージへ</span>
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
                    if (!imgUrl) throw new Error("画像URLがありません");
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
                    showToast("画像の保存に失敗しました", "error");
                  }
                }} className="flex flex-col items-center gap-2 text-white hover:opacity-80">
                  <IconPlus /> <span className="text-[10px] font-bold">保存</span>
                </button>
                <button onClick={async (e) => {
                  e.stopPropagation();
                  const imgUrl = viewingChatImage.text ? viewingChatImage.text.replace('[IMAGE]', '') : '';
                  if (!imgUrl) {
                    showToast("画像のURLが取得できませんでした", "error");
                    return;
                  }
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: 'Echoes Image',
                        text: 'Echoesの画像をシェアします',
                        url: imgUrl
                      });
                    } catch (err) {}
                  } else {
                    navigator.clipboard.writeText(imgUrl);
                    showToast("画像のURLをコピーしました！", "success");
                  }
                }} className="flex flex-col items-center gap-2 text-white hover:opacity-80">
                  <IconShareExternal /> <span className="text-[10px] font-bold">共有</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {showMatchFilterModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[950] flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowMatchFilterModal(false)}>
          <div className="bg-[#1c1c1e] border border-zinc-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg">Vibe Filter</h3><button onClick={() => setShowMatchFilterModal(false)} className="text-zinc-500 hover:text-white"><IconCross /></button></div>
            <div className="flex flex-col gap-6">
              <div className="relative">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Artist</label>
                {matchFilter.artists.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {matchFilter.artists.map(a => (
                      <div key={a.artistId} className="flex items-center bg-zinc-800 rounded-full pl-1 pr-3 py-1 gap-2">
                        <img src={a.artworkUrl} className="w-6 h-6 rounded-full object-cover cursor-pointer" onClick={(e) => handleArtistClick(e, a.artistId, a.artistName, a.artworkUrl)} />
                        <span className="text-xs font-bold text-white cursor-pointer hover:underline" onClick={(e) => handleArtistClick(e, a.artistId, a.artistName, a.artworkUrl)}>{a.artistName}</span>
                        <button onClick={() => setMatchFilter({ ...matchFilter, artists: matchFilter.artists.filter(fa => fa.artistId !== a.artistId) })} className="text-zinc-500 hover:text-white ml-1"><IconCross /></button>
                      </div>
                    ))}
                  </div>
                )}
                <input type="text" placeholder="例: Tele, Vaundy" value={filterArtistInput} onChange={e => setFilterArtistInput(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500" />
                {filterArtistSuggestions.length > 0 && filterArtistInput && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden z-50">
                    {filterArtistSuggestions.map(a => (
                      <div key={a.artistId} onMouseDown={(e) => { e.preventDefault(); if (!matchFilter.artists.some(fa => fa.artistId === a.artistId)) { setMatchFilter({ ...matchFilter, artists: [...matchFilter.artists, a] }); } setFilterArtistInput(""); }} className="flex items-center gap-3 p-3 text-xs text-white hover:bg-zinc-700 cursor-pointer border-b border-zinc-700 last:border-0">
                        <img src={a.artworkUrl} className="w-8 h-8 rounded-full object-cover" />
                        <span className="font-bold">{a.artistName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Hashtag / Live</label>
                {matchFilter.hashtags.length > 0 && (<div className="flex flex-wrap gap-2 mb-3">{matchFilter.hashtags.map(h => (<div key={h} className="flex items-center bg-zinc-800 rounded-full px-3 py-1 gap-2"><span className="text-xs font-bold text-white">#{getMusicTagLabel(h)}</span><button onClick={() => setMatchFilter({ ...matchFilter, hashtags: matchFilter.hashtags.filter(fh => fh !== h) })} className="text-zinc-500 hover:text-white ml-1"><IconCross /></button></div>))}</div>)}
                {matchFilter.liveHistories.length > 0 && (<div className="flex flex-wrap gap-2 mb-3">{matchFilter.liveHistories.map(l => (<div key={l} className="flex items-center bg-zinc-800 rounded-full px-3 py-1 gap-2"><span className="text-xs font-bold text-white"><IconTicket /> {l}</span><button onClick={() => setMatchFilter({ ...matchFilter, liveHistories: matchFilter.liveHistories.filter(fl => fl !== l) })} className="text-zinc-500 hover:text-white ml-1"><IconCross /></button></div>))}</div>)}
                <input type="text" placeholder="例: 邦ロック, VIVA LA ROCK" value={filterHashtagInput} onChange={e => setFilterHashtagInput(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500" />
                {filterHashtagInput && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden z-50">
                    {allAvailableHashtags.filter(h => h.toLowerCase().includes(filterHashtagInput.toLowerCase())).slice(0, 3).map(h => (<div key={h} onMouseDown={(e) => { e.preventDefault(); if (!matchFilter.hashtags.includes(h)) setMatchFilter({ ...matchFilter, hashtags: [...matchFilter.hashtags, h] }); setFilterHashtagInput(""); }} className="p-3 text-xs text-white hover:bg-zinc-700 cursor-pointer border-b border-zinc-700 last:border-0">#{getMusicTagLabel(h)}</div>))}
                    {allAvailableLiveHistories.filter(l => l.toLowerCase().includes(filterHashtagInput.toLowerCase())).slice(0, 3).map(l => (<div key={l} onMouseDown={(e) => { e.preventDefault(); if (!matchFilter.liveHistories.includes(l)) setMatchFilter({ ...matchFilter, liveHistories: [...matchFilter.liveHistories, l] }); setFilterHashtagInput(""); }} className="p-3 text-xs text-white hover:bg-zinc-700 cursor-pointer border-b border-zinc-700 last:border-0"><IconTicket /> {l}</div>))}
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Age Range</label>
                  <div className="flex items-center gap-2">
                    <select value={matchFilter.ageMin} onChange={e => setMatchFilter({ ...matchFilter, ageMin: parseInt(e.target.value) })} className="bg-black border border-zinc-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none appearance-none flex-1 text-center">{Array.from({ length: 83 }, (_, i) => 18 + i).map(y => <option key={y} value={y}>{y}</option>)}</select>
                    <span className="text-zinc-500 text-xs">~</span>
                    <select value={matchFilter.ageMax} onChange={e => setMatchFilter({ ...matchFilter, ageMax: parseInt(e.target.value) })} className="bg-black border border-zinc-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none appearance-none flex-1 text-center">{Array.from({ length: 83 }, (_, i) => 18 + i).map(y => <option key={y} value={y}>{y}</option>)}</select>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Gender</label>
                  <select value={matchFilter.gender} onChange={e => setMatchFilter({ ...matchFilter, gender: e.target.value })} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none appearance-none"><option value="All">All</option><option value="Male">Male</option><option value="Female">Female</option></select>
                </div>
              </div>
            </div>
            <button onClick={() => setShowMatchFilterModal(false)} className="w-full mt-8 bg-white text-black font-bold py-3.5 rounded-xl shadow-lg hover:bg-gray-200 transition-colors">適用して探す</button>
          </div>
        </div>
      )}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[950] flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowCreateGroupModal(false)}>
          <div className="bg-[#1c1c1e] border border-zinc-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg">グループを作成</h3><button onClick={() => setShowCreateGroupModal(false)} className="text-zinc-500 hover:text-white"><IconCross /></button></div>
            <div className="mb-6"><label className="text-[10px] text-zinc-500 mb-1 block">グループ名</label><input type="text" placeholder="例: VIVA LA ROCK 参戦組" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" /></div>
            <div className="mb-6">
              <label className="text-[10px] text-zinc-500 mb-2 block">メンバーを選択</label>
              <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-2 scrollbar-hide">
                {Array.from(followedUsers).map(uid => {
                  const u = allProfiles.find(mu => mu.id === uid);
                  if (!u) return null; const isSelected = newGroupMembers.has(uid);
                  return (
                    <div key={uid} onClick={() => setNewGroupMembers(prev => { const next = new Set(prev); if (next.has(uid)) next.delete(uid); else next.add(uid); return next; })} className="flex items-center justify-between p-2 hover:bg-zinc-800/50 rounded-xl cursor-pointer">
                      <div className="flex items-center gap-3"><img src={u.avatar} className="w-8 h-8 rounded-full object-cover" /><span className="text-sm font-bold">{u.name}</span></div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-[#1DB954] border-[#1DB954]' : 'border-zinc-600'}`}>{isSelected && <IconCheck />}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <button onClick={handleCreateGroup} className="w-full py-3 bg-white text-black rounded-xl text-sm font-bold shadow-lg">作成する</button>
          </div>
        </div>
      )}
      {/* 💡 新しいライブコミュニティを作成するモーダル */}
      {showCreateCommunityModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[950] flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowCreateCommunityModal(false)}>
          <div className="bg-[#1c1c1e] border border-zinc-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">新しくライブを作成</h3>
              <button onClick={() => setShowCreateCommunityModal(false)} className="text-zinc-500 hover:text-white"><IconCross /></button>
            </div>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">探しているライブが見つからない場合、自分で作成して同行者や仲間を募集できます。</p>
            <div className="mb-4">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Live Name</label>
              <input type="text" placeholder="例: Vaundy ARENA tour 2026" value={newCommName} onChange={(e) => setNewCommName(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#1DB954]" />
            </div>
            <div className="mb-8">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Date</label>
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
              ライブを作成して参加する
            </button>
          </div>
        </div>
      )}
      {showNotifications && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[950] animate-fade-in" onClick={() => setShowNotifications(false)}>
          <div className="absolute top-4 right-4 w-full max-w-sm bg-[#1c1c1e] border border-zinc-800 rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg">{t('notifications')}</h3><button onClick={() => setShowNotifications(false)} className="text-zinc-500 hover:text-white"><IconCross /></button></div>
            <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
  {notifications.map((n) => (
    <div key={n.id} onClick={async () => { 
      if (n.read) return;
      setNotifications(prev => prev.map(p => p.id === n.id ? { ...p, read: true } : p));
      try {
        const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
        if (error) throw error;
      } catch (err) {
        setNotifications(prev => prev.map(p => p.id === n.id ? { ...p, read: false } : p));
      }
    }} className="flex items-start gap-4 p-3 rounded-2xl hover:bg-zinc-800/50 transition-colors cursor-pointer relative">
      {!n.read && <div className="absolute top-4 right-4 w-2 h-2 bg-[#1DB954] rounded-full"></div>}
      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 text-white">
        {n.type === 'follow' ? <IconUserPlus /> : n.type === 'like' ? <IconHeart filled={true} /> : n.type === 'vibe_request' ? <IconSparkles /> : n.type === 'match' ? <IconMatchTab /> : <IconComment />}
      </div>
      <div><p className={`text-sm ${n.read ? 'text-zinc-400 font-normal' : 'text-white font-bold'}`}>{n.text}</p><p className="text-[10px] text-zinc-500 mt-1">{n.time}</p></div>
    </div>
  ))}
  {notifications.length === 0 && <p className="text-zinc-500 text-xs text-center py-4">No new notifications</p>}
</div>
          </div>
        </div>
      )}
      {showSettingsMenu && (
        <div className="fixed inset-0 bg-black z-[800] animate-fade-in overflow-y-auto">
          <div className="flex items-center px-4 py-4 border-b border-zinc-900 sticky top-0 bg-black/90 backdrop-blur-md z-10"><button onClick={() => setShowSettingsMenu(false)}><IconChevronLeft /></button><h2 className="text-white font-bold text-lg mx-auto pr-8">{t('settings')}</h2></div>
          <div className="px-4 py-6">
            <div className="bg-[#1c1c1e] rounded-[22px] p-4 flex items-center justify-between mb-8 cursor-pointer" onClick={() => { setShowSettingsMenu(false); openEditProfile(); }}><div className="flex items-center gap-4"><img src={myProfile.avatar} className="w-12 h-12 rounded-full object-cover border border-zinc-800" /><div><p className="font-bold text-lg">{myProfile.name}</p><p className="text-sm text-zinc-500">@{myProfile.handle}</p></div></div><IconChevronRight /></div>
            <p className="text-xs font-bold text-zinc-500 mb-2 px-2">クリエイターツール</p>
            <div className="bg-[#1c1c1e] rounded-2xl mb-8 flex flex-col">
	              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors" onClick={loadRevenueDashboard}>
                <div className="flex items-center gap-3 text-yellow-500"><IconYen /><p className="font-bold text-sm text-white">収益ダッシュボード</p></div>
                <IconChevronRight />
              </div>
            </div>
            <p className="text-xs font-bold text-zinc-500 mb-2 px-2">{t('features')}</p>
            <div className="bg-[#1c1c1e] rounded-2xl mb-8"><div className="flex items-center justify-between p-4"><div className="flex items-center gap-3"><IconMusic /><p className="font-bold text-sm">{t('audio')}</p></div><button onClick={() => setSettings({ ...settings, audio: !settings.audio })} className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.audio ? 'bg-[#1DB954]' : 'bg-zinc-700'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${settings.audio ? 'translate-x-6' : 'translate-x-0'}`}></div></button></div></div>
            <p className="text-xs font-bold text-zinc-500 mb-2 px-2">{t('settings')}</p>
            <div className="bg-[#1c1c1e] rounded-2xl mb-8 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <IconMusic />
                  <p className="font-bold text-sm">Spotify連携</p>
                </div>
                {spotifyAccessToken ? (
                  <span className="text-[10px] font-bold text-[#1DB954] bg-[#1DB954]/10 px-3 py-1 rounded-full border border-[#1DB954]/20">連携済み</span>
                ) : (
                  <button onClick={handleSpotifyLogin} className="px-4 py-1.5 bg-[#1DB954] text-black font-bold text-xs rounded-full hover:scale-105 transition-transform shadow-md">連携する</button>
                )}
              </div>
              <div className="flex items-center justify-between p-4 border-b border-zinc-800/50"><div className="flex items-center gap-3"><IconBell /><p className="font-bold text-sm">{t('notifications')}</p></div><button onClick={() => { setSettings({ ...settings, notifications: !settings.notifications }); }} className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.notifications ? 'bg-[#1DB954]' : 'bg-zinc-700'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${settings.notifications ? 'translate-x-6' : 'translate-x-0'}`}></div></button></div>
              <div className="flex items-center justify-between p-4 border-b border-zinc-800/50"><div className="flex items-center gap-3"><IconLockSetting /><p className="font-bold text-sm">{t('privateAcc')}</p></div><button onClick={() => { setEditIsPrivate(!myProfile.isPrivate); setMyProfile({ ...myProfile, isPrivate: !myProfile.isPrivate }); }} className={`w-12 h-6 rounded-full p-1 transition-colors ${myProfile.isPrivate ? 'bg-white' : 'bg-zinc-700'}`}><div className={`w-4 h-4 rounded-full shadow-md transform transition-transform ${myProfile.isPrivate ? 'translate-x-6 bg-black' : 'translate-x-0 bg-white'}`}></div></button></div>
              <div className="relative flex items-center justify-between p-4 border-b border-zinc-800/50 cursor-pointer"><div className="flex items-center gap-3"><IconClock /><p className="font-bold text-sm">{t('timezone')}: {timeZone.split('/').pop()?.replace('_', ' ')}</p></div><IconChevronRight /><select value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"><optgroup label="Asia"><option value="Asia/Tokyo">Tokyo (JST)</option><option value="Asia/Seoul">Seoul (KST)</option><option value="Asia/Shanghai">Shanghai (CST)</option></optgroup><optgroup label="America"><option value="America/New_York">New York (EST/EDT)</option><option value="America/Los_Angeles">Los Angeles (PST/PDT)</option></optgroup><optgroup label="Europe"><option value="Europe/London">London (GMT/BST)</option><option value="Europe/Paris">Paris (CET/CEST)</option></optgroup></select></div>
              <div className="relative flex items-center justify-between p-4 cursor-pointer"><div className="flex items-center gap-3"><IconGlobe /><p className="font-bold text-sm">{t('language')}: {language}</p></div><IconChevronRight /><select value={language} onChange={(e) => setLanguage(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"><option value="日本語">日本語</option><option value="English">English</option><option value="中文">中文</option></select></div>
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors" onClick={() => { setShowSettingsMenu(false); setShowBlockedUsersModal(true); }}><div className="flex items-center gap-3"><IconLock /><p className="font-bold text-sm">ブロックしたユーザー</p></div><IconChevronRight /></div>
            </div>
            <p className="text-xs font-bold text-zinc-500 mb-2 px-2">{t('appInfo')}</p>
            <div className="bg-[#1c1c1e] rounded-2xl mb-8 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800/50 cursor-pointer" onClick={handleShareApp}><div className="flex items-center gap-3"><IconShareExternal /><p className="font-bold text-sm">{t('shareApp')}</p></div><IconChevronRight /></div>
              <div className="flex items-center justify-between p-4 border-b border-zinc-800/50 cursor-pointer"><div className="flex items-center gap-3"><IconStar /><p className="font-bold text-sm">{t('rateApp')}</p></div><IconChevronRight /></div>
              <div className="flex items-center justify-between p-4 border-b border-zinc-800/50 cursor-pointer" onClick={() => setShowAppInfoModal({ title: t('help'), content: "サポート窓口: echos.jpn@gmail.com\n\n24時間以内に担当者がお答えします。" })}><div className="flex items-center gap-3"><IconHelp /><p className="font-bold text-sm">{t('help')}</p></div><IconChevronRight /></div>
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setShowAppInfoModal({ title: t('appInfo'), content: "バージョン: 42.0.0\n\nEchoesは、音楽を通じて日々の記録を残す新しい形のSNSです。" })}><div className="flex items-center gap-3"><IconInfo /><p className="font-bold text-sm">{t('appInfo')}</p></div><IconChevronRight /></div>
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
            <h2 className="text-white font-bold text-lg mx-auto pr-8">収益ダッシュボード</h2>
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
                    <p className="text-[#1DB954] text-[10px] font-black uppercase tracking-widest mb-3">引き出し可能な売上金</p>
                    <div className="flex items-end gap-1 mb-3">
                      <span className="text-2xl font-bold text-white mb-1">¥</span>
                      <span className="text-5xl font-black text-white tracking-tighter">{jpyRevenue.toLocaleString()}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-bold bg-black/40 px-3 py-1 rounded-full border border-zinc-800 mb-6">
                      換金対象: 有償 {paidTotal.toLocaleString()} C (レート: 1C = 0.5円)
                    </p>
	                    <div className="w-full bg-black/35 border border-zinc-800 rounded-2xl p-3 mb-3 text-left">
	                      <p className="text-[10px] font-bold text-zinc-500 mb-1">換金設定</p>
	                      <p className="text-xs text-zinc-300 leading-relaxed">
	                        {stripeConnectStatus.lastPayoutFailure ? `前回の振込に失敗しました: ${stripeConnectStatus.lastPayoutFailure.message || stripeConnectStatus.lastPayoutFailure.code || '振込先情報を確認してください。'}` : stripeConnectStatus.payoutsEnabled ? 'Stripeの本人確認と振込先登録が完了しています。' : stripeConnectStatus.connected ? 'Stripeの本人確認または振込先登録が未完了です。' : '換金にはStripeで本人確認と振込先登録が必要です。'}
	                      </p>
	                    </div>
	                    {!stripeConnectStatus.payoutsEnabled ? (
	                      <button
	                        onClick={startStripeConnectOnboarding}
	                        disabled={isStartingStripeConnect}
	                        className="w-full py-3.5 rounded-full font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 active:scale-95 disabled:opacity-50"
	                      >
	                        {isStartingStripeConnect ? '接続中...' : stripeConnectStatus.connected ? '換金設定を続ける' : '換金設定を開始する'}
	                      </button>
	                    ) : (
	                      <button 
	                        disabled={!canWithdraw || isRequestingPayout}
	                        onClick={requestCreatorPayout}
	                        className={`w-full py-3.5 rounded-full font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${canWithdraw ? 'bg-white text-black hover:bg-zinc-200 active:scale-95' : 'bg-black/50 text-zinc-500 border border-zinc-700 cursor-not-allowed'}`}
	                      >
	                        {isRequestingPayout ? '申請中...' : canWithdraw ? '振込申請をする' : '1,000円以上で引き出し可能'}
	                      </button>
	                    )}
                  </div>
                  <div className="bg-[#1c1c1e] border border-zinc-800 rounded-3xl p-5 mb-6 flex items-center justify-between shadow-inner">
                    <div className="flex flex-col">
                      <span className="text-zinc-400 text-[10px] font-bold mb-1">累計獲得コイン (無償分含む)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center text-black shadow-md">
                          <span className="text-[12px] font-black mt-[1px]">C</span>
                        </div>
                        <span className="text-xl font-black text-white">{revenueData.total.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-4 text-[10px] font-bold text-zinc-500 text-right">
                      <div className="flex flex-col"><span className="mb-0.5">記事</span><span className="text-white">{revenueData.article.toLocaleString()}</span></div>
                      <div className="flex flex-col"><span className="mb-0.5">ギフト</span><span className="text-white">{revenueData.gift.toLocaleString()}</span></div>
                    </div>
                  </div>
                  <h3 className="font-bold text-xs text-zinc-500 mb-4 px-2 uppercase tracking-widest flex items-center gap-2"><IconList /> 取引履歴</h3>
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
                              <p className="font-bold text-sm text-white leading-tight mb-1.5">{sender?.name || 'ユーザー'}</p>
                              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mb-0.5">
                                <div className="w-3 h-3 flex items-center justify-center opacity-80">
                                  {isGift ? <IconSparkles /> : <IconArticle />}
                                </div>
                                <span>{isGift ? 'サポートを受け取りました' : '記事が購入されました'}</span>
                                <span className={isPaid ? 'text-[#1DB954] font-bold ml-1' : 'text-zinc-500 ml-1'}>
                                  ({isPaid ? '有償' : '無償'})
                                </span>
                              </div>
                              <p className="text-[9px] text-zinc-600">{new Date(tx.created_at).toLocaleDateString('ja-JP')} {new Date(tx.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`font-black text-lg ${isPaid ? 'text-[#1DB954]' : 'text-yellow-500'}`}>+{tx.amount.toLocaleString()}</p>
                            <p className="text-[9px] text-zinc-500">コイン</p>
                          </div>
                        </div>
                      )
                    }) : (
                      <div className="text-center py-16 bg-[#1c1c1e] rounded-3xl border border-zinc-800 border-dashed">
                        <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-600 mx-auto mb-3"><IconYen /></div>
                        <p className="text-zinc-400 text-sm font-bold">まだ収益データがありません</p>
                        <p className="text-[10px] text-zinc-500 mt-2 px-6">有料記事を公開するか、<br/>サポートを受けるとここに履歴が表示されます。</p>
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
        <div className="fixed inset-0 bg-black/95 z-[900] flex flex-col animate-fade-in">
          <div className="flex items-center p-4 border-b border-zinc-900 sticky top-0 bg-black/90 backdrop-blur-md z-10">
            <button onClick={() => setShowBlockedUsersModal(false)}><IconChevronLeft /></button>
            <h2 className="text-white font-bold text-lg mx-auto pr-8">ブロックしたユーザー</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {displayBlockedUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                <IconLock />
                <p className="mt-4 text-sm font-bold">ブロックしているユーザーはいません</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {displayBlockedUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between bg-[#1c1c1e] p-4 rounded-2xl border border-zinc-800 shadow-sm">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar} className="w-12 h-12 rounded-full object-cover border border-zinc-700" />
                      <div>
                        <p className="font-bold text-sm text-white">{u.name}</p>
                        <p className="text-[10px] text-zinc-500">@{u.handle}</p>
                      </div>
                    </div>
                    <button onClick={() => handleUnblockUser(u.id)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-xs font-bold text-white transition-colors">
                      解除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* 💡 共通の友達リストモーダル */}
      {showMutualFriendsModal && (
        <div className="fixed inset-0 bg-black/95 z-[900] flex flex-col animate-fade-in">
          <div className="flex items-center p-4 border-b border-zinc-900 sticky top-0 bg-black/90 backdrop-blur-md z-10">
            <button onClick={() => setShowMutualFriendsModal(false)}><IconChevronLeft /></button>
            <h2 className="text-white font-bold text-lg mx-auto pr-8">共通の友達</h2>
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
            <p className="text-center font-bold text-lg mb-4 text-white">本当に退会しますか？</p>
            <p className="text-xs text-zinc-400 text-center mb-8 leading-relaxed">
              この操作は取り消せません。<br />プロフィール、Vibe、メッセージなど、<br />すべてのデータが永久に削除されます。
            </p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteAccountConfirm(false)} className="flex-1 py-3.5 border border-zinc-800 rounded-xl text-xs font-bold uppercase hover:bg-zinc-800">キャンセル</button>
              <button onClick={handleDeleteAccount} className="flex-1 py-3.5 bg-red-500 text-white rounded-xl text-xs font-bold uppercase hover:scale-105 transition-transform shadow-lg">退会する</button>
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
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">3回以上通報され、非表示状態になっているコミュニティのリストです。<br />問題がなければ復旧、悪質な場合は削除してください。</p>
            <div className="flex flex-col gap-4 pb-12">
              {realCommunities.filter(c => (c.reportedBy?.length || 0) >= 3).map(c => (
                <div key={c.id} className="bg-[#1c1c1e] border border-red-500/30 rounded-2xl p-5 shadow-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-base text-white">{c.name}</h3>
                      <p className="text-xs text-[#1DB954] mt-1">{c.date}</p>
                    </div>
                    <span className="bg-red-500/20 text-red-500 text-[10px] font-bold px-3 py-1 rounded-full border border-red-500/30">通報 {c.reportedBy?.length}件</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mb-5">参加者: {c.memberCount}人 | ID: {c.id}</p>
                  <div className="flex gap-3">
                    <button onClick={() => handleDeleteCommunity(c.id)} className="flex-1 py-3 bg-red-500 text-white rounded-xl text-xs font-bold transition-transform active:scale-95 shadow-md">完全削除</button>
                    <button onClick={() => handleRestoreCommunity(c.id)} className="flex-1 py-3 border border-zinc-600 text-white rounded-xl text-xs font-bold transition-transform active:scale-95 hover:bg-zinc-800">復旧 (安全)</button>
                  </div>
                </div>
              ))}
              {realCommunities.filter(c => (c.reportedBy?.length || 0) >= 3).length === 0 && (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 text-[#1DB954]"><IconCheck /></div>
                  <p className="font-bold text-zinc-400">現在、通報されたコミュニティはありません</p>
                  <p className="text-[10px] text-zinc-600 mt-2">平和な状態です。</p>
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
              <h3 className="font-bold text-xl mb-2">プロフィールを作りましょう</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                名前と好きな音楽を登録すると、プロフィールとDiscoverのマッチングに反映されます。
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-bold text-white">プロフィール</p>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 shrink-0 group cursor-pointer">
                  <img src={editAvatar} alt="" className="w-full h-full rounded-full object-cover opacity-80 group-hover:opacity-60" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><IconCamera /></div>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" aria-label="プロフィール画像" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="名前" className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-zinc-500" />
                  <div className="flex items-center bg-black border border-zinc-800 rounded-xl overflow-hidden focus-within:border-zinc-500">
                    <span className="pl-3 text-zinc-500 font-bold">@</span>
                    <input type="text" value={editHandle} onChange={(e) => setEditHandle(e.target.value)} placeholder="ユーザーID" className="min-w-0 w-full bg-transparent p-3 text-sm text-white focus:outline-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[11px] font-bold text-white">音楽の好み</p>
              {renderOnboardingChipPicker(
                "好きなジャンル",
                onboardingGenreCandidates,
                onboardingGenres,
                setOnboardingGenres
              )}
              <div>
                <label className="text-[10px] text-zinc-500 ml-1 mb-2 block font-bold">好きなアーティスト</label>
                <input
                  type="text"
                  value={onboardingArtistInput}
                  onChange={(e) => setOnboardingArtistInput(e.target.value)}
                  placeholder="アーティストを検索"
                  aria-label="好きなアーティスト検索"
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
                      <p className="p-3 text-[11px] text-zinc-500">候補を検索しています</p>
                    )}
                  </div>
                )}
              </div>
              {renderOnboardingChipPicker(
                "ハッシュタグ",
                onboardingHashtagCandidates,
                onboardingHashtags,
                setOnboardingHashtags,
                "#"
              )}
              {renderOnboardingTextAdd(
                "自分でハッシュタグを追加",
                onboardingHashtagInput,
                setOnboardingHashtagInput,
                onboardingHashtags,
                setOnboardingHashtags
              )}
              {renderOnboardingChipPicker(
                "ライブ参戦歴",
                onboardingLiveCandidates,
                onboardingLiveHistory,
                setOnboardingLiveHistory
              )}
              {renderOnboardingTextAdd(
                "自分でライブ参戦歴を追加",
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
                あとで
              </button>
              <button
                type="button"
                onClick={saveInitialOnboarding}
                className="flex-1 py-3.5 bg-[#1DB954] text-black rounded-xl text-xs font-bold hover:brightness-110 transition-colors"
              >
                保存して始める
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
            <button onClick={() => setShowAppInfoModal(null)} className="w-full py-3 bg-white text-black rounded-xl text-xs font-bold uppercase">閉じる</button>
          </div>
        </div>
      )}
      <UserListModal
        title={showUserListModal}
        users={displayModalUsers}
        searchQuery={modalSearchQuery}
        followedUsers={followedUsers}
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
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              onSearchQueryChange={setSearchQuery}
              onArtistMouseDown={handleArtistClick}
              onSelectSong={setDraftSong}
            />
            {showPostSuccessCard && (
              <div className="mb-6 rounded-2xl border border-[#1DB954]/20 bg-[#1DB954]/10 px-4 py-4">
                <p className="text-sm font-bold text-white">記録できました。似た音楽が好きな人を見つけに行こう</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowPostSuccessCard(false);
                    setDiscoverTabMode('users');
                    setActiveTab('search');
                  }}
                  className="mt-3 px-4 py-2 rounded-full bg-[#1DB954] text-black text-[11px] font-bold"
                >
                  近い人を探す
                </button>
              </div>
            )}
            <div className="flex flex-col gap-6">
              {allFeedVibes.length === 0 && !isLoadingVibes ? (
                <div className="text-center text-zinc-500 py-20">
                  <p className="text-sm font-bold text-zinc-300">まずは今聴いている1曲を記録しよう</p>
                  <p className="text-xs mt-2">曲名・アーティスト名で検索して、今日のVibeを残せます。</p>
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
                <p className="text-center text-zinc-500 py-10 text-xs font-bold">すべての投稿を読み込みました</p>
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
                    <p className="text-[11px] font-bold text-[#1DB954]">好きな音楽・ライブ履歴が近い人を表示中</p>
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
                          {mutualCount > 0 && <p className="text-[10px] text-zinc-500 mt-1">{mutualCount}人の共通の友達</p>}
                        </div>
                      </div>
                      <button onClick={() => toggleFollow(u.id)} className={`px-5 py-2 rounded-full text-[11px] font-bold transition-colors ${followedUsers.has(u.id) ? 'bg-transparent border border-zinc-700 text-zinc-400' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}>{followedUsers.has(u.id) ? 'フォロー中' : '追加'}</button>
                    </div>
                  )) : <p className="text-xs text-zinc-500 px-3 py-4 bg-[#1c1c1e]/50 rounded-2xl border border-zinc-800/50">{hasPeopleMusicFilter ? '選択したタグに合う友達候補がまだいません。' : '友達をフォローして、タイムラインを充実させましょう！'}</p>}
                </div>
                <div className="mb-10">
                  <p className="text-xs font-bold text-white mb-4 px-2">{t('similarPeople')}</p>
                  {filteredSimilarMusicUsers.length > 0 ? filteredSimilarMusicUsers.map(({ user: u, sharedReason }) => (
                    <div key={u.id} className="flex items-center justify-between py-3 px-3 hover:bg-zinc-800/30 rounded-2xl transition-colors">
                      <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => { setViewingUser(u); setActiveTab('other_profile'); }}>
                        <div className="relative">
                          <img src={u.avatar} className="w-[52px] h-[52px] rounded-full object-cover border border-zinc-800" />
                          <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-0.5 text-[10px] border border-[#1c1c1e] flex items-center justify-center w-6 h-6 shadow-lg"><IconMusicSmall /></div>
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-[15px] text-white flex items-center gap-1">{u.name} {(u as any).isVerified && <IconVerified />}</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">@{u.handle}</p>
                          <p className="text-[10px] text-[#1DB954] mt-1.5 font-bold">{sharedReason}</p>
                          <p className="text-[10px] text-zinc-500 mt-1">プロフィールを見てフォローしてみよう</p>
                        </div>
                      </div>
                      <button onClick={() => toggleFollow(u.id)} className={`px-5 py-2 rounded-full text-[11px] font-bold transition-colors ${followedUsers.has(u.id) ? 'bg-transparent border border-zinc-700 text-zinc-400' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}>{followedUsers.has(u.id) ? 'フォロー中' : 'フォロー'}</button>
                    </div>
                  )) : <p className="text-xs text-zinc-500 px-3 py-4 bg-[#1c1c1e]/50 rounded-2xl border border-zinc-800/50">{hasPeopleMusicFilter ? '選択したタグに合う音楽仲間がまだいません。' : '音楽を記録して、好みの合う人を探しましょう！'}</p>}
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
                          <p className="text-[10px] text-orange-500 mt-1.5 font-bold">総投稿数: {postCount}件</p>
                        </div>
                      </div>
                      <button onClick={() => toggleFollow(u.id)} className={`px-5 py-2 rounded-full text-[11px] font-bold transition-colors ${followedUsers.has(u.id) ? 'bg-transparent border border-zinc-700 text-zinc-400' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}>{followedUsers.has(u.id) ? 'フォロー中' : '追加'}</button>
                    </div>
                  )) : <p className="text-xs text-zinc-500 px-3 py-4 bg-[#1c1c1e]/50 rounded-2xl border border-zinc-800/50">{hasPeopleMusicFilter ? '選択したタグに合う人気アカウントがまだありません。' : '投稿が活発な公式ユーザーがここに表示されます。'}</p>}
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
                        <div key={c.id} onMouseDown={(e) => { e.preventDefault(); setActiveCommunityDetail(c); }} className="flex items-center gap-3 p-3 text-xs text-white hover:bg-zinc-700 cursor-pointer border-b border-zinc-700 last:border-0"><IconTicket /><span className="font-bold">{c.name}</span></div>
                      ))}
                    </div>
                  )}
                </div>
                <div onClick={() => setShowCommCalendar(true)} className="mb-6 relative bg-[#1c1c1e] p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-zinc-800 transition-colors shadow-sm">
                  <div className="flex items-center gap-3"><IconCalendar /><span className="text-sm font-bold text-white">{communityDateFilter ? `${communityDateFilter.replace(/-/g, '/')} の公演` : t('searchFromCalendar')}</span></div>
                  {communityDateFilter ? <button onClick={(e) => { e.stopPropagation(); setCommunityDateFilter(""); }} className="w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white"><IconCross /></button> : <IconChevronRight />}
                </div>
                {visibleArtistCommunities.length > 0 && (
                  <div className="bg-[#1c1c1e] rounded-3xl p-5 mb-8 shadow-sm">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><IconUsers /> アーティストコミュニティ</h3>
                    <div className="flex flex-col">
                      {visibleArtistCommunities.map(c => (
                        <div key={c.id} className="flex items-center justify-between py-3 border-b border-zinc-800/50 last:border-0 cursor-pointer group" onClick={() => setActiveCommunityDetail(c)}>
                          <div className="flex items-center gap-4 flex-1 overflow-hidden">
                            <div className="w-11 h-11 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0">
                              {c.artworkUrl ? <img src={c.artworkUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-500"><IconUsers /></div>}
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="font-bold text-sm text-white truncate group-hover:text-[#1DB954] transition-colors">{c.name}</p>
                              <p className="text-[10px] text-zinc-500 truncate">{c.description} • {c.memberCount}人が参加中</p>
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
                          <p className="font-bold text-sm text-white truncate group-hover:text-[#1DB954] transition-colors flex items-center gap-1.5">{c.name} {c.isVerified && <span className="text-[#1DB954] w-3.5 h-3.5 flex items-center"><IconVerified /></span>}</p>
                          <p className="text-[10px] text-zinc-500">{c.date} • {c.memberCount}人が参加中</p>
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
                    {swipeOffset > 20 && <div className="absolute top-10 left-6 z-50 border-4 border-[#1DB954] text-[#1DB954] font-black text-3xl px-4 py-1 rounded-xl transform -rotate-12 uppercase tracking-widest opacity-80">FOLLOW</div>}
                    {swipeOffset < -20 && <div className="absolute top-10 right-6 z-50 border-4 border-zinc-500 text-zinc-500 font-black text-3xl px-4 py-1 rounded-xl transform rotate-12 uppercase tracking-widest opacity-80">PASS</div>}
                    <div className="relative h-64 w-full flex-shrink-0 cursor-pointer" onClick={() => { setViewingUser(filteredMatchUsers[matchIndex]); setActiveTab('other_profile'); }}>
                      <img src={filteredMatchUsers[matchIndex].avatar} className="w-full h-full object-cover pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1e] via-transparent to-transparent pointer-events-none"></div>
                      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-1.5 border border-white/10"><IconSparkles /><span className="text-xs font-bold text-white">{getVibeMatchScore(myProfile.id, filteredMatchUsers[matchIndex].id)}% Match</span></div>
                      <div className="absolute bottom-4 left-4 right-4"><h3 className="text-2xl font-black text-white flex items-center gap-2">{filteredMatchUsers[matchIndex].name} <span className="text-xs font-bold text-zinc-400 bg-black/50 px-2 py-0.5 rounded-full">{filteredMatchUsers[matchIndex].age || ''}</span></h3><p className="text-sm text-zinc-300">@{filteredMatchUsers[matchIndex].handle}</p></div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 pb-28 scrollbar-hide pointer-events-none">
                      <p className="text-sm text-white mb-4 leading-relaxed">{filteredMatchUsers[matchIndex].bio}</p>
                      <div className="flex flex-wrap gap-2 mb-4">{(filteredMatchUsers[matchIndex].hashtags || []).map((h, i) => (<span key={`h-${i}`} className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded text-[10px]">#{getMusicTagLabel(h)}</span>))}</div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1">Top Artists</p>
                      <div className="flex flex-wrap gap-2 mb-4">{(filteredMatchUsers[matchIndex].topArtists || []).map((a, i) => (<span key={i} className="px-3 py-1.5 bg-[#1DB954]/10 text-[#1DB954] rounded-full text-xs font-bold flex items-center"><IconMusicSmall /> {a}</span>))}</div>
                    </div>
                    <div className="absolute bottom-6 left-0 w-full flex justify-center gap-4 px-6 bg-gradient-to-t from-[#1c1c1e] pt-6 z-40">
                      <button onClick={() => setMatchIndex(prev => prev + 1)} className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:bg-zinc-700 transition-colors shadow-lg flex-shrink-0"><IconCross /></button>
                      <button onClick={() => handleSwipeFollow(filteredMatchUsers[matchIndex].id, filteredMatchUsers[matchIndex].name)} className="flex-1 h-14 bg-[#1DB954] text-black rounded-full flex items-center justify-center font-bold text-sm hover:scale-105 transition-transform shadow-lg gap-2"><IconUserPlus /> フォロー</button>
                    </div>
                  </div>
                ) : <div className="text-center mt-20"><IconSearch /><p className="font-bold mt-4">ユーザーが見つかりません</p></div>}
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
              if(window.confirm("この下書きを削除しますか？")) {
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
                showToast("URLをクリップボードにコピーしました。");
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
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-zinc-800 flex-shrink-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePlay(recSong.previewUrl); }}>
                        <img src={recSong.artworkUrl100} className={`w-full h-full object-cover ${playingSong === recSong.previewUrl ? 'opacity-50' : 'group-hover:opacity-70'} transition-opacity`} />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          {playingSong === recSong.previewUrl ? <IconStop /> : <IconPlay />}
                        </div>
                      </div>
                      <div className="flex-1 overflow-hidden pointer-events-none">
                        <p className="font-bold text-sm text-white truncate">{recSong.trackName}</p>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5">{recSong.artistName}</p>
                      </div>
                      <button className="w-8 h-8 rounded-full bg-zinc-800 text-[#1DB954] flex items-center justify-center pointer-events-auto hover:scale-110 transition-transform">
                        <IconPlus />
                      </button>
                    </div>
                  )) : (
                    <div className="py-6 text-center text-zinc-500 text-xs font-bold animate-pulse">{t('aiAnalyzing')}</div>
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
              follow: t('follow'),
              block: t('block'),
              report: t('report'),
              favoriteArtists: t('favoriteArtists'),
              editProfileFull: t('editProfileFull'),
              myEchoes: t('myEchoes'),
              likedPosts: t('likedPosts'),
            }}
            likedPostsContent={likedVibes.length === 0 ? <p className="text-center text-zinc-500 py-10 text-xs">まだ{t('likedPosts')}はありません</p> : likedVibes.map(renderFeedCard)}
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
      >
          {showHeadingMenu && (
            <div className="absolute inset-0 z-50 flex flex-col justify-end animate-fade-in">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHeadingMenu(false)}></div>
              <div className="bg-[#1c1c1e] rounded-t-[32px] w-full pb-10 pt-4 px-4 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setShowHeadingMenu(false)}></div>
                <div className="flex justify-between items-center mb-6 px-2">
                  <div className="w-8"></div>
                  <h3 className="text-[15px] font-bold text-white">見出し</h3>
                  <button onClick={() => setShowHeadingMenu(false)} className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"><IconCross /></button>
                </div>
                <div className="flex flex-col gap-2">
                  <button onMouseDown={e => { e.preventDefault(); document.execCommand('formatBlock', false, 'DIV'); setShowHeadingMenu(false); }} className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl transition-colors">
                    <span className="text-sm font-bold text-white">指定なし（標準テキスト）</span>
                  </button>
                  <button onMouseDown={e => { e.preventDefault(); document.execCommand('formatBlock', false, 'H2'); setShowHeadingMenu(false); }} className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl transition-colors">
                    <span className="text-xl font-black text-white">大見出し (H2)</span>
                  </button>
                  <button onMouseDown={e => { e.preventDefault(); document.execCommand('formatBlock', false, 'H3'); setShowHeadingMenu(false); }} className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl transition-colors">
                    <span className="text-lg font-bold text-white">小見出し (H3)</span>
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
                  <h3 className="text-[15px] font-bold text-white">文字の配置</h3>
                  <button onClick={() => setShowAlignmentMenu(false)} className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"><IconCross /></button>
                </div>
                <div className="flex flex-col gap-2">
                  <button onMouseDown={e => { e.preventDefault(); document.execCommand('justifyLeft', false, ''); setShowAlignmentMenu(false); }} className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl transition-colors">
                    <span className="text-sm font-bold text-white flex items-center gap-3"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="15" y2="12"></line><line x1="3" y1="18" x2="19" y2="18"></line></svg> 左寄せ</span>
                  </button>
                  <button onMouseDown={e => { e.preventDefault(); document.execCommand('justifyCenter', false, ''); setShowAlignmentMenu(false); }} className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl transition-colors">
                    <span className="text-sm font-bold text-white flex items-center gap-3"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="5" y1="18" x2="19" y2="18"></line></svg> 中央寄せ</span>
                  </button>
                  <button onMouseDown={e => { e.preventDefault(); document.execCommand('justifyRight', false, ''); setShowAlignmentMenu(false); }} className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl transition-colors">
                    <span className="text-sm font-bold text-white flex items-center gap-3"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="9" y1="12" x2="21" y2="12"></line><line x1="5" y1="18" x2="21" y2="18"></line></svg> 右寄せ</span>
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
                  <h3 className="text-[15px] font-bold text-white">リスト（箇条書き）</h3>
                  <button onClick={() => setShowListMenu(false)} className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"><IconCross /></button>
                </div>
                <div className="flex flex-col gap-2">
                  <button onMouseDown={e => { e.preventDefault(); if (articleTextareaRef.current) { articleTextareaRef.current.focus(); document.execCommand('insertUnorderedList', false, ''); setNewArticleContent(articleTextareaRef.current.innerHTML); } setShowListMenu(false); }} className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl transition-colors">
                    <span className="text-sm font-bold text-white flex items-center gap-3"><IconList /> 箇条書きリスト (・)</span>
                  </button>
                  <button onMouseDown={e => { e.preventDefault(); if (articleTextareaRef.current) { articleTextareaRef.current.focus(); document.execCommand('insertOrderedList', false, ''); setNewArticleContent(articleTextareaRef.current.innerHTML); } setShowListMenu(false); }} className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl transition-colors">
                    <span className="text-sm font-bold text-white flex items-center gap-3">
                      <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path></svg>
                      番号付きリスト (1. 2. 3.)
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
                  <h3 className="text-[15px] font-bold text-white">要素の追加</h3>
                  <button onClick={() => setShowElementMenu(false)} className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"><IconCross /></button>
                </div>
                <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                  <label className="flex flex-col items-center gap-2 cursor-pointer group relative">
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconImage /></div>
                    <span className="text-[10px] text-zinc-300 font-bold">画像</span>
                    <input type="file" accept="image/*" onChange={handleArticleBodyImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </label>
                  <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={handleEmbedLink}>
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconLink /></div>
                    <span className="text-[10px] text-zinc-300 font-bold">埋め込み</span>
                  </div>
                  <label className="flex flex-col items-center gap-2 cursor-pointer group relative">
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconFile /></div>
                    <span className="text-[10px] text-zinc-300 font-bold">ファイル</span>
                    <input type="file" onChange={handleArticleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </label>
                  <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => { showToast("目次を生成します"); setShowElementMenu(false); }}>
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors">
                      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                    </div>
                    <span className="text-[10px] text-zinc-300 font-bold">目次</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 cursor-pointer group" onMouseDown={e => { e.preventDefault(); if (articleTextareaRef.current) { articleTextareaRef.current.focus(); document.execCommand('insertHTML', false, '<br/><blockquote style="border-left: 4px solid #52525b; padding: 16px; margin: 16px 0; background: #27272a; border-radius: 8px;"><div class="quote-text" style="color: #e4e4e7;"></div><div class="quote-source" style="text-align: right; font-size: 10px; color: #a1a1aa; margin-top: 12px; font-style: normal;"></div></blockquote><br/><p><br/></p>'); setNewArticleContent(articleTextareaRef.current.innerHTML); } setShowElementMenu(false); }}>
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconQuote /></div>
                    <span className="text-[10px] text-zinc-300 font-bold">引用</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 cursor-pointer group" onMouseDown={e => { e.preventDefault(); document.execCommand('insertHTML', false, '<br/><pre style="background:#27272a;padding:16px;border-radius:12px;overflow-x:auto;color:#e4e4e7;font-family:monospace;border:1px solid #52525b;"><code>ここからコードを入力...</code></pre><br/>'); setShowElementMenu(false); }}>
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconCode /></div>
                    <span className="text-[10px] text-zinc-300 font-bold">コード</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 cursor-pointer group" onMouseDown={e => { e.preventDefault(); document.execCommand('insertHorizontalRule', false, ''); setShowElementMenu(false); }}>
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconMinus /></div>
                    <span className="text-[10px] text-zinc-300 font-bold">区切り線</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 cursor-pointer group" onMouseDown={e => { e.preventDefault(); document.execCommand('insertHTML', false, '<br/><div contenteditable="false"><hr style="border-top:2px dashed #1DB954;margin:32px 0;"/><p style="text-align:center;color:#1DB954;font-weight:bold;font-size:12px;letter-spacing:0.1em;margin-bottom:32px;">ここから先は有料エリアです</p></div><br/>'); setShowElementMenu(false); }}>
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconYen /></div>
                    <span className="text-[10px] text-zinc-300 font-bold">有料エリア</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => { setShowPastArticleModal(true); setShowElementMenu(false); }}>
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconArticle /></div>
                    <span className="text-[10px] text-zinc-300 font-bold">記事を挿入</span>
                  </div>
                  <label className="flex flex-col items-center gap-2 cursor-pointer group relative">
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconHeadphones /></div>
                    <span className="text-[10px] text-zinc-300 font-bold">音声ファイル</span>
                    <input type="file" accept="audio/*" onChange={handleArticleAudioUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </label>
                  <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => { setShowEditorVoiceMenu(true); setShowElementMenu(false); }}>
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:bg-zinc-800 transition-colors"><IconMic /></div>
                    <span className="text-[10px] text-zinc-300 font-bold">録音</span>
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
                    <p className="text-zinc-400 text-sm font-bold mb-8">ボタンをタップして録音してください</p>
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
                <h3 className="text-lg font-bold text-white mb-2">下書きを保存しました。</h3>
                <p className="text-xs text-zinc-400 mb-6 leading-relaxed">読み直すと新たな発見があるかも？</p>
                <div className="flex gap-3 w-full">
                  <button onClick={() => setShowDraftSaveDialog(false)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-colors">編集を続ける</button>
                  <button onClick={() => { setShowDraftSaveDialog(false); setShowWriteArticleModal(false); }} className="flex-1 py-3 bg-white hover:bg-gray-200 text-black rounded-xl text-xs font-bold transition-colors">閉じる</button>
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
                  <h3 className="text-[15px] font-bold text-white">記事を挿入</h3>
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
                      <p className="text-xs font-bold mt-2">過去の記事がありません</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
      </ArticleEditorModal>
      {showPublishSettingsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowPublishSettingsModal(false)}>
          <div className="bg-[#1c1c1e] border border-zinc-800 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-zinc-800/50">
              <h3 className="font-bold text-lg text-white">公開設定</h3>
              <button onClick={() => setShowPublishSettingsModal(false)} className="w-8 h-8 bg-zinc-800/50 hover:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 transition-colors">
                <IconCross />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-6">
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">プレビュー</p>
                <div className="bg-black rounded-2xl border border-zinc-800 overflow-hidden">
                  <img src={newArticleCover || '/default-bg.jpg'} className="w-full h-32 object-cover" />
                  <div className="p-4">
                    <p className="font-bold text-base text-white truncate">{newArticleTitle || "無題の記事"}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <img src={myProfile.avatar} className="w-5 h-5 rounded-full object-cover border border-zinc-700" />
                      <span className="text-xs text-zinc-400">{myProfile.name}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-black rounded-2xl border border-zinc-800 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1DB954]/10 flex items-center justify-center text-[#1DB954]">
                      <IconYen />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">有料記事として公開</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">※本文に有料エリアの区切り線が必要です</p>
                    </div>
                  </div>
                  <button onClick={() => setIsArticlePremium(!isArticlePremium)} className={`w-12 h-6 rounded-full p-1 transition-colors relative ${isArticlePremium ? 'bg-[#1DB954]' : 'bg-zinc-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isArticlePremium ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>
                {isArticlePremium && (
                  <div className="mt-4 pt-4 border-t border-zinc-800 animate-fade-in flex items-center justify-between">
                    <p className="text-sm font-bold text-zinc-300">販売価格</p>
                    <div className="flex items-center gap-2">
                      <input type="number" min="1" value={articlePriceInput} onChange={(e) => setArticlePriceInput(parseInt(e.target.value) || 0)} className="w-24 bg-[#1c1c1e] border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white text-right focus:outline-none focus:border-[#1DB954]" />
                      <span className="font-bold text-zinc-400">コイン</span>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={handlePostArticle} disabled={isPosting} className="w-full py-4 bg-[#1DB954] text-black rounded-xl text-sm font-bold shadow-lg hover:scale-[1.02] transition-transform disabled:opacity-50 mt-2">
                {isPosting ? "投稿中..." : "この記事を投稿する"}
              </button>
            </div>
          </div>
        </div>
      )}
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
              <h3 className="font-bold text-[15px] text-white tracking-wide">{selectedChargePlan ? '決済の確認' : 'コインチャージ'}</h3>
              <div className="w-10"></div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col bg-[#121212]">
              {!selectedChargePlan ? (
                <div className="animate-fade-in flex flex-col">
                  {/* 保有コイン表示 */}
                  <div className="flex flex-col items-center justify-center py-4 bg-[#1c1c1e] border-b border-zinc-800 shrink-0 w-full gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 text-sm font-bold">保有</span>
                      <div className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center text-black shadow-sm">
                        <span className="text-[12px] font-black leading-none mt-[1px]">C</span>
                      </div>
                      <span className="text-xl font-black text-white">{(Number((myProfile as any).free_coin) || 0) + (Number((myProfile as any).paid_coin) || 0)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-500">
                      <span>有償 {Number((myProfile as any).paid_coin) || 0} C</span>
                      <span>無償 {Number((myProfile as any).free_coin) || 0} C</span>
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
                          {plan.bonus && (
                            <span className="text-zinc-400 text-[11px] font-medium mt-1 ml-[30px] tracking-wide">{plan.bonus}</span>
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
                    <p className="text-zinc-400 text-sm font-bold">決済金額: ¥{selectedChargePlan.price.toLocaleString()}</p>
                  </div>
                  <div className="bg-[#1c1c1e] border border-zinc-800 rounded-2xl p-5 mb-auto shadow-inner">
                    <div className="flex items-start gap-3">
                      <div className="text-zinc-500 mt-0.5"><IconLock /></div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed text-left">
                        安全な決済システム（Stripe）へ移動します。クレジットカード情報は暗号化され、当アプリには一切保存されません。
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleChargeCoins()} 
                    disabled={isCharging} 
                    className="w-full py-4 mt-8 bg-white text-black rounded-full text-[15px] font-black shadow-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 active:scale-95"
                  >
                    {isCharging ? (
                      <span className="flex items-center gap-2"><div className="w-5 h-5 border-[3px] border-black border-t-transparent rounded-full animate-spin"></div>接続中...</span>
                    ) : (
                      <>決済画面へ進む <IconChevronRight /></>
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
        />
      )}
      {/* 💡 コンポーネント化したミニプレイヤー */}
      <MiniPlayer 
        activeTrackInfo={activeTrackInfo} 
        playingSong={playingSong} 
        togglePlay={togglePlay} 
        spotifyAccessToken={spotifyAccessToken}
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
