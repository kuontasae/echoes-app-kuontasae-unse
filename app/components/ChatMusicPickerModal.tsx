"use client";

import React from 'react';
import { IconChevronRight, IconCross, IconMusic, IconSearch, IconSend, IconTrend } from '../Icons';

const IconPlus = () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

type ChatMusicSong = {
  trackId?: number | string;
  trackName: string;
  artistName: string;
  artworkUrl60: string;
  artworkUrl100: string;
  previewUrl?: string | null;
};

type ChatMusicArtistInfo = {
  artistId?: number | string;
  artistName: string;
  artworkUrl: string;
};

type ChatMusicPickerLabels = {
  confirmMusic: string;
  shareMusic: string;
  searchPlaceholder: string;
  chatArtist: string;
  topResults: string;
  addMessage: string;
  commentPlaceholder: string;
  sendToChat: string;
};

type ChatMusicPickerModalProps = {
  selectedChatSong: ChatMusicSong | null;
  searchQuery: string;
  searchArtistInfo: ChatMusicArtistInfo | null;
  searchResults: ChatMusicSong[];
  trendingSongs: ChatMusicSong[];
  trendingSongsLabel: string;
  chatMusicComment: string;
  currentUserExists: boolean;
  myProfileAvatar: string;
  labels: ChatMusicPickerLabels;
  onClose: () => void;
  onSearchQueryChange: (value: string) => void;
  onArtistMouseDown: (e: React.MouseEvent) => void;
  onSelectSong: (song: ChatMusicSong) => void;
  onClearSelectedSong: () => void;
  onCommentChange: (value: string) => void;
  onCommentKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement>;
  onSendMusicShare: () => void;
};

export const ChatMusicPickerModal: React.FC<ChatMusicPickerModalProps> = ({
  selectedChatSong,
  searchQuery,
  searchArtistInfo,
  searchResults,
  trendingSongs,
  trendingSongsLabel,
  chatMusicComment,
  currentUserExists,
  myProfileAvatar,
  labels,
  onClose,
  onSearchQueryChange,
  onArtistMouseDown,
  onSelectSong,
  onClearSelectedSong,
  onCommentChange,
  onCommentKeyDown,
  onSendMusicShare,
}) => (
  <div className="fixed inset-0 z-[1200] flex flex-col justify-end animate-fade-in">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
    <div className={`bg-[#1c1c1e] rounded-t-[32px] w-full pb-10 pt-4 px-4 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-all duration-300 ${selectedChatSong ? 'h-[85vh]' : 'h-[70vh]'} flex flex-col`}>
      <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={onClose}></div>
      <div className="flex justify-between items-center mb-4 px-2 shrink-0">
        <div className="w-8"></div>
        <h3 className="text-[15px] font-bold text-white flex items-center gap-2"><IconMusic /> {selectedChatSong ? labels.confirmMusic : labels.shareMusic}</h3>
        <button onClick={onClose} className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"><IconCross /></button>
      </div>
      {!selectedChatSong ? (
        // 曲選択モード（検索UI）
        <>
          <div className="relative mb-4 px-2 shrink-0">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500"><IconSearch /></div>
            <input type="text" placeholder={labels.searchPlaceholder} value={searchQuery} onChange={e => onSearchQueryChange(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none" />
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-hide flex flex-col gap-2">
            {searchQuery && searchArtistInfo && (
              <>
                <div className="p-3 border border-zinc-800 flex items-center gap-4 cursor-pointer hover:bg-zinc-800/50 rounded-2xl mb-2" onMouseDown={onArtistMouseDown}>
                  <img src={searchArtistInfo.artworkUrl} className="w-12 h-12 rounded-full object-cover" />
                  <div className="flex-1"><p className="font-bold text-sm text-white">{searchArtistInfo.artistName}</p><p className="text-[10px] text-zinc-400 mt-0.5">{labels.chatArtist}</p></div>
                  <IconChevronRight />
                </div>
                {searchResults.length > 0 && <p className="text-[10px] font-bold text-zinc-500 uppercase px-2 pt-2 pb-1">{labels.topResults}</p>}
              </>
            )}
            {!searchQuery && trendingSongs.length > 0 && <p className="text-[10px] font-bold text-zinc-500 uppercase px-2 pt-2 pb-1 flex items-center"><IconTrend />{trendingSongsLabel}</p>}
            {(searchQuery && searchResults.length > 0 ? searchResults : trendingSongs).map((song, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-zinc-800/30 hover:bg-zinc-800 rounded-2xl cursor-pointer transition-colors group" onClick={() => onSelectSong(song)}>
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
        <div className="flex-1 flex flex-col gap-6 animate-fade-in p-2">
          <div className="flex items-center gap-4 bg-black p-4 rounded-2xl border border-zinc-800">
            <img src={selectedChatSong.artworkUrl100} className="w-20 h-20 rounded-xl object-cover shadow-md" />
            <div className="flex-1 overflow-hidden">
              <p className="font-bold text-lg text-white truncate">{selectedChatSong.trackName}</p>
              <p className="text-sm text-zinc-400 mt-1 truncate">{selectedChatSong.artistName}</p>
            </div>
            <button onClick={onClearSelectedSong} className="text-zinc-600 hover:text-white transition-colors"><IconCross /></button>
          </div>
          <div className="flex-1 bg-black rounded-2xl border border-zinc-800 p-4 flex flex-col relative">
            {currentUserExists && (
              <div className="flex items-center gap-2 mb-3">
                <img src={myProfileAvatar} className="w-6 h-6 rounded-full object-cover" />
                <span className="text-xs font-bold text-zinc-400">{labels.addMessage}</span>
              </div>
            )}
            <textarea value={chatMusicComment} onChange={e => onCommentChange(e.target.value)} onKeyDown={onCommentKeyDown} placeholder={labels.commentPlaceholder} className="w-full flex-1 bg-transparent text-white text-sm resize-none focus:outline-none scrollbar-hide" />
            <div className="absolute bottom-3 right-3 text-xs text-zinc-600">{chatMusicComment.length}/100</div>
          </div>
          <button onClick={onSendMusicShare} className="w-full bg-[#1DB954] text-black font-bold rounded-full py-4 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg">
            <IconSend /> {labels.sendToChat}
          </button>
        </div>
      )}
    </div>
  </div>
);
