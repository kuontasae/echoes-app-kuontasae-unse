"use client";

import React from "react";
import Image from "next/image";
import type { Song, User } from "../types";
import {
  IconComment,
  IconHeart,
  IconPlay,
  IconShareExternal,
  IconStop,
} from "../Icons";

type FeedCardProps = {
  song: Song;
  timeZone: string;
  myProfileId: string;
  currentUserId?: string;
  playingSong: string | null;
  activeCommentSongId: string | null;
  commentInput: string;
  formatCount: (n?: number) => string;
  displayLocalTime: (ts: number, tz: string) => string;
  renderCaption: (caption: string) => React.ReactNode;
  onOpenUser: (user: User) => void;
  onOpenOwnProfile: () => void;
  onShareVibe: (song: Song) => void;
  onDeleteVibe: (id: string) => void;
  onTogglePlay: (url: string | null) => void;
  onArtistClick: (
    e: React.MouseEvent,
    id: number | undefined,
    name: string,
    url: string
  ) => void;
  onToggleLike: (id: string) => void;
  onToggleComments: (id: string) => void;
  onCommentInputChange: (value: string) => void;
  onSubmitComment: (id: string) => void;
};

export const FeedCard: React.FC<FeedCardProps> = ({
  song: s,
  timeZone,
  myProfileId,
  currentUserId,
  playingSong,
  activeCommentSongId,
  commentInput,
  formatCount,
  displayLocalTime,
  renderCaption,
  onOpenUser,
  onOpenOwnProfile,
  onShareVibe,
  onDeleteVibe,
  onTogglePlay,
  onArtistClick,
  onToggleLike,
  onToggleComments,
  onCommentInputChange,
  onSubmitComment,
}) => (
  <div className="bg-[#1c1c1e] border border-zinc-800/50 rounded-[24px] p-5 shadow-lg relative z-0">
    <div className="flex justify-between items-start mb-5">
      <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => { if (s.user.id !== 'me') { onOpenUser(s.user); } else { onOpenOwnProfile(); } }}>
        <div className="relative w-10 h-10 flex-shrink-0">
          <Image src={s.user.avatar || '/default-avatar.png'} alt="avatar" fill className="rounded-full object-cover" sizes="40px" unoptimized />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-sm font-bold truncate">{s.user.name}</p>
          <p className="text-[10px] text-zinc-500 truncate">@{s.user.handle} • {displayLocalTime(s.timestamp, timeZone)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onShareVibe(s); }} className="text-zinc-500 hover:text-white p-1"><IconShareExternal /></button>
        {(s.user.id === myProfileId || s.user.id === currentUserId || s.user.id === 'me') && <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteVibe(s.id); }} className="text-[10px] font-bold text-zinc-600 hover:text-red-500 uppercase tracking-widest p-1">削除</button>}
      </div>
    </div>
    <div className="flex items-center gap-4 mb-5">
      <div className="relative w-20 h-20 rounded-full overflow-hidden border border-zinc-700 group flex-shrink-0">
        <Image src={s.imgUrl} alt="cover" fill className={`object-cover ${playingSong === s.previewUrl ? 'animate-[spin_4s_linear_infinite]' : ''}`} sizes="80px" unoptimized />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePlay(s.previewUrl); }} className="w-10 h-10 bg-black/60 rounded-full flex items-center justify-center text-white pointer-events-auto shadow-lg hover:scale-105 transition-transform relative z-50">
            {playingSong === s.previewUrl ? <IconStop /> : <IconPlay />}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="font-bold text-lg truncate">{s.title}</p>
        <p onClick={(e) => onArtistClick(e, s.artistId, s.artist, s.imgUrl)} className="text-xs text-zinc-400 hover:text-[#1DB954] cursor-pointer inline-block mt-1 relative z-10 truncate max-w-full">{s.artist}</p>
      </div>
    </div>
    <p className="text-xs mb-5 leading-relaxed">{renderCaption(s.caption)}</p>
    <div className="flex gap-6 border-t border-zinc-800/60 pt-4">
      <button onClick={() => onToggleLike(s.id)} className="flex items-center gap-2"><IconHeart filled={s.isLiked} />{formatCount(s.likes)}</button>
      <button onClick={() => onToggleComments(s.id)} className="flex items-center gap-2"><IconComment />{formatCount(s.comments.length)}</button>
    </div>
    {activeCommentSongId === s.id && (
      <div className="mt-4 bg-black border border-zinc-800/80 rounded-xl p-4 animate-fade-in">
        <div className="flex flex-col gap-4 mb-4 max-h-[150px] overflow-y-auto scrollbar-hide">
          {s.comments.map(c => (
            <div key={c.id} className="text-[11px] flex items-start gap-2">
              <span className="font-bold text-[#1DB954] shrink-0">@{c.user.handle}</span>
              <span className="text-zinc-300 leading-relaxed break-words">{c.text}</span>
            </div>
          ))}
          {s.comments.length === 0 && <p className="text-[10px] text-zinc-500">まだコメントはありません</p>}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmitComment(s.id); }} className="flex gap-2 items-center">
          <input type="text" placeholder="コメントを追加..." value={commentInput} onChange={e => onCommentInputChange(e.target.value)} className="flex-1 bg-[#1c1c1e] rounded-full px-4 py-2 text-xs focus:outline-none" />
          <button type="submit" className="text-[10px] font-bold text-black bg-white px-4 py-2 rounded-full shrink-0">Post</button>
        </form>
      </div>
    )}
  </div>
);
