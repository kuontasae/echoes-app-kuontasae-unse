"use client";

import React from "react";
import { IconCross, IconPlay, IconSend, IconStop } from "../../Icons";

const IconPlus = () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IconImage = () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;
const IconMic = () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>;
const IconFile = () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>;
const IconMusic = () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" className="text-zinc-400"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>;

type PendingAttachment = { type: 'image' | 'file'; data: string; name: string; file: File };

type ChatInputBarProps = {
  messageInput: string;
  pendingAttachments: PendingAttachment[];
  showChatPlusMenu: boolean;
  showVoiceMenu: boolean;
  isRecording: boolean;
  recordingSeconds: number;
  draftVoice: { blob: Blob; url: string } | null;
  draftAudioRef: React.RefObject<HTMLAudioElement | null>;
  isPlayingDraft: boolean;
  onMessageChange: (value: string) => void;
  onTogglePlusMenu: () => void;
  onToggleVoiceMenu: () => void;
  onAddAttachments: (attachments: PendingAttachment[]) => void;
  onRemoveAttachment: (index: number) => void;
  onOpenMusicSelector: () => void;
  onSubmitMessage: () => void;
  onCancelVoiceRecording: () => void;
  onStartVoiceRecording: () => void;
  onStopVoiceRecording: () => void;
  onToggleDraftPlay: () => void;
  onSendVoiceMessage: () => void;
  onDraftAudioEnded: () => void;
};

