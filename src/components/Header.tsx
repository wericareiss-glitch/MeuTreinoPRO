/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Share2, 
  Volume2, 
  VolumeX, 
  Dumbbell, 
  User, 
  Home, 
  Zap, 
  TrendingUp, 
  Activity, 
  X, 
  Sliders,
  ChevronRight,
  Sparkles,
  Calendar,
  ArrowLeft
} from 'lucide-react';
import { UserProfile } from '../types/workout';
import { TabType } from '../types/navigation';
import { useI18n } from '../utils/i18n';
import { PWAInstallButton } from './PWAInstallButton';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  user: UserProfile | null;
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenProfile: () => void;
  onOpenVolumeBudget: () => void;
  onOpenHistory: () => void;
  onOpenAnalytics?: () => void;
  onOpenMeasurements?: () => void;
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
  onOpenHistory,
  onOpenAnalytics,
  onOpenMeasurements,
  onShare,
  isMuted,
  onToggleMute,
  activeSetsCount,
  completedSetsCount,
  hasActiveWorkout = false,
}) => {
  const { t } = useI18n();
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Fecha menus ao clicar fora ou pressionar Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(target)) {
        setToolsMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setToolsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Fecha menus automaticamente ao entrar no treino ativo (Modo Foco)
  useEffect(() => {
    if (activeTab === 'treino_ativo') {
      setToolsMenuOpen(false);
      setProfileMenuOpen(false);
    }
  }, [activeTab]);

  return (
    <header className="sticky top-0 z-50 w-full max-w-full overflow-x-clip bg-[#0d1424]/95 backdrop-blur-md border-b border-[#1f2d47]">
      <div className="max-w-5xl mx-auto w-full min-w-0 px-3 sm:px-5 h-13 sm:h-15 flex items-center justify-between gap-2">
        {/* Lado Esquerdo: Marca / Logo */}
        <div 
          onClick={() => {
            onSelectTab('inicio');
          }}
          className="flex items-center gap-2 sm:gap-2.5 shrink-0 cursor-pointer group"
          title="Ir para o Início"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-transparent border border-emerald-500/35 hover:bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-black shadow-sm group-hover:scale-105 transition-all">
            <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 stroke-[2.5]" />
          </div>
          <div>
            <span className="font-extrabold text-sm sm:text-base md:text-lg text-white tracking-tight block leading-tight">
              {t.appTitle}
            </span>
            <p className="text-[10px] text-slate-400 hidden xl:block leading-none mt-0.5">
              Hipertrofia & Sobrecarga Científica
            </p>
          </div>
        </div>

        {/* Centro: Abas Principais no Desktop / Tablet (Oculto em Treino Ativo para foco total) */}
        {activeTab !== 'treino_ativo' && (
          <nav className="hidden md:flex items-center gap-1 bg-[#121c32] p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => onSelectTab('inicio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative animate-pulse text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
              >
                <Zap className="w-3.5 h-3.5 fill-amber-400" />
                <span>Treino Ativo</span>
                {activeSetsCount > 0 && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full font-extrabold bg-amber-400 text-slate-950">
                    {completedSetsCount}/{activeSetsCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => onSelectTab('perfil')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'perfil'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{t.tabProfile}</span>
            </button>
          </nav>
        )}

        {/* Lado Direito: Ações Desktop e Ícone de Menu Mobile */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {activeTab === 'treino_ativo' ? (
            /* Modo Foco no Treino Ativo: Menus completamente ocultos para máxima concentração e atenção */
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[11px] sm:text-xs font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="hidden xs:inline">Modo Foco</span>
                <span className="xs:hidden">Foco</span>
              </div>

              {/* Botão de Som Rápido */}
              <button
                type="button"
                onClick={onToggleMute}
                className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                  isMuted
                    ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                }`}
                title={isMuted ? 'Ativar avisos sonoros' : 'Silenciar avisos sonoros'}
                aria-label={isMuted ? 'Ativar som' : 'Silenciar som'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Botão de Tema (Sempre visível) */}
              <ThemeToggle variant="compact" />

              {/* Botão de Pausa / Retorno à lista de treinos */}
              <button
                type="button"
                onClick={() => onSelectTab('treino')}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer active:scale-95"
                title="Pausar treino e voltar à lista"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pausar</span>
              </button>
            </div>
          ) : (
            <>
              {/* Indicador de Treino Ativo no Mobile/Desktop se não estiver na aba dele */}
              {hasActiveWorkout && (
                <button
                  type="button"
                  onClick={() => onSelectTab('treino_ativo')}
                  className="py-1 px-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 animate-pulse shadow-md shadow-amber-400/20 cursor-pointer active:scale-95"
                  title="Voltar ao Treino em Andamento"
                >
                  <Zap className="w-3.5 h-3.5 fill-slate-950" />
                  <span>{completedSetsCount}/{activeSetsCount}</span>
                </button>
              )}

              {/* Botão de Tema (Sempre visível para 1-clique rápido) */}
              <ThemeToggle variant="compact" />

              {/* Controles Exclusivos do Desktop */}
              <div className="hidden md:flex items-center gap-2">

            {/* Menu Dropdown do Perfil */}
            {user && (
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen((prev) => !prev);
                    setToolsMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 py-1.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 ${
                    profileMenuOpen
                      ? 'bg-slate-700 text-white border-slate-500 shadow-md'
                      : 'bg-slate-800/90 hover:bg-slate-800 text-slate-200 hover:text-white border-slate-750'
                  }`}
                  title="Menu do Perfil"
                  aria-label="Menu do Perfil"
                >
                  <div className="w-5 h-5 rounded-lg bg-slate-700 text-slate-200 border border-slate-600 flex items-center justify-center font-black text-[10px] shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate max-w-[100px]">{user.name.split(' ')[0]}</span>
                  <ChevronRight className={`w-3 h-3 text-slate-400 transition-transform ${profileMenuOpen ? 'rotate-90' : ''}`} />
                </button>

                {profileMenuOpen && (
                  <div 
                    className="absolute top-full mt-2 right-0 w-80 menu-dropdown-surface border border-theme-menu rounded-2xl shadow-2xl p-3 z-50 animate-fadeIn space-y-3"
                    style={{ overscrollBehavior: 'contain' }}
                  >
                    {/* Header do Perfil */}
                    <div className="flex items-center justify-between pb-2 border-b border-theme-menu-subtle">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-theme-surface-secondary text-theme-heading border border-theme-subtle flex items-center justify-center font-black text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-xs text-theme-heading truncate">{user.name}</h4>
                          <p className="text-[10px] text-theme-menu-muted font-mono truncate">@{user.username}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProfileMenuOpen(false)}
                        className="p-1 rounded-lg menu-item-btn"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Dados do Perfil */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-theme-menu-muted uppercase tracking-wider block">
                        Dados do Perfil
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <div className="p-2 rounded-xl bg-theme-surface-secondary border border-theme-subtle">
                          <span className="text-[9px] text-theme-menu-muted block">Sexo Biológico</span>
                          <span className="font-bold text-theme-heading">
                            {user.gender === 'male' ? '👨 Masculino' : '👩 Feminino'}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-theme-surface-secondary border border-theme-subtle">
                          <span className="text-[9px] text-theme-menu-muted block">Nível</span>
                          <span className="font-bold text-theme-heading capitalize">
                            {user.level === 'beginner' ? 'Iniciante' : user.level === 'intermediate' ? 'Intermediário' : 'Avançado'}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-theme-surface-secondary border border-theme-subtle">
                          <span className="text-[9px] text-theme-menu-muted block">Foco de Treino</span>
                          <span className="font-bold text-theme-heading truncate block">
                            {user.focus === 'glutes' ? '🍑 Glúteos' : user.focus === 'strength' ? '🏋️ Força' : user.focus === 'v_taper' ? '🔱 Shape V' : '⚖️ Equilíbrio'}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-theme-surface-secondary border border-theme-subtle">
                          <span className="text-[9px] text-theme-menu-muted block">Frequência</span>
                          <span className="font-bold text-theme-heading">
                            {user.frequency || 4}x / semana
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-theme-surface-secondary border border-theme-subtle text-xs">
                        <span className="text-theme-menu-muted">Peso & Altura:</span>
                        <span className="font-mono font-bold text-theme-heading">
                          {user.weightKg} kg · {user.heightM > 3 ? Math.round(user.heightM) : Math.round(user.heightM * 100)} cm
                        </span>
                      </div>
                    </div>

                    {/* Ações do Menu de Perfil */}
                    <div className="pt-2 border-t border-theme-menu-subtle space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onSelectTab('perfil');
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold menu-item-btn text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 menu-item-icon" />
                          <span>Ver Tela Completa do Perfil</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onOpenProfile();
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold menu-item-btn text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <Sliders className="w-3.5 h-3.5 menu-item-icon" />
                          <span>Editar Dados do Perfil</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onOpenVolumeBudget();
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold menu-item-btn text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 menu-item-icon" />
                          <span>Metas de Séries ({user.weeklyBudget}s)</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Menu Desktop de Ferramentas */}
            <div className="relative" ref={desktopMenuRef}>
              <button
                type="button"
                onClick={() => setToolsMenuOpen((prev) => !prev)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm ${
                  toolsMenuOpen
                    ? 'bg-slate-700 text-white border-slate-500 shadow-md'
                    : 'bg-slate-800/90 text-slate-200 hover:text-white border-slate-700 hover:border-slate-600'
                }`}
                title="Menu de Ferramentas e Configurações"
                aria-label="Menu de Ferramentas e Configurações"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span>Ferramentas</span>
              </button>

              {toolsMenuOpen && (
                <div 
                  className="absolute top-full mt-2 right-0 w-80 max-w-[calc(100vw-20px)] menu-dropdown-surface border border-theme-menu rounded-2xl shadow-2xl p-2.5 z-50 animate-fadeIn space-y-2 max-h-[82vh] overflow-y-auto"
                  style={{ overscrollBehavior: 'contain' }}
                >
                  <div className="px-2 py-1 border-b border-theme-menu-subtle flex items-center justify-between text-xs font-bold text-theme-menu-muted uppercase tracking-wider">
                    <span>Ferramentas & Recursos</span>
                    <button
                      type="button"
                      onClick={() => setToolsMenuOpen(false)}
                      className="p-1 rounded-lg menu-item-btn"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Análise & Acompanhamento */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-theme-menu-muted uppercase tracking-wider px-2">
                      Análise & Acompanhamento
                    </span>

                    {onOpenAnalytics && (
                      <button
                        type="button"
                        onClick={() => {
                          setToolsMenuOpen(false);
                          onOpenAnalytics();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold menu-item-btn text-left cursor-pointer group"
                      >
                        <TrendingUp className="w-4 h-4 menu-item-icon shrink-0" />
                        <div className="flex-1">
                          <span className="block font-bold">Gráficos de Evolução</span>
                          <span className="block text-[10px] text-theme-menu-muted">Progresso de cargas e 1RM</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    )}

                    {onOpenMeasurements && (
                      <button
                        type="button"
                        onClick={() => {
                          setToolsMenuOpen(false);
                          onOpenMeasurements();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold menu-item-btn text-left cursor-pointer group"
                      >
                        <Activity className="w-4 h-4 menu-item-icon shrink-0" />
                        <div className="flex-1">
                          <span className="block font-bold">Medições Corporais</span>
                          <span className="block text-[10px] text-theme-menu-muted">Peso, dobras e circunferências</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    )}
                  </div>

                  {/* Treino & Utilitários */}
                  <div className="pt-1.5 border-t border-theme-menu-subtle space-y-1">
                    <span className="text-[10px] font-bold text-theme-menu-muted uppercase tracking-wider px-2">
                      Treino & Cargas
                    </span>

                    {onOpenHistory && (
                      <button
                        type="button"
                        onClick={() => {
                          setToolsMenuOpen(false);
                          onOpenHistory();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold menu-item-btn text-left cursor-pointer group"
                      >
                        <Calendar className="w-4 h-4 menu-item-icon shrink-0" />
                        <div className="flex-1">
                          <span className="block font-bold">Histórico de Treinos</span>
                          <span className="block text-[10px] text-theme-menu-muted">Registros e anotações passadas</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    )}
                  </div>

                  {/* Preferências */}
                  <div className="pt-1.5 border-t border-theme-menu-subtle space-y-1">
                    <span className="text-[10px] font-bold text-theme-menu-muted uppercase tracking-wider px-2">
                      Preferências
                    </span>

                    <ThemeToggle variant="full" />

                    <button
                      type="button"
                      onClick={() => onToggleMute()}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold menu-item-btn text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        {isMuted ? <VolumeX className="w-4 h-4 menu-item-icon" /> : <Volume2 className="w-4 h-4 menu-item-icon" />}
                        <span>Efeitos Sonoros</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-theme-menu-muted">
                        {isMuted ? 'Mudo' : 'Ligado'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setToolsMenuOpen(false);
                        onShare();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold menu-item-btn text-left cursor-pointer group"
                    >
                      <Share2 className="w-4 h-4 menu-item-icon shrink-0" />
                      <span>Compartilhar Aplicativo</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-theme-menu-subtle">
                    <PWAInstallButton variant="full" className="w-full py-2 text-xs" />
                  </div>
                </div>
              )}
            </div>
          </div>

            </>
          )}
        </div>
      </div>
    </header>
  );
};
