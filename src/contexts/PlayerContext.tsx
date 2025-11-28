import * as React from "react";
import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Track {
  id: string;
  title: string;
  artist_id: string;
  artist_name: string;
  artist_avatar?: string;
  album_id?: string;
  album_title?: string;
  album_cover?: string;
  cover_url?: string;
  audio_url?: string;
  duration_ms: number;
  plays?: number;
  is_explicit?: boolean;
  videoId?: string; // For YouTube Music tracks
}

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isShuffle: boolean;
  repeatMode: "off" | "all" | "one";
  isLoading: boolean;
}

interface PlayerContextType extends PlayerState {
  play: (track?: Track) => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setQueue: (tracks: Track[]) => void;
  addToQueue: (track: Track) => void;
  playTrack: (track: Track, queue?: Track[]) => void;
  audioElement: HTMLAudioElement | null;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}

interface PlayerProviderProps {
  children: React.ReactNode;
}

const PLAYBACK_STATE_KEY = "lilo-playback-state";

// Helper to save to play history
function saveToPlayHistory(track: Track) {
  try {
    const LOCAL_STORAGE_KEY = "lilo-play-history";
    const MAX_HISTORY = 50;
    
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    let entries: { track: Track; playedAt: string }[] = stored ? JSON.parse(stored) : [];
    
    // Remove existing entry for this track
    entries = entries.filter(e => e.track.id !== track.id);
    
    // Add new entry at the beginning
    entries.unshift({
      track,
      playedAt: new Date().toISOString(),
    });
    
    // Limit history size
    if (entries.length > MAX_HISTORY) {
      entries = entries.slice(0, MAX_HISTORY);
    }
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error("Failed to save play history:", e);
  }
}

