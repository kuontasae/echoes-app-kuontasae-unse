"use client";

import React from 'react';

type CommunityCalendarPickerProps = {
  selectedYear: number;
  selectedMonth: number;
  yearOptions: number[];
  monthOptions: number[];
  cancelLabel: string;
  titleLabel: string;
  setLabel: string;
  formatYear: (year: number) => string;
  formatMonth: (month: number) => string;
  onClose: () => void;
  onYearScroll: React.UIEventHandler<HTMLDivElement>;
  onMonthScroll: React.UIEventHandler<HTMLDivElement>;
};

export const CommunityCalendarPicker: React.FC<CommunityCalendarPickerProps> = ({
  selectedYear,
  selectedMonth,
  yearOptions,
  monthOptions,
  cancelLabel,
  titleLabel,
  setLabel,
  formatYear,
  formatMonth,
  onClose,
  onYearScroll,
  onMonthScroll,
}) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[1000] flex flex-col justify-end animate-fade-in" onClick={onClose}>
    <div className="bg-[#1c1c1e] rounded-t-3xl border-t border-zinc-800 p-8 w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-8">
        <button onClick={onClose} className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{cancelLabel}</button>
        <h4 className="font-bold text-sm">{titleLabel}</h4>
        <button onClick={onClose} className="text-white text-xs font-bold uppercase tracking-widest bg-zinc-800 px-6 py-2 rounded-full">{setLabel}</button>
      </div>
      <div className="relative h-[200px] w-full flex gap-4 justify-center items-center overflow-hidden">
        {/* 💡 選択枠をピッタリ中央に配置 */}
        <div className="absolute top-1/2 left-0 w-full h-[50px] bg-white/10 -mt-[25px] rounded-xl pointer-events-none z-10" />
        {/* 💡 左側：年選択（上下に75pxの余白を追加してズレを解消） */}
        <div className="relative flex-1 h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory py-[75px] z-20" onScroll={onYearScroll}>
          {yearOptions.map(y => (
            <div key={y} className={`h-[50px] flex justify-center items-center snap-center ${selectedYear === y ? 'text-white font-bold text-lg' : 'text-zinc-500'}`}>{formatYear(y)}</div>
          ))}
        </div>
        {/* 💡 右側：月選択（上下に75pxの余白を追加してズレを解消） */}
        <div className="relative flex-1 h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory py-[75px] z-20" onScroll={onMonthScroll}>
          {monthOptions.map(m => (
            <div key={m} className={`h-[50px] flex justify-center items-center snap-center ${selectedMonth === m ? 'text-white font-bold text-lg' : 'text-zinc-500'}`}>{formatMonth(m)}</div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
