/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useI18n } from '../utils/i18n';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  sectionName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const SectionErrorFallback: React.FC<{
  fallbackTitle?: string;
  sectionName?: string;
  onRetry: () => void;
}> = ({ fallbackTitle, sectionName, onRetry }) => {
  const { t } = useI18n();
  return (
    <div className="p-5 rounded-2xl bg-[#0f172a] border border-rose-500/30 text-center my-4 shadow-xl">
      <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto mb-2.5">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-bold text-white mb-1">
        {fallbackTitle || (sectionName ? `${sectionName}` : t.common.errorSectionFallback)}
      </h3>
      <p className="text-xs text-slate-400 max-w-md mx-auto mb-3">
        {t.common.errorSectionDesc}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>{t.common.retry}</span>
      </button>
    </div>
  );
};

export class SectionErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Section Error caught by SectionErrorBoundary:', error, errorInfo);
    const msg = error?.message || '';
    if (
      typeof window !== 'undefined' &&
      (msg.includes("reading 'useState'") ||
        msg.includes("reading 'useRef'") ||
        msg.includes("reading 'useEffect'") ||
        msg.includes('Invalid hook call') ||
        msg.includes('Failed to fetch dynamically imported module'))
    ) {
      if ('caches' in window) {
        caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).catch(() => {});
      }
      const reloadKey = 'meutreino_section_reload';
      const last = Number(sessionStorage.getItem(reloadKey) || '0');
      if (Date.now() - last > 3000) {
        sessionStorage.setItem(reloadKey, String(Date.now()));
        window.location.reload();
      }
    }
  }

  private handleRetry = () => {
    const msg = this.state.error?.message || '';
    if (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes("reading 'useState'") ||
      msg.includes("reading 'useRef'") ||
      msg.includes("reading 'useEffect'") ||
      msg.includes('Invalid hook call')
    ) {
      if ('caches' in window) {
        caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).catch(() => {});
      }
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <SectionErrorFallback
          fallbackTitle={this.props.fallbackTitle}
          sectionName={this.props.sectionName}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
