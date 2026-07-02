"use client";

import React from 'react';
import { IconCheck, IconCross } from '../Icons';
import type { User } from '../types';

type CreateGroupModalLabels = {
  title: string;
  groupName: string;
  groupNamePlaceholder: string;
  selectMembers: string;
  createAction: string;
};

type CreateGroupModalProps = {
  newGroupName: string;
  followedUsers: Set<string>;
  allProfiles: User[];
  newGroupMembers: Set<string>;
  labels: CreateGroupModalLabels;
  onClose: () => void;
  onGroupNameChange: (value: string) => void;
  onToggleMember: (userId: string) => void;
  onCreateGroup: () => void;
};

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  newGroupName,
  followedUsers,
  allProfiles,
  newGroupMembers,
  labels,
  onClose,
  onGroupNameChange,
  onToggleMember,
  onCreateGroup,
}) => (
  <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[950] flex items-center justify-center p-6 animate-fade-in" onClick={onClose}>
    <div className="bg-[#1c1c1e] border border-zinc-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg">{labels.title}</h3><button onClick={onClose} className="text-zinc-500 hover:text-white"><IconCross /></button></div>
      <div className="mb-6"><label className="text-[10px] text-zinc-500 mb-1 block">{labels.groupName}</label><input type="text" placeholder={labels.groupNamePlaceholder} value={newGroupName} onChange={(e) => onGroupNameChange(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" /></div>
      <div className="mb-6">
        <label className="text-[10px] text-zinc-500 mb-2 block">{labels.selectMembers}</label>
        <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-2 scrollbar-hide">
          {Array.from(followedUsers).map(uid => {
            const u = allProfiles.find(mu => mu.id === uid);
            if (!u) return null; const isSelected = newGroupMembers.has(uid);
            return (
              <div key={uid} onClick={() => onToggleMember(uid)} className="flex items-center justify-between p-2 hover:bg-zinc-800/50 rounded-xl cursor-pointer">
                <div className="flex items-center gap-3"><img src={u.avatar} className="w-8 h-8 rounded-full object-cover" /><span className="text-sm font-bold">{u.name}</span></div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-[#1DB954] border-[#1DB954]' : 'border-zinc-600'}`}>{isSelected && <IconCheck />}</div>
              </div>
            );
          })}
        </div>
      </div>
      <button onClick={onCreateGroup} className="w-full py-3 bg-white text-black rounded-xl text-sm font-bold shadow-lg">{labels.createAction}</button>
    </div>
  </div>
);
