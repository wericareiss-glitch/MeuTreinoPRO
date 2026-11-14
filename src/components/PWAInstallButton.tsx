import React, { useState } from 'react';
import { Download, Smartphone, X, Check, Share2, ExternalLink } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useI18n } from '../utils/i18n';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  className = '', 
  variant = 'compact' 
}) => {
  const { t } = useI18n();
  const { isInstallable, isInstalled, isIOS, isAndroid, isInIframe, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showBrowserGuide, setShowBrowserGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already running as an installed standalone app, hide
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 3000);
        return;
      }
    }
    if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setShowBrowserGuide(true);
    }
  };

  return (
    <>
      {installSuccess ? (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
          <Check className="w-3.5 h-3.5" />
          <span>{t.nav.appInstalled}</span>
        </div>
      ) : variant === 'full' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer ${className}`}
        >
          <Smartphone className="w-4 h-4" />
          <span>{t.nav.installAppBtn}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs transition-all cursor-pointer active:scale-95 ${className}`}
          title={t.nav.installAppTitle}
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden xs:inline">{t.nav.installAppShort}</span>
        </button>
      )}

      {/* iOS Safari Guided Installation Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f172a] border border-slate-700 rounded-3xl w-full max-w-sm p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>{t.nav.installIosTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-start gap-2.5 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  {t.nav.installIosStep1} <Share2 className="w-3 h-3 inline text-sky-400" />
                </p>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <p>{t.nav.installIosStep2}</p>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  3
                </span>
                <p>{t.nav.installIosStep3}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            >
              {t.common.understood}
            </button>
          </div>
        </div>
      )}

      {/* Android / Browser / Desktop Guided Installation Modal */}
      {showBrowserGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f172a] border border-slate-700 rounded-3xl w-full max-w-sm p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>{isAndroid ? t.nav.installAndroidTitle : t.nav.installDesktopTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowBrowserGuide(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              {isInIframe && (
                <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/35 text-amber-200 space-y-2">
                  <p className="font-semibold">💡 {t.nav.installIframeTip}</p>
                  <p className="text-[11px] text-amber-100/90">{t.nav.installIframeDesc}</p>
                  <a
                    href={typeof window !== 'undefined' ? window.location.href : '/'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl font-black text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-1.5 shadow-md transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{t.nav.openNewTab}</span>
                  </a>
                </div>
              )}

              <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <p>{t.nav.installAndroidStep}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <p>
                    {t.nav.installDesktopStep} <Download className="w-3.5 h-3.5 inline text-emerald-400 mx-0.5" />
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowBrowserGuide(false)}
              className="mt-4 w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer"
            >
              {t.common.understood}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
