"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Comment, Song, FavoriteArtist, Notification, ChatMessage, ChatGroup, LiveCommunity } from './types';
import { IconHeart, IconComment, IconLock, IconPlay, IconStop, IconChevronLeft, IconChevronRight, IconChevronDown, IconSearch, IconShareBox, IconVerified, IconCross, IconGear, IconTrend, IconSparkles, IconMusic, IconMusicSmall, IconBell, IconGlobe, IconClock, IconShareExternal, IconStar, IconInfo, IconHelp, IconLockSetting, IconCamera, IconShuffle, IconDots, IconFlame, IconRewind, IconCheck, IconWarning, IconMatchTab, IconChatTab, IconSend, IconUserPlus, IconUser, IconMessagePlus, IconFilter, IconTicket, IconCrown, IconUsers, IconCalendar } from './Icons';
import { supabase } from './supabase';

const IconPlus = () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IconPin = () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>;
const IconImage = () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;
const IconMic = () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>;
const IconFile = () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>;
const getVibeMatchScore = (id1: string, id2: string) => { 
  const hash = (id1 + id2).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0); 
  return 60 + (hash % 39); 
};
const formatCount = (n?: number) => (n == null) ? "0" : n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : n.toString();
const displayLocalTime = (ts: number, tz: string) => { 
  try { return new Intl.DateTimeFormat('en-US',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:tz}).format(new Date(ts)); } 
  catch(e) { return new Date(ts).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}); } 
};
const calculateStreak = (vibes: Song[]) => { 
  if(!vibes.length) return 0; 
  const today = new Date(); today.setHours(0,0,0,0); const current = today.getTime(); 
  const dates = vibes.map(v => { const d = new Date(v.timestamp); d.setHours(0,0,0,0); return d.getTime(); }); 
  const unique = [...new Set(dates)].sort((a,b)=>b-a); 
  if(!unique.includes(current) && !unique.includes(current-864e5)) return 0; 
  let s = 0, c = unique.includes(current) ? current : current-864e5; 
  for(const d of unique){ if(d===c){ s++; c-=864e5; } else break; } 
  return s; 
};

// 💡 外部ライブラリ不要：画像アップロード前にブラウザ側で自動圧縮する最強の関数
const compressImage = async (file: File, maxWidth = 800, quality = 0.7): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        // 最大幅(800px)を超えていたら縮小する
        if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // JPEG形式で圧縮（quality: 0.7）
        canvas.toBlob((blob) => {
          if (blob) { resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpeg"), { type: "image/jpeg", lastModified: Date.now() })); } 
          else { reject(new Error("圧縮に失敗しました")); }
        }, "image/jpeg", quality);
      };
    };
    reader.onerror = error => reject(error);
  });
};

const localI18n: Record<string, any> = {
  "日本語": { feed: "フィード", discover: "見つける", match: "マッチ", diary: "ダイアリー", chat: "チャット", profile: "プロフィール", searchPlaceholder: "楽曲やアーティストを検索...", settings: "設定", cancel: "キャンセル", postVibe: "記録する", audio: "オーディオプレビュー", notifications: "通知", privateAcc: "プライベートアカウント", timezone: "タイムゾーン", language: "言語設定", logout: "ログアウト", features: "機能", appInfo: "このアプリについて", shareApp: "Echoesをシェア", rateApp: "Echoesを評価する", help: "ヘルプ", editProfile: "プロフィールを編集", artist: "アーティスト", topResults: "トップの結果", allSongs: "すべての楽曲", latestRelease: "最新の楽曲", popularSongs: "人気の楽曲", popularAlbums: "人気のアルバム", followers: "フォロワー", rewind: "Echoes Rewind", overwriteVibe: "上書きして記録", alreadyPostedWarning: "今日はすでに記録済みです。新しく記録すると上書きされます。", favoriteArtists: "お気に入りアーティスト", postSuccess: "記録が完了しました！", sendMessage: "メッセージを送る", typeMessage: "メッセージを入力...", vibeMatchAnalysis: "Vibe 分析", topSharedArtists: "共通のトップアーティスト", sharedGenres: "共通のジャンル", noPreview: "プレビュー音源がありません", pass: "スキップ", connect: "気になる", friendsChat: "フレンド", matchesChat: "マッチ", groupsChat: "グループ", communityChat: "コミュニティ", liveHistory: "ライブ参戦履歴", hashtags: "ハッシュタグ" },
  "English": { feed: "Feed", discover: "Discover", match: "Match", diary: "Diary", chat: "Chat", profile: "Profile", searchPlaceholder: "Search music or artists...", settings: "Settings", cancel: "Cancel", postVibe: "Record", audio: "Audio Preview", notifications: "Notifications", privateAcc: "Private Account", timezone: "Time Zone", language: "Language", logout: "Log Out", features: "Features", appInfo: "About App", shareApp: "Share", rateApp: "Rate", help: "Help", editProfile: "Edit Profile", artist: "Artist", topResults: "Top Results", allSongs: "All Songs", latestRelease: "Latest Release", popularSongs: "Popular Songs", popularAlbums: "Popular Albums", followers: "Followers", rewind: "Echoes Rewind", overwriteVibe: "Overwrite", alreadyPostedWarning: "Already posted today.", favoriteArtists: "Favorite Artists", postSuccess: "Vibe recorded!", sendMessage: "Message", typeMessage: "Type...", vibeMatchAnalysis: "Vibe Analysis", topSharedArtists: "Top Shared Artists", sharedGenres: "Shared Genres", noPreview: "No preview available.", pass: "Skip", connect: "Interested", friendsChat: "Friends", matchesChat: "Matches", groupsChat: "Groups", communityChat: "Community", liveHistory: "Live History", hashtags: "Hashtags" },
  "中文": { feed: "动态", discover: "发现", match: "匹配", diary: "日记", chat: "聊天", profile: "我的", searchPlaceholder: "搜索音乐或歌手...", settings: "设置", cancel: "取消", postVibe: "记录", audio: "音频预览", notifications: "通知", privateAcc: "私密账户", timezone: "时区", language: "语言", logout: "登出", features: "功能", appInfo: "关于应用", shareApp: "分享", rateApp: "评价", help: "帮助", editProfile: "编辑资料", artist: "歌手", topResults: "最佳结果", allSongs: "所有歌曲", latestRelease: "最新发布", popularSongs: "热门歌曲", popularAlbums: "热门专辑", followers: "粉丝", rewind: "Echoes 回顾", overwriteVibe: "覆盖记录", alreadyPostedWarning: "今天已经记录过了。", favoriteArtists: "喜欢的歌手", postSuccess: "记录成功！", sendMessage: "发消息", typeMessage: "输入消息...", vibeMatchAnalysis: "Vibe 分析", topSharedArtists: "共同喜欢的歌手", sharedGenres: "共同类型", noPreview: "无试听", pass: "跳过", connect: "感兴趣", friendsChat: "好友", matchesChat: "匹配", groupsChat: "群组", communityChat: "社区", liveHistory: "参战历史", hashtags: "标签" }
};

