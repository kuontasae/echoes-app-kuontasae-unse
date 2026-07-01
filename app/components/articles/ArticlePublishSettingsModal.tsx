"use client";

import React from "react";
import { IconCross } from "../../Icons";
import type { User } from "../../types";

const IconYen = () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><line x1="12" y1="9" x2="12" y2="22"></line><polyline points="6 6 12 9 18 6"></polyline><line x1="6" y1="14" x2="18" y2="14"></line><line x1="6" y1="18" x2="18" y2="18"></line></svg>;

type ArticlePublishSettingsModalProps = {
  isOpen: boolean;
  newArticleCover: string | null;
  newArticleTitle: string;
  myProfile: User;
  isArticlePremium: boolean;
  articlePriceInput: number;
  isPosting: boolean;
  onClose: () => void;
  onTogglePremium: () => void;
  onPriceInputChange: (value: number) => void;
  onPostArticle: () => void;
  labels: {
    title: string;
    preview: string;
    untitledArticle: string;
    publishAsPremium: string;
    premiumDividerHint: string;
    salePrice: string;
    coin: string;
    posting: string;
    postArticle: string;
  };
};

export const ArticlePublishSettingsModal: React.FC<ArticlePublishSettingsModalProps> = ({
  isOpen,
  newArticleCover,
  newArticleTitle,
  myProfile,
  isArticlePremium,
  articlePriceInput,
  isPosting,
  onClose,
  onTogglePremium,
  onPriceInputChange,
  onPostArticle,
  labels,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1100] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-[#1c1c1e] border border-zinc-800 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/50">
          <h3 className="font-bold text-lg text-white">{labels.title}</h3>
          <button onClick={onClose} className="w-8 h-8 bg-zinc-800/50 hover:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 transition-colors">
            <IconCross />
          </button>
        </div>
        <div className="p-6 flex flex-col gap-6">
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{labels.preview}</p>
            <div className="bg-black rounded-2xl border border-zinc-800 overflow-hidden">
              <img src={newArticleCover || '/default-bg.jpg'} className="w-full h-32 object-cover" />
              <div className="p-4">
                <p className="font-bold text-base text-white truncate">{newArticleTitle || labels.untitledArticle}</p>
                <div className="flex items-center gap-2 mt-3">
                  <img src={myProfile.avatar} className="w-5 h-5 rounded-full object-cover border border-zinc-700" />
                  <span className="text-xs text-zinc-400">{myProfile.name}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-black rounded-2xl border border-zinc-800 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1DB954]/10 flex items-center justify-center text-[#1DB954]">
                  <IconYen />
                </div>
                <div>
                  <p className="font-bold text-sm text-white">{labels.publishAsPremium}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{labels.premiumDividerHint}</p>
                </div>
              </div>
              <button onClick={onTogglePremium} className={`w-12 h-6 rounded-full p-1 transition-colors relative ${isArticlePremium ? 'bg-[#1DB954]' : 'bg-zinc-700'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isArticlePremium ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div>
            {isArticlePremium && (
              <div className="mt-4 pt-4 border-t border-zinc-800 animate-fade-in flex items-center justify-between">
                <p className="text-sm font-bold text-zinc-300">{labels.salePrice}</p>
                <div className="flex items-center gap-2">
                  <input type="number" min="1" value={articlePriceInput} onChange={(e) => onPriceInputChange(parseInt(e.target.value) || 0)} className="w-24 bg-[#1c1c1e] border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white text-right focus:outline-none focus:border-[#1DB954]" />
                  <span className="font-bold text-zinc-400">{labels.coin}</span>
                </div>
              </div>
            )}
          </div>
          <button onClick={onPostArticle} disabled={isPosting} className="w-full py-4 bg-[#1DB954] text-black rounded-xl text-sm font-bold shadow-lg hover:scale-[1.02] transition-transform disabled:opacity-50 mt-2">
            {isPosting ? labels.posting : labels.postArticle}
          </button>
        </div>
      </div>
    </div>
  );
};
