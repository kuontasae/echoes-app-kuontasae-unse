"use client";

import React from 'react';
import { IconChevronLeft, IconChevronRight, IconCross, IconLock } from '../Icons';
import type { CoinChargePlan } from '../coinPlans';

type CoinChargeModalLabels = {
  ownedCoins: string;
  paidCoin: string;
  freeCoin: string;
  coinPlanBonus: string;
  paymentAmount: string;
  stripeSecureNotice: string;
  stripeConnecting: string;
  goToCheckout: string;
  paymentConfirmationTitle: string;
  coinChargeTitle: string;
};

type CoinChargeModalProps = {
  selectedChargePlan: CoinChargePlan | null;
  isCharging: boolean;
  paidCoinBalance: number;
  freeCoinBalance: number;
  plans: readonly CoinChargePlan[];
  labels: CoinChargeModalLabels;
  onOverlayClose: () => void;
  onClose: () => void;
  onBack: () => void;
  onSelectPlan: (plan: CoinChargePlan) => void;
  onCheckout: () => void;
};

export const CoinChargeModal: React.FC<CoinChargeModalProps> = ({
  selectedChargePlan,
  isCharging,
  paidCoinBalance,
  freeCoinBalance,
  plans,
  labels,
  onOverlayClose,
  onClose,
  onBack,
  onSelectPlan,
  onCheckout,
}) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1200] flex justify-center items-end sm:items-center animate-fade-in" onClick={onOverlayClose}>
    <div className="bg-[#1c1c1e] w-full sm:max-w-md h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col" onClick={e => e.stopPropagation()}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 bg-[#1c1c1e] shrink-0 border-b border-zinc-800/50 relative z-20">
        <div className="w-10">
          {selectedChargePlan ? (
            <button onClick={onBack} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
              <IconChevronLeft />
            </button>
          ) : (
            <button onClick={onClose} className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
              <IconCross />
            </button>
          )}
        </div>
        <h3 className="font-bold text-[15px] text-white tracking-wide">{selectedChargePlan ? labels.paymentConfirmationTitle : labels.coinChargeTitle}</h3>
        <div className="w-10"></div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col bg-[#121212]">
        {!selectedChargePlan ? (
          <div className="animate-fade-in flex flex-col">
            {/* 保有コイン表示 */}
            <div className="flex flex-col items-center justify-center py-4 bg-[#1c1c1e] border-b border-zinc-800 shrink-0 w-full gap-1">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 text-sm font-bold">{labels.ownedCoins}</span>
                <div className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center text-black shadow-sm">
                  <span className="text-[12px] font-black leading-none mt-[1px]">C</span>
                </div>
                <span className="text-xl font-black text-white">{freeCoinBalance + paidCoinBalance}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-500">
                <span>{labels.paidCoin} {paidCoinBalance} C</span>
                <span>{labels.freeCoin} {freeCoinBalance} C</span>
              </div>
            </div>
            {/* リスト表示 */}
            <div className="flex flex-col px-4 pb-8">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between py-4 border-b border-zinc-800/60 last:border-0"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                      <div className="w-[18px] h-[18px] bg-[#d4af37] rounded-full flex items-center justify-center text-black shadow-sm shrink-0">
                        <span className="text-[10px] font-black leading-none mt-[0.5px]">C</span>
                      </div>
                      <span className="font-bold text-[17px] text-white tracking-wide">{plan.coins.toLocaleString()}</span>
                    </div>
                    {plan.bonusCoins && (
                      <span className="text-zinc-400 text-[11px] font-medium mt-1 ml-[30px] tracking-wide">{labels.coinPlanBonus.replace('{count}', plan.bonusCoins.toLocaleString())}</span>
                    )}
                  </div>
                  <button
                    onClick={() => onSelectPlan(plan)}
                    className="bg-white text-black font-black px-5 py-2.5 rounded-full text-sm hover:bg-zinc-200 transition-colors active:scale-95 w-[90px] text-center shrink-0 shadow-sm"
                  >
                    ¥{plan.price.toLocaleString()}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-fade-in flex flex-col w-full h-full p-6">
            <div className="mb-10 flex flex-col items-center text-center mt-6">
              <div className="w-16 h-16 bg-[#d4af37] rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(212,175,55,0.2)] mb-5 border border-yellow-500/20">
                <span className="text-3xl font-black leading-none mt-[2px]">C</span>
              </div>
              <h4 className="text-white font-black text-[32px] mb-2 tracking-tighter">{selectedChargePlan.coins.toLocaleString()}</h4>
              <p className="text-zinc-400 text-sm font-bold">{labels.paymentAmount.replace('{amount}', selectedChargePlan.price.toLocaleString())}</p>
            </div>
            <div className="bg-[#1c1c1e] border border-zinc-800 rounded-2xl p-5 mb-auto shadow-inner">
              <div className="flex items-start gap-3">
                <div className="text-zinc-500 mt-0.5"><IconLock /></div>
                <p className="text-[11px] text-zinc-400 leading-relaxed text-left">
                  {labels.stripeSecureNotice}
                </p>
              </div>
            </div>
            <button
              onClick={onCheckout}
              disabled={isCharging}
              className="w-full py-4 mt-8 bg-white text-black rounded-full text-[15px] font-black shadow-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 active:scale-95"
            >
              {isCharging ? (
                <span className="flex items-center gap-2"><div className="w-5 h-5 border-[3px] border-black border-t-transparent rounded-full animate-spin"></div>{labels.stripeConnecting}</span>
              ) : (
                <>{labels.goToCheckout} <IconChevronRight /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);
