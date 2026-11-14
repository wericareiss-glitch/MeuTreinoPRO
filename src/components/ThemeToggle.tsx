/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sun, Moon, Monitor, CheckCircle2, Lock, Sparkles, Palette } from 'lucide-react';
import { useTheme, ACCENT_PALETTES, AccentColor, Theme } from '../utils/theme';
import { useI18n } from '../utils/i18n';

interface ThemeToggleProps {
  variant?: 'compact' | 'full' | 'segmented' | 'profile-card';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { t } = useI18n();
  const {
    theme,
    accentColor,
    isDark,
    isOled,
    isSystem,
    isAutoDetectDisabled,
    toggleTheme,
    setTheme,
    setAccentColor,
    setSystemTheme,
  } = useTheme();
  const [justSaved, setJustSaved] = useState(false);

  const handleForceTheme = (target: Theme) => {
    setTheme(target);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  };

  const handleSelectAccent = (targetAccent: AccentColor) => {
    setAccentColor(targetAccent);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  };

  const handleToggleForce = () => {
    toggleTheme();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  };

  if (variant === 'profile-card') {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Linha principal: Botão de Alternância Rápida (Dark / Light) + Seletor Direto */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a101d] p-4 rounded-2xl border border-slate-800">
          <div className="flex items-start gap-3">
            <div
              className={`p-3 rounded-2xl border shrink-0 transition-colors ${
                isOled
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35'
                  : isDark
                  ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                  : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
              }`}
            >
              {isDark ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">
                  {isOled
                    ? t.theme.modeOledActive
                    : isDark
                    ? t.theme.modeDarkActive
                    : t.theme.modeLightActive}
                </h3>
                {isAutoDetectDisabled ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <Lock className="w-3 h-3" />
                    <span>{t.theme.fixedBadge}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    <Monitor className="w-3 h-3" />
                    <span>{t.theme.autoBadge}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {isAutoDetectDisabled ? t.theme.fixedDesc : t.theme.autoDesc}
              </p>
            </div>
          </div>

          {/* Botão Principal de Alternância (Switch Dark/Light) */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleForce}
              className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-md ${
                isDark
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/20'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-500/20'
              }`}
              title={t.theme.toggleTitle}
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 stroke-[2.5]" />
                  <span>{t.theme.switchToLight}</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 stroke-[2.5]" />
                  <span>{t.theme.switchToDark}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Botões de seleção explícita para Forçar Dark, Dark OLED Absoluto ou Forçar Light */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => handleForceTheme('dark')}
            aria-pressed={!isSystem && theme === 'dark'}
            className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
              !isSystem && theme === 'dark'
                ? 'bg-sky-500/15 border-sky-500/50 text-white shadow-md'
                : 'bg-[#0a101d] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`p-2 rounded-xl shrink-0 ${!isSystem && theme === 'dark' ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-sky-400'}`}>
                <Moon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black block text-white truncate">{t.theme.darkLabel}</span>
                <span className="text-[10px] text-slate-400 block truncate">{t.theme.darkSub}</span>
              </div>
            </div>
            {!isSystem && theme === 'dark' && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500 text-slate-950 shrink-0">
                {t.theme.activeBadge}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleForceTheme('oled')}
            aria-pressed={!isSystem && theme === 'oled'}
            className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
              !isSystem && theme === 'oled'
                ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-md'
                : 'bg-[#0a101d] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  !isSystem && theme === 'oled'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-black border border-slate-700 text-emerald-400 theme-preserve-dark-swatch'
                }`}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black block text-white truncate">{t.theme.oledLabel}</span>
                <span className="text-[10px] text-slate-400 block truncate">{t.theme.oledSub}</span>
              </div>
            </div>
            {!isSystem && theme === 'oled' && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 shrink-0">
                {t.theme.activeBadge}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleForceTheme('light')}
            aria-pressed={!isSystem && theme === 'light'}
            className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
              !isSystem && theme === 'light'
                ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-md'
                : 'bg-[#0a101d] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`p-2 rounded-xl shrink-0 ${!isSystem && theme === 'light' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-amber-400'}`}>
                <Sun className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black block text-white truncate">{t.theme.lightLabel}</span>
                <span className="text-[10px] text-slate-400 block truncate">{t.theme.lightSub}</span>
              </div>
            </div>
            {!isSystem && theme === 'light' && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 shrink-0">
                {t.theme.pinnedBadge}
              </span>
            )}
          </button>
        </div>

        {/* Paletas de Destaque Personalizadas */}
        <div className="bg-[#0a101d] p-4 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-wider text-white">
                {t.theme.paletteTitle}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {t.theme.paletteHint}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ACCENT_PALETTES.map((pal) => {
              const isSelected = accentColor === pal.id;
              const translatedPal = t.theme.palettes[pal.id];
              return (
                <button
                  key={pal.id}
                  type="button"
                  onClick={() => handleSelectAccent(pal.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-slate-900 border-emerald-500/60 ring-1 ring-emerald-500/30 text-white shadow-md'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full shrink-0 border border-white/20 shadow-sm"
                    style={{ backgroundColor: pal.previewHex }}
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-black block text-white truncate">
                      {translatedPal?.label || pal.label}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {translatedPal?.subtitle || pal.subtitle}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rodapé informativo e opção secundária de sistema */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
          {justSaved ? (
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{t.theme.savedToast}</span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">
              {t.theme.currentModeLabel}{' '}
              <strong className="text-white">
                {isAutoDetectDisabled
                  ? isOled
                    ? t.theme.modeOledName
                    : isDark
                    ? t.theme.modeDarkName
                    : t.theme.modeLightName
                  : t.theme.modeAutoDevice}
              </strong>
            </span>
          )}

          {isAutoDetectDisabled && (
            <button
              type="button"
              onClick={setSystemTheme}
              className="text-[11px] font-semibold text-slate-400 hover:text-emerald-400 underline underline-offset-2 self-start sm:self-auto cursor-pointer transition-colors"
            >
              {t.theme.restoreAutoBtn}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'segmented') {
    return (
      <div
        className={`flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 transition-colors ${className}`}
        role="group"
        aria-label={t.theme.fullTitle}
      >
        <button
          type="button"
          onClick={() => handleForceTheme('dark')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            !isSystem && isDark
              ? 'bg-emerald-500 text-slate-950 font-black shadow-sm border border-emerald-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-pressed={!isSystem && isDark}
          title={t.theme.switchToDark}
        >
          <Moon className={`w-3.5 h-3.5 ${!isSystem && isDark ? 'text-slate-950' : 'text-sky-400'}`} />
          <span>{t.theme.segmentedDark}</span>
        </button>
        <button
          type="button"
          onClick={() => handleForceTheme('light')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            !isSystem && !isDark
              ? 'bg-emerald-500 text-slate-950 font-black shadow-sm border border-emerald-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-pressed={!isSystem && !isDark}
          title={t.theme.switchToLight}
        >
          <Sun className={`w-3.5 h-3.5 ${!isSystem && !isDark ? 'text-slate-950' : 'text-amber-500'}`} />
          <span>{t.theme.segmentedLight}</span>
        </button>
        <button
          type="button"
          onClick={setSystemTheme}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            isSystem
              ? 'bg-slate-700 text-white font-black shadow-sm border border-slate-600'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-pressed={isSystem}
          title={t.theme.restoreAutoBtn}
        >
          <Monitor className={`w-3.5 h-3.5 ${isSystem ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span>{t.theme.segmentedAuto}</span>
        </button>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors hover:bg-slate-800/60 ${className}`}>
        <button
          type="button"
          onClick={handleToggleForce}
          className="flex items-center gap-2.5 flex-1 text-left cursor-pointer"
          aria-label={isDark ? t.theme.switchToLight : t.theme.switchToDark}
          title={isDark ? t.theme.switchToLight : t.theme.switchToDark}
        >
          {isDark ? (
            <Moon className="w-4 h-4 text-sky-400 shrink-0" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500 shrink-0" />
          )}
          <div>
            <span className="block font-bold text-white">{t.theme.fullTitle}</span>
            <span className="block text-[10px] text-slate-400">
              {isDark ? t.theme.fullSubDark : t.theme.fullSubLight}
              {isSystem ? ` • ${t.theme.fullAutoSuffix}` : ` • ${t.theme.fullFixedSuffix}`}
            </span>
          </div>
        </button>
        <div className="flex items-center gap-1">
          {!isSystem && (
            <button
              type="button"
              onClick={setSystemTheme}
              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border bg-slate-800/80 text-slate-400 hover:text-emerald-400 border-slate-700 cursor-pointer transition-colors"
              title={t.theme.restoreAutoBtn}
            >
              {t.theme.segmentedAuto}
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleForce}
            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border bg-slate-800 text-slate-300 border-slate-700 cursor-pointer"
          >
            {isSystem
              ? `${t.theme.segmentedAuto} (${isDark ? t.theme.segmentedDark : t.theme.segmentedLight})`
              : isDark
              ? t.theme.darkFixedChip
              : t.theme.lightFixedChip}
          </button>
        </div>
      </div>
    );
  }

  // Compact variant (icon button for Header and quick bars)
  return (
    <button
      type="button"
      onClick={handleToggleForce}
      className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center active:scale-95 ${
        isDark
          ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700 hover:border-slate-600'
          : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-300 shadow-sm'
      } ${className}`}
      aria-label={isDark ? t.theme.switchToLight : t.theme.switchToDark}
      title={
        isSystem
          ? isDark
            ? t.theme.compactTitleAutoDark
            : t.theme.compactTitleAutoLight
          : isDark
          ? t.theme.compactTitleFixedDark
          : t.theme.compactTitleFixedLight
      }
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-sky-600 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
};
