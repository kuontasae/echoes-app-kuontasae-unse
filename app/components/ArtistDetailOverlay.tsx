"use client";

import React from 'react';
import { IconChevronLeft, IconHeart, IconPlay, IconSend, IconStop, IconUsers, IconVerified } from '../Icons';
import type { LiveCommunity } from '../types';

type ArtistProfile = {
  artistName: string;
  artistImageUrl?: string | null;
  artworkUrl?: string | null;
  isVerifiedReal?: boolean;
};

type ArtistTrack = {
  trackName: string;
  artistName: string;
  artworkUrl60: string;
  artworkUrl100: string;
  previewUrl: string | null;
};

type ArtistAlbum = {
  collectionId: number | string;
  collectionName: string;
  artworkUrl100: string;
  artistName: string;
};

type ArtistDetailOverlayLabels = {
  back: string;
  favoriteArtists: string;
  latestRelease: string;
  popularSongs: string;
  popularAlbums: string;
  artistTracksLoading: string;
  viewCommunity: string;
  joinCommunityAction: string;
};

type ArtistDetailOverlayProps = {
  artist: ArtistProfile;
  artistSongs: ArtistTrack[];
  latestReleaseSong: ArtistTrack | null;
  uniqueAlbums: ArtistAlbum[];
  activeArtistCommunity: LiveCommunity | null;
  chatCommunities: { id: string }[];
  isArtistLoading: boolean;
  isFavoriteArtist: boolean;
  playingSong: string | null;
  favoriteCountLabel: string;
  labels: ArtistDetailOverlayLabels;
  formatArtistCommunityDisplayName: (community: LiveCommunity) => string;
  formatCommunityDescription: (community: LiveCommunity) => string | undefined;
  formatCommunityJoinedCount: (count: number) => string;
  onBack: () => void;
  onPlayTopSong: () => void;
  onToggleFavoriteArtist: () => void;
  onOpenCommunityChat: (community: LiveCommunity) => void;
  onJoinCommunity: (community: LiveCommunity) => void;
  onSelectSong: (song: ArtistTrack) => void;
  onSendSong: (song: ArtistTrack) => void;
  onPlaySongPreview: (song: ArtistTrack) => void;
  onOpenAlbum: (album: ArtistAlbum) => void;
  canSendSong: boolean;
};

