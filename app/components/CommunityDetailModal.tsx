"use client";

import React from 'react';
import { IconCross, IconTicket, IconUsers, IconVerified, IconWarning } from '../Icons';

type CommunityDetailParticipant = {
  id: string;
  avatar: string;
};

type CommunityDetailModalProps = {
  title: string;
  artworkUrl?: string;
  isArtistCommunity: boolean;
  displayName: string;
  isVerified?: boolean;
  description?: string;
  dateLabel: string;
  participants: CommunityDetailParticipant[];
  extraParticipantCount: number;
  joinedCountLabel: string;
  primaryActionLabel: string;
  primaryActionVariant: 'open' | 'join';
  canReport: boolean;
  reportLabel: string;
  onClose: () => void;
  onPrimaryAction: () => void;
  onReport: () => void;
};

export const CommunityDetailModal: React.FC<CommunityDetailModalProps> = ({
  title,
  artworkUrl,
  isArtistCommunity,
  displayName,
  isVerified,
  description,
  dateLabel,
  participants,
  extraParticipantCount,
  joinedCountLabel,
  primaryActionLabel,
  primaryActionVariant,
  canReport,
  reportLabel,
  onClose,
  onPrimaryAction,
  onReport,
}) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[950] flex items-center justify-center p-6 animate-fade-in" onClick={onClose}>
    <div className="bg-[#1c1c1e] border border-zinc-800 p-8 rounded-[32px] w-full max-w-sm relative flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-lg">{title}</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white"><IconCross /></button>
      </div>
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 mb-4 shadow-lg overflow-hidden">
          {artworkUrl ? (
            <>
              <img src={artworkUrl} className="w-full h-full object-cover" onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = 'flex';
              }} />
              <div className="hidden w-full h-full items-center justify-center text-zinc-500">{isArtistCommunity ? <IconUsers /> : <IconTicket />}</div>
            </>
          ) : isArtistCommunity ? <IconUsers /> : <IconTicket />}
        </div>
        <h2 className="text-2xl font-black text-center mb-2 flex items-center justify-center gap-2">
          {displayName}
          {isVerified && <span className="text-[#1DB954] w-5 h-5 flex items-center"><IconVerified /></span>}
        </h2>
        {description && <p className="text-sm text-zinc-300 text-center leading-relaxed mb-3">{description}</p>}
        <p className="text-sm text-[#1DB954] font-bold mb-4">{dateLabel}</p>
        <div className="flex -space-x-3 justify-center mb-2">
          {participants.slice(0, 3).map(u => <img key={u.id} src={u.avatar} className="w-9 h-9 rounded-full border-2 border-[#1c1c1e] object-cover" />)}
          {extraParticipantCount > 0 && (
            <div className="w-9 h-9 rounded-full bg-zinc-800 border-2 border-[#1c1c1e] flex items-center justify-center text-[10px] font-bold text-zinc-400 z-10">
              +{extraParticipantCount}
            </div>
          )}
        </div>
        <p className="text-xs text-zinc-400">{joinedCountLabel}</p>
      </div>
      {primaryActionVariant === 'open' ? (
        <button onClick={onPrimaryAction} className="w-full py-4 bg-[#1DB954] text-black rounded-xl text-sm font-bold shadow-lg hover:scale-105 transition-transform mb-2">{primaryActionLabel}</button>
      ) : (
        <button onClick={onPrimaryAction} className="w-full py-4 bg-white text-black rounded-xl text-sm font-bold shadow-lg hover:scale-105 transition-transform mb-2">{primaryActionLabel}</button>
      )}
      {canReport && (
        <button onClick={onReport} className="w-full py-3 bg-transparent text-zinc-600 hover:text-red-500 rounded-xl text-[10px] font-bold transition-colors flex items-center justify-center gap-1.5 mt-2">
          <IconWarning /> {reportLabel}
        </button>
      )}
    </div>
  </div>
);
