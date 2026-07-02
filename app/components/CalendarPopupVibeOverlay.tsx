"use client";

import React from 'react';
import { IconChevronRight } from '../Icons';
import type { Song } from '../types';

type CalendarPopupVibeOverlayProps = {
  vibe: Song;
  viewArtistDetailLabel: string;
  onClose: () => void;
  onOpenArtist: (event: React.MouseEvent<HTMLElement>) => void;
};

export const CalendarPopupVibeOverlay: React.FC<CalendarPopupVibeOverlayProps> = ({
  vibe,
  viewArtistDetailLabel,
  onClose,
  onOpenArtist,
}) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[850] flex flex-col justify-end animate-fade-in" onClick={onClose}>
    <div className="bg-[#1c1c1e] rounded-t-[32px] p-6 shadow-2xl relative flex flex-col items-center" onClick={e => e.stopPropagation()}>
      <div className="w-12 h-1.5 bg-zinc-800 rounded-full mb-6 cursor-pointer" onClick={onClose}></div>
      <img src={vibe.imgUrl} className="w-48 h-48 rounded-xl object-cover shadow-2xl mb-6 border border-zinc-800" />
      <h2 className="text-xl font-bold text-center mb-1">{vibe.title}</h2>
      <p onClick={onOpenArtist} className="text-sm text-[#1DB954] font-bold mb-8 cursor-pointer hover:underline">{vibe.artist}</p>
      <button onClick={onOpenArtist} className="w-full py-4 bg-white text-black rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-gray-200 transition-colors">
        {viewArtistDetailLabel} <IconChevronRight />
      </button>
    </div>
  </div>
);
