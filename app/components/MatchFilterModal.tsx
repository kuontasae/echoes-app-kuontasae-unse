"use client";

import React from 'react';
import { IconCross, IconTicket } from '../Icons';

type MatchFilterArtist = {
  artistId: number | string;
  artistName: string;
  artworkUrl: string;
};

type MatchFilterValue = {
  artists: MatchFilterArtist[];
  hashtags: string[];
  liveHistories: string[];
  ageMin: number;
  ageMax: number;
  gender: string;
};

type MatchFilterModalLabels = {
  title: string;
  artist: string;
  artistPlaceholder: string;
  tagLive: string;
  tagLivePlaceholder: string;
  ageRange: string;
  sex: string;
  sexAll: string;
  sexMale: string;
  sexFemale: string;
  apply: string;
};

type MatchFilterModalProps = {
  matchFilter: MatchFilterValue;
  filterArtistInput: string;
  filterArtistSuggestions: MatchFilterArtist[];
  filterHashtagInput: string;
  allAvailableHashtags: string[];
  allAvailableLiveHistories: string[];
  labels: MatchFilterModalLabels;
  getMusicTagLabel: (value: string) => string;
  onClose: () => void;
  onArtistInputChange: (value: string) => void;
  onHashtagInputChange: (value: string) => void;
  onArtistClick: (e: React.MouseEvent, id: number | string, name: string, url: string) => void;
  onRemoveArtist: (artistId: number | string) => void;
  onSelectArtistSuggestion: (artist: MatchFilterArtist) => void;
  onRemoveHashtag: (hashtag: string) => void;
  onRemoveLiveHistory: (liveHistory: string) => void;
  onSelectHashtagSuggestion: (hashtag: string) => void;
  onSelectLiveHistorySuggestion: (liveHistory: string) => void;
  onAgeMinChange: (value: number) => void;
  onAgeMaxChange: (value: number) => void;
  onGenderChange: (value: string) => void;
};

