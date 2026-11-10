/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  children: React.ReactNode;
  closeLabel?: string;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  badge,
  children,
  closeLabel = 'Fechar',
}) => {
  // Prevent body scrolling when the ActionSheet is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4">
          {/* Backdrop escurecido com toque para fechar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Página / Bottom Sheet de Opções otimizada para uso mobile com uma mão */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose();
              }
            }}
            className="relative z-10 w-full sm:max-w-md bg-theme-surface border-t sm:border border-theme-menu rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            style={{ overscrollBehavior: 'contain' }}
            role="dialog"
            aria-modal="true"
          >
            {/* Barra puxador (drag handle) para mobile */}
            <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing sm:hidden">
              <div className="w-12 h-1.5 rounded-full bg-slate-500/40" />
            </div>

            {/* Cabeçalho do Menu de Opções */}
            <div className="px-5 pt-3 pb-3 border-b border-theme-menu-subtle flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {icon && (
                  <div className="w-10 h-10 rounded-2xl bg-theme-surface-secondary text-theme-heading border border-theme-menu-subtle flex items-center justify-center shrink-0">
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-theme-heading truncate">
                      {title}
                    </h3>
                    {badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {badge}
                      </span>
                    )}
                  </div>
                  {subtitle && (
                    <p className="text-xs text-theme-muted truncate mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-theme-muted hover:text-theme-heading flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de Opções (Amplas e fáceis de tocar com o polegar) */}
            <div className="p-4 space-y-2 overflow-y-auto max-h-[60vh] overscroll-contain">
              {children}
            </div>

            {/* Botão de Fechar no rodapé (alcance imediato do polegar) */}
            <div className="p-3 border-t border-theme-menu-subtle bg-theme-surface">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-2xl bg-theme-surface-secondary hover:bg-black/5 dark:hover:bg-white/10 text-theme-muted hover:text-theme-heading font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer active:scale-[0.99] border border-theme-menu-subtle"
              >
                {closeLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export interface ActionSheetItemProps {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description?: string;
  variant?: 'default' | 'danger' | 'accent';
  badge?: string;
  disabled?: boolean;
}

export const ActionSheetItem: React.FC<ActionSheetItemProps> = ({
  onClick,
  icon,
  title,
  description,
  variant = 'default',
  badge,
  disabled = false,
}) => {
  const isDanger = variant === 'danger';
  const isAccent = variant === 'accent';

  let itemStyle = 'bg-theme-surface-secondary hover:bg-white/5 border-theme-menu-subtle text-theme-heading';
  let iconStyle = 'bg-theme-menu text-theme-muted border-theme-menu';

  if (isDanger) {
    itemStyle = 'bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/30 text-rose-400';
    iconStyle = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  } else if (isAccent) {
    itemStyle = 'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
    iconStyle = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full min-h-[54px] p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3.5 transition-all cursor-pointer active:scale-[0.99] ${itemStyle} ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconStyle}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold block truncate">
              {title}
            </span>
            {badge && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <span className="text-xs text-theme-muted block truncate mt-0.5">
              {description}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};