const initialMockUsers: User[] = [
  { id: "u1", handle: "anzuuumo", name: "杏夏", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80", bio: "Alternative & Indie", followers: 4200, following: 50, isPrivate: false, category: 'suggested', mutualText: "16人の共通の友達", topArtists: ["Tele", "Vaundy", "King Gnu"], hashtags: ["邦ロック好きな人と繋がりたい", "Tele"], liveHistory: ["VIVA LA ROCK 2026", "Tele ツアー2026 - 東京Zepp公演"], age: 22, gender: "female" },
  { id: "u2", handle: "ayk_21", name: "あやか", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80", bio: "チルい曲好き。", followers: 89, following: 120, isPrivate: true, category: 'similar', mutualText: "13人の共通の友達", similarMusic: "藤井風、ヨルシカを聴いています", topArtists: ["藤井風", "ヨルシカ"], hashtags: ["チルい曲", "深夜の音楽"], liveHistory: ["藤井風 日産スタジアム"], age: 21, gender: "female" },
  { id: "u3", handle: "kuma479", name: "くま", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80", bio: "Western music lover", followers: 200, following: 180, isPrivate: false, category: 'suggested', mutualText: "12人の共通の友達", topArtists: ["Taylor Swift", "The 1975"], hashtags: ["洋楽", "Swiftie"], liveHistory: ["Taylor Swift Tokyo Dome"], age: 24, gender: "male" },
  { id: "s1", handle: "rock_boy99", name: "Ken", avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80", bio: "マカロニえんぴつ好き", followers: 150, following: 200, isPrivate: false, category: 'similar', similarMusic: "Vaundy、Saucy Dogを聴いています", topArtists: ["マカロニえんぴつ", "Saucy Dog"], hashtags: ["マカえん", "邦ロック"], liveHistory: ["マカロニえんぴつ アリーナツアー"], age: 20, gender: "male" },
  { id: "f1", handle: "tenshinisreal", name: "那須川天心", avatar: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80", bio: "Fighter", followers: 100000, following: 15, isPrivate: false, category: 'famous', mutualText: "10万人にフォローされています", age: 27, gender: "male" },
];

const expandedMockCommunities: LiveCommunity[] = [
  { id: "com1", name: "[5/3] VIVA LA ROCK 2026 - さいたまスーパーアリーナ", date: "2026-05-03", memberCount: 142, isJoined: false },
  { id: "com2", name: "[5/4] VIVA LA ROCK 2026 - さいたまスーパーアリーナ", date: "2026-05-04", memberCount: 189, isJoined: false },
  { id: "com3", name: "[6/10] Tele ツアー2026 - 東京Zepp公演", date: "2026-06-10", memberCount: 89, isJoined: false },
  { id: "com4", name: "[6/15] Tele ツアー2026 - 仙台サンプラザ公演", date: "2026-06-15", memberCount: 45, isJoined: false },
  { id: "com5", name: "[4/4] THE MUSIC STADIUM 2026 - 国立競技場", date: "2026-04-04", memberCount: 520, isJoined: false }
];

export default function Home() {
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
  const [timeZone, setTimeZone] = useState("Asia/Tokyo");
  const [language, setLanguage] = useState("日本語");
  const t = (k: string) => localI18n[language]?.[k] || localI18n["日本語"][k];

  const [toastMsg, setToastMsg] = useState<{text: string, type: 'success'|'error'} | null>(null);
  const showToast = (text: string, type: 'success'|'error' = 'success') => { setToastMsg({text, type}); setTimeout(() => setToastMsg(null), 3000); };

  const [activeTab, setActiveTab] = useState<'home'|'search'|'match'|'calendar'|'chat'|'profile'|'other_profile'>('home');
  const [discoverTabMode, setDiscoverTabMode] = useState<'users' | 'communities'>('users');
  const [chatTabMode, setChatTabMode] = useState<'friends' | 'matches' | 'groups' | 'community'>('friends');
  const [profileTabMode, setProfileTabMode] = useState<'my_vibes' | 'liked'>('my_vibes');
  const [homeFeedMode, setHomeFeedMode] = useState<'all' | 'following'>('all');
  // 💡 プロフィール画面を開いた時に「どこから来たか」を記憶する箱
  // --- プロフィール管理 ---
  const mockUsers = initialMockUsers;

  const [allProfiles, setAllProfiles] = useState<User[]>([]);
  useEffect(() => {
    const fetchAllProfiles = async () => {
      const { data } = await supabase.from('profiles').select('*');
      if (data) setAllProfiles(data as User[]);
    };
    fetchAllProfiles();
  }, []);

const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set()); // 💡 ブロックしたユーザーを記憶する箱
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false); // 💡 退会確認モーダル用の箱
  const [myFollowers, setMyFollowers] = useState<Set<string>>(new Set()); 
  const [myProfile, setMyProfile] = useState<User>({ 
    id: "me", handle: "guest", name: "ゲスト", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80", 
    bio: "よろしくお願いします！", followers: 0, following: 0, isPrivate: false, category: 'suggested', 
    hashtags: [], liveHistory: [], age: 20, gender: "other" 
  });

  const [vibes, setVibes] = useState<Song[]>([]);
  const [communityVibes, setCommunityVibes] = useState<Song[]>([]);
  
  const allFeedVibes = useMemo(() => {
    // 💡 ブロックしたユーザーの投稿を完全に除外する
    let list = [...vibes, ...communityVibes].filter(v => !blockedUsers.has(v.user.id)); 
    if (homeFeedMode === 'following') {
      list = list.filter(v => followedUsers.has(v.user.id) || v.user.id === currentUser?.id || v.user.id === 'me');
    }
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [vibes, communityVibes, homeFeedMode, followedUsers, currentUser, blockedUsers]);
  const likedVibes = useMemo(() => allFeedVibes.filter(v => v.isLiked), [allFeedVibes]);
  const myStreak = calculateStreak(vibes);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchArtistInfo, setSearchArtistInfo] = useState<any>(null);
  const [trendingSongs, setTrendingSongs] = useState<any[]>([]);
  
  const [draftSong, setDraftSong] = useState<any>(null);
  const [draftCaption, setDraftCaption] = useState("");
  const [showPostOverrideConfirm, setShowPostOverrideConfirm] = useState<Song|null>(null);
  const [isPosting, setIsPosting] = useState(false); // 💡 二重投稿防止（連打ロック）用の箱
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
    artistSongs.forEach(s => { if(s.collectionId && s.trackCount > 3 && !seen.has(s.collectionId)) { seen.add(s.collectionId); arr.push(s); } });
    return arr;
  }, [artistSongs]);

  const latestReleaseSong = useMemo(() => {
    if (!artistSongs || artistSongs.length === 0) return null;
    return [...artistSongs].sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())[0];
  }, [artistSongs]);

  const [playingSong, setPlayingSong] = useState<string|null>(null);
  const audioRef = useRef<HTMLAudioElement|null>(null);

  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchFocused, setUserSearchFocused] = useState(false);
  const [viewingUser, setViewingUser] = useState<User|null>(null);
  
  const [communitySearchQuery, setCommunitySearchQuery] = useState("");
  const [communitySearchFocused, setCommunitySearchFocused] = useState(false);
  const [communityDateFilter, setCommunityDateFilter] = useState("");
  const [activeCommunityDetail, setActiveCommunityDetail] = useState<LiveCommunity|null>(null);
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
  const [commCalDate, setCommCalDate] = useState(new Date(2026, 6, 1));
  const [selectedModalDate, setSelectedModalDate] = useState<string | null>(null); // カレンダー内でタップした日付を記憶
  const [showCommDrumroll, setShowCommDrumroll] = useState(false); // ドラムロールを開く箱
  const [realCommunities, setRealCommunities] = useState<LiveCommunity[]>([]);

  useEffect(() => {
    const fetchLiveSchedules = async () => {
      try {
        const apiKey = 'CA2xZbJZEACggNLZZA7ijy8FPvee4Kyo';
        const today = new Date();
        const nextYear = new Date(today.setFullYear(today.getFullYear() + 1));
        const startDateTime = new Date().toISOString().split('.')[0] + 'Z';
        const endDateTime = nextYear.toISOString().split('.')[0] + 'Z';
        
        const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?classificationName=music&countryCode=JP&size=200&startDateTime=${startDateTime}&endDateTime=${endDateTime}&sort=date,asc&apikey=${apiKey}`);
        const data = await res.json();
        
       if (data._embedded && data._embedded.events && data._embedded.events.length > 0) {
          const liveData: LiveCommunity[] = data._embedded.events.map((event: any) => ({
            id: event.id,
            name: event.name,
            date: event.dates?.start?.localDate || "日程未定",
            memberCount: 0,
            isJoined: false,
            isVerified: true, 
            reportedBy: [] // 💡 ここを修正
          }));
          setRealCommunities(liveData);
        } else {
          const fallbackData: LiveCommunity[] = [
            { id: "fb1", name: "ROCK IN JAPAN FESTIVAL 2026", date: "2026-08-01", memberCount: 0, isJoined: false, isVerified: true, reportedBy: [] },
            { id: "fb2", name: "ROCK IN JAPAN FESTIVAL 2026", date: "2026-08-02", memberCount: 0, isJoined: false, isVerified: true, reportedBy: [] },
            { id: "fb3", name: "SUMMER SONIC 2026 TOKYO", date: "2026-08-15", memberCount: 0, isJoined: false, isVerified: true, reportedBy: [] },
            { id: "fb4", name: "SUMMER SONIC 2026 OSAKA", date: "2026-08-16", memberCount: 0, isJoined: false, isVerified: true, reportedBy: [] },
            { id: "fb5", name: "SWEET LOVE SHOWER 2026", date: "2026-08-29", memberCount: 0, isJoined: false, isVerified: true, reportedBy: [] },
            { id: "fb6", name: "Vaundy one man live ARENA tour 2026", date: "2026-09-10", memberCount: 0, isJoined: false, isVerified: true, reportedBy: [] },
            { id: "fb7", name: "King Gnu Live Tour 2026", date: "2026-10-05", memberCount: 0, isJoined: false, isVerified: true, reportedBy: [] },
            { id: "fb8", name: "COUNTDOWN JAPAN 26/27", date: "2026-12-28", memberCount: 0, isJoined: false, isVerified: true, reportedBy: [] }
          ];
          setRealCommunities(fallbackData);
        }
      } catch (e) {
        console.error("ライブ情報の取得に失敗しました:", e);
      }
    };
    fetchLiveSchedules();
  }, []);

  

  const [matchIndex, setMatchIndex] = useState(0);
  const [matchedUsers, setMatchedUsers] = useState<Set<string>>(new Set());
  const [showMatchFilterModal, setShowMatchFilterModal] = useState(false);
  const [matchFilter, setMatchFilter] = useState({ artists: [] as any[], hashtags: [] as string[], liveHistories: [] as string[], ageMin: 18, ageMax: 100, gender: "All" });
  const [filterArtistInput, setFilterArtistInput] = useState("");
  const [filterArtistSuggestions, setFilterArtistSuggestions] = useState<any[]>([]);
  const [filterHashtagInput, setFilterHashtagInput] = useState("");
  const [showMatchMessageModal, setShowMatchMessageModal] = useState<string|null>(null);
  const [matchMessageInput, setMatchMessageInput] = useState("");

  const filteredMatchUsers = useMemo(() => {
    return allProfiles.filter(u => {
      // 💡 自分自身と、ブロックしたユーザーはマッチ画面に出さない
      if (u.id === currentUser?.id || blockedUsers.has(u.id)) return false; 
      if (matchFilter.artists.length > 0 && !matchFilter.artists.some(fa => u.topArtists?.map((x:any)=>x.toLowerCase())?.includes(fa.artistName.toLowerCase()))) return false;
      if (matchFilter.hashtags.length > 0 && !matchFilter.hashtags.some(fh => u.hashtags?.map((x:any)=>x.toLowerCase())?.includes(fh.toLowerCase()))) return false;
      if (matchFilter.liveHistories.length > 0 && !matchFilter.liveHistories.some(fl => u.liveHistory?.map((x:any)=>x.toLowerCase())?.includes(fl.toLowerCase()))) return false;
      if (u.age && (u.age < matchFilter.ageMin || u.age > matchFilter.ageMax)) return false;
      if (matchFilter.gender !== "All" && u.gender !== matchFilter.gender.toLowerCase()) return false;
      return true;
    });
  }, [matchFilter, allProfiles, currentUser, blockedUsers]);

  const [activeChatUserId, setActiveChatUserId] = useState<string|null>(null);
  const [chatMessageInput, setChatMessageInput] = useState("");
 const [showChatPlusMenu, setShowChatPlusMenu] = useState(false);
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
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([{ id: "g1", name: "ROCK IN JAPAN 参戦組", memberIds: ["u1", "u4"], avatar: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80" }]);
  const [chatCommunities, setChatCommunities] = useState<LiveCommunity[]>([]);

  const suggestedCommunities = useMemo(() => {
// // 💡 3人以上の異なるユーザーから通報されたものは、一般リストから「検疫（非表示）」にする
    let f = [...realCommunities].filter(c => (c.reportedBy?.length || 0) < 3);
    // 💡 自分がコミュニティに参加しているかどうかを判定し、リアルタイムで人数に+1する
    f = f.map(c => ({
      ...c,
      memberCount: c.memberCount + (chatCommunities.some(chat => chat.id === c.id) ? 1 : 0)
    }));

    if (communitySearchQuery.trim()) f = f.filter(c => c.name.toLowerCase().includes(communitySearchQuery.toLowerCase()));
    if (communityDateFilter) f = f.filter(c => c.date.startsWith(communityDateFilter));
    return f;
  }, [communitySearchQuery, communityDateFilter, realCommunities, chatCommunities]);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState<Set<string>>(new Set());
  
  const [showChatDetails, setShowChatDetails] = useState<boolean>(false);
  const [chatDetailsTab, setChatDetailsTab] = useState<'members' | 'album' | 'notes'>('members');

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showDrumrollModal, setShowDrumrollModal] = useState(false);
  const [selectedCalendarPopupVibe, setSelectedCalendarPopupVibe] = useState<Song|null>(null);
  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth() + 1;
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false); // 💡 運営ダッシュボード用の箱
  const [showVibeMatchDetails, setShowVibeMatchDetails] = useState(false);
  const [showAppInfoModal, setShowAppInfoModal] = useState<{title: string, content: string} | null>(null);
  const [showUserListModal, setShowUserListModal] = useState<'FOLLOWERS' | 'FOLLOWING' | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState("");

  const [editName, setEditName] = useState(myProfile.name);
  const [editHandle, setEditHandle] = useState(myProfile.handle);
  const [editBio, setEditBio] = useState(myProfile.bio);
  const [editIsPrivate, setEditIsPrivate] = useState(myProfile.isPrivate);
  const [editAvatar, setEditAvatar] = useState(myProfile.avatar);
  const [editHashtags, setEditHashtags] = useState(myProfile.hashtags?.join(', ') || "");
  const [editLiveHistory, setEditLiveHistory] = useState(myProfile.liveHistory?.join(', ') || "");

  // 💡 他のユーザーのフォロー数をリアルタイム取得する
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

  // 💡 編集画面を開く時に、確実に「最新の自分のデータ」をセットする
  const openEditProfile = () => {
    setEditName(myProfile.name);
    setEditHandle(myProfile.handle);
    setEditBio(myProfile.bio || "");
    setEditAvatar(myProfile.avatar);
    setEditHashtags(myProfile.hashtags?.join(', ') || "");
    setEditLiveHistory(myProfile.liveHistory?.join(', ') || "");
    setEditIsPrivate(myProfile.isPrivate);
    setIsEditingProfile(true);
  };

  const [activeCommentSongId, setActiveCommentSongId] = useState<string|null>(null);
  const [commentInput, setCommentInput] = useState("");
const profileBackTarget = { tab: 'search', chatUserId: null }; // 💡 読み込み用のダミー箱
  const setProfileBackTarget = (data?: any) => {}; // 💡 書き込み用のダミー

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

  useEffect(() => {
    if (!skipHistoryRef.current) {
      const prev = prevStateRef.current;
      if (prev.tab !== currentScreenState.tab || prev.user?.id !== currentScreenState.user?.id || prev.chatId !== currentScreenState.chatId || prev.artist?.artistId !== currentScreenState.artist?.artistId || prev.album?.collectionId !== currentScreenState.album?.collectionId) {
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
        setActiveTab('home');
        setViewingUser(null);
        setActiveChatUserId(null);
        setActiveArtistProfile(null);
        setActiveAlbumProfile(null);
        return stack;
      }
      const newStack = [...stack];
      const lastState = newStack.pop();

      skipHistoryRef.current = true;

      if (lastState) {
        setActiveTab(lastState.tab);
        setViewingUser(lastState.user);
        setActiveChatUserId(lastState.chatId);
        setActiveArtistProfile(lastState.artist);
        setActiveAlbumProfile(lastState.album);
      }
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
  };
 // 💡 AI Vibe Analysis (本番用): 過去の記録からアーティストを抽出し、新しい曲を提案する
  useEffect(() => {
    if (!currentUser || vibes.length === 0) return;
    const analyzeVibes = async () => {
      const myVibes = vibes.filter(v => v.user.id === currentUser.id || v.user.id === myProfile.id);
      if (myVibes.length === 0) {
        setAiMessage("まだ記録がありません。曲を記録すると、AIがあなたの好みを分析しておすすめを提案します。");
        setAiRecommendations([]);
        return;
      }
      
      // 直近に聴いたアーティストを最大3組抽出
      const recentArtists = [...new Set(myVibes.slice(0, 10).map(v => v.artist))].slice(0, 3);
      setAiMessage(`最近よく聴いている「${recentArtists.join('、')}」などの傾向から、今のあなたにぴったりな3曲をピックアップしました。`);

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
  }, [vibes, currentUser, myProfile.id, trendingSongs]);

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
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
        setIsLoggedIn(true);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) {
          setMyProfile(prev => ({ ...prev, ...profile }));
          const { data: followingData } = await supabase.from('follows').select('following_id').eq('follower_id', session.user.id);
          if (followingData) setFollowedUsers(new Set(followingData.map(d => d.following_id)));
          const { data: followersData } = await supabase.from('follows').select('follower_id').eq('following_id', session.user.id);
          if (followersData) setMyFollowers(new Set(followersData.map(d => d.follower_id)));
        }
      }
      setIsInitializing(false);
    };
    checkSession();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setCurrentUser(session.user);
        setIsLoggedIn(true);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) {
          setMyProfile(prev => ({ ...prev, ...profile }));
          const { data: followingData } = await supabase.from('follows').select('following_id').eq('follower_id', session.user.id);
          if (followingData) setFollowedUsers(new Set(followingData.map(d => d.following_id)));
          const { data: followersData } = await supabase.from('follows').select('follower_id').eq('following_id', session.user.id);
          if (followersData) setMyFollowers(new Set(followersData.map(d => d.follower_id)));
          if (profile.bio === "よろしくお願いします！") {
            setEditName(profile.name); setEditHandle(profile.handle); setEditBio("");
            setIsEditingProfile(true);
            showToast("初めまして！プロフィールを設定しましょう", "success");
          }
        }
      } else {
        setCurrentUser(null);
        setIsLoggedIn(false);
      }
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { try { setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone); } catch (e) { setTimeZone("Asia/Tokyo"); } }, []);
  useEffect(() => { if (audioRef.current) audioRef.current.muted = !settings.audio; }, [settings.audio]);
  useEffect(() => { if (draftSong && draftSong.previewUrl && audioRef.current && settings.audio) { audioRef.current.src = draftSong.previewUrl; audioRef.current.play().then(() => setPlayingSong(draftSong.previewUrl)).catch(()=>{}); } }, [draftSong]);
  useEffect(() => { const fetchT = async () => { try { const res = await fetch(`https://itunes.apple.com/search?term=jpop+top&entity=song&country=jp&limit=5`); const d = await res.json(); setTrendingSongs(d.results); } catch(e){} }; fetchT(); }, []);

  // 💡 無限スクロール用の箱（状態）を追加
  const [vibePage, setVibePage] = useState(0);
  const [hasMoreVibes, setHasMoreVibes] = useState(true);
  const [isLoadingVibes, setIsLoadingVibes] = useState(false);
  const VIBES_PER_PAGE = 5; // 💡 動作確認しやすくするため最初は5件ずつ読み込む

  const fetchVibes = async (pageNumber = 0, isRefresh = false) => {
    if (isLoadingVibes || (!hasMoreVibes && !isRefresh)) return;
    setIsLoadingVibes(true);

    const from = pageNumber * VIBES_PER_PAGE;
    const to = from + VIBES_PER_PAGE - 1;

    // 💡 range() を使って必要な件数だけをデータベースから取得する
    const { data: vibesData, error: vibesError } = await supabase.from('vibes').select('*').order('created_at', { ascending: false }).range(from, to);
    const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('*');
    const { data: likesData } = await supabase.from('likes').select('*');
    const { data: commentsData } = await supabase.from('comments').select('*');

    if (vibesError || profilesError) {
      setIsLoadingVibes(false);
      return;
    }

    if (vibesData && profilesData) {
      const currentUserId = (await supabase.auth.getUser()).data.user?.id;
      const formatted = vibesData.map((v: any) => {
        const authorProfile = profilesData.find((p: any) => p.id === v.user_id);
        const postUser = authorProfile ? { id: authorProfile.id, name: authorProfile.name, handle: authorProfile.handle, avatar: authorProfile.avatar, bio: authorProfile.bio, followers: 0, following: 0, isPrivate: false, category: 'suggested' } : myProfile;
        const postLikes = likesData ? likesData.filter((l: any) => l.vibe_id === v.id) : [];
        const postComments = commentsData ? commentsData.filter((c: any) => c.vibe_id === v.id) : [];
        const isLikedByMe = currentUserId ? postLikes.some((l: any) => l.user_id === currentUserId) : false;
        const formattedComments = postComments.map((c: any) => {
           const commenterProfile = profilesData.find((p: any) => p.id === c.user_id);
           return { id: c.id, text: c.text, user: commenterProfile ? { id: commenterProfile.id, handle: commenterProfile.handle, name: commenterProfile.name, avatar: commenterProfile.avatar } : myProfile };
        });
        return { id: v.id, trackId: parseInt(v.track_id) || 0, title: v.title, artist: v.artist, artistId: 0, imgUrl: v.img_url, previewUrl: v.preview_url, date: new Date(v.created_at).toLocaleDateString('ja-JP'), year: new Date(v.created_at).getFullYear(), month: new Date(v.created_at).getMonth() + 1, dayIndex: new Date(v.created_at).getDate(), timestamp: new Date(v.created_at).getTime(), time: new Date(v.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }), caption: v.caption || "", user: postUser, likes: postLikes.length, isLiked: isLikedByMe, comments: formattedComments };
      });
      
      if (isRefresh || pageNumber === 0) {
        setVibes(formatted as Song[]);
      } else {
        setVibes(prev => {
          // 💡 重複を排除してデータを結合する
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = formatted.filter(f => !existingIds.has(f.id));
          return [...prev, ...newItems] as Song[];
        });
      }
      
      setHasMoreVibes(vibesData.length === VIBES_PER_PAGE);
      setVibePage(pageNumber);
    }
    setIsLoadingVibes(false);
  };

  useEffect(() => { fetchVibes(0, true); }, []);

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

  useEffect(() => {
    if (!currentUser) return;
    const fetchChats = async () => {
      const { data } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: true });
      if (data) {
        const history: Record<string, ChatMessage[]> = {};
        data.forEach(msg => {
          const isGroup = msg.target_id.startsWith('g') || msg.target_id.startsWith('com');
          const partnerId = isGroup ? msg.target_id : (msg.sender_id === currentUser.id ? msg.target_id : msg.sender_id);
          if (!history[partnerId]) history[partnerId] = [];
          history[partnerId].push({ id: msg.id, senderId: msg.sender_id, text: msg.text, timestamp: new Date(msg.created_at).getTime(), isRead: msg.is_read } as any);
        });
        setChatHistory(history);
      }
    };
    fetchChats();

    const fetchNotifications = async () => {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
      if (data) {
        setNotifications(data.map(n => ({ id: n.id, type: n.type, text: n.text, time: new Date(n.created_at).toLocaleDateString('ja-JP'), read: n.is_read })) as any);
      }
    };
    fetchNotifications();

// 2. リアルタイム監視 (メッセージ・既読・削除・通知)
    const channel = supabase.channel('realtime_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload) => {
        const msg = payload.new;
        if (msg.sender_id === currentUser.id) return;
        
        const isGroup = msg.target_id.startsWith('g') || msg.target_id.startsWith('com');
        const partnerId = isGroup ? msg.target_id : msg.sender_id;
        let isRead = msg.is_read;

        // 💡 相手の画面を開いている最中なら既読にする
        if (activeChatUserId === partnerId) {
          isRead = true;
          await supabase.from('chat_messages').update({ is_read: true }).eq('id', msg.id);
        } else {
          // 💡 通知を「〇〇さん：内容」のようにリッチにする
          const senderName = allProfiles.find(u => u.id === msg.sender_id)?.name || "誰か";
const msgPreview = msg.text.startsWith('[IMAGE]') ? "画像を送信しました" : msg.text.startsWith('[FILE]') ? "ファイルを送信しました" : msg.text.startsWith('[VOICE]') ? "ボイスメッセージを送信しました" : msg.text;
          showToast(`${senderName}さんから: ${msgPreview}`);
        }

        const newChatMsg = { id: msg.id, senderId: msg.sender_id, text: msg.text, timestamp: new Date(msg.created_at).getTime(), isRead: isRead };
        setChatHistory(prev => ({ ...prev, [partnerId]: [...(prev[partnerId] || []), newChatMsg as any] }));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, (payload) => {
        const updatedMsg = payload.new;
        setChatHistory(prev => {
          const newHistory = { ...prev };
          Object.keys(newHistory).forEach(pId => { newHistory[pId] = newHistory[pId].map(m => (m.id === updatedMsg.id ? { ...m, isRead: updatedMsg.is_read } as any : m)); });
          return newHistory;
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, (payload) => {
        // 💡 送信取り消しされたら、即座に画面から消す
        const deletedMsgId = payload.old.id;
        setChatHistory(prev => {
          const newHistory = { ...prev };
          Object.keys(newHistory).forEach(pId => { newHistory[pId] = newHistory[pId].filter(m => m.id !== deletedMsgId); });
          return newHistory;
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        if (payload.new.user_id === currentUser.id) {
          const newNotif = { id: payload.new.id, type: payload.new.type, text: payload.new.text, time: "たった今", read: payload.new.is_read };
          setNotifications(prev => [newNotif as any, ...prev]);
          showToast(payload.new.text, "success");
        }
      })
      .subscribe();
      

    return () => { supabase.removeChannel(channel); };
  }, [currentUser, activeChatUserId]);

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
  useEffect(() => {
    if (!userSearchQuery.trim()) { setRealUserSearchResults([]); return; }
    const fetchUsers = async () => {
      const cleanQuery = userSearchQuery.trim().replace(/^@/, '');
      const { data } = await supabase.from('profiles').select('*').or(`handle.ilike.%${cleanQuery}%,name.ilike.%${cleanQuery}%`).limit(10);
      if (data) setRealUserSearchResults(data as User[]);
    };
    const timer = setTimeout(fetchUsers, 300); 
    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setSearchArtistInfo(null); return; }
    const timer = setTimeout(async () => { 
      try { const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=song&country=jp&limit=5`); const d = await res.json(); setSearchResults(d.results); if (d.results.length > 0) { setSearchArtistInfo({ artistId: d.results[0].artistId, artistName: d.results[0].artistName, artworkUrl: d.results[0].artworkUrl100.replace('100x100bb', '300x300bb')}); } else { setSearchArtistInfo(null); } } catch(e){} 
    }, 500); return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!filterArtistInput.trim()) { setFilterArtistSuggestions([]); return; }
    const timer = setTimeout(async () => { 
      try { const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(filterArtistInput)}&entity=song&country=jp&limit=10`); const d = await res.json(); const unique: any[] = []; const seen = new Set(); d.results.forEach((r: any) => { if (!seen.has(r.artistId)) { seen.add(r.artistId); unique.push({ artistId: r.artistId, artistName: r.artistName, artworkUrl: r.artworkUrl60 }); } }); setFilterArtistSuggestions(unique.slice(0, 5)); } catch (e) {} 
    }, 500); return () => clearTimeout(timer);
  }, [filterArtistInput]);

  useEffect(() => { 
    if (!activeArtistProfile) return; 
    setIsArtistLoading(true); 
    const f = async () => { 
      try { 
        const term = activeArtistProfile.artistName;
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&country=jp&limit=50`); 
        const d = await res.json(); 
        const filtered = d.results.filter((i:any)=>i.wrapperType==='track' && i.artistName.toLowerCase().includes(term.toLowerCase()));
        const sortedSongs = filtered.sort((a:any,b:any) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
        setArtistSongs(sortedSongs); 
        if (sortedSongs.length > 0 && !activeArtistProfile.isVerifiedReal) {
          setActiveArtistProfile((prev: any) => ({ ...prev, artistId: sortedSongs[0].artistId, artworkUrl: sortedSongs[0].artworkUrl100.replace('100x100bb', '600x600bb'), isVerifiedReal: true }));
        }
      } catch(e){} finally { setIsArtistLoading(false); } 
    }; f(); 
  }, [activeArtistProfile]);

  useEffect(() => { 
    if (!activeAlbumProfile) return; 
    setIsAlbumLoading(true); 
    const f = async () => { 
      try { 
        const res = await fetch(`https://itunes.apple.com/lookup?id=${activeAlbumProfile.collectionId}&entity=song&country=jp`); 
        const d = await res.json(); 
        setAlbumSongs(d.results.filter((i:any)=>i.wrapperType==='track')); 
      } catch(e){} finally { setIsAlbumLoading(false); } 
    }; f(); 
  }, [activeAlbumProfile]);

  const allAvailableHashtags = useMemo(() => { const s = new Set<string>(); mockUsers.forEach(u => u.hashtags?.forEach(h => s.add(h))); return Array.from(s); }, [mockUsers]);
  const allAvailableLiveHistories = useMemo(() => { const s = new Set<string>(); mockUsers.forEach(u => u.liveHistory?.forEach(l => s.add(l))); return Array.from(s); }, [mockUsers]);
  const vibeMatchData = useMemo(() => { 
    if (!viewingUser) return null; 
    return { score: getVibeMatchScore(myProfile.id, viewingUser.id), genre1: "J-Pop", genre1Score: 85, genre2: "Rock", genre2Score: 65, sharedArtists: viewingUser.topArtists||["Tele"], persona: "Midnight Listeners" }; 
  }, [viewingUser, myProfile.id]);

  const togglePlay = async (url: string | null) => { 
    if (!url) { showToast(t('noPreview'), 'error'); return; } 
    if (!settings.audio) { showToast("Audio is OFF", 'error'); return; } 
    if (playingSong === url) { audioRef.current?.pause(); setPlayingSong(null); } 
    else { audioRef.current!.src = url; try { await audioRef.current!.play(); setPlayingSong(url); } catch(e) { setPlayingSong(null); } } 
  };
  
  const handleArtistClick = (e: React.MouseEvent, id: number|undefined, name: string, url: string) => { 
    e.preventDefault(); e.stopPropagation(); 
    setShowMatchFilterModal(false); setSelectedCalendarPopupVibe(null); activeAlbumProfile && setActiveAlbumProfile(null);
    if (name) { setActiveArtistProfile({ artistId: id || 0, artistName: name, artworkUrl: url.replace('100x100bb', '600x600bb'), isVerifiedReal: false }); } 
    else { setSearchQuery(name); setActiveTab('home'); setIsSearchFocused(true); } 
  };

  const toggleFavoriteArtist = (a: any) => { setFavoriteArtists(p => p.some(x=>x.artistId===a.artistId) ? p.filter(x=>x.artistId!==a.artistId) : [...p, a]); };
  const cancelDraft = () => { if(audioRef.current) audioRef.current.pause(); setPlayingSong(null); setDraftSong(null); setDraftCaption(""); setShowPostOverrideConfirm(null); };
  
  const isAlreadyPostedToday = () => vibes.find(v => v.year === new Date().getFullYear() && v.month === (new Date().getMonth() + 1) && v.dayIndex === new Date().getDate() && v.user.id === myProfile.id);
  
  const checkAndPost = () => { 
    if (!draftSong) return; 
    const existingPost = isAlreadyPostedToday(); 
    if (existingPost) setShowPostOverrideConfirm(existingPost); 
    else executePost(new Date()); 
  };

  // 💡 二重投稿を完全に防止する処理を追加
  const executePost = async (now: Date) => { 
    if (!draftSong || isPosting) return; 
    setIsPosting(true); 
    
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData.user ? authData.user.id : 'me';
      const existingPost = isAlreadyPostedToday();
      if (existingPost) { await supabase.from('vibes').delete().eq('id', existingPost.id); }

      const newId = Date.now().toString();
      const newVibeData = { id: newId, user_id: currentUserId, track_id: draftSong.trackId.toString(), title: draftSong.trackName, artist: draftSong.artistName, img_url: draftSong.artworkUrl100.replace('100x100bb', '600x600bb'), preview_url: draftSong.previewUrl || null, caption: draftCaption, created_at: now.toISOString() };
      const { error } = await supabase.from('vibes').insert([newVibeData]);
      if (error) { showToast("保存に失敗しました", 'error'); setIsPosting(false); return; }
      
      await fetchVibes(0, true); // 💡 新しい取得ロジックに合わせて変更
      cancelDraft(); setSearchQuery(""); setSearchResults([]); setSearchArtistInfo(null); setIsSearchFocused(false); setActiveTab('home'); showToast("記録が完了しました！", "success");
    } catch (e) {
      showToast("エラーが発生しました", "error");
    } finally {
      setIsPosting(false); 
    }
  };

 // 💡 DBと連動する「いいね」機能 (通知送信付き)
  const toggleLike = async (vibeId: string) => {
    if (!currentUser) return;
    let isCurrentlyLiked = false;
    let targetUserId = ""; // 投稿者のIDを覚えておく箱

    const fn = (s: Song) => {
      if (s.id === vibeId) { 
        isCurrentlyLiked = s.isLiked; 
        targetUserId = s.user.id; // 投稿者のIDを記録
        return { ...s, isLiked: !s.isLiked, likes: s.isLiked ? s.likes - 1 : s.likes + 1 }; 
      }
      return s;
    };
    
    setVibes(vibes.map(fn)); setCommunityVibes(communityVibes.map(fn));
    
    if (isCurrentlyLiked) { 
      await supabase.from('likes').delete().eq('vibe_id', vibeId).eq('user_id', currentUser.id); 
    } else { 
      await supabase.from('likes').insert([{ vibe_id: vibeId, user_id: currentUser.id }]); 
      
      // 💡 自分以外の投稿なら「いいね」通知をDBに送信
      if (targetUserId && targetUserId !== currentUser.id) {
        await supabase.from('notifications').insert([{ 
          user_id: targetUserId, 
          sender_id: currentUser.id, 
          type: 'like', 
          text: `${myProfile.name}さんがあなたのVibeにいいねしました` 
        }]);
      }
    }
  };

  // 💡 DBと連動する「コメント」機能 (通知送信付き)
  const submitComment = async (vibeId: string) => {
    if (!commentInput.trim() || !currentUser) return;
    const newCommentText = commentInput;
    setCommentInput(""); 
    
    const { data: newDbComment, error } = await supabase.from('comments').insert([{ vibe_id: vibeId, user_id: currentUser.id, text: newCommentText }]).select().single();
    if (error) { showToast("コメントの送信に失敗しました", "error"); return; }
    
    const c: Comment = { id: newDbComment.id, user: myProfile, text: newCommentText };
    let targetUserId = ""; // 投稿者のIDを覚えておく箱

    const fn = (s: Song) => {
      if (s.id === vibeId) targetUserId = s.user.id; // 投稿者のIDを記録
      return s.id === vibeId ? { ...s, comments: [...s.comments, c] } : s;
    };
    
    setVibes(vibes.map(fn)); setCommunityVibes(communityVibes.map(fn));
    showToast("コメントしました！", "success");

    // 💡 自分以外の投稿なら「コメント」通知をDBに送信
    if (targetUserId && targetUserId !== currentUser.id) {
      await supabase.from('notifications').insert([{ 
        user_id: targetUserId, 
        sender_id: currentUser.id, 
        type: 'comment', 
        text: `${myProfile.name}さんがコメントしました: "${newCommentText}"` 
      }]);
    }
  };
  
  const deleteVibe = async (id: string) => { 
    if (confirm("このVibeを削除しますか？")) { 
      const { error } = await supabase.from('vibes').delete().eq('id', id);
      if (error) { showToast("データの削除に失敗しました", "error"); return; }
      setVibes(vibes.filter(v => v.id !== id)); setCommunityVibes(communityVibes.filter(v => v.id !== id)); 
    } 
  };

  // 💡 送信時に本物のIDを取得する（既読を即座に反映させるため）
  const submitChatMessage = async (targetId: string) => { 
    if (!chatMessageInput.trim() || !currentUser) return; 
    const text = chatMessageInput; 
    setChatMessageInput("");
    
    // 1. サクサク感を出すために仮のIDで即座に表示
    const tempId = Date.now().toString();
    const newMsg = { id: tempId, senderId: currentUser.id, text: text, timestamp: Date.now(), isRead: false }; 
    setChatHistory(prev => ({ ...prev, [targetId]: [...(prev[targetId] || []), newMsg as any] })); 

    // 2. DBに保存し、本物のデータを受け取る
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{ sender_id: currentUser.id, target_id: targetId, text: text }])
      .select()
      .single();

    if (error) {
      showToast("送信エラー", "error");
    } else if (data) {
      // 3. 画面上の仮IDを本物のIDに書き換える
      setChatHistory(prev => {
        const history = prev[targetId] || [];
        return { ...prev, [targetId]: history.map(m => m.id === tempId ? { ...m, id: data.id } as any : m) };
      });
    }
  };

  // 💡 送信取り消し（削除）機能
  const deleteChatMessage = async (msgId: string, partnerId: string) => {
    if (confirm("このメッセージを送信取り消ししますか？")) {
      const { error } = await supabase.from('chat_messages').delete().eq('id', msgId).eq('sender_id', currentUser.id);
      if (!error) {
        setChatHistory(prev => ({ ...prev, [partnerId]: prev[partnerId].filter(m => m.id !== msgId) }));
        showToast("送信を取り消しました");
      }
    }
  };

  const handleCreateGroup = () => { if (!newGroupName.trim() || newGroupMembers.size === 0) { showToast("グループ名とメンバーを指定", "error"); return; } const ng: ChatGroup = { id: `g${Date.now()}`, name: newGroupName, memberIds: Array.from(newGroupMembers), avatar: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80" }; setChatGroups([...chatGroups, ng]); setShowCreateGroupModal(false); setNewGroupName(""); setNewGroupMembers(new Set()); showToast("グループ作成完了！"); };
  const joinCommunity = (c: LiveCommunity) => { setChatCommunities(p => p.some(x=>x.id===c.id)?p:[...p,{...c,isJoined:true}]); setActiveCommunityDetail(null); setChatTabMode('community'); setActiveTab('chat'); setActiveChatUserId(c.id); showToast(`${c.name} に参加！`); };

// 💡 ユーザーが手動で新しいライブコミュニティを作成する機能
  const handleCreateCommunity = () => {
    if (!newCommName.trim() || newCommYear.length !== 4 || !newCommMonth || !newCommDay) { 
      showToast("ライブ名と正しい日程(YYYY/MM/DD)を入力してください", "error"); 
      return; 
    }
    const formattedDate = `${newCommYear}-${newCommMonth.padStart(2, '0')}-${newCommDay.padStart(2, '0')}`;
    const newComm: LiveCommunity = { id: `com_new_${Date.now()}`, name: newCommName, date: formattedDate, memberCount: 1, isJoined: true, isVerified: false, reportedBy: [] };
    
    setRealCommunities(prev => [...prev, newComm]);
    setChatCommunities(prev => [...prev, newComm]);
    
    setShowCreateCommunityModal(false);
    setNewCommName("");
    setNewCommYear(""); setNewCommMonth(""); setNewCommDay("");
    setChatTabMode('community');
    setActiveTab('chat');
    setActiveChatUserId(newComm.id);
    showToast(`${newComm.name} を新しく作成して参加しました！`, "success");
  };

  // 💡 嘘のコミュニティを通報する機能（重複チェック版）
  const handleReportCommunity = (id: string) => {
    if (!currentUser) return;
    
    const target = realCommunities.find(c => c.id === id);
    if (target?.reportedBy?.includes(currentUser.id)) {
      showToast("このライブは既に通報済みです", "error");
      return;
    }

    if (confirm("このライブ情報は間違っていますか？\n（3人以上の異なるユーザーが通報すると運営が確認します）")) {
      setRealCommunities(prev => prev.map(c => 
        c.id === id 
          ? { ...c, reportedBy: [...(c.reportedBy || []), currentUser.id] } 
          : c
      ));
      setActiveCommunityDetail(null);
      showToast("通報を受け付けました。ご協力感謝します", "success");
    }
  };

  // 💡 運営用：通報されたコミュニティを復旧（安全判定）する
  const handleRestoreCommunity = (id: string) => {
    setRealCommunities(prev => prev.map(c => c.id === id ? { ...c, reportedBy: [] } : c));
    showToast("コミュニティを復旧しました", "success");
  };

  // 💡 運営用：通報された悪質なコミュニティを完全削除する
  const handleDeleteCommunity = (id: string) => {
    if (confirm("本当にこのコミュニティを完全に削除しますか？")) {
      setRealCommunities(prev => prev.filter(c => c.id !== id));
      showToast("コミュニティを削除しました", "success");
    }
  };

  const handleSendVibe = async (uid: string, uname: string) => { 
    setMatchIndex(p => p + 1); showToast(`${uname}さんに気になるを送信しました！`, 'success'); 
    if (currentUser) {
      await supabase.from('notifications').insert([{ user_id: uid, sender_id: currentUser.id, type: 'vibe_request', text: `${myProfile.name}さんがあなたに「気になる」を送信しました！` }]);
    }
  };
  const handleSendVibeWithMessage = (uid: string) => { if (!matchMessageInput.trim()) return; submitChatMessage(uid); setMatchedUsers(p => new Set(p).add(uid)); setShowMatchMessageModal(null); setMatchMessageInput(""); setMatchIndex(p => p + 1); showToast("送信完了！", 'success'); };

  const parseMention = (cap: string) => { const p = cap.split(/(@[\w._]+)/); return p.map((x, i) => { if(x.startsWith('@')){ const h=x.substring(1); const u=[...mockUsers,myProfile].find(y=>y.handle===h); if(u){ return <span key={i} onClick={(e)=>{e.stopPropagation(); if(u.id===myProfile.id) setActiveTab('profile'); else{setViewingUser(u);setActiveTab('other_profile');}}} className="text-[#1DB954] font-bold cursor-pointer relative z-20 pointer-events-auto">@{h}</span>; } } return x; }); };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { 
    const file = e.target.files?.[0]; if (!file || !currentUser) return;
    showToast("画像をアップロードしています...", "success");
    try {
      // 💡 プロフィール画像をアップロード前に圧縮
      const compressedFile = await compressImage(file);
      const fileName = `${currentUser.id}-${Date.now()}.jpeg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, compressedFile);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setEditAvatar(data.publicUrl);
      showToast("画像のアップロードが完了しました！そのまま保存を押してください", "success");
    } catch (err) {
      showToast("画像のアップロードに失敗しました", "error");
    }
  };

  // 💡 チャットで画像・ファイルを送る機能（画像の場合は自動圧縮）
  const handleChatFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0]; 
    if (!file || !currentUser || !activeChatUserId) return;
    
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
    if (!draftVoice || !currentUser || !activeChatUserId) return;
    
    showToast("音声を送信中...", "success");
    const fileName = `voice-${currentUser.id}-${Date.now()}.webm`;
    const tempVoice = draftVoice;
    cancelVoiceRecording(); // UIをリセットして閉じる
    
    const { error } = await supabase.storage.from('avatars').upload(fileName, tempVoice.blob);
    if (error) { showToast("音声の送信に失敗しました", "error"); return; }
    
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const tempId = Date.now().toString();
    const fileText = `[VOICE]${data.publicUrl}`;
    
    const newMsg = { id: tempId, senderId: currentUser.id, text: fileText, timestamp: Date.now(), isRead: false }; 
    setChatHistory(prev => ({ ...prev, [activeChatUserId]: [...(prev[activeChatUserId] || []), newMsg as any] })); 

    const { data: dbData } = await supabase.from('chat_messages').insert([{ sender_id: currentUser.id, target_id: activeChatUserId, text: fileText }]).select().single();
    if (dbData) {
      setChatHistory(prev => {
        const history = prev[activeChatUserId] || [];
        return { ...prev, [activeChatUserId]: history.map(m => m.id === tempId ? { ...m, id: dbData.id } as any : m) };
      });
    }
  };

    
  const toggleFollow = async (targetUserId: string) => {
    if (!currentUser || !currentUser.id) return;
    const isFollowing = followedUsers.has(targetUserId);
    if (isFollowing) {
      const { error } = await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetUserId);
      if (!error) { setFollowedUsers(prev => { const next = new Set(prev); next.delete(targetUserId); return next; }); showToast("フォローを解除しました"); }
    } else {
      const { error } = await supabase.from('follows').insert([{ follower_id: currentUser.id, following_id: targetUserId }]);
      if (!error) { setFollowedUsers(prev => { const next = new Set(prev); next.add(targetUserId); return next; }); showToast("フォローしました！", "success"); }
    }
  };

  const handleBlockUser = (userId: string) => {
    if (confirm("このユーザーをブロックしますか？\n（投稿やプロフィールがお互いに見えなくなります）")) {
      setBlockedUsers(prev => new Set(prev).add(userId));
      handleGoBack(); // 💡 ブロックしたら即座にプロフィール画面から戻す
      showToast("ユーザーをブロックしました", "success");
    }
  };

  const handleReportUser = (userId: string) => {
    if (confirm("このユーザーを通報しますか？\n（運営が内容を確認し、適切な対応を行います）")) {
      showToast("通報が完了しました。ご協力ありがとうございます。", "success");
    }
  };

  const saveProfile = () => { 
    setMyProfile({ ...myProfile, name: editName, handle: editHandle.replace('@',''), bio: editBio, isPrivate: editIsPrivate, avatar: editAvatar, hashtags: (editHashtags || "").split(',').map(s => s.trim()).filter(s => s), liveHistory: (editLiveHistory || "").split(',').map(s => s.trim()).filter(s => s) }); 
    setIsEditingProfile(false); showToast("プロフィールを保存しました"); 
  };
  
  const handleShareVibe = (s: Song) => { 
    if (navigator.share) { navigator.share({ title: `Echoes - ${s.title}`, text: `${s.user.name}のVibeをチェック！`, url: 'https://echo.es' }).catch(()=>{}); } 
    else { showToast("URLをクリップボードにコピーしました。"); } 
  };
  const handleShareApp = () => { 
    if (navigator.share) { navigator.share({ title: 'Echoes', url: 'https://echo.es' }).catch(()=>{}); } 
    else { showToast("URLをクリップボードにコピーしました。"); } 
  };

  const handleLogin = async () => {
    setIsAuthLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setIsAuthLoading(false);
    if (error) { showToast("ログイン失敗: " + error.message, "error"); } 
    else { setCurrentUser(data.user); setIsLoggedIn(true); showToast("ログインしました", "success"); }
  };

  const saveProfileChanges = async () => {
    if (!currentUser) return;
    const { error } = await supabase.from('profiles').update({ name: editName, handle: editHandle, bio: editBio, avatar: editAvatar }).eq('id', currentUser.id);
    if (error) { showToast("保存に失敗しました", "error"); return; }
    setMyProfile(prev => ({ ...prev, name: editName, handle: editHandle, bio: editBio, avatar: editAvatar }));
    // 💡 全体のユーザーリストも同時に更新して、画面全体のアイコンや名前を即座に変える
    setAllProfiles(prev => prev.map(p => p.id === currentUser.id ? { ...p, name: editName, handle: editHandle, bio: editBio, avatar: editAvatar } : p));
    setIsEditingProfile(false); 
    showToast("プロフィールを保存しました！", "success");
  };
  
  const handleSignUp = async () => {
    setIsAuthLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { showToast("登録失敗: " + error.message, "error"); setIsAuthLoading(false); return; }
    if (data.user && data.user.identities && data.user.identities.length === 0) { showToast("このメールアドレスはすでに登録されています", "error"); setIsAuthLoading(false); return; }
    if (data.user) {
      await supabase.from('profiles').insert([{ id: data.user.id, name: email.split('@')[0], handle: email.split('@')[0], avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80", bio: "よろしくお願いします！" }]);
    }
    setIsAuthLoading(false); setSignupSuccess(true);
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
            <div ref={yearRef} className="relative flex-1 h-full overflow-y-auto scroll-smooth snap-y snap-mandatory scrollbar-hide z-30 py-[100px]" onScroll={e => { const i = Math.round(e.currentTarget.scrollTop / 50); const y = yearList[i]; if(y) setSelectedY(y); }} style={{ WebkitOverflowScrolling: 'touch' }}>
              {yearList.map((y, i) => (<div key={i} className={`h-[50px] flex justify-center items-center snap-center transition-all ${y === selectedY ? 'text-white text-lg font-bold scale-110' : 'text-zinc-500 scale-90'}`}>{y}年</div>))}
            </div>
            
            {/* 💡 右側：月（上下に100pxの余白を追加してズレを完全に解消） */}
            <div ref={monthRef} className="relative flex-1 h-full overflow-y-auto scroll-smooth snap-y snap-mandatory scrollbar-hide z-30 py-[100px]" onScroll={e => { const i = Math.round(e.currentTarget.scrollTop / 50); const m = monthList[i]; if(m) setSelectedM(m); }} style={{ WebkitOverflowScrolling: 'touch' }}>
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
      <div className="grid grid-cols-7 gap-2.5">
        {[...Array(daysInMonth)].map((_, i) => {
          const day = i + 1; const userVibes = (activeTab === 'calendar' || activeTab === 'profile') ? vibes.filter(v => v.user.id === myProfile.id) : allFeedVibes.filter(v => v.user.id === viewingUser?.id);
          const v = userVibes.find(x => x.year === currentYear && x.month === currentMonth && x.dayIndex === day);
          return (
            <div key={i} className={`group aspect-square bg-[#1c1c1e] rounded-[14px] flex items-center justify-center relative overflow-hidden ${v ? 'border border-zinc-800/30' : ''}`}>
              {v ? (
                <>
                  <img src={v.imgUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 cursor-pointer" onClick={() => setSelectedCalendarPopupVibe(v)} />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePlay(v.previewUrl); }} className="w-10 h-10 bg-black/60 rounded-full flex items-center justify-center text-white pointer-events-auto shadow-lg hover:scale-105 transition-transform relative z-50">{playingSong === v.previewUrl ? <IconStop /> : <IconPlay />}</button>
                  </div>
                </>
              ) : <span className="text-[10px] text-zinc-700 font-bold">{day}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderFeedCard = (s: Song) => (
    <div key={s.id} className="bg-[#1c1c1e] border border-zinc-800/50 rounded-[24px] p-5 shadow-lg relative z-0">
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => { if(s.user.id !== 'me'){ setViewingUser(s.user); setActiveTab('other_profile'); } else { setActiveTab('profile'); } }}>
          <img src={s.user.avatar} className="w-10 h-10 rounded-full object-cover"/>
          <div>
            <p className="text-sm font-bold">{s.user.name}</p>
            <p className="text-[10px] text-zinc-500">@{s.user.handle} • {displayLocalTime(s.timestamp, timeZone)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShareVibe(s); }} className="text-zinc-500 hover:text-white p-1"><IconShareExternal /></button>
{/* 💡 本番環境のIDでも削除ボタンが出るように修正 */}
          {(s.user.id === myProfile.id || s.user.id === currentUser?.id || s.user.id === 'me') && <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteVibe(s.id); }} className="text-[10px] font-bold text-zinc-600 hover:text-red-500 uppercase tracking-widest p-1">削除</button>}
        </div>
      </div>
      <div className="flex items-center gap-4 mb-5">
        <div className="relative w-20 h-20 rounded-full overflow-hidden border border-zinc-700 group flex-shrink-0">
           <img src={s.imgUrl} className={`w-full h-full object-cover ${playingSong === s.previewUrl ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
           <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePlay(s.previewUrl); }} className="w-10 h-10 bg-black/60 rounded-full flex items-center justify-center text-white pointer-events-auto shadow-lg hover:scale-105 transition-transform relative z-50">
                 {playingSong === s.previewUrl ? <IconStop /> : <IconPlay />}
              </button>
           </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="font-bold text-lg truncate">{s.title}</p>
          <p onClick={(e) => handleArtistClick(e, s.artistId, s.artist, s.imgUrl)} className="text-xs text-zinc-400 hover:text-[#1DB954] cursor-pointer inline-block mt-1 relative z-10">{s.artist}</p>
        </div>
      </div>
      <p className="text-xs mb-5">{parseMention(s.caption)}</p>
      <div className="flex gap-6 border-t border-zinc-800/60 pt-4">
        <button onClick={() => toggleLike(s.id)} className="flex items-center gap-2"><IconHeart filled={s.isLiked} />{formatCount(s.likes)}</button>
        <button onClick={() => setActiveCommentSongId(activeCommentSongId === s.id ? null : s.id)} className="flex items-center gap-2"><IconComment />{formatCount(s.comments.length)}</button>
      </div>
      {activeCommentSongId === s.id && (
        <div className="mt-4 bg-black border border-zinc-800/80 rounded-xl p-4 animate-fade-in">
          <div className="flex flex-col gap-3 mb-4 max-h-[100px] overflow-y-auto scrollbar-hide">
            {s.comments.map(c => (<div key={c.id} className="text-[11px]"><span className="font-bold text-[#1DB954] mr-2">@{c.user.handle}</span><span className="text-zinc-300">{c.text}</span></div>))}
            {s.comments.length === 0 && <p className="text-[10px] text-zinc-500">まだコメントはありません</p>}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); submitComment(s.id); }} className="flex gap-2 items-center">
            <input type="text" placeholder="コメントを追加..." value={commentInput} onChange={e => setCommentInput(e.target.value)} className="flex-1 bg-[#1c1c1e] rounded-full px-4 py-2 text-xs focus:outline-none" />
            <button type="submit" className="text-[10px] font-bold text-black bg-white px-4 py-2 rounded-full">Post</button>
          </form>
        </div>
      )}
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
                <button onClick={handleSignUp} disabled={isAuthLoading} className="w-full bg-[#1DB954] text-black font-bold py-3.5 rounded-xl mt-4 disabled:opacity-50 transition-transform active:scale-95">{isAuthLoading ? "処理中..." : "登録する"}</button>
                <p className="text-center text-xs text-zinc-500 mt-4">すでにアカウントをお持ちですか？ <button onClick={() => { setAuthMode('login'); setEmail(""); setPassword(""); }} className="text-white font-bold hover:underline">ログイン</button></p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-black text-white pb-24 font-sans relative selection:bg-zinc-800 overflow-x-hidden">
      <audio ref={audioRef} onEnded={() => setPlayingSong(null)} />
      {toastMsg && (
        <div className={`fixed top-12 left-1/2 transform -translate-x-1/2 z-[1000] px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 animate-fade-in ${toastMsg.type === 'error' ? 'bg-red-500 text-white' : 'bg-[#1DB954] text-black'}`}>
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

      {draftSong && !showPostOverrideConfirm && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[900] flex items-center justify-center p-6 animate-fade-in" onClick={cancelDraft}>
          <div className="bg-[#1c1c1e] border border-zinc-800 p-8 rounded-[32px] w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="relative w-24 h-24 mx-auto mb-6">
              <img src={draftSong.artworkUrl100.replace('100x100bb', '300x300bb')} className={`w-full h-full rounded-full shadow-lg border-2 border-zinc-800 object-cover ${playingSong === draftSong.previewUrl ? 'animate-[spin_10s_linear_infinite]' : ''}`} />
            </div>
            <p className="text-center font-bold text-sm truncate mb-1">{draftSong.trackName}</p>
            <p className="text-center text-[#1DB954] text-[10px] mb-8 font-bold">{draftSong.artistName}</p>
            <textarea placeholder="今日のVibeは？ (@でメンション)" value={draftCaption} onChange={(e) => setDraftCaption(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-xs text-white focus:outline-none min-h-[100px] resize-none mb-6" />
            <div className="flex gap-4">
              <button onClick={cancelDraft} className="flex-1 py-3.5 border border-zinc-800 rounded-xl text-xs font-bold uppercase">{t('cancel')}</button>
              <button onClick={checkAndPost} className="flex-1 py-3.5 bg-white text-black rounded-xl text-xs font-bold uppercase">{t('postVibe')}</button>
            </div>
          </div>
        </div>
      )}

      {showPostOverrideConfirm && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[950] flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowPostOverrideConfirm(null)}>
          <div className="bg-[#1c1c1e] border border-zinc-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <p className="text-center font-bold text-lg mb-6 leading-relaxed">今日はすでに投稿しています。<br />上書きして記録しますか？</p>
            <div className="flex gap-4">
              <button onClick={() => setShowPostOverrideConfirm(null)} className="flex-1 py-3.5 border border-zinc-800 rounded-xl text-xs font-bold uppercase">{t('cancel')}</button>
              <button onClick={() => executePost(new Date())} className="flex-1 py-3.5 bg-white text-black rounded-xl text-xs font-bold uppercase">上書きする</button>
            </div>
          </div>
        </div>
      )}

      {activeArtistProfile && (
        <div className="fixed inset-0 bg-black z-[700] animate-fade-in flex flex-col overflow-y-auto">
          <div className="absolute top-0 w-full h-[50vh] z-0 pointer-events-none">
            <img src={activeArtistProfile.artworkUrl} className="w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black"></div>
          </div>
          <div className="flex items-center p-4 sticky top-0 z-20">
            <button onClick={() => { setArtistSongs([]); setPlayingSong(null); handleGoBack(); }} className="text-white bg-black/40 backdrop-blur p-2 rounded-full"><IconChevronLeft /></button>
          </div>
          <div className="px-6 relative z-10 mt-[15vh] mb-8">
             <h1 className="text-5xl font-black tracking-tighter mb-2 break-all leading-tight drop-shadow-lg">{activeArtistProfile.artistName}</h1>
             <p className="text-xs text-zinc-300 font-bold mb-6 drop-shadow">{activeArtistProfile.artistId.toString().substring(0, 3)}K Followers</p>
             <div className="flex items-center gap-4 mb-6">
               <button onClick={() => artistSongs[0] && togglePlay(artistSongs[0].previewUrl)} className="w-14 h-14 bg-[#1DB954] rounded-full flex items-center justify-center text-black shadow-xl hover:scale-105 transition-transform">
                 {playingSong === artistSongs[0]?.previewUrl ? <IconStop /> : <IconPlay />}
               </button>
               <button onClick={() => toggleFavoriteArtist(activeArtistProfile)} className="w-12 h-12 bg-black/40 backdrop-blur rounded-full flex items-center justify-center border border-zinc-700/50">
                 <IconHeart filled={favoriteArtists.some(a => a.artistId === activeArtistProfile.artistId)} />
               </button>
             </div>
          </div>
          <div className="px-4 pb-24 relative z-10 bg-black min-h-[50vh]">
             {isArtistLoading ? <p className="text-center text-zinc-500 py-12">Loading tracks...</p> : (
               <>
                 {latestReleaseSong && (
                   <div className="mb-10">
                     <h3 className="text-lg font-bold mb-4 px-2">{t('latestRelease')}</h3>
                     <div onClick={() => setDraftSong(latestReleaseSong)} className="flex items-center gap-4 bg-[#1c1c1e] p-4 rounded-2xl cursor-pointer hover:bg-zinc-800 transition-colors group">
                       <div className="relative w-16 h-16 rounded overflow-hidden shadow-md flex-shrink-0">
                         <img src={latestReleaseSong.artworkUrl60.replace('60x60bb', '300x300bb')} className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100"><IconPlay /></div>
                       </div>
                       <div className="flex-1 overflow-hidden"><p className="font-bold text-base truncate">{latestReleaseSong.trackName}</p><p className="text-xs text-[#1DB954] font-bold mt-1">NEW</p></div>
                     </div>
                   </div>
                 )}
                 <h3 className="text-lg font-bold mb-4 px-2">{t('popularSongs')}</h3>
                 <div className="flex flex-col gap-1 mb-10">
                   {artistSongs.slice(0, 10).map((s, i) => (
                     <div key={i} onClick={() => setDraftSong(s)} className="flex items-center gap-4 py-3 px-2 hover:bg-zinc-800/50 rounded-xl cursor-pointer group">
                       <p className="text-zinc-500 font-bold text-sm w-4 text-right group-hover:hidden">{i+1}</p>
                       <div className="w-4 hidden group-hover:block text-[#1DB954]"><IconPlay /></div>
                       <img src={s.artworkUrl60} className="w-10 h-10 rounded object-cover shadow-sm" />
                       <div className="flex-1 overflow-hidden"><p className="font-bold text-sm truncate group-hover:text-[#1DB954] transition-colors">{s.trackName}</p></div>
                     </div>
                   ))}
                 </div>
                 {uniqueAlbums.length > 0 && (
                   <div>
                     <h3 className="text-lg font-bold mb-4 px-2">{t('popularAlbums')}</h3>
                     <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 px-2">
                       {uniqueAlbums.map((album, i) => (
                         <div key={i} onClick={() => setActiveAlbumProfile({collectionId: album.collectionId, collectionName: album.collectionName, artworkUrl: album.artworkUrl100.replace('100x100bb', '600x600bb'), artistName: album.artistName})} className="flex-shrink-0 w-32 cursor-pointer group">
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
        <div className="fixed inset-0 bg-black z-[750] animate-fade-in flex flex-col overflow-y-auto">
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
                   <div key={i} onClick={() => setDraftSong(tItem)} className="flex items-center gap-4 py-3 px-2 hover:bg-zinc-800/50 rounded-xl cursor-pointer border-b border-zinc-900/50 last:border-0">
                     <p className="text-zinc-500 font-bold text-sm w-6 text-right">{i+1}</p>
                     <div className="flex-1 overflow-hidden"><p className="font-bold text-sm truncate hover:text-[#1DB954] transition-colors">{tItem.trackName}</p></div>
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
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[950] flex flex-col justify-end animate-fade-in" onClick={() => { setShowCommCalendar(false); setSelectedModalDate(null); }}>
          <div className="bg-[#1c1c1e] rounded-t-[32px] p-6 shadow-2xl relative flex flex-col h-[85vh]" onClick={e => e.stopPropagation()}>
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
              {['日','月','火','水','木','金','土'].map(d => <div key={d} className="text-center text-[10px] text-zinc-500 font-bold mb-2">{d}</div>)}
              {Array.from({ length: new Date(commCalDate.getFullYear(), commCalDate.getMonth(), 1).getDay() }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: new Date(commCalDate.getFullYear(), commCalDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${commCalDate.getFullYear()}-${(commCalDate.getMonth()+1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                
                // 💡 参加人数が10人以上のコミュニティだけをカウント・表示対象にする
                const eventsToday = realCommunities.filter(c => c.date === dateStr && c.memberCount >= 10);
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

            {/* 💡 タップした日付のライブをカレンダーの下に表示する */}
            <div className="flex-1 overflow-y-auto scrollbar-hide mt-4 border-t border-zinc-800 pt-4">
              {selectedModalDate ? (
                <div className="flex flex-col gap-3 animate-fade-in">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{selectedModalDate.replace(/-/g, '/')} の公演</p>
                  {realCommunities.filter(c => c.date === selectedModalDate && c.memberCount >= 10).map(c => (
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
                <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 mb-4 shadow-lg"><IconTicket /></div>
                {/* 💡 公式マークを表示 */}
                <h2 className="text-2xl font-black text-center mb-2 flex items-center justify-center gap-2">
                  {activeCommunityDetail.name} 
                  {activeCommunityDetail.isVerified && <span className="text-[#1DB954] w-5 h-5 flex items-center"><IconVerified /></span>}
                </h2>
                <p className="text-sm text-[#1DB954] font-bold mb-4">{activeCommunityDetail.date}</p>
                <div className="flex -space-x-3 justify-center mb-2">
                  {mockUsers.slice(0, 3).map(u => <img key={u.id} src={u.avatar} className="w-9 h-9 rounded-full border-2 border-[#1c1c1e] object-cover" />)}
                  <div className="w-9 h-9 rounded-full bg-zinc-800 border-2 border-[#1c1c1e] flex items-center justify-center text-[10px] font-bold text-zinc-400 z-10">+{Math.max(0, activeCommunityDetail.memberCount - 3)}</div>
                </div>
                <p className="text-xs text-zinc-400">{activeCommunityDetail.memberCount}人が参加中</p>
             </div>
             <button onClick={() => joinCommunity(activeCommunityDetail)} className="w-full py-4 bg-white text-black rounded-xl text-sm font-bold shadow-lg hover:scale-105 transition-transform mb-2">コミュニティに参加する</button>
             
             {/* 💡 ユーザー作成の非公式ライブの場合のみ、通報ボタンを表示 */}
             {!activeCommunityDetail.isVerified && (
               <button onClick={() => handleReportCommunity(activeCommunityDetail.id)} className="w-full py-3 bg-transparent text-zinc-600 hover:text-red-500 rounded-xl text-[10px] font-bold transition-colors flex items-center justify-center gap-1.5 mt-2">
                 <IconWarning /> このライブ情報を嘘として通報する
               </button>
             )}
          </div>
        </div>
      )}

      {activeChatUserId && (
        <div className="fixed inset-0 bg-black z-[900] animate-fade-in flex flex-col">
          <div className="flex items-center p-4 bg-black/90 sticky top-0 border-b border-zinc-900 z-10">
　　　　　　<button onClick={handleGoBack}><IconChevronLeft /></button>
            <h2 className="text-white font-bold text-lg mx-auto pl-4 truncate px-2">
              {activeChatUserId.startsWith('com') ? chatCommunities.find(c => c.id === activeChatUserId)?.name : activeChatUserId.startsWith('g') ? chatGroups.find(g => g.id === activeChatUserId)?.name : mockUsers.find(u => u.id === activeChatUserId)?.name || "Chat"}
            </h2>
            {(activeChatUserId.startsWith('com') || activeChatUserId.startsWith('g')) ? (
               <button onClick={() => setShowChatDetails(true)} className="p-2 text-zinc-400 hover:text-white"><IconInfo /></button>
            ) : <div className="w-8"></div>}
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {(chatHistory[activeChatUserId] || []).map((msg: any) => {
               const sender = allProfiles.find(u => u.id === msg.senderId); 
               const isMe = msg.senderId === currentUser?.id || msg.senderId === 'me'; 
               const isGroup = activeChatUserId.startsWith('com') || activeChatUserId.startsWith('g');
               return (
                  <div key={msg.id} className={`flex gap-2 max-w-[85%] ${isMe ? 'self-end' : 'self-start'}`}>
                     {!isMe && sender && (
                       <img 
                         src={sender.avatar} 
                         className="w-8 h-8 rounded-full object-cover self-end flex-shrink-0 cursor-pointer hover:opacity-80" 
                         onClick={(e) => { 
                           e.stopPropagation(); 
                           setProfileBackTarget({ tab: 'chat', chatUserId: activeChatUserId }); // 💡 このチャットルームから来たと記憶させる
                           setViewingUser(sender); 
                           setActiveTab('other_profile'); 
                           setActiveChatUserId(null); 
                         }}
                       />
                     )}
                     <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                       {!isMe && sender && <span className="text-[10px] text-zinc-500 mb-1 ml-1">{sender.name}</span>}
                {/* 💡 自分のメッセージならクリックで送信取り消しできるようにする */}
              <div 
                  onClick={() => isMe ? deleteChatMessage(msg.id, activeChatUserId!) : null}
                  className={`px-3.5 py-2 w-fit h-fit break-words shadow-sm ${isMe ? 'bg-[#8de055] text-black rounded-[20px] rounded-br-[4px] cursor-pointer hover:opacity-80' : 'bg-[#2c2c2e] text-white rounded-[20px] rounded-bl-[4px]'}`}
                >
                  {msg.text.startsWith('[VOICE]') ? (
                     <audio controls src={msg.text.replace('[VOICE]', '')} className="max-w-[200px] h-10" />
                   ) : msg.text.startsWith('[IMAGE]') ? (
                     <img src={msg.text.replace('[IMAGE]', '')} className="max-w-[200px] rounded-lg border border-black/10" alt="chat image" />
                   ) : msg.text.startsWith('[FILE]') ? (
                     <a href={msg.text.split('|')[1]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-black/10 rounded-xl hover:bg-black/20 transition-colors" onClick={(e) => e.stopPropagation()}>
                       <span className="text-[15px] font-bold underline truncate max-w-[150px] text-current">📁 {msg.text.replace('[FILE]', '').split('|')[0]}</span>
                     </a>
                   ) : (
                     <p className="text-[15px] font-medium leading-snug">{msg.text}</p>
                   )}
                </div>
                       <div className="flex items-center gap-1 mt-1">
                         <span className="text-[9px] text-zinc-500">{displayLocalTime(msg.timestamp, timeZone)}</span>
                         {isMe && msg.isRead && <span className="text-[9px] text-[#1DB954] font-bold">既読</span>}
                       </div>
                     </div>
                  </div>
               );
             })}
          </div>
        {/* 💡 ＋ボタンを押した時に開くメニュー */}
          {showChatPlusMenu && (
            <div className="bg-[#1c1c1e] p-6 grid grid-cols-4 gap-4 border-t border-zinc-900 animate-fade-in absolute bottom-[68px] w-full z-20">
              <div className="flex flex-col items-center gap-2 cursor-pointer relative hover:opacity-80">
                <div className="w-12 h-12 bg-zinc-800 rounded-[18px] flex items-center justify-center text-white"><IconFile /></div>
                <span className="text-[11px] font-bold text-zinc-400">ファイル</span>
                <input type="file" onChange={(e) => { handleChatFileUpload(e); setShowChatPlusMenu(false); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              <div className="flex flex-col items-center gap-2 cursor-pointer hover:opacity-80" onClick={() => { showToast("音楽送信機能は開発中です"); setShowChatPlusMenu(false); }}>
                <div className="w-12 h-12 bg-zinc-800 rounded-[18px] flex items-center justify-center text-white"><IconMusic /></div>
                <span className="text-[11px] font-bold text-zinc-400">音楽</span>
              </div>
            </div>
          )}

          {/* 💡 マイクボタンを押した時に開く録音パネル (LINE風) */}
          {showVoiceMenu && (
            <div className="bg-[#1c1c1e] border-t border-zinc-900 animate-fade-in absolute bottom-[68px] w-full z-20 flex flex-col items-center justify-center min-h-[250px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
              <button onClick={cancelVoiceRecording} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white"><IconCross /></button>
              
              {/* 裏で音声を再生するための隠しプレイヤー */}
              {draftVoice && <audio ref={draftAudioRef} src={draftVoice.url} onEnded={() => setIsPlayingDraft(false)} className="hidden" />}

              {!isRecording && !draftVoice && (
                <>
                  <p className="text-zinc-400 text-sm font-bold mb-8">ボタンをタップして録音してください</p>
                  <div onClick={startVoiceRecording} className="w-28 h-28 rounded-full border-4 border-zinc-800 flex items-center justify-center cursor-pointer hover:bg-zinc-800/50 transition-colors">
                    <div className="w-10 h-10 bg-red-500 rounded-full"></div>
                  </div>
                </>
              )}

              {isRecording && (
                <>
                  <p className="text-red-500 text-3xl font-bold mb-8 tracking-widest">{Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}</p>
                  <div onClick={stopVoiceRecording} className="w-28 h-28 rounded-full border-4 border-red-500/30 flex items-center justify-center cursor-pointer hover:bg-red-500/10 transition-colors animate-pulse">
                    <div className="w-8 h-8 bg-red-500 rounded-sm"></div>
                  </div>
                </>
              )}

              {draftVoice && (
                <>
                  <p className="text-[#1DB954] text-3xl font-bold mb-8 tracking-widest">{Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}</p>
                  <div className="flex items-center gap-8">
                     <button onClick={cancelVoiceRecording} className="w-14 h-14 rounded-full border-2 border-zinc-700 flex items-center justify-center text-red-500 hover:bg-zinc-800 transition-colors">
                       <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                     </button>
                     <button onClick={toggleDraftPlay} className="w-24 h-24 rounded-full border-4 border-[#1DB954] flex items-center justify-center text-[#1DB954] hover:bg-[#1DB954]/10 transition-colors">
                       {isPlayingDraft ? <IconStop /> : <IconPlay />}
                     </button>
                     <button onClick={sendVoiceMessage} className="w-14 h-14 rounded-full border-2 border-zinc-700 flex items-center justify-center text-blue-500 hover:bg-zinc-800 pl-1 transition-colors">
                       <IconSend />
                     </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* LINE風の入力エリア（完成版） */}
          <div className="bg-[#0a0a0a] border-t border-zinc-900 flex flex-col relative z-30">
            <div className="p-3 flex gap-3 items-center">
              <button onClick={() => { setShowChatPlusMenu(!showChatPlusMenu); setShowVoiceMenu(false); }} className={`w-7 h-7 flex items-center justify-center transition-colors flex-shrink-0 ${showChatPlusMenu ? 'text-white rotate-45' : 'text-zinc-400 hover:text-white'}`}>
                 <IconPlus />
              </button>
              <div className="relative w-7 h-7 flex-shrink-0">
                <button className="w-full h-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors pointer-events-none">
                   <IconImage />
                </button>
                <input type="file" accept="image/*" onChange={handleChatFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              
              <div className="flex-1 bg-[#1c1c1e] rounded-full px-4 py-2 flex items-center">
                <input type="text" placeholder="Aa" value={chatMessageInput} onChange={(e) => setChatMessageInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submitChatMessage(activeChatUserId!); }} className="w-full bg-transparent text-[15px] text-white focus:outline-none" />
              </div>
              
              {chatMessageInput.trim() ? (
                <button onClick={() => submitChatMessage(activeChatUserId!)} className="w-8 h-8 rounded-full flex items-center justify-center bg-[#1DB954] text-black shadow-sm flex-shrink-0 transition-colors hover:scale-105">
                  <IconSend />
                </button>
              ) : (
                <button onClick={() => { setShowVoiceMenu(!showVoiceMenu); setShowChatPlusMenu(false); }} className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 transition-colors ${showVoiceMenu ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
                  <IconMic />
                </button>
              )}
            </div>
          </div>

          {showChatDetails && (
            <div className="absolute inset-0 bg-black/95 z-[950] flex flex-col animate-fade-in">
              <div className="flex items-center p-4 border-b border-zinc-900 sticky top-0 bg-black/90">
                <button onClick={() => setShowChatDetails(false)}><IconChevronLeft /></button>
                <h2 className="text-white font-bold text-lg mx-auto pr-8">詳細設定</h2>
              </div>
              <div className="flex border-b border-zinc-900">
                <button onClick={() => setChatDetailsTab('members')} className={`flex-1 py-4 text-sm font-bold ${chatDetailsTab === 'members' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}>メンバー</button>
                <button onClick={() => setChatDetailsTab('album')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 ${chatDetailsTab === 'album' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}><IconImage /> アルバム</button>
                <button onClick={() => setChatDetailsTab('notes')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 ${chatDetailsTab === 'notes' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}><IconPin /> ノート</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {chatDetailsTab === 'members' && (
                  <div className="flex flex-col gap-4">
                    {mockUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-2 hover:bg-[#1c1c1e] rounded-xl cursor-pointer">
                        <div className="flex items-center gap-3" onClick={() => { setViewingUser(u); setActiveTab('other_profile'); setShowChatDetails(false); setActiveChatUserId(null); }}>
                          <img src={u.avatar} className="w-12 h-12 rounded-full object-cover" />
                          <div><p className="font-bold text-sm">{u.name}</p><p className="text-xs text-zinc-500">@{u.handle}</p></div>
                        </div>
                        <button onClick={() => { setShowChatDetails(false); setActiveChatUserId(u.id); }} className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center hover:bg-zinc-700 transition-colors"><IconMessagePlus /></button>
                      </div>
                    ))}
                  </div>
                )}
                {chatDetailsTab === 'album' && (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                    <IconImage /><p className="mt-4 text-sm font-bold">まだ写真はありません</p>
                    <button className="mt-6 px-6 py-2 bg-[#1c1c1e] rounded-full text-white font-bold text-xs">写真をアップロード</button>
                  </div>
                )}
                {chatDetailsTab === 'notes' && (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                    <IconPin /><p className="mt-4 text-sm font-bold">ピン留めされたノートはありません</p>
                    <button className="mt-6 px-6 py-2 bg-[#1c1c1e] rounded-full text-white font-bold text-xs">ノートを作成</button>
                  </div>
                )}
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
                          <button onClick={() => setMatchFilter({...matchFilter, artists: matchFilter.artists.filter(fa => fa.artistId !== a.artistId)})} className="text-zinc-500 hover:text-white ml-1"><IconCross /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input type="text" placeholder="例: Tele, Vaundy" value={filterArtistInput} onChange={e => setFilterArtistInput(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500" />
                  {filterArtistSuggestions.length > 0 && filterArtistInput && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden z-50">
                      {filterArtistSuggestions.map(a => (
                        <div key={a.artistId} onMouseDown={(e) => { e.preventDefault(); if(!matchFilter.artists.some(fa => fa.artistId === a.artistId)) { setMatchFilter({...matchFilter, artists: [...matchFilter.artists, a]}); } setFilterArtistInput(""); }} className="flex items-center gap-3 p-3 text-xs text-white hover:bg-zinc-700 cursor-pointer border-b border-zinc-700 last:border-0">
                          <img src={a.artworkUrl} className="w-8 h-8 rounded-full object-cover" />
                          <span className="font-bold">{a.artistName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Hashtag / Live</label>
                  {matchFilter.hashtags.length > 0 && (<div className="flex flex-wrap gap-2 mb-3">{matchFilter.hashtags.map(h => (<div key={h} className="flex items-center bg-zinc-800 rounded-full px-3 py-1 gap-2"><span className="text-xs font-bold text-white">#{h}</span><button onClick={() => setMatchFilter({...matchFilter, hashtags: matchFilter.hashtags.filter(fh => fh !== h)})} className="text-zinc-500 hover:text-white ml-1"><IconCross /></button></div>))}</div>)}
                  {matchFilter.liveHistories.length > 0 && (<div className="flex flex-wrap gap-2 mb-3">{matchFilter.liveHistories.map(l => (<div key={l} className="flex items-center bg-zinc-800 rounded-full px-3 py-1 gap-2"><span className="text-xs font-bold text-white"><IconTicket /> {l}</span><button onClick={() => setMatchFilter({...matchFilter, liveHistories: matchFilter.liveHistories.filter(fl => fl !== l)})} className="text-zinc-500 hover:text-white ml-1"><IconCross /></button></div>))}</div>)}
                  <input type="text" placeholder="例: 邦ロック, VIVA LA ROCK" value={filterHashtagInput} onChange={e => setFilterHashtagInput(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500" />
                  {filterHashtagInput && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden z-50">
                      {allAvailableHashtags.filter(h => h.toLowerCase().includes(filterHashtagInput.toLowerCase())).slice(0,3).map(h => (<div key={h} onMouseDown={(e) => { e.preventDefault(); if(!matchFilter.hashtags.includes(h)) setMatchFilter({...matchFilter, hashtags: [...matchFilter.hashtags, h]}); setFilterHashtagInput(""); }} className="p-3 text-xs text-white hover:bg-zinc-700 cursor-pointer border-b border-zinc-700 last:border-0">#{h}</div>))}
                      {allAvailableLiveHistories.filter(l => l.toLowerCase().includes(filterHashtagInput.toLowerCase())).slice(0,3).map(l => (<div key={l} onMouseDown={(e) => { e.preventDefault(); if(!matchFilter.liveHistories.includes(l)) setMatchFilter({...matchFilter, liveHistories: [...matchFilter.liveHistories, l]}); setFilterHashtagInput(""); }} className="p-3 text-xs text-white hover:bg-zinc-700 cursor-pointer border-b border-zinc-700 last:border-0"><IconTicket /> {l}</div>))}
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Age Range</label>
                    <div className="flex items-center gap-2">
                      <select value={matchFilter.ageMin} onChange={e => setMatchFilter({...matchFilter, ageMin: parseInt(e.target.value)})} className="bg-black border border-zinc-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none appearance-none flex-1 text-center">{Array.from({length: 83}, (_, i) => 18 + i).map(y => <option key={y} value={y}>{y}</option>)}</select>
                      <span className="text-zinc-500 text-xs">~</span>
                      <select value={matchFilter.ageMax} onChange={e => setMatchFilter({...matchFilter, ageMax: parseInt(e.target.value)})} className="bg-black border border-zinc-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none appearance-none flex-1 text-center">{Array.from({length: 83}, (_, i) => 18 + i).map(y => <option key={y} value={y}>{y}</option>)}</select>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Gender</label>
                    <select value={matchFilter.gender} onChange={e => setMatchFilter({...matchFilter, gender: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none appearance-none"><option value="All">All</option><option value="Male">Male</option><option value="Female">Female</option></select>
                  </div>
                </div>
             </div>
             <button onClick={() => setShowMatchFilterModal(false)} className="w-full mt-8 bg-white text-black font-bold py-3.5 rounded-xl shadow-lg hover:bg-gray-200 transition-colors">適用して探す</button>
          </div>
        </div>
      )}

      {showMatchMessageModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[950] flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowMatchMessageModal(null)}>
          <div className="bg-[#1c1c1e] border border-zinc-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2 text-center">Send a Message</h3>
            <p className="text-xs text-zinc-400 text-center mb-6">メッセージを添えてVibeを送ると、返信率が上がります。</p>
            <textarea placeholder="初めまして！同じアーティストが好きで思わず反応しちゃいました。" value={matchMessageInput} onChange={e => setMatchMessageInput(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-xs text-white focus:outline-none min-h-[100px] resize-none mb-4" />
            <div className="flex gap-4"><button onClick={() => setShowMatchMessageModal(null)} className="flex-1 py-3 border border-zinc-800 rounded-xl text-xs font-bold uppercase hover:bg-zinc-800 transition-colors">{t('cancel')}</button><button onClick={() => handleSendVibeWithMessage(showMatchMessageModal)} className="flex-1 py-3 bg-[#1DB954] text-black rounded-xl text-xs font-bold uppercase hover:scale-105 transition-transform shadow-lg">Send</button></div>
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
                  const u = mockUsers.find(mu => mu.id === uid);
                  if (!u) return null; const isSelected = newGroupMembers.has(uid);
                  return (
                    <div key={uid} onClick={() => setNewGroupMembers(prev => { const next = new Set(prev); if(next.has(uid)) next.delete(uid); else next.add(uid); return next; })} className="flex items-center justify-between p-2 hover:bg-zinc-800/50 rounded-xl cursor-pointer">
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
                <div key={n.id} onClick={() => { setNotifications(prev => prev.map(p => p.id === n.id ? {...p, read: true} : p)); }} className="flex items-start gap-4 p-3 rounded-2xl hover:bg-zinc-800/50 transition-colors cursor-pointer relative">
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
            
            <p className="text-xs font-bold text-zinc-500 mb-2 px-2">{t('features')}</p>
            <div className="bg-[#1c1c1e] rounded-2xl mb-8"><div className="flex items-center justify-between p-4"><div className="flex items-center gap-3"><IconMusic /><p className="font-bold text-sm">{t('audio')}</p></div><button onClick={() => setSettings({...settings, audio: !settings.audio})} className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.audio ? 'bg-[#1DB954]' : 'bg-zinc-700'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${settings.audio ? 'translate-x-6' : 'translate-x-0'}`}></div></button></div></div>
            
            <p className="text-xs font-bold text-zinc-500 mb-2 px-2">{t('settings')}</p>
            <div className="bg-[#1c1c1e] rounded-2xl mb-8 flex flex-col">
               <div className="flex items-center justify-between p-4 border-b border-zinc-800/50"><div className="flex items-center gap-3"><IconBell /><p className="font-bold text-sm">{t('notifications')}</p></div><button onClick={() => { setSettings({...settings, notifications: !settings.notifications}); }} className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.notifications ? 'bg-[#1DB954]' : 'bg-zinc-700'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${settings.notifications ? 'translate-x-6' : 'translate-x-0'}`}></div></button></div>
               <div className="flex items-center justify-between p-4 border-b border-zinc-800/50"><div className="flex items-center gap-3"><IconLockSetting /><p className="font-bold text-sm">{t('privateAcc')}</p></div><button onClick={() => { setEditIsPrivate(!myProfile.isPrivate); setMyProfile({...myProfile, isPrivate: !myProfile.isPrivate}); }} className={`w-12 h-6 rounded-full p-1 transition-colors ${myProfile.isPrivate ? 'bg-white' : 'bg-zinc-700'}`}><div className={`w-4 h-4 rounded-full shadow-md transform transition-transform ${myProfile.isPrivate ? 'translate-x-6 bg-black' : 'translate-x-0 bg-white'}`}></div></button></div>
               <div className="relative flex items-center justify-between p-4 border-b border-zinc-800/50 cursor-pointer"><div className="flex items-center gap-3"><IconClock /><p className="font-bold text-sm">{t('timezone')}: {timeZone.split('/').pop()?.replace('_', ' ')}</p></div><IconChevronRight /><select value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"><optgroup label="Asia"><option value="Asia/Tokyo">Tokyo (JST)</option><option value="Asia/Seoul">Seoul (KST)</option><option value="Asia/Shanghai">Shanghai (CST)</option></optgroup><optgroup label="America"><option value="America/New_York">New York (EST/EDT)</option><option value="America/Los_Angeles">Los Angeles (PST/PDT)</option></optgroup><optgroup label="Europe"><option value="Europe/London">London (GMT/BST)</option><option value="Europe/Paris">Paris (CET/CEST)</option></optgroup></select></div>
               <div className="relative flex items-center justify-between p-4 cursor-pointer"><div className="flex items-center gap-3"><IconGlobe /><p className="font-bold text-sm">{t('language')}: {language}</p></div><IconChevronRight /><select value={language} onChange={(e) => setLanguage(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"><option value="日本語">日本語</option><option value="English">English</option><option value="中文">中文</option></select></div>
            </div>

            <p className="text-xs font-bold text-zinc-500 mb-2 px-2">{t('appInfo')}</p>
            <div className="bg-[#1c1c1e] rounded-2xl mb-8 flex flex-col">
               <div className="flex items-center justify-between p-4 border-b border-zinc-800/50 cursor-pointer" onClick={handleShareApp}><div className="flex items-center gap-3"><IconShareExternal /><p className="font-bold text-sm">{t('shareApp')}</p></div><IconChevronRight /></div>
               <div className="flex items-center justify-between p-4 border-b border-zinc-800/50 cursor-pointer"><div className="flex items-center gap-3"><IconStar /><p className="font-bold text-sm">{t('rateApp')}</p></div><IconChevronRight /></div>
               <div className="flex items-center justify-between p-4 border-b border-zinc-800/50 cursor-pointer" onClick={() => setShowAppInfoModal({title: t('help'), content: "サポート窓口: support@echo.es\n\n24時間以内に担当者がお答えします。"})}><div className="flex items-center gap-3"><IconHelp /><p className="font-bold text-sm">{t('help')}</p></div><IconChevronRight /></div>
               <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setShowAppInfoModal({title: t('appInfo'), content: "バージョン: 42.0.0\n\nEchoesは、音楽を通じて日々の記録を残す新しい形のSNSです。"})}><div className="flex items-center gap-3"><IconInfo /><p className="font-bold text-sm">{t('appInfo')}</p></div><IconChevronRight /></div>
            </div>
            {/* 💡 ここに運営用メニューを追加 */}
             <p className="text-xs font-bold text-red-500 mb-2 px-2">Admin (運営専用)</p>
             <div className="bg-[#1c1c1e] rounded-2xl mb-8 flex flex-col border border-red-500/30">
               <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-red-500/10 transition-colors rounded-2xl" onClick={() => { setShowSettingsMenu(false); setShowAdminDashboard(true); }}>
                 <div className="flex items-center gap-3 text-red-500"><IconWarning /><p className="font-bold text-sm">通報管理ダッシュボード</p></div>
                 <IconChevronRight />
               </div>
             </div>
             
             <button onClick={() => setShowLogoutConfirm(true)} className="w-full bg-[#1c1c1e] hover:bg-zinc-900 transition-colors text-white font-bold py-4 rounded-2xl text-center mb-4 shadow-sm">{t('logout')}</button>
             {/* 💡 アカウント退会ボタン */}
             <button onClick={() => setShowDeleteAccountConfirm(true)} className="w-full bg-transparent border border-red-500/30 hover:bg-red-500/10 transition-colors text-red-500 font-bold py-4 rounded-2xl text-center mb-10 shadow-sm">アカウントを完全に削除（退会）</button>
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
              この操作は取り消せません。<br/>プロフィール、Vibe、メッセージなど、<br/>すべてのデータが永久に削除されます。
            </p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteAccountConfirm(false)} className="flex-1 py-3.5 border border-zinc-800 rounded-xl text-xs font-bold uppercase hover:bg-zinc-800">キャンセル</button>
              <button onClick={async () => { 
                showToast("アカウントを削除しています...", "success");
                // 💡 本番環境ではここで Supabase の auth.admin.deleteUser などを行う
                setTimeout(async () => {
                  await supabase.auth.signOut(); 
                  window.location.reload(); 
                }, 1500);
              }} className="flex-1 py-3.5 bg-red-500 text-white rounded-xl text-xs font-bold uppercase hover:scale-105 transition-transform shadow-lg">退会する</button>
            </div>
          </div>
        </div>
      )}

      
      {/* 💡 運営専用：通報管理ダッシュボード画面 */}
      {showAdminDashboard && (
        <div className="fixed inset-0 bg-black/95 z-[900] animate-fade-in flex flex-col">
          <div className="flex items-center p-4 border-b border-zinc-900 sticky top-0 bg-black/90 backdrop-blur-md z-10">
            <button onClick={() => setShowAdminDashboard(false)}><IconChevronLeft /></button>
            <h2 className="text-red-500 font-bold text-lg mx-auto pr-8 flex items-center gap-2"><IconWarning /> 通報管理ダッシュボード</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">3回以上通報され、非表示状態になっているコミュニティのリストです。<br/>問題がなければ復旧、悪質な場合は削除してください。</p>
            
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

      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/90 z-[500] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[#1c1c1e] w-full max-w-sm rounded-[24px] p-6 flex flex-col gap-4 shadow-2xl relative max-h-[80vh] overflow-y-auto">
            <h3 className="text-center font-bold text-lg mb-2">{t('editProfile')}</h3>
            <div className="flex flex-col items-center mb-2"><div className="relative w-20 h-20 mb-3 group cursor-pointer mx-auto"><img src={editAvatar} className="w-full h-full rounded-full object-cover opacity-70 group-hover:opacity-50" /><div className="absolute inset-0 flex items-center justify-center pointer-events-none"><IconCamera /></div><input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" /></div></div>
            <div className="space-y-3">
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="名前" className="w-full bg-black border border-zinc-800 rounded-xl p-3.5 text-sm text-white focus:outline-none" />
              <div className="flex items-center bg-black border border-zinc-800 rounded-xl overflow-hidden focus-within:border-zinc-500"><span className="pl-3.5 text-zinc-500 font-bold">@</span><input type="text" value={editHandle} onChange={(e) => setEditHandle(e.target.value)} placeholder="ユーザーID" className="w-full bg-transparent p-3.5 text-sm text-white focus:outline-none" /></div>
              <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="自己紹介" className="w-full bg-black border border-zinc-800 rounded-xl p-3.5 text-sm text-white focus:outline-none min-h-[60px]" />
              <div><label className="text-[10px] text-zinc-500 ml-1 mb-1 block">ハッシュタグ (カンマ区切り)</label><input type="text" value={editHashtags} onChange={(e) => setEditHashtags(e.target.value)} placeholder="例: 邦ロック, Vaundy" className="w-full bg-black border border-zinc-800 rounded-xl p-3.5 text-sm text-white focus:outline-none" /></div>
              <div><label className="text-[10px] text-zinc-500 ml-1 mb-1 block">ライブ参戦履歴 (カンマ区切り)</label><input type="text" value={editLiveHistory} onChange={(e) => setEditLiveHistory(e.target.value)} placeholder="例: Tele 2026ツアー, VIVA LA ROCK" className="w-full bg-black border border-zinc-800 rounded-xl p-3.5 text-sm text-white focus:outline-none" /></div>
            </div>
            <div className="flex gap-3 mt-4 sticky bottom-0 bg-[#1c1c1e] pt-2"><button onClick={() => setIsEditingProfile(false)} className="flex-1 py-3.5 border border-zinc-800 rounded-xl text-xs font-bold uppercase">{t('cancel')}</button><button onClick={saveProfileChanges} className="flex-1 py-3.5 bg-white text-black rounded-xl text-xs font-bold uppercase">保存</button></div>
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

      {showUserListModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[900] flex items-center justify-center p-6 animate-fade-in" onClick={() => {setShowUserListModal(null); setModalSearchQuery("");}}>
          <div className="bg-[#1c1c1e] border border-zinc-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-widest">{showUserListModal}</h3>
              <button onClick={() => {setShowUserListModal(null); setModalSearchQuery("");}} className="text-zinc-500 hover:text-white p-2"><IconCross /></button>
            </div>
            <div className="relative mb-4 shrink-0">
              <div className="absolute left-3 top-1/2 -translate-y-1/2"><IconSearch /></div>
              <input type="text" placeholder="Search users..." value={modalSearchQuery} onChange={(e) => setModalSearchQuery(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-lg py-2 pl-10 text-xs text-white focus:outline-none" />
            </div>
            <div className="flex flex-col gap-5 overflow-y-auto pr-2 flex-1 scrollbar-hide">
              {displayModalUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setViewingUser(u); setActiveTab('other_profile'); setShowUserListModal(null); }}>
                    <img src={u.avatar} className="w-10 h-10 rounded-full object-cover border border-zinc-800" />
                    <div><p className="font-bold text-xs flex items-center">{u.name}</p><p className="text-[10px] text-zinc-500">@{u.handle}</p></div>
                  </div>
                  <button onClick={() => toggleFollow(u.id)} className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${followedUsers.has(u.id) ? 'border border-zinc-700 text-zinc-400' : 'bg-white text-black'}`}>{followedUsers.has(u.id) ? 'Following' : 'Follow'}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6">
        {activeTab === 'home' && (
          <div className="animate-fade-in mt-4">
            <header className="flex justify-between items-center mb-6 relative z-50">
               <h1 className="text-4xl font-bold italic">Echoes</h1>
               <button onClick={() => setShowNotifications(true)} className="relative p-2 z-50 pointer-events-auto">
                 <IconBell />
                 {unreadNotificationsCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black"></span>}
               </button>
            </header>

            {/* 💡 フィード切り替えタブ */}
            <div className="flex gap-6 mb-6 px-1 border-b border-zinc-900">
              <button 
                onClick={() => setHomeFeedMode('all')} 
                className={`pb-2 text-sm font-bold transition-colors ${homeFeedMode === 'all' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}
              >
                Everyone
              </button>
              <button 
                onClick={() => setHomeFeedMode('following')} 
                className={`pb-2 text-sm font-bold transition-colors ${homeFeedMode === 'following' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}
              >
                Following
              </button>
            </div>
            
            <div className="relative mb-10 z-40">
              <input type="text" placeholder={t('searchPlaceholder')} onFocus={() => setIsSearchFocused(true)} onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#1c1c1e] rounded-xl p-4 text-sm text-white focus:outline-none focus:border-zinc-500 transition-all shadow-sm" />
              {isSearchFocused && searchQuery && (searchArtistInfo || searchResults.length > 0) && (
                <div className="absolute top-full left-0 w-full mt-2 bg-[#1c1c1e] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl max-h-[350px] overflow-y-auto">
                  {searchArtistInfo && (
                    <div className="p-4 border-b border-zinc-800 flex items-center gap-4 cursor-pointer hover:bg-zinc-800/50" onMouseDown={e => handleArtistClick(e, searchArtistInfo.artistId, searchArtistInfo.artistName, searchArtistInfo.artworkUrl)}>
                       <img src={searchArtistInfo.artworkUrl} className="w-12 h-12 rounded-full object-cover" />
                       <div className="flex-1"><p className="font-bold text-sm">{searchArtistInfo.artistName}</p><p className="text-[10px] text-zinc-400 mt-0.5">アーティスト</p></div>
                       <IconChevronRight />
                    </div>
                  )}
                  {searchResults.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase px-4 pt-4 pb-2">{t('topResults')}</p>
                      {searchResults.map(tr => (
                        <div key={tr.trackId} onMouseDown={(e) => { e.preventDefault(); setDraftSong(tr); }} className="p-4 flex items-center gap-4 hover:bg-zinc-800 cursor-pointer">
                          <img src={tr.artworkUrl60} className="w-10 h-10 rounded" />
                          <div className="flex-1 overflow-hidden"><p className="font-bold text-sm truncate">{tr.trackName}</p><p className="text-[10px] text-zinc-400 mt-0.5 truncate">{tr.artistName}</p></div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
              {isSearchFocused && !searchQuery && trendingSongs.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-2 bg-[#1c1c1e] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl max-h-[300px] overflow-y-auto">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase px-4 pt-4 pb-2 flex items-center"><IconTrend />Trending Now</p>
                  {trendingSongs.map((tr, i) => (
                    <div key={tr.trackId} onMouseDown={(e) => { e.preventDefault(); setDraftSong(tr); }} className="p-4 flex items-center gap-4 hover:bg-zinc-800 cursor-pointer group">
                      <p className="text-zinc-600 font-bold text-sm w-4 text-right group-hover:hidden">{i+1}</p>
                      <div className="w-4 text-[#1DB954] hidden group-hover:block"><IconPlay /></div>
                      <img src={tr.artworkUrl60} className="w-10 h-10 rounded" />
                      <div className="flex-1 overflow-hidden"><p className="font-bold text-sm truncate">{tr.trackName}</p><p className="text-[10px] text-zinc-400 mt-0.5 truncate">{tr.artistName}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6">
              {allFeedVibes.length === 0 && !isLoadingVibes ? (
                <p className="text-center text-zinc-500 py-20 text-sm">今日のVibeを記録しましょう</p>
              ) : (
                allFeedVibes.map(renderFeedCard)
              )}
              
              {/* 💡 無限スクロールの読み込み検知用ブロック */}
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

        {activeTab === 'search' && (
          <div className="mt-6 animate-fade-in px-1 pb-10">
            <header className="flex justify-center mb-6"><h2 className="text-xl font-black tracking-tight">Echoes.</h2></header>
            <div className="flex bg-[#1c1c1e] p-1 rounded-xl mb-6 mx-2 border border-zinc-800">
               <button onClick={() => setDiscoverTabMode('users')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${discoverTabMode === 'users' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>People</button>
               <button onClick={() => setDiscoverTabMode('communities')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${discoverTabMode === 'communities' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>Communities</button>
            </div>

            {discoverTabMode === 'users' ? (
              <div className="px-2">
                <div className="relative mb-6">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500"><IconSearch /></div>
                  <input type="text" placeholder="ユーザーを検索" className="w-full bg-[#1c1c1e] border border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-[13px] font-bold text-white focus:outline-none" value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} onFocus={() => setUserSearchFocused(true)} onBlur={() => setTimeout(() => setUserSearchFocused(false), 200)} />
                  {userSearchFocused && userSearchQuery && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden z-50 shadow-2xl">
                      {realUserSearchResults.map(u => (
                        <div key={u.id} onMouseDown={(e) => { e.preventDefault(); setViewingUser(u); setActiveTab('other_profile'); }} className="flex items-center gap-3 p-3 text-xs text-white hover:bg-zinc-700 cursor-pointer border-b border-zinc-700 last:border-0">
                          <img src={u.avatar} className="w-8 h-8 rounded-full object-cover" />
                          <div className="flex flex-col">
                            <span className="font-bold">{u.name}</span>
                            <span className="text-[10px] text-zinc-400">@{u.handle}</span>
                          </div>
                        </div>
                      ))}
                      {realUserSearchResults.length === 0 && (
                         <div className="p-4 text-xs text-zinc-500 text-center">ユーザーが見つかりません</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="mb-10">
                   <p className="text-xs font-bold text-zinc-500 mb-4 px-2">おすすめの友達</p>
                   {mockUsers.filter(u => u.category === 'suggested').slice(0, 3).map(u => (
                     <div key={u.id} className="flex items-center justify-between py-2 px-1 mb-1"><div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => { setViewingUser(u); setActiveTab('other_profile'); }}><img src={u.avatar} className="w-[52px] h-[52px] rounded-full object-cover" /><div><p className="font-bold text-[15px]">{u.name}</p><p className="text-xs text-zinc-400">@{u.handle}</p></div></div><button onClick={() => toggleFollow(u.id)} className={`px-4 py-1.5 rounded-full text-xs font-bold ${followedUsers.has(u.id) ? 'bg-zinc-800 text-white' : 'bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white'}`}>{followedUsers.has(u.id) ? 'フォロー中' : 'フォロー'}</button></div>
                   ))}
                </div>
                <div className="mb-10">
                   <p className="text-xs font-bold text-zinc-500 mb-4 px-2">音楽の好みが近いユーザー</p>
                   {mockUsers.filter(u => u.category === 'similar').slice(0, 3).map(u => (
                     <div key={u.id} className="flex items-center justify-between py-2 px-1 mb-1"><div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => { setViewingUser(u); setActiveTab('other_profile'); }}><img src={u.avatar} className="w-[52px] h-[52px] rounded-full object-cover" /><div><p className="font-bold text-[15px]">{u.name}</p><p className="text-[11px] text-[#1DB954] font-bold mt-0.5 flex items-center"><IconMusicSmall /> {u.similarMusic}</p></div></div><button onClick={() => toggleFollow(u.id)} className={`px-4 py-1.5 rounded-full text-xs font-bold ${followedUsers.has(u.id) ? 'bg-zinc-800 text-white' : 'bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white'}`}>{followedUsers.has(u.id) ? 'フォロー中' : 'フォロー'}</button></div>
                   ))}
                </div>
                <div className="mb-10">
                   <p className="text-xs font-bold text-zinc-500 mb-4 px-2">人気のアカウント</p>
                   {mockUsers.filter(u => u.category === 'famous').slice(0, 3).map(u => (
                     <div key={u.id} className="flex items-center justify-between py-2 px-1 mb-1"><div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => { setViewingUser(u); setActiveTab('other_profile'); }}><img src={u.avatar} className="w-[52px] h-[52px] rounded-full object-cover" /><div><p className="font-bold text-[15px] flex items-center">{u.name} <IconVerified /></p><p className="text-xs text-zinc-400">@{u.handle}</p></div></div><button onClick={() => toggleFollow(u.id)} className={`px-4 py-1.5 rounded-full text-xs font-bold ${followedUsers.has(u.id) ? 'bg-zinc-800 text-white' : 'bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white'}`}>{followedUsers.has(u.id) ? 'フォロー中' : 'フォロー'}</button></div>
                   ))}
                </div>
              </div>
            ) : (
              <div className="px-2">
                <div className="relative mb-6">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500"><IconSearch /></div>
                  <input type="text" placeholder="ライブ・公演名でコミュニティを検索" className="w-full bg-[#1c1c1e] border border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-[13px] font-bold text-white focus:outline-none" value={communitySearchQuery} onChange={(e) => setCommunitySearchQuery(e.target.value)} onFocus={() => setCommunitySearchFocused(true)} onBlur={() => setTimeout(() => setCommunitySearchFocused(false), 200)} />
                  {communitySearchFocused && suggestedCommunities.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden z-50 shadow-2xl">
                      {suggestedCommunities.map(c => (
                        <div key={c.id} onMouseDown={(e) => { e.preventDefault(); setActiveCommunityDetail(c); }} className="flex items-center gap-3 p-3 text-xs text-white hover:bg-zinc-700 cursor-pointer border-b border-zinc-700 last:border-0"><IconTicket /><span className="font-bold">{c.name}</span></div>
                      ))}
                    </div>
                  )}
                </div>
<div onClick={() => setShowCommCalendar(true)} className="mb-6 relative bg-[#1c1c1e] p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-zinc-800 transition-colors shadow-sm">
                  <div className="flex items-center gap-3">
                    <IconCalendar />
                    <span className="text-sm font-bold text-white">{communityDateFilter ? `${communityDateFilter.replace(/-/g, '/')} の公演` : "カレンダーから探す"}</span>
                  </div>
                  {communityDateFilter ? (
                    <button onClick={(e) => { e.stopPropagation(); setCommunityDateFilter(""); }} className="w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white"><IconCross /></button>
                  ) : (
                    <IconChevronRight />
                  )}
                </div>
                <div className="bg-[#1c1c1e] rounded-3xl p-5 mb-8 shadow-sm">
                   <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><IconCrown /> 人気公演コミュニティ</h3>
                   <div className="flex flex-col">{suggestedCommunities.map((c, i) => (
                         <div key={c.id} className="flex items-center justify-between py-3 border-b border-zinc-800/50 last:border-0 cursor-pointer group" onClick={() => setActiveCommunityDetail(c)}>
                           <div className="flex items-center gap-4 flex-1 overflow-hidden">
                             <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 font-bold text-[10px] flex items-center justify-center flex-shrink-0">{i+1}</span>
                             <div className="flex-1 overflow-hidden">
                               <p className="font-bold text-sm text-white truncate group-hover:text-[#1DB954] transition-colors flex items-center gap-1.5">
                                 {c.name} {c.isVerified && <span className="text-[#1DB954] w-3.5 h-3.5 flex items-center"><IconVerified /></span>}
                               </p>
                               <p className="text-[10px] text-zinc-500">{c.date} • {c.memberCount}人が参加中</p>
                             </div>
                           </div>
                           <IconChevronRight />
                         </div>
                      ))}
                   </div>
                   <button onClick={() => setShowCreateCommunityModal(true)} className="w-full mt-4 py-4 border border-dashed border-zinc-700 text-zinc-400 rounded-xl text-sm font-bold hover:bg-zinc-800 hover:text-white transition-colors flex items-center justify-center gap-2">
                     <IconPlus /> 探しているライブがない場合は新しく作成
                   </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'match' && (
          <div className="mt-8 animate-fade-in flex flex-col items-center justify-center h-[calc(100vh-140px)]">
            <div className="absolute top-8 w-full px-6 flex justify-between items-center z-10"><div className="w-8"></div><h2 className="text-2xl font-bold tracking-tight text-center">{t('match')}</h2><button onClick={() => setShowMatchFilterModal(true)} className="p-2 bg-[#1c1c1e] rounded-full text-zinc-400 hover:text-white transition-colors shadow-lg"><IconFilter /></button></div>
            {matchIndex < filteredMatchUsers.length ? (
              <div className="w-full max-w-sm bg-[#1c1c1e] border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col max-h-[75vh]">
                <div className="relative h-64 w-full flex-shrink-0 cursor-pointer" onClick={() => { setViewingUser(filteredMatchUsers[matchIndex]); setActiveTab('other_profile'); }}>
                  <img src={filteredMatchUsers[matchIndex].avatar} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1e] via-transparent to-transparent"></div>
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-1.5 border border-white/10"><IconSparkles /><span className="text-xs font-bold text-white">{getVibeMatchScore(myProfile.id, filteredMatchUsers[matchIndex].id)}% Match</span></div>
                  <div className="absolute bottom-4 left-4 right-4"><h3 className="text-2xl font-black text-white flex items-center gap-2">{filteredMatchUsers[matchIndex].name} <span className="text-xs font-bold text-zinc-400 bg-black/50 px-2 py-0.5 rounded-full">{filteredMatchUsers[matchIndex].age || ''}</span></h3><p className="text-sm text-zinc-300">@{filteredMatchUsers[matchIndex].handle}</p></div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 pb-28 scrollbar-hide">
                  <p className="text-sm text-white mb-4 leading-relaxed">{filteredMatchUsers[matchIndex].bio}</p>
                  <div className="flex flex-wrap gap-2 mb-4">{(filteredMatchUsers[matchIndex].hashtags || []).map((h, i) => (<span key={`h-${i}`} className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded text-[10px]">#{h}</span>))}</div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1">Top Artists</p>
                  <div className="flex flex-wrap gap-2 mb-4">{(filteredMatchUsers[matchIndex].topArtists || []).map((a, i) => (<span key={i} className="px-3 py-1.5 bg-[#1DB954]/10 text-[#1DB954] rounded-full text-xs font-bold flex items-center"><IconMusicSmall /> {a}</span>))}</div>
                </div>
                <div className="absolute bottom-6 left-0 w-full flex justify-center gap-4 px-6 bg-gradient-to-t from-[#1c1c1e] pt-6"><button onClick={() => setMatchIndex(prev => prev + 1)} className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:bg-zinc-700 transition-colors shadow-lg flex-shrink-0"><IconCross /></button><button onClick={() => handleSendVibe(filteredMatchUsers[matchIndex].id, filteredMatchUsers[matchIndex].name)} className="flex-1 h-14 bg-[#1c1c1e] border border-zinc-700 rounded-full flex items-center justify-center text-white font-bold text-sm hover:bg-zinc-800 transition-colors shadow-lg gap-2"><IconSparkles /> 気になる</button><button onClick={() => setShowMatchMessageModal(filteredMatchUsers[matchIndex].id)} className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform shadow-lg flex-shrink-0"><IconComment /></button></div>
              </div>
            ) : <div className="text-center mt-20"><IconSearch/><p className="font-bold mt-4">ユーザーが見つかりません</p></div>}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="mt-8 animate-fade-in px-2">
            <h2 className="text-2xl font-bold tracking-tight mb-6 px-2">{t('chat')}</h2>
            <div className="flex bg-[#1c1c1e] p-1 rounded-xl mb-6 mx-2 border border-zinc-800">
               <button onClick={() => setChatTabMode('friends')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-colors ${chatTabMode === 'friends' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>{t('friendsChat')}</button>
               <button onClick={() => setChatTabMode('matches')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-colors ${chatTabMode === 'matches' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>{t('matchesChat')}</button>
               <button onClick={() => setChatTabMode('groups')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-colors ${chatTabMode === 'groups' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>{t('groupsChat')}</button>
               <button onClick={() => setChatTabMode('community')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-colors ${chatTabMode === 'community' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>{t('communityChat')}</button>
            </div>
            
            {chatTabMode === 'groups' && (
              <div className="px-2 mb-4">
                <button onClick={() => setShowCreateGroupModal(true)} className="w-full py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-bold text-[#1DB954] hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
                   グループを作成
                </button>
              </div>
            )}

            <div className="flex flex-col px-2">
              {chatTabMode === 'friends' && Object.keys(chatHistory).filter(id => !matchedUsers.has(id) && !id.startsWith('com') && !id.startsWith('g')).map(partnerId => {
                const u = allProfiles.find(x => x.id === partnerId);
                const lastMsg = chatHistory[partnerId][chatHistory[partnerId].length - 1];
                
                return (
                  <div key={partnerId} onClick={() => setActiveChatUserId(partnerId)} className="flex items-center gap-4 p-3 hover:bg-[#1c1c1e] rounded-2xl cursor-pointer transition-colors group relative">
                    <img 
                      src={u?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80"} 
                      className="w-14 h-14 rounded-full object-cover flex-shrink-0 border border-zinc-800 hover:opacity-80 relative z-10" 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (u) {
                          setProfileBackTarget({ tab: 'chat', chatUserId: null }); // 💡 チャット一覧から来たと記憶させる
                          setViewingUser(u);
                          setActiveTab('other_profile');
                        }
                      }}
                    />
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-sm truncate">{u?.name || "ユーザー"}</p>
                        <span className="text-[9px] text-zinc-500">{lastMsg ? displayLocalTime(lastMsg.timestamp, timeZone) : ""}</span>
                      </div>
<p className="text-xs text-zinc-400 truncate mt-0.5">
  {lastMsg ? (
    lastMsg.text.startsWith('[VOICE]') ? 'ボイスメッセージ' :
    lastMsg.text.startsWith('[IMAGE]') ? '画像を送信しました' :
    lastMsg.text.startsWith('[FILE]') ? 'ファイルを送信しました' :
    lastMsg.text
  ) : "メッセージを送ろう"}
</p>
                    </div>
                    {chatHistory[partnerId].some(m => m.senderId !== currentUser?.id && !m.isRead) && (
                      <div className="absolute right-4 bottom-4 w-2 h-2 bg-[#1DB954] rounded-full shadow-[0_0_8px_#1DB954]"></div>
                    )}
                  </div>
                );
              })}
              {chatTabMode === 'friends' && Object.keys(chatHistory).filter(id => !matchedUsers.has(id) && !id.startsWith('com') && !id.startsWith('g')).length === 0 && (
                <div className="py-20 text-center">
                  <p className="text-zinc-500 text-sm">メッセージはまだありません</p>
                </div>
              )}
              {chatTabMode === 'matches' && Array.from(matchedUsers).map(uid => {
                const u = mockUsers.find(x => x.id === uid);
                return u ? (<div key={uid} onClick={() => setActiveChatUserId(uid)} className="flex items-center gap-4 p-3 hover:bg-[#1c1c1e] rounded-2xl cursor-pointer transition-colors group"><img src={u.avatar} className="w-14 h-14 rounded-full object-cover flex-shrink-0" /><div className="flex-1 overflow-hidden"><p className="font-bold text-sm truncate">{u.name}</p><p className="text-xs text-zinc-400 truncate">メッセージを送ろう</p></div></div>) : null;
              })}
              {chatTabMode === 'groups' && chatGroups.map(g => (<div key={g.id} onClick={() => setActiveChatUserId(g.id)} className="flex items-center gap-4 p-3 hover:bg-[#1c1c1e] rounded-2xl cursor-pointer"><div className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden relative"><IconUsers /></div><div className="flex-1 overflow-hidden z-10"><p className="font-bold text-sm truncate">{g.name}</p><p className="text-xs text-zinc-400 truncate">参加しました</p></div></div>))}
              {chatTabMode === 'community' && chatCommunities.map(c => (<div key={c.id} onClick={() => setActiveChatUserId(c.id)} className="flex items-center gap-4 p-3 hover:bg-[#1c1c1e] rounded-2xl cursor-pointer"><div className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden relative"><IconTicket /></div><div className="flex-1 overflow-hidden z-10"><p className="font-bold text-sm truncate">{c.name}</p><p className="text-xs text-zinc-400 truncate">参加しました</p></div></div>))}
            </div>
          </div>
        )}

        {activeTab === 'calendar' && ( 
          <div className="mt-8 animate-fade-in pb-10">
            {renderCalendar()}
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
                    <div className="py-6 text-center text-zinc-500 text-xs font-bold animate-pulse">分析中...</div>
                  )}
                </div>
              </div>
            </div>
          </div> 
        )}

        {(activeTab === 'profile' || activeTab === 'other_profile') && (
          <div className="mt-4 flex flex-col items-center animate-fade-in px-4">
            <div className="w-full flex justify-between items-center mb-6 relative z-50">
              {activeTab === 'other_profile' ? (
                <button onClick={handleGoBack} className="relative z-50 p-3 pointer-events-auto"><IconChevronLeft /></button>
              ) : (
                <div className="w-10"></div>
              )}
              {activeTab === 'profile' && (
                <button onClick={() => setShowSettingsMenu(true)} className="ml-auto relative z-50 p-3 text-white hover:text-zinc-300 pointer-events-auto">
                  <IconGear />
                </button>
              )}
            </div>
            
            <div className="relative"><img src={activeTab === 'profile' ? myProfile.avatar : viewingUser?.avatar} className="w-[100px] h-[100px] rounded-full object-cover mb-4 shadow-xl border border-zinc-800" /></div>
            <h2 className="text-[22px] font-bold flex items-center">{activeTab === 'profile' ? myProfile.name : viewingUser?.name}</h2>
            <p className="text-sm text-zinc-500 font-bold mt-1">@{activeTab === 'profile' ? myProfile.handle : viewingUser?.handle}</p>
            
            {activeTab === 'profile' && myStreak > 0 && (<div className="mt-3 flex items-center bg-[#1c1c1e] border border-orange-500/30 px-3 py-1.5 rounded-full shadow-sm"><IconFlame /><span className="text-[11px] font-bold text-orange-400">{myStreak}日連続記録中</span></div>)}
            <div className="flex gap-4 mt-5 text-sm font-bold"><span className="cursor-pointer" onClick={() => setShowUserListModal('FOLLOWING')}>{formatCount(activeTab === 'profile' ? followedUsers.size : viewingUserStats.following)} フォロー中</span><span className="text-zinc-600">•</span><span className="cursor-pointer" onClick={() => setShowUserListModal('FOLLOWERS')}>{formatCount(activeTab === 'profile' ? myFollowers.size : viewingUserStats.followers)} フォロワー</span></div>
            <p className="text-zinc-300 text-sm mt-4 text-center max-w-xs">{activeTab === 'profile' ? myProfile.bio : viewingUser?.bio}</p>
            <div className="flex flex-col items-center mt-3 gap-2 w-full max-w-xs"><div className="flex flex-wrap justify-center gap-1.5">{(activeTab === 'profile' ? myProfile.hashtags : viewingUser?.hashtags)?.map((h, i) => (<span key={i} className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded text-[10px]">#{h}</span>))}</div></div>
            
            {activeTab === 'profile' && favoriteArtists.length > 0 && (
              <div className="w-full mt-10">
                <p className="text-[13px] font-bold text-white mb-4 w-full text-left">{t('favoriteArtists')}</p>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                  {favoriteArtists.map((artist, i) => (
                    <div key={i} onClick={(e) => handleArtistClick(e, artist.artistId, artist.artistName, artist.artworkUrl)} className="flex flex-col items-center flex-shrink-0 w-16 cursor-pointer group">
                      <img src={artist.artworkUrl} className="w-16 h-16 rounded-full object-cover border border-zinc-800 shadow-md group-hover:scale-105 transition-transform" />
                      <p className="text-[10px] font-bold text-zinc-400 mt-2 truncate w-full text-center group-hover:text-white transition-colors">{artist.artistName}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeTab === 'other_profile' && viewingUser && vibeMatchData && (
              <div onClick={() => setShowVibeMatchDetails(true)} className="mt-5 w-full max-w-[200px] bg-[#1c1c1e] border border-zinc-800 rounded-xl p-3 flex flex-col items-center shadow-lg cursor-pointer hover:bg-zinc-800/50 transition-colors">
                <div className="flex justify-between w-full mb-1"><span className="text-[10px] font-bold text-zinc-400 uppercase">Vibe Match</span><span className="text-[10px] font-bold text-[#1DB954]">{vibeMatchData.score}%</span></div>
                <div className="w-full bg-zinc-900 rounded-full h-1.5"><div className="bg-[#1DB954] h-full rounded-full" style={{width: `${vibeMatchData.score}%`}}></div></div>
              </div>
            )}

            {activeTab === 'other_profile' && showVibeMatchDetails && viewingUser && vibeMatchData && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[950] flex flex-col justify-end animate-fade-in" onClick={() => setShowVibeMatchDetails(false)}>
                <div className="bg-[#1c1c1e] rounded-t-[32px] p-8 w-full shadow-2xl relative flex flex-col items-center" onClick={e => e.stopPropagation()}>
                  <div className="w-12 h-1.5 bg-zinc-800 rounded-full mb-6 cursor-pointer" onClick={() => setShowVibeMatchDetails(false)}></div>
                  <h3 className="text-2xl font-black mb-2">{vibeMatchData.score}% Match</h3>
                  <p className="text-xs text-zinc-400 mb-8 text-center px-4">あなたと{viewingUser.name}さんの音楽の好みの分析結果です。</p>

                  <div className="w-full mb-6">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Top Shared Artists</p>
                    <p className="text-sm font-bold text-white mb-4">お互いにこれらのアーティストをよく聴いています！</p>
                    <div className="flex gap-3">
                      {vibeMatchData.sharedArtists.map((a, i) => (
                        <div key={i} className="px-3 py-1.5 bg-[#1DB954]/10 text-[#1DB954] rounded-full text-xs font-bold flex items-center"><IconMusicSmall /> {a}</div>
                      ))}
                    </div>
                  </div>

                  <div className="w-full mb-8">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Shared Genres</p>
                    <div className="flex flex-col gap-4">
                      <div>
                        <div className="flex justify-between w-full mb-1"><span className="text-xs font-bold text-white">{vibeMatchData.genre1}</span><span className="text-xs font-bold text-[#1DB954]">{vibeMatchData.genre1Score}%</span></div>
                        <div className="w-full bg-zinc-900 rounded-full h-1.5"><div className="bg-[#1DB954] h-full rounded-full" style={{width: `${vibeMatchData.genre1Score}%`}}></div></div>
                      </div>
                      <div>
                        <div className="flex justify-between w-full mb-1"><span className="text-xs font-bold text-white">{vibeMatchData.genre2}</span><span className="text-xs font-bold text-[#1DB954]">{vibeMatchData.genre2Score}%</span></div>
                        <div className="w-full bg-zinc-900 rounded-full h-1.5"><div className="bg-[#1DB954] h-full rounded-full opacity-60" style={{width: `${vibeMatchData.genre2Score}%`}}></div></div>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => { setShowVibeMatchDetails(false); setActiveChatUserId(viewingUser.id); setActiveTab('chat'); }} className="w-full py-4 bg-[#1DB954] text-black rounded-xl font-bold flex justify-center items-center gap-2 hover:scale-105 transition-transform">
                    <IconMessagePlus /> 音楽の趣味が合うね！とメッセージを送る
                  </button>
                </div>
              </div>
            )}
            
            {activeTab === 'profile' ? (
              <button onClick={openEditProfile} className="mt-6 w-full max-w-[200px] py-3 bg-[#1c1c1e] hover:bg-zinc-800 transition-colors rounded-xl text-sm font-bold text-white shadow-sm">プロフィールを編集</button>
            ) : (
              <div className="flex flex-col gap-3 w-full max-w-[240px] mt-4">
                <div className="flex gap-2 w-full">
                  <button onClick={() => toggleFollow(viewingUser!.id)} className={`flex-1 py-3 rounded-xl text-sm font-bold ${followedUsers.has(viewingUser!.id) ? 'bg-[#1c1c1e] text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-gray-200'} transition-colors shadow-sm`}>{followedUsers.has(viewingUser!.id) ? 'フォロー中' : 'フォロー'}</button>
                  <button onClick={() => { setActiveChatUserId(viewingUser!.id); setActiveTab('chat'); }} className="flex-1 py-3 bg-[#1c1c1e] text-white hover:bg-zinc-800 transition-colors rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-2"><IconMessagePlus /></button>
                </div>
                {/* 💡 通報・ブロックボタン */}
                <div className="flex gap-2 w-full mt-2">
                  <button onClick={() => handleBlockUser(viewingUser!.id)} className="flex-1 py-2 bg-transparent border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors rounded-xl text-[10px] font-bold">ブロックする</button>
                  <button onClick={() => handleReportUser(viewingUser!.id)} className="flex-1 py-2 bg-transparent border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors rounded-xl text-[10px] font-bold">通報する</button>
                </div>
              </div>
            )}

            <div className="w-full h-px bg-zinc-900 my-8"></div>
            
            {activeTab === 'profile' && (
               <div className="flex w-full mb-6">
                 <button onClick={() => setProfileTabMode('my_vibes')} className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-colors ${profileTabMode === 'my_vibes' ? 'border-white text-white' : 'border-transparent text-zinc-600'}`}>My Echoes</button>
                 <button onClick={() => setProfileTabMode('liked')} className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-colors ${profileTabMode === 'liked' ? 'border-white text-white' : 'border-transparent text-zinc-600'}`}>いいねした投稿</button>
               </div>
            )}

            {activeTab === 'profile' && profileTabMode === 'liked' ? (
              <div className="w-full flex flex-col gap-4">
                {likedVibes.length === 0 ? <p className="text-center text-zinc-500 py-10 text-xs">まだいいねした投稿はありません</p> : likedVibes.map(renderFeedCard)}
              </div>
            ) : renderCalendar()}
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 w-full bg-[#0a0a0a]/95 backdrop-blur-2xl border-t border-zinc-900 flex justify-around p-3 z-[100] pb-8">
        <button onClick={() => switchBottomTab('home')} className={`flex flex-col items-center gap-1 w-12 ${activeTab === 'home' ? 'text-white' : 'text-zinc-600'}`}><IconMusic /><span className="text-[8px] font-bold uppercase">Feed</span></button>
        <button onClick={() => switchBottomTab('search')} className={`flex flex-col items-center gap-1 w-12 ${activeTab === 'search' ? 'text-white' : 'text-zinc-600'}`}><IconSearch /><span className="text-[8px] font-bold uppercase">Discover</span></button>
        <button onClick={() => switchBottomTab('match')} className={`flex flex-col items-center gap-1 w-12 ${activeTab === 'match' ? 'text-white' : 'text-zinc-600'}`}><IconMatchTab /><span className="text-[8px] font-bold uppercase">Match</span></button>
        <button onClick={() => switchBottomTab('calendar')} className={`flex flex-col items-center gap-1 w-12 ${activeTab === 'calendar' ? 'text-white' : 'text-zinc-600'}`}><IconClock /><span className="text-[8px] font-bold uppercase">Diary</span></button>
        <button onClick={() => switchBottomTab('chat')} className={`flex flex-col items-center gap-1 w-12 relative ${activeTab === 'chat' ? 'text-white' : 'text-zinc-600'}`}>
          <IconChatTab />
          {Object.values(chatHistory).some(msgs => msgs.some(m => m.senderId !== currentUser?.id && !m.isRead)) && (
            <span className="absolute top-0 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-black"></span>
          )}
          <span className="text-[8px] font-bold uppercase">Chat</span>
        </button>
        <button onClick={() => switchBottomTab('profile')} className={`flex flex-col items-center gap-1 w-12 ${activeTab === 'profile' || activeTab === 'other_profile' ? 'text-white' : 'text-zinc-600'}`}><IconUser /><span className="text-[8px] font-bold uppercase">Profile</span></button>
      </nav>
    </main>
  );
}

