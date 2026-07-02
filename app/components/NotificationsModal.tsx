"use client";

import React from 'react';
import { IconComment, IconCross, IconHeart, IconMatchTab, IconSparkles, IconUserPlus } from '../Icons';
import type { Notification } from '../types';

type NotificationsModalLabels = {
  title: string;
  empty: string;
};

type NotificationsModalProps = {
  notifications: Notification[];
  labels: NotificationsModalLabels;
  onClose: () => void;
  onNotificationClick: (notification: Notification) => void;
};

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  notifications,
  labels,
  onClose,
  onNotificationClick,
}) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[950] animate-fade-in" onClick={onClose}>
    <div className="absolute top-4 right-4 w-full max-w-sm bg-[#1c1c1e] border border-zinc-800 rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg">{labels.title}</h3><button onClick={onClose} className="text-zinc-500 hover:text-white"><IconCross /></button></div>
      <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
  {notifications.map((n) => (
    <div key={n.id} onClick={() => onNotificationClick(n)} className="flex items-start gap-4 p-3 rounded-2xl hover:bg-zinc-800/50 transition-colors cursor-pointer relative">
      {!n.read && <div className="absolute top-4 right-4 w-2 h-2 bg-[#1DB954] rounded-full"></div>}
      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 text-white">
        {n.type === 'follow' ? <IconUserPlus /> : n.type === 'like' ? <IconHeart filled={true} /> : n.type === 'vibe_request' ? <IconSparkles /> : n.type === 'match' ? <IconMatchTab /> : <IconComment />}
      </div>
      <div><p className={`text-sm ${n.read ? 'text-zinc-400 font-normal' : 'text-white font-bold'}`}>{n.text}</p><p className="text-[10px] text-zinc-500 mt-1">{n.time}</p></div>
    </div>
  ))}
  {notifications.length === 0 && <p className="text-zinc-500 text-xs text-center py-4">{labels.empty}</p>}
</div>
    </div>
  </div>
);
