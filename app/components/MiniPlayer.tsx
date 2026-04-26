"use client";
import React, { useState } from 'react';
import { IconPlay, IconStop } from '../Icons';
import { useSpotifyPlayer } from '../../hooks/useSpotifyPlayer';

interface MiniPlayerProps {
  activeTrackInfo: { title: string; artist: string; imgUrl: string } | null;
  playingSong: string | null;
  togglePlay: (url: string | null, meta?: { title: string; artist: string; imgUrl: string }) => void;
  spotifyAccessToken?: string | null;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  activeTrackInfo,
  playingSong,
  togglePlay,
  spotifyAccessToken = null
}) => {
  const { isReady, isPlaying: isSpotifyPlaying, playTrack, pauseTrack } = useSpotifyPlayer(spotifyAccessToken);
  const [isSearchingSpotify, setIsSearchingSpotify] = useState(false);

  const handleSpotifyPlay = async () => {
    if (!activeTrackInfo || !spotifyAccessToken) return;
    
    setIsSearchingSpotify(true);
    try {
      const query = encodeURIComponent(activeTrackInfo.title + " " + activeTrackInfo.artist);
      const apiUrl = process.env.NEXT_PUBLIC_SPOTIFY_API_URL as string;
      const targetUrl = apiUrl + "/search?q=" + query + "&type=track&limit=1";
      const response = await fetch(targetUrl, {
        headers: {
          'Authorization': 'Bearer ' + spotifyAccessToken
        }
      });
      
      const data = await response.json();
      const trackUri = data.tracks?.items[0]?.uri;

      if (trackUri) {
        await playTrack(trackUri);
      } else {
        togglePlay(playingSong, activeTrackInfo ?? undefined);
      }
    } catch (error) {
      togglePlay(playingSong, activeTrackInfo ?? undefined);
    } finally {
      setIsSearchingSpotify(false);
    }
  };

  const handlePlayPauseClick = () => {
    if (spotifyAccessToken && isReady) {
      if (isSpotifyPlaying) {
        pauseTrack();
      } else {
        handleSpotifyPlay();
      }
    } else {
      togglePlay(playingSong, activeTrackInfo ?? undefined);
    }
  };

  if (!activeTrackInfo) return null;

  return (
    <div className="fixed bottom-20 left-0 w-full px-4 z-[150] animate-fade-in pointer-events-none">
      <div className="bg-[#1c1c1e] border border-zinc-800/80 rounded-[20px] p-3 flex items-center justify-between shadow-2xl backdrop-blur-xl bg-opacity-95 max-w-md mx-auto pointer-events-auto">
        <div className="flex items-center gap-4 overflow-hidden flex-1">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 shadow-md">
            <img 
              src={activeTrackInfo.imgUrl} 
              alt="cover" 
              className={`w-full h-full object-cover ${(playingSong || isSpotifyPlaying) ? 'animate-[spin_4s_linear_infinite]' : ''}`} 
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="font-bold text-[15px] text-white truncate">{activeTrackInfo.title}</p>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5">{activeTrackInfo.artist}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {spotifyAccessToken && isReady && (
            <span className="text-[9px] font-bold text-[#1DB954] bg-[#1DB954]/10 px-2 py-1 rounded-full border border-[#1DB954]/20">
              Spotify Premium
            </span>
          )}
          <button 
            onClick={handlePlayPauseClick} 
            disabled={isSearchingSpotify}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-transform shadow-lg disabled:opacity-50"
          >
            {isSearchingSpotify ? (
               <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (playingSong || isSpotifyPlaying) ? (
              <IconStop />
            ) : (
              <IconPlay />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};