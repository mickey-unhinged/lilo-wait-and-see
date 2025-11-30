declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export interface EqualizerBandConfig {
  frequency: number;
  gain: number;
}

const DEFAULT_BANDS: EqualizerBandConfig[] = [
  { frequency: 60, gain: 0 },
  { frequency: 170, gain: 0 },
  { frequency: 310, gain: 0 },
  { frequency: 600, gain: 0 },
  { frequency: 1000, gain: 0 },
  { frequency: 3000, gain: 0 },
  { frequency: 6000, gain: 0 },
  { frequency: 12000, gain: 0 },
  { frequency: 14000, gain: 0 },
  { frequency: 16000, gain: 0 },
];

class AudioEffectsManager {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private eqBands: EqualizerBandConfig[] = DEFAULT_BANDS;
  private eqEnabled = true;
  private normalizationEnabled = false;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private eqOutputNode: AudioNode | null = null;
  private eqDestination: AudioNode | null = null;
  private connectedElement: HTMLAudioElement | null = null;
  private active = false;
  private currentVolume = 0.8;

  private getContext() {
    if (this.audioContext) {
      if (this.audioContext.state === "suspended") {
        void this.audioContext.resume();
      }
      return this.audioContext;
    }

    const ContextClass = window.AudioContext || window.webkitAudioContext;
    if (!ContextClass) {
      throw new Error("Web Audio API is not supported in this browser.");
    }
    this.audioContext = new ContextClass();
    return this.audioContext;
  }

  async resume() {
    if (!this.audioContext) return false;
    if (this.audioContext.state === "running") return true;
    try {
      await this.audioContext.resume();
      return true;
    } catch (error) {
      console.warn("Failed to resume audio context", error);
      if (this.connectedElement) {
        this.connectedElement.muted = false;
      }
      return false;
    }
  }

  attachAudioElement(audioElement: HTMLAudioElement) {
    if (!audioElement) return;
    if (this.connectedElement === audioElement && this.active) return;

    try {
      const context = this.getContext();
      if (!context) {
        // If context creation fails, ensure element is not muted
        console.warn("Audio context creation failed, using direct playback");
        audioElement.muted = false;
        return;
      }

      if (!this.sourceNode) {
        this.sourceNode = context.createMediaElementSource(audioElement);
      }

      this.connectedElement = audioElement;
      
      // Build the audio graph first
      this.buildGraph();
      
      // Only mute if we successfully built the graph and it's connected
      if (this.masterGain && this.sourceNode) {
        this.connectedElement.muted = true;
        this.active = true;
        console.log("Web Audio API graph connected, audio element muted");
      } else {
        console.warn("Web Audio API graph not properly connected, keeping audio unmuted");
        this.connectedElement.muted = false;
        this.active = false;
      }
    } catch (error) {
      console.error("Audio effects failed to initialize:", error);
      this.active = false;
      // Ensure element is not muted if Web Audio API fails
      audioElement.muted = false;
    }
  }

