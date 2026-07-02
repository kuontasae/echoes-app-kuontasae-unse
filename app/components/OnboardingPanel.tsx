"use client";

import React from 'react';
import { IconCamera } from '../Icons';

const IconHeadphones = () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>;

type OnboardingArtistSuggestion = {
  artistId: number | string;
  artistName: string;
  artworkUrl: string;
};

type OnboardingPanelLabels = {
  profileSection: string;
  title: string;
  description: string;
  name: string;
  handle: string;
  musicTaste: string;
  favoriteGenres: string;
  favoriteArtist: string;
  artistSearchPlaceholder: string;
  favoriteArtistSearchLabel: string;
  searchingCandidates: string;
  hashtags: string;
  customHashtagPlaceholder: string;
  liveHistory: string;
  customLiveHistoryPlaceholder: string;
  add: string;
  later: string;
  saveAndStart: string;
};

type OnboardingPanelProps = {
  editAvatar: string;
  editName: string;
  editHandle: string;
  onboardingGenreCandidates: string[];
  onboardingGenres: string[];
  onboardingArtistInput: string;
  onboardingArtists: string[];
  onboardingArtistSuggestions: OnboardingArtistSuggestion[];
  onboardingHashtagCandidates: string[];
  onboardingHashtags: string[];
  onboardingHashtagInput: string;
  onboardingLiveCandidates: string[];
  onboardingLiveHistory: string[];
  onboardingLiveInput: string;
  labels: OnboardingPanelLabels;
  getChoiceDisplayLabel: (candidate: string) => string;
  onImageUpload: React.ChangeEventHandler<HTMLInputElement>;
  onNameChange: (value: string) => void;
  onHandleChange: (value: string) => void;
  onToggleGenre: (candidate: string) => void;
  onArtistInputChange: (value: string) => void;
  onRemoveArtist: (artist: string) => void;
  onArtistSuggestionMouseDown: (event: React.MouseEvent, artistName: string) => void;
  onToggleHashtag: (candidate: string) => void;
  onHashtagInputChange: (value: string) => void;
  onHashtagInputKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
  onAddHashtag: () => void;
  onToggleLiveHistory: (candidate: string) => void;
  onLiveInputChange: (value: string) => void;
  onLiveInputKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
  onAddLiveHistory: () => void;
  onSkip: () => void;
  onSave: () => void;
};

type ChipPickerProps = {
  label: string;
  candidates: string[];
  selectedItems: string[];
  prefix?: string;
  getChoiceDisplayLabel: (candidate: string) => string;
  onToggle: (candidate: string) => void;
};

const OnboardingChipPicker: React.FC<ChipPickerProps> = ({
  label,
  candidates,
  selectedItems,
  prefix = "",
  getChoiceDisplayLabel,
  onToggle,
}) => (
  <div>
    <label className="text-[10px] text-zinc-500 ml-1 mb-2 block font-bold">{label}</label>
    <div className="flex flex-wrap gap-2">
      {candidates.map(candidate => {
        const isSelected = selectedItems.includes(candidate);
        return (
          <button
            key={candidate}
            type="button"
            onClick={() => onToggle(candidate)}
            className={`px-3 py-2 rounded-full border text-[11px] font-bold transition-colors ${isSelected ? 'bg-[#1DB954] border-[#1DB954] text-black' : 'bg-black border-zinc-800 text-zinc-300 hover:text-white'}`}
          >
            {prefix}{getChoiceDisplayLabel(candidate)}
          </button>
        );
      })}
    </div>
  </div>
);

type TextAddProps = {
  placeholder: string;
  value: string;
  addLabel: string;
  onChange: (value: string) => void;
  onKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
  onAdd: () => void;
};

const OnboardingTextAdd: React.FC<TextAddProps> = ({
  placeholder,
  value,
  addLabel,
  onChange,
  onKeyDown,
  onAdd,
}) => (
  <div className="flex gap-2 mt-2">
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className="min-w-0 flex-1 bg-black border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-zinc-500"
    />
    <button
      type="button"
      onClick={onAdd}
      className="px-4 bg-white text-black rounded-xl text-xs font-bold shrink-0"
    >
      {addLabel}
    </button>
  </div>
);

