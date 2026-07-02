"use client";

import React from 'react';
import { IconChevronLeft, IconPlay, IconSend } from '../Icons';

type AlbumProfile = {
  collectionName: string;
  artistName: string;
  artworkUrl: string;
};

type AlbumTrack = {
  trackName: string;
  artistName?: string;
  artworkUrl100?: string;
  previewUrl?: string | null;
};

type AlbumDetailOverlayLabels = {
  tracksLoading: string;
};

type AlbumDetailOverlayProps = {
  album: AlbumProfile;
  albumSongs: AlbumTrack[];
  isAlbumLoading: boolean;
  canSendSong: boolean;
  labels: AlbumDetailOverlayLabels;
  onBack: () => void;
  onSelectTrack: (track: AlbumTrack) => void;
  onSendTrack: (track: AlbumTrack) => void;
};

export const AlbumDetailOverlay: React.FC<AlbumDetailOverlayProps> = ({
  album,
  albumSongs,
  isAlbumLoading,
  canSendSong,
  labels,
  onBack,
  onSelectTrack,
  onSendTrack,
}) => (
  <div className="fixed inset-0 bg-black z-[1000] animate-fade-in flex flex-col overflow-y-auto">
    <div className="flex items-center p-4 sticky top-0 bg-gradient-to-b from-black/90 to-transparent z-10 pb-12">
      <button onClick={onBack} className="text-white bg-black/40 backdrop-blur p-2 rounded-full"><IconChevronLeft /></button>
    </div>
    <div className="flex flex-col items-center px-6 relative -mt-10">
      <img src={album.artworkUrl} className="w-48 h-48 rounded-xl object-cover shadow-2xl mb-6 border border-zinc-800" />
      <h1 className="text-2xl font-black tracking-tight mb-1 text-center">{album.collectionName}</h1>
      <p className="text-sm text-zinc-400 mb-6">{album.artistName}</p>
    </div>
    <div className="px-4 pb-24">
      {isAlbumLoading ? <p className="text-center text-zinc-500 py-12">{labels.tracksLoading}</p> : (
        <div className="flex flex-col gap-2">
          {albumSongs.map((tItem, i) => (
            <div key={i} onClick={() => onSelectTrack(tItem)} className="flex items-center gap-4 py-3 px-2 hover:bg-zinc-800/50 rounded-xl cursor-pointer border-b border-zinc-900/50 last:border-0 group">
              <p className="text-zinc-500 font-bold text-sm w-6 text-right group-hover:hidden">{i + 1}</p>
              <div className="w-6 hidden group-hover:flex justify-end text-[#1DB954]"><IconPlay /></div>
              <div className="flex-1 overflow-hidden"><p className="font-bold text-sm truncate group-hover:text-[#1DB954] transition-colors">{tItem.trackName}</p></div>
              {canSendSong ? (
                <button onClick={(e) => {
                  e.stopPropagation();
                  onSendTrack(tItem);
                }} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-[#1DB954] hover:text-black transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                  <IconSend />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);
