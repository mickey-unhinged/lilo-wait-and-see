import type { Track } from "@/contexts/PlayerContext";

const STORAGE_KEY = "lilo-playlist-streams";
const EVENT_NAME = "playlist-streams-updated";

interface StoredPlaylistStreams {
  [playlistId: string]: {
    track: Track;
    addedAt: string;
  }[];
}

function isBrowser() {
  return typeof window !== "undefined";
}

function readStorage(): StoredPlaylistStreams {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn("Failed to read playlist streams from storage:", error);
    return {};
  }
}

function writeStorage(data: StoredPlaylistStreams) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("Failed to persist playlist streams:", error);
  }
}

function dispatchUpdate(playlistId?: string) {
  if (!isBrowser()) return;
  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, {
      detail: { playlistId },
    })
  );
}

export function getPlaylistStreamTracks(playlistId: string): Track[] {
  const data = readStorage();
  return data[playlistId]?.map((entry) => entry.track) || [];
}

export function addStreamTrackToPlaylist(playlistId: string, track: Track) {
  const data = readStorage();
  const existing = data[playlistId] || [];
  const withoutDuplicate = existing.filter((entry) => entry.track.id !== track.id);
  data[playlistId] = [{ track, addedAt: new Date().toISOString() }, ...withoutDuplicate];
  writeStorage(data);
  dispatchUpdate(playlistId);
}

export function removeStreamTrackFromPlaylist(playlistId: string, trackId: string) {
  const data = readStorage();
  if (!data[playlistId]) return;
  data[playlistId] = data[playlistId].filter((entry) => entry.track.id !== trackId);
  writeStorage(data);
  dispatchUpdate(playlistId);
}

export function onPlaylistStreamsUpdated(callback: (playlistId?: string) => void) {
  if (!isBrowser()) return () => undefined;
  const handler = ((event: Event) => {
    const custom = event as CustomEvent<{ playlistId?: string }>;
    callback(custom.detail?.playlistId);
  }) as EventListener;

  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