export function ChatInputBar({
  messageInput,
  pendingAttachments,
  showChatPlusMenu,
  showVoiceMenu,
  isRecording,
  recordingSeconds,
  draftVoice,
  draftAudioRef,
  isPlayingDraft,
  onMessageChange,
  onTogglePlusMenu,
  onToggleVoiceMenu,
  onAddAttachments,
  onRemoveAttachment,
  onOpenMusicSelector,
  onSubmitMessage,
  onCancelVoiceRecording,
  onStartVoiceRecording,
  onStopVoiceRecording,
  onToggleDraftPlay,
  onSendVoiceMessage,
  onDraftAudioEnded,
}: ChatInputBarProps) {
  return (
    <>
      {showChatPlusMenu && (
        <div className="bg-[#1c1c1e] p-6 grid grid-cols-4 gap-4 border-t border-zinc-900 animate-fade-in absolute bottom-[68px] w-full z-20">
          <label className="flex flex-col items-center gap-2 cursor-pointer hover:opacity-80">
            <div className="w-12 h-12 bg-zinc-800 rounded-[18px] flex items-center justify-center text-white"><IconFile /></div>
            <span className="text-[11px] font-bold text-zinc-400">ファイル</span>
            <input type="file" multiple onChange={(e) => {
              if(e.target.files) {
                const newFiles = Array.from(e.target.files).map(f => ({ type: 'file' as const, data: URL.createObjectURL(f), name: f.name, file: f }));
                onAddAttachments(newFiles);
              }
              e.target.value = '';
            }} className="absolute opacity-0 w-0 h-0 overflow-hidden" />
          </label>
          <div className="flex flex-col items-center gap-2 cursor-pointer hover:opacity-80" onClick={onOpenMusicSelector}>
            <div className="w-12 h-12 bg-zinc-800 rounded-[18px] flex items-center justify-center text-white"><IconMusic /></div>
            <span className="text-[11px] font-bold text-zinc-400">音楽</span>
          </div>
        </div>
      )}
      {showVoiceMenu && (
        <div className="bg-[#1c1c1e] border-t border-zinc-900 animate-fade-in absolute bottom-[68px] w-full z-20 flex flex-col items-center justify-center min-h-[250px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <button onClick={onCancelVoiceRecording} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white"><IconCross /></button>
          {draftVoice && <audio ref={draftAudioRef} src={draftVoice.url} onEnded={onDraftAudioEnded} className="hidden" />}
          {!isRecording && !draftVoice && (
            <>
              <p className="text-zinc-400 text-sm font-bold mb-8">ボタンをタップして録音してください</p>
              <div onClick={onStartVoiceRecording} className="w-28 h-28 rounded-full border-4 border-zinc-800 flex items-center justify-center cursor-pointer hover:bg-zinc-800/50 transition-colors">
                <div className="w-10 h-10 bg-red-500 rounded-full"></div>
              </div>
            </>
          )}
          {isRecording && (
            <>
              <p className="text-red-500 text-3xl font-bold mb-8 tracking-widest">{Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}</p>
              <div onClick={onStopVoiceRecording} className="w-28 h-28 rounded-full border-4 border-red-500/30 flex items-center justify-center cursor-pointer hover:bg-red-500/10 transition-colors animate-pulse">
                <div className="w-8 h-8 bg-red-500 rounded-sm"></div>
              </div>
            </>
          )}
          {draftVoice && (
            <>
              <p className="text-[#1DB954] text-3xl font-bold mb-8 tracking-widest">{Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}</p>
              <div className="flex items-center gap-8">
                <button onClick={onCancelVoiceRecording} className="w-14 h-14 rounded-full border-2 border-zinc-700 flex items-center justify-center text-red-500 hover:bg-zinc-800 transition-colors">
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
                <button onClick={onToggleDraftPlay} className="w-24 h-24 rounded-full border-4 border-[#1DB954] flex items-center justify-center text-[#1DB954] hover:bg-[#1DB954]/10 transition-colors">
                  {isPlayingDraft ? <IconStop /> : <IconPlay />}
                </button>
                <button onClick={onSendVoiceMessage} className="w-14 h-14 rounded-full border-2 border-zinc-700 flex items-center justify-center text-blue-500 hover:bg-zinc-800 pl-1 transition-colors">
                  <IconSend />
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <div className="bg-[#0a0a0a] border-t border-zinc-900 flex flex-col relative z-30">
        {pendingAttachments.length > 0 && (
          <div className="flex flex-col gap-2 p-3 mx-3 mt-3 bg-[#1c1c1e] rounded-xl border border-zinc-800 animate-fade-in max-h-[150px] overflow-y-auto scrollbar-hide">
            {pendingAttachments.map((att, idx) => (
              <div key={idx} className="flex items-center justify-between bg-black/50 p-2 rounded-lg">
                <div className="flex items-center gap-3">
                  {att.type === 'image' ? (
                    <img src={att.data} className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <span className="text-[#1DB954]"><IconFile /></span>
                  )}
                  <span className="text-xs text-white font-bold truncate max-w-[180px]">{att.name}</span>
                </div>
                <button onClick={() => onRemoveAttachment(idx)} className="w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors shrink-0">
                  <IconCross />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="p-3 flex gap-3 items-center">
          <button onClick={onTogglePlusMenu} className={`w-7 h-7 flex items-center justify-center transition-colors flex-shrink-0 ${showChatPlusMenu ? 'text-white rotate-45' : 'text-zinc-400 hover:text-white'}`}>
            <IconPlus />
          </button>
          <label className="relative w-7 h-7 flex-shrink-0 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer">
            <IconImage />
            <input type="file" accept="image/*" multiple onChange={(e) => {
              if(e.target.files) {
                const newFiles = Array.from(e.target.files).map(f => ({ type: 'image' as const, data: URL.createObjectURL(f), name: f.name, file: f }));
                onAddAttachments(newFiles);
              }
              e.target.value = '';
            }} className="absolute opacity-0 w-0 h-0 overflow-hidden" />
          </label>
          <div className="flex-1 bg-[#1c1c1e] rounded-full px-4 py-2 flex items-center">
            <input type="text" placeholder="Aa" value={messageInput} onChange={(e) => onMessageChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) onSubmitMessage(); }} className="w-full bg-transparent text-[15px] text-white focus:outline-none" />
          </div>
          {messageInput.trim() || pendingAttachments.length > 0 ? (
            <button onClick={onSubmitMessage} className="w-8 h-8 rounded-full flex items-center justify-center bg-[#1DB954] text-black shadow-sm flex-shrink-0 transition-colors hover:scale-105">
              <IconSend />
            </button>
          ) : (
            <button onClick={onToggleVoiceMenu} className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 transition-colors ${showVoiceMenu ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
              <IconMic />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
