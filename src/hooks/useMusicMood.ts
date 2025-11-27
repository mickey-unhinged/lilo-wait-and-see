import { useState, useEffect } from "react";
import { Track } from "@/contexts/PlayerContext";

interface MoodData {
  mood: string;
  emoji: string;
  color: string;
  description: string;
}

const MOODS: MoodData[] = [
  { mood: "Energetic", emoji: "⚡", color: "hsl(45 100% 60%)", description: "Ready to conquer the day!" },
  { mood: "Chill", emoji: "🌊", color: "hsl(200 80% 60%)", description: "Taking it easy" },
  { mood: "Happy", emoji: "☀️", color: "hsl(50 100% 55%)", description: "Feeling great!" },
  { mood: "Focused", emoji: "🎯", color: "hsl(270 70% 60%)", description: "In the zone" },
  { mood: "Nostalgic", emoji: "💭", color: "hsl(30 60% 55%)", description: "Remembering good times" },
  { mood: "Romantic", emoji: "💕", color: "hsl(340 80% 65%)", description: "Love is in the air" },
  { mood: "Melancholic", emoji: "🌧️", color: "hsl(220 40% 50%)", description: "Feeling reflective" },
  { mood: "Party", emoji: "🎉", color: "hsl(320 90% 60%)", description: "Let's celebrate!" },
  { mood: "Peaceful", emoji: "🍃", color: "hsl(140 60% 50%)", description: "At ease" },
  { mood: "Adventurous", emoji: "🚀", color: "hsl(15 90% 55%)", description: "Ready for anything" },
];

const LOCAL_STORAGE_KEY = "lilo-play-history";

interface PlayHistoryEntry {
  track: Track;
  playedAt: string;
}

function analyzeMood(entries: PlayHistoryEntry[]): MoodData {
  // Get recent plays (last 24 hours)
  const now = new Date();
  const recentEntries = entries.filter((e) => {
    const playedAt = new Date(e.playedAt);
    const hoursDiff = (now.getTime() - playedAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
  });

  if (recentEntries.length === 0) {
    return MOODS[0]; // Default to Energetic
  }

  // Simple mood detection based on track count and time patterns
  const hour = now.getHours();
  const trackCount = recentEntries.length;

  // Night time (10pm - 6am) -> Chill or Peaceful
  if (hour >= 22 || hour < 6) {
    return trackCount > 5 ? MOODS[1] : MOODS[8]; // Chill or Peaceful
  }

  // Morning (6am - 10am) -> Energetic or Focused
  if (hour >= 6 && hour < 10) {
    return trackCount > 3 ? MOODS[0] : MOODS[3]; // Energetic or Focused
  }

  // Afternoon (10am - 5pm) -> Happy or Focused
  if (hour >= 10 && hour < 17) {
    return trackCount > 10 ? MOODS[7] : MOODS[2]; // Party or Happy
  }

  // Evening (5pm - 10pm) -> Various based on activity
  if (trackCount > 15) {
    return MOODS[7]; // Party
  } else if (trackCount > 8) {
    return MOODS[0]; // Energetic
  } else if (trackCount > 3) {
    return MOODS[2]; // Happy
  }

  return MOODS[1]; // Chill
}

export function useMusicMood() {
  const [moodData, setMoodData] = useState<MoodData>(MOODS[0]);
  const [recentTrackCount, setRecentTrackCount] = useState(0);

  useEffect(() => {
    const updateMood = () => {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const entries: PlayHistoryEntry[] = JSON.parse(stored);
          const mood = analyzeMood(entries);
          setMoodData(mood);
          
          // Count tracks in last 24 hours
          const now = new Date();
          const recentCount = entries.filter((e) => {
            const playedAt = new Date(e.playedAt);
            const hoursDiff = (now.getTime() - playedAt.getTime()) / (1000 * 60 * 60);
            return hoursDiff < 24;
          }).length;
          setRecentTrackCount(recentCount);
        }
      } catch (e) {
        console.error("Failed to analyze mood:", e);
      }
    };

    updateMood();
    
    // Update every minute
    const interval = setInterval(updateMood, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return { ...moodData, recentTrackCount };
}
