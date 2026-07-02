"use client";

import React from 'react';
import { IconChevronLeft, IconChevronRight } from '../Icons';
import type { User } from '../types';

type MutualFriendsModalProps = {
  users: User[];
  title: string;
  onClose: () => void;
  onOpenUser: (user: User) => void;
};

export const MutualFriendsModal: React.FC<MutualFriendsModalProps> = ({
  users,
  title,
  onClose,
  onOpenUser,
}) => (
  <div className="fixed inset-0 bg-black/95 z-[900] flex flex-col animate-fade-in">
    <div className="flex items-center p-4 border-b border-zinc-900 sticky top-0 bg-black/90 backdrop-blur-md z-10">
      <button onClick={onClose}><IconChevronLeft /></button>
      <h2 className="text-white font-bold text-lg mx-auto pr-8">{title}</h2>
    </div>
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex flex-col gap-4">
        {users.map(u => (
          <div key={u.id} className="flex items-center justify-between p-3 bg-[#1c1c1e] rounded-2xl border border-zinc-800 cursor-pointer hover:bg-zinc-800" onClick={() => onOpenUser(u)}>
            <div className="flex items-center gap-3">
              <img src={u.avatar} className="w-12 h-12 rounded-full object-cover" />
              <div><p className="font-bold text-sm text-white">{u.name}</p><p className="text-[10px] text-zinc-500">@{u.handle}</p></div>
            </div>
            <IconChevronRight />
          </div>
        ))}
      </div>
    </div>
  </div>
);
