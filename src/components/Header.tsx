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
  MoreVertical, 
  X, 
  Menu,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        // Se o clique não foi no próprio botão do menu mobile
        const btn = document.getElementById('mobile-menu-trigger-btn');
        if (!btn || !btn.contains(target)) {
          setMobileMenuOpen(false);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setToolsMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Fecha o menu mobile automaticamente se a largura da tela for aumentada para desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fecha menus automaticamente ao entrar no treino ativo (Modo Foco)
  useEffect(() => {
    if (activeTab === 'treino_ativo') {
      setMobileMenuOpen(false);
      setToolsMenuOpen(false);
      setProfileMenuOpen(false);
    }
  }, [activeTab]);

  // Fecha o menu mobile quando o usuário navega para qualquer aba
  const handleMobileNavigate = (tab: TabType) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };


  return (
    <header className="sticky top-0 z-50 bg-[#0d1424]/95 backdrop-blur-md border-b border-[#1f2d47]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Lado Esquerdo: Marca / Logo */}
        <div 
          onClick={() => {
            onSelectTab('inicio');
            setMobileMenuOpen(false);
          }}
          className="flex items-center gap-2 sm:gap-2.5 shrink-0 cursor-pointer group"
          title="Ir para o Início"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-transparent border border-emerald-500/35 hover:bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-black shadow-sm group-hover:scale-105 transition-all">
            <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="font-extrabold text-sm sm:text-base md:text-lg text-white tracking-tight">
                {t.appTitle}
              </span>
              <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden xl:block leading-none">
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
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-md'
                      : 'bg-[#141f36] hover:bg-[#1a2947] text-emerald-300 border-emerald-500/35'
                  }`}
                  title="Menu do Perfil"
                  aria-label="Menu do Perfil"
                >
                  <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-[10px] shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate max-w-[100px]">{user.name.split(' ')[0]}</span>
                  <ChevronRight className={`w-3 h-3 text-emerald-400 transition-transform ${profileMenuOpen ? 'rotate-90' : ''}`} />
                </button>

                {profileMenuOpen && (
                  <div 
                    className="absolute top-full mt-2 right-0 w-80 bg-[#0c1424] border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 animate-fadeIn space-y-3"
                    style={{ overscrollBehavior: 'contain' }}
                  >
                    {/* Header do Perfil */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-xs text-white truncate">{user.name}</h4>
                          <p className="text-[10px] text-slate-400 font-mono truncate">@{user.username}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProfileMenuOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Dados do Perfil */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Dados do Perfil
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <div className="p-2 rounded-xl bg-[#121c32] border border-slate-800">
                          <span className="text-[9px] text-slate-400 block">Sexo Biológico</span>
                          <span className="font-bold text-white">
                            {user.gender === 'male' ? '👨 Masculino' : '👩 Feminino'}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#121c32] border border-slate-800">
                          <span className="text-[9px] text-slate-400 block">Nível</span>
                          <span className="font-bold text-white capitalize">
                            {user.level === 'beginner' ? 'Iniciante' : user.level === 'intermediate' ? 'Intermediário' : 'Avançado'}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#121c32] border border-slate-800">
                          <span className="text-[9px] text-slate-400 block">Foco de Treino</span>
                          <span className="font-bold text-white truncate block">
                            {user.focus === 'glutes' ? '🍑 Glúteos' : user.focus === 'strength' ? '🏋️ Força' : user.focus === 'v_taper' ? '🔱 Shape V' : '⚖️ Equilíbrio'}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#121c32] border border-slate-800">
                          <span className="text-[9px] text-slate-400 block">Frequência</span>
                          <span className="font-bold text-white">
                            {user.frequency || 4}x / semana
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-[#121c32] border border-slate-800 text-xs">
                        <span className="text-slate-400">Peso & Altura:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {user.weightKg} kg · {user.heightM > 3 ? Math.round(user.heightM) : Math.round(user.heightM * 100)} cm
                        </span>
                      </div>
                    </div>

                    {/* Ações do Menu de Perfil */}
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onSelectTab('perfil');
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-emerald-300 hover:bg-emerald-950/40 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Ver Tela Completa do Perfil</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onOpenProfile();
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-sky-300 hover:bg-sky-950/40 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Sliders className="w-3.5 h-3.5 text-sky-400" />
                          <span>Editar Dados do Perfil</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onOpenVolumeBudget();
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-amber-300 hover:bg-amber-950/40 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Metas de Séries ({user.weeklyBudget}s)</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
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
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                <span>Ferramentas</span>
              </button>

              {toolsMenuOpen && (
                <div 
                  className="absolute top-full mt-2 right-0 w-80 max-w-[calc(100vw-20px)] bg-[#0c1424] border border-slate-700 rounded-2xl shadow-2xl p-2.5 z-50 animate-fadeIn space-y-2 max-h-[82vh] overflow-y-auto"
                  style={{ overscrollBehavior: 'contain' }}
                >
                  <div className="px-2 py-1 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span>Ferramentas & Recursos</span>
                    <button
                      type="button"
                      onClick={() => setToolsMenuOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Análise & Acompanhamento */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2">
                      Análise & Acompanhamento
                    </span>

                    {onOpenAnalytics && (
                      <button
                        type="button"
                        onClick={() => {
                          setToolsMenuOpen(false);
                          onOpenAnalytics();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-emerald-300 hover:bg-emerald-950/40 transition-colors text-left cursor-pointer"
                      >
                        <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="flex-1">
                          <span className="block font-bold">Gráficos de Evolução</span>
                          <span className="block text-[10px] text-slate-400">Progresso de cargas e 1RM</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                    )}

                    {onOpenMeasurements && (
                      <button
                        type="button"
                        onClick={() => {
                          setToolsMenuOpen(false);
                          onOpenMeasurements();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-pink-300 hover:bg-pink-950/40 transition-colors text-left cursor-pointer"
                      >
                        <Activity className="w-4 h-4 text-pink-400 shrink-0" />
                        <div className="flex-1">
                          <span className="block font-bold">Medições Corporais</span>
                          <span className="block text-[10px] text-slate-400">Peso, dobras e circunferências</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                    )}
                  </div>

                  {/* Treino & Utilitários */}
                  <div className="pt-1.5 border-t border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2">
                      Treino & Cargas
                    </span>

                    {onOpenHistory && (
                      <button
                        type="button"
                        onClick={() => {
                          setToolsMenuOpen(false);
                          onOpenHistory();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors text-left cursor-pointer"
                      >
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="flex-1">
                          <span className="block font-bold">Histórico de Treinos</span>
                          <span className="block text-[10px] text-slate-400">Registros e anotações passadas</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                    )}
                  </div>


                  {/* Preferências */}
                  <div className="pt-1.5 border-t border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2">
                      Preferências
                    </span>

                    <ThemeToggle variant="full" />

                    <button
                      type="button"
                      onClick={() => onToggleMute()}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                        <span>Efeitos Sonoros</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        {isMuted ? 'Mudo' : 'Ligado'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setToolsMenuOpen(false);
                        onShare();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>Compartilhar Aplicativo</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <PWAInstallButton variant="full" className="w-full py-2 text-xs" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MOBILE: Botão de Menu Dropdown */}
          <div className="md:hidden">
            <button
              id="mobile-menu-trigger-btn"
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation ${
                mobileMenuOpen
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/30'
                  : 'bg-slate-800 text-slate-200 hover:text-white border-slate-700'
              }`}
              aria-label={mobileMenuOpen ? 'Fechar menu de opções' : 'Abrir menu de opções'}
              aria-expanded={mobileMenuOpen}
              title="Menu Principal"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <Menu className="w-5 h-5 stroke-[2.5]" />
              )}
            </button>
          </div>
            </>
          )}
        </div>
      </div>

      {/* =========================================================================
          MENU DROPDOWN MOBILE (Desce suavemente com todas as opções - Oculto em Treino Ativo)
          ========================================================================= */}
      {mobileMenuOpen && activeTab !== 'treino_ativo' && (
        <>
          {/* Backdrop escurecido para fechar ao tocar fora */}
          <div 
            className="fixed inset-0 top-14 sm:top-16 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-fadeIn"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Conteúdo do Menu Dropdown que desce */}
          <div 
            ref={mobileMenuRef}
            className="absolute top-full left-0 right-0 w-full bg-[#0c1424] border-b border-slate-700/80 shadow-2xl z-50 md:hidden animate-slideDown max-h-[calc(100vh-56px)] overflow-y-auto px-4 py-4 space-y-4"
            style={{ overscrollBehavior: 'contain' }}
          >
            {/* Card do Atleta (se logado) */}
            {user && (
              <div 
                onClick={() => handleMobileNavigate('perfil')}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-[#111c34] to-[#0f172a] border border-emerald-500/30 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-sm shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                      Atleta Cadastrado
                    </span>
                    <h3 className="font-extrabold text-sm text-white truncate">
                      {user.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate">
                      {`${user.focus === 'glutes' ? '🍑 Glúteos' : user.focus === 'strength' ? '🏋️ Força' : user.focus === 'v_taper' ? '🔱 Shape V' : '⚖️ Equilíbrio'} · ${user.frequency || 4}x/sem`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 shrink-0">
                  <span>Perfil</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            )}

            {/* 1. SEÇÃO DE NAVEGAÇÃO PRINCIPAL (Abas do App) */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
                Navegação Principal
              </span>
              <div className="grid grid-cols-2 gap-2">
                {/* Início */}
                <button
                  type="button"
                  onClick={() => handleMobileNavigate('inicio')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer min-h-[48px] ${
                    activeTab === 'inicio'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md shadow-emerald-500/25'
                      : 'bg-[#121c33] text-slate-200 border-slate-750 hover:bg-[#16233f]'
                  }`}
                >
                  <Home className={`w-5 h-5 shrink-0 ${activeTab === 'inicio' ? 'text-slate-950' : 'text-emerald-400'}`} />
                  <div>
                    <span className="block text-xs font-bold">Início</span>
                    <span className={`block text-[10px] ${activeTab === 'inicio' ? 'text-slate-900/80' : 'text-slate-400'}`}>
                      Dashboard & KPIs
                    </span>
                  </div>
                </button>

                {/* Meus Treinos */}
                <button
                  type="button"
                  onClick={() => handleMobileNavigate('treino')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer min-h-[48px] ${
                    activeTab === 'treino'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md shadow-emerald-500/25'
                      : 'bg-[#121c33] text-slate-200 border-slate-750 hover:bg-[#16233f]'
                  }`}
                >
                  <Dumbbell className={`w-5 h-5 shrink-0 ${activeTab === 'treino' ? 'text-slate-950' : 'text-teal-400'}`} />
                  <div>
                    <span className="block text-xs font-bold">Meus Treinos</span>
                    <span className={`block text-[10px] ${activeTab === 'treino' ? 'text-slate-900/80' : 'text-slate-400'}`}>
                      Fichas da semana
                    </span>
                  </div>
                </button>

                {/* Treino Ativo (se houver) ou Cardio */}
                {hasActiveWorkout ? (
                  <button
                    type="button"
                    onClick={() => handleMobileNavigate('treino_ativo')}
                    className="col-span-2 p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer min-h-[48px] animate-pulse bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25"
                  >
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 shrink-0 fill-current" />
                      <div>
                        <span className="block text-xs font-black">Treino em Andamento!</span>
                        <span className="block text-[10px] opacity-80">
                          {completedSetsCount}/{activeSetsCount} séries concluídas
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-black bg-slate-950/20 px-2 py-1 rounded-lg">
                      Retomar
                    </span>
                  </button>
                ) : null}

                {/* Perfil */}
                <button
                  type="button"
                  onClick={() => handleMobileNavigate('perfil')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer min-h-[48px] ${
                    activeTab === 'perfil'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md shadow-emerald-500/25'
                      : 'bg-[#121c33] text-slate-200 border-slate-750 hover:bg-[#16233f]'
                  }`}
                >
                  <User className={`w-5 h-5 shrink-0 ${activeTab === 'perfil' ? 'text-slate-950' : 'text-emerald-400'}`} />
                  <div>
                    <span className="block text-xs font-bold">Perfil</span>
                    <span className={`block text-[10px] ${activeTab === 'perfil' ? 'text-slate-900/80' : 'text-slate-400'}`}>
                      Periodização do Treino
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. SEÇÃO DE FERRAMENTAS & HISTÓRICO */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
                Ferramentas & Histórico
              </span>
              <div className="space-y-1.5">
                {onOpenAnalytics && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAnalytics();
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#121c33] hover:bg-[#16233f] border border-slate-750 text-left transition-colors cursor-pointer min-h-[48px]"
                  >
                    <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <span className="block text-xs font-bold text-white">Gráficos de Evolução</span>
                      <span className="block text-[10px] text-slate-400">Progresso de cargas e 1RM</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                )}

                {onOpenMeasurements && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenMeasurements();
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#121c33] hover:bg-[#16233f] border border-slate-750 text-left transition-colors cursor-pointer min-h-[48px]"
                  >
                    <div className="p-2 rounded-xl bg-pink-500/15 text-pink-400 shrink-0">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <span className="block text-xs font-bold text-white">Medições Corporais</span>
                      <span className="block text-[10px] text-slate-400">Peso, dobras e circunferências</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                )}

                {onOpenHistory && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenHistory();
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#121c33] hover:bg-[#16233f] border border-slate-750 text-left transition-colors cursor-pointer min-h-[48px]"
                  >
                    <div className="p-2 rounded-xl bg-slate-700/40 text-slate-300 shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <span className="block text-xs font-bold text-white">Histórico Geral</span>
                      <span className="block text-[10px] text-slate-400">Todos os treinos e séries passadas</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                )}
              </div>
            </div>

            {/* 4. PREFERÊNCIAS & SISTEMA */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                Preferências & Aplicativo
              </span>

              {/* Tema Visual (Claro / Escuro) */}
              <div className="p-1 rounded-2xl bg-[#121c33] border border-slate-750">
                <ThemeToggle variant="full" />
              </div>

              {/* Efeitos Sonoros */}
              <button
                type="button"
                onClick={onToggleMute}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#121c33] hover:bg-[#16233f] border border-slate-750 text-left transition-colors cursor-pointer min-h-[48px]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-slate-300 shrink-0">
                    {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white">Efeitos Sonoros</span>
                    <span className="block text-[10px] text-slate-400">Sons de bip e finalização de descanso</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md border bg-slate-800 text-slate-300 border-slate-700">
                  {isMuted ? 'Mudo' : 'Ligado'}
                </span>
              </button>

              {/* Compartilhar */}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onShare();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#121c33] hover:bg-[#16233f] border border-slate-750 text-left transition-colors cursor-pointer min-h-[48px]"
              >
                <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <span className="block text-xs font-bold text-white">Compartilhar Aplicativo</span>
                  <span className="block text-[10px] text-slate-400">Enviar link para colegas de treino</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>

              {/* Instalar App (PWA) */}
              <div className="pt-1">
                <PWAInstallButton variant="full" className="w-full py-2.5 text-xs rounded-2xl" />
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
};
