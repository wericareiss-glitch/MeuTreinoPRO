/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { safeStorage } from '../utils/storage';

const SUPABASE_URL_KEY = 'meutreino_supabase_url';
const SUPABASE_KEY_KEY = 'meutreino_supabase_anon_key';
const SUPABASE_LAST_SYNC_KEY = 'meutreino_last_cloud_sync_at';
const SUPABASE_SAVED_SESSION_KEY = 'meutreino_supabase_saved_email';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface MeuTreinoSyncBundle {
  version: number;
  userId: string;
  updatedAt: string;
  sourceDevice?: string;
  userProfile?: any;
  routines?: any[];
  sessions?: any[];
  workoutLogs?: {
    currentLogs?: Record<string, any>;
    historyLogs?: Record<string, any>;
  };
  historyLogs?: Record<string, any>;
  currentLogs?: Record<string, any>;
  measurements?: any[];
  workoutNotes?: string;
  settings?: Record<string, any>;
  activeRoutineId?: string | null;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error' | 'unconfigured';

// URL e chave padrão caso o usuário não tenha configurado credenciais próprias
const DEFAULT_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const DEFAULT_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

const BG_SYNC_DB_NAME = 'meutreino_bg_sync_db';
const BG_SYNC_STORE_NAME = 'sync_outbox';
const BG_SYNC_TAG_BUFFER = 'meutreino-workout-sync-buffer';
const BG_SYNC_TAG_CRITICAL = 'meutreino-critical-workout-sync';

export interface BackgroundSyncOutboxRecord {
  id: string;
  userId: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  bundle: MeuTreinoSyncBundle;
  workoutLogs: {
    currentLogs: Record<string, any>;
    historyLogs: Record<string, any>;
  };
  sessions: any[];
  updatedAt: string;
  status: 'pending' | 'syncing';
}

let supabaseInstance: SupabaseClient | null = null;
let realtimeChannel: any = null;
let syncBroadcastChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    syncBroadcastChannel = new BroadcastChannel('meutreino_realtime_sync');
  } catch {
    syncBroadcastChannel = null;
  }
}

/**
 * Abre o banco IndexedDB compartilhado com o Service Worker para o Background Sync Outbox
 */
function openBackgroundSyncOutboxDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(BG_SYNC_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(BG_SYNC_STORE_NAME)) {
          db.createObjectStore(BG_SYNC_STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function sanitizeProfileForSync(profile: any): any {
  if (!profile || typeof profile !== 'object') return undefined;
  const copy = { ...profile };
  delete copy.password;
  return copy;
}

function sanitizeRemoteObject<T>(input: T): T {
  if (input === null || typeof input !== 'object') return input;
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeRemoteObject(item)) as unknown as T;
  }
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(input as Record<string, any>)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    clean[k] = sanitizeRemoteObject(v);
  }
  return clean as T;
}

export function isValidHttpsSupabaseUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    // Bloqueia endereços locais/privados (prevenção de SSRF)
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '169.254.169.254' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return Boolean(host && host.includes('.'));
  } catch {
    return false;
  }
}

/**
 * Sincroniza um snapshot dos dados de treino com o cache Stale-While-Revalidate do Service Worker
 */
function notifyServiceWorkerWorkoutSnapshot(bundle: MeuTreinoSyncBundle): void {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      const safeBundle: MeuTreinoSyncBundle = {
        ...bundle,
        userProfile: sanitizeProfileForSync(bundle.userProfile),
      };
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_WORKOUT_DATA_SNAPSHOT',
        payload: safeBundle,
      });
    } catch {
      // Ignora caso o Service Worker ainda esteja ativando
    }
  }
}

export function getStoredSupabaseConfig(): SupabaseConfig {
  const customUrl = safeStorage.get<string>(SUPABASE_URL_KEY, '');
  const customKey = safeStorage.get<string>(SUPABASE_KEY_KEY, '');

  return {
    url: customUrl || DEFAULT_URL,
    anonKey: customKey || DEFAULT_KEY,
  };
}

export function saveStoredSupabaseConfig(config: SupabaseConfig): void {
  const cleanUrl = (config.url || '').trim();
  const cleanKey = (config.anonKey || '').trim();
  safeStorage.set(SUPABASE_URL_KEY, cleanUrl);
  safeStorage.set(SUPABASE_KEY_KEY, cleanKey);
  // Reset instance to reinitialize with new credentials
  supabaseInstance = null;
}

export function isSupabaseConfigured(): boolean {
  const cfg = getStoredSupabaseConfig();
  return Boolean(cfg.url && cfg.anonKey && isValidHttpsSupabaseUrl(cfg.url));
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const cfg = getStoredSupabaseConfig();
  if (!cfg.url || !cfg.anonKey || !isValidHttpsSupabaseUrl(cfg.url)) {
    return null;
  }

  try {
    const activeUid = safeStorage.get<string | null>('alex_active_user_id', null) || '';
    supabaseInstance = createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: {
        headers: activeUid ? { 'x-meutreino-user-id': activeUid } : {},
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    return supabaseInstance;
  } catch (err) {
    console.warn('[Supabase] Erro ao instanciar cliente:', err);
    return null;
  }
}

export async function testSupabaseConnection(
  url: string,
  anonKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!url.startsWith('https://')) {
      return { success: false, error: 'A URL do Supabase deve começar com https://' };
    }
    const testClient = createClient(url, anonKey);
    const { error } = await testClient.auth.getSession();
    if (error && !error.message.includes('fetch')) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha na conexão com o servidor Supabase.' };
  }
}

export async function supabaseSignUp(
  email: string,
  password: string
): Promise<{ user?: SupabaseAuthUser; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { error: 'Supabase não configurado. Adicione a URL e Chave Anon do projeto primeiro.' };
  }

  try {
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data?.user) {
      safeStorage.set(SUPABASE_SAVED_SESSION_KEY, email);
      return { user: data.user };
    }
    return { error: 'Não foi possível cadastrar a conta.' };
  } catch (err: any) {
    return { error: err?.message || 'Erro inesperado no cadastro Supabase.' };
  }
}

export async function supabaseSignIn(
  email: string,
  password: string
): Promise<{ user?: SupabaseAuthUser; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { error: 'Supabase não configurado. Adicione a URL e Chave Anon do projeto primeiro.' };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data?.user) {
      safeStorage.set(SUPABASE_SAVED_SESSION_KEY, email);
      return { user: data.user };
    }
    return { error: 'Credenciais inválidas.' };
  } catch (err: any) {
    return { error: err?.message || 'Erro ao realizar login via Supabase.' };
  }
}

export async function supabaseSignOut(): Promise<void> {
  const client = getSupabaseClient();
  safeStorage.remove(SUPABASE_SAVED_SESSION_KEY);
  if (client) {
    try {
      await client.auth.signOut();
    } catch {}
  }
}

export async function getCurrentSupabaseUser(): Promise<SupabaseAuthUser | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data } = await client.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

export function getSavedSupabaseEmail(): string | null {
  return safeStorage.get<string | null>(SUPABASE_SAVED_SESSION_KEY, null);
}

export function getLastSyncTime(): string | null {
  return safeStorage.get<string | null>(SUPABASE_LAST_SYNC_KEY, null);
}

/**
 * Cria a bundle completa dos dados locais do atleta para sincronização
 */
