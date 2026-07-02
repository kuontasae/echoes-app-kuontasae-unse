"use client";

import React from 'react';
import { IconChevronDown, IconChevronLeft, IconChevronRight, IconCross, IconTicket } from '../Icons';
import type { LiveCommunity } from '../types';

type CommunityCalendarDayCell =
  | { type: 'empty'; key: string }
  | {
      type: 'day';
      key: string;
      day: number;
      dateStr: string;
      eventsCount: number;
      eventCountLabel: string;
      isSelected: boolean;
    };

type CommunityCalendarSelectedItem = {
  community: LiveCommunity;
  displayName: string;
  scheduledCountLabel: string;
};

type CommunityCalendarModalProps = {
  title: string;
  monthLabel: string;
  weekdayLabels: string[];
  dayCells: CommunityCalendarDayCell[];
  selectedDateLabel: string;
  selectedCommunities: CommunityCalendarSelectedItem[];
  emptyLabel: string;
  showAllDatesLabel: string;
  hasSelectedDate: boolean;
  onClose: () => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onOpenMonthPicker: () => void;
  onSelectDate: (dateStr: string) => void;
  onSelectCommunity: (community: LiveCommunity) => void;
  onShowAllDates: () => void;
};

export const CommunityCalendarModal: React.FC<CommunityCalendarModalProps> = ({
  title,
  monthLabel,
  weekdayLabels,
  dayCells,
  selectedDateLabel,
  selectedCommunities,
  emptyLabel,
  showAllDatesLabel,
  hasSelectedDate,
  onClose,
  onPreviousMonth,
  onNextMonth,
  onOpenMonthPicker,
  onSelectDate,
  onSelectCommunity,
  onShowAllDates,
}) => (
  <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[950] flex justify-center items-end md:items-center animate-fade-in" onClick={onClose}>
    <div className="bg-[#1c1c1e] w-full md:max-w-[420px] h-[85vh] md:max-h-[80vh] rounded-t-[32px] md:rounded-[32px] p-6 shadow-2xl relative flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h3 className="font-bold text-lg">{title}</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white"><IconCross /></button>
      </div>
      <div className="flex justify-between items-center mb-6 px-2 shrink-0">
        <button onClick={onPreviousMonth} className="p-2 text-zinc-400 hover:text-white bg-black rounded-full"><IconChevronLeft /></button>
        <div className="cursor-pointer hover:opacity-70 transition-opacity" onClick={onOpenMonthPicker}>
          <span className="font-bold text-xl tracking-widest flex items-center gap-2">
            {monthLabel}
            <IconChevronDown />
          </span>
        </div>
        <button onClick={onNextMonth} className="p-2 text-zinc-400 hover:text-white bg-black rounded-full"><IconChevronRight /></button>
      </div>
      <div className="grid grid-cols-7 gap-2 mb-4 shrink-0">
        {weekdayLabels.map(d => <div key={d} className="text-center text-[10px] text-zinc-500 font-bold mb-2">{d}</div>)}
        {dayCells.map(cell => {
          if (cell.type === 'empty') return <div key={cell.key} />;
          return (
            <div
              key={cell.key}
              onClick={() => { if (cell.eventsCount > 0) onSelectDate(cell.dateStr); }}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-colors ${cell.eventsCount > 0 ? 'cursor-pointer' : 'opacity-50'} ${cell.isSelected ? 'bg-[#1DB954] text-black shadow-lg scale-105 z-10' : 'bg-black hover:bg-zinc-800 text-white'}`}
            >
              <span className={`text-sm ${cell.isSelected ? 'font-black' : 'font-medium'}`}>{cell.day}</span>
              {cell.eventsCount > 0 && (
                <span className={`text-[9px] font-bold mt-0.5 ${cell.isSelected ? 'text-black' : 'text-[#1DB954]'}`}>{cell.eventCountLabel}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide mt-4 border-t border-zinc-800 pt-4">
        {hasSelectedDate ? (
          <div className="flex flex-col gap-3 animate-fade-in">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{selectedDateLabel}</p>
            {selectedCommunities.map(({ community, displayName, scheduledCountLabel }) => (
              <div key={community.id} onClick={() => onSelectCommunity(community)} className="bg-black p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-zinc-800 border border-zinc-800 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-[#1DB954] flex-shrink-0"><IconTicket /></div>
                  <div className="flex-1 overflow-hidden"><p className="font-bold text-sm text-white truncate">{displayName}</p><p className="text-[10px] text-zinc-500">{scheduledCountLabel}</p></div>
                </div>
                <IconChevronRight />
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-zinc-500 font-bold">{emptyLabel}</p>
          </div>
        )}
      </div>
      <button onClick={onShowAllDates} className="w-full mt-4 py-4 bg-zinc-800 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-zinc-700 transition-colors shrink-0">
        {showAllDatesLabel}
      </button>
    </div>
  </div>
);
