/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile as updateFirebaseAuthProfile,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  collection, 
  query, 
  getDocFromServer,
  serverTimestamp 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, GeneratedWorkoutRoutine, WorkoutSessionSummary, BodyMeasurement } from '../types/workout';
import { safeStorage } from '../utils/storage';

// Configuração padrão de fallback garantida para deploy (Vercel ou local)
const DEFAULT_FIREBASE_CONFIG = {
  projectId: "gen-lang-client-0990478631",
  appId: "1:1052704553147:web:79ca7c8e7e376d3d88d19e",
  apiKey: "AIzaSyDeJL9oASD2pi0n6QZDeC7scwoFPL70mus",
  authDomain: "gen-lang-client-0990478631.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-meutreinopro-9e757c82-c0c5-4f9b-a123-67e3b74f2876",
  storageBucket: "gen-lang-client-0990478631.firebasestorage.app",
  messagingSenderId: "1052704553147",
  measurementId: "",
};

// Inicialização do Firebase App com suporte a variáveis de ambiente da Vercel ou config local
const resolvedFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig?.apiKey || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig?.authDomain || DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig?.projectId || DEFAULT_FIREBASE_CONFIG.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig?.storageBucket || DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig?.messagingSenderId || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig?.appId || DEFAULT_FIREBASE_CONFIG.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfig?.measurementId || DEFAULT_FIREBASE_CONFIG.measurementId,
};

const resolvedDatabaseId =
  import.meta.env.VITE_FIREBASE_DATABASE_ID ||
  firebaseConfig?.firestoreDatabaseId ||
  DEFAULT_FIREBASE_CONFIG.firestoreDatabaseId;

const app = getApps().length > 0 ? getApp() : initializeApp(resolvedFirebaseConfig);

// CRITICAL: Firestore com databaseId explícito conforme provisionado
export const db = getFirestore(app, resolvedDatabaseId);
export const auth = getAuth(app);

// Provider Google
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Helper para identificar erros transitórios de rede / modo offline
export function isOfflineError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as any)?.code || '';
  return (
    code === 'unavailable' ||
    msg.includes('client is offline') ||
    msg.includes('the client is offline') ||
    msg.includes('Failed to get document because the client is offline')
  );
}

// Teste de conexão mandatório com Firestore
export async function testConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (isOfflineError(error)) {
      console.warn('Firebase Firestore: cliente offline ou aguardando conexão.');
    }
    return false;
  }
}
testConnection();

// Tipos de Operação e Error Handler conforme Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ==========================================
// AUTENTICAÇÃO COM FIREBASE
// ==========================================

export async function loginWithGoogle(): Promise<{ 
  user?: FirebaseUser; 
  error?: string; 
  code?: string; 
  unauthorizedDomain?: string;
  rawMessage?: string;
}> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return { user: cred.user };
  } catch (err: any) {
    console.error('Erro no login com Google:', err);
    const code = err?.code || '';
    const rawMessage = err?.message || String(err);
    const isIframe = typeof window !== 'undefined' && window.self !== window.top;
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

    if (code === 'auth/unauthorized-domain' || rawMessage.includes('auth/unauthorized-domain')) {
      return { 
        error: `O domínio "${currentHost}" não está na lista de domínios autorizados do Firebase Authentication (ou foi cadastrado com "https://" ou barra final no console).`,
        code: 'auth/unauthorized-domain',
        unauthorizedDomain: currentHost,
        rawMessage
      };
    }
    if (code === 'auth/operation-not-allowed' || rawMessage.includes('operation-not-allowed')) {
      return {
        error: 'O provedor Google ainda não está ativado no Firebase Console. Ative o provedor "Google" em Firebase Console > Authentication > Sign-in method.',
        code: 'auth/operation-not-allowed',
        rawMessage
      };
    }
    if (code === 'auth/popup-closed-by-user') {
      return { 
        error: isIframe
          ? 'O popup foi fechado pelo navegador ou bloqueado pelo iFrame de prévia. Abra o aplicativo em uma nova aba completa para conectar sua conta Google.'
          : 'O popup foi fechado antes de concluir a sincronização (ou foi bloqueado pelo bloqueador de cookies de terceiros do navegador). Tente abrir em uma nova aba separada.',
        code,
        unauthorizedDomain: currentHost,
        rawMessage
      };
    }
    if (code === 'auth/cancelled-popup-request') {
      return { 
        error: 'A solicitação de login com Google foi cancelada porque outra tentativa foi iniciada.', 
        code,
        rawMessage 
      };
    }
    if (code === 'auth/popup-blocked') {
      return { 
        error: isIframe
          ? 'O popup foi bloqueado pelo iFrame do editor. Clique no botão "Abrir em Nova Aba" para autenticar diretamente no navegador.'
          : 'O popup de login foi bloqueado pelo navegador. Por favor, permita popups para este site nas configurações da barra de endereços.',
        code,
        rawMessage 
      };
    }
    if (code === 'auth/network-request-failed') {
      return {
        error: 'Falha de conexão com os servidores de autenticação do Google. Verifique sua conexão de internet.',
        code,
        rawMessage
      };
    }
    return { 
      error: rawMessage ? `Erro ao autenticar com o Google (${code || 'desconhecido'}): ${rawMessage}` : 'Falha ao entrar com Google.', 
      code,
      rawMessage 
    };
  }
}

