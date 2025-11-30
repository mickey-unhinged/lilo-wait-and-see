import * as React from "react";
import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { audioEffects } from "@/lib/equalizer";
import { useSettings } from "@/hooks/useSettings";

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
  videoId?: string; // For video-enabled tracks
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
  const currentTrackRef = useRef<Track | null>(null);
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

  const [userId, setUserId] = useState<string | null>(null);
  const { settings } = useSettings();
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  const crossfadeDuration = settings.crossfade ? Math.max(0.5, settings.crossfadeDuration) : 0;

  // Reference to next function for the ended handler
  const nextRef = useRef<() => void>(() => {});

  // Track auth state for logging listening history
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.crossOrigin = "anonymous";
    audioRef.current.volume = 0.8;
    audioRef.current.muted = false; // Ensure not muted initially
    
    // Attach to audio effects
    audioEffects.attachAudioElement(audioRef.current);
    
    // Wait a bit to check if Web Audio API is actually working
    setTimeout(() => {
      if (audioRef.current) {
        const isActive = audioEffects.isActive();
        console.log("Audio initialization - Web Audio API active:", isActive);
        if (!isActive) {
          // If Web Audio API is not active, ensure element is not muted
          audioRef.current.muted = false;
          console.log("Web Audio API not active, ensuring audio element is not muted");
        }
      }
    }, 100);
    
    audioEffects.setMasterVolume(0.8);
    audioEffects.resume();
    
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
      const gapless = settingsRef.current.gaplessPlayback;
      setState(prev => {
        if (prev.repeatMode === "one") {
          audio.currentTime = 0;
          audio.play();
          return prev;
        }
        if (prev.queue.length > 0) {
          if (gapless) {
            nextRef.current();
            return prev;
          }
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
    if (!audioRef.current) return;
    
    // Always update volume through audioEffects (handles both Web Audio API and direct)
    audioEffects.setMasterVolume(state.volume);
    
    // Also ensure direct element volume is set as backup
    audioRef.current.volume = state.volume;
    
    // Only keep muted if Web Audio API is actually working and connected
    const isActive = audioEffects.isActive();
    if (!isActive) {
      audioRef.current.muted = false;
    }
  }, [state.volume]);

  useEffect(() => {
    audioEffects.setNormalization(settings.volumeNormalization);
  }, [settings.volumeNormalization]);

  useEffect(() => {
    currentTrackRef.current = state.currentTrack;
  }, [state.currentTrack]);

  // Restore track on mount if there was a saved state
  useEffect(() => {
    const saved = loadPlaybackState();
    if (saved?.track && audioRef.current) {
      let cancelled = false;
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
        
        if (cancelled) return;
        if (audioUrl && audioRef.current) {
          if (currentTrackRef.current && currentTrackRef.current.id !== saved.track.id) {
            return;
          }
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
      return () => {
        cancelled = true;
      };
    }
  }, []);

  const logListeningActivity = useCallback(async (track: Track | undefined) => {
    if (!userId || !track) return;
    try {
      await supabase
        .from("listening_activity")
        .upsert(
          {
            user_id: userId,
            track_id: track.id,
            track_title: track.title,
            track_artist: track.artist_name,
            track_cover: track.cover_url || track.album_cover || null,
            track_source: track.id?.startsWith("ytm-")
              ? "video"
              : track.id?.startsWith("itunes-")
                ? "preview"
                : "library",
            played_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
    } catch (err) {
      console.error("Failed to log listening activity:", err);
    }
  }, [userId]);

  const play = useCallback(async (track?: Track, options?: { skipFade?: boolean }) => {
    const audio = audioRef.current;
    if (!audio) {
      console.error("Audio element not initialized");
      return;
    }
    
    // Ensure audio context is resumed
    await audioEffects.resume();
    
    // CRITICAL: Always ensure audio is not muted unless Web Audio API is confirmed active
    const isAudioEffectsActive = audioEffects.isActive();
    if (!isAudioEffectsActive) {
      audio.muted = false;
      console.log("Web Audio API not active, using direct playback");
    }
    
    const shouldCrossfade = Boolean(
      track &&
      settings.crossfade &&
      crossfadeDuration > 0 &&
      state.isPlaying &&
      !options?.skipFade
    );
    
    if (shouldCrossfade) {
      await audioEffects.fadeTo(0, crossfadeDuration / 2, audio);
    }
    
    if (track) {
      console.log("Playing track:", track.title, "audio_url:", track.audio_url);
      setState(prev => ({ ...prev, currentTrack: track, isLoading: true }));
      logListeningActivity(track);
      
      // Save to play history
      saveToPlayHistory(track);
      
      let audioUrl = track.audio_url;
      
      // If it's a video-sourced track, fetch the audio URL
      if (track.videoId && !audioUrl) {
        try {
          const { data, error } = await supabase.functions.invoke("youtube-audio-stream", {
            body: { videoId: track.videoId },
          });
          
          if (error) throw error;
          audioUrl = data?.audioUrl;
        } catch (err) {
          console.error("Failed to get video audio URL:", err);
          setState(prev => ({ ...prev, isLoading: false, isPlaying: false }));
          return;
        }
      }
      
      // Use demo audio as fallback
      if (!audioUrl) {
        console.warn("No audio URL for track, using fallback:", track.title);
        audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
      }
      
      // Validate audio URL
      if (!audioUrl || audioUrl.trim() === "") {
        console.error("No valid audio URL for track:", track.title);
        setState(prev => ({ ...prev, isLoading: false, isPlaying: false }));
        return;
      }
      
      console.log("Setting audio source:", audioUrl);
      audio.src = audioUrl;
      audio.load();
      
      // Wait for audio to be ready before playing
      const playAudio = () => {
        console.log("Attempting to play audio. Muted:", audio.muted, "Volume:", audio.volume, "Web Audio Active:", isAudioEffectsActive);
        
        // CRITICAL: Set volume and unmute before playing
        if (isAudioEffectsActive) {
          // Use Web Audio API
          if (settings.crossfade && crossfadeDuration > 0 && track) {
            audioEffects.setMasterVolume(0);
          } else {
            audioEffects.setMasterVolume(state.volume);
          }
        } else {
          // Direct playback - ensure not muted and volume is set
          audio.muted = false;
          if (settings.crossfade && crossfadeDuration > 0 && track) {
            audio.volume = 0;
          } else {
            audio.volume = state.volume;
          }
        }
        
        console.log("Before play - muted:", audio.muted, "volume:", audio.volume, "src:", audio.src);
        
        audio.play().then(() => {
          console.log("Audio play() succeeded");
          setState(prev => ({ ...prev, isPlaying: true }));
          if (settings.crossfade && crossfadeDuration > 0 && track) {
            audioEffects.fadeTo(state.volume, crossfadeDuration / 2, audio);
          }
        }).catch(err => {
          console.error("Playback error:", err);
          setState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
          
          // Fallback: Force unmute and try again
          console.log("Attempting fallback playback");
          audio.muted = false;
          audio.volume = state.volume;
          audio.play().then(() => {
            console.log("Fallback playback succeeded");
            setState(prev => ({ ...prev, isPlaying: true }));
          }).catch(fallbackErr => {
            console.error("Fallback playback also failed:", fallbackErr);
          });
        });
      };
      
      // Wait for audio to be ready
      if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        playAudio();
      } else {
        const handleCanPlayThrough = () => {
          playAudio();
          audio.removeEventListener("canplaythrough", handleCanPlayThrough);
        };
        const handleCanPlay = () => {
          playAudio();
          audio.removeEventListener("canplay", handleCanPlay);
        };
        audio.addEventListener("canplaythrough", handleCanPlayThrough);
        audio.addEventListener("canplay", handleCanPlay);
        // Fallback timeout
        setTimeout(() => {
          audio.removeEventListener("canplaythrough", handleCanPlayThrough);
          audio.removeEventListener("canplay", handleCanPlay);
          if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            playAudio();
          } else {
            console.warn("Audio not ready after timeout, attempting to play anyway");
            playAudio();
          }
        }, 5000);
      }
    } else {
      // Resume playing current track
      // Ensure not muted
      if (!isAudioEffectsActive) {
        audio.muted = false;
      }
      audio.play().then(() => {
        setState(prev => ({ ...prev, isPlaying: true }));
      }).catch(err => {
        console.error("Playback error:", err);
        setState(prev => ({ ...prev, isPlaying: false }));
      });
    }
  }, [logListeningActivity, settings.crossfade, crossfadeDuration, state.isPlaying, state.volume]);

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
    // Clamp volume between 0 and 1
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setState(prev => ({ ...prev, volume: clampedVolume }));
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