export const ArtistDetailOverlay: React.FC<ArtistDetailOverlayProps> = ({
  artist,
  artistSongs,
  latestReleaseSong,
  uniqueAlbums,
  activeArtistCommunity,
  chatCommunities,
  isArtistLoading,
  isFavoriteArtist,
  playingSong,
  favoriteCountLabel,
  labels,
  formatArtistCommunityDisplayName,
  formatCommunityDescription,
  formatCommunityJoinedCount,
  onBack,
  onPlayTopSong,
  onToggleFavoriteArtist,
  onOpenCommunityChat,
  onJoinCommunity,
  onSelectSong,
  onSendSong,
  onPlaySongPreview,
  onOpenAlbum,
  canSendSong,
}) => (
  <div className="fixed inset-0 bg-black z-[1000] animate-fade-in flex flex-col overflow-y-auto">
    <div className="absolute top-0 w-full h-[50vh] z-0 pointer-events-none">
      {(artist.artistImageUrl || artist.artworkUrl) && (
        <img src={artist.artistImageUrl || artist.artworkUrl || ""} className="w-full h-full object-cover opacity-60" onError={(e) => {
          e.currentTarget.style.display = 'none';
        }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black"></div>
    </div>
    <div className="flex items-center p-4 sticky top-0 z-20">
      <button aria-label={labels.back} onClick={onBack} className="text-white bg-black/40 backdrop-blur p-2 rounded-full"><IconChevronLeft /></button>
    </div>
    <div className="px-6 relative z-10 mt-[15vh] mb-8">
      <h1 className="text-5xl font-black tracking-tighter mb-2 break-all leading-tight drop-shadow-lg flex items-center flex-wrap gap-4">
        {artist.artistName}
        {/* 💡 ステップ11: 本物のアーティスト情報が取得できた場合のみ、緑の公式マークを表示 */}
        {artist.isVerifiedReal && (
          <span className="text-[#1DB954] w-10 h-10 flex items-center justify-center bg-black/30 rounded-full backdrop-blur-md">
            <IconVerified />
          </span>
        )}
      </h1>
      <p className="text-xs text-zinc-300 font-bold mb-6 drop-shadow">
        {favoriteCountLabel}
      </p>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onPlayTopSong} className="w-14 h-14 bg-[#1DB954] rounded-full flex items-center justify-center text-black shadow-xl hover:scale-105 transition-transform">
          {playingSong === artistSongs[0]?.previewUrl ? <IconStop /> : <IconPlay />}
        </button>
        <button aria-label={labels.favoriteArtists} aria-pressed={isFavoriteArtist} onClick={onToggleFavoriteArtist} className="w-12 h-12 bg-black/40 backdrop-blur rounded-full flex items-center justify-center border border-zinc-700/50">
          <IconHeart filled={isFavoriteArtist} />
        </button>
      </div>
      {activeArtistCommunity && (
        <div className="bg-[#1c1c1e]/90 border border-[#1DB954]/20 rounded-2xl p-4 shadow-2xl backdrop-blur-md">
          <div className="flex gap-4">
            <div className="w-14 h-14 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0">
              {activeArtistCommunity.artworkUrl ? (
                <>
                  <img src={activeArtistCommunity.artworkUrl} className="w-full h-full object-cover" onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.style.display = 'flex';
                  }} />
                  <div className="hidden w-full h-full items-center justify-center text-zinc-500"><IconUsers /></div>
                </>
              ) : <div className="w-full h-full flex items-center justify-center text-zinc-500"><IconUsers /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-black text-white truncate">{formatArtistCommunityDisplayName(activeArtistCommunity)}</p>
              <p className="text-xs text-zinc-300 leading-relaxed mt-1">{formatCommunityDescription(activeArtistCommunity)}</p>
              <p className="text-[11px] text-zinc-500 font-bold mt-2">{formatCommunityJoinedCount(activeArtistCommunity.memberCount)}</p>
            </div>
          </div>
          {activeArtistCommunity.isJoined || chatCommunities.some(c => c.id === activeArtistCommunity.id) ? (
            <button onClick={() => onOpenCommunityChat(activeArtistCommunity)} className="w-full mt-4 py-3 bg-[#1DB954] text-black rounded-xl text-xs font-bold">{labels.viewCommunity}</button>
          ) : (
            <button onClick={() => onJoinCommunity(activeArtistCommunity)} className="w-full mt-4 py-3 bg-white text-black rounded-xl text-xs font-bold">{labels.joinCommunityAction}</button>
          )}
        </div>
      )}
    </div>
    <div className="px-4 pb-24 relative z-10 bg-black min-h-[50vh]">
      {isArtistLoading ? <p className="text-center text-zinc-500 py-12">{labels.artistTracksLoading}</p> : (
        <>
          {latestReleaseSong && (
            <div className="mb-10">
              <h3 className="text-lg font-bold mb-4 px-2">{labels.latestRelease}</h3>
              <div onClick={() => onSelectSong(latestReleaseSong)} className="flex items-center gap-4 bg-[#1c1c1e] p-4 rounded-2xl cursor-pointer hover:bg-zinc-800 transition-colors group">
                <div className="relative w-16 h-16 rounded overflow-hidden shadow-md flex-shrink-0 z-10 hover:scale-105 transition-transform" onClick={(e) => { e.stopPropagation(); onPlaySongPreview(latestReleaseSong); }}>
                  <img src={latestReleaseSong.artworkUrl60.replace('60x60bb', '300x300bb')} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100"><IconPlay /></div>
                </div>
                <div className="flex-1 overflow-hidden"><p className="font-bold text-base truncate">{latestReleaseSong.trackName}</p><p className="text-xs text-[#1DB954] font-bold mt-1">NEW</p></div>
                {canSendSong ? (
                  <button onClick={(e) => {
                    e.stopPropagation();
                    onSendSong(latestReleaseSong);
                  }} className="w-10 h-10 rounded-full bg-zinc-800/80 flex items-center justify-center text-white hover:bg-[#1DB954] hover:text-black transition-colors shrink-0 shadow-md">
                    <IconSend />
                  </button>
                ) : null}
              </div>
            </div>
          )}
          <h3 className="text-lg font-bold mb-4 px-2">{labels.popularSongs}</h3>
          <div className="flex flex-col gap-1 mb-10">
            {artistSongs.slice(0, 10).map((s, i) => (
              <div key={i} onClick={() => onSelectSong(s)} className="flex items-center gap-4 py-3 px-2 hover:bg-zinc-800/50 rounded-xl cursor-pointer group">
                <p className="text-zinc-500 font-bold text-sm w-4 text-right group-hover:hidden">{i + 1}</p>
                <div className="w-4 hidden group-hover:block text-[#1DB954]"><IconPlay /></div>
                <img src={s.artworkUrl60} className="w-10 h-10 rounded object-cover shadow-sm z-10 relative hover:scale-105 transition-transform cursor-pointer" onClick={(e) => { e.stopPropagation(); onPlaySongPreview(s); }} />
                <div className="flex-1 overflow-hidden"><p className="font-bold text-sm truncate group-hover:text-[#1DB954] transition-colors">{s.trackName}</p></div>
                {canSendSong ? (
                  <button onClick={(e) => {
                    e.stopPropagation();
                    onSendSong(s);
                  }} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-[#1DB954] hover:text-black transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                    <IconSend />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {uniqueAlbums.length > 0 && (
            <div>
              <h3 className="text-lg font-bold mb-4 px-2">{labels.popularAlbums}</h3>
              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 px-2">
                {uniqueAlbums.map((album, i) => (
                  <div key={i} onClick={() => onOpenAlbum(album)} className="flex-shrink-0 w-32 cursor-pointer group">
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
);