export async function registerWithEmailFirebase(
  email: string, 
  pass: string, 
  name: string
): Promise<{ user?: FirebaseUser; error?: string }> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user && name) {
      await updateFirebaseAuthProfile(cred.user, { displayName: name });
    }
    return { user: cred.user };
  } catch (err: any) {
    console.error('Erro no cadastro Firebase:', err);
    let msg = 'Falha ao cadastrar no banco online.';
    if (err?.code === 'auth/email-already-in-use') msg = 'Este e-mail já está em uso.';
    else if (err?.code === 'auth/weak-password') msg = 'A senha deve ter pelo menos 6 caracteres.';
    else if (err?.code === 'auth/invalid-email') msg = 'E-mail inválido.';
    return { error: msg };
  }
}

export async function loginWithEmailFirebase(
  email: string, 
  pass: string
): Promise<{ user?: FirebaseUser; error?: string }> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return { user: cred.user };
  } catch (err: any) {
    console.error('Erro no login Firebase:', err);
    let msg = 'E-mail ou senha incorretos.';
    if (err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password') {
      msg = 'E-mail ou senha incorretos.';
    }
    return { error: msg };
  }
}

export async function logoutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Erro ao sair do Firebase:', err);
  }
}

// ==========================================
// SINCRONIZAÇÃO EM NUVEM (FIRESTORE)
// ==========================================

/**
 * Remove recursivamente todas as chaves com valor `undefined` de um objeto ou array
 * para prevenir o erro fatal do Firestore SDK:
 * "FirebaseError: Function setDoc() called with invalid data. Unsupported field value: undefined"
 */
