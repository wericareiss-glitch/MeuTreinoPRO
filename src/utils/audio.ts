class SoundManager {
  private muted: boolean = false;
  private audioCtx: AudioContext | null = null;

  constructor() {
    this.muted = false;
  }

  setMuted(val: boolean) {
    this.muted = val;
  }

  isMuted() {
    return this.muted;
  }

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  playBeep(frequency = 580, duration = 0.12) {
    if (this.muted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio playback failed
    }
  }

  playCelebration() {
    if (this.muted) return;
    try {
      setTimeout(() => this.playBeep(523.25, 0.15), 0);
      setTimeout(() => this.playBeep(659.25, 0.15), 150);
      setTimeout(() => this.playBeep(783.99, 0.25), 300);
      setTimeout(() => this.playBeep(1046.5, 0.4), 450);
    } catch {
      // Ignore
    }
  }

  vibrate(pattern: number | number[]) {
    try {
      if (typeof window !== 'undefined' && navigator && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore
    }
  }
}

export const soundManager = new SoundManager();
