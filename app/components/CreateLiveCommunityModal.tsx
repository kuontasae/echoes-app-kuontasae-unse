"use client";

import React from 'react';
import { IconCross } from '../Icons';

type CreateLiveCommunityModalLabels = {
  title: string;
  description: string;
  liveName: string;
  liveNamePlaceholder: string;
  dateLabel: string;
  createAndJoin: string;
};

type CreateLiveCommunityModalProps = {
  newCommName: string;
  newCommYear: string;
  newCommMonth: string;
  newCommDay: string;
  yearInputRef: React.RefObject<HTMLInputElement | null>;
  monthInputRef: React.RefObject<HTMLInputElement | null>;
  dayInputRef: React.RefObject<HTMLInputElement | null>;
  labels: CreateLiveCommunityModalLabels;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onYearChange: React.ChangeEventHandler<HTMLInputElement>;
  onMonthChange: React.ChangeEventHandler<HTMLInputElement>;
  onMonthKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
  onDayChange: React.ChangeEventHandler<HTMLInputElement>;
  onDayKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
  onCreateCommunity: () => void;
};

export const CreateLiveCommunityModal: React.FC<CreateLiveCommunityModalProps> = ({
  newCommName,
  newCommYear,
  newCommMonth,
  newCommDay,
  yearInputRef,
  monthInputRef,
  dayInputRef,
  labels,
  onClose,
  onNameChange,
  onYearChange,
  onMonthChange,
  onMonthKeyDown,
  onDayChange,
  onDayKeyDown,
  onCreateCommunity,
}) => (
  <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[950] flex items-center justify-center p-6 animate-fade-in" onClick={onClose}>
    <div className="bg-[#1c1c1e] border border-zinc-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-lg">{labels.title}</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white"><IconCross /></button>
      </div>
      <p className="text-xs text-zinc-400 mb-6 leading-relaxed">{labels.description}</p>
      <div className="mb-4">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">{labels.liveName}</label>
        <input type="text" placeholder={labels.liveNamePlaceholder} value={newCommName} onChange={(e) => onNameChange(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#1DB954]" />
      </div>
      <div className="mb-8">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">{labels.dateLabel}</label>
        <div className="flex items-center gap-2">
          <input
            ref={yearInputRef}
            type="text"
            maxLength={4}
            placeholder="YYYY"
            value={newCommYear}
            onChange={onYearChange}
            className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-center text-white focus:outline-none focus:border-[#1DB954] transition-colors"
          />
          <span className="text-zinc-500 font-bold">/</span>
          <input
            ref={monthInputRef}
            type="text"
            maxLength={2}
            placeholder="MM"
            value={newCommMonth}
            onChange={onMonthChange}
            onKeyDown={onMonthKeyDown}
            className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-center text-white focus:outline-none focus:border-[#1DB954] transition-colors"
          />
          <span className="text-zinc-500 font-bold">/</span>
          <input
            ref={dayInputRef}
            type="text"
            maxLength={2}
            placeholder="DD"
            value={newCommDay}
            onChange={onDayChange}
            onKeyDown={onDayKeyDown}
            className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-center text-white focus:outline-none focus:border-[#1DB954] transition-colors"
          />
        </div>
      </div>
      <button onClick={onCreateCommunity} className="w-full py-4 bg-[#1DB954] text-black rounded-xl text-sm font-bold shadow-lg hover:scale-105 transition-transform flex justify-center items-center gap-2">
        {labels.createAndJoin}
      </button>
    </div>
  </div>
);
