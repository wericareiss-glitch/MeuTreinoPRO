/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

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
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-5 rounded-2xl bg-[#0f172a] border border-rose-500/30 text-center my-4 shadow-xl">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto mb-2.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">
            {this.props.fallbackTitle || (this.props.sectionName ? `Falha em: ${this.props.sectionName}` : 'Falha temporária nesta seção')}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-3">
            Ocorreu um erro isolado ao carregar este bloco. O restante do aplicativo e seus treinos permanecem seguros e ativos.
          </p>
          {this.state.error && (
            <p className="text-[11px] font-mono text-rose-300/80 bg-rose-950/40 p-2 rounded-lg max-w-sm mx-auto mb-3 truncate">
              {this.state.error.message}
            </p>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tentar Novamente</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
