import React from 'react';
import { IconStop } from '../Icons'; // 💡 アイコンを親フォルダから読み込む

// 💡 親（page.tsx）から受け取るデータの型を定義する
interface MiniPlayerProps {
  activeTrackInfo: { title: string; artist: string; imgUrl: string } | null;
  playingSong: string | null;
  togglePlay: (url: string) => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ activeTrackInfo, playingSong, togglePlay }) => {
  // 曲が選ばれていない時は何も表示しない
  if (!activeTrackInfo || !playingSong) return null;

  return (
    <div className="fixed bottom-[88px] left-4 right-4 bg-[#1c1c1e]/90 backdrop-blur-xl border border-zinc-800 rounded-2xl p-3 flex items-center justify-between shadow-2xl z-[90] animate-slide-up">
      <div className="flex items-center gap-3 overflow-hidden">
        <img src={activeTrackInfo.imgUrl} className="w-10 h-10 rounded-lg object-cover animate-[spin_10s_linear_infinite]" />
        <div className="overflow-hidden">
          <p className="text-[13px] font-bold text-white truncate">{activeTrackInfo.title}</p>
          <p className="text-[10px] text-[#1DB954] font-bold truncate">{activeTrackInfo.artist}</p>
        </div>
      </div>
      <button onClick={() => togglePlay(playingSong)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black flex-shrink-0 shadow-lg hover:scale-105 transition-transform">
         <IconStop />
      </button>
    </div>
  );
};