export const MatchFilterModal: React.FC<MatchFilterModalProps> = ({
  matchFilter,
  filterArtistInput,
  filterArtistSuggestions,
  filterHashtagInput,
  allAvailableHashtags,
  allAvailableLiveHistories,
  labels,
  getMusicTagLabel,
  onClose,
  onArtistInputChange,
  onHashtagInputChange,
  onArtistClick,
  onRemoveArtist,
  onSelectArtistSuggestion,
  onRemoveHashtag,
  onRemoveLiveHistory,
  onSelectHashtagSuggestion,
  onSelectLiveHistorySuggestion,
  onAgeMinChange,
  onAgeMaxChange,
  onGenderChange,
}) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[950] flex items-center justify-center p-6 animate-fade-in" onClick={onClose}>
    <div className="bg-[#1c1c1e] border border-zinc-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg">{labels.title}</h3><button onClick={onClose} className="text-zinc-500 hover:text-white"><IconCross /></button></div>
      <div className="flex flex-col gap-6">
        <div className="relative">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">{labels.artist}</label>
          {matchFilter.artists.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {matchFilter.artists.map(a => (
                <div key={a.artistId} className="flex items-center bg-zinc-800 rounded-full pl-1 pr-3 py-1 gap-2">
                  <img src={a.artworkUrl} className="w-6 h-6 rounded-full object-cover cursor-pointer" onClick={(e) => onArtistClick(e, a.artistId, a.artistName, a.artworkUrl)} />
                  <span className="text-xs font-bold text-white cursor-pointer hover:underline" onClick={(e) => onArtistClick(e, a.artistId, a.artistName, a.artworkUrl)}>{a.artistName}</span>
                  <button onClick={() => onRemoveArtist(a.artistId)} className="text-zinc-500 hover:text-white ml-1"><IconCross /></button>
                </div>
              ))}
            </div>
          )}
          <input type="text" placeholder={labels.artistPlaceholder} value={filterArtistInput} onChange={e => onArtistInputChange(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500" />
          {filterArtistSuggestions.length > 0 && filterArtistInput && (
            <div className="absolute top-full left-0 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden z-50">
              {filterArtistSuggestions.map(a => (
                <div key={a.artistId} onMouseDown={(e) => { e.preventDefault(); onSelectArtistSuggestion(a); }} className="flex items-center gap-3 p-3 text-xs text-white hover:bg-zinc-700 cursor-pointer border-b border-zinc-700 last:border-0">
                  <img src={a.artworkUrl} className="w-8 h-8 rounded-full object-cover" />
                  <span className="font-bold">{a.artistName}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">{labels.tagLive}</label>
          {matchFilter.hashtags.length > 0 && (<div className="flex flex-wrap gap-2 mb-3">{matchFilter.hashtags.map(h => (<div key={h} className="flex items-center bg-zinc-800 rounded-full px-3 py-1 gap-2"><span className="text-xs font-bold text-white">#{getMusicTagLabel(h)}</span><button onClick={() => onRemoveHashtag(h)} className="text-zinc-500 hover:text-white ml-1"><IconCross /></button></div>))}</div>)}
          {matchFilter.liveHistories.length > 0 && (<div className="flex flex-wrap gap-2 mb-3">{matchFilter.liveHistories.map(l => (<div key={l} className="flex items-center bg-zinc-800 rounded-full px-3 py-1 gap-2"><span className="text-xs font-bold text-white"><IconTicket /> {l}</span><button onClick={() => onRemoveLiveHistory(l)} className="text-zinc-500 hover:text-white ml-1"><IconCross /></button></div>))}</div>)}
          <input type="text" placeholder={labels.tagLivePlaceholder} value={filterHashtagInput} onChange={e => onHashtagInputChange(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500" />
          {filterHashtagInput && (
            <div className="absolute top-full left-0 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden z-50">
              {allAvailableHashtags.filter(h => h.toLowerCase().includes(filterHashtagInput.toLowerCase())).slice(0, 3).map(h => (<div key={h} onMouseDown={(e) => { e.preventDefault(); onSelectHashtagSuggestion(h); }} className="p-3 text-xs text-white hover:bg-zinc-700 cursor-pointer border-b border-zinc-700 last:border-0">#{getMusicTagLabel(h)}</div>))}
              {allAvailableLiveHistories.filter(l => l.toLowerCase().includes(filterHashtagInput.toLowerCase())).slice(0, 3).map(l => (<div key={l} onMouseDown={(e) => { e.preventDefault(); onSelectLiveHistorySuggestion(l); }} className="p-3 text-xs text-white hover:bg-zinc-700 cursor-pointer border-b border-zinc-700 last:border-0"><IconTicket /> {l}</div>))}
            </div>
          )}
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">{labels.ageRange}</label>
            <div className="flex items-center gap-2">
              <select value={matchFilter.ageMin} onChange={e => onAgeMinChange(parseInt(e.target.value))} className="bg-black border border-zinc-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none appearance-none flex-1 text-center">{Array.from({ length: 83 }, (_, i) => 18 + i).map(y => <option key={y} value={y}>{y}</option>)}</select>
              <span className="text-zinc-500 text-xs">~</span>
              <select value={matchFilter.ageMax} onChange={e => onAgeMaxChange(parseInt(e.target.value))} className="bg-black border border-zinc-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none appearance-none flex-1 text-center">{Array.from({ length: 83 }, (_, i) => 18 + i).map(y => <option key={y} value={y}>{y}</option>)}</select>
            </div>
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">{labels.sex}</label>
            <select value={matchFilter.gender} onChange={e => onGenderChange(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none appearance-none"><option value="All">{labels.sexAll}</option><option value="Male">{labels.sexMale}</option><option value="Female">{labels.sexFemale}</option></select>
          </div>
        </div>
      </div>
      <button onClick={onClose} className="w-full mt-8 bg-white text-black font-bold py-3.5 rounded-xl shadow-lg hover:bg-gray-200 transition-colors">{labels.apply}</button>
    </div>
  </div>
);
