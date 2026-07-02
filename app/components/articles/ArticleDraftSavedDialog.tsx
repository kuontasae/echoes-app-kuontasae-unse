"use client";

import React from "react";

type ArticleDraftSavedDialogProps = {
  title: string;
  body: string;
  continueLabel: string;
  closeLabel: string;
  onContinue: () => void;
  onClose: () => void;
};

export const ArticleDraftSavedDialog: React.FC<ArticleDraftSavedDialogProps> = ({
  title,
  body,
  continueLabel,
  closeLabel,
  onContinue,
  onClose,
}) => (
  <div className="absolute inset-0 z-[1100] flex items-center justify-center p-6 animate-fade-in bg-black/60 backdrop-blur-sm">
    <div className="bg-[#1c1c1e] rounded-3xl p-6 w-full max-w-xs shadow-2xl border border-zinc-800 flex flex-col items-center text-center">
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-xs text-zinc-400 mb-6 leading-relaxed">{body}</p>
      <div className="flex gap-3 w-full">
        <button onClick={onContinue} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-colors">{continueLabel}</button>
        <button onClick={onClose} className="flex-1 py-3 bg-white hover:bg-gray-200 text-black rounded-xl text-xs font-bold transition-colors">{closeLabel}</button>
      </div>
    </div>
  </div>
);
