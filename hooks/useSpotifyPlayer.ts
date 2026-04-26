"use client";
import { useState, useEffect, useRef, useCallback } from 'react';

interface SpotifyPlayerState {
  isReady: boolean;
  isPlaying: boolean;
  currentTrack: any | null;
  deviceId: string | null;
}

export const useSpotifyPlayer = (accessToken: string | null) => {
  const [playerState, setPlayerState] = useState<SpotifyPlayerState>({
    isReady: false,
    isPlaying: false,
    currentTrack: null,
    deviceId: null,
  });
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!accessToken) return;

    const script = document.createElement("script");
    script.src = process.env.NEXT_PUBLIC_SPOTIFY_SDK_URL as string;
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'EchoesWebPlayer',
        getOAuthToken: (cb: (token: string) => void) => { cb(accessToken); },
        volume: 0.5
      });

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        setPlayerState(prev => ({ ...prev, isReady: true, deviceId: device_id }));
      });

      player.addListener('not_ready', () => {
        setPlayerState(prev => ({ ...prev, isReady: false, deviceId: null }));
      });

      player.addListener('player_state_changed', (state: any) => {
        if (!state) return;
        setPlayerState(prev => ({
          ...prev,
          isPlaying: !state.paused,
          currentTrack: state.track_window.current_track
        }));
      });

      player.connect();
      playerRef.current = player;
    };

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
      document.body.removeChild(script);
      delete window.onSpotifyWebPlaybackSDKReady;
    };
  }, [accessToken]);

  const playTrack = useCallback(async (spotifyUri: string) => {
    if (!playerState.deviceId || !accessToken) return;
    const apiUrl = process.env.NEXT_PUBLIC_SPOTIFY_API_URL as string;
    const targetUrl = apiUrl + "/me/player/play?device_id=" + playerState.deviceId;
    await fetch(targetUrl, {
      method: 'PUT',
      body: JSON.stringify({ uris: [spotifyUri] }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + accessToken
      }
    });
  }, [playerState.deviceId, accessToken]);

  const pauseTrack = useCallback(async () => {
    if (playerRef.current) {
      await playerRef.current.pause();
    }
  }, []);

  const resumeTrack = useCallback(async () => {
    if (playerRef.current) {
      await playerRef.current.resume();
    }
  }, []);

  return {
    ...playerState,
    playTrack,
    pauseTrack,
    resumeTrack
  };
};

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify: any;
  }
}