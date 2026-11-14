/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  DownloadCloud, 
  UploadCloud, 
  Database,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Laptop,
  Layers,
  History,
  Activity,
  User
} from 'lucide-react';
import { UserProfile } from '../types/workout';
import { auth, syncAllToFirebase, fetchUserDataFromFirebase } from '../services/firebase';
import { verifyAndMergeDatabase, IntegrityReport } from '../services/dataIntegritySync';
import { safeStorage } from '../utils/storage';
import { soundManager } from '../utils/audio';

interface FirebaseSyncCardProps {
  user: UserProfile;
  onRefreshData?: () => void;
}

export const FirebaseSyncCard: React.FC<FirebaseSyncCardProps> = ({ user, onRefreshData }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isVerifyingIntegrity, setIsVerifyingIntegrity] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return safeStorage.get<string | null>(`firebase_last_sync_${user.id}`, null);
  });

  const [integrityReport, setIntegrityReport] = useState<IntegrityReport | null>(() => {
    return safeStorage.get<IntegrityReport | null>(`firebase_last_integrity_report_${user.id}`, null);
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const isCloudConnected = Boolean(auth.currentUser && !user.isVisitor && !user.id.startsWith('user_guest_'));
  // Email ou ID da conta autenticada
  const activeEmail = auth.currentUser?.email || (user.isVisitor ? 'Atleta Visitante (Local)' : user.email || user.name);
  const isOnline = navigator.onLine;

  const formatLastSync = (isoString: string | null) => {
    if (!isoString) return 'Ainda não sincronizado';
    try {
      const d = new Date(isoString);
      return `Última verificação: ${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return 'Sincronizado recentemente';
    }
  };

  // 1. Verificação de integridade e merge automático com Firestore
  const handleVerifyAndMerge = async () => {
    if (isVerifyingIntegrity || !isOnline) return;
    if (!auth.currentUser || user.isVisitor || user.id.startsWith('user_guest_')) {
      setFeedback({
        type: 'info',
        message: 'Modo visitante / local ativo. Seus dados estão salvos com segurança no aparelho. Conecte sua conta Google para sincronizar com a nuvem.'
      });
      return;
    }
    setIsVerifyingIntegrity(true);
    setFeedback({ type: 'info', message: 'Comparando seus dados locais com a nuvem...' });
    soundManager.vibrate(20);

    try {
      const report = await verifyAndMergeDatabase(user.id, { force: true });
      setIntegrityReport(report);
      setLastSyncTime(report.timestamp);

      if (report.status === 'error') {
        setFeedback({ type: 'error', message: 'Não foi possível completar a verificação. Verifique sua conexão.' });
      } else if (report.discrepanciesResolved > 0) {
        setFeedback({ 
          type: 'success', 
          message: `Integridade restaurada! ${report.discrepanciesResolved} item(ns) foram mesclados automaticamente entre seus dispositivos.` 
        });
        soundManager.vibrate([40, 60, 40]);
        setShowDetails(true);
      } else {
        setFeedback({ 
          type: 'success', 
          message: 'Tudo sincronizado! Todos os seus treinos, rotinas e medidas estão salvos na nuvem.' 
        });
        soundManager.vibrate(30);
      }

      if (onRefreshData) {
        onRefreshData();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erro inesperado na verificação de integridade.' });
    } finally {
      setIsVerifyingIntegrity(false);
      setTimeout(() => {
        setFeedback((prev) => (prev?.type === 'info' ? null : prev));
      }, 5000);
    }
  };

  // 2. Envio manual direto de todos os dados locais
  const handleSyncNow = async () => {
    if (isSyncing || !isOnline) return;
    if (!auth.currentUser || user.isVisitor || user.id.startsWith('user_guest_')) {
      setFeedback({
        type: 'info',
        message: 'Conecte sua conta Google no perfil ou na tela de login para salvar seus dados na nuvem.'
      });
      return;
    }
    setIsSyncing(true);
    setFeedback(null);
    try {
      const success = await syncAllToFirebase(user.id, user);
      if (success) {
        const nowIso = new Date().toISOString();
        safeStorage.set(`firebase_last_sync_${user.id}`, nowIso);
        setLastSyncTime(nowIso);
        setFeedback({ type: 'success', message: 'Backup completo enviado para a nuvem com sucesso!' });
        soundManager.vibrate([30, 50, 30]);
      } else {
        setFeedback({ type: 'error', message: 'Não foi possível enviar agora. Verifique sua conexão.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erro inesperado no envio de dados.' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // 3. Download completo da nuvem
  const handleRestoreFromCloud = async () => {
    if (isRestoring || !isOnline) return;
    if (!auth.currentUser || user.isVisitor || user.id.startsWith('user_guest_')) {
      setFeedback({
        type: 'info',
        message: 'Conecte sua conta Google para restaurar seus treinos salvos na nuvem.'
      });
      return;
    }
    setIsRestoring(true);
    setFeedback(null);
    try {
      const remoteData = await fetchUserDataFromFirebase(user.id);
      if (remoteData) {
        if (remoteData.routines && remoteData.routines.length > 0) {
          safeStorage.set(`alex_u_${user.id}_routines`, remoteData.routines);
        }
        if (remoteData.sessions && remoteData.sessions.length > 0) {
          safeStorage.set(`alex_u_${user.id}_sessions`, remoteData.sessions);
        }
        if (remoteData.measurements && remoteData.measurements.length > 0) {
          safeStorage.set(`alex_u_${user.id}_measurements`, remoteData.measurements);
        }
        setFeedback({ type: 'success', message: 'Dados restaurados da nuvem para este aparelho com sucesso!' });
        soundManager.vibrate([40, 60, 40]);
        if (onRefreshData) {
          onRefreshData();
        }
      } else {
        setFeedback({ type: 'error', message: 'Nenhum dado encontrado na nuvem para esta conta.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erro ao baixar dados da nuvem.' });
    } finally {
      setIsRestoring(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  return (
    <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden transition-all hover:border-[#2a3b5a]">
      {/* Glow de fundo */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Backup & Sincronização na Nuvem
              </h3>
              {isCloudConnected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <Database className="w-3 h-3" />
                  Nuvem Conectada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  <Database className="w-3 h-3" />
                  Salvo no Aparelho
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Seus treinos e medidas sincronizados automaticamente entre seus dispositivos
            </p>
          </div>
        </div>

        {/* Indicador de Status */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs self-start sm:self-auto">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
          <span className="text-slate-200 font-medium">
            {isOnline ? 'Conexão Segura Ativa' : 'Modo Offline (Salva Local)'}
          </span>
        </div>
      </div>

      {/* Informações da Conta e Sincronismo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
              Conta do Atleta
            </span>
            <span className="text-xs font-semibold text-slate-200 truncate block">
              {activeEmail || user.name || 'Atleta Autenticado'}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
            <RefreshCw className="w-4 h-4 text-sky-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
              Integridade dos Dados
            </span>
            <span className="text-xs text-slate-300 truncate block">
              {formatLastSync(lastSyncTime)}
            </span>
          </div>
        </div>
      </div>

      {/* Mensagem de Feedback */}
      {feedback && (
        <div
          className={`mb-4 p-3 rounded-2xl border text-xs flex items-center gap-2.5 transition-all animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : feedback.type === 'info'
              ? 'bg-sky-950/40 border-sky-500/40 text-sky-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : feedback.type === 'info' ? (
            <RefreshCw className="w-4 h-4 shrink-0 text-sky-400 animate-spin" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Botão Principal: Verificar Integridade & Mesclar */}
      <div className="space-y-2.5 mb-4">
        <button
          type="button"
          onClick={handleVerifyAndMerge}
          disabled={isVerifyingIntegrity || !isOnline}
          className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.99] text-slate-950 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ShieldCheck className={`w-5 h-5 ${isVerifyingIntegrity ? 'animate-spin' : ''}`} />
          <span>
            {isVerifyingIntegrity
              ? 'Sincronizando Dados...'
              : 'Sincronizar e Verificar Dados'}
          </span>
        </button>

        {/* Ações Secundárias */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={isSyncing || !isOnline}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-50 transition-all cursor-pointer"
            title="Enviar todos os treinos e registros para a nuvem"
          >
            <UploadCloud className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Enviando...' : 'Enviar para a Nuvem'}</span>
          </button>

          <button
            type="button"
            onClick={handleRestoreFromCloud}
            disabled={isRestoring || !isOnline}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-50 transition-all cursor-pointer"
            title="Restaurar dados salvos na nuvem para este aparelho"
          >
            <DownloadCloud className={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
            <span>{isRestoring ? 'Baixando...' : 'Restaurar da Nuvem'}</span>
          </button>
        </div>
      </div>

      {/* Botão de Expansão do Relatório de Sincronização */}
      <button
        type="button"
        onClick={() => setShowDetails((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Resumo da Sincronização</span>
          {integrityReport && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
              {integrityReport.status === 'healthy' ? 'Sincronizado' : `${integrityReport.discrepanciesResolved} atualizados`}
            </span>
          )}
        </span>
        {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Painel Expansível de Detalhes da Integridade */}
      {showDetails && (
        <div className="mt-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3 animate-fadeIn text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Sessões / Histórico */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <History className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-semibold text-[11px]">Treinos</span>
              </div>
              <div className="text-slate-200 font-mono text-xs">
                {integrityReport?.details.sessions.mergedTotal ?? '—'}
                <span className="text-[10px] text-slate-500 block">
                  {integrityReport?.details.sessions.localCount ?? 0} loc / {integrityReport?.details.sessions.remoteCount ?? 0} nuvem
                </span>
              </div>
            </div>

            {/* Rotinas */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-semibold text-[11px]">Rotinas</span>
              </div>
              <div className="text-slate-200 font-mono text-xs">
                {integrityReport?.details.routines.mergedTotal ?? '—'}
                <span className="text-[10px] text-slate-500 block">
                  {integrityReport?.details.routines.localCount ?? 0} loc / {integrityReport?.details.routines.remoteCount ?? 0} nuvem
                </span>
              </div>
            </div>

            {/* Medidas */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-[11px]">Medidas</span>
              </div>
              <div className="text-slate-200 font-mono text-xs">
                {integrityReport?.details.measurements.mergedTotal ?? '—'}
                <span className="text-[10px] text-slate-500 block">
                  {integrityReport?.details.measurements.localCount ?? 0} loc / {integrityReport?.details.measurements.remoteCount ?? 0} nuvem
                </span>
              </div>
            </div>

            {/* Perfil */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-[11px]">Perfil</span>
              </div>
              <div className="text-emerald-400 font-medium text-[11px]">
                {integrityReport?.details.profile.status === 'in_sync'
                  ? 'Sincronizado'
                  : integrityReport?.details.profile.status === 'merged_to_local'
                  ? 'Atualizado'
                  : 'Alinhado'}
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-200 font-semibold block mb-0.5">
                Sincronização Multi-Dispositivo Ativa
              </span>
              O aplicativo sincroniza automaticamente seus treinos ao reconectar à internet, permitindo usar o celular na academia e o computador em casa sem perder nenhuma série.
            </div>
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-500 text-center mt-3">
        ✓ Sincronização automática entre este aparelho e a nuvem ativada
      </p>
    </div>
  );
};
