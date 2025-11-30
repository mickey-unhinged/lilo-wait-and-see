import { useState, useEffect, useCallback } from "react";

const DB_NAME = "lilo-offline-music";
const DB_VERSION = 1;
const TRACKS_STORE = "tracks";
const AUDIO_STORE = "audio";

export interface OfflineTrack {
  id: string;
  title: string;
  artist_name: string;
  cover_url?: string;
  album_cover?: string;
  duration_ms: number;
  videoId?: string;
  downloadedAt: string;
  size?: number;
}

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(TRACKS_STORE)) {
        db.createObjectStore(TRACKS_STORE, { keyPath: "id" });
      }
      
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE, { keyPath: "id" });
      }
    };
  });
}

export function useOfflineMusic() {
  const [downloads, setDownloads] = useState<OfflineTrack[]>([]);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Load downloaded tracks on mount
  useEffect(() => {
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(TRACKS_STORE, "readonly");
      const store = tx.objectStore(TRACKS_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => {
        setDownloads(request.result || []);
        setIsLoading(false);
      };
      
      request.onerror = () => {
        console.error("Failed to load downloads");
        setIsLoading(false);
      };
    } catch (error) {
      console.error("Failed to open database:", error);
      setIsLoading(false);
    }
  };

  const downloadTrack = useCallback(async (
    track: {
      id: string;
      title: string;
      artist_name: string;
      cover_url?: string;
      album_cover?: string;
      duration_ms: number;
      videoId?: string;
      audio_url?: string;
    },
    getAudioUrl?: () => Promise<string | null>
  ): Promise<boolean> => {
    if (downloading.has(track.id)) return false;
    
    setDownloading(prev => new Set(prev).add(track.id));
    
    try {
      let audioUrl = track.audio_url;
      
      // Get audio URL if not provided
      if (!audioUrl && getAudioUrl) {
        audioUrl = await getAudioUrl() || undefined;
      }
      
      if (!audioUrl) {
        console.error("No audio URL available for download");
        return false;
      }
      
      // Fetch the audio data
      const response = await fetch(audioUrl);
      if (!response.ok) throw new Error("Failed to fetch audio");
      
      const audioBlob = await response.blob();
      
      const db = await openDB();
      
      // Save track metadata
      const trackData: OfflineTrack = {
        id: track.id,
        title: track.title,
        artist_name: track.artist_name,
        cover_url: track.cover_url,
        album_cover: track.album_cover,
        duration_ms: track.duration_ms,
        videoId: track.videoId,
        downloadedAt: new Date().toISOString(),
        size: audioBlob.size,
      };
      
      const tx1 = db.transaction(TRACKS_STORE, "readwrite");
      tx1.objectStore(TRACKS_STORE).put(trackData);
      
      // Save audio blob
      const tx2 = db.transaction(AUDIO_STORE, "readwrite");
      tx2.objectStore(AUDIO_STORE).put({ id: track.id, blob: audioBlob });
      
      await Promise.all([
        new Promise((resolve, reject) => {
          tx1.oncomplete = resolve;
          tx1.onerror = () => reject(tx1.error);
        }),
        new Promise((resolve, reject) => {
          tx2.oncomplete = resolve;
          tx2.onerror = () => reject(tx2.error);
        }),
      ]);
      
      setDownloads(prev => [...prev.filter(d => d.id !== track.id), trackData]);
      return true;
    } catch (error) {
      console.error("Download failed:", error);
      return false;
    } finally {
      setDownloading(prev => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
    }
  }, [downloading]);

  const removeDownload = useCallback(async (trackId: string): Promise<boolean> => {
    try {
      const db = await openDB();
      
      const tx1 = db.transaction(TRACKS_STORE, "readwrite");
      tx1.objectStore(TRACKS_STORE).delete(trackId);
      
      const tx2 = db.transaction(AUDIO_STORE, "readwrite");
      tx2.objectStore(AUDIO_STORE).delete(trackId);
      
      await Promise.all([
        new Promise((resolve, reject) => {
          tx1.oncomplete = resolve;
          tx1.onerror = () => reject(tx1.error);
        }),
        new Promise((resolve, reject) => {
          tx2.oncomplete = resolve;
          tx2.onerror = () => reject(tx2.error);
        }),
      ]);
      
      setDownloads(prev => prev.filter(d => d.id !== trackId));
      return true;
    } catch (error) {
      console.error("Failed to remove download:", error);
      return false;
    }
  }, []);

  const getOfflineAudioUrl = useCallback(async (trackId: string): Promise<string | null> => {
    try {
      const db = await openDB();
      const tx = db.transaction(AUDIO_STORE, "readonly");
      const store = tx.objectStore(AUDIO_STORE);
      
      return new Promise((resolve) => {
        const request = store.get(trackId);
        request.onsuccess = () => {
          if (request.result?.blob) {
            resolve(URL.createObjectURL(request.result.blob));
          } else {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }, []);

  const isDownloaded = useCallback((trackId: string): boolean => {
    return downloads.some(d => d.id === trackId);
  }, [downloads]);

  const isDownloading = useCallback((trackId: string): boolean => {
    return downloading.has(trackId);
  }, [downloading]);

  const getTotalSize = useCallback((): number => {
    return downloads.reduce((sum, d) => sum + (d.size || 0), 0);
  }, [downloads]);

  const clearAllDownloads = useCallback(async (): Promise<boolean> => {
    try {
      const db = await openDB();
      
      const tx1 = db.transaction(TRACKS_STORE, "readwrite");
      tx1.objectStore(TRACKS_STORE).clear();
      
      const tx2 = db.transaction(AUDIO_STORE, "readwrite");
      tx2.objectStore(AUDIO_STORE).clear();
      
      await Promise.all([
        new Promise((resolve, reject) => {
          tx1.oncomplete = resolve;
          tx1.onerror = () => reject(tx1.error);
        }),
        new Promise((resolve, reject) => {
          tx2.oncomplete = resolve;
          tx2.onerror = () => reject(tx2.error);
        }),
      ]);
      
      setDownloads([]);
      return true;
    } catch (error) {
      console.error("Failed to clear downloads:", error);
      return false;
    }
  }, []);

  return {
    downloads,
    downloading,
    isLoading,
    downloadTrack,
    removeDownload,
    getOfflineAudioUrl,
    isDownloaded,
    isDownloading,
    getTotalSize,
    clearAllDownloads,
    refreshDownloads: loadDownloads,
  };
}

// Singleton for use in PlayerContext
let offlineAudioCache: Map<string, string> = new Map();

export async function getOfflineAudioUrlDirect(trackId: string): Promise<string | null> {
  if (offlineAudioCache.has(trackId)) {
    return offlineAudioCache.get(trackId)!;
  }
  
  try {
    const db = await openDB();
    const tx = db.transaction(AUDIO_STORE, "readonly");
    const store = tx.objectStore(AUDIO_STORE);
    
    return new Promise((resolve) => {
      const request = store.get(trackId);
      request.onsuccess = () => {
        if (request.result?.blob) {
          const url = URL.createObjectURL(request.result.blob);
          offlineAudioCache.set(trackId, url);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function isTrackDownloaded(trackId: string): Promise<boolean> {
  try {
    const db = await openDB();
    const tx = db.transaction(TRACKS_STORE, "readonly");
    const store = tx.objectStore(TRACKS_STORE);
    
    return new Promise((resolve) => {
      const request = store.get(trackId);
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
