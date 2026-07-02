"use client";

import React from 'react';
import { IconInfo } from '../Icons';

type AppInfoModalProps = {
  title: string;
  content: string;
  closeLabel: string;
  titleClassName: string;
  contentClassName: string;
  closeButtonClassName: string;
  contentWrapperClassName?: string;
  onClose: () => void;
};

export const AppInfoModal: React.FC<AppInfoModalProps> = ({
  title,
  content,
  closeLabel,
  titleClassName,
  contentClassName,
  closeButtonClassName,
  contentWrapperClassName,
  onClose,
}) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[950] flex items-center justify-center p-6 animate-fade-in" onClick={onClose}>
    <div className="bg-[#1c1c1e] border border-zinc-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative text-center" onClick={e => e.stopPropagation()}>
      <div className="mx-auto w-12 h-12 bg-black rounded-full flex items-center justify-center mb-4 text-white"><IconInfo /></div>
      <h3 className={titleClassName}>{title}</h3>
      {contentWrapperClassName ? (
        <div className={contentWrapperClassName}>
          <p className={contentClassName}>{content}</p>
        </div>
      ) : (
        <p className={contentClassName}>{content}</p>
      )}
      <button onClick={onClose} className={closeButtonClassName}>{closeLabel}</button>
    </div>
  </div>
);
