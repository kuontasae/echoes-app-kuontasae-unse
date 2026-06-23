"use client";
import React from 'react';
import { IconPlay, IconStop } from '../Icons';

interface MiniPlayerProps {
  activeTrackInfo: { title: string; artist: string; imgUrl: string } | null;
  playingSong: string | null;
  togglePlay: (url: string | null, meta?: { title: string; artist: string; imgUrl: string }) => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  activeTrackInfo,
  playingSong,
  togglePlay,
}) => {
  const handlePlayPauseClick = () => {
    togglePlay(playingSong, activeTrackInfo ?? undefined);
  };

  if (!activeTrackInfo) return null;

  return (
    <div className="fixed bottom-20 left-0 w-full px-4 z-[150] animate-fade-in pointer-events-none">
      <div className="bg-[#1c1c1e] border border-zinc-800/80 rounded-[20px] p-3 flex items-center justify-between shadow-2xl backdrop-blur-xl bg-opacity-95 max-w-md mx-auto pointer-events-auto">
        <div className="flex items-center gap-4 overflow-hidden flex-1">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 shadow-md">
            <img 
              src={activeTrackInfo.imgUrl} 
              alt="cover" 
              className={`w-full h-full object-cover ${playingSong ? 'animate-[spin_4s_linear_infinite]' : ''}`} 
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="font-bold text-[15px] text-white truncate">{activeTrackInfo.title}</p>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5">{activeTrackInfo.artist}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <button 
            onClick={handlePlayPauseClick} 
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-transform shadow-lg"
          >
            {playingSong ? (
              <IconStop />
            ) : (
              <IconPlay />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
