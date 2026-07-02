"use client";

import React from 'react';

type CalendarMonthYearPickerProps = {
  monthRef: React.RefObject<HTMLDivElement | null>;
  yearRef: React.RefObject<HTMLDivElement | null>;
  monthList: number[];
  yearList: number[];
  selectedMonth: number;
  selectedYear: number;
  cancelLabel: string;
  titleLabel: string;
  setLabel: string;
  formatMonth: (month: number) => string;
  formatYear: (year: number) => string;
  onClose: () => void;
  onConfirm: () => void;
  onMonthScroll: React.UIEventHandler<HTMLDivElement>;
  onYearScroll: React.UIEventHandler<HTMLDivElement>;
};

export const CalendarMonthYearPicker: React.FC<CalendarMonthYearPickerProps> = ({
  monthRef,
  yearRef,
  monthList,
  yearList,
  selectedMonth,
  selectedYear,
  cancelLabel,
  titleLabel,
  setLabel,
  formatMonth,
  formatYear,
  onClose,
  onConfirm,
  onMonthScroll,
  onYearScroll,
}) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[500] flex flex-col justify-end animate-fade-in" onClick={onClose}>
    <div className="bg-[#1c1c1e] rounded-t-3xl border-t border-zinc-800 p-8 w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-8">
        <button onClick={onClose} className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{cancelLabel}</button>
        <h4 className="font-bold text-sm">{titleLabel}</h4>
        <button onClick={onConfirm} className="text-white text-xs font-bold uppercase tracking-widest bg-zinc-800 px-6 py-2 rounded-full">{setLabel}</button>
      </div>
      <div className="relative h-[250px] w-full flex gap-4 justify-center items-center overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[100px] bg-gradient-to-b from-[#1c1c1e] to-transparent z-40 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-[100px] bg-gradient-to-t from-[#1c1c1e] to-transparent z-40 pointer-events-none" />
        {/* 💡 選択枠をピッタリ中央に配置 */}
        <div className="absolute top-1/2 left-0 w-full h-[50px] bg-white/10 -mt-[25px] rounded-xl z-10 pointer-events-none" />
        {/* 💡 左側：年（上下に100pxの余白を追加してズレを完全に解消） */}
        <div ref={yearRef} className="relative flex-1 h-full overflow-y-auto scroll-smooth snap-y snap-mandatory scrollbar-hide z-30 py-[100px]" onScroll={onYearScroll} style={{ WebkitOverflowScrolling: 'touch' }}>
          {yearList.map((y, i) => (<div key={i} className={`h-[50px] flex justify-center items-center snap-center transition-all ${y === selectedYear ? 'text-white text-lg font-bold scale-110' : 'text-zinc-500 scale-90'}`}>{formatYear(y)}</div>))}
        </div>
        {/* 💡 右側：月（上下に100pxの余白を追加してズレを完全に解消） */}
        <div ref={monthRef} className="relative flex-1 h-full overflow-y-auto scroll-smooth snap-y snap-mandatory scrollbar-hide z-30 py-[100px]" onScroll={onMonthScroll} style={{ WebkitOverflowScrolling: 'touch' }}>
          {monthList.map((m, i) => (<div key={i} className={`h-[50px] flex justify-center items-center snap-center transition-all ${m === selectedMonth ? 'text-white text-lg font-bold scale-110' : 'text-zinc-500 scale-90'}`}>{formatMonth(m)}</div>))}
        </div>
      </div>
    </div>
  </div>
);
