class WakeLockManager {
  private wakeLock: WakeLockSentinel | null = null;

  async request() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch {
      // Wake lock request failed
    }
  }

  async release() {
    try {
      if (this.wakeLock) {
        await this.wakeLock.release();
        this.wakeLock = null;
      }
    } catch {
      // Release failed
    }
  }

  bindVisibilityListener() {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        await this.request();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }
}

export const wakeLockManager = new WakeLockManager();
