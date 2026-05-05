"use client";

import React from "react";
import { IconChevronRight, IconPlay, IconTrend } from "../../Icons";

type MusicSearchBoxProps = {
  placeholder: string;
  searchQuery: string;
  isSearchFocused: boolean;
  searchArtistInfo: any | null;
  searchResults: any[];
  trendingSongs: any[];
  topResultsLabel: string;
  trendingSongsLabel: string;
  onFocus: () => void;
  onBlur: () => void;
  onSearchQueryChange: (value: string) => void;
  onArtistMouseDown: (e: React.MouseEvent, id: number | undefined, name: string, url: string) => void;
  onSelectSong: (song: any) => void;
};

export const MusicSearchBox: React.FC<MusicSearchBoxProps> = ({
  placeholder,
  searchQuery,
  isSearchFocused,
  searchArtistInfo,
  searchResults,
  trendingSongs,
  topResultsLabel,
  trendingSongsLabel,
  onFocus,
  onBlur,
  onSearchQueryChange,
  onArtistMouseDown,
  onSelectSong,
}) => (
  <div className="relative mb-10 z-40">
    <input
      type="text"
      placeholder={placeholder}
      onFocus={onFocus}
      onBlur={onBlur}
      value={searchQuery}
      onChange={(e) => onSearchQueryChange(e.target.value)}
      className="w-full bg-[#1c1c1e] rounded-xl p-4 text-sm text-white focus:outline-none focus:border-zinc-500 transition-all shadow-sm"
    />
    {isSearchFocused && searchQuery && (searchArtistInfo || searchResults.length > 0) && (
      <div className="absolute top-full left-0 w-full mt-2 bg-[#1c1c1e] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl max-h-[350px] overflow-y-auto">
        {searchArtistInfo && (
          <div className="p-4 border-b border-zinc-800 flex items-center gap-4 cursor-pointer hover:bg-zinc-800/50" onMouseDown={e => onArtistMouseDown(e, searchArtistInfo.artistId, searchArtistInfo.artistName, searchArtistInfo.artworkUrl)}>
            <img src={searchArtistInfo.artworkUrl} className="w-12 h-12 rounded-full object-cover" />
            <div className="flex-1"><p className="font-bold text-sm">{searchArtistInfo.artistName}</p><p className="text-[10px] text-zinc-400 mt-0.5">アーティスト</p></div>
            <IconChevronRight />
          </div>
        )}
        {searchResults.length > 0 && (
          <>
            <p className="text-[10px] font-bold text-zinc-500 uppercase px-4 pt-4 pb-2">{topResultsLabel}</p>
            {searchResults.map(tr => (
              <div key={tr.trackId} onMouseDown={(e) => { e.preventDefault(); onSelectSong(tr); }} className="p-4 flex items-center gap-4 hover:bg-zinc-800 cursor-pointer">
                <img src={tr.artworkUrl60} className="w-10 h-10 rounded" />
                <div className="flex-1 overflow-hidden"><p className="font-bold text-sm truncate">{tr.trackName}</p><p className="text-[10px] text-zinc-400 mt-0.5 truncate">{tr.artistName}</p></div>
              </div>
            ))}
          </>
        )}
      </div>
    )}
    {isSearchFocused && !searchQuery && trendingSongs.length > 0 && (
      <div className="absolute top-full left-0 w-full mt-2 bg-[#1c1c1e] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl max-h-[300px] overflow-y-auto">
        <p className="text-[10px] font-bold text-zinc-500 uppercase px-4 pt-4 pb-2 flex items-center"><IconTrend />{trendingSongsLabel}</p>
        {trendingSongs.map((tr, i) => (
          <div key={tr.trackId} onMouseDown={(e) => { e.preventDefault(); onSelectSong(tr); }} className="p-4 flex items-center gap-4 hover:bg-zinc-800 cursor-pointer group">
            <p className="text-zinc-600 font-bold text-sm w-4 text-right group-hover:hidden">{i + 1}</p>
            <div className="w-4 text-[#1DB954] hidden group-hover:block"><IconPlay /></div>
            <img src={tr.artworkUrl60} className="w-10 h-10 rounded" />
            <div className="flex-1 overflow-hidden"><p className="font-bold text-sm truncate">{tr.trackName}</p><p className="text-[10px] text-zinc-400 mt-0.5 truncate">{tr.artistName}</p></div>
          </div>
        ))}
      </div>
    )}
  </div>
);
