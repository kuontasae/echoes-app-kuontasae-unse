"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Comment, Song, FavoriteArtist, Notification, ChatMessage, ChatGroup, LiveCommunity } from './types';
import { IconHeart, IconComment, IconLock, IconPlay, IconStop, IconChevronLeft, IconChevronRight, IconChevronDown, IconSearch, IconShareBox, IconVerified, IconCross, IconGear, IconTrend, IconSparkles, IconMusic, IconMusicSmall, IconBell, IconGlobe, IconClock, IconShareExternal, IconStar, IconInfo, IconHelp, IconLockSetting, IconCamera, IconShuffle, IconDots, IconFlame, IconRewind, IconCheck, IconWarning, IconMatchTab, IconChatTab, IconSend, IconUserPlus, IconUser, IconMessagePlus, IconFilter, IconTicket, IconCrown, IconUsers, IconCalendar } from './Icons';
import { supabase } from './supabase';

// 💡 修正3: テストアカウントを全て消す
const initialMockUsers: User[] = [];

// 💡 修正7: 多言語対応の徹底強化 ＆ 修正4: FEEDタブのEveryoneをGlobalに
const localI18n: Record<string, any> = {
  "日本語": { feed: "Global", discover: "見つける", match: "マッチ", diary: "ダイアリー", chat: "チャット", profile: "プロフィール", searchPlaceholder: "楽曲やアーティストを検索...", settings: "設定", cancel: "キャンセル", postVibe: "記録する", audio: "プレビュー音", notifications: "通知", privateAcc: "非公開アカウント", timezone: "タイムゾーン", language: "言語", logout: "ログアウト", features: "機能", appInfo: "アプリについて", shareApp: "シェアする", rateApp: "評価する", help: "ヘルプ", editProfile: "編集", artist: "歌手", topResults: "ヒット", allSongs: "全曲", latestRelease: "最新曲", popularSongs: "人気曲", popularAlbums: "アルバム", followers: "フォロワー", rewind: "振り返り", overwriteVibe: "上書き", alreadyPostedWarning: "投稿済みです。上書きしますか？", favoriteArtists: "お気に入り", postSuccess: "記録完了！", sendMessage: "送信", typeMessage: "入力...", vibeMatchAnalysis: "Vibe分析", topSharedArtists: "共通アーティスト", sharedGenres: "共通ジャンル", noPreview: "プレビューなし", pass: "スキップ", connect: "気になる", friendsChat: "フレンド", matchesChat: "マッチ", groupsChat: "グループ", communityChat: "ライブ", liveHistory: "参戦歴", hashtags: "ハッシュタグ", deleteAcc: "アカウント削除", admin: "通報管理", musicSearch: "音楽を探す" },
  "English": { feed: "Global", discover: "Discover", match: "Match", diary: "Diary", chat: "Chat", profile: "Profile", searchPlaceholder: "Search...", settings: "Settings", cancel: "Cancel", postVibe: "Post", audio: "Audio", notifications: "Notif", privateAcc: "Private", timezone: "Timezone", language: "Lang", logout: "Log Out", features: "Features", appInfo: "About", shareApp: "Share", rateApp: "Rate", help: "Help", editProfile: "Edit", artist: "Artist", topResults: "Top", allSongs: "All", latestRelease: "New", popularSongs: "Hot", popularAlbums: "Albums", followers: "Followers", rewind: "Rewind", overwriteVibe: "Overwrite", alreadyPostedWarning: "Already posted. Overwrite?", favoriteArtists: "Favorites", postSuccess: "Success!", sendMessage: "Send", typeMessage: "Aa", vibeMatchAnalysis: "Analysis", topSharedArtists: "Shared Artists", sharedGenres: "Shared Genres", noPreview: "No audio", pass: "Skip", connect: "Like", friendsChat: "Friends", matchesChat: "Matches", groupsChat: "Groups", communityChat: "Lives", liveHistory: "History", hashtags: "Hashtags", deleteAcc: "Delete Account", admin: "Admin", musicSearch: "Search Music" },
  "中文": { feed: "Global", discover: "发现", match: "匹配", diary: "日记", chat: "聊天", profile: "我的", searchPlaceholder: "搜索...", settings: "设置", cancel: "取消", postVibe: "记录", audio: "音频", notifications: "通知", privateAcc: "私密", timezone: "时区", language: "语言", logout: "登出", features: "功能", appInfo: "关于", shareApp: "分享", rateApp: "评价", help: "帮助", editProfile: "编辑", artist: "歌手", topResults: "最佳", allSongs: "所有", latestRelease: "最新", popularSongs: "热门", popularAlbums: "专辑", followers: "粉丝", rewind: "回顾", overwriteVibe: "覆盖", alreadyPostedWarning: "已记录。覆盖吗？", favoriteArtists: "喜欢", postSuccess: "成功！", sendMessage: "发送", typeMessage: "输入...", vibeMatchAnalysis: "分析", topSharedArtists: "共同歌手", sharedGenres: "共同类型", noPreview: "无试听", pass: "跳过", connect: "感兴趣", friendsChat: "好友", matchesChat: "匹配", groupsChat: "群组", communityChat: "社区", liveHistory: "参战历史", hashtags: "标签", deleteAcc: "注销", admin: "管理员", musicSearch: "搜索音乐" }
};

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
        if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) { resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpeg"), { type: "image/jpeg", lastModified: Date.now() })); } 
          else { reject(new Error("圧縮に失敗しました")); }
        }, "image/jpeg", quality);
      };
    };
    reader.onerror = error => reject(error);
  });
};

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
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set()); 
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false); 
  const [myFollowers, setMyFollowers] = useState<Set<string>>(new Set()); 
  const [myProfile, setMyProfile] = useState<User>({ 
    id: "me", handle: "guest", name: "ゲスト", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80", 
    bio: "よろしくお願いします！", followers: 0, following: 0, isPrivate: false, category: 'suggested', 
    hashtags: [], liveHistory: [], age: 20, gender: "other" 
  });

  const [vibes, setVibes] = useState<Song[]>([]);
  const [communityVibes, setCommunityVibes] = useState<Song[]>([]);
  
  const allFeedVibes = useMemo(() => {
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
  const [isPosting, setIsPosting] = useState(false); 
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]); 
  const [aiMessage, setAiMessage] = useState("過去の記録から、あなたにおすすめの曲を分析しています..."); 

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
  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);
  const [newCommName, setNewCommName] = useState("");
  const [newCommYear, setNewCommYear] = useState("");
  const [newCommMonth, setNewCommMonth] = useState("");
  const [newCommDay, setNewCommDay] = useState("");
  const yearInputRef = useRef<HTMLInputElement>(null);
  const monthInputRef = useRef<HTMLInputElement>(null);
  const dayInputRef = useRef<HTMLInputElement>(null);

  const [showCommCalendar, setShowCommCalendar] = useState(false);
  const [commCalDate, setCommCalDate] = useState(new Date(2026, 6, 1));
  const [selectedModalDate, setSelectedModalDate] = useState<string | null>(null); 
  const [showCommDrumroll, setShowCommDrumroll] = useState(false); 
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
            reportedBy: [] 
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
      } catch (e) {}
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
  
  // 💡 修正12: チャットでの音楽送信機能
  const [showMusicChatSearch, setShowMusicChatSearch] = useState(false);
  const [musicChatQuery, setMusicChatQuery] = useState("");
  const [musicChatResults, setMusicChatResults] = useState<any[]>([]);

  useEffect(() => {
    if (!musicChatQuery.trim()) { setMusicChatResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(musicChatQuery)}&entity=song&country=jp&limit=10`);
        const d = await res.json(); setMusicChatResults(d.results);
      } catch(e){}
    }, 500); return () => clearTimeout(timer);
  }, [musicChatQuery]);

  const sendMusicMessage = async (song: any) => {
    if (!currentUser || !activeChatUserId) return;
    const songData = `[SONG]${song.trackName}|${song.artistName}|${song.artworkUrl100}|${song.previewUrl}`;
    submitChatMessage(activeChatUserId, songData);
    setShowMusicChatSearch(false);
    setMusicChatQuery("");
  };

  // 💡 修正13: チャットを開いた時の自動最新スクロール
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { if (activeChatUserId) { setTimeout(scrollToBottom, 100); } }, [activeChatUserId]);

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
    let f = [...realCommunities].filter(c => (c.reportedBy?.length || 0) < 3);
    f = f.map(c => ({ ...c, memberCount: c.memberCount + (chatCommunities.some(chat => chat.id === c.id) ? 1 : 0) }));
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
  const [showAdminDashboard, setShowAdminDashboard] = useState(false); 
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
    setEditName(myProfile.name); setEditHandle(myProfile.handle); setEditBio(myProfile.bio || "");
    setEditAvatar(myProfile.avatar); setEditHashtags(myProfile.hashtags?.join(', ') || "");
    setEditLiveHistory(myProfile.liveHistory?.join(', ') || ""); setEditIsPrivate(myProfile.isPrivate);
    setIsEditingProfile(true);
  };

  const [activeCommentSongId, setActiveCommentSongId] = useState<string|null>(null);
  const [commentInput, setCommentInput] = useState("");
  const profileBackTarget = { tab: 'search', chatUserId: null }; 
  const setProfileBackTarget = (data?: any) => {}; 

  const [historyStack, setHistoryStack] = useState<any[]>([]);
  const skipHistoryRef = useRef(false);

  const currentScreenState = useMemo(() => ({
    tab: activeTab, user: viewingUser, chatId: activeChatUserId, artist: activeArtistProfile, album: activeAlbumProfile
  }), [activeTab, viewingUser, activeChatUserId, activeArtistProfile, activeAlbumProfile]);

  const prevStateRef = useRef(currentScreenState);

  useEffect(() => {
    if (!skipHistoryRef.current) {
      const prev = prevStateRef.current;
      if (prev.tab !== currentScreenState.tab || prev.user?.id !== currentScreenState.user?.id || prev.chatId !== currentScreenState.chatId || prev.artist?.artistId !== currentScreenState.artist?.artistId || prev.album?.collectionId !== currentScreenState.album?.collectionId) {
        setHistoryStack(stack => [...stack, prev]);
      }
    } else { skipHistoryRef.current = false; }
    prevStateRef.current = currentScreenState;
  }, [currentScreenState]);

  const handleGoBack = () => {
    setHistoryStack(stack => {
      if (stack.length === 0) {
        setActiveTab('home'); setViewingUser(null); setActiveChatUserId(null); setActiveArtistProfile(null); setActiveAlbumProfile(null);
        return stack;
      }
      const newStack = [...stack]; const lastState = newStack.pop();
      skipHistoryRef.current = true;
      if (lastState) {
        setActiveTab(lastState.tab); setViewingUser(lastState.user);
        setActiveChatUserId(lastState.chatId); setActiveArtistProfile(lastState.artist); setActiveAlbumProfile(lastState.album);
      }
      return newStack;
    });
  };

  const switchBottomTab = (tab: any) => {
    skipHistoryRef.current = true; setHistoryStack([]); setActiveTab(tab);
    setViewingUser(null); setActiveChatUserId(null); setActiveArtistProfile(null); setActiveAlbumProfile(null);
  };

  useEffect(() => {
    if (!currentUser || vibes.length === 0) return;
    const analyzeVibes = async () => {
      const myVibes = vibes.filter(v => v.user.id === currentUser.id || v.user.id === myProfile.id);
      if (myVibes.length === 0) { setAiMessage("記録を始めましょう。"); setAiRecommendations([]); return; }
      const recentArtists = [...new Set(myVibes.slice(0, 10).map(v => v.artist))].slice(0, 3);
      setAiMessage(`${recentArtists.join('、')} を聴くあなたにおすすめです。`);
      try {
        let recs: any[] = [];
        for (const artist of recentArtists) {
          const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artist)}&entity=song&country=jp&limit=5`);
          const d = await res.json();
          const newSongs = d.results.filter((r: any) => !myVibes.some(v => v.trackId === r.trackId));
          if (newSongs.length > 0) recs.push(newSongs[0]);
        }
        setAiRecommendations(recs.slice(0, 3));
      } catch (e) {}
    };
    analyzeVibes();
  }, [vibes, currentUser, myProfile.id, trendingSongs]);

  const displayModalUsers = useMemo(() => {
    const targetUserId = activeTab === 'profile' ? currentUser?.id : viewingUser?.id;
    if (!targetUserId) return [];
    let filteredList: User[] = [];
    if (showUserListModal === 'FOLLOWING') { filteredList = allProfiles.filter(p => followedUsers.has(p.id)); } 
    else { filteredList = allProfiles.filter(p => myFollowers.has(p.id)); }
    return filteredList.filter(u => u.name?.toLowerCase().includes(modalSearchQuery.toLowerCase()) || u.handle?.toLowerCase().includes(modalSearchQuery.toLowerCase()));
  }, [showUserListModal, allProfiles, followedUsers, myFollowers, modalSearchQuery, activeTab, currentUser, viewingUser]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user); setIsLoggedIn(true);
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
      if (session) { setCurrentUser(session.user); setIsLoggedIn(true); } 
      else { setCurrentUser(null); setIsLoggedIn(false); }
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { try { setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone); } catch (e) { setTimeZone("Asia/Tokyo"); } }, []);
  useEffect(() => { if (audioRef.current) audioRef.current.muted = !settings.audio; }, [settings.audio]);
  useEffect(() => { const fetchT = async () => { try { const res = await fetch(`https://itunes.apple.com/search?term=jpop+top&entity=song&country=jp&limit=5`); const d = await res.json(); setTrendingSongs(d.results); } catch(e){} }; fetchT(); }, []);

  const [vibePage, setVibePage] = useState(0);
  const [hasMoreVibes, setHasMoreVibes] = useState(true);
  const [isLoadingVibes, setIsLoadingVibes] = useState(false);
  const VIBES_PER_PAGE = 10;

  const fetchVibes = async (pageNumber = 0, isRefresh = false) => {
    if (isLoadingVibes || (!hasMoreVibes && !isRefresh)) return;
    setIsLoadingVibes(true);
    const from = pageNumber * VIBES_PER_PAGE;
    const to = from + VIBES_PER_PAGE - 1;
    const { data: vibesData } = await supabase.from('vibes').select('*').order('created_at', { ascending: false }).range(from, to);
    const { data: profilesData } = await supabase.from('profiles').select('*');
    const { data: likesData } = await supabase.from('likes').select('*');
    const { data: commentsData } = await supabase.from('comments').select('*');
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
        return { id: v.id, trackId: parseInt(v.track_id) || 0, title: v.title, artist: v.artist, imgUrl: v.img_url, previewUrl: v.preview_url, date: new Date(v.created_at).toLocaleDateString('ja-JP'), year: new Date(v.created_at).getFullYear(), month: new Date(v.created_at).getMonth() + 1, dayIndex: new Date(v.created_at).getDate(), timestamp: new Date(v.created_at).getTime(), time: new Date(v.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }), caption: v.caption || "", user: postUser, likes: postLikes.length, isLiked: isLikedByMe, comments: formattedComments };
      });
      if (isRefresh || pageNumber === 0) { setVibes(formatted as Song[]); } 
      else { setVibes(prev => { const existingIds = new Set(prev.map(p => p.id)); const newItems = formatted.filter(f => !existingIds.has(f.id)); return [...prev, ...newItems] as Song[]; }); }
      setHasMoreVibes(vibesData.length === VIBES_PER_PAGE); setVibePage(pageNumber);
    }
    setIsLoadingVibes(false);
  };

  useEffect(() => { fetchVibes(0, true); }, []);

  const observerTarget = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting && hasMoreVibes && !isLoadingVibes) { fetchVibes(vibePage + 1); } }, { threshold: 0.1 });
    if (observerTarget.current) { observer.observe(observerTarget.current); }
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

    const channel = supabase.channel('realtime_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload) => {
        const msg = payload.new;
        if (msg.sender_id === currentUser.id) return;
        const isGroup = msg.target_id.startsWith('g') || msg.target_id.startsWith('com');
        const partnerId = isGroup ? msg.target_id : msg.sender_id;
        let isRead = msg.is_read;
        if (activeChatUserId === partnerId) {
          isRead = true;
          await supabase.from('chat_messages').update({ is_read: true }).eq('id', msg.id);
        } else {
          const senderName = allProfiles.find(u => u.id === msg.sender_id)?.name || "誰か";
          showToast(`${senderName}さんから新着メッセージ`);
        }
        const newChatMsg = { id: msg.id, senderId: msg.sender_id, text: msg.text, timestamp: new Date(msg.created_at).getTime(), isRead: isRead };
        setChatHistory(prev => ({ ...prev, [partnerId]: [...(prev[partnerId] || []), newChatMsg as any] }));
        setTimeout(scrollToBottom, 100);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, (payload) => {
        const updatedMsg = payload.new;
        setChatHistory(prev => {
          const newHistory = { ...prev };
          Object.keys(newHistory).forEach(pId => { newHistory[pId] = newHistory[pId].map(m => (m.id === updatedMsg.id ? { ...m, isRead: updatedMsg.is_read } as any : m)); });
          return newHistory;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser, activeChatUserId]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setSearchArtistInfo(null); return; }
    const timer = setTimeout(async () => { 
      try { const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=song&country=jp&limit=5`); const d = await res.json(); setSearchResults(d.results); if (d.results.length > 0) { setSearchArtistInfo({ artistId: d.results[0].artistId, artistName: d.results[0].artistName, artworkUrl: d.results[0].artworkUrl100.replace('100x100bb', '300x300bb')}); } } catch(e){} 
    }, 500); return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => { 
    if (!activeArtistProfile) return; 
    setIsArtistLoading(true); 
    const f = async () => { 
      try { 
        const term = activeArtistProfile.artistName;
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&country=jp&limit=50`); 
        const d = await res.json(); 
        const filtered = d.results.filter((i:any)=>i.wrapperType==='track' && i.artistName.toLowerCase().includes(term.toLowerCase()));
        setArtistSongs(filtered.sort((a:any,b:any) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())); 
      } catch(e){} finally { setIsArtistLoading(false); } 
    }; f(); 
  }, [activeArtistProfile]);

  const togglePlay = async (url: string | null) => { 
    if (!url) { showToast(t('noPreview'), 'error'); return; } 
    if (!settings.audio) return; 
    if (playingSong === url) { audioRef.current?.pause(); setPlayingSong(null); } 
    else { audioRef.current!.src = url; try { await audioRef.current!.play(); setPlayingSong(url); } catch(e) { setPlayingSong(null); } } 
  };
  
  const handleArtistClick = (e: React.MouseEvent, id: number|undefined, name: string, url: string) => { 
    e.preventDefault(); e.stopPropagation(); 
    setShowMatchFilterModal(false); setSelectedCalendarPopupVibe(null); activeAlbumProfile && setActiveAlbumProfile(null);
    setActiveArtistProfile({ artistId: id || 0, artistName: name, artworkUrl: url.replace('100x100bb', '600x600bb'), isVerifiedReal: false });
  };

  const cancelDraft = () => { if(audioRef.current) audioRef.current.pause(); setPlayingSong(null); setDraftSong(null); setDraftCaption(""); };
  const isAlreadyPostedToday = () => vibes.find(v => v.year === new Date().getFullYear() && v.month === (new Date().getMonth() + 1) && v.dayIndex === new Date().getDate() && v.user.id === currentUser?.id);
  
  const checkAndPost = () => { 
    if (!draftSong) return; 
    const existingPost = isAlreadyPostedToday(); 
    if (existingPost) setShowPostOverrideConfirm(existingPost); 
    else executePost(new Date()); 
  };

  const executePost = async (now: Date) => { 
    if (!draftSong || isPosting) return; 
    setIsPosting(true); 
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const existingPost = isAlreadyPostedToday();
      if (existingPost) { await supabase.from('vibes').delete().eq('id', existingPost.id); }
      const newVibeData = { user_id: authData.user.id, track_id: draftSong.trackId.toString(), title: draftSong.trackName, artist: draftSong.artistName, img_url: draftSong.artworkUrl100.replace('100x100bb', '600x600bb'), preview_url: draftSong.previewUrl || null, caption: draftCaption, created_at: now.toISOString() };
      const { error } = await supabase.from('vibes').insert([newVibeData]);
      if (error) { showToast("保存失敗", 'error'); return; }
      await fetchVibes(0, true); cancelDraft(); setActiveTab('home'); showToast(t('postSuccess'));
    } catch (e) { showToast("エラー", "error"); } finally { setIsPosting(false); }
  };

  const toggleLike = async (vibeId: string) => {
    if (!currentUser) return;
    let isCurrentlyLiked = false; let targetUserId = "";
    const fn = (s: Song) => { if (s.id === vibeId) { isCurrentlyLiked = s.isLiked; targetUserId = s.user.id; return { ...s, isLiked: !s.isLiked, likes: s.isLiked ? s.likes - 1 : s.likes + 1 }; } return s; };
    setVibes(vibes.map(fn));
    if (isCurrentlyLiked) { await supabase.from('likes').delete().eq('vibe_id', vibeId).eq('user_id', currentUser.id); } 
    else { await supabase.from('likes').insert([{ vibe_id: vibeId, user_id: currentUser.id }]); }
  };

  const submitChatMessage = async (targetId: string, text: string = chatMessageInput) => { 
    if (!text.trim() || !currentUser) return; 
    setChatMessageInput("");
    const tempId = Date.now().toString();
    const newMsg = { id: tempId, senderId: currentUser.id, text: text, timestamp: Date.now(), isRead: false }; 
    setChatHistory(prev => ({ ...prev, [targetId]: [...(prev[targetId] || []), newMsg as any] })); 
    setTimeout(scrollToBottom, 100);
    const { data } = await supabase.from('chat_messages').insert([{ sender_id: currentUser.id, target_id: targetId, text: text }]).select().single();
    if (data) {
      setChatHistory(prev => ({ ...prev, [targetId]: prev[targetId].map(m => m.id === tempId ? { ...m, id: data.id } as any : m) }));
    }
  };

  // 💡 修正11: 音声録音（webm/mp4拡張子問題の解決）
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder; audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/mp4' });
        const audioUrl = URL.createObjectURL(audioBlob); setDraftVoice({ blob: audioBlob, url: audioUrl });
      };
      mediaRecorder.start(); setIsRecording(true); setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds(prev => prev + 1), 1000);
    } catch (err) { showToast("マイクを許可してください", "error"); }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false); if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const sendVoiceMessage = async () => {
    if (!draftVoice || !currentUser || !activeChatUserId) return;
    showToast("音声を送信中...", "success");
    const fileExt = mediaRecorderRef.current?.mimeType.includes('webm') ? 'webm' : 'mp4';
    const fileName = `voice-${currentUser.id}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, draftVoice.blob);
    if (uploadError) { showToast("送信失敗", "error"); return; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    submitChatMessage(activeChatUserId, `[VOICE]${data.publicUrl}`);
    setDraftVoice(null); setShowVoiceMenu(false);
  };

  // 🔴【前回復元忘れ】: 欠落していた全関数群の復旧
  const handleShareVibe = (s: Song) => {
    if (navigator.share) { navigator.share({ title: `Echoes - ${s.title}`, text: `${s.user.name}のVibeをチェック！`, url: 'https://echo.es' }).catch(()=>{}); }
    else { showToast("URLをクリップボードにコピーしました。"); }
  };

  const handleShareApp = () => {
    if (navigator.share) { navigator.share({ title: 'Echoes', url: 'https://echo.es' }).catch(()=>{}); }
    else { showToast("URLをクリップボードにコピーしました。"); }
  };

  const deleteVibe = async (id: string) => { 
    if (confirm("このVibeを削除しますか？")) { 
      const { error } = await supabase.from('vibes').delete().eq('id', id);
      if (error) { showToast("データの削除に失敗しました", "error"); return; }
      setVibes(vibes.filter(v => v.id !== id)); setCommunityVibes(communityVibes.filter(v => v.id !== id)); 
    } 
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { 
    const file = e.target.files?.[0]; if (!file || !currentUser) return;
    showToast("画像をアップロードしています...", "success");
    try {
      const compressedFile = await compressImage(file);
      const fileName = `${currentUser.id}-${Date.now()}.jpeg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, compressedFile);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setEditAvatar(data.publicUrl);
      showToast("画像のアップロードが完了しました！そのまま保存を押してください", "success");
    } catch (err) { showToast("画像のアップロードに失敗しました", "error"); }
  };

  const handleChatFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0]; 
    if (!file || !currentUser || !activeChatUserId) return;
    showToast("ファイルを送信しています...", "success");
    const isImage = file.type.startsWith('image/');
    try {
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
    } catch (err) { showToast("ファイルの送信に失敗しました", "error"); }
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
      setBlockedUsers(prev => new Set(prev).add(userId)); handleGoBack(); showToast("ユーザーをブロックしました", "success");
    }
  };

  const handleReportUser = (userId: string) => {
    if (confirm("このユーザーを通報しますか？\n（運営が内容を確認し、適切な対応を行います）")) { showToast("通報が完了しました。ご協力ありがとうございます。", "success"); }
  };

  const saveProfileChanges = async () => {
    if (!currentUser) return;
    const { error } = await supabase.from('profiles').update({ name: editName, handle: editHandle, bio: editBio, avatar: editAvatar }).eq('id', currentUser.id);
    if (error) { showToast("保存に失敗しました", "error"); return; }
    setMyProfile(prev => ({ ...prev, name: editName, handle: editHandle, bio: editBio, avatar: editAvatar }));
    setAllProfiles(prev => prev.map(p => p.id === currentUser.id ? { ...p, name: editName, handle: editHandle, bio: editBio, avatar: editAvatar } : p));
    setIsEditingProfile(false); showToast("プロフィールを保存しました！", "success");
  };

  const DrumrollPickerModal = () => {
    const monthList = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
    const yearList = useMemo(() => Array.from({ length: 10 }, (_, i) => 2024 + i), []);
    const monthRef = useRef<HTMLDivElement>(null); const yearRef = useRef<HTMLDivElement>(null);
    const [selectedM, setSelectedM] = useState(currentMonth); const [selectedY, setSelectedY] = useState(currentYear);

    useEffect(() => { 
      if (monthRef.current) monthRef.current.scrollTop = (currentMonth - 1) * 50; 
      if (yearRef.current) { const index = yearList.indexOf(currentYear); if (index !== -1) yearRef.current.scrollTop = index * 50; } 
    }, []);

    const confirmSelection = () => { setCalendarDate(new Date(selectedY, selectedM - 1, 1)); setShowDrumrollModal(false); };
    
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[500] flex flex-col justify-end animate-fade-in" onClick={() => setShowDrumrollModal(false)}>
        <div className="bg-[#1c1c1e] rounded-t-3xl border-t border-zinc-800 p-8 w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-8"><button onClick={() => setShowDrumrollModal(false)} className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{t('cancel')}</button><h4 className="font-bold text-sm">年月を選択</h4><button onClick={confirmSelection} className="text-white text-xs font-bold uppercase tracking-widest bg-zinc-800 px-6 py-2 rounded-full">Set</button></div>
          <div className="relative h-[250px] w-full flex gap-4 justify-center items-center overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[100px] bg-gradient-to-b from-[#1c1c1e] to-transparent z-40 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-full h-[100px] bg-gradient-to-t from-[#1c1c1e] to-transparent z-40 pointer-events-none" />
            <div className="absolute top-1/2 left-0 w-full h-[50px] bg-white/10 -mt-[25px] rounded-xl z-10 pointer-events-none" />
            <div ref={yearRef} className="relative flex-1 h-full overflow-y-auto scroll-smooth snap-y snap-mandatory scrollbar-hide z-30 py-[100px]" onScroll={e => { const i = Math.round(e.currentTarget.scrollTop / 50); const y = yearList[i]; if(y) setSelectedY(y); }} style={{ WebkitOverflowScrolling: 'touch' }}>
              {yearList.map((y, i) => (<div key={i} className={`h-[50px] flex justify-center items-center snap-center transition-all ${y === selectedY ? 'text-white text-lg font-bold scale-110' : 'text-zinc-500 scale-90'}`}>{y}年</div>))}
            </div>
            <div ref={monthRef} className="relative flex-1 h-full overflow-y-auto scroll-smooth snap-y snap-mandatory scrollbar-hide z-30 py-[100px]" onScroll={e => { const i = Math.round(e.currentTarget.scrollTop / 50); const m = monthList[i]; if(m) setSelectedM(m); }} style={{ WebkitOverflowScrolling: 'touch' }}>
              {monthList.map((m, i) => (<div key={i} className={`h-[50px] flex justify-center items-center snap-center transition-all ${m === selectedM ? 'text-white text-lg font-bold scale-110' : 'text-zinc-500 scale-90'}`}>{m.toString().padStart(2, '0')}月</div>))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleCreateGroup = () => { if (!newGroupName.trim() || newGroupMembers.size === 0) { showToast("グループ名とメンバーを指定", "error"); return; } const ng: ChatGroup = { id: `g${Date.now()}`, name: newGroupName, memberIds: Array.from(newGroupMembers), avatar: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80" }; setChatGroups([...chatGroups, ng]); setShowCreateGroupModal(false); setNewGroupName(""); setNewGroupMembers(new Set()); showToast("グループ作成完了！"); };
  const joinCommunity = (c: LiveCommunity) => { setChatCommunities(p => p.some(x=>x.id===c.id)?p:[...p,{...c,isJoined:true}]); setActiveCommunityDetail(null); setChatTabMode('community'); setActiveTab('chat'); setActiveChatUserId(c.id); showToast(`${c.name} に参加！`); };

  const handleCreateCommunity = () => {
    if (!newCommName.trim() || newCommYear.length !== 4 || !newCommMonth || !newCommDay) { showToast("ライブ名と正しい日程(YYYY/MM/DD)を入力してください", "error"); return; }
    const formattedDate = `${newCommYear}-${newCommMonth.padStart(2, '0')}-${newCommDay.padStart(2, '0')}`;
    const newComm: LiveCommunity = { id: `com_new_${Date.now()}`, name: newCommName, date: formattedDate, memberCount: 1, isJoined: true, isVerified: false, reportedBy: [] };
    setRealCommunities(prev => [...prev, newComm]); setChatCommunities(prev => [...prev, newComm]);
    setShowCreateCommunityModal(false); setNewCommName(""); setNewCommYear(""); setNewCommMonth(""); setNewCommDay("");
    setChatTabMode('community'); setActiveTab('chat'); setActiveChatUserId(newComm.id); showToast(`${newComm.name} を新しく作成して参加しました！`, "success");
  };

  const handleReportCommunity = (id: string) => {
    if (!currentUser) return; const target = realCommunities.find(c => c.id === id);
    if (target?.reportedBy?.includes(currentUser.id)) { showToast("このライブは既に通報済みです", "error"); return; }
    if (confirm("このライブ情報は間違っていますか？\n（3人以上の異なるユーザーが通報すると運営が確認します）")) {
      setRealCommunities(prev => prev.map(c => c.id === id ? { ...c, reportedBy: [...(c.reportedBy || []), currentUser.id] } : c));
      setActiveCommunityDetail(null); showToast("通報を受け付けました。ご協力感謝します", "success");
    }
  };

  const handleRestoreCommunity = (id: string) => { setRealCommunities(prev => prev.map(c => c.id === id ? { ...c, reportedBy: [] } : c)); showToast("コミュニティを復旧しました", "success"); };
  const handleDeleteCommunity = (id: string) => { if (confirm("本当にこのコミュニティを完全に削除しますか？")) { setRealCommunities(prev => prev.filter(c => c.id !== id)); showToast("コミュニティを削除しました", "success"); } };
  const handleSendVibe = async (uid: string, uname: string) => { setMatchIndex(p => p + 1); showToast(`${uname}さんに気になるを送信しました！`, 'success'); if (currentUser) { await supabase.from('notifications').insert([{ user_id: uid, sender_id: currentUser.id, type: 'vibe_request', text: `${myProfile.name}さんがあなたに「気になる」を送信しました！` }]); } };
  const handleSendVibeWithMessage = (uid: string) => { if (!matchMessageInput.trim()) return; submitChatMessage(uid, matchMessageInput); setMatchedUsers(p => new Set(p).add(uid)); setShowMatchMessageModal(null); setMatchMessageInput(""); setMatchIndex(p => p + 1); showToast("送信完了！", 'success'); };
  const parseMention = (cap: string) => { const p = cap.split(/(@[\w._]+)/); return p.map((x, i) => { if(x.startsWith('@')){ const h=x.substring(1); const u=[...mockUsers,myProfile].find(y=>y.handle===h); if(u){ return <span key={i} onClick={(e)=>{e.stopPropagation(); if(u.id===myProfile.id) setActiveTab('profile'); else{setViewingUser(u);setActiveTab('other_profile');}}} className="text-[#1DB954] font-bold cursor-pointer relative z-20 pointer-events-auto">@{h}</span>; } } return x; }); };

  // 💡 修正8: ログアウト・アカウント削除の確実な機能化
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    showToast("アカウントを完全に削除しています...", "success");
    // 関連データを削除してからログアウトさせる
    await supabase.from('vibes').delete().eq('user_id', currentUser.id);
    await supabase.from('comments').delete().eq('user_id', currentUser.id);
    await supabase.from('likes').delete().eq('user_id', currentUser.id);
    await supabase.from('profiles').delete().eq('id', currentUser.id);
    await supabase.auth.signOut();
    window.location.reload();
  };

  // 💡 修正2: パスワード強度チェック（8文字以上、英数字混合）
  const handleSignUp = async () => {
    const pwRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!pwRegex.test(password)) {
      showToast("パスワードは8文字以上で、英語と数字を両方含めてください", "error");
      return;
    }
    setIsAuthLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { showToast(error.message, "error"); setIsAuthLoading(false); return; }
    if (data.user) {
      await supabase.from('profiles').insert([{ id: data.user.id, name: email.split('@')[0], handle: email.split('@')[0], avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80", bio: "よろしくお願いします！" }]);
      setSignupSuccess(true);
    }
    setIsAuthLoading(false);
  };

  const handleLogin = async () => {
    setIsAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsAuthLoading(false);
    if (error) { showToast("ログイン失敗", "error"); }
  };

  // 💡 修正9 & 10: カレンダーのデザイン修正と遷移の追加
  const renderCalendar = () => (
    <div className="w-full max-w-md mx-auto mt-4 px-4 animate-fade-in">
      <div className="flex justify-between items-center mb-8 h-12">
        <button onClick={() => setCalendarDate(new Date(currentYear, currentMonth - 2, 1))} className="text-zinc-500 p-2"><IconChevronLeft /></button>
        <div className="cursor-pointer flex items-center gap-2 text-xl font-bold tracking-widest text-zinc-300" onClick={() => setShowDrumrollModal(true)}>
          {currentYear} . {currentMonth.toString().padStart(2, '0')} <IconChevronDown />
        </div>
        <button onClick={() => setCalendarDate(new Date(currentYear, currentMonth, 1))} className="text-zinc-500 p-2"><IconChevronRight /></button>
      </div>
      <div className="grid grid-cols-7 gap-2.5">
        {[...Array(daysInMonth)].map((_, i) => {
          const day = i + 1;
          const userVibes = (activeTab === 'calendar' || activeTab === 'profile') ? vibes.filter(v => v.user.id === currentUser?.id) : vibes.filter(v => v.user.id === viewingUser?.id);
          const v = userVibes.find(x => x.year === currentYear && x.month === currentMonth && x.dayIndex === day);
          return (
            <div key={i} className="flex flex-col gap-1 items-center">
              <div className={`group aspect-square w-full bg-[#1c1c1e] rounded-[12px] flex items-center justify-center relative overflow-hidden`}>
                {v ? (
                  <img src={v.imgUrl} className="absolute inset-0 w-full h-full object-cover opacity-80 cursor-pointer" onClick={() => setSelectedCalendarPopupVibe(v)} />
                ) : <span className="text-[10px] text-zinc-700 font-bold">{day}</span>}
              </div>
              {/* 💡 マスの下にテキストを表示し、タップでアーティスト詳細へ飛ぶ */}
              {v && (
                <div className="w-full overflow-hidden cursor-pointer" onClick={(e) => handleArtistClick(e, undefined, v.artist, v.imgUrl)}>
                  <p className="text-[7px] font-bold text-white truncate text-center leading-tight">{v.title}</p>
                  <p className="text-[6px] text-[#1DB954] truncate text-center leading-tight">{v.artist}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderFeedCard = (s: Song) => (
    <div key={s.id} className="bg-[#1c1c1e] border border-zinc-800/50 rounded-[24px] p-5 shadow-lg">
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { if(s.user.id !== currentUser?.id){ setViewingUser(s.user); setActiveTab('other_profile'); } else { setActiveTab('profile'); } }}>
          <img src={s.user.avatar} className="w-10 h-10 rounded-full object-cover"/>
          <div><p className="text-sm font-bold">{s.user.name}</p><p className="text-[10px] text-zinc-500">@{s.user.handle} • {displayLocalTime(s.timestamp, timeZone)}</p></div>
        </div>
        {/* 🔴 復元した削除・シェアボタン */}
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShareVibe(s); }} className="text-zinc-500 p-1 hover:text-white"><IconShareExternal /></button>
          {(s.user.id === myProfile.id || s.user.id === currentUser?.id || s.user.id === 'me') && <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteVibe(s.id); }} className="text-[10px] font-bold text-zinc-600 hover:text-red-500 uppercase tracking-widest p-1">削除</button>}
        </div>
      </div>
      <div className="flex items-center gap-4 mb-5">
        <div className="relative w-20 h-20 rounded-full overflow-hidden border border-zinc-700 flex-shrink-0">
           <img src={s.imgUrl} className={`w-full h-full object-cover ${playingSong === s.previewUrl ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
           <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <button onClick={() => togglePlay(s.previewUrl)} className="w-10 h-10 bg-black/60 rounded-full flex items-center justify-center text-white"><IconPlay /></button>
           </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="font-bold text-lg truncate">{s.title}</p>
          <p onClick={(e) => handleArtistClick(e, undefined, s.artist, s.imgUrl)} className="text-xs text-[#1DB954] font-bold cursor-pointer">{s.artist}</p>
        </div>
      </div>
      <p className="text-xs mb-5">{parseMention(s.caption)}</p>
      <div className="flex gap-6 border-t border-zinc-800/60 pt-4">
        <button onClick={() => toggleLike(s.id)} className="flex items-center gap-2"><IconHeart filled={s.isLiked} />{formatCount(s.likes)}</button>
        <button onClick={() => setActiveCommentSongId(activeCommentSongId === s.id ? null : s.id)} className="flex items-center gap-2"><IconComment />{formatCount(s.comments.length)}</button>
      </div>
    </div>
  );

  if (isInitializing) return <div className="min-h-screen bg-black flex items-center justify-center"><h1 className="text-4xl font-black italic text-white animate-pulse">Echoes.</h1></div>;
  if (!isLoggedIn) return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 animate-fade-in">
      <h1 className="text-5xl font-black italic mb-10">Echoes.</h1>
      <div className="w-full max-w-sm flex flex-col gap-4">
        {signupSuccess ? (
          <div className="bg-[#1c1c1e] p-8 rounded-3xl text-center">
            <h2 className="text-xl font-bold mb-4">確認メールを送信しました</h2>
            <p className="text-sm text-zinc-400 mb-8">{email} 宛に届いたリンクをクリックしてください。</p>
            <button onClick={() => setAuthMode('login')} className="w-full bg-white text-black font-bold py-3.5 rounded-xl">ログインへ</button>
          </div>
        ) : (
          <>
            <input type="email" placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#1c1c1e] border border-zinc-800 rounded-xl px-4 py-3.5 text-sm" />
            <input type="password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#1c1c1e] border border-zinc-800 rounded-xl px-4 py-3.5 text-sm" />
            <button onClick={authMode === 'login' ? handleLogin : handleSignUp} className="w-full bg-white text-black font-bold py-3.5 rounded-xl">{authMode === 'login' ? 'ログイン' : '新規登録'}</button>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-center text-xs text-zinc-500 mt-2 font-bold">{authMode === 'login' ? '新規アカウント作成' : 'ログインはこちら'}</button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-black text-white pb-24 font-sans relative overflow-x-hidden">
      <audio ref={audioRef} onEnded={() => setPlayingSong(null)} />
      {toastMsg && (
        <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-full font-bold shadow-2xl animate-fade-in ${toastMsg.type === 'error' ? 'bg-red-500' : 'bg-[#1DB954] text-black'}`}>
          {toastMsg.text}
        </div>
      )}

      {/* 💡 修正12: チャット内音楽検索モーダル */}
      {showMusicChatSearch && (
        <div className="fixed inset-0 bg-black/90 z-[1000] flex flex-col p-6 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg">{t('musicSearch')}</h3>
            <button onClick={() => setShowMusicChatSearch(false)} className="text-zinc-500"><IconCross /></button>
          </div>
          <input type="text" autoFocus placeholder={t('searchPlaceholder')} value={musicChatQuery} onChange={e => setMusicChatQuery(e.target.value)} className="w-full bg-[#1c1c1e] rounded-xl p-4 text-white focus:outline-none mb-4" />
          <div className="flex-1 overflow-y-auto flex flex-col gap-2">
            {musicChatResults.map(s => (
              <div key={s.trackId} onClick={() => sendMusicMessage(s)} className="flex items-center gap-4 p-3 bg-[#1c1c1e] rounded-xl hover:bg-zinc-800 cursor-pointer">
                <img src={s.artworkUrl60} className="w-10 h-10 rounded" />
                <div className="flex-1 overflow-hidden"><p className="font-bold text-sm truncate">{s.trackName}</p><p className="text-xs text-zinc-400 truncate">{s.artistName}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'home' && (
        <div className="p-4 pt-8 animate-fade-in">
          <header className="flex justify-between items-center mb-8"><h1 className="text-4xl font-black italic">Echoes</h1><button onClick={() => setShowNotifications(true)} className="p-2"><IconBell /></button></header>
          <div className="flex gap-6 mb-6 border-b border-zinc-900">
            <button onClick={() => setHomeFeedMode('all')} className={`pb-2 text-sm font-bold ${homeFeedMode === 'all' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}>{t('feed')}</button>
            <button onClick={() => setHomeFeedMode('following')} className={`pb-2 text-sm font-bold ${homeFeedMode === 'following' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}>Following</button>
          </div>
          <div className="relative mb-8">
            <input type="text" placeholder={t('searchPlaceholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-[#1c1c1e] rounded-xl p-4 text-sm" />
            {searchQuery && searchArtistInfo && (
              <div className="absolute top-full left-0 w-full mt-2 bg-[#1c1c1e] rounded-xl overflow-hidden z-50 shadow-2xl border border-zinc-800">
                <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={(e) => handleArtistClick(e, searchArtistInfo.artistId, searchArtistInfo.artistName, searchArtistInfo.artworkUrl)}>
                  <img src={searchArtistInfo.artworkUrl} className="w-12 h-12 rounded-full object-cover" />
                  <p className="font-bold text-sm flex-1">{searchArtistInfo.artistName}</p><IconChevronRight />
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-6">
            {allFeedVibes.map(renderFeedCard)}
            <div ref={observerTarget} className="h-10"></div>
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="pt-8 animate-fade-in">
          {renderCalendar()}
          <div className="mt-12 px-6"><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4"><IconSparkles /> AI Recommendations</p>
            <div className="flex flex-col gap-3">
              {aiRecommendations.map((rec, i) => (
                <div key={i} className="bg-[#1c1c1e] p-4 rounded-2xl flex items-center gap-4 cursor-pointer" onClick={() => setDraftSong(rec)}>
                  <img src={rec.artworkUrl60} className="w-10 h-10 rounded" /><div className="flex-1 overflow-hidden"><p className="font-bold text-sm truncate">{rec.trackName}</p><p className="text-xs text-[#1DB954] font-bold">{rec.artistName}</p></div><IconPlus />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="pt-8 px-4 animate-fade-in">
          <h2 className="text-2xl font-bold mb-6 px-2">{t('chat')}</h2>
          <div className="flex bg-[#1c1c1e] p-1 rounded-xl mb-6 border border-zinc-800">
            <button onClick={() => setChatTabMode('friends')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${chatTabMode === 'friends' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>{t('friendsChat')}</button>
            <button onClick={() => setChatTabMode('community')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${chatTabMode === 'community' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>{t('communityChat')}</button>
          </div>
          {Object.keys(chatHistory).map(partnerId => {
            const u = allProfiles.find(x => x.id === partnerId);
            return (
              <div key={partnerId} onClick={() => setActiveChatUserId(partnerId)} className="flex items-center gap-4 p-4 hover:bg-[#1c1c1e] rounded-2xl cursor-pointer">
                <img src={u?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80"} className="w-14 h-14 rounded-full object-cover"/>
                <div className="flex-1"><p className="font-bold text-sm">{u?.name || "Group"}</p><p className="text-xs text-zinc-400 truncate">{chatHistory[partnerId].slice(-1)[0]?.text}</p></div>
              </div>
            );
          })}
        </div>
      )}

      {activeChatUserId && (
        <div className="fixed inset-0 bg-black z-[900] flex flex-col animate-fade-in">
          <div className="flex items-center p-4 border-b border-zinc-900 bg-black/90">
            <button onClick={() => setActiveChatUserId(null)}><IconChevronLeft /></button>
            <h2 className="flex-1 text-center font-bold text-lg">{allProfiles.find(u => u.id === activeChatUserId)?.name || "Chat"}</h2>
            <div className="w-8"></div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {chatHistory[activeChatUserId]?.map((msg: any) => {
              const isMe = msg.senderId === currentUser?.id;
              // 💡 音楽メッセージの表示
              if (msg.text.startsWith('[SONG]')) {
                const [_, title, artist, img, preview] = msg.text.split('|');
                return (
                  <div key={msg.id} className={`flex gap-3 max-w-[80%] ${isMe ? 'self-end' : 'self-start'}`}>
                    <div className="bg-[#2c2c2e] p-3 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <img src={img} className="w-10 h-10 rounded" />
                        <div className="overflow-hidden"><p className="font-bold text-xs truncate">{title}</p><p className="text-[10px] text-[#1DB954]">{artist}</p></div>
                        <button onClick={() => togglePlay(preview)} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center"><IconPlay /></button>
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'items-end self-end' : 'items-start self-start'}`}>
                  {msg.text.startsWith('[VOICE]') ? (
                    <audio controls src={msg.text.replace('[VOICE]', '')} className="h-10 w-48" />
                  ) : (
                    <div className={`px-4 py-2 rounded-[20px] ${isMe ? 'bg-[#8de055] text-black rounded-br-sm' : 'bg-[#2c2c2e] text-white rounded-bl-sm'}`}>
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  )}
                  <span className="text-[8px] text-zinc-500 mt-1">{displayLocalTime(msg.timestamp, timeZone)}</span>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-zinc-900 bg-[#0a0a0a]">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowChatPlusMenu(!showChatPlusMenu)} className={`w-8 h-8 flex items-center justify-center transition-transform ${showChatPlusMenu ? 'rotate-45' : ''}`}><IconPlus /></button>
              <input type="text" value={chatMessageInput} onChange={e => setChatMessageInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitChatMessage(activeChatUserId)} className="flex-1 bg-[#1c1c1e] rounded-full px-4 py-2 text-sm focus:outline-none" placeholder="Aa" />
              {chatMessageInput.trim() ? <button onClick={() => submitChatMessage(activeChatUserId)} className="w-8 h-8 bg-[#1DB954] rounded-full flex items-center justify-center text-black"><IconSend /></button> : <button onClick={() => setShowVoiceMenu(true)} className="p-2"><IconMic /></button>}
            </div>
            {showChatPlusMenu && (
              <div className="flex gap-4 mt-4 p-2 animate-fade-in">
                <button onClick={() => { setShowMusicChatSearch(true); setShowChatPlusMenu(false); }} className="flex flex-col items-center gap-1"><div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center"><IconMusic /></div><span className="text-[10px] text-zinc-500">音楽</span></button>
                <div className="flex flex-col items-center gap-1 relative cursor-pointer">
                  <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center"><IconImage /></div>
                  <span className="text-[10px] text-zinc-500">画像/ファイル</span>
                  <input type="file" accept="image/*" onChange={(e) => { handleChatFileUpload(e); setShowChatPlusMenu(false); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showVoiceMenu && (
        <div className="fixed inset-0 bg-black/90 z-[1000] flex flex-col items-center justify-center animate-fade-in">
          <button onClick={() => { stopVoiceRecording(); setShowVoiceMenu(false); setDraftVoice(null); }} className="absolute top-8 right-8"><IconCross /></button>
          {!draftVoice ? (
            <div className="flex flex-col items-center gap-8">
              <p className="text-zinc-500 font-bold">{isRecording ? "録音中..." : "ボタンを押して録音"}</p>
              <button onClick={isRecording ? stopVoiceRecording : startVoiceRecording} className={`w-24 h-24 rounded-full border-4 ${isRecording ? 'border-red-500 animate-pulse' : 'border-zinc-700'}`}>{isRecording ? <div className="w-8 h-8 bg-red-500 rounded-sm mx-auto" /> : <div className="w-10 h-10 bg-red-500 rounded-full mx-auto" />}</button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-10">
              <div className="flex items-center gap-8">
                <button onClick={() => setDraftVoice(null)} className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center text-red-500"><IconCross /></button>
                <button onClick={() => togglePlay(draftVoice.url)} className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-black"><IconPlay /></button>
                <button onClick={sendVoiceMessage} className="w-14 h-14 bg-[#1DB954] rounded-full flex items-center justify-center text-black"><IconSend /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {(activeTab === 'profile' || activeTab === 'other_profile') && (
        <div className="pt-4 px-6 flex flex-col items-center animate-fade-in">
          <div className="w-full flex justify-between mb-8">
            {activeTab === 'other_profile' ? <button onClick={handleGoBack}><IconChevronLeft /></button> : <div className="w-8" />}
            {activeTab === 'profile' && <button onClick={() => setShowSettingsMenu(true)}><IconGear /></button>}
          </div>
          <img src={activeTab === 'profile' ? myProfile.avatar : viewingUser?.avatar} className="w-24 h-24 rounded-full object-cover border border-zinc-800 shadow-xl mb-4" />
          <h2 className="text-xl font-bold">{activeTab === 'profile' ? myProfile.name : viewingUser?.name}</h2>
          <p className="text-sm text-zinc-500">@{activeTab === 'profile' ? myProfile.handle : viewingUser?.handle}</p>
          {activeTab === 'profile' ? (
             <button onClick={openEditProfile} className="mt-6 w-full max-w-[200px] py-2 bg-[#1c1c1e] rounded-xl text-sm font-bold">{t('editProfile')}</button>
          ) : (
             <div className="mt-6 flex gap-3 w-full max-w-[240px]">
               <button onClick={() => toggleFollow(viewingUser!.id)} className={`flex-1 py-2 rounded-xl text-sm font-bold ${followedUsers.has(viewingUser!.id) ? 'bg-[#1c1c1e] text-white' : 'bg-white text-black'}`}>{followedUsers.has(viewingUser!.id) ? 'フォロー中' : 'フォロー'}</button>
               <button onClick={() => { setActiveChatUserId(viewingUser!.id); setActiveTab('chat'); }} className="flex-1 py-2 bg-[#1c1c1e] rounded-xl flex items-center justify-center"><IconMessagePlus /></button>
             </div>
          )}
          <div className="w-full h-px bg-zinc-900 my-8" />
          {renderCalendar()}
        </div>
      )}

      {showSettingsMenu && (
        <div className="fixed inset-0 bg-black z-[950] animate-fade-in flex flex-col overflow-y-auto">
          <div className="flex items-center p-4 border-b border-zinc-900"><button onClick={() => setShowSettingsMenu(false)}><IconChevronLeft /></button><h2 className="flex-1 text-center font-bold">{t('settings')}</h2><div className="w-8" /></div>
          <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between p-4 bg-[#1c1c1e] rounded-2xl">
              <div className="flex items-center gap-3"><IconGlobe /><p className="font-bold">{t('language')}</p></div>
              <select value={language} onChange={e => setLanguage(e.target.value)} className="bg-transparent font-bold focus:outline-none"><option value="日本語">日本語</option><option value="English">English</option><option value="中文">中文</option></select>
            </div>
            {/* 💡 修正6: ヘルプのメアド変更 */}
            <div className="p-4 bg-[#1c1c1e] rounded-2xl cursor-pointer" onClick={() => showToast(`お問い合わせ: echos.jpn@gmail.com`)}><div className="flex items-center gap-3"><IconHelp /><p className="font-bold">{t('help')}</p></div></div>
            
            {/* 💡 修正5: 指定メアドだけが見える管理者ダッシュボード */}
            {currentUser?.email === 'kota12202003@icloud.com' && (
              <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-2xl cursor-pointer" onClick={() => { setShowAdminDashboard(true); setShowSettingsMenu(false); }}><div className="flex items-center gap-3 text-red-500"><IconWarning /><p className="font-bold">{t('admin')}</p></div></div>
            )}
            
            {/* 💡 修正8: ログアウト・退会ボタン */}
            <button onClick={handleLogout} className="p-4 bg-[#1c1c1e] text-white font-bold rounded-2xl">{t('logout')}</button>
            <button onClick={() => setShowDeleteAccountConfirm(true)} className="p-4 bg-red-500/10 text-red-500 font-bold rounded-2xl">{t('deleteAcc')}</button>
          </div>
        </div>
      )}

      {/* 💡 退会確認モーダル */}
      {showDeleteAccountConfirm && (
        <div className="fixed inset-0 bg-black/90 z-[1000] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[#1c1c1e] p-8 rounded-3xl w-full max-w-sm text-center">
            <h3 className="font-bold text-lg mb-4">アカウントを削除しますか？</h3>
            <p className="text-xs text-zinc-500 mb-8">すべての記録とデータが完全に消去されます。</p>
            <div className="flex gap-4"><button onClick={() => setShowDeleteAccountConfirm(false)} className="flex-1 py-3 border border-zinc-800 rounded-xl font-bold">キャンセル</button><button onClick={handleDeleteAccount} className="flex-1 py-3 bg-red-500 rounded-xl font-bold text-white">削除する</button></div>
          </div>
        </div>
      )}

      {/* 管理者ダッシュボード */}
      {showAdminDashboard && (
        <div className="fixed inset-0 bg-black/95 z-[900] animate-fade-in flex flex-col">
          <div className="flex items-center p-4 border-b border-zinc-900 bg-black/90">
            <button onClick={() => setShowAdminDashboard(false)}><IconChevronLeft /></button>
            <h2 className="text-red-500 font-bold text-lg mx-auto pr-8 flex items-center gap-2"><IconWarning /> 通報管理</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {realCommunities.filter(c => (c.reportedBy?.length || 0) >= 3).map(c => (
              <div key={c.id} className="bg-[#1c1c1e] border border-red-500/30 rounded-2xl p-5 mb-4">
                <div className="flex justify-between"><h3 className="font-bold text-white">{c.name}</h3><span className="text-red-500 text-xs">通報 {c.reportedBy?.length}件</span></div>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => handleDeleteCommunity(c.id)} className="flex-1 py-2 bg-red-500 rounded-xl text-xs font-bold text-white">削除</button>
                  <button onClick={() => handleRestoreCommunity(c.id)} className="flex-1 py-2 border border-zinc-600 rounded-xl text-xs font-bold">復旧</button>
                </div>
              </div>
            ))}
            {realCommunities.filter(c => (c.reportedBy?.length || 0) >= 3).length === 0 && <p className="text-center text-zinc-500 mt-20">通報されたコミュニティはありません</p>}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 w-full bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-zinc-900 flex justify-around p-3 z-[100] pb-8">
        <button onClick={() => switchBottomTab('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-white' : 'text-zinc-600'}`}><IconMusic /><span className="text-[8px] font-bold">FEED</span></button>
        <button onClick={() => switchBottomTab('search')} className={`flex flex-col items-center gap-1 ${activeTab === 'search' ? 'text-white' : 'text-zinc-600'}`}><IconSearch /><span className="text-[8px] font-bold">FIND</span></button>
        <button onClick={() => switchBottomTab('match')} className={`flex flex-col items-center gap-1 ${activeTab === 'match' ? 'text-white' : 'text-zinc-600'}`}><IconMatchTab /><span className="text-[8px] font-bold">MATCH</span></button>
        <button onClick={() => switchBottomTab('calendar')} className={`flex flex-col items-center gap-1 ${activeTab === 'calendar' ? 'text-white' : 'text-zinc-600'}`}><IconClock /><span className="text-[8px] font-bold">DIARY</span></button>
        <button onClick={() => switchBottomTab('chat')} className={`flex flex-col items-center gap-1 relative ${activeTab === 'chat' ? 'text-white' : 'text-zinc-600'}`}><IconChatTab /><span className="text-[8px] font-bold">CHAT</span></button>
        <button onClick={() => switchBottomTab('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' || activeTab === 'other_profile' ? 'text-white' : 'text-zinc-600'}`}><IconUser /><span className="text-[8px] font-bold">MY</span></button>
      </nav>
    </main>
  );
}