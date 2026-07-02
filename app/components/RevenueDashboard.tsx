"use client";

import React from 'react';
import { IconChevronLeft, IconSparkles } from '../Icons';

const IconArticle = () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M2 15h10"></path><path d="M2 18h10"></path><path d="M2 21h10"></path></svg>;
const IconYen = () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><line x1="12" y1="9" x2="12" y2="22"></line><polyline points="6 6 12 9 18 6"></polyline><line x1="6" y1="14" x2="18" y2="14"></line><line x1="6" y1="18" x2="18" y2="18"></line></svg>;
const IconList = () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;

type RevenueHistoryRow = {
  id: string;
  isGift: boolean;
  isPaid: boolean;
  senderAvatar: string;
  senderName: string;
  actionLabel: string;
  coinTypeLabel: string;
  dateLabel: string;
  amount: number;
};

type RevenueDashboardLabels = {
  title: string;
  availableRevenue: string;
  payoutEligiblePaidCoins: string;
  payoutSettings: string;
  totalEarnedCoins: string;
  revenueArticle: string;
  revenueGift: string;
  transactionHistory: string;
  coinUnit: string;
  noRevenueData: string;
  noRevenueDataDescription: string;
};

type RevenueDashboardProps = {
  jpyRevenue: number;
  paidTotal: number;
  totalRevenue: number;
  articleRevenue: number;
  giftRevenue: number;
  historyRows: RevenueHistoryRow[];
  canWithdraw: boolean;
  showStripeSetupAction: boolean;
  isStartingStripeConnect: boolean;
  isRequestingPayout: boolean;
  payoutStatusText: string;
  stripeSetupLabel: string;
  payoutButtonLabel: string;
  labels: RevenueDashboardLabels;
  onClose: () => void;
  onStartStripeConnectOnboarding: () => void;
  onRequestCreatorPayout: () => void;
};

