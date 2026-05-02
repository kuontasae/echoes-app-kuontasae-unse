"use client";

import React from "react";
import { FavoriteArtist, Song, User } from "../../types";
import { IconChevronLeft, IconFlame, IconMessagePlus, IconMusicSmall } from "../../Icons";

const IconSettings = () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;

type VibeMatchData = {
  score: number;
  genre1: string;
  genre1Score: number;
  genre2: string;
  genre2Score: number;
  sharedArtists: string[];
};

type ProfileLabels = {
  following: string;
  follow: string;
  block: string;
  report: string;
  favoriteArtists: string;
  editProfileFull: string;
  myEchoes: string;
  likedPosts: string;
};

type ProfileSectionProps = {
  activeTab: "profile" | "other_profile";
  myProfile: User;
  viewingUser: User | null;
  myStreak: number;
  followedUsers: Set<string>;
  myFollowersCount: number;
  viewingUserStats: { followers: number; following: number };
  mutualFriendsList: User[];
  favoriteArtists: FavoriteArtist[];
  vibeMatchData: VibeMatchData | null;
  showVibeMatchDetails: boolean;
  profileTabMode: "my_vibes" | "liked";
  labels: ProfileLabels;
  likedPostsContent: React.ReactNode;
  calendarContent: React.ReactNode;
  formatCount: (count: number) => string;
  onGoBack: () => void;
  onShowCoinCharge: () => void;
  onShowSettings: () => void;
  onShowUserList: (type: "FOLLOWING" | "FOLLOWERS") => void;
  onShowMutualFriends: () => void;
  onArtistClick: (event: React.MouseEvent, artistId: number, artistName: string, artworkUrl: string) => void;
  onShowVibeMatchDetails: () => void;
  onCloseVibeMatchDetails: () => void;
  onOpenChat: (userId: string) => void;
  onOpenEditProfile: () => void;
  onToggleFollow: (userId: string) => void;
  onBlockUser: (userId: string) => void;
  onReportUser: (userId: string) => void;
  onProfileTabChange: (mode: "my_vibes" | "liked") => void;
};

const displayMusicTag = (value: string) => value.replace(/^(genre|artist|tag):/, "");