// Helper to save playback state
function savePlaybackState(state: { track: Track | null; progress: number; queue: Track[] }) {
  try {
    localStorage.setItem(PLAYBACK_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save playback state:", e);
  }
}

// Helper to load playback state
function loadPlaybackState(): { track: Track | null; progress: number; queue: Track[] } | null {
  try {
    const stored = localStorage.getItem(PLAYBACK_STATE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load playback state:", e);
  }
  return null;
}

// Setup Media Session API
function updateMediaSession(track: Track | null, isPlaying: boolean, handlers: {
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
}) {
  if (!("mediaSession" in navigator) || !track) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist_name,
    album: track.album_title || "",
    artwork: [
      { src: track.cover_url || track.album_cover || "", sizes: "512x512", type: "image/jpeg" },
    ],
  });

  navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

  navigator.mediaSession.setActionHandler("play", handlers.onPlay);
  navigator.mediaSession.setActionHandler("pause", handlers.onPause);
  navigator.mediaSession.setActionHandler("previoustrack", handlers.onPrevious);
  navigator.mediaSession.setActionHandler("nexttrack", handlers.onNext);
  navigator.mediaSession.setActionHandler("seekto", (details) => {
    if (details.seekTime !== undefined) {
      handlers.onSeek(details.seekTime);
    }
  });
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlayerState>(() => {
    // Try to restore previous state
    const saved = loadPlaybackState();
    return {
      currentTrack: saved?.track || null,
      queue: saved?.queue || [],
      isPlaying: false, // Always start paused
      progress: saved?.progress || 0,
      duration: 0,
      volume: 0.8,
      isShuffle: false,
      repeatMode: "off",
      isLoading: false,
    };
  });

  // Reference to next function for the ended handler
  const nextRef = useRef<() => void>(() => {});

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = state.volume;
    
    const audio = audioRef.current;
    
    const handleTimeUpdate = () => {
      setState(prev => {
        const newState = {
          ...prev,
          progress: audio.currentTime,
          duration: audio.duration || 0,
        };
        // Save playback state periodically
        if (prev.currentTrack && Math.floor(audio.currentTime) % 5 === 0) {
          savePlaybackState({
            track: prev.currentTrack,
            progress: audio.currentTime,
            queue: prev.queue,
          });
        }
        return newState;
      });
    };
    
    const handleLoadedMetadata = () => {
      setState(prev => ({
        ...prev,
        duration: audio.duration,
        isLoading: false,
      }));
    };
    
    const handleEnded = () => {
      setState(prev => {
        if (prev.repeatMode === "one") {
          audio.currentTime = 0;
          audio.play();
          return prev;
        }
        // Auto-play next track
        if (prev.queue.length > 0) {
          // Call next() after state update
          setTimeout(() => nextRef.current(), 0);
        }
        return { ...prev, isPlaying: false };
      });
    };
    
    const handleError = (e: Event) => {
      console.error("Audio error:", e);
      setState(prev => ({ ...prev, isLoading: false, isPlaying: false }));
    };
    
    const handleCanPlay = () => {
      setState(prev => ({ ...prev, isLoading: false }));
    };
    
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);
    
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.pause();
    };
  }, []);

  // Update volume when state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.volume;
    }
  }, [state.volume]);

  // Restore track on mount if there was a saved state
  useEffect(() => {
    const saved = loadPlaybackState();
    if (saved?.track && audioRef.current) {
      // Load the track but don't play it
      const loadSavedTrack = async () => {
        let audioUrl = saved.track?.audio_url;
        
        if (saved.track?.videoId && !audioUrl) {
          try {
            const { data, error } = await supabase.functions.invoke("youtube-audio-stream", {
              body: { videoId: saved.track.videoId },
            });
            if (!error && data?.audioUrl) {
              audioUrl = data.audioUrl;
            }
          } catch (err) {
            console.error("Failed to restore audio URL:", err);
          }
        }
        
        if (audioUrl && audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.load();
          // Set the saved progress
          audioRef.current.addEventListener("loadedmetadata", () => {
            if (audioRef.current && saved.progress) {
              audioRef.current.currentTime = saved.progress;
            }
          }, { once: true });
        }
      };
      
      loadSavedTrack();
    }
  }, []);

  const play = useCallback(async (track?: Track) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (track) {
      setState(prev => ({ ...prev, currentTrack: track, isLoading: true }));
      
      // Save to play history
      saveToPlayHistory(track);
      
      let audioUrl = track.audio_url;
      
      // If it's a YouTube Music track, fetch the audio URL
      if (track.videoId && !audioUrl) {
        try {
          const { data, error } = await supabase.functions.invoke("youtube-audio-stream", {
            body: { videoId: track.videoId },
          });
          
          if (error) throw error;
          audioUrl = data?.audioUrl;
        } catch (err) {
          console.error("Failed to get YouTube audio URL:", err);
          setState(prev => ({ ...prev, isLoading: false, isPlaying: false }));
          return;
        }
      }
      
      // Use demo audio as fallback
      if (!audioUrl) {
        audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
      }
      
      audio.src = audioUrl;
      audio.load();
    }
    
    audio.play().then(() => {
      setState(prev => ({ ...prev, isPlaying: true }));
    }).catch(err => {
      console.error("Playback error:", err);
      setState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
    });
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState(prev => {
      // Save playback state when pausing
      if (prev.currentTrack) {
        savePlaybackState({
          track: prev.currentTrack,
          progress: prev.progress,
          queue: prev.queue,
        });
      }
      return { ...prev, isPlaying: false };
    });
  }, []);

  const toggle = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState(prev => ({ ...prev, progress: time }));
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    setState(prev => ({ ...prev, volume }));
  }, []);

  const toggleShuffle = useCallback(() => {
    setState(prev => ({ ...prev, isShuffle: !prev.isShuffle }));
  }, []);

  const toggleRepeat = useCallback(() => {
    setState(prev => {
      const modes: ("off" | "all" | "one")[] = ["off", "all", "one"];
      const currentIndex = modes.indexOf(prev.repeatMode);
      return { ...prev, repeatMode: modes[(currentIndex + 1) % 3] };
    });
  }, []);

  const setQueue = useCallback((tracks: Track[]) => {
    setState(prev => ({ ...prev, queue: tracks }));
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setState(prev => ({ ...prev, queue: [...prev.queue, track] }));
  }, []);

  const next = useCallback(() => {
    const { queue, currentTrack, isShuffle, repeatMode } = state;
    if (queue.length === 0) return;
    
    const currentIndex = queue.findIndex(t => t.id === currentTrack?.id);
    let nextIndex: number;
    
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = currentIndex + 1;
      // If we've reached the end
      if (nextIndex >= queue.length) {
        if (repeatMode === "all") {
          nextIndex = 0; // Loop back to start
        } else {
          return; // Stop at end
        }
      }
    }
    
    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      play(nextTrack);
    }
  }, [state, play]);

  // Update the ref whenever next changes
  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  const previous = useCallback(() => {
    const { queue, currentTrack, progress } = state;
    
    // If more than 3 seconds in, restart the track
    if (progress > 3) {
      seek(0);
      return;
    }
    
    if (queue.length === 0) return;
    
    const currentIndex = queue.findIndex(t => t.id === currentTrack?.id);
    const prevIndex = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
    const prevTrack = queue[prevIndex];
    
    if (prevTrack) {
      play(prevTrack);
    }
  }, [state, play, seek]);

  const playTrack = useCallback((track: Track, queue?: Track[]) => {
    if (queue) {
      setQueue(queue);
    }
    play(track);
  }, [play, setQueue]);

  // Update media session whenever track or playing state changes
  useEffect(() => {
    updateMediaSession(state.currentTrack, state.isPlaying, {
      onPlay: () => play(),
      onPause: pause,
      onNext: next,
      onPrevious: previous,
      onSeek: seek,
    });
  }, [state.currentTrack, state.isPlaying, play, pause, next, previous, seek]);

  const value: PlayerContextType = {
    ...state,
    play,
    pause,
    toggle,
    next,
    previous,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    setQueue,
    addToQueue,
    playTrack,
    audioElement: audioRef.current,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
}