/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, 
  LogOut, 
  Trash2, 
  MoreVertical, 
  Sparkles, 
  Lock, 
  Cloud 
} from 'lucide-react';
import { UserProfile } from '../../types/workout';
import { useI18n } from '../../utils/i18n';
import { ThemeToggle } from '../ThemeToggle';

export interface ProfileHeaderCardProps {
  user: UserProfile;
  onSwitchProfile?: () => void;
  onLogout: () => void;
  onRequestDelete?: () => void;
  isLinkingGoogle: boolean;
  linkGoogleError: string | null;
  onConnectGoogle: () => void;
}

export const ProfileHeaderCard: React.FC<ProfileHeaderCardProps> = ({
  user,
  onSwitchProfile,
  onLogout,
  onRequestDelete,
  isLinkingGoogle,
  linkGoogleError,
  onConnectGoogle,
}) => {
  const { t } = useI18n();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  return (
    <div className="pb-6 border-b border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {user.name}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {t.badgePro}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              @{user.username}
            </p>
          </div>
        </div>

        {/* Action Zone: Theme Toggle & Options */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <ThemeToggle variant="segmented" />

          {/* Desktop Quick Buttons */}
          {onSwitchProfile && (
            <button
              type="button"
              onClick={onSwitchProfile}
              className="hidden sm:flex px-3.5 py-2 rounded-xl text-xs font-bold text-sky-300 bg-sky-950/20 hover:bg-sky-950/40 border border-sky-900/40 items-center gap-1.5 transition-all cursor-pointer"
              title="Trocar de conta/atleta"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Trocar Perfil</span>
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="hidden sm:flex px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Desconectar</span>
          </button>

          {onRequestDelete && (
            <button
              type="button"
              onClick={onRequestDelete}
              className="hidden sm:flex px-3.5 py-2 rounded-xl text-xs font-bold text-rose-400 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 items-center gap-1.5 transition-all cursor-pointer"
              title="Excluir perfil permanentemente"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Perfil</span>
            </button>
          )}

          {/* Mobile 3-Dots Menu Trigger */}
          <div className="relative sm:hidden" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className="w-9 h-9 rounded-xl bg-slate-800 text-slate-200 hover:text-white border border-slate-700 flex items-center justify-center transition-colors cursor-pointer active:scale-95 shadow-sm"
              title="Opções do perfil"
              aria-label="Opções do perfil"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-10 w-52 bg-[#0c1424] border border-slate-700 rounded-2xl shadow-2xl p-1.5 z-40 animate-fadeIn space-y-1">
                {onSwitchProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onSwitchProfile();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-sky-300 hover:bg-sky-950/40 text-left transition-colors cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Trocar Perfil / Atleta</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 text-left transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Desconectar</span>
                </button>

                {onRequestDelete && (
                  <div className="pt-1 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        onRequestDelete();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 text-left transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Excluir Perfil</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visitor Warning & Promotion Banner */}
      {user.isVisitor && (
        <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#101b31] to-sky-950/40 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-white">Você está como Visitante (Sessão Offline)</h3>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                Conecte sua Conta Google para salvar seus treinos e metas na nuvem com autenticação segura de plataforma.
              </p>
              {linkGoogleError && (
                <p className="text-[11px] font-bold text-rose-400 mt-1">{linkGoogleError}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={isLinkingGoogle}
            onClick={onConnectGoogle}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white hover:bg-slate-100 text-slate-900 transition-all shadow-md active:scale-95 cursor-pointer shrink-0 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{isLinkingGoogle ? 'Conectando...' : 'Salvar na Nuvem com Google'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
