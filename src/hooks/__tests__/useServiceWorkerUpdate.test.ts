import { describe, it, expect } from 'vitest';
import manifestData from '../../../public/manifest.json';

describe('PWA Manifest & Service Worker Specifications', () => {
  it('manifest.json has all required PWA fields', () => {
    expect(manifestData.id).toBe('/');
    expect(manifestData.name).toBe('MeuTreino Pro');
    expect(manifestData.short_name).toBe('MeuTreino');
    expect(manifestData.short_name.length).toBeLessThanOrEqual(12);
    expect(manifestData.start_url).toBe('/');
    expect(manifestData.scope).toBe('/');
    expect(manifestData.display).toBe('standalone');
    expect(manifestData.theme_color).toBe('#0d1424');
    expect(manifestData.background_color).toBe('#0d1424');
  });

  it('manifest.json includes standard 192px and 512px icons with purpose any and maskable', () => {
    const icons = manifestData.icons;
    expect(Array.isArray(icons)).toBe(true);
    expect(icons.length).toBeGreaterThanOrEqual(4);

    const icon192 = icons.find((i) => i.sizes === '192x192' && i.purpose === 'any');
    const icon512 = icons.find((i) => i.sizes === '512x512' && i.purpose === 'any');
    const iconMaskable = icons.find((i) => i.sizes === '512x512' && i.purpose === 'maskable');

    expect(icon192).toBeDefined();
    expect(icon512).toBeDefined();
    expect(iconMaskable).toBeDefined();
  });

  it('manifest.json specifies shortcuts for quick workout navigation', () => {
    const shortcuts = manifestData.shortcuts;
    expect(Array.isArray(shortcuts)).toBe(true);
    expect(shortcuts.length).toBeGreaterThanOrEqual(3);

    const workoutShortcut = shortcuts.find((s) => s.url.includes('start-workout'));
    expect(workoutShortcut).toBeDefined();
    expect(workoutShortcut?.name).toBe('Iniciar Treino Rápido');
  });

  it('sw.js exists and implements Stale-While-Revalidate and cache versioning', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const swPath = path.resolve(process.cwd(), 'public/sw.js');
    expect(fs.existsSync(swPath)).toBe(true);

    const swContent = fs.readFileSync(swPath, 'utf-8');
    expect(swContent).toContain('staleWhileRevalidate');
    expect(swContent).toContain('SW_VERSION');
    expect(swContent).toContain('PRECACHE_ASSETS');
    expect(swContent).toContain('SKIP_WAITING');
    expect(swContent).toContain('handleNavigation');
  });
});

