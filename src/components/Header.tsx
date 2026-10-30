/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Disc, 
  History, 
  Share2, 
  Volume2, 
  VolumeX, 
  Dumbbell, 
  User, 
  Sliders, 
  Home, 
  Globe, 
  Zap, 
  TrendingUp, 
  Camera, 
  Activity,
  MoreVertical,
  X,
  Download,
  Check
} from 'lucide-react';
import { UserProfile } from '../types/workout';
import { TabType } from '../types/navigation';
import { useI18n } from '../utils/i18n';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  user: UserProfile | null;
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenProfile: () => void;
  onOpenVolumeBudget: () => void;
  onOpenPlateCalc: () => void;
  onOpenHistory: () => void;
  onOpenAnalytics?: () => void;
  onOpenMeasurements?: () => void;
  onOpenCadence?: () => void;
  onShare: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  activeSetsCount: number;
  completedSetsCount: number;
  hasActiveWorkout?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab,
  onSelectTab,
  onOpenProfile,
  onOpenVolumeBudget,
  onOpenPlateCalc,
  onOpenHistory,
  onOpenAnalytics,
  onOpenMeasurements,
  onOpenCadence,
  onShare,
  isMuted,
  onToggleMute,
  activeSetsCount,
  completedSetsCount,
  hasActiveWorkout = false,
}) => {
  const { t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-40 bg-[#0d1424]/95 backdrop-blur-md border-b border-[#1f2d47]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Zone */}
        <div 
          onClick={() => onSelectTab('inicio')}
          className="flex items-center gap-2 sm:gap-2.5 shrink-0 cursor-pointer group"
          title="Ir para o Início"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="font-extrabold text-sm sm:text-lg text-white tracking-tight">
                {t.appTitle}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {t.badgePro}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden lg:block leading-none">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Center Main Tabs (Desktop / Tablet) */}
        <nav className="hidden sm:flex items-center gap-1 bg-[#121c32] p-1 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => onSelectTab('inicio')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'inicio'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>{t.tabHome}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('treino')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              activeTab === 'treino'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>{t.tabWorkout}</span>
          </button>

          {hasActiveWorkout && (
            <button
              type="button"
              onClick={() => onSelectTab('treino_ativo')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative animate-pulse ${
                activeTab === 'treino_ativo'
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 font-bold'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-amber-400" />
              <span>{t.tabActiveWorkout || 'Treino Ativo'}</span>
              {activeSetsCount > 0 && (
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-extrabold ${
                    activeTab === 'treino_ativo'
                      ? 'bg-slate-950/20 text-slate-950'
                      : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  {completedSetsCount}/{activeSetsCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelectTab('perfil')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'perfil'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{t.tabProfile}</span>
          </button>
        </nav>

        {/* Right Tools: Desktop View */}
        <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
          {user && (
            <button
              type="button"
              onClick={() => onSelectTab('perfil')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-[#141f36] hover:bg-[#1a2947] text-emerald-300 border border-emerald-500/40 shadow-sm transition-all cursor-pointer"
              title="Acessar Perfil do Atleta"
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span className="max-w-[80px] sm:max-w-[120px] truncate">{user.name}</span>
            </button>
          )}

          {onOpenAnalytics && (
            <button
              type="button"
              onClick={onOpenAnalytics}
              className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors cursor-pointer"
              title="Evolução de Cargas & 1RM"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xl:inline">Gráficos</span>
            </button>
          )}

          {onOpenMeasurements && (
            <button
              type="button"
              onClick={onOpenMeasurements}
              className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 transition-colors cursor-pointer"
              title="Diário de Medições & Fotos"
            >
              <Camera className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden xl:inline">Medições</span>
            </button>
          )}

          {onOpenCadence && (
            <button
              type="button"
              onClick={onOpenCadence}
              className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition-colors cursor-pointer"
              title="Metrônomo de Cadência & TUT (3-0-1-0)"
            >
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden lg:inline">Metrônomo</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenPlateCalc}
            className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/30 hover:bg-sky-500/20 transition-colors cursor-pointer"
            title={t.toolPlates}
          >
            <Disc className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{t.platesBtn}</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className={`p-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              isMuted
                ? 'bg-slate-800/80 text-slate-400 border-slate-700'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
            title={isMuted ? t.soundOff : t.soundOn}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onShare}
            className="p-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer"
            title={t.shareBtn}
          >
            <Share2 className="w-4 h-4" />
          </button>

          <PWAInstallButton />
        </div>

        {/* Right Tools: Mobile 3-Dots Menu (Clean & Spacious Layout) */}
        <div className="flex sm:hidden items-center gap-1.5 relative" ref={menuRef}>
          {/* Active Workout Quick Indicator on Mobile */}
          {hasActiveWorkout && activeTab !== 'treino_ativo' && (
            <button
              type="button"
              onClick={() => onSelectTab('treino_ativo')}
              className="py-1 px-2 rounded-lg bg-amber-500 text-slate-950 font-black text-[11px] flex items-center gap-1 animate-pulse shadow-sm"
              title="Voltar ao Treino Ativo"
            >
              <Zap className="w-3 h-3 fill-slate-950" />
              <span>{completedSetsCount}/{activeSetsCount}</span>
            </button>
          )}

          {/* User Name Pill on Mobile */}
          {user && (
            <button
              type="button"
              onClick={() => onSelectTab('perfil')}
              className="flex items-center gap-1 py-1 px-2 rounded-lg text-[11px] font-bold bg-[#141f36] text-emerald-300 border border-emerald-500/30 max-w-[90px] truncate"
            >
              <User className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">{user.name.split(' ')[0]}</span>
            </button>
          )}

          {/* Mobile 3-Dots Menu Trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="w-8 h-8 rounded-xl bg-slate-800/90 text-slate-200 hover:text-white border border-slate-700 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
            aria-label="Abrir menu de opções"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Mobile 3-Dots Dropdown Sheet */}
          {mobileMenuOpen && (
            <div className="absolute top-11 right-0 w-64 bg-[#0d1527] border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn space-y-1">
              <div className="px-2.5 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Ferramentas & Ações</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {onOpenCadence && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenCadence();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-purple-300 hover:bg-purple-950/30 transition-colors text-left cursor-pointer"
                >
                  <Activity className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <span className="block font-bold">Metrônomo de Cadência</span>
                    <span className="block text-[10px] text-slate-400">Guia sonoro e tempo sob tensão</span>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenPlateCalc();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-sky-300 hover:bg-sky-950/30 transition-colors text-left cursor-pointer"
              >
                <Disc className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <span className="block font-bold">Calculadora de Anilhas</span>
                  <span className="block text-[10px] text-slate-400">Distribuição ideal por lado da barra</span>
                </div>
              </button>

              {onOpenAnalytics && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAnalytics();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-300 hover:bg-emerald-950/30 transition-colors text-left cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="block font-bold">Gráficos de Evolução</span>
                    <span className="block text-[10px] text-slate-400">Progresso de cargas e 1RM</span>
                  </div>
                </button>
              )}

              {onOpenMeasurements && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenMeasurements();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-pink-300 hover:bg-pink-950/30 transition-colors text-left cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-pink-400 shrink-0" />
                  <div>
                    <span className="block font-bold">Diário de Medições</span>
                    <span className="block text-[10px] text-slate-400">Fotos comparativas e medidas</span>
                  </div>
                </button>
              )}

              <div className="pt-1 border-t border-slate-800 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onToggleMute();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                    <span>Som do Treino</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {isMuted ? 'Mudo' : 'Ligado'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onShare();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Compartilhar App</span>
                </button>
              </div>

              <div className="pt-1.5 border-t border-slate-800">
                <PWAInstallButton variant="full" className="w-full py-2 text-xs" />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
