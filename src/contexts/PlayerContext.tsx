import { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from "react";

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
  children: ReactNode;
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    queue: [],
    isPlaying: false,
    progress: 0,
    duration: 0,
    volume: 0.8,
    isShuffle: false,
    repeatMode: "off",
    isLoading: false,
  });

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = state.volume;
    
    const audio = audioRef.current;
    
    const handleTimeUpdate = () => {
      setState(prev => ({
        ...prev,
        progress: audio.currentTime,
        duration: audio.duration || 0,
      }));
    };
    
    const handleLoadedMetadata = () => {
      setState(prev => ({
        ...prev,
        duration: audio.duration,
        isLoading: false,
      }));
    };
    
    const handleEnded = () => {
      // Handle track end based on repeat mode
      setState(prev => {
        if (prev.repeatMode === "one") {
          audio.currentTime = 0;
          audio.play();
          return prev;
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

  const play = useCallback((track?: Track) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (track) {
      setState(prev => ({ ...prev, currentTrack: track, isLoading: true }));
      
      // Use audio_url if available, otherwise use a demo audio
      const audioUrl = track.audio_url || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
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
    setState(prev => ({ ...prev, isPlaying: false }));
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
    const { queue, currentTrack, isShuffle } = state;
    if (queue.length === 0) return;
    
    const currentIndex = queue.findIndex(t => t.id === currentTrack?.id);
    let nextIndex: number;
    
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = (currentIndex + 1) % queue.length;
    }
    
    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      play(nextTrack);
    }
  }, [state, play]);

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
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
}
