/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Screen Wake Lock API Helper
// Mantém a tela do celular ligada durante o treino ativo para não bloquear no bolso ou no banco

class ScreenWakeLockManager {
  private sentinel: any = null;
  private isRequested = false;

  async request(): Promise<boolean> {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }

    try {
      this.isRequested = true;
      this.sentinel = await (navigator as any).wakeLock.request('screen');
      
      this.sentinel.addEventListener('release', () => {
        // Se foi liberado pelo sistema (ex: troca de app), tenta readquirir se ainda estiver ativo
        this.sentinel = null;
        if (this.isRequested && document.visibilityState === 'visible') {
          this.request().catch(() => {});
        }
      });

      return true;
    } catch {
      return false;
    }
  }

  async release(): Promise<void> {
    this.isRequested = false;
    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch {}
      this.sentinel = null;
    }
  }

  // Readquire automaticamente quando o atleta volta ao navegador
  bindVisibilityListener(): () => void {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && this.isRequested && !this.sentinel) {
        this.request().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }
}

export const wakeLockManager = new ScreenWakeLockManager();