export function deepCleanForFirestore<T>(val: T): T {
  if (val === null || val === undefined) {
    return null as any;
  }
  if (Array.isArray(val)) {
    return val
      .filter((item) => item !== undefined)
      .map((item) => deepCleanForFirestore(item)) as any;
  }
  if (typeof val === 'object') {
    // Preserva instâncias especiais como Date ou FieldValue (serverTimestamp)
    if (
      val instanceof Date ||
      (val as any)?._methodName ||
      (val as any)?.constructor?.name === 'FieldValue'
    ) {
      return val;
    }
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(val as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = deepCleanForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return val;
}

export function isFirebaseCloudSyncAvailable(userId?: string): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  if (!auth.currentUser) return false;
  if (userId && (userId.startsWith('user_guest_') || userId.startsWith('alex_guest_'))) {
    return false;
  }
  return true;
}

export async function syncUserProfileToCloud(profile: UserProfile): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  if (!auth.currentUser || !profile.id || profile.isVisitor || profile.id.startsWith('user_guest_')) {
    return false;
  }
  const currentUid = auth.currentUser.uid;
  const path = `users/${currentUid}`;
  try {
    const rawData = {
      ...profile,
      id: currentUid,
      userId: currentUid,
      updatedAt: new Date().toISOString(),
      serverTimestamp: serverTimestamp(),
    };
    delete (rawData as any).password;
    const sanitized = deepCleanForFirestore(rawData);
    await setDoc(doc(db, 'users', currentUid), sanitized, { merge: true });
    return true;
  } catch (err) {
    if (isOfflineError(err)) {
      console.warn('Firebase Firestore offline: perfil salvo apenas localmente.');
      return false;
    }
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export async function syncRoutineToCloud(userId: string, routine: GeneratedWorkoutRoutine): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  if (!auth.currentUser || userId.startsWith('user_guest_')) {
    return false;
  }
  const currentUid = auth.currentUser.uid;
  const path = `users/${currentUid}/routines/${routine.id}`;
  try {
    const sanitized = deepCleanForFirestore({
      ...routine,
      userId: currentUid,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', currentUid, 'routines', routine.id), sanitized, { merge: true });
    return true;
  } catch (err) {
    if (isOfflineError(err)) {
      console.warn('Firebase Firestore offline: rotina salva apenas localmente.');
      return false;
    }
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export async function syncRoutinesToCloud(userId: string, routines: GeneratedWorkoutRoutine[]): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  if (!auth.currentUser || userId.startsWith('user_guest_')) {
    return false;
  }
  const currentUid = auth.currentUser.uid;
  try {
    for (const routine of routines) {
      await syncRoutineToCloud(currentUid, routine);
    }
    return true;
  } catch (err) {
    if (isOfflineError(err)) {
      console.warn('Firebase Firestore offline: sincronização de rotinas adiada.');
      return false;
    }
    console.error('Erro ao sincronizar rotinas com o Firestore:', err);
    return false;
  }
}

export async function deleteRoutineFromCloud(userId: string, routineId: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  if (!auth.currentUser || userId.startsWith('user_guest_')) {
    return false;
  }
  const currentUid = auth.currentUser.uid;
  const path = `users/${currentUid}/routines/${routineId}`;
  try {
    await deleteDoc(doc(db, 'users', currentUid, 'routines', routineId));
    return true;
  } catch (err) {
    if (isOfflineError(err)) {
      console.warn('Firebase Firestore offline: exclusão da rotina será sincronizada mais tarde.');
      return false;
    }
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
}

export async function syncSessionToCloud(userId: string, session: WorkoutSessionSummary): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  if (!auth.currentUser || userId.startsWith('user_guest_')) {
    return false;
  }
  const currentUid = auth.currentUser.uid;
  const path = `users/${currentUid}/sessions/${session.id}`;
  try {
    const sanitized = deepCleanForFirestore({
      ...session,
      userId: currentUid,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', currentUid, 'sessions', session.id), sanitized, { merge: true });
    return true;
  } catch (err) {
    if (isOfflineError(err)) {
      console.warn('Firebase Firestore offline: sessão salva apenas localmente.');
      return false;
    }
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export async function deleteSessionFromCloud(userId: string, sessionId: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  if (!auth.currentUser || userId.startsWith('user_guest_')) {
    return false;
  }
  const currentUid = auth.currentUser.uid;
  const path = `users/${currentUid}/sessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, 'users', currentUid, 'sessions', sessionId));
    return true;
  } catch (err) {
    if (isOfflineError(err)) {
      console.warn('Firebase Firestore offline: exclusão da sessão será sincronizada mais tarde.');
      return false;
    }
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
}

export async function syncMeasurementToCloud(userId: string, measurement: BodyMeasurement): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  if (!auth.currentUser || userId.startsWith('user_guest_')) {
    return false;
  }
  const currentUid = auth.currentUser.uid;
  const path = `users/${currentUid}/measurements/${measurement.id}`;
  try {
    const sanitized = deepCleanForFirestore({
      ...measurement,
      userId: currentUid,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', currentUid, 'measurements', measurement.id), sanitized, { merge: true });
    return true;
  } catch (err) {
    if (isOfflineError(err)) {
      console.warn('Firebase Firestore offline: medida salva apenas localmente.');
      return false;
    }
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export async function deleteMeasurementFromCloud(userId: string, measurementId: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  if (!auth.currentUser || userId.startsWith('user_guest_')) {
    return false;
  }
  const currentUid = auth.currentUser.uid;
  const path = `users/${currentUid}/measurements/${measurementId}`;
  try {
    await deleteDoc(doc(db, 'users', currentUid, 'measurements', measurementId));
    return true;
  } catch (err) {
    if (isOfflineError(err)) {
      console.warn('Firebase Firestore offline: exclusão da medida será sincronizada mais tarde.');
      return false;
    }
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
}

/**
 * Envia todos os dados locais do atleta para o Firestore de uma só vez
 */
export async function syncAllToFirebase(userId: string, userProfile: UserProfile): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  if (!auth.currentUser || userProfile.isVisitor || userId.startsWith('user_guest_')) {
    return false;
  }
  const currentUid = auth.currentUser.uid;
  try {
    await syncUserProfileToCloud({ ...userProfile, id: currentUid });

    const routines = safeStorage.get<GeneratedWorkoutRoutine[]>(`alex_u_${userId}_routines`, []);
    if (routines.length > 0) {
      await syncRoutinesToCloud(currentUid, routines);
    }

    const sessions = safeStorage.get<WorkoutSessionSummary[]>(`alex_u_${userId}_sessions`, []);
    for (const session of sessions) {
      await syncSessionToCloud(currentUid, session);
    }

    const measurements = safeStorage.get<BodyMeasurement[]>(`alex_u_${userId}_measurements`, []);
    for (const m of measurements) {
      await syncMeasurementToCloud(currentUid, m);
    }

    safeStorage.set(`firebase_last_sync_${currentUid}`, new Date().toISOString());
    return true;
  } catch (err) {
    if (isOfflineError(err)) {
      console.warn('Firebase Firestore offline: sincronização completa adiada.');
      return false;
    }
    console.error('Erro na sincronização completa para o Firestore:', err);
    return false;
  }
}

/**
 * Baixa os dados remotos do usuário do Firestore para sincronizar novos dispositivos
 */
export async function fetchUserDataFromFirebase(userId: string): Promise<{
  profile?: UserProfile;
  routines?: GeneratedWorkoutRoutine[];
  sessions?: WorkoutSessionSummary[];
  measurements?: BodyMeasurement[];
} | null> {
  if (!auth.currentUser || userId.startsWith('user_guest_') || userId.startsWith('alex_guest_')) {
    return null;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }
  const currentUid = auth.currentUser.uid;
  try {
    // 1. Perfil
    const userDocRef = doc(db, 'users', currentUid);
    const userDocSnap = await getDoc(userDocRef);
    let profile: UserProfile | undefined = undefined;
    if (userDocSnap.exists()) {
      profile = userDocSnap.data() as UserProfile;
    }

    // 2. Rotinas
    const routinesSnap = await getDocs(collection(db, 'users', currentUid, 'routines'));
    const routines: GeneratedWorkoutRoutine[] = [];
    routinesSnap.forEach((docItem) => {
      routines.push(docItem.data() as GeneratedWorkoutRoutine);
    });

    // 3. Sessões
    const sessionsSnap = await getDocs(collection(db, 'users', currentUid, 'sessions'));
    const sessions: WorkoutSessionSummary[] = [];
    sessionsSnap.forEach((docItem) => {
      sessions.push(docItem.data() as WorkoutSessionSummary);
    });

    // 4. Medidas
    const measurementsSnap = await getDocs(collection(db, 'users', currentUid, 'measurements'));
    const measurements: BodyMeasurement[] = [];
    measurementsSnap.forEach((docItem) => {
      measurements.push(docItem.data() as BodyMeasurement);
    });

    return { profile, routines, sessions, measurements };
  } catch (err) {
    if (isOfflineError(err)) {
      console.warn('Firebase Firestore offline ou sem conexão: mantendo dados locais do dispositivo.');
      return null;
    }
    console.error('Erro ao baixar dados do Firestore:', err);
    return null;
  }
}
