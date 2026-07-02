"use client";

import React from 'react';
import { IconChevronLeft, IconLock } from '../Icons';
import type { User } from '../types';

type BlockedUsersModalLabels = {
  title: string;
  empty: string;
  unblock: string;
};

type BlockedUsersModalProps = {
  users: User[];
  labels: BlockedUsersModalLabels;
  onClose: () => void;
  onUnblockUser: (userId: string) => void;
};

export const BlockedUsersModal: React.FC<BlockedUsersModalProps> = ({
  users,
  labels,
  onClose,
  onUnblockUser,
}) => (
  <div className="fixed inset-0 bg-black/95 z-[900] flex flex-col animate-fade-in">
    <div className="flex items-center p-4 border-b border-zinc-900 sticky top-0 bg-black/90 backdrop-blur-md z-10">
      <button onClick={onClose}><IconChevronLeft /></button>
      <h2 className="text-white font-bold text-lg mx-auto pr-8">{labels.title}</h2>
    </div>
    <div className="flex-1 overflow-y-auto p-4">
      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <IconLock />
          <p className="mt-4 text-sm font-bold">{labels.empty}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between bg-[#1c1c1e] p-4 rounded-2xl border border-zinc-800 shadow-sm">
              <div className="flex items-center gap-3">
                <img src={u.avatar} className="w-12 h-12 rounded-full object-cover border border-zinc-700" />
                <div>
                  <p className="font-bold text-sm text-white">{u.name}</p>
                  <p className="text-[10px] text-zinc-500">@{u.handle}</p>
                </div>
              </div>
              <button onClick={() => onUnblockUser(u.id)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-xs font-bold text-white transition-colors">
                {labels.unblock}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);
