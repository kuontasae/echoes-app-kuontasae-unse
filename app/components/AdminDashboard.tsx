"use client";

import React from 'react';
import { IconCheck, IconChevronLeft, IconWarning } from '../Icons';

type AdminDashboardCommunity = {
  id: string;
  name: string;
  date: string;
  memberCount: number;
  reportCount: number;
};

type AdminDashboardLabels = {
  title: string;
  descriptionLine1: string;
  descriptionLine2: string;
  reportCount: string;
  participantsCount: string;
  deletePermanently: string;
  restoreSafe: string;
  noReportedCommunities: string;
  peacefulState: string;
};

type AdminDashboardProps = {
  communities: AdminDashboardCommunity[];
  labels: AdminDashboardLabels;
  onClose: () => void;
  onDeleteCommunity: (id: string) => void;
  onRestoreCommunity: (id: string) => void;
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  communities,
  labels,
  onClose,
  onDeleteCommunity,
  onRestoreCommunity,
}) => (
  <div className="fixed inset-0 bg-black/95 z-[900] animate-fade-in flex flex-col">
    <div className="flex items-center p-4 border-b border-zinc-900 sticky top-0 bg-black/90 backdrop-blur-md z-10">
      <button onClick={onClose}><IconChevronLeft /></button>
      <h2 className="text-red-500 font-bold text-lg mx-auto pr-8 flex items-center gap-2"><IconWarning /> {labels.title}</h2>
    </div>
    <div className="flex-1 overflow-y-auto p-4">
      <p className="text-xs text-zinc-400 mb-6 leading-relaxed">{labels.descriptionLine1}<br />{labels.descriptionLine2}</p>
      <div className="flex flex-col gap-4 pb-12">
        {communities.map(c => (
          <div key={c.id} className="bg-[#1c1c1e] border border-red-500/30 rounded-2xl p-5 shadow-lg">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-base text-white">{c.name}</h3>
                <p className="text-xs text-[#1DB954] mt-1">{c.date}</p>
              </div>
              <span className="bg-red-500/20 text-red-500 text-[10px] font-bold px-3 py-1 rounded-full border border-red-500/30">{labels.reportCount.replace('{count}', String(c.reportCount))}</span>
            </div>
            <p className="text-[10px] text-zinc-500 mb-5">{labels.participantsCount.replace('{count}', String(c.memberCount))} | ID: {c.id}</p>
            <div className="flex gap-3">
              <button onClick={() => onDeleteCommunity(c.id)} className="flex-1 py-3 bg-red-500 text-white rounded-xl text-xs font-bold transition-transform active:scale-95 shadow-md">{labels.deletePermanently}</button>
              <button onClick={() => onRestoreCommunity(c.id)} className="flex-1 py-3 border border-zinc-600 text-white rounded-xl text-xs font-bold transition-transform active:scale-95 hover:bg-zinc-800">{labels.restoreSafe}</button>
            </div>
          </div>
        ))}
        {communities.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 text-[#1DB954]"><IconCheck /></div>
            <p className="font-bold text-zinc-400">{labels.noReportedCommunities}</p>
            <p className="text-[10px] text-zinc-600 mt-2">{labels.peacefulState}</p>
          </div>
        )}
      </div>
    </div>
  </div>
);