export function buildLocalSyncBundle(userId: string, userProfile?: any): MeuTreinoSyncBundle {
  const routines = safeStorage.get(`alex_u_${userId}_routines`, []);
  const sessions = safeStorage.get(`alex_u_${userId}_sessions`, []);
  const historyLogs = safeStorage.get(`alex_u_${userId}_history_logs`, {});
  const currentLogs = safeStorage.get(`alex_u_${userId}_current_logs`, {});
  const measurements = safeStorage.get(`alex_u_${userId}_measurements`, []);
  const workoutNotes = safeStorage.get(`alex_u_${userId}_workout_notes`, '');
  const activeRoutineId = safeStorage.get(`alex_u_${userId}_active_routine_id`, null);

  const settings = {
    split: safeStorage.get(`alex_u_${userId}_split`, null),
    strategy: safeStorage.get(`alex_u_${userId}_strategy`, null),
    level: safeStorage.get(`alex_u_${userId}_level`, null),
    equip: safeStorage.get(`alex_u_${userId}_equip`, null),
    weeklyBudget: safeStorage.get(`alex_u_${userId}_weekly_budget`, null),
    periodizationStrategy: safeStorage.get(`alex_u_${userId}_periodization_strategy`, null),
  };

  const device =
    typeof navigator !== 'undefined'
      ? `${navigator.userAgent.includes('Mobile') ? '📱 Mobile' : '💻 Desktop'} (${
          navigator.platform || 'Web'
        })`
      : 'Web Client';

  return {
    version: 2,
    userId,
    updatedAt: new Date().toISOString(),
    sourceDevice: device,
    userProfile: sanitizeProfileForSync(userProfile),
    routines,
    sessions,
    workoutLogs: {
      currentLogs,
      historyLogs,
    },
    historyLogs,
    currentLogs,
    measurements,
    workoutNotes,
    settings,
    activeRoutineId,
  };
}

/**
 * Aplica uma bundle remota nos armazenamentos locais (safeStorage e IndexedDB) com sanitização contra Prototype Pollution
 */
export function applyRemoteSyncBundle(rawBundle: MeuTreinoSyncBundle): void {
  const bundle = sanitizeRemoteObject(rawBundle);
  if (!bundle || typeof bundle.userId !== 'string' || !bundle.userId.trim()) return;
  const uid = bundle.userId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');

  // Garante que apenas dados pertencentes ao usuário ativo (ou quando explicitamente solicitado) sejam aplicados
  const currentActiveUid = safeStorage.get<string | null>('alex_active_user_id', null);
  if (currentActiveUid && currentActiveUid !== uid) {
    return;
  }

  if (Array.isArray(bundle.routines)) safeStorage.set(`alex_u_${uid}_routines`, bundle.routines);
  if (Array.isArray(bundle.sessions)) safeStorage.set(`alex_u_${uid}_sessions`, bundle.sessions);
  const resolvedHistoryLogs = bundle.workoutLogs?.historyLogs || bundle.historyLogs;
  const resolvedCurrentLogs = bundle.workoutLogs?.currentLogs || bundle.currentLogs;
  if (resolvedHistoryLogs && typeof resolvedHistoryLogs === 'object' && !Array.isArray(resolvedHistoryLogs)) {
    safeStorage.set(`alex_u_${uid}_history_logs`, resolvedHistoryLogs);
  }
  if (
    resolvedCurrentLogs &&
    typeof resolvedCurrentLogs === 'object' &&
    !Array.isArray(resolvedCurrentLogs) &&
    Object.keys(resolvedCurrentLogs).length > 0
  ) {
    safeStorage.set(`alex_u_${uid}_current_logs`, resolvedCurrentLogs);
  }
  if (Array.isArray(bundle.measurements)) safeStorage.set(`alex_u_${uid}_measurements`, bundle.measurements);
  if (typeof bundle.workoutNotes === 'string') safeStorage.set(`alex_u_${uid}_workout_notes`, bundle.workoutNotes);
  if (bundle.activeRoutineId === null || typeof bundle.activeRoutineId === 'string') {
    safeStorage.set(`alex_u_${uid}_active_routine_id`, bundle.activeRoutineId);
  }

  if (bundle.settings && typeof bundle.settings === 'object') {
    if (bundle.settings.split) safeStorage.set(`alex_u_${uid}_split`, bundle.settings.split);
    if (bundle.settings.strategy) safeStorage.set(`alex_u_${uid}_strategy`, bundle.settings.strategy);
    if (bundle.settings.level) safeStorage.set(`alex_u_${uid}_level`, bundle.settings.level);
    if (bundle.settings.equip) safeStorage.set(`alex_u_${uid}_equip`, bundle.settings.equip);
    if (bundle.settings.weeklyBudget) safeStorage.set(`alex_u_${uid}_weekly_budget`, bundle.settings.weeklyBudget);
    if (bundle.settings.periodizationStrategy) {
      safeStorage.set(`alex_u_${uid}_periodization_strategy`, bundle.settings.periodizationStrategy);
    }
  }

  safeStorage.set(SUPABASE_LAST_SYNC_KEY, bundle.updatedAt || new Date().toISOString());
  notifyServiceWorkerWorkoutSnapshot(bundle);

  // Notifica o app para re-renderizar estados
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('meutreino:remote-sync-applied', { detail: bundle }));
  }
}

/**
 * Envia imediatamente a bundle consolidada para a tabela meutreino_sync em uma única requisição HTTP Upsert.
 */
async function executeDirectSupabaseUpsert(
  bundle: MeuTreinoSyncBundle
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();

  // Atualiza o snapshot no cache Stale-While-Revalidate do Service Worker
  notifyServiceWorkerWorkoutSnapshot(bundle);

  // Transmite via BroadcastChannel local para abas abertas no mesmo dispositivo
  if (syncBroadcastChannel) {
    try {
      syncBroadcastChannel.postMessage({ type: 'LOCAL_SYNC_BROADCAST', bundle });
    } catch {}
  }

  if (!client) {
    safeStorage.set(SUPABASE_LAST_SYNC_KEY, new Date().toISOString());
    return { success: true };
  }

  try {
    const payload = {
      user_id: bundle.userId,
      data: bundle,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client
      .from('meutreino_sync')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      if (
        error.message.includes('relation "meutreino_sync" does not exist') ||
        error.code === '42P01'
      ) {
        return {
          success: false,
          error:
            'Tabela "meutreino_sync" ainda não criada no Supabase. Crie a tabela no SQL Editor com o script fornecido.',
        };
      }
      return { success: false, error: error.message };
    }

    safeStorage.set(SUPABASE_LAST_SYNC_KEY, new Date().toISOString());
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha na conexão ao sincronizar.' };
  }
}

/**
 * Faz upload dos dados locais para o Supabase.
 * Por padrão (immediate = false), agrupa a alteração na janela de 5 segundos para economizar bateria e rede.
 * Quando immediate = true (ex: clique manual em "Sincronizar Agora"), executa o flush imediato do lote.
 */
export async function pushSyncBundleToSupabase(
  bundle: MeuTreinoSyncBundle,
  options?: { immediate?: boolean }
): Promise<{ success: boolean; error?: string; batched?: boolean }> {
  if (!bundle || !bundle.userId) {
    return { success: false, error: 'Bundle inválida sem userId.' };
  }

  // Se não for forçado como imediato, adiciona todas as entidades da bundle ao buffer de 5 segundos (5000ms)
  if (!options?.immediate) {
    bufferBundleMutations(bundle);
    return { success: true, batched: true };
  }

  // Se for imediato, cancela qualquer timer de 5s pendente e limpa o buffer local após envio
  if (batchCommitTimer) {
    clearTimeout(batchCommitTimer);
    batchCommitTimer = null;
    nextBatchFlushTimestamp = null;
  }

  const res = await executeDirectSupabaseUpsert(bundle);
  if (res.success) {
    clearUserMutationBuffer(bundle.userId);
    notifyQueueListeners(bundle.userId);
  }
  return res;
}

/**
 * Busca os dados remotos mais recentes do usuário no Supabase
 */
