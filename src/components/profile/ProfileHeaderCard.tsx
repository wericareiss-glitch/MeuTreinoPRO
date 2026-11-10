/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  LogOut, 
  Trash2, 
  MoreVertical, 
  Sparkles, 
  Lock, 
  Cloud,
  User,
  Heart,
  Copy,
  Check
} from 'lucide-react';
import { UserProfile } from '../../types/workout';
import { useI18n } from '../../utils/i18n';
import { ThemeToggle } from '../ThemeToggle';
import { ActionSheet, ActionSheetItem } from '../common/ActionSheet';

export interface ProfileHeaderCardProps {
  user: UserProfile;
  onSwitchProfile?: () => void;
  onLogout: () => void;
  onRequestDelete?: () => void;
  onOpenDonation?: () => void;
  isLinkingGoogle: boolean;
  linkGoogleError: string | null;
  onConnectGoogle: () => void;
}

export const ProfileHeaderCard: React.FC<ProfileHeaderCardProps> = ({
  user,
  onSwitchProfile,
  onLogout,
  onRequestDelete,
  onOpenDonation,
  isLinkingGoogle,
  linkGoogleError,
  onConnectGoogle,
}) => {
  const { t } = useI18n();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <div className="relative pb-6 border-b border-theme-subtle">
      {/* Botão de 3 Pontos com Fundo Transparente no Topo à Direita */}
      <div className="absolute top-0 right-0 z-30">
        <button
          type="button"
          onClick={() => setShowProfileMenu(true)}
          className="w-9 h-9 rounded-xl bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-theme-muted hover:text-theme-heading flex items-center justify-center transition-colors cursor-pointer active:scale-95"
          title="Opções do perfil"
          aria-label="Opções do perfil"
        >
          <MoreVertical className="w-5 h-5" />
        </button>

        {/* Página / Bottom Sheet com as Opções para Fácil Acesso com Uma Mão no Mobile */}
        <ActionSheet
          isOpen={showProfileMenu}
          onClose={() => setShowProfileMenu(false)}
          title="Opções do Perfil"
          subtitle={`@${user.username} · ${user.name}`}
          icon={<User className="w-5 h-5 text-emerald-400" />}
        >
          {onOpenDonation && (
            <ActionSheetItem
              onClick={() => {
                setShowProfileMenu(false);
                onOpenDonation();
              }}
              icon={<Heart className="w-5 h-5 text-pink-400" />}
              title="Apoiar o Projeto (PIX)"
              description="Contribuição voluntária para manter o app no ar e sem anúncios"
            />
          )}

          {onSwitchProfile && (
            <ActionSheetItem
              onClick={() => {
                setShowProfileMenu(false);
                onSwitchProfile();
              }}
              icon={<Users className="w-5 h-5" />}
              title="Trocar Perfil / Atleta"
              description="Alternar para outra conta ou atleta cadastrado"
            />
          )}

          <ActionSheetItem
            onClick={() => {
              setShowProfileMenu(false);
              onLogout();
            }}
            icon={<LogOut className="w-5 h-5" />}
            title="Desconectar"
            description="Sair da sessão deste dispositivo com segurança"
          />

          {onRequestDelete && (
            <div className="pt-2 mt-2 border-t border-theme-menu-subtle">
              <ActionSheetItem
                onClick={() => {
                  setShowProfileMenu(false);
                  onRequestDelete();
                }}
                icon={<Trash2 className="w-5 h-5" />}
                title="Excluir Perfil"
                description="Remover todos os dados e histórico permanentemente"
                variant="danger"
              />
            </div>
          )}
        </ActionSheet>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-11">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-theme-heading tracking-tight">
                {user.name}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {t.badgePro}
              </span>
            </div>
            <p className="text-xs text-theme-muted font-mono mt-0.5">
              @{user.username}
            </p>
          </div>
        </div>

        {/* Action Zone: Theme Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <ThemeToggle variant="segmented" />
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
                <div className="mt-2 p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-[11px] text-rose-300 space-y-1.5">
                  <p className="font-semibold text-rose-200">{linkGoogleError}</p>
                  {linkGoogleError.includes('domínios autorizados') && (
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined' && navigator.clipboard) {
                          navigator.clipboard.writeText(window.location.hostname);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }
                      }}
                      className="py-1 px-2.5 rounded bg-rose-900/60 hover:bg-rose-900 text-white font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Domínio copiado!' : `Copiar Domínio (${typeof window !== 'undefined' ? window.location.hostname : ''})`}</span>
                    </button>
                  )}
                </div>
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