  detach() {
    if (this.connectedElement) {
      this.connectedElement.muted = false;
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.audioContext = null;
    this.sourceNode = null;
    this.eqFilters = [];
    this.compressor = null;
    this.masterGain = null;
    this.eqOutputNode = null;
    this.eqDestination = null;
    this.connectedElement = null;
    this.active = false;
  }

  private buildGraph() {
    if (!this.audioContext || !this.sourceNode) return;

    this.disconnectGraph();
    this.eqFilters = this.eqBands.map((band, index) => {
      const filter = this.audioContext!.createBiquadFilter();
      filter.frequency.value = band.frequency;

      if (index === 0) {
        filter.type = "lowshelf";
      } else if (index === this.eqBands.length - 1) {
        filter.type = "highshelf";
      } else {
        filter.type = "peaking";
        filter.Q.value = 1.4;
      }

      return filter;
    });

    let currentNode: AudioNode = this.sourceNode;
    this.eqFilters.forEach((filter) => {
      currentNode.connect(filter);
      currentNode = filter;
    });

    this.eqOutputNode = currentNode;
    this.compressor = this.audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = this.currentVolume;

    this.updateRouting();
    this.updateFilterGains();
  }

  private disconnectGraph() {
    try {
      this.eqOutputNode?.disconnect();
    } catch (error) {
      console.warn("Failed to disconnect EQ output", error);
    }
    try {
      this.compressor?.disconnect();
    } catch (error) {
      console.warn("Failed to disconnect compressor", error);
    }
    try {
      this.masterGain?.disconnect();
    } catch (error) {
      console.warn("Failed to disconnect master gain", error);
    }
    this.eqDestination = null;
  }

  private updateRouting() {
    if (!this.eqOutputNode || !this.masterGain || !this.audioContext) {
      console.warn("Cannot update routing - missing nodes");
      return;
    }

    try {
      if (this.normalizationEnabled && this.compressor) {
        if (this.eqDestination !== this.compressor) {
          try {
            this.eqOutputNode.disconnect();
          } catch (error) {
            console.warn("Failed to reroute EQ output", error);
          }
          this.eqOutputNode.connect(this.compressor);
          this.eqDestination = this.compressor;
        }
        this.compressor.disconnect();
        this.compressor.connect(this.masterGain);
      } else {
        if (this.eqDestination !== this.masterGain) {
          try {
            this.eqOutputNode.disconnect();
          } catch (error) {
            console.warn("Failed to reroute EQ output", error);
          }
          this.eqOutputNode.connect(this.masterGain);
          this.eqDestination = this.masterGain;
        }
      }

      this.masterGain.disconnect();
      this.masterGain.connect(this.audioContext.destination);
    } catch (error) {
      console.error("Failed to update routing:", error);
      // If routing fails, disable Web Audio API
      this.active = false;
      if (this.connectedElement) {
        this.connectedElement.muted = false;
      }
    }
  }

  private updateFilterGains() {
    if (!this.eqFilters.length) return;
    this.eqFilters.forEach((filter, index) => {
      const band = this.eqBands[index];
      if (!band) return;
      filter.gain.value = this.eqEnabled ? band.gain : 0;
    });
  }

  isActive() {
    // Check if the graph is actually connected
    const isGraphConnected = this.active && 
                             !!this.masterGain && 
                             !!this.sourceNode && 
                             !!this.audioContext &&
                             this.audioContext.state === "running";
    return isGraphConnected;
  }

  setEqualizer(bands: EqualizerBandConfig[], enabled: boolean) {
    this.eqBands = bands;
    this.eqEnabled = enabled;
    if (!this.eqFilters.length || this.eqFilters.length !== bands.length) {
      this.buildGraph();
      return;
    }
    this.updateFilterGains();
  }

  setNormalization(enabled: boolean) {
    this.normalizationEnabled = enabled;
    this.updateRouting();
    if (this.connectedElement && !this.isActive()) {
      this.connectedElement.muted = false;
    }
  }

  setMasterVolume(volume: number) {
    this.currentVolume = volume;
    
    // Always update Web Audio API if available
    if (this.masterGain && this.audioContext) {
      try {
        this.masterGain.gain.cancelScheduledValues(this.audioContext.currentTime);
        this.masterGain.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.01);
      } catch (error) {
        console.error("Failed to set volume via Web Audio API:", error);
      }
    }
    
    // Also update direct element volume as backup
    if (this.connectedElement) {
      this.connectedElement.volume = volume;
      // Only keep muted if Web Audio API is actually working
      if (!this.isActive()) {
        this.connectedElement.muted = false;
      }
    }
  }

  async fadeTo(volume: number, duration: number, fallbackElement?: HTMLAudioElement | null) {
    if (this.masterGain && this.audioContext && duration > 0) {
      this.masterGain.gain.cancelScheduledValues(this.audioContext.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + duration);
      return new Promise<void>((resolve) => {
        setTimeout(resolve, duration * 1000);
      });
    }

    if (fallbackElement && duration > 0) {
      const start = fallbackElement.volume;
      const diff = volume - start;
      const steps = 20;
      const stepTime = (duration * 1000) / steps;
      return new Promise<void>((resolve) => {
        let currentStep = 0;
        const interval = setInterval(() => {
          currentStep += 1;
          fallbackElement.volume = Math.max(0, Math.min(1, start + (diff * currentStep) / steps));
          if (currentStep >= steps) {
            clearInterval(interval);
            resolve();
          }
        }, stepTime);
      });
    }

    return Promise.resolve();
  }
}

export const audioEffects = new AudioEffectsManager();
export const equalizerEngine = audioEffects;

