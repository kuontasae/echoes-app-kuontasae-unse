"use client";

import React from "react";
import { IconCamera } from "../../Icons";

type EditProfileModalProps = {
  isOpen: boolean;
  title: string;
  cancelLabel: string;
  editAvatar: string;
  editName: string;
  editHandle: string;
  editBio: string;
  editHashtags: string;
  editLiveHistory: string;
  editTwitter: string;
  editInstagram: string;
  onClose: () => void;
  onSave: () => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onNameChange: (value: string) => void;
  onHandleChange: (value: string) => void;
  onBioChange: (value: string) => void;
  onHashtagsChange: (value: string) => void;
  onLiveHistoryChange: (value: string) => void;
  onTwitterChange: (value: string) => void;
  onInstagramChange: (value: string) => void;
};

export function EditProfileModal({
  isOpen,
  title,
  cancelLabel,
  editAvatar,
  editName,
  editHandle,
  editBio,
  editHashtags,
  editLiveHistory,
  editTwitter,
  editInstagram,
  onClose,
  onSave,
  onImageUpload,
  onNameChange,
  onHandleChange,
  onBioChange,
  onHashtagsChange,
  onLiveHistoryChange,
  onTwitterChange,
  onInstagramChange,
}: EditProfileModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-[500] flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-[#1c1c1e] w-full max-w-sm rounded-[24px] p-6 flex flex-col gap-4 shadow-2xl relative max-h-[80vh] overflow-y-auto">
        <h3 className="text-center font-bold text-lg mb-2">{title}</h3>
        <div className="flex flex-col items-center mb-2">
          <div className="relative w-20 h-20 mb-3 group cursor-pointer mx-auto">
            <img src={editAvatar} className="w-full h-full rounded-full object-cover opacity-70 group-hover:opacity-50" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><IconCamera /></div>
            <input type="file" accept="image/*" onChange={onImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </div>
        </div>
        <div className="space-y-3">
          <input type="text" value={editName} onChange={(e) => onNameChange(e.target.value)} placeholder="名前" className="w-full bg-black border border-zinc-800 rounded-xl p-3.5 text-sm text-white focus:outline-none" />
          <div className="flex items-center bg-black border border-zinc-800 rounded-xl overflow-hidden focus-within:border-zinc-500">
            <span className="pl-3.5 text-zinc-500 font-bold">@</span>
            <input type="text" value={editHandle} onChange={(e) => onHandleChange(e.target.value)} placeholder="ユーザーID" className="w-full bg-transparent p-3.5 text-sm text-white focus:outline-none" />
          </div>
          <textarea value={editBio} onChange={(e) => onBioChange(e.target.value)} placeholder="自己紹介" className="w-full bg-black border border-zinc-800 rounded-xl p-3.5 text-sm text-white focus:outline-none min-h-[60px]" />
          <div><label className="text-[10px] text-zinc-500 ml-1 mb-1 block">ハッシュタグ (カンマ区切り)</label><input type="text" value={editHashtags} onChange={(e) => onHashtagsChange(e.target.value)} placeholder="例: 邦ロック, Vaundy" className="w-full bg-black border border-zinc-800 rounded-xl p-3.5 text-sm text-white focus:outline-none" /></div>
          <div><label className="text-[10px] text-zinc-500 ml-1 mb-1 block">ライブ参戦履歴 (カンマ区切り)</label><input type="text" value={editLiveHistory} onChange={(e) => onLiveHistoryChange(e.target.value)} placeholder="例: Tele 2026ツアー, VIVA LA ROCK" className="w-full bg-black border border-zinc-800 rounded-xl p-3.5 text-sm text-white focus:outline-none" /></div>
          <div><label className="text-[10px] text-zinc-500 ml-1 mb-1 block">X (旧Twitter) のリンク</label><input type="text" value={editTwitter} onChange={(e) => onTwitterChange(e.target.value)} placeholder="例: https://x.com/username" className="w-full bg-black border border-zinc-800 rounded-xl p-3.5 text-sm text-white focus:outline-none" /></div>
          <div><label className="text-[10px] text-zinc-500 ml-1 mb-1 block">Instagram のリンク</label><input type="text" value={editInstagram} onChange={(e) => onInstagramChange(e.target.value)} placeholder="例: https://instagram.com/username" className="w-full bg-black border border-zinc-800 rounded-xl p-3.5 text-sm text-white focus:outline-none" /></div>
        </div>
        <div className="flex gap-3 mt-4 sticky bottom-0 bg-[#1c1c1e] pt-2">
          <button onClick={onClose} className="flex-1 py-3.5 border border-zinc-800 rounded-xl text-xs font-bold uppercase hover:bg-zinc-800 transition-colors">{cancelLabel}</button>
          <button onClick={onSave} className="flex-1 py-3.5 bg-white text-black rounded-xl text-xs font-bold uppercase hover:bg-gray-200 transition-colors">保存</button>
        </div>
      </div>
    </div>
  );
}
