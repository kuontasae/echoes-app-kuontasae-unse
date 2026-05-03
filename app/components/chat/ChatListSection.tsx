"use client";

import React from "react";
import { ChatGroup, ChatMessage, LiveCommunity, User } from "../../types";
import { IconTicket, IconUsers } from "../../Icons";

type ChatTabMode = "friends" | "matches" | "groups" | "community";

type ChatListLabels = {
  chat: string;
  friendsChat: string;
  groupsChat: string;
};

type ChatListSectionProps = {
  chatTabMode: ChatTabMode;
  labels: ChatListLabels;
  chatHistory: Record<string, ChatMessage[]>;
  allProfiles: User[];
  chatGroups: ChatGroup[];
  chatCommunities: LiveCommunity[];
  currentUserId?: string;
  timeZone: string;
  displayLocalTime: (timestamp: number, timeZone: string) => string;
  onTabChange: (mode: ChatTabMode) => void;
  onCreateGroup: () => void;
  onOpenChat: (chatId: string) => void;
  onOpenProfile: (user: User) => void;
};

export function ChatListSection({
  chatTabMode,
  labels,
  chatHistory,
  allProfiles,
  chatGroups,
  chatCommunities,
  currentUserId,
  timeZone,
  displayLocalTime,
  onTabChange,
  onCreateGroup,
  onOpenChat,
  onOpenProfile,
}: ChatListSectionProps) {
  const currentTab = chatTabMode === 'community' ? 'groups' : chatTabMode;
  const communityIds = new Set(chatCommunities.map(c => c.id));
  const friendChatIds = Object.keys(chatHistory).filter(id => !id.startsWith('com') && !id.startsWith('artist:') && !id.startsWith('g') && !communityIds.has(id));
  const visibleFriendChatIds = friendChatIds.filter(id => allProfiles.some(p => p.id === id));
  const artistCommunities = chatCommunities.filter(c => c.communityType === 'artist');
  const liveCommunities = chatCommunities.filter(c => c.communityType !== 'artist');

  return (
    <div className="mt-8 animate-fade-in px-2">
      <h2 className="text-2xl font-bold tracking-tight mb-6 px-2">{labels.chat}</h2>
      <div className="flex bg-[#1c1c1e] p-1 rounded-xl mb-6 mx-2 border border-zinc-800">
        <button onClick={() => onTabChange('friends')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-colors ${currentTab === 'friends' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>{labels.friendsChat}</button>
        <button onClick={() => onTabChange('groups')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-colors ${currentTab === 'groups' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>{labels.groupsChat}</button>
      </div>
      {currentTab === 'groups' && (
        <div className="px-2 mb-4">
          <button onClick={onCreateGroup} className="w-full py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-bold text-[#1DB954] hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
            グループを作成
          </button>
        </div>
      )}
      <div className="flex flex-col px-2">
        {currentTab === 'friends' && visibleFriendChatIds.map(partnerId => {
          const user = allProfiles.find(x => x.id === partnerId);
          const lastMsg = chatHistory[partnerId][chatHistory[partnerId].length - 1];
          return (
            <div key={partnerId} onClick={() => onOpenChat(partnerId)} className="flex items-center gap-4 p-3 hover:bg-[#1c1c1e] rounded-2xl cursor-pointer transition-colors group relative">
              <img
                src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80"}
                className="w-14 h-14 rounded-full object-cover flex-shrink-0 border border-zinc-800 hover:opacity-80 relative z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  if (user) onOpenProfile(user);
                }}
              />
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-sm truncate">{user?.name || "ユーザー"}</p>
                  <span className="text-[9px] text-zinc-500">{lastMsg ? displayLocalTime(lastMsg.timestamp, timeZone) : ""}</span>
                </div>
                <p className="text-xs text-zinc-400 truncate mt-0.5">
                  {lastMsg ? (
                    lastMsg.text.startsWith('[VOICE]') ? 'ボイスメッセージ' :
                      lastMsg.text.startsWith('[IMAGE]') ? '画像を送信しました' :
                        lastMsg.text.startsWith('[FILE]') ? 'ファイルを送信しました' :
                          lastMsg.text
                  ) : "メッセージを送ろう"}
                </p>
              </div>
              {chatHistory[partnerId].some(m => m.senderId !== currentUserId && !m.isRead) && (
                <div className="absolute right-4 bottom-4 w-2 h-2 bg-[#1DB954] rounded-full shadow-[0_0_8px_#1DB954]"></div>
              )}
            </div>
          );
        })}
        {currentTab === 'friends' && friendChatIds.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-zinc-500 text-sm">メッセージはまだありません</p>
          </div>
        )}
        {currentTab === 'groups' && (
          <>
            {chatGroups.length > 0 && <p className="text-[10px] font-bold text-zinc-500 px-3 pt-2 pb-1">グループ</p>}
            {chatGroups.map(g => (
              <div key={g.id} onClick={() => onOpenChat(g.id)} className="flex items-center gap-4 p-3 hover:bg-[#1c1c1e] rounded-2xl cursor-pointer">
                <div className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden relative"><IconUsers /></div>
                <div className="flex-1 overflow-hidden z-10"><p className="font-bold text-sm truncate">{g.name}</p><p className="text-xs text-zinc-400 truncate">参加しました</p></div>
              </div>
            ))}
            {artistCommunities.length > 0 && <p className="text-[10px] font-bold text-zinc-500 px-3 pt-4 pb-1">アーティストコミュニティ</p>}
            {artistCommunities.map(c => (
              <div key={c.id} onClick={() => onOpenChat(c.id)} className="flex items-center gap-4 p-3 hover:bg-[#1c1c1e] rounded-2xl cursor-pointer">
                <div className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                  {c.artworkUrl ? <img src={c.artworkUrl} className="w-full h-full object-cover" /> : <IconUsers />}
                </div>
                <div className="flex-1 overflow-hidden z-10"><p className="font-bold text-sm truncate">{c.name}</p><p className="text-xs text-zinc-400 truncate">参加者 {Math.max(1, c.memberCount)}人</p></div>
              </div>
            ))}
            {liveCommunities.length > 0 && <p className="text-[10px] font-bold text-zinc-500 px-3 pt-4 pb-1">ライブコミュニティ</p>}
            {liveCommunities.map(c => (
              <div key={c.id} onClick={() => onOpenChat(c.id)} className="flex items-center gap-4 p-3 hover:bg-[#1c1c1e] rounded-2xl cursor-pointer">
                <div className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden relative"><IconTicket /></div>
                <div className="flex-1 overflow-hidden z-10"><p className="font-bold text-sm truncate">{c.name}</p><p className="text-xs text-zinc-400 truncate">参加者 {Math.max(1, c.memberCount)}人</p></div>
              </div>
            ))}
            {chatGroups.length === 0 && chatCommunities.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-zinc-500 text-sm">参加中のグループはまだありません</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
