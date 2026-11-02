/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../utils/theme';

interface ThemeToggleProps {
  variant?: 'compact' | 'full' | 'segmented';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { theme, isDark, toggleTheme, setTheme } = useTheme();

  if (variant === 'segmented') {
    return (
      <div 
        className={`flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 transition-colors ${className}`}
        role="group"
        aria-label="Selecionar tema visual"
      >
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            isDark
              ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-pressed={isDark}
        >
          <Moon className="w-3.5 h-3.5 text-sky-400" />
          <span>Escuro</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            !isDark
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-pressed={!isDark}
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>Claro</span>
        </button>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left hover:bg-slate-800/60 ${className}`}
        aria-label={isDark ? 'Alternar para Modo Claro (Maior Legibilidade)' : 'Alternar para Modo Escuro (Alto Contraste)'}
        title={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
      >
        <div className="flex items-center gap-2.5">
          {isDark ? (
            <Moon className="w-4 h-4 text-sky-400 shrink-0" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500 shrink-0" />
          )}
          <div>
            <span className="block font-bold">Tema Visual</span>
            <span className="block text-[10px] text-slate-400">
              {isDark ? 'Modo Escuro (Alto Contraste)' : 'Modo Claro (Alta Legibilidade)'}
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border bg-slate-800 text-slate-300 border-slate-700">
          {isDark ? 'Escuro' : 'Claro'}
        </span>
      </button>
    );
  }

  // Compact variant (icon button for Header and quick bars)
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center active:scale-95 ${
        isDark
          ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700 hover:border-slate-600'
          : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-300 shadow-sm'
      } ${className}`}
      aria-label={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
      title={isDark ? 'Mudar para Modo Claro (Alta Legibilidade)' : 'Mudar para Modo Escuro (Alto Contraste)'}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-sky-600 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
};
