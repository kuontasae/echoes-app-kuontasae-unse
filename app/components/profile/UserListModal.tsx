"use client";

import React from "react";
import { User } from "../../types";
import { IconCross, IconSearch } from "../../Icons";

type UserListModalProps = {
  title: string | null;
  users: User[];
  searchQuery: string;
  followedUsers: Set<string>;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onOpenUser: (user: User) => void;
  onToggleFollow: (userId: string) => void;
};

export function UserListModal({
  title,
  users,
  searchQuery,
  followedUsers,
  onClose,
  onSearchChange,
  onOpenUser,
  onToggleFollow,
}: UserListModalProps) {
  if (!title) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[900] flex items-center justify-center p-6 animate-fade-in" onClick={onClose}>
      <div className="bg-[#1c1c1e] border border-zinc-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className="text-sm font-bold uppercase tracking-widest">{title}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-2"><IconCross /></button>
        </div>
        <div className="relative mb-4 shrink-0">
          <div className="absolute left-3 top-1/2 -translate-y-1/2"><IconSearch /></div>
          <input type="text" placeholder="Search users..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-lg py-2 pl-10 text-xs text-white focus:outline-none" />
        </div>
        <div className="flex flex-col gap-5 overflow-y-auto pr-2 flex-1 scrollbar-hide">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => onOpenUser(u)}>
                <img src={u.avatar} className="w-10 h-10 rounded-full object-cover border border-zinc-800" />
                <div><p className="font-bold text-xs flex items-center">{u.name}</p><p className="text-[10px] text-zinc-500">@{u.handle}</p></div>
              </div>
              <button onClick={() => onToggleFollow(u.id)} className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${followedUsers.has(u.id) ? 'border border-zinc-700 text-zinc-400' : 'bg-white text-black'}`}>{followedUsers.has(u.id) ? 'Following' : 'Follow'}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
