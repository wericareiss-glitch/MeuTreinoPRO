/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioClass) {
        this.ctx = new AudioClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playTone(freq: number, duration: number = 0.12, type: OscillatorType = 'sine') {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio playback fails silently in case of unsupported policy
    }
  }

  public playTimerFinish() {
    this.playTone(880, 0.25);
    setTimeout(() => {
      this.playTone(1100, 0.4);
    }, 180);
  }

  public playCelebration() {
    // Victorious fanfare (C5, E5, G5, C6)
    this.playTone(523.25, 0.12, 'triangle');
    setTimeout(() => this.playTone(659.25, 0.12, 'triangle'), 110);
    setTimeout(() => this.playTone(783.99, 0.15, 'triangle'), 220);
    setTimeout(() => this.playTone(1046.50, 0.45, 'triangle'), 340);
  }

  public playWarningBeep() {
    this.playTone(480, 0.08);
  }

  public playCountdownBeep(secondsRemaining: number) {
    if (this.isMuted) return;
    if (secondsRemaining === 3) {
      this.playTone(440, 0.1, 'sine');
      this.vibrate(40);
    } else if (secondsRemaining === 2) {
      this.playTone(554.37, 0.1, 'sine');
      this.vibrate(45);
    } else if (secondsRemaining === 1) {
      this.playTone(659.25, 0.12, 'sine');
      this.vibrate(55);
    }
  }

  public vibrateSetComplete() {
    this.vibrate([60, 40, 90]);
  }

  public vibrate(pattern: number | number[]) {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Safe fallback if vibration permissions rejected
      }
    }
  }
}

export const soundManager = new SoundManager();