export async function pullSyncBundleFromSupabase(
  userId: string
): Promise<{ bundle?: MeuTreinoSyncBundle; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { error: 'Supabase não conectado.' };
  }

  try {
    const { data, error } = await client
      .from('meutreino_sync')
      .select('data, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return { error: error.message };
    }

    if (data?.data) {
      const bundle = data.data as MeuTreinoSyncBundle;
      notifyServiceWorkerWorkoutSnapshot(bundle);
      return { bundle };
    }

    return { error: 'Nenhum dado remoto encontrado para este atleta no Supabase.' };
  } catch (err: any) {
    return { error: err?.message || 'Erro ao carregar dados do Supabase.' };
  }
}

/**
 * Assina atualizações em Tempo Real (Supabase Realtime + BroadcastChannel)
 */
export function subscribeToRealtimeSync(
  userId: string,
  onRemoteChange: (bundle: MeuTreinoSyncBundle) => void
): () => void {
  // 1. Escuta canal local BroadcastChannel
  const handleBroadcast = (ev: MessageEvent) => {
    if (ev.data && ev.data.type === 'LOCAL_SYNC_BROADCAST') {
      const b = ev.data.bundle as MeuTreinoSyncBundle;
      if (b && b.userId === userId) {
        onRemoteChange(b);
      }
    }
  };

  if (syncBroadcastChannel) {
    syncBroadcastChannel.addEventListener('message', handleBroadcast);
  }

  // 2. Escuta Supabase Realtime se cliente disponível
  const client = getSupabaseClient();
  if (client) {
    try {
      if (realtimeChannel) {
        client.removeChannel(realtimeChannel);
      }

      realtimeChannel = client
        .channel(`meutreino-sync-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'meutreino_sync',
            filter: `user_id=eq.${userId}`,
          },
          (payload: any) => {
            if (payload?.new?.data) {
              const remoteBundle = payload.new.data as MeuTreinoSyncBundle;
              onRemoteChange(remoteBundle);
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[Supabase Realtime] Falha ao registrar realtime channel:', err);
    }
  }

  return () => {
    if (syncBroadcastChannel) {
      syncBroadcastChannel.removeEventListener('message', handleBroadcast);
    }
    if (client && realtimeChannel) {
      try {
        client.removeChannel(realtimeChannel);
        realtimeChannel = null;
      } catch {}
    }
  };
}

// ============================================================================
// FILA DE MUTAÇÕES OTIMIZADA COM DEBOUNCE DE 5 SEGUNDOS (5000ms) E
// PRIORIZAÇÃO CRÍTICA NO MODO 'FINISH WORKOUT' ('sessions' & 'measurements')
// ============================================================================
const OFFLINE_QUEUE_KEY_PREFIX = 'meutreino_offline_delta_queue_';
const OFFLINE_BYTES_SAVED_KEY = 'meutreino_delta_bytes_saved';
const BATCHED_CALLS_SAVED_KEY = 'meutreino_batched_calls_saved';
export const COMMIT_BATCH_WINDOW_MS = 5000; // Debounce padrão de 5 segundos (5000ms)
export const FINISH_WORKOUT_PRIORITY_DEBOUNCE_MS = 120; // Micro-janela de 120ms para envio prioritário imediato no modo 'finish workout'
const FINISH_WORKOUT_MODE_TTL_MS = 45000; // Janela de 45s de prioridade máxima após concluir treino

export type SyncDeltaEntity =
  | 'workoutLogs'
  | 'currentLogs'
  | 'historyLogs'
  | 'routines'
  | 'sessions'
  | 'measurements'
  | 'workoutNotes'
  | 'activeRoutineId'
  | 'settings';

export const CRITICAL_FINISH_WORKOUT_ENTITIES: readonly SyncDeltaEntity[] = [
  'sessions',
  'workoutLogs',
  'measurements',
];

const ENTITY_PRIORITY_WEIGHTS: Record<SyncDeltaEntity, number> = {
  sessions: 100,
  workoutLogs: 98,
  measurements: 95,
  historyLogs: 75,
  routines: 60,
  workoutNotes: 40,
  settings: 30,
  activeRoutineId: 20,
  currentLogs: 15,
};

export function isCriticalPriorityEntity(entity: SyncDeltaEntity): boolean {
  return (
    entity === 'sessions' ||
    entity === 'workoutLogs' ||
    entity === 'measurements'
  );
}

export interface OfflineDeltaMutation {
  id: string;
  userId: string;
  entity: SyncDeltaEntity;
  deltaPayload: any;
  updatedAt: string;
  approxBytes: number;
  mergedCount: number;
  priority?: 'critical' | 'normal';
}

export interface BatchSyncMetrics {
  pendingEntitiesCount: number;
  criticalPendingCount: number;
  totalMergedMutations: number;
  batchedCallsSaved: number;
  bytesSaved: number;
  isBatchTimerActive: boolean;
  isFinishWorkoutPriorityMode: boolean;
  batchWindowMs: number;
  nextFlushAt: number | null;
}

// Fila de mutações otimizada em memória: userId -> Map<SyncDeltaEntity, OfflineDeltaMutation>
const localMutationBufferMap = new Map<string, Map<SyncDeltaEntity, OfflineDeltaMutation>>();

// Estado do modo 'finish workout' por usuário para priorização de 'sessions' e 'measurements'
interface FinishWorkoutState {
  active: boolean;
  activatedAt: number;
  expireTimer: ReturnType<typeof setTimeout> | null;
}
const finishWorkoutModeMap = new Map<string, FinishWorkoutState>();

let isFlushingQueue = false;
let pendingFlushAfterCurrent = false;
let batchCommitTimer: ReturnType<typeof setTimeout> | null = null;
let priorityCommitTimer: ReturnType<typeof setTimeout> | null = null;
let bufferPersistTimer: ReturnType<typeof setTimeout> | null = null;
let nextBatchFlushTimestamp: number | null = null;
let activeBatchUserId: string | null = null;
let activeBatchUserProfile: any = null;

/**
 * Verifica se o usuário está atualmente no modo 'finish workout' (conclusão de treino).
 * Também detecta automaticamente se a tela de resumo pós-treino está aberta ou se há
 * uma sessão recém-finalizada na fila.
 */
export function isFinishWorkoutSyncMode(userId: string): boolean {
  if (!userId) return false;
  const state = finishWorkoutModeMap.get(userId);
  if (state?.active) {
    if (Date.now() - state.activatedAt <= FINISH_WORKOUT_MODE_TTL_MS) {
      return true;
    }
    state.active = false;
  }
  return false;
}

/**
 * Ativa ou desativa explicitamente o modo 'finish workout' para priorizar o upload imediato
 * de 'sessions' e 'measurements' antes de quaisquer outros dados secundários.
 */
export function setFinishWorkoutSyncMode(
  userId: string,
  active: boolean,
  userProfile?: any
): void {
  if (!userId) return;
  if (userProfile !== undefined) {
    activeBatchUserProfile = userProfile;
  }
  activeBatchUserId = userId;

  const existing = finishWorkoutModeMap.get(userId);
  if (existing?.expireTimer) {
    clearTimeout(existing.expireTimer);
  }

  if (!active) {
    finishWorkoutModeMap.set(userId, {
      active: false,
      activatedAt: 0,
      expireTimer: null,
    });
    notifyQueueListeners(userId);
    return;
  }

  const expireTimer = setTimeout(() => {
    const curr = finishWorkoutModeMap.get(userId);
    if (curr) {
      curr.active = false;
      curr.expireTimer = null;
      notifyQueueListeners(userId);
    }
  }, FINISH_WORKOUT_MODE_TTL_MS);

  finishWorkoutModeMap.set(userId, {
    active: true,
    activatedAt: Date.now(),
    expireTimer,
  });

  // Se já existirem mutações críticas ('sessions' ou 'measurements') na fila e estiver online,
  // agenda o envio prioritário imediato passando na frente dos demais dados.
  const userBuffer = getOrHydrateUserBuffer(userId);
  const hasCriticalPending =
    userBuffer.has('sessions') || userBuffer.has('measurements');

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (hasCriticalPending && isOnline && isSupabaseConfigured()) {
    schedulePriorityFinishWorkoutCommit(userId, userProfile);
  } else {
    notifyQueueListeners(userId);
  }
}

function sortMutationsByPriority(
  mutations: OfflineDeltaMutation[],
  prioritizeCritical: boolean
): OfflineDeltaMutation[] {
  return [...mutations].sort((a, b) => {
    if (prioritizeCritical) {
      const weightDiff =
        (ENTITY_PRIORITY_WEIGHTS[b.entity] || 0) -
        (ENTITY_PRIORITY_WEIGHTS[a.entity] || 0);
      if (weightDiff !== 0) return weightDiff;
    } else {
      const aCrit = isCriticalPriorityEntity(a.entity) ? 1 : 0;
      const bCrit = isCriticalPriorityEntity(b.entity) ? 1 : 0;
      if (bCrit !== aCrit) return bCrit - aCrit;
    }
    return a.updatedAt.localeCompare(b.updatedAt);
  });
}

function getOrHydrateUserBuffer(userId: string): Map<SyncDeltaEntity, OfflineDeltaMutation> {
  let userBuffer = localMutationBufferMap.get(userId);
  if (!userBuffer) {
    userBuffer = new Map<SyncDeltaEntity, OfflineDeltaMutation>();
    const persisted = safeStorage.get<OfflineDeltaMutation[]>(
      `${OFFLINE_QUEUE_KEY_PREFIX}${userId}`,
      []
    );
    for (const item of persisted) {
      if (item && item.entity) {
        userBuffer.set(item.entity, {
          ...item,
          priority: isCriticalPriorityEntity(item.entity) ? 'critical' : 'normal',
        });
      }
    }
    localMutationBufferMap.set(userId, userBuffer);
  }
  return userBuffer;
}

function persistUserBufferToStorage(userId: string): OfflineDeltaMutation[] {
  const userBuffer = getOrHydrateUserBuffer(userId);
  const serializedArray = sortMutationsByPriority(
    Array.from(userBuffer.values()),
    isFinishWorkoutSyncMode(userId)
  );
  safeStorage.set(`${OFFLINE_QUEUE_KEY_PREFIX}${userId}`, serializedArray);
  return serializedArray;
}

function scheduleDebouncedBufferPersistence(userId: string): void {
  if (bufferPersistTimer) {
    clearTimeout(bufferPersistTimer);
  }
  bufferPersistTimer = setTimeout(() => {
    bufferPersistTimer = null;
    persistUserBufferToStorage(userId);
    notifyQueueListeners(userId);
  }, 250);
}

function clearUserMutationBuffer(userId: string, flushedSnapshot?: Map<SyncDeltaEntity, string>): boolean {
  if (bufferPersistTimer) {
    clearTimeout(bufferPersistTimer);
    bufferPersistTimer = null;
  }
  const userBuffer = localMutationBufferMap.get(userId);
  if (!userBuffer) {
    safeStorage.set(`${OFFLINE_QUEUE_KEY_PREFIX}${userId}`, []);
    return false;
  }

  if (!flushedSnapshot) {
    userBuffer.clear();
    safeStorage.set(`${OFFLINE_QUEUE_KEY_PREFIX}${userId}`, []);
    return false;
  }

  // Remove apenas as mutações cujo timestamp coincide com o snapshot enviado.
  // Se uma entidade recebeu nova mutação durante o envio de rede, preserva-a na fila.
  for (const [entity, flushedUpdatedAt] of flushedSnapshot.entries()) {
    const current = userBuffer.get(entity);
    if (current && current.updatedAt === flushedUpdatedAt) {
      userBuffer.delete(entity);
    }
  }

  const remaining = sortMutationsByPriority(
    Array.from(userBuffer.values()),
    isFinishWorkoutSyncMode(userId)
  );
  safeStorage.set(`${OFFLINE_QUEUE_KEY_PREFIX}${userId}`, remaining);
  return remaining.length > 0;
}

function requestServiceWorkerBackgroundSync(isCriticalWorkoutData = false): void {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((reg: any) => {
        if (reg && 'sync' in reg && typeof reg.sync.register === 'function') {
          reg.sync.register(BG_SYNC_TAG_BUFFER).catch(() => {});
          if (isCriticalWorkoutData) {
            reg.sync.register(BG_SYNC_TAG_CRITICAL).catch(() => {});
          }
        }
      })
      .catch(() => {});
  }
}

/**
 * Armazena um pacote autossuficiente no Outbox do IndexedDB e Cache do Service Worker
 * contendo 'workoutLogs' (currentLogs + historyLogs), 'sessions' e credenciais do Supabase.
 * Assim, mesmo que o usuário feche o app prematuramente após o treino, o Service Worker
 * consegue enviar os dados ao Supabase via Background Sync API sem nenhuma aba aberta.
 */
export async function stageWorkoutDataForBackgroundSync(
  userId: string,
  userProfile?: any
): Promise<void> {
  if (!userId) return;
  const cfg = getStoredSupabaseConfig();
  const resolvedProfile = userProfile ?? activeBatchUserProfile;
  const bundle = buildLocalSyncBundle(userId, resolvedProfile);
  const queue = getOfflineMutationQueue(userId);
  if (queue.length > 0) {
    applyMutationsToBundle(bundle, queue);
  }
  bundle.updatedAt = new Date().toISOString();
  bundle.workoutLogs = {
    currentLogs: bundle.currentLogs || {},
    historyLogs: bundle.historyLogs || {},
  };

  const outboxRecord: BackgroundSyncOutboxRecord = {
    id: `outbox_${userId}`,
    userId,
    supabaseUrl: cfg.url || '',
    supabaseAnonKey: cfg.anonKey || '',
    bundle,
    workoutLogs: {
      currentLogs: bundle.currentLogs || {},
      historyLogs: bundle.historyLogs || {},
    },
    sessions: bundle.sessions || [],
    updatedAt: bundle.updatedAt,
    status: 'pending',
  };

  // 1. Grava no IndexedDB acessível pelo Service Worker em background
  try {
    const db = await openBackgroundSyncOutboxDB();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(BG_SYNC_STORE_NAME, 'readwrite');
          tx.objectStore(BG_SYNC_STORE_NAME).put(outboxRecord);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
  } catch {}

  // 2. Espelha para o Service Worker via postMessage + Cache Storage fallback
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'QUEUE_BACKGROUND_SYNC_OUTBOX',
          payload: outboxRecord,
        });
      } else {
        navigator.serviceWorker.ready
          .then((reg) => {
            reg.active?.postMessage({
              type: 'QUEUE_BACKGROUND_SYNC_OUTBOX',
              payload: outboxRecord,
            });
          })
          .catch(() => {});
      }
    } catch {}
  }

  // 3. Registra as tags na Background Sync API do navegador
  requestServiceWorkerBackgroundSync(true);
}

/**
 * Remove o registro pendente do Outbox do IndexedDB quando a sincronização já foi confirmada.
 */
async function clearBackgroundSyncOutboxEntry(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const db = await openBackgroundSyncOutboxDB();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(BG_SYNC_STORE_NAME, 'readwrite');
          tx.objectStore(BG_SYNC_STORE_NAME).delete(`outbox_${userId}`);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
  } catch {}

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_BACKGROUND_SYNC_OUTBOX',
        payload: { id: `outbox_${userId}`, userId },
      });
    } catch {}
  }
}

/**
 * Dispara um POST REST com `keepalive: true` para o Supabase.
 * O navegador garante a entrega da requisição mesmo se a aba/app for fechada imediatamente.
 */
function executeKeepaliveSupabaseUpsert(userId: string, userProfile?: any): void {
  if (!userId || typeof fetch === 'undefined') return;
  const cfg = getStoredSupabaseConfig();
  if (!cfg.url || !cfg.anonKey || !isValidHttpsSupabaseUrl(cfg.url)) return;

  try {
    const resolvedProfile = userProfile ?? activeBatchUserProfile;
    const bundle = buildLocalSyncBundle(userId, resolvedProfile);
    const queue = getOfflineMutationQueue(userId);
    if (queue.length > 0) {
      applyMutationsToBundle(bundle, queue);
    }
    bundle.updatedAt = new Date().toISOString();
    bundle.workoutLogs = {
      currentLogs: bundle.currentLogs || {},
      historyLogs: bundle.historyLogs || {},
    };

    const endpoint = `${cfg.url.replace(/\/+$/, '')}/rest/v1/meutreino_sync?on_conflict=user_id`;
    fetch(endpoint, {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
        'x-meutreino-user-id': userId,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        data: bundle,
        updated_at: bundle.updatedAt,
      }),
    }).catch(() => {});
  } catch {}
}

function notifyQueueListeners(userId: string) {
  if (typeof window !== 'undefined') {
    const queue = getOfflineMutationQueue(userId);
    const metrics = getBatchSyncMetrics(userId);
    window.dispatchEvent(
      new CustomEvent('meutreino:offline-queue-updated', {
        detail: {
          userId,
          count: queue.length,
          queue,
          metrics,
        },
      })
    );
  }
}

export function getOfflineMutationQueue(userId: string): OfflineDeltaMutation[] {
  if (!userId) return [];
  const userBuffer = getOrHydrateUserBuffer(userId);
  return sortMutationsByPriority(
    Array.from(userBuffer.values()),
    isFinishWorkoutSyncMode(userId)
  );
}

export function getEstimatedMobileDataSavedBytes(): number {
  return safeStorage.get<number>(OFFLINE_BYTES_SAVED_KEY, 0);
}

export function getBatchedNetworkCallsSaved(): number {
  return safeStorage.get<number>(BATCHED_CALLS_SAVED_KEY, 0);
}

export function getBatchSyncMetrics(userId: string): BatchSyncMetrics {
  const queue = getOfflineMutationQueue(userId);
  const criticalPendingCount = queue.filter((item) =>
    isCriticalPriorityEntity(item.entity)
  ).length;
  const totalMergedMutations = queue.reduce((acc, item) => acc + (item.mergedCount || 1), 0);
  const finishMode = isFinishWorkoutSyncMode(userId);
  return {
    pendingEntitiesCount: queue.length,
    criticalPendingCount,
    totalMergedMutations,
    batchedCallsSaved: getBatchedNetworkCallsSaved(),
    bytesSaved: getEstimatedMobileDataSavedBytes(),
    isBatchTimerActive: batchCommitTimer !== null || priorityCommitTimer !== null,
    isFinishWorkoutPriorityMode: finishMode,
    batchWindowMs: finishMode && criticalPendingCount > 0
      ? FINISH_WORKOUT_PRIORITY_DEBOUNCE_MS
      : COMMIT_BATCH_WINDOW_MS,
    nextFlushAt: nextBatchFlushTimestamp,
  };
}

/**
 * Agendamento prioritário para o modo 'finish workout':
 * Cancela a espera de 5s para 'sessions' e 'measurements' e dispara o envio prioritário
 * em 120ms (permitindo agrupar 'sessions' + 'measurements' disparados no mesmo frame)
 * antes de processar dados secundários.
 */
function schedulePriorityFinishWorkoutCommit(userId: string, userProfile?: any): void {
  activeBatchUserId = userId;
  if (userProfile !== undefined) {
    activeBatchUserProfile = userProfile;
  }

  if (isFlushingQueue) {
    pendingFlushAfterCurrent = true;
    return;
  }

  if (batchCommitTimer !== null) {
    clearTimeout(batchCommitTimer);
    batchCommitTimer = null;
  }
  if (priorityCommitTimer !== null) {
    clearTimeout(priorityCommitTimer);
    priorityCommitTimer = null;
  }

  nextBatchFlushTimestamp = Date.now() + FINISH_WORKOUT_PRIORITY_DEBOUNCE_MS;
  notifyQueueListeners(userId);

  priorityCommitTimer = setTimeout(() => {
    priorityCommitTimer = null;
    nextBatchFlushTimestamp = null;
    const targetUid = activeBatchUserId || userId;
    const targetProfile = activeBatchUserProfile ?? userProfile;
    flushOfflineMutationQueue(targetUid, targetProfile).catch(() => {});
  }, FINISH_WORKOUT_PRIORITY_DEBOUNCE_MS);
}

/**
 * Mecanismo de Debounce baseado em tempo de 5 segundos (COMMIT_BATCH_WINDOW_MS = 5000ms).
 * A cada nova mutação local consecutiva, o timer anterior é cancelado e reiniciado para +5000ms,
 * garantindo que múltiplas alterações consecutivas sejam reduzidas a um único commit no Supabase.
 * Quando o modo 'finish workout' é detectado e há 'sessions' ou 'measurements' pendentes,
 * prioriza automaticamente o envio crítico imediato.
 */
function scheduleBatchedCommit(userId: string, userProfile?: any): void {
  activeBatchUserId = userId;
  if (userProfile !== undefined) {
    activeBatchUserProfile = userProfile;
  }

  const userBuffer = getOrHydrateUserBuffer(userId);
  const hasCriticalEntities =
    userBuffer.has('sessions') ||
    userBuffer.has('workoutLogs') ||
    userBuffer.has('measurements');

  // Se o app está no modo 'finish workout' e existem dados críticos ('sessions' / 'workoutLogs' / 'measurements'),
  // usa a via expressa prioritária para garantir que o progresso chegue à nuvem primeiro.
  if (isFinishWorkoutSyncMode(userId) && hasCriticalEntities) {
    schedulePriorityFinishWorkoutCommit(userId, userProfile);
    return;
  }

  // Se um commit de rede já está em andamento, marca para agendar novo ciclo assim que concluir
  if (isFlushingQueue) {
    pendingFlushAfterCurrent = true;
  }

  // Debounce real: reinicia a contagem de 5 segundos a cada mutação consecutiva
  if (batchCommitTimer !== null) {
    clearTimeout(batchCommitTimer);
    batchCommitTimer = null;
  }

  nextBatchFlushTimestamp = Date.now() + COMMIT_BATCH_WINDOW_MS;
  notifyQueueListeners(userId);

  batchCommitTimer = setTimeout(() => {
    batchCommitTimer = null;
    nextBatchFlushTimestamp = null;
    const targetUid = activeBatchUserId || userId;
    const targetProfile = activeBatchUserProfile ?? userProfile;
    flushOfflineMutationQueue(targetUid, targetProfile).catch(() => {});
  }, COMMIT_BATCH_WINDOW_MS);
}

// Garante envio imediato do buffer pendente e registro de Background Sync caso o usuário feche ou minimize o app prematuramente
if (typeof window !== 'undefined') {
  const flushOnBackground = () => {
    const targetUid = activeBatchUserId;
    if (!targetUid) return;

    if (bufferPersistTimer) {
      clearTimeout(bufferPersistTimer);
      bufferPersistTimer = null;
      persistUserBufferToStorage(targetUid);
    }

    const pendingQueue = getOfflineMutationQueue(targetUid);
    if (pendingQueue.length > 0 || isFinishWorkoutSyncMode(targetUid)) {
      // 1. Prepara o Outbox no IndexedDB + Service Worker e registra Background Sync API
      stageWorkoutDataForBackgroundSync(targetUid, activeBatchUserProfile).catch(() => {});
      // 2. Dispara requisição HTTP REST com keepalive: true que sobrevive ao fechamento da aba/app
      executeKeepaliveSupabaseUpsert(targetUid, activeBatchUserProfile);
    }

    if (batchCommitTimer || priorityCommitTimer) {
      if (batchCommitTimer) {
        clearTimeout(batchCommitTimer);
        batchCommitTimer = null;
      }
      if (priorityCommitTimer) {
        clearTimeout(priorityCommitTimer);
        priorityCommitTimer = null;
      }
      nextBatchFlushTimestamp = null;
      flushOfflineMutationQueue(targetUid, activeBatchUserProfile).catch(() => {});
    }
  };

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushOnBackground();
    }
  });
  window.addEventListener('pagehide', flushOnBackground);
  window.addEventListener('beforeunload', flushOnBackground);

  // Escuta evento global de modo 'finish workout' disparado pela interface
  window.addEventListener('meutreino:finish-workout-mode', (ev: Event) => {
    const customEv = ev as CustomEvent;
    const detail = customEv.detail;
    if (detail && detail.userId) {
      setFinishWorkoutSyncMode(
        detail.userId,
        detail.active !== false,
        detail.userProfile
      );
    }
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (!event.data) return;
      if (event.data.type === 'SW_FLUSH_MUTATION_BUFFER' && activeBatchUserId) {
        flushOfflineMutationQueue(activeBatchUserId, activeBatchUserProfile).catch(() => {});
      } else if (event.data.type === 'SW_BACKGROUND_SYNC_COMPLETED') {
        const syncedUid = event.data.userId || activeBatchUserId;
        const syncedAt = event.data.syncedAt || new Date().toISOString();
        safeStorage.set(SUPABASE_LAST_SYNC_KEY, syncedAt);
        if (syncedUid) {
          clearUserMutationBuffer(syncedUid);
          notifyQueueListeners(syncedUid);
        }
      }
    });
  }
}

/**
 * Mescla objetos de dicionário em até 2 níveis (ex: logs de séries por exercício/dia)
 * para evitar perda de chaves intermediárias durante mutações locais consecutivas.
 */
function mergeDictionaryPayloads(prevObj: Record<string, any>, nextObj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = { ...prevObj };
  for (const key of Object.keys(nextObj)) {
    const prevVal = result[key];
    const nextVal = nextObj[key];
    if (
      prevVal &&
      nextVal &&
      typeof prevVal === 'object' &&
      typeof nextVal === 'object' &&
      !Array.isArray(prevVal) &&
      !Array.isArray(nextVal)
    ) {
      result[key] = { ...prevVal, ...nextVal };
    } else {
      result[key] = nextVal;
    }
  }
  return result;
}

function estimatePayloadBytes(payload: any): number {
  if (payload === null || payload === undefined) return 16;
  if (typeof payload === 'string') return Math.max(32, payload.length * 2);
  if (Array.isArray(payload)) return Math.max(128, payload.length * 180);
  if (typeof payload === 'object') return Math.max(96, Object.keys(payload).length * 96);
  return 32;
}

/**
 * Insere ou funde (coalesce) uma mutação na fila em memória, retornando true se houve alteração.
 */
function upsertMutationIntoBuffer(
  userId: string,
  entity: SyncDeltaEntity,
  deltaPayload: any
): boolean {
  const userBuffer = getOrHydrateUserBuffer(userId);
  const nowIso = new Date().toISOString();
  const serializedLen = estimatePayloadBytes(deltaPayload);
  const priority: 'critical' | 'normal' = isCriticalPriorityEntity(entity)
    ? 'critical'
    : 'normal';

  const prev = userBuffer.get(entity);
  if (prev) {
    // Evita contagens redundantes se for exatamente a mesma referência ou primitivo idêntico
    if (prev.deltaPayload === deltaPayload && typeof deltaPayload !== 'object') {
      return false;
    }

    let mergedPayload = deltaPayload;
    if (
      (entity === 'workoutLogs' || entity === 'currentLogs' || entity === 'historyLogs' || entity === 'settings') &&
      prev.deltaPayload &&
      typeof prev.deltaPayload === 'object' &&
      !Array.isArray(prev.deltaPayload) &&
      deltaPayload &&
      typeof deltaPayload === 'object' &&
      !Array.isArray(deltaPayload)
    ) {
      mergedPayload = mergeDictionaryPayloads(prev.deltaPayload, deltaPayload);
    }

    userBuffer.set(entity, {
      ...prev,
      deltaPayload: mergedPayload,
      updatedAt: nowIso,
      approxBytes: estimatePayloadBytes(mergedPayload),
      mergedCount: (prev.mergedCount || 1) + 1,
      priority,
    });
    return true;
  }

  userBuffer.set(entity, {
    id: `${entity}_${Date.now()}`,
    userId,
    entity,
    deltaPayload,
    updatedAt: nowIso,
    approxBytes: serializedLen,
    mergedCount: 1,
    priority,
  });
  return true;
}

/**
 * Aplica uma lista de mutações sobre uma bundle base.
 */
function applyMutationsToBundle(
  targetBundle: MeuTreinoSyncBundle,
  mutations: OfflineDeltaMutation[]
): void {
  for (const item of mutations) {
    if (item.entity === 'workoutLogs' && item.deltaPayload) {
      if (item.deltaPayload.currentLogs !== undefined || item.deltaPayload.historyLogs !== undefined) {
        if (item.deltaPayload.currentLogs) {
          targetBundle.currentLogs = mergeDictionaryPayloads(
            targetBundle.currentLogs || {},
            item.deltaPayload.currentLogs
          );
        }
        if (item.deltaPayload.historyLogs) {
          targetBundle.historyLogs = mergeDictionaryPayloads(
            targetBundle.historyLogs || {},
            item.deltaPayload.historyLogs
          );
        }
      } else {
        targetBundle.currentLogs = mergeDictionaryPayloads(
          targetBundle.currentLogs || {},
          item.deltaPayload
        );
      }
      targetBundle.workoutLogs = {
        currentLogs: targetBundle.currentLogs || {},
        historyLogs: targetBundle.historyLogs || {},
      };
    } else if (item.entity === 'currentLogs' && item.deltaPayload) {
      targetBundle.currentLogs = mergeDictionaryPayloads(
        targetBundle.currentLogs || {},
        item.deltaPayload
      );
      targetBundle.workoutLogs = {
        currentLogs: targetBundle.currentLogs || {},
        historyLogs: targetBundle.historyLogs || {},
      };
    } else if (item.entity === 'historyLogs' && item.deltaPayload) {
      targetBundle.historyLogs = mergeDictionaryPayloads(
        targetBundle.historyLogs || {},
        item.deltaPayload
      );
      targetBundle.workoutLogs = {
        currentLogs: targetBundle.currentLogs || {},
        historyLogs: targetBundle.historyLogs || {},
      };
    } else if (item.entity === 'settings' && item.deltaPayload) {
      targetBundle.settings = {
        ...(targetBundle.settings || {}),
        ...item.deltaPayload,
      };
    } else if (item.entity === 'routines') {
      targetBundle.routines = item.deltaPayload;
    } else if (item.entity === 'sessions') {
      targetBundle.sessions = item.deltaPayload;
    } else if (item.entity === 'measurements') {
      targetBundle.measurements = item.deltaPayload;
    } else if (item.entity === 'workoutNotes') {
      targetBundle.workoutNotes = item.deltaPayload;
    } else if (item.entity === 'activeRoutineId') {
      targetBundle.activeRoutineId = item.deltaPayload;
    }
  }
}

/**
 * Agrupa uma bundle inteira dentro da fila com debounce de 5 segundos em uma única operação.
 */
function bufferBundleMutations(bundle: MeuTreinoSyncBundle): void {
  if (!bundle || !bundle.userId) return;
  const uid = bundle.userId;

  // Insere primeiro as entidades críticas ('sessions', 'workoutLogs' e 'measurements')
  if (bundle.sessions !== undefined) upsertMutationIntoBuffer(uid, 'sessions', bundle.sessions);
  if (bundle.workoutLogs !== undefined) upsertMutationIntoBuffer(uid, 'workoutLogs', bundle.workoutLogs);
  if (bundle.measurements !== undefined) upsertMutationIntoBuffer(uid, 'measurements', bundle.measurements);
  if (bundle.routines !== undefined) upsertMutationIntoBuffer(uid, 'routines', bundle.routines);
  if (bundle.historyLogs !== undefined) upsertMutationIntoBuffer(uid, 'historyLogs', bundle.historyLogs);
  if (bundle.currentLogs !== undefined) upsertMutationIntoBuffer(uid, 'currentLogs', bundle.currentLogs);
  if (bundle.workoutNotes !== undefined) upsertMutationIntoBuffer(uid, 'workoutNotes', bundle.workoutNotes);
  if (bundle.settings !== undefined) upsertMutationIntoBuffer(uid, 'settings', bundle.settings);
  if (bundle.activeRoutineId !== undefined) {
    upsertMutationIntoBuffer(uid, 'activeRoutineId', bundle.activeRoutineId);
  }

  scheduleDebouncedBufferPersistence(uid);
  stageWorkoutDataForBackgroundSync(uid, bundle.userProfile).catch(() => {});

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (isOnline && isSupabaseConfigured()) {
    scheduleBatchedCommit(uid, bundle.userProfile);
  } else {
    requestServiceWorkerBackgroundSync(true);
  }
}

/**
 * Enfileira uma mutação local com debounce de 5 segundos (5000ms).
 * Além disso, persiste imediatamente 'workoutLogs' e 'sessions' no Outbox do Background Sync API
 * para garantir o envio ao Supabase pelo Service Worker mesmo se o app for fechado prematuramente.
 */
export function enqueueOfflineMutation(
  userId: string,
  entity: SyncDeltaEntity,
  deltaPayload: any,
  userProfile?: any,
  options?: { isFinishWorkout?: boolean }
): void {
  if (!userId) return;

  if (userProfile !== undefined) {
    activeBatchUserProfile = userProfile;
  }
  activeBatchUserId = userId;

  // Detecta automaticamente o modo 'finish workout' quando uma nova sessão concluída é enfileirada
  // ou quando explicitamente sinalizado via options.isFinishWorkout
  if (options?.isFinishWorkout || entity === 'sessions') {
    setFinishWorkoutSyncMode(userId, true, userProfile);
  } else if (entity === 'activeRoutineId' && deltaPayload === null) {
    const buf = getOrHydrateUserBuffer(userId);
    if (buf.has('sessions') || buf.has('workoutLogs') || buf.has('measurements')) {
      setFinishWorkoutSyncMode(userId, true, userProfile);
    }
  }

  upsertMutationIntoBuffer(userId, entity, deltaPayload);
  scheduleDebouncedBufferPersistence(userId);

  // Sempre prepara o Outbox do Background Sync quando 'workoutLogs', 'currentLogs', 'historyLogs' ou 'sessions' mudam
  const isWorkoutOrSessionEntity =
    entity === 'workoutLogs' ||
    entity === 'currentLogs' ||
    entity === 'historyLogs' ||
    entity === 'sessions' ||
    Boolean(options?.isFinishWorkout);

  if (isWorkoutOrSessionEntity) {
    stageWorkoutDataForBackgroundSync(userId, userProfile).catch(() => {});
  }

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (isOnline && isSupabaseConfigured()) {
    scheduleBatchedCommit(userId, userProfile);
  } else {
    requestServiceWorkerBackgroundSync(isWorkoutOrSessionEntity);
  }
}

/**
 * Executa o commit em lote (Batch Flush) das mutações locais acumuladas.
 * No modo 'finish workout', particiona a fila para fazer o upload prioritário de
 * 'sessions' e 'measurements' PRIMEIRO (Stage 1), garantindo que o progresso mais crítico
 * seja salvo na nuvem imediatamente antes dos demais dados secundários (Stage 2).
 */
export async function flushOfflineMutationQueue(
  userId: string,
  userProfile?: any
): Promise<{
  flushedCount: number;
  criticalFlushedCount?: number;
  mergedOperations: number;
  bytesSaved: number;
  prioritizedFinishWorkout?: boolean;
  error?: string;
}> {
  if (batchCommitTimer) {
    clearTimeout(batchCommitTimer);
    batchCommitTimer = null;
  }
  if (priorityCommitTimer) {
    clearTimeout(priorityCommitTimer);
    priorityCommitTimer = null;
  }
  nextBatchFlushTimestamp = null;

  if (!userId) {
    return { flushedCount: 0, mergedOperations: 0, bytesSaved: 0 };
  }

  if (isFlushingQueue) {
    pendingFlushAfterCurrent = true;
    return { flushedCount: 0, mergedOperations: 0, bytesSaved: 0 };
  }

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline) {
    requestServiceWorkerBackgroundSync();
    notifyQueueListeners(userId);
    return {
      flushedCount: 0,
      mergedOperations: 0,
      bytesSaved: 0,
      error: 'Dispositivo offline. Mutações mantidas na fila para sincronização automática.',
    };
  }

  const inFinishWorkoutMode = isFinishWorkoutSyncMode(userId);
  const queue = getOfflineMutationQueue(userId);
  if (queue.length === 0) {
    notifyQueueListeners(userId);
    return { flushedCount: 0, mergedOperations: 0, bytesSaved: 0 };
  }

  isFlushingQueue = true;
  pendingFlushAfterCurrent = false;

  // Separa as mutações críticas ('sessions' e 'measurements') das mutações secundárias
  const criticalMutations = queue.filter((item) => isCriticalPriorityEntity(item.entity));
  const secondaryMutations = queue.filter((item) => !isCriticalPriorityEntity(item.entity));
  const shouldRunTwoStagePriority =
    inFinishWorkoutMode && criticalMutations.length > 0 && secondaryMutations.length > 0;

  try {
    const client = getSupabaseClient();
    const resolvedProfile = userProfile ?? activeBatchUserProfile;

    // =========================================================================
    // ESTÁGIO 1 (MODO 'FINISH WORKOUT'): Upload Prioritário de 'sessions' & 'measurements'
    // Garante que o treino concluído e as medidas corporais cheguem à nuvem PRIMEIRO
    // e sejam confirmados antes de processar logs secundários ou configurações.
    // =========================================================================
    if (shouldRunTwoStagePriority) {
      const criticalSnapshot = new Map<SyncDeltaEntity, string>();
      for (const critItem of criticalMutations) {
        criticalSnapshot.set(critItem.entity, critItem.updatedAt);
      }

      const priorityBundle = buildLocalSyncBundle(userId, resolvedProfile);
      applyMutationsToBundle(priorityBundle, criticalMutations);
      priorityBundle.updatedAt = new Date().toISOString();
      priorityBundle.version = (priorityBundle.version || 2) + 1;

      notifyServiceWorkerWorkoutSnapshot(priorityBundle);

      if (syncBroadcastChannel) {
        try {
          syncBroadcastChannel.postMessage({
            type: 'LOCAL_DELTA_SYNC_BROADCAST',
            userId,
            priorityStage: 'critical_sessions_measurements',
            deltas: criticalMutations,
            bundle: priorityBundle,
          });
        } catch {}
      }

      if (client) {
        const { error: critError } = await client.from('meutreino_sync').upsert(
          {
            user_id: userId,
            data: priorityBundle,
            updated_at: priorityBundle.updatedAt,
          },
          { onConflict: 'user_id' }
        );

        if (critError) {
          isFlushingQueue = false;
          notifyQueueListeners(userId);
          return {
            flushedCount: 0,
            criticalFlushedCount: 0,
            mergedOperations: 0,
            bytesSaved: 0,
            prioritizedFinishWorkout: true,
            error: critError.message,
          };
        }
      }

      // Remove imediatamente 'sessions' e 'measurements' da fila local pois já estão seguros na nuvem!
      clearUserMutationBuffer(userId, criticalSnapshot);
      safeStorage.set(SUPABASE_LAST_SYNC_KEY, priorityBundle.updatedAt);
      notifyQueueListeners(userId);
    }

    // =========================================================================
    // ESTÁGIO 2 (ou Lote Único Consolidado): Upload das entidades restantes na ordem de prioridade
    // =========================================================================
    const remainingQueue = shouldRunTwoStagePriority ? secondaryMutations : queue;
    const flushedSnapshot = new Map<SyncDeltaEntity, string>();
    for (const item of remainingQueue) {
      flushedSnapshot.set(item.entity, item.updatedAt);
    }

    const consolidatedBundle = buildLocalSyncBundle(userId, resolvedProfile);
    // Aplica em ordem de prioridade ('sessions' e 'measurements' sempre prevalecem)
    applyMutationsToBundle(consolidatedBundle, queue);

    consolidatedBundle.updatedAt = new Date().toISOString();
    consolidatedBundle.version = (consolidatedBundle.version || 2) + 1;

    const fullBundleSize = JSON.stringify(consolidatedBundle).length;
    const totalMergedOps = queue.reduce((acc, item) => acc + (item.mergedCount || 1), 0);
    const deltaSize = queue.reduce((acc, item) => acc + (item.approxBytes || 64), 0);
    const savedNow = Math.max(256, fullBundleSize * totalMergedOps - deltaSize);
    const callsSavedNow = Math.max(0, totalMergedOps - 1);

    // Atualiza o cache Stale-While-Revalidate do Service Worker com o lote consolidado final
    notifyServiceWorkerWorkoutSnapshot(consolidatedBundle);

    // Transmite o lote consolidado para outras abas locais via BroadcastChannel
    if (syncBroadcastChannel) {
      try {
        syncBroadcastChannel.postMessage({
          type: 'LOCAL_DELTA_SYNC_BROADCAST',
          userId,
          deltas: remainingQueue,
          bundle: consolidatedBundle,
        });
      } catch {}
    }

    if (client && remainingQueue.length > 0) {
      const { error } = await client.from('meutreino_sync').upsert(
        {
          user_id: userId,
          data: consolidatedBundle,
          updated_at: consolidatedBundle.updatedAt,
        },
        { onConflict: 'user_id' }
      );

      if (error) {
        isFlushingQueue = false;
        notifyQueueListeners(userId);
        // Se o Estágio 1 crítico já havia sido enviado com sucesso, retorna o progresso crítico salvo
        if (shouldRunTwoStagePriority) {
          return {
            flushedCount: criticalMutations.length,
            criticalFlushedCount: criticalMutations.length,
            mergedOperations: criticalMutations.reduce((a, c) => a + (c.mergedCount || 1), 0),
            bytesSaved: Math.round(savedNow / 2),
            prioritizedFinishWorkout: true,
            error: error.message,
          };
        }
        return { flushedCount: 0, mergedOperations: 0, bytesSaved: 0, error: error.message };
      }
    }

    // Remove do buffer apenas as mutações que foram confirmadas neste commit
    const flushedCount = queue.length;
    const hasRemainingMutations = clearUserMutationBuffer(userId, flushedSnapshot);

    // Se todas as mutações foram confirmadas na nuvem, limpa o registro correspondente no Outbox do Background Sync
    if (!hasRemainingMutations) {
      clearBackgroundSyncOutboxEntry(userId).catch(() => {});
    }

    // Se todas as mutações críticas do finish workout foram enviadas, desativa o flag de urgência
    const updatedBuffer = getOrHydrateUserBuffer(userId);
    if (
      inFinishWorkoutMode &&
      !updatedBuffer.has('sessions') &&
      !updatedBuffer.has('workoutLogs') &&
      !updatedBuffer.has('measurements')
    ) {
      setFinishWorkoutSyncMode(userId, false);
    }

    const prevSavedBytes = getEstimatedMobileDataSavedBytes();
    safeStorage.set(OFFLINE_BYTES_SAVED_KEY, prevSavedBytes + savedNow);
    if (callsSavedNow > 0) {
      const prevCallsSaved = getBatchedNetworkCallsSaved();
      safeStorage.set(BATCHED_CALLS_SAVED_KEY, prevCallsSaved + callsSavedNow);
    }
    safeStorage.set(SUPABASE_LAST_SYNC_KEY, consolidatedBundle.updatedAt);
    isFlushingQueue = false;
    notifyQueueListeners(userId);

    // Se novas mutações chegaram enquanto o request de rede estava em andamento, agenda novo ciclo
    if (hasRemainingMutations || pendingFlushAfterCurrent) {
      pendingFlushAfterCurrent = false;
      scheduleBatchedCommit(userId, resolvedProfile);
    }

    return {
      flushedCount,
      criticalFlushedCount: criticalMutations.length,
      mergedOperations: totalMergedOps,
      bytesSaved: savedNow,
      prioritizedFinishWorkout: inFinishWorkoutMode && criticalMutations.length > 0,
    };
  } catch (err: any) {
    isFlushingQueue = false;
    notifyQueueListeners(userId);
    return {
      flushedCount: 0,
      mergedOperations: 0,
      bytesSaved: 0,
      error: err?.message || 'Erro ao processar fila de sincronização.',
    };
  }
}

export const SUPABASE_SETUP_SQL = `-- Copie e cole no SQL Editor do seu projeto Supabase para ativar a sincronização segura com Row Level Security (RLS):
create table if not exists public.meutreino_sync (
  user_id text primary key check (char_length(user_id) >= 3 and char_length(user_id) <= 128),
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Ativar Row Level Security (RLS) restrito ao proprietário do perfil
alter table public.meutreino_sync enable row level security;

-- Remove políticas legadas permissivas caso existam
drop policy if exists "Permitir leitura para todos" on public.meutreino_sync;
drop policy if exists "Permitir insercao e atualizacao para todos" on public.meutreino_sync;
drop policy if exists "Permitir atualizacao para todos" on public.meutreino_sync;

-- Política de Leitura: somente o próprio atleta (via Supabase Auth UID ou cabeçalho autenticado do perfil) pode ler seu registro
create policy "Leitura restrita ao proprio atleta"
  on public.meutreino_sync for select
  using (
    auth.uid()::text = user_id
    or coalesce((current_setting('request.headers', true)::json->>'x-meutreino-user-id'), '') = user_id
  );

-- Política de Inserção: somente para o próprio user_id válido
create policy "Insercao restrita ao proprio atleta"
  on public.meutreino_sync for insert
  with check (
    char_length(user_id) >= 3
    and (
      auth.uid()::text = user_id
      or coalesce((current_setting('request.headers', true)::json->>'x-meutreino-user-id'), '') = user_id
    )
  );

-- Política de Atualização: somente para o próprio user_id válido
create policy "Atualizacao restrita ao proprio atleta"
  on public.meutreino_sync for update
  using (
    auth.uid()::text = user_id
    or coalesce((current_setting('request.headers', true)::json->>'x-meutreino-user-id'), '') = user_id
  )
  with check (
    auth.uid()::text = user_id
    or coalesce((current_setting('request.headers', true)::json->>'x-meutreino-user-id'), '') = user_id
  );

-- Habilitar Realtime
alter publication supabase_realtime add table public.meutreino_sync;
`;

