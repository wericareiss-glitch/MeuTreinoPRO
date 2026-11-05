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
  collection, 
  query, 
  getDocFromServer,
  serverTimestamp 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, GeneratedWorkoutRoutine, WorkoutSessionSummary, BodyMeasurement } from '../types/workout';
import { safeStorage } from '../utils/storage';

// Inicialização do Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: Firestore com databaseId explícito conforme provisionado
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Provider Google
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Teste de conexão mandatório com Firestore
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
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

export async function loginWithGoogle(): Promise<{ user?: FirebaseUser; error?: string }> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return { user: cred.user };
  } catch (err: any) {
    console.error('Erro no login com Google:', err);
    return { error: err?.message || 'Falha ao entrar com Google.' };
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

export async function syncUserProfileToCloud(profile: UserProfile): Promise<boolean> {
  if (!profile.id) return false;
  const currentUid = auth.currentUser?.uid || profile.id;
  const path = `users/${currentUid}`;
  try {
    const sanitized = { ...profile };
    delete (sanitized as any).password;
    await setDoc(doc(db, 'users', currentUid), {
      ...sanitized,
      userId: currentUid,
      updatedAt: new Date().toISOString(),
      serverTimestamp: serverTimestamp(),
    }, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export async function syncRoutineToCloud(userId: string, routine: GeneratedWorkoutRoutine): Promise<boolean> {
  const currentUid = auth.currentUser?.uid || userId;
  const path = `users/${currentUid}/routines/${routine.id}`;
  try {
    await setDoc(doc(db, 'users', currentUid, 'routines', routine.id), {
      ...routine,
      userId: currentUid,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export async function syncRoutinesToCloud(userId: string, routines: GeneratedWorkoutRoutine[]): Promise<boolean> {
  const currentUid = auth.currentUser?.uid || userId;
  try {
    for (const routine of routines) {
      await syncRoutineToCloud(currentUid, routine);
    }
    return true;
  } catch (err) {
    console.error('Erro ao sincronizar rotinas com o Firestore:', err);
    return false;
  }
}

export async function syncSessionToCloud(userId: string, session: WorkoutSessionSummary): Promise<boolean> {
  const currentUid = auth.currentUser?.uid || userId;
  const path = `users/${currentUid}/sessions/${session.id}`;
  try {
    await setDoc(doc(db, 'users', currentUid, 'sessions', session.id), {
      ...session,
      userId: currentUid,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export async function syncMeasurementToCloud(userId: string, measurement: BodyMeasurement): Promise<boolean> {
  const currentUid = auth.currentUser?.uid || userId;
  const path = `users/${currentUid}/measurements/${measurement.id}`;
  try {
    await setDoc(doc(db, 'users', currentUid, 'measurements', measurement.id), {
      ...measurement,
      userId: currentUid,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Envia todos os dados locais do atleta para o Firestore de uma só vez
 */
export async function syncAllToFirebase(userId: string, userProfile: UserProfile): Promise<boolean> {
  try {
    const currentUid = auth.currentUser?.uid || userId;
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
  const currentUid = auth.currentUser?.uid || userId;
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
    console.error('Erro ao baixar dados do Firestore:', err);
    return null;
  }
}
