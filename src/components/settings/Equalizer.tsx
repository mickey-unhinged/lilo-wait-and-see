import { useState, useEffect, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import { audioEffects, EqualizerBandConfig } from "@/lib/equalizer";

interface EqualizerBand {
  frequency: number;
  gain: number;
  label: string;
}

const DEFAULT_BANDS: EqualizerBand[] = [
  { frequency: 60, gain: 0, label: "60" },
  { frequency: 170, gain: 0, label: "170" },
  { frequency: 310, gain: 0, label: "310" },
  { frequency: 600, gain: 0, label: "600" },
  { frequency: 1000, gain: 0, label: "1K" },
  { frequency: 3000, gain: 0, label: "3K" },
  { frequency: 6000, gain: 0, label: "6K" },
  { frequency: 12000, gain: 0, label: "12K" },
  { frequency: 14000, gain: 0, label: "14K" },
  { frequency: 16000, gain: 0, label: "16K" },
];

const PRESETS = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bass: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  treble: [0, 0, 0, 0, 0, 2, 4, 5, 6, 6],
  vocal: [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1],
  electronic: [5, 4, 1, 0, -2, 2, 1, 4, 5, 5],
  rock: [5, 4, 2, 0, -1, 1, 3, 4, 5, 5],
  acoustic: [4, 3, 1, 1, 2, 2, 3, 3, 3, 2],
};

const EQ_STORAGE_KEY = "lilo-equalizer-settings";

export function Equalizer() {
  const { audioElement } = usePlayer();
  const [bands, setBands] = useState<EqualizerBand[]>(() => {
    // Try to load saved settings
    try {
      const saved = localStorage.getItem(EQ_STORAGE_KEY);
      if (saved) {
        const { bands: savedBands, preset } = JSON.parse(saved);
        if (savedBands) return savedBands;
      }
    } catch (error) {
      console.warn("Failed to load saved equalizer bands:", error);
    }
    return DEFAULT_BANDS;
  });
  const [selectedPreset, setSelectedPreset] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(EQ_STORAGE_KEY);
      if (saved) {
        const { preset } = JSON.parse(saved);
        return preset || "flat";
      }
    } catch (error) {
      console.warn("Failed to load saved equalizer preset:", error);
    }
    return "flat";
  });
  const [isEnabled, setIsEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem(EQ_STORAGE_KEY);
      if (saved) {
        const { enabled } = JSON.parse(saved);
        return enabled !== false;
      }
    } catch (error) {
      console.warn("Failed to load equalizer toggle state:", error);
    }
    return true;
  });
  const [eqError, setEqError] = useState<string | null>(null);

  // Save settings whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(EQ_STORAGE_KEY, JSON.stringify({
        bands,
        preset: selectedPreset,
        enabled: isEnabled,
      }));
    } catch (error) {
      console.warn("Failed to persist equalizer settings:", error);
    }
  }, [bands, selectedPreset, isEnabled]);

  // Initialize EQ with audio effects manager
  useEffect(() => {
    if (!audioElement) return;
    try {
      audioEffects.attachAudioElement(audioElement);
      audioEffects.setEqualizer(
        bands.map(({ frequency, gain }) => ({ frequency, gain })) as EqualizerBandConfig[],
        isEnabled
      );
      setEqError(null);
    } catch (error) {
      console.error("Failed to initialize equalizer:", error);
      setEqError("Equalizer isn't available for this track.");
    }
  }, [audioElement, bands, isEnabled]);

  const handleBandChange = useCallback((index: number, value: number) => {
    setBands((prev) =>
      prev.map((band, i) => (i === index ? { ...band, gain: value } : band))
    );
    setSelectedPreset("custom");
  }, []);

  const applyPreset = useCallback((presetName: keyof typeof PRESETS) => {
    const presetValues = PRESETS[presetName];
    setBands((prev) =>
      prev.map((band, i) => ({ ...band, gain: presetValues[i] || 0 }))
    );
    setSelectedPreset(presetName);
  }, []);

  const resetEQ = useCallback(() => {
    applyPreset("flat");
  }, [applyPreset]);

  return (
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <span className="font-medium">Equalizer</span>
        <Button
          variant={isEnabled ? "default" : "outline"}
          size="sm"
          onClick={() => setIsEnabled(!isEnabled)}
        >
          {isEnabled ? "On" : "Off"}
        </Button>
      </div>

      {!audioElement && (
        <p className="text-sm text-muted-foreground bg-card/50 p-3 rounded-lg">
          Play a song to activate the equalizer
        </p>
      )}

      {eqError && (
        <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 px-3 py-2 rounded-lg">
          {eqError}
        </p>
      )}

      {/* Presets */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Presets</p>
        <div className="flex flex-wrap gap-2">
          {Object.keys(PRESETS).map((preset) => (
            <Button
              key={preset}
              variant={selectedPreset === preset ? "default" : "outline"}
              size="sm"
              onClick={() => applyPreset(preset as keyof typeof PRESETS)}
              className="capitalize text-xs"
            >
              {preset}
            </Button>
          ))}
        </div>
      </div>

      {/* EQ Bands */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Frequency bands</p>
          <Button variant="ghost" size="sm" onClick={resetEQ}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>
        
        <div className="flex justify-between gap-1">
          {bands.map((band, index) => (
            <div key={band.frequency} className="flex flex-col items-center gap-2">
              <div className="h-32 flex items-center">
                <Slider
                  orientation="vertical"
                  value={[band.gain]}
                  onValueChange={([value]) => handleBandChange(index, value)}
                  min={-12}
                  max={12}
                  step={0.5}
                  className="h-full"
                  disabled={!isEnabled}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{band.label}</span>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between text-[10px] text-muted-foreground px-2">
          <span>+12dB</span>
          <span>0dB</span>
          <span>-12dB</span>
        </div>
      </div>
    </div>
  );
}