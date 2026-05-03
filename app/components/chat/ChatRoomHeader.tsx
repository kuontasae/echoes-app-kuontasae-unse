"use client";

import React from "react";
import { ChatGroup, LiveCommunity, User } from "../../types";
import { IconChevronLeft } from "../../Icons";

type ChatRoomHeaderProps = {
  activeChatUserId: string;
  allProfiles: User[];
  chatGroups: ChatGroup[];
  chatCommunities: LiveCommunity[];
  activeCommunityMemberIds?: string[];
  onBack: () => void;
  onOpenDetails: () => void;
};

export function ChatRoomHeader({
  activeChatUserId,
  allProfiles,
  chatGroups,
  chatCommunities,
  activeCommunityMemberIds,
  onBack,
  onOpenDetails,
}: ChatRoomHeaderProps) {
  const isCommunity = activeChatUserId.startsWith('com') || activeChatUserId.startsWith('artist:') || chatCommunities.some(c => c.id === activeChatUserId);
  const isGroup = activeChatUserId.startsWith('g');
  const community = chatCommunities.find(c => c.id === activeChatUserId);
  const group = chatGroups.find(g => g.id === activeChatUserId);
  const title = isCommunity
    ? community?.name || "コミュニティ"
    : isGroup
      ? group?.name || "グループチャット"
      : allProfiles.find(u => u.id === activeChatUserId)?.name || "Chat";
  const memberCount = isCommunity
    ? Math.max(1, activeCommunityMemberIds?.length || community?.memberCount || 1)
    : Math.max(1, group?.memberIds.length || 1);

  return (
    <div className="flex items-center p-3 bg-[#0a0a0a]/95 backdrop-blur-md sticky top-0 border-b border-zinc-900 z-10">
      <button onClick={onBack} aria-label="戻る" className="p-2 -ml-1 text-white hover:opacity-80 transition-opacity"><IconChevronLeft /></button>
      <div className="flex-1 overflow-hidden px-2 flex flex-col">
        <h2 className="text-white font-bold text-[16px] truncate">{title}</h2>
        {(isCommunity || isGroup) && (
          <p className="text-[11px] font-bold text-zinc-500 truncate">参加者 {memberCount}人</p>
        )}
      </div>
      {(isCommunity || isGroup) ? (
        <button onClick={onOpenDetails} aria-label="詳細" className="p-2 -mr-1 text-white hover:opacity-80 transition-opacity">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
      ) : <div className="w-10"></div>}
    </div>
  );
}