export const OnboardingPanel: React.FC<OnboardingPanelProps> = ({
  editAvatar,
  editName,
  editHandle,
  onboardingGenreCandidates,
  onboardingGenres,
  onboardingArtistInput,
  onboardingArtists,
  onboardingArtistSuggestions,
  onboardingHashtagCandidates,
  onboardingHashtags,
  onboardingHashtagInput,
  onboardingLiveCandidates,
  onboardingLiveHistory,
  onboardingLiveInput,
  labels,
  getChoiceDisplayLabel,
  onImageUpload,
  onNameChange,
  onHandleChange,
  onToggleGenre,
  onArtistInputChange,
  onRemoveArtist,
  onArtistSuggestionMouseDown,
  onToggleHashtag,
  onHashtagInputChange,
  onHashtagInputKeyDown,
  onAddHashtag,
  onToggleLiveHistory,
  onLiveInputChange,
  onLiveInputKeyDown,
  onAddLiveHistory,
  onSkip,
  onSave,
}) => (
  <div className="fixed inset-0 bg-black/90 z-[520] flex items-center justify-center p-6 animate-fade-in">
    <div className="bg-[#1c1c1e] w-full max-w-sm rounded-[24px] p-6 flex flex-col gap-5 shadow-2xl max-h-[86vh] overflow-y-auto">
      <div>
        <div className="w-12 h-12 rounded-full bg-[#1DB954]/20 text-[#1DB954] flex items-center justify-center mb-4">
          <IconHeadphones />
        </div>
        <h3 className="font-bold text-xl mb-2">{labels.title}</h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          {labels.description}
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-[11px] font-bold text-white">{labels.profileSection}</p>
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 shrink-0 group cursor-pointer">
            <img src={editAvatar} alt="" className="w-full h-full rounded-full object-cover opacity-80 group-hover:opacity-60" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><IconCamera /></div>
            <input type="file" accept="image/*" onChange={onImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" aria-label={labels.profileSection} />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <input type="text" value={editName} onChange={(e) => onNameChange(e.target.value)} placeholder={labels.name} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-zinc-500" />
            <div className="flex items-center bg-black border border-zinc-800 rounded-xl overflow-hidden focus-within:border-zinc-500">
              <span className="pl-3 text-zinc-500 font-bold">@</span>
              <input type="text" value={editHandle} onChange={(e) => onHandleChange(e.target.value)} placeholder={labels.handle} className="min-w-0 w-full bg-transparent p-3 text-sm text-white focus:outline-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-[11px] font-bold text-white">{labels.musicTaste}</p>
        <OnboardingChipPicker
          label={labels.favoriteGenres}
          candidates={onboardingGenreCandidates}
          selectedItems={onboardingGenres}
          getChoiceDisplayLabel={getChoiceDisplayLabel}
          onToggle={onToggleGenre}
        />
        <div>
          <label className="text-[10px] text-zinc-500 ml-1 mb-2 block font-bold">{labels.favoriteArtist}</label>
          <input
            type="text"
            value={onboardingArtistInput}
            onChange={(e) => onArtistInputChange(e.target.value)}
            placeholder={labels.artistSearchPlaceholder}
            aria-label={labels.favoriteArtistSearchLabel}
            className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-zinc-500"
          />
          {onboardingArtists.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {onboardingArtists.map(artist => (
                <button
                  key={artist}
                  type="button"
                  onClick={() => onRemoveArtist(artist)}
                  className="px-3 py-1.5 bg-[#1DB954] text-black rounded-full text-[11px] font-bold"
                >
                  {artist} ×
                </button>
              ))}
            </div>
          )}
          {onboardingArtistInput.trim() && (
            <div className="mt-2 bg-black border border-zinc-800 rounded-xl overflow-hidden">
              {onboardingArtistSuggestions.length > 0 ? onboardingArtistSuggestions.map(artist => (
                <button
                  key={artist.artistId}
                  type="button"
                  onMouseDown={(e) => onArtistSuggestionMouseDown(e, artist.artistName)}
                  className="w-full flex items-center gap-3 p-3 text-left text-xs text-white hover:bg-zinc-800 border-b border-zinc-900 last:border-0"
                >
                  <img src={artist.artworkUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                  <span className="font-bold truncate">{artist.artistName}</span>
                </button>
              )) : (
                <p className="p-3 text-[11px] text-zinc-500">{labels.searchingCandidates}</p>
              )}
            </div>
          )}
        </div>
        <OnboardingChipPicker
          label={labels.hashtags}
          candidates={onboardingHashtagCandidates}
          selectedItems={onboardingHashtags}
          prefix="#"
          getChoiceDisplayLabel={getChoiceDisplayLabel}
          onToggle={onToggleHashtag}
        />
        <OnboardingTextAdd
          placeholder={labels.customHashtagPlaceholder}
          value={onboardingHashtagInput}
          addLabel={labels.add}
          onChange={onHashtagInputChange}
          onKeyDown={onHashtagInputKeyDown}
          onAdd={onAddHashtag}
        />
        <OnboardingChipPicker
          label={labels.liveHistory}
          candidates={onboardingLiveCandidates}
          selectedItems={onboardingLiveHistory}
          getChoiceDisplayLabel={getChoiceDisplayLabel}
          onToggle={onToggleLiveHistory}
        />
        <OnboardingTextAdd
          placeholder={labels.customLiveHistoryPlaceholder}
          value={onboardingLiveInput}
          addLabel={labels.add}
          onChange={onLiveInputChange}
          onKeyDown={onLiveInputKeyDown}
          onAdd={onAddLiveHistory}
        />
      </div>

      <div className="flex gap-3 sticky bottom-0 bg-[#1c1c1e] pt-2">
        <button
          type="button"
          onClick={onSkip}
          className="flex-1 py-3.5 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          {labels.later}
        </button>
        <button
          type="button"
          onClick={onSave}
          className="flex-1 py-3.5 bg-[#1DB954] text-black rounded-xl text-xs font-bold hover:brightness-110 transition-colors"
        >
          {labels.saveAndStart}
        </button>
      </div>
    </div>
  </div>
);