export const RevenueDashboard: React.FC<RevenueDashboardProps> = ({
  jpyRevenue,
  paidTotal,
  totalRevenue,
  articleRevenue,
  giftRevenue,
  historyRows,
  canWithdraw,
  showStripeSetupAction,
  isStartingStripeConnect,
  isRequestingPayout,
  payoutStatusText,
  stripeSetupLabel,
  payoutButtonLabel,
  labels,
  onClose,
  onStartStripeConnectOnboarding,
  onRequestCreatorPayout,
}) => (
  <div className="fixed inset-0 bg-black/95 z-[1500] flex flex-col animate-fade-in" onClick={(e) => e.stopPropagation()}>
    <div className="flex items-center p-4 border-b border-zinc-900 sticky top-0 bg-black/90 backdrop-blur-md z-10">
      <button onClick={onClose} className="p-2 -ml-2 text-white hover:opacity-80 transition-opacity"><IconChevronLeft /></button>
      <h2 className="text-white font-bold text-lg mx-auto pr-8">{labels.title}</h2>
    </div>
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 scrollbar-hide">
      <div className="bg-gradient-to-br from-[#1DB954]/20 to-[#1DB954]/5 border border-[#1DB954]/30 rounded-[32px] p-8 mb-4 flex flex-col items-center text-center shadow-[0_0_40px_rgba(29,185,84,0.15)] relative overflow-hidden">
        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-[#1DB954] to-transparent opacity-50"></div>
        <p className="text-[#1DB954] text-[10px] font-black uppercase tracking-widest mb-3">{labels.availableRevenue}</p>
        <div className="flex items-end gap-1 mb-3">
          <span className="text-2xl font-bold text-white mb-1">¥</span>
          <span className="text-5xl font-black text-white tracking-tighter">{jpyRevenue.toLocaleString()}</span>
        </div>
        <p className="text-[10px] text-zinc-400 font-bold bg-black/40 px-3 py-1 rounded-full border border-zinc-800 mb-6">
          {labels.payoutEligiblePaidCoins.replace('{coins}', paidTotal.toLocaleString())}
        </p>
        <div className="w-full bg-black/35 border border-zinc-800 rounded-2xl p-3 mb-3 text-left">
          <p className="text-[10px] font-bold text-zinc-500 mb-1">{labels.payoutSettings}</p>
          <p className="text-xs text-zinc-300 leading-relaxed">
            {payoutStatusText}
          </p>
        </div>
        {showStripeSetupAction ? (
          <button
            onClick={onStartStripeConnectOnboarding}
            disabled={isStartingStripeConnect}
            className="w-full py-3.5 rounded-full font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 active:scale-95 disabled:opacity-50"
          >
            {stripeSetupLabel}
          </button>
        ) : (
          <button
            disabled={!canWithdraw || isRequestingPayout}
            onClick={onRequestCreatorPayout}
            className={`w-full py-3.5 rounded-full font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${canWithdraw ? 'bg-white text-black hover:bg-zinc-200 active:scale-95' : 'bg-black/50 text-zinc-500 border border-zinc-700 cursor-not-allowed'}`}
          >
            {payoutButtonLabel}
          </button>
        )}
      </div>
      <div className="bg-[#1c1c1e] border border-zinc-800 rounded-3xl p-5 mb-6 flex items-center justify-between shadow-inner">
        <div className="flex flex-col">
          <span className="text-zinc-400 text-[10px] font-bold mb-1">{labels.totalEarnedCoins}</span>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center text-black shadow-md">
              <span className="text-[12px] font-black mt-[1px]">C</span>
            </div>
            <span className="text-xl font-black text-white">{totalRevenue.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex gap-4 text-[10px] font-bold text-zinc-500 text-right">
          <div className="flex flex-col"><span className="mb-0.5">{labels.revenueArticle}</span><span className="text-white">{articleRevenue.toLocaleString()}</span></div>
          <div className="flex flex-col"><span className="mb-0.5">{labels.revenueGift}</span><span className="text-white">{giftRevenue.toLocaleString()}</span></div>
        </div>
      </div>
      <h3 className="font-bold text-xs text-zinc-500 mb-4 px-2 uppercase tracking-widest flex items-center gap-2"><IconList /> {labels.transactionHistory}</h3>
      <div className="flex flex-col gap-3">
        {historyRows.length > 0 ? historyRows.map((tx) => (
          <div key={tx.id} className="bg-[#1c1c1e] p-4 rounded-2xl border border-zinc-800 flex items-center justify-between shadow-sm relative overflow-hidden">
            {tx.isPaid && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1DB954]"></div>}
            <div className="flex items-center gap-3 pl-1">
              <img src={tx.senderAvatar} className="w-10 h-10 rounded-full object-cover border border-zinc-700 shrink-0" />
              <div className="flex flex-col justify-center">
                <p className="font-bold text-sm text-white leading-tight mb-1.5">{tx.senderName}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mb-0.5">
                  <div className="w-3 h-3 flex items-center justify-center opacity-80">
                    {tx.isGift ? <IconSparkles /> : <IconArticle />}
                  </div>
                  <span>{tx.actionLabel}</span>
                  <span className={tx.isPaid ? 'text-[#1DB954] font-bold ml-1' : 'text-zinc-500 ml-1'}>
                    ({tx.coinTypeLabel})
                  </span>
                </div>
                <p className="text-[9px] text-zinc-600">{tx.dateLabel}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={`font-black text-lg ${tx.isPaid ? 'text-[#1DB954]' : 'text-yellow-500'}`}>+{tx.amount.toLocaleString()}</p>
              <p className="text-[9px] text-zinc-500">{labels.coinUnit}</p>
            </div>
          </div>
        )) : (
          <div className="text-center py-16 bg-[#1c1c1e] rounded-3xl border border-zinc-800 border-dashed">
            <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-600 mx-auto mb-3"><IconYen /></div>
            <p className="text-zinc-400 text-sm font-bold">{labels.noRevenueData}</p>
            <p className="text-[10px] text-zinc-500 mt-2 px-6">{labels.noRevenueDataDescription.split('\n').map((line: string, index: number) => <React.Fragment key={line}>{index > 0 && <br />}{line}</React.Fragment>)}</p>
          </div>
        )}
      </div>
    </div>
  </div>
);
