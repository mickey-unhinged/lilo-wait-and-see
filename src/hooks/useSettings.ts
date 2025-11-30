import { useState, useEffect, useCallback } from "react";

interface Settings {
  // Playback
  highQualityAudio: boolean;
  crossfade: boolean;
  gaplessPlayback: boolean;
  crossfadeDuration: number; // seconds
  volumeNormalization: boolean;
  
  // Notifications
  pushNotifications: boolean;
  emailUpdates: boolean;
  
  // Privacy
  personalizedRecommendations: boolean;
  shareListeningActivity: boolean;
  
  // Appearance
  darkMode: boolean;
  reduceMotion: boolean;
}

const defaultSettings: Settings = {
  highQualityAudio: false,
  crossfade: false,
  gaplessPlayback: true,
  crossfadeDuration: 2,
  volumeNormalization: false,
  pushNotifications: true,
  emailUpdates: false,
  personalizedRecommendations: true,
  shareListeningActivity: false,
  darkMode: true,
  reduceMotion: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    const stored = localStorage.getItem("lilo-settings");
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem("lilo-settings", JSON.stringify(settings));
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleSetting = useCallback(<K extends keyof Settings>(key: K) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return {
    settings,
    updateSetting,
    toggleSetting,
  };
}
