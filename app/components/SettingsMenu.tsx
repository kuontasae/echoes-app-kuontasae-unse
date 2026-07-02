"use client";

import React from 'react';
import { IconBell, IconChevronLeft, IconChevronRight, IconClock, IconGlobe, IconHelp, IconInfo, IconLock, IconLockSetting, IconMusic, IconShareExternal, IconStar, IconWarning } from '../Icons';

const IconYen = () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><line x1="12" y1="9" x2="12" y2="22"></line><polyline points="6 6 12 9 18 6"></polyline><line x1="6" y1="14" x2="18" y2="14"></line><line x1="6" y1="18" x2="18" y2="18"></line></svg>;

type SettingsProfile = {
  avatar: string;
  name: string;
  handle: string;
  isPrivate?: boolean;
};

type SettingsMenuLabels = {
  settings: string;
  creatorTools: string;
  revenueDashboard: string;
  features: string;
  audio: string;
  notifications: string;
  privateAcc: string;
  timezone: string;
  language: string;
  blockedUsers: string;
  appInfo: string;
  shareApp: string;
  rateApp: string;
  help: string;
  adminOnly: string;
  adminDashboard: string;
  logout: string;
  deleteAccFull: string;
};

type SettingsMenuProps = {
  myProfile: SettingsProfile;
  settingsState: {
    audio: boolean;
    notifications: boolean;
  };
  timeZone: string;
  language: string;
  isAdmin: boolean;
  labels: SettingsMenuLabels;
  onClose: () => void;
  onOpenEditProfile: () => void;
  onLoadRevenueDashboard: () => void;
  onToggleAudio: () => void;
  onToggleNotifications: () => void;
  onTogglePrivate: () => void;
  onTimeZoneChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onOpenBlockedUsers: () => void;
  onShareApp: () => void;
  onOpenHelp: () => void;
  onOpenAppInfo: () => void;
  onOpenAdminDashboard: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
};

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  myProfile,
  settingsState,
  timeZone,
  language,
  isAdmin,
  labels,
  onClose,
  onOpenEditProfile,
  onLoadRevenueDashboard,
  onToggleAudio,
  onToggleNotifications,
  onTogglePrivate,
  onTimeZoneChange,
  onLanguageChange,
  onOpenBlockedUsers,
  onShareApp,
  onOpenHelp,
  onOpenAppInfo,
  onOpenAdminDashboard,
  onLogout,
  onDeleteAccount,
}) => (
  <div className="fixed inset-0 bg-black z-[800] animate-fade-in overflow-y-auto">
    <div className="flex items-center px-4 py-4 border-b border-zinc-900 sticky top-0 bg-black/90 backdrop-blur-md z-10"><button onClick={onClose}><IconChevronLeft /></button><h2 className="text-white font-bold text-lg mx-auto pr-8">{labels.settings}</h2></div>
    <div className="px-4 py-6">
      <div className="bg-[#1c1c1e] rounded-[22px] p-4 flex items-center justify-between mb-8 cursor-pointer" onClick={onOpenEditProfile}><div className="flex items-center gap-4"><img src={myProfile.avatar} className="w-12 h-12 rounded-full object-cover border border-zinc-800" /><div><p className="font-bold text-lg">{myProfile.name}</p><p className="text-sm text-zinc-500">@{myProfile.handle}</p></div></div><IconChevronRight /></div>
      <p className="text-xs font-bold text-zinc-500 mb-2 px-2">{labels.creatorTools}</p>
      <div className="bg-[#1c1c1e] rounded-2xl mb-8 flex flex-col">
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors" onClick={onLoadRevenueDashboard}>
          <div className="flex items-center gap-3 text-yellow-500"><IconYen /><p className="font-bold text-sm text-white">{labels.revenueDashboard}</p></div>
          <IconChevronRight />
        </div>
      </div>
      <p className="text-xs font-bold text-zinc-500 mb-2 px-2">{labels.features}</p>
      <div className="bg-[#1c1c1e] rounded-2xl mb-8"><div className="flex items-center justify-between p-4"><div className="flex items-center gap-3"><IconMusic /><p className="font-bold text-sm">{labels.audio}</p></div><button onClick={onToggleAudio} className={`w-12 h-6 rounded-full p-1 transition-colors ${settingsState.audio ? 'bg-[#1DB954]' : 'bg-zinc-700'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${settingsState.audio ? 'translate-x-6' : 'translate-x-0'}`}></div></button></div></div>
      <p className="text-xs font-bold text-zinc-500 mb-2 px-2">{labels.settings}</p>
      <div className="bg-[#1c1c1e] rounded-2xl mb-8 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/50"><div className="flex items-center gap-3"><IconBell /><p className="font-bold text-sm">{labels.notifications}</p></div><button onClick={onToggleNotifications} className={`w-12 h-6 rounded-full p-1 transition-colors ${settingsState.notifications ? 'bg-[#1DB954]' : 'bg-zinc-700'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${settingsState.notifications ? 'translate-x-6' : 'translate-x-0'}`}></div></button></div>
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/50"><div className="flex items-center gap-3"><IconLockSetting /><p className="font-bold text-sm">{labels.privateAcc}</p></div><button onClick={onTogglePrivate} className={`w-12 h-6 rounded-full p-1 transition-colors ${myProfile.isPrivate ? 'bg-white' : 'bg-zinc-700'}`}><div className={`w-4 h-4 rounded-full shadow-md transform transition-transform ${myProfile.isPrivate ? 'translate-x-6 bg-black' : 'translate-x-0 bg-white'}`}></div></button></div>
        <div className="relative flex items-center justify-between p-4 border-b border-zinc-800/50 cursor-pointer"><div className="flex items-center gap-3"><IconClock /><p className="font-bold text-sm">{labels.timezone}: {timeZone.split('/').pop()?.replace('_', ' ')}</p></div><IconChevronRight /><select value={timeZone} onChange={(e) => onTimeZoneChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"><optgroup label="Asia"><option value="Asia/Tokyo">Tokyo (JST)</option><option value="Asia/Seoul">Seoul (KST)</option><option value="Asia/Shanghai">Shanghai (CST)</option></optgroup><optgroup label="America"><option value="America/New_York">New York (EST/EDT)</option><option value="America/Los_Angeles">Los Angeles (PST/PDT)</option></optgroup><optgroup label="Europe"><option value="Europe/London">London (GMT/BST)</option><option value="Europe/Paris">Paris (CET/CEST)</option></optgroup></select></div>
        <div className="relative flex items-center justify-between p-4 cursor-pointer"><div className="flex items-center gap-3"><IconGlobe /><p className="font-bold text-sm">{labels.language}: {language}</p></div><IconChevronRight /><select value={language} onChange={(e) => onLanguageChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"><option value="日本語">日本語</option><option value="English">English</option><option value="中文">中文</option></select></div>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors" onClick={onOpenBlockedUsers}><div className="flex items-center gap-3"><IconLock /><p className="font-bold text-sm">{labels.blockedUsers}</p></div><IconChevronRight /></div>
      </div>
      <p className="text-xs font-bold text-zinc-500 mb-2 px-2">{labels.appInfo}</p>
      <div className="bg-[#1c1c1e] rounded-2xl mb-8 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/50 cursor-pointer" onClick={onShareApp}><div className="flex items-center gap-3"><IconShareExternal /><p className="font-bold text-sm">{labels.shareApp}</p></div><IconChevronRight /></div>
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/50 cursor-pointer"><div className="flex items-center gap-3"><IconStar /><p className="font-bold text-sm">{labels.rateApp}</p></div><IconChevronRight /></div>
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/50 cursor-pointer" onClick={onOpenHelp}><div className="flex items-center gap-3"><IconHelp /><p className="font-bold text-sm">{labels.help}</p></div><IconChevronRight /></div>
        <div className="flex items-center justify-between p-4 cursor-pointer" onClick={onOpenAppInfo}><div className="flex items-center gap-3"><IconInfo /><p className="font-bold text-sm">{labels.appInfo}</p></div><IconChevronRight /></div>
      </div>
      {isAdmin && (
        <>
          <p className="text-xs font-bold text-red-500 mb-2 px-2">{labels.adminOnly}</p>
          <div className="bg-[#1c1c1e] rounded-2xl mb-8 flex flex-col border border-red-500/30">
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-red-500/10 transition-colors rounded-2xl" onClick={onOpenAdminDashboard}>
              <div className="flex items-center gap-3 text-red-500"><IconWarning /><p className="font-bold text-sm">{labels.adminDashboard}</p></div>
              <IconChevronRight />
            </div>
          </div>
        </>
      )}
      <button onClick={onLogout} className="w-full bg-[#1c1c1e] hover:bg-zinc-900 transition-colors text-white font-bold py-4 rounded-2xl text-center mb-4 shadow-sm">{labels.logout}</button>
      <button onClick={onDeleteAccount} className="w-full bg-transparent border border-red-500/30 hover:bg-red-500/10 transition-colors text-red-500 font-bold py-4 rounded-2xl text-center mb-10 shadow-sm">{labels.deleteAccFull}</button>
    </div>
  </div>
);