export function ProfileSection({
  activeTab,
  myProfile,
  viewingUser,
  myStreak,
  followedUsers,
  myFollowersCount,
  viewingUserStats,
  mutualFriendsList,
  favoriteArtists,
  vibeMatchData,
  showVibeMatchDetails,
  profileTabMode,
  labels,
  likedPostsContent,
  calendarContent,
  formatCount,
  onGoBack,
  onShowCoinCharge,
  onShowSettings,
  onShowUserList,
  onShowMutualFriends,
  onArtistClick,
  onShowVibeMatchDetails,
  onCloseVibeMatchDetails,
  onOpenChat,
  onOpenEditProfile,
  onToggleFollow,
  onBlockUser,
  onReportUser,
  onProfileTabChange,
}: ProfileSectionProps) {
  const isOwnProfile = activeTab === "profile";
  const profile = isOwnProfile ? myProfile : viewingUser;
  const twitterUrl = isOwnProfile ? (myProfile as any).twitterUrl : (viewingUser as any)?.twitterUrl;
  const instagramUrl = isOwnProfile ? (myProfile as any).instagramUrl : (viewingUser as any)?.instagramUrl;
  const coinTotal = (Number((myProfile as any).free_coin) || 0) + (Number((myProfile as any).paid_coin) || 0);

  return (
    <div className="mt-4 flex flex-col items-center animate-fade-in px-4">
      <div className="w-full flex justify-between items-center mb-6 relative z-50">
        {!isOwnProfile ? (
          <button onClick={onGoBack} className="relative z-50 p-3 pointer-events-auto"><IconChevronLeft /></button>
        ) : (
          <div className="w-10"></div>
        )}
        {isOwnProfile && (
          <div className="flex items-center gap-3 ml-auto relative z-50 pointer-events-auto">
            <button 
              onClick={onShowCoinCharge}
              className="flex flex-col items-end justify-center bg-[#1c1c1e] hover:bg-zinc-800 border border-zinc-800 px-4 py-1.5 rounded-2xl transition-all active:scale-95 shadow-sm flex-shrink-0"
            >
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center text-black shadow-inner border border-yellow-300/50 flex-shrink-0">
                  <span className="text-[9px] font-black leading-none mt-[1px]">C</span>
                </div>
                <span className="text-sm font-bold text-white whitespace-nowrap">{coinTotal}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-500 mt-0.5">
                <span>有償 {Number((myProfile as any).paid_coin) || 0}</span>
                <span>無償 {Number((myProfile as any).free_coin) || 0}</span>
              </div>
            </button>
            <button onClick={onShowSettings} className="w-9 h-9 bg-[#1c1c1e] border border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all shadow-sm active:scale-95 flex-shrink-0">
              <IconSettings />
            </button>
          </div>
        )}
      </div>
      <div className="relative"><img src={profile?.avatar} className="w-[100px] h-[100px] rounded-full object-cover mb-4 shadow-xl border border-zinc-800" /></div>
      <h2 className="text-[22px] font-bold flex items-center">{profile?.name}</h2>
      <p className="text-sm text-zinc-500 font-bold mt-1">@{profile?.handle}</p>
      {isOwnProfile && myStreak > 0 && (<div className="mt-3 flex items-center bg-[#1c1c1e] border border-orange-500/30 px-3 py-1.5 rounded-full shadow-sm"><IconFlame /><span className="text-[11px] font-bold text-orange-400">{myStreak}日連続記録中</span></div>)}
      <div className="flex gap-4 mt-5 text-sm font-bold"><span className="cursor-pointer" onClick={() => onShowUserList('FOLLOWING')}>{formatCount(isOwnProfile ? followedUsers.size : viewingUserStats.following)} {labels.following}</span><span className="text-zinc-600">•</span><span className="cursor-pointer" onClick={() => onShowUserList('FOLLOWERS')}>{formatCount(isOwnProfile ? myFollowersCount : viewingUserStats.followers)} フォロワー</span></div>
      {!isOwnProfile && mutualFriendsList.length > 0 && (
        <div className="flex items-center justify-center gap-2 mt-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={onShowMutualFriends}>
          <div className="flex -space-x-2">
            {mutualFriendsList.slice(0, 3).map(m => <img key={m.id} src={m.avatar} className="w-6 h-6 rounded-full border-2 border-black object-cover" />)}
          </div>
          <span className="text-xs font-bold text-zinc-400">{mutualFriendsList.length}人の共通の友達</span>
        </div>
      )}
      <p className="text-zinc-300 text-sm mt-4 text-center max-w-xs">{profile?.bio}</p>
      <div className="flex flex-col items-center mt-3 gap-2 w-full max-w-xs"><div className="flex flex-wrap justify-center gap-1.5">{profile?.hashtags?.map((h, i) => (<span key={i} className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded text-[10px]">#{displayMusicTag(h)}</span>))}</div></div>
      <div className="flex gap-4 mt-4">
        {twitterUrl && (
          <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-black border border-zinc-800 flex items-center justify-center text-white hover:scale-105 transition-transform shadow-md">
            <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"></path></svg>
          </a>
        )}
        {instagramUrl && (
          <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 flex items-center justify-center text-white hover:scale-105 transition-transform shadow-md">
            <svg viewBox="0 0 24 24" className="w-6 h-6" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
          </a>
        )}
      </div>
      {isOwnProfile && favoriteArtists.length > 0 && (
        <div className="w-full mt-10">
          <p className="text-[13px] font-bold text-white mb-4 w-full text-left">{labels.favoriteArtists}</p>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {favoriteArtists.map((artist, i) => (
              <div key={i} onClick={(e) => onArtistClick(e, artist.artistId, artist.artistName, artist.artworkUrl)} className="flex flex-col items-center flex-shrink-0 w-16 cursor-pointer group">
                <img src={artist.artworkUrl} className="w-16 h-16 rounded-full object-cover border border-zinc-800 shadow-md group-hover:scale-105 transition-transform" />
                <p className="text-[10px] font-bold text-zinc-400 mt-2 truncate w-full text-center group-hover:text-white transition-colors">{artist.artistName}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {!isOwnProfile && viewingUser && vibeMatchData && (
        <div onClick={onShowVibeMatchDetails} className="mt-5 w-full max-w-[200px] bg-[#1c1c1e] border border-zinc-800 rounded-xl p-3 flex flex-col items-center shadow-lg cursor-pointer hover:bg-zinc-800/50 transition-colors">
          <div className="flex justify-between w-full mb-1"><span className="text-[10px] font-bold text-zinc-400 uppercase">Vibe Match</span><span className="text-[10px] font-bold text-[#1DB954]">{vibeMatchData.score}%</span></div>
          <div className="w-full bg-zinc-900 rounded-full h-1.5"><div className="bg-[#1DB954] h-full rounded-full" style={{ width: `${vibeMatchData.score}%` }}></div></div>
        </div>
      )}
      {!isOwnProfile && showVibeMatchDetails && viewingUser && vibeMatchData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[950] flex flex-col justify-end animate-fade-in" onClick={onCloseVibeMatchDetails}>
          <div className="bg-[#1c1c1e] rounded-t-[32px] p-8 w-full shadow-2xl relative flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-zinc-800 rounded-full mb-6 cursor-pointer" onClick={onCloseVibeMatchDetails}></div>
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
                  <div className="w-full bg-zinc-900 rounded-full h-1.5"><div className="bg-[#1DB954] h-full rounded-full" style={{ width: `${vibeMatchData.genre1Score}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between w-full mb-1"><span className="text-xs font-bold text-white">{vibeMatchData.genre2}</span><span className="text-xs font-bold text-[#1DB954]">{vibeMatchData.genre2Score}%</span></div>
                  <div className="w-full bg-zinc-900 rounded-full h-1.5"><div className="bg-[#1DB954] h-full rounded-full opacity-60" style={{ width: `${vibeMatchData.genre2Score}%` }}></div></div>
                </div>
              </div>
            </div>
            <button onClick={() => { onCloseVibeMatchDetails(); onOpenChat(viewingUser.id); }} className="w-full py-4 bg-[#1DB954] text-black rounded-xl font-bold flex justify-center items-center gap-2 hover:scale-105 transition-transform">
              <IconMessagePlus /> 音楽の趣味が合うね！とメッセージを送る
            </button>
          </div>
        </div>
      )}
      {isOwnProfile ? (
        <button onClick={onOpenEditProfile} className="mt-6 w-full max-w-[200px] py-3 bg-[#1c1c1e] hover:bg-zinc-800 transition-colors rounded-xl text-sm font-bold text-white shadow-sm">{labels.editProfileFull}</button>
      ) : viewingUser ? (
        <div className="flex flex-col gap-3 w-full max-w-[240px] mt-4">
          <div className="flex gap-2 w-full">
            <button onClick={() => onToggleFollow(viewingUser.id)} className={`flex-1 py-3 rounded-xl text-sm font-bold ${followedUsers.has(viewingUser.id) ? 'bg-[#1c1c1e] text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-gray-200'} transition-colors shadow-sm`}>{followedUsers.has(viewingUser.id) ? labels.following : labels.follow}</button>
            <button onClick={() => onOpenChat(viewingUser.id)} className="flex-1 py-3 bg-[#1c1c1e] text-white hover:bg-zinc-800 transition-colors rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-2"><IconMessagePlus /></button>
          </div>
          <div className="flex gap-2 w-full mt-2">
            <button onClick={() => onBlockUser(viewingUser.id)} className="flex-1 py-2 bg-transparent border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors rounded-xl text-[10px] font-bold">{labels.block}</button>
            <button onClick={() => onReportUser(viewingUser.id)} className="flex-1 py-2 bg-transparent border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors rounded-xl text-[10px] font-bold">{labels.report}</button>
          </div>
        </div>
      ) : null}
      <div className="w-full h-px bg-zinc-900 my-8"></div>
      {isOwnProfile && (
        <div className="flex w-full mb-6">
          <button onClick={() => onProfileTabChange('my_vibes')} className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-colors ${profileTabMode === 'my_vibes' ? 'border-white text-white' : 'border-transparent text-zinc-600'}`}>{labels.myEchoes}</button>
          <button onClick={() => onProfileTabChange('liked')} className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-colors ${profileTabMode === 'liked' ? 'border-white text-white' : 'border-transparent text-zinc-600'}`}>{labels.likedPosts}</button>
        </div>
      )}
      {isOwnProfile && profileTabMode === 'liked' ? (
        <div className="w-full flex flex-col gap-4">{likedPostsContent}</div>
      ) : calendarContent}
    </div>
  );
}
