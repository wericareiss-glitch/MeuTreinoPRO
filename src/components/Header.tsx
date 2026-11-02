/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Disc, 
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
  Flame, 
  Heart, 
  Apple,
  Sliders,
  ChevronRight,
  MessageSquare,
  Sparkles,
  Calendar,
  Check,
  Copy
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
  onOpenPlateCalc: () => void;
  onOpenHistory: () => void;
  onOpenAnalytics?: () => void;
  onOpenMeasurements?: () => void;
  onOpenCadence?: () => void;
  onOpenDeloadAssistant?: () => void;
  isDeloadActive?: boolean;
  onOpenNutrition?: () => void;
  onOpenDonation?: () => void;
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
  onOpenDeloadAssistant,
  isDeloadActive = false,
  onOpenNutrition,
  onOpenDonation,
  onShare,
  isMuted,
  onToggleMute,
  activeSetsCount,
  completedSetsCount,
  hasActiveWorkout = false,
}) => {
  const { t } = useI18n();
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);

  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Fecha menus ao clicar fora ou pressionar Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(target)) {
        setToolsMenuOpen(false);
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

  // Fecha o menu mobile quando o usuário navega para qualquer aba
  const handleMobileNavigate = (tab: TabType) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText('alex.vieira.123@hotmail.com');
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2500);
    if (onOpenDonation) {
      onOpenDonation();
    }
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
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950 stroke-[2.5]" />
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

        {/* Centro: Abas Principais no Desktop / Tablet */}
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative animate-pulse ${
                activeTab === 'treino_ativo'
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 font-bold'
              }`}
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

        {/* Lado Direito: Ações Desktop e Ícone de Menu Mobile */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Indicador de Treino Ativo no Mobile/Desktop se não estiver na aba dele */}
          {hasActiveWorkout && activeTab !== 'treino_ativo' && (
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
            {/* Botão de Doação PIX */}
            {onOpenDonation && (
              <button
                type="button"
                onClick={onOpenDonation}
                className="flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-500/20 via-pink-500/20 to-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                title="Apoiar com PIX (Incentivar o Criador Alex Vieira)"
              >
                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                <span>Apoiar PIX</span>
              </button>
            )}

            {/* Atalho do Perfil */}
            {user && (
              <button
                type="button"
                onClick={() => onSelectTab('perfil')}
                className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-bold bg-[#141f36] hover:bg-[#1a2947] text-emerald-300 border border-emerald-500/35 transition-all cursor-pointer shrink-0 max-w-[130px]"
                title={`Perfil do Atleta: ${user.name}`}
              >
                <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{user.name.split(' ')[0]}</span>
              </button>
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

                    {onOpenPlateCalc && (
                      <button
                        type="button"
                        onClick={() => {
                          setToolsMenuOpen(false);
                          onOpenPlateCalc();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-sky-300 hover:bg-sky-950/40 transition-colors text-left cursor-pointer"
                      >
                        <Disc className="w-4 h-4 text-sky-400 shrink-0" />
                        <div className="flex-1">
                          <span className="block font-bold">Calculadora de Anilhas</span>
                          <span className="block text-[10px] text-slate-400">Distribuição precisa na barra</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                    )}

                    {onOpenCadence && (
                      <button
                        type="button"
                        onClick={() => {
                          setToolsMenuOpen(false);
                          onOpenCadence();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-purple-300 hover:bg-purple-950/40 transition-colors text-left cursor-pointer"
                      >
                        <Activity className="w-4 h-4 text-purple-400 shrink-0" />
                        <div className="flex-1">
                          <span className="block font-bold">Metrônomo de Cadência</span>
                          <span className="block text-[10px] text-slate-400">Tempo sob tensão (TUT)</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                    )}

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

                  {/* Nutrição & Recuperação */}
                  <div className="pt-1.5 border-t border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2">
                      Nutrição & Fisiologia
                    </span>

                    {onOpenNutrition && (
                      <button
                        type="button"
                        onClick={() => {
                          setToolsMenuOpen(false);
                          onOpenNutrition();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-emerald-300 hover:bg-emerald-950/40 transition-colors text-left cursor-pointer"
                      >
                        <Apple className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="flex-1">
                          <span className="block font-bold">Calculadora de TMB & Macros</span>
                          <span className="block text-[10px] text-slate-400">Cutting -10%, manutenção ou bulking</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                    )}

                    {onOpenDeloadAssistant && (
                      <button
                        type="button"
                        onClick={() => {
                          setToolsMenuOpen(false);
                          onOpenDeloadAssistant();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-amber-300 hover:bg-amber-950/40 transition-colors text-left cursor-pointer"
                      >
                        <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">Assistente de Deload</span>
                            {isDeloadActive && (
                              <span className="text-[9px] font-bold bg-amber-500 text-slate-950 px-1 rounded">ATIVO</span>
                            )}
                          </div>
                          <span className="block text-[10px] text-slate-400">Fadiga neuromuscular acumulada</span>
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
        </div>
      </div>

      {/* =========================================================================
          MENU DROPDOWN MOBILE (Desce suavemente com todas as opções)
          ========================================================================= */}
      {mobileMenuOpen && (
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
                      {user.focus === 'glutes' ? '🍑 Foco em Glúteos' : user.focus === 'strength' ? '🏋️ Foco em Força' : user.focus === 'v_taper' ? '🔱 Shape V-Taper' : '⚖️ Foco Equilibrado'} · {user.frequency || 4}x/sem
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
                    className={`col-span-2 p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer min-h-[48px] animate-pulse ${
                      activeTab === 'treino_ativo'
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 border-amber-300 font-black shadow-lg shadow-amber-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                    }`}
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

                {/* Cardio */}
                <button
                  type="button"
                  onClick={() => handleMobileNavigate('cardio')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer min-h-[48px] ${
                    activeTab === 'cardio'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md shadow-emerald-500/25'
                      : 'bg-[#121c33] text-slate-200 border-slate-750 hover:bg-[#16233f]'
                  }`}
                >
                  <Flame className={`w-5 h-5 shrink-0 ${activeTab === 'cardio' ? 'text-slate-950' : 'text-orange-400'}`} />
                  <div>
                    <span className="block text-xs font-bold">Cardio</span>
                    <span className={`block text-[10px] ${activeTab === 'cardio' ? 'text-slate-900/80' : 'text-slate-400'}`}>
                      Cronômetro & logs
                    </span>
                  </div>
                </button>

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
                      Periodização & RIR
                    </span>
                  </div>
                </button>

                {/* Sugestões & Bugs */}
                <button
                  type="button"
                  onClick={() => handleMobileNavigate('feedback')}
                  className={`col-span-2 p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer min-h-[48px] ${
                    activeTab === 'feedback'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md shadow-emerald-500/25'
                      : 'bg-[#121c33] text-slate-200 border-slate-750 hover:bg-[#16233f]'
                  }`}
                >
                  <MessageSquare className={`w-5 h-5 shrink-0 ${activeTab === 'feedback' ? 'text-slate-950' : 'text-sky-400'}`} />
                  <div className="flex-1">
                    <span className="block text-xs font-bold">Central de Sugestões & Bugs</span>
                    <span className={`block text-[10px] ${activeTab === 'feedback' ? 'text-slate-900/80' : 'text-slate-400'}`}>
                      Envie ideias de melhorias diretamente para a equipe
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            {/* 2. SEÇÃO DE FERRAMENTAS & MÉTRICAS CIENTÍFICAS */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
                Ferramentas & Análise Científica
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

                {onOpenPlateCalc && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenPlateCalc();
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#121c33] hover:bg-[#16233f] border border-slate-750 text-left transition-colors cursor-pointer min-h-[48px]"
                  >
                    <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 shrink-0">
                      <Disc className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <span className="block text-xs font-bold text-white">Calculadora de Anilhas</span>
                      <span className="block text-[10px] text-slate-400">Distribuição exata na barra</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                )}

                {onOpenCadence && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenCadence();
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#121c33] hover:bg-[#16233f] border border-slate-750 text-left transition-colors cursor-pointer min-h-[48px]"
                  >
                    <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 shrink-0">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <span className="block text-xs font-bold text-white">Metrônomo de Cadência</span>
                      <span className="block text-[10px] text-slate-400">Tempo sob tensão (TUT 3-0-1-0)</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                )}

                {onOpenNutrition && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenNutrition();
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#121c33] hover:bg-[#16233f] border border-slate-750 text-left transition-colors cursor-pointer min-h-[48px]"
                  >
                    <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
                      <Apple className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <span className="block text-xs font-bold text-white">Calculadora de TMB & Macros</span>
                      <span className="block text-[10px] text-slate-400">Cutting -10%, gordura máx 20%</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                )}

                {onOpenDeloadAssistant && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenDeloadAssistant();
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#121c33] hover:bg-[#16233f] border border-slate-750 text-left transition-colors cursor-pointer min-h-[48px]"
                  >
                    <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="block text-xs font-bold text-white">Assistente de Deload</span>
                        {isDeloadActive && (
                          <span className="text-[9px] font-bold bg-amber-500 text-slate-950 px-1 rounded">ATIVO</span>
                        )}
                      </div>
                      <span className="block text-[10px] text-slate-400">Monitoramento de fadiga central</span>
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

            {/* 3. APOIO AO CRIADOR (PIX) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-[#161226] to-[#121c33] border border-rose-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                  <Heart className="w-4 h-4 fill-rose-400 text-rose-400" />
                  <span>Apoie o Criador Alex Vieira</span>
                </div>
                <span className="text-[10px] font-mono text-rose-400 font-bold bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30">
                  PIX
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Gostou do aplicativo? Qualquer contribuição voluntária ajuda a manter a plataforma rápida, sem anúncios e com atualizações contínuas!
              </p>
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 font-mono text-[11px] font-bold text-white bg-slate-900/90 px-3 py-2 rounded-xl border border-slate-750 truncate select-all">
                  alex.vieira.123@hotmail.com
                </div>
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-md shadow-rose-500/25 active:scale-95 transition-all cursor-pointer"
                >
                  {pixCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar PIX</span>
                    </>
                  )}
                </button>
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
