"use client";

import React from 'react';
import { IconWarning } from '../Icons';

type DeleteAccountConfirmationModalProps = {
  title: string;
  warningLine1: string;
  warningLine2: string;
  warningLine3: string;
  cancelLabel: string;
  deleteLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export const DeleteAccountConfirmationModal: React.FC<DeleteAccountConfirmationModalProps> = ({
  title,
  warningLine1,
  warningLine2,
  warningLine3,
  cancelLabel,
  deleteLabel,
  onCancel,
  onConfirm,
}) => (
  <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[1000] flex items-center justify-center p-6 animate-fade-in" onClick={onCancel}>
    <div className="bg-[#1c1c1e] border border-red-500/50 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
      <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><IconWarning /></div>
      <p className="text-center font-bold text-lg mb-4 text-white">{title}</p>
      <p className="text-xs text-zinc-400 text-center mb-8 leading-relaxed">
        {warningLine1}<br />{warningLine2}<br />{warningLine3}
      </p>
      <div className="flex gap-4">
        <button onClick={onCancel} className="flex-1 py-3.5 border border-zinc-800 rounded-xl text-xs font-bold uppercase hover:bg-zinc-800">{cancelLabel}</button>
        <button onClick={onConfirm} className="flex-1 py-3.5 bg-red-500 text-white rounded-xl text-xs font-bold uppercase hover:scale-105 transition-transform shadow-lg">{deleteLabel}</button>
      </div>
    </div>
  </div>
);
