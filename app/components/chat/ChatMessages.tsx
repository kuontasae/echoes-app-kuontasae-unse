"use client";

import React from "react";
import { ChatMessage, User } from "../../types";
import { IconPlay, IconStop } from "../../Icons";

const IconTrash = () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;

type ChatMessagesProps = {
  activeChatUserId: string;
  messages: ChatMessage[];
  allProfiles: User[];
  currentUserId?: string;
  timeZone: string;
  playingSong: string | null;
  activeMenuId: string | null;
  jumpToMessageId: string | null;
  messageRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  displayLocalTime: (timestamp: number, timeZone: string) => string;
  onOpenSenderProfile: (sender: User) => void;
  onOpenImage: (message: ChatMessage & { sender?: User }) => void;
  onTogglePlay: (previewUrl: string | null, song?: { title: string; artist: string; imgUrl: string }) => void;
  onArtistClick: (event: React.MouseEvent, artistId: number, artistName: string, artworkUrl: string) => void;
  onSetActiveMenuId: (value: string | null) => void;
  onDeleteMessage: (messageId: string, chatId: string) => void;
};

export function ChatMessages({
  activeChatUserId,
  messages,
  allProfiles,
  currentUserId,
  timeZone,
  playingSong,
  activeMenuId,
  jumpToMessageId,
  messageRefs,
  chatEndRef,
  displayLocalTime,
  onOpenSenderProfile,
  onOpenImage,
  onTogglePlay,
  onArtistClick,
  onSetActiveMenuId,
  onDeleteMessage,
}: ChatMessagesProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
      {messages.map((msg: any) => {
        const sender = allProfiles.find(u => u.id === msg.senderId);
        const isMe = msg.senderId === currentUserId;
        const isHighlighted = jumpToMessageId === msg.id;
        return (
          <div 
            key={msg.id} 
            ref={(el) => { messageRefs.current[msg.id] = el; }}
            className={`flex gap-2 max-w-[85%] transition-all duration-1000 ${isMe ? 'self-end' : 'self-start'} ${isHighlighted ? 'bg-[#1DB954]/20 p-2 rounded-2xl ring-2 ring-[#1DB954] shadow-[0_0_20px_rgba(29,185,84,0.3)] scale-[1.02] z-10' : ''}`}
          >
            {!isMe && sender && (
              <img
                src={sender.avatar}
                className="w-8 h-8 rounded-full object-cover self-end flex-shrink-0 cursor-pointer hover:opacity-80"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSenderProfile(sender);
                }}
              />
            )}
            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {!isMe && sender && <span className="text-[10px] text-zinc-500 mb-1 ml-1">{sender.name}</span>}
              <div
                onContextMenu={(e) => { e.preventDefault(); if (isMe) onSetActiveMenuId(msg.id); }}
                style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
                className={`w-fit h-fit break-words shadow-sm relative ${msg.text.startsWith('[IMAGE]') ? 'p-0 bg-transparent cursor-pointer' : msg.text.startsWith('[MUSIC]') || msg.text.startsWith('[FILE]') ? `bg-[#1c1c1e] text-white p-3 rounded-2xl border border-zinc-800/50 ${isMe ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'} cursor-pointer` : `px-3.5 py-2 cursor-pointer ${isMe ? 'bg-[#8de055] text-black rounded-[20px] rounded-br-[4px]' : 'bg-[#2c2c2e] text-white rounded-[20px] rounded-bl-[4px]'}`}`}
              >
                {msg.text.startsWith('[VOICE]') ? (
                  <audio controls src={msg.text.replace('[VOICE]', '')} className="max-w-[200px] h-10" />
                ) : msg.text.startsWith('[IMAGE]') ? (
                  <img src={msg.text.replace('[IMAGE]', '')} onClick={(e) => { e.stopPropagation(); onOpenImage({ ...msg, sender }); }} className="max-w-[240px] max-h-[300px] object-cover rounded-2xl hover:opacity-90 transition-opacity shadow-sm" alt="chat image" />
                ) : msg.text.startsWith('[FILE]') ? (
                  (() => {
                    const parts = msg.text.replace('[FILE]', '').split('|');
                    const fileName = parts[0] || "不明なファイル";
                    const fileUrl = parts[1] || "#";
                    const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
                    const ext = extMatch ? extMatch[1].toUpperCase() : 'FILE';
                    return (
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 w-[240px] p-2 hover:opacity-80 transition-opacity ${isMe ? 'bg-black/10' : 'bg-black/20'} rounded-xl`} onClick={(e) => e.stopPropagation()}>
                        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 bg-white rounded-lg text-red-500 shadow-sm">
                          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </div>
                        <div className="flex-1 overflow-hidden flex flex-col justify-center">
                          <span className="text-[14px] font-bold truncate leading-tight text-white mb-0.5">{fileName}</span>
                          <span className="text-[10px] font-bold text-zinc-400">{ext} • {parts[2] ? `サイズ: ${parts[2]}` : "サイズ情報なし"}</span>
                        </div>
                      </a>
                    );
                  })()
                ) : msg.text.startsWith('[MUSIC]') ? (
                  (() => {
                    const [trackId, trackName, artistName, artworkUrl, previewUrl] = msg.text.replace('[MUSIC]', '').split('|');
                    return (
                      <div className="flex items-center gap-4 w-[240px]" onClick={(e) => e.stopPropagation()}>
                        <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0 shadow-md border border-zinc-800 hover:opacity-80 transition-opacity" onClick={() => onTogglePlay(previewUrl, { title: trackName, artist: artistName, imgUrl: artworkUrl })}>
                          <img src={artworkUrl} className={`w-full h-full object-cover ${playingSong === previewUrl ? 'opacity-40 animate-[spin_4s_linear_infinite]' : ''}`} />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-white">
                            {playingSong === previewUrl ? <IconStop /> : <IconPlay />}
                          </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-bold text-[15px] text-white truncate leading-tight">{trackName}</p>
                          <p onClick={(e) => onArtistClick(e, parseInt(trackId) || 0, artistName, artworkUrl)} className="text-[11px] text-zinc-400 truncate mt-1 hover:underline hover:text-[#1DB954] transition-colors relative z-10 inline-block">{artistName}</p>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-[15px] font-medium leading-snug">{msg.text}</p>
                )}
                {activeMenuId === msg.id && isMe && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); onSetActiveMenuId(null); }}></div>
                    <div className={`absolute top-full ${isMe ? 'right-0' : 'left-0'} mt-2 bg-[#2c2c2e] border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[160px] animate-fade-in flex flex-col`}>
                      <button onClick={(e) => { e.stopPropagation(); onSetActiveMenuId(msg.id + '_confirm'); }} className="w-full text-left px-4 py-3 text-sm text-red-500 font-bold hover:bg-zinc-700 transition-colors flex items-center gap-2">
                        <IconTrash /> 送信取消
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onSetActiveMenuId(null); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-zinc-700 transition-colors border-t border-zinc-700">
                        キャンセル
                      </button>
                    </div>
                  </>
                )}
                {activeMenuId === msg.id + '_confirm' && isMe && (
                  <div className="fixed inset-0 z-[1300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={(e) => { e.stopPropagation(); onSetActiveMenuId(null); }}>
                    <div className="bg-[#1c1c1e] rounded-3xl p-6 w-full max-w-xs shadow-2xl border border-zinc-800 flex flex-col items-center text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="w-14 h-14 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4"><IconTrash /></div>
                      <h3 className="text-lg font-bold text-white mb-2">送信を取り消しますか？</h3>
                      <p className="text-xs text-zinc-400 mb-6 leading-relaxed">相手の画面からもこのメッセージや写真が<br/>完全に削除されます。</p>
                      <div className="flex gap-3 w-full">
                        <button onClick={(e) => { e.stopPropagation(); onSetActiveMenuId(null); }} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-colors">キャンセル</button>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteMessage(msg.id, activeChatUserId); onSetActiveMenuId(null); }} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors shadow-lg">取り消す</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[9px] text-zinc-500">{displayLocalTime(msg.timestamp, timeZone)}</span>
                {isMe && msg.isRead && (
                  <span className="text-[9px] text-[#1DB954] font-bold">
                    {activeChatUserId.startsWith('g') || activeChatUserId.startsWith('com') || activeChatUserId.startsWith('artist:') ? `既読 ${(msg as any).readCount || 0}` : '既読'}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={chatEndRef} />
    </div>
  );
}
