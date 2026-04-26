"use client";

import React from "react";

type SongPostModalProps = {
  draftSong: any | null;
  showOverrideConfirm: boolean;
  draftCaption: string;
  playingSong: string | null;
  cancelLabel: string;
  postLabel: string;
  onCancelDraft: () => void;
  onCaptionChange: (value: string) => void;
  onPost: () => void;
  onCancelOverride: () => void;
  onOverwrite: () => void;
};

export const SongPostModal: React.FC<SongPostModalProps> = ({
  draftSong,
  showOverrideConfirm,
  draftCaption,
  playingSong,
  cancelLabel,
  postLabel,
  onCancelDraft,
  onCaptionChange,
  onPost,
  onCancelOverride,
  onOverwrite,
}) => (
  <>
    {draftSong && !showOverrideConfirm && (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[1200] flex items-center justify-center p-6 animate-fade-in" onClick={onCancelDraft}>
        <div className="bg-[#1c1c1e] border border-zinc-800 p-8 rounded-[32px] w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
          <div className="relative w-24 h-24 mx-auto mb-6">
            <img src={draftSong.artworkUrl100.replace('100x100bb', '300x300bb')} className={`w-full h-full rounded-full shadow-lg border-2 border-zinc-800 object-cover ${playingSong === draftSong.previewUrl ? 'animate-[spin_10s_linear_infinite]' : ''}`} />
          </div>
          <p className="text-center font-bold text-sm truncate mb-1">{draftSong.trackName}</p>
          <p className="text-center text-[#1DB954] text-[10px] mb-8 font-bold">{draftSong.artistName}</p>
          <textarea placeholder="今日のVibeは？ (@でメンション)" value={draftCaption} onChange={(e) => onCaptionChange(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-xs text-white focus:outline-none min-h-[100px] resize-none mb-6" />
          <div className="flex gap-4">
            <button onClick={onCancelDraft} className="flex-1 py-3.5 border border-zinc-800 rounded-xl text-xs font-bold uppercase">{cancelLabel}</button>
            <button onClick={onPost} className="flex-1 py-3.5 bg-white text-black rounded-xl text-xs font-bold uppercase">{postLabel}</button>
          </div>
        </div>
      </div>
    )}
    {showOverrideConfirm && (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[1200] flex items-center justify-center p-6 animate-fade-in" onClick={onCancelOverride}>
        <div className="bg-[#1c1c1e] border border-zinc-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
          <p className="text-center font-bold text-lg mb-6 leading-relaxed">今日はすでに投稿しています。<br />上書きして記録しますか？</p>
          <div className="flex gap-4">
            <button onClick={onCancelOverride} className="flex-1 py-3.5 border border-zinc-800 rounded-xl text-xs font-bold uppercase">{cancelLabel}</button>
            <button onClick={onOverwrite} className="flex-1 py-3.5 bg-white text-black rounded-xl text-xs font-bold uppercase">上書きする</button>
          </div>
        </div>
      </div>
    )}
  </>
);
