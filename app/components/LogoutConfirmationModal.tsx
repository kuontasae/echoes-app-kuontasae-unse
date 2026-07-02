"use client";

import React from 'react';

type LogoutConfirmationModalProps = {
  title: string;
  cancelLabel: string;
  logoutLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  title,
  cancelLabel,
  logoutLabel,
  onCancel,
  onConfirm,
}) => (
  <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[1000] flex items-center justify-center p-6 animate-fade-in" onClick={onCancel}>
    <div className="bg-[#1c1c1e] border border-zinc-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
      <p className="text-center font-bold text-lg mb-8 leading-relaxed">{title}</p>
      <div className="flex gap-4">
        <button onClick={onCancel} className="flex-1 py-3.5 border border-zinc-800 rounded-xl text-xs font-bold uppercase">{cancelLabel}</button>
        <button onClick={onConfirm} className="flex-1 py-3.5 bg-red-500 text-white rounded-xl text-xs font-bold uppercase">{logoutLabel}</button>
      </div>
    </div>
  </div>
);
