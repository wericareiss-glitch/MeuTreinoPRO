/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile } from '../types/workout';
import { safeStorage } from './storage';
import { authStorage } from './auth';

const BIOMETRIC_CREDENTIALS_KEY = 'mtp_webauthn_credentials_v1';
const BIOMETRIC_APP_LOCK_KEY = 'mtp_webauthn_app_lock_v1';
const BIOMETRIC_SESSION_UNLOCKED_KEY = 'mtp_webauthn_session_unlocked';
const BIOMETRIC_EVENT_NAME = 'meutreino:biometric-updated';

export interface StoredBiometricCredential {
  credentialId: string; // Base64URL encoded rawId
  userId: string;
  username: string;
  userDisplayName: string;
  deviceLabel: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface BiometricAvailability {
  isWebAuthnSupported: boolean;
  isPlatformAuthenticatorAvailable: boolean;
  biometricLabel: string;
}

/**
 * Converte um ArrayBuffer ou Uint8Array para string Base64URL
 */
export function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Converte uma string Base64URL de volta para Uint8Array
 */
export function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Detecta um nome amigável para o sensor biométrico conforme o sistema operacional
 */
export function getDeviceBiometricLabel(): string {
  if (typeof navigator === 'undefined') return 'FaceID / Biometria';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return 'Face ID / Touch ID';
  }
  if (/Macintosh|Mac OS X/i.test(ua)) {
    return 'Touch ID';
  }
  if (/Android/i.test(ua)) {
    return 'Impressão Digital / Reconhecimento Facial';
  }
  if (/Windows/i.test(ua)) {
    return 'Windows Hello (Biometria)';
  }
  return 'Face ID / Impressão Digital';
}

/**
 * Verifica suporte à Web Authentication API (WebAuthn) e autenticador de plataforma (FaceID/TouchID/Android Biometrics)
 */
export async function checkBiometricAvailability(): Promise<BiometricAvailability> {
  const biometricLabel = getDeviceBiometricLabel();
  if (
    typeof window === 'undefined' ||
    typeof window.PublicKeyCredential === 'undefined' ||
    !navigator.credentials ||
    typeof navigator.credentials.create !== 'function' ||
    typeof navigator.credentials.get !== 'function'
  ) {
    return {
      isWebAuthnSupported: false,
      isPlatformAuthenticatorAvailable: false,
      biometricLabel,
    };
  }

  let isPlatformAuthenticatorAvailable = false;
  try {
    if (
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
      'function'
    ) {
      isPlatformAuthenticatorAvailable =
        await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } else {
      isPlatformAuthenticatorAvailable = true;
    }
  } catch {
    isPlatformAuthenticatorAvailable = false;
  }

  return {
    isWebAuthnSupported: true,
    isPlatformAuthenticatorAvailable,
    biometricLabel,
  };
}

function notifyBiometricChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BIOMETRIC_EVENT_NAME));
  }
}

export function onBiometricChange(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(BIOMETRIC_EVENT_NAME, callback);
  return () => window.removeEventListener(BIOMETRIC_EVENT_NAME, callback);
}

/**
 * Retorna todas as credenciais biométricas salvas neste dispositivo
 */
export function getStoredBiometricCredentials(): StoredBiometricCredential[] {
  return safeStorage.get<StoredBiometricCredential[]>(BIOMETRIC_CREDENTIALS_KEY, []);
}

/**
 * Retorna as credenciais biométricas vinculadas a um usuário específico
 */
export function getUserBiometricCredentials(userId: string): StoredBiometricCredential[] {
  if (!userId) return [];
  return getStoredBiometricCredentials().filter((c) => c.userId === userId);
}

/**
 * Retorna se o usuário possui biometria configurada neste aparelho
 */
export function hasUserBiometricEnabled(userId?: string | null): boolean {
  if (!userId) {
    return getStoredBiometricCredentials().length > 0;
  }
  return getUserBiometricCredentials(userId).length > 0;
}

/**
 * Retorna se a exigência de desbloqueio biométrico ao abrir o app está ativa para o usuário
 */
export function isBiometricAppLockEnabled(userId: string): boolean {
  if (!userId || !hasUserBiometricEnabled(userId)) return false;
  const map = safeStorage.get<Record<string, boolean>>(BIOMETRIC_APP_LOCK_KEY, {});
  return Boolean(map[userId]);
}

/**
 * Ativa ou desativa o bloqueio automático por biometria ao abrir o aplicativo
 */
export function setBiometricAppLockEnabled(userId: string, enabled: boolean): void {
  if (!userId) return;
  const map = safeStorage.get<Record<string, boolean>>(BIOMETRIC_APP_LOCK_KEY, {});
  map[userId] = enabled;
  safeStorage.set(BIOMETRIC_APP_LOCK_KEY, map);
  if (enabled) {
    markBiometricSessionUnlocked(userId, true);
  }
  notifyBiometricChange();
}

// Nonce criptográfico em memória por execução para impedir bypass manual via DevTools sessionStorage
const SESSION_RUNTIME_NONCE = (() => {
  const arr = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(arr);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
})();
const unlockedUsersInMemory = new Set<string>();

function computeSessionUnlockToken(userId: string): string {
  return `mtp_bio_ok_${userId}_${SESSION_RUNTIME_NONCE}`;
}

/**
 * Controla se a sessão atual já foi desbloqueada por biometria nesta abertura do app (Fail-Closed)
 */
export function isBiometricSessionUnlocked(userId: string): boolean {
  if (!userId) return false;
  if (typeof window === 'undefined') return false;
  if (!unlockedUsersInMemory.has(userId)) return false;
  try {
    const expectedToken = computeSessionUnlockToken(userId);
    return sessionStorage.getItem(`${BIOMETRIC_SESSION_UNLOCKED_KEY}_${userId}`) === expectedToken;
  } catch {
    return unlockedUsersInMemory.has(userId);
  }
}

export function markBiometricSessionUnlocked(userId: string, unlocked: boolean): void {
  if (!userId || typeof window === 'undefined') return;
  if (unlocked) {
    unlockedUsersInMemory.add(userId);
  } else {
    unlockedUsersInMemory.delete(userId);
  }
  try {
    if (unlocked) {
      sessionStorage.setItem(
        `${BIOMETRIC_SESSION_UNLOCKED_KEY}_${userId}`,
        computeSessionUnlockToken(userId)
      );
    } else {
      sessionStorage.removeItem(`${BIOMETRIC_SESSION_UNLOCKED_KEY}_${userId}`);
    }
  } catch {
    // Ignore sessionStorage restrictions; unlockedUsersInMemory still enforces state
  }
  notifyBiometricChange();
}

/**
 * Remove credenciais biométricas de um usuário
 */
export function removeUserBiometricCredentials(userId: string): void {
  const remaining = getStoredBiometricCredentials().filter((c) => c.userId !== userId);
  safeStorage.set(BIOMETRIC_CREDENTIALS_KEY, remaining);
  const map = safeStorage.get<Record<string, boolean>>(BIOMETRIC_APP_LOCK_KEY, {});
  delete map[userId];
  safeStorage.set(BIOMETRIC_APP_LOCK_KEY, map);
  markBiometricSessionUnlocked(userId, false);
  notifyBiometricChange();
}

/**
 * Registra uma nova credencial WebAuthn (FaceID / TouchID / Impressão Digital) para o usuário
 */
export async function registerBiometricCredential(
  user: UserProfile
): Promise<{ success: boolean; credential?: StoredBiometricCredential; error?: string }> {
  if (
    typeof window === 'undefined' ||
    typeof window.PublicKeyCredential === 'undefined' ||
    !navigator.credentials?.create
  ) {
    return {
      success: false,
      error: 'Este navegador ou dispositivo não suporta autenticação biométrica (WebAuthn).',
    };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userIdBytes = new TextEncoder().encode(user.id);
    const rpId = window.location.hostname || 'localhost';

    const existingForUser = getUserBiometricCredentials(user.id);
    const excludeCredentials: PublicKeyCredentialDescriptor[] = existingForUser.map((cred) => ({
      id: base64UrlToUint8Array(cred.credentialId) as BufferSource,
      type: 'public-key',
      transports: ['internal'],
    }));

    const publicKeyOptions: PublicKeyCredentialCreationOptions = {
      challenge: challenge as BufferSource,
      rp: {
        name: 'MeuTreino Pro',
        id: rpId,
      },
      user: {
        id: userIdBytes as BufferSource,
        name: user.username || user.name || user.id,
        displayName: user.name || user.username || 'Atleta',
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256 (padrão iOS FaceID / Android Biometrics)
        { alg: -257, type: 'public-key' }, // RS256 (Windows Hello / compatibilidade ampla)
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
        requireResidentKey: false,
      },
      timeout: 60000,
      attestation: 'none',
      excludeCredentials,
    };

    const createdCredential = (await navigator.credentials.create({
      publicKey: publicKeyOptions,
    })) as PublicKeyCredential | null;

    if (!createdCredential || !createdCredential.rawId || !createdCredential.response) {
      return {
        success: false,
        error: 'Não foi possível concluir o registro da biometria.',
      };
    }

    // Valida clientDataJSON (type, challenge e origin) para garantir integridade da cerimônia WebAuthn
    const expectedChallengeB64 = bufferToBase64Url(challenge);
    try {
      const clientDataJsonStr = new TextDecoder().decode(
        createdCredential.response.clientDataJSON
      );
      const clientData = JSON.parse(clientDataJsonStr);
      if (
        clientData.type !== 'webauthn.create' ||
        clientData.challenge !== expectedChallengeB64 ||
        clientData.origin !== window.location.origin
      ) {
        return {
          success: false,
          error: 'Falha na validação criptográfica de origem/desafio da biometria.',
        };
      }
    } catch {
      return {
        success: false,
        error: 'Resposta de registro biométrico inválida.',
      };
    }

    const credentialId = bufferToBase64Url(createdCredential.rawId);
    const nowIso = new Date().toISOString();
    const record: StoredBiometricCredential = {
      credentialId,
      userId: user.id,
      username: user.username,
      userDisplayName: user.name,
      deviceLabel: getDeviceBiometricLabel(),
      createdAt: nowIso,
      lastUsedAt: nowIso,
    };

    const all = getStoredBiometricCredentials().filter(
      (c) => c.credentialId !== credentialId && c.userId !== user.id
    );
    all.push(record);
    safeStorage.set(BIOMETRIC_CREDENTIALS_KEY, all);

    // Ativa automaticamente o desbloqueio rápido por biometria
    setBiometricAppLockEnabled(user.id, true);
    markBiometricSessionUnlocked(user.id, true);
    notifyBiometricChange();

    return {
      success: true,
      credential: record,
    };
  } catch (err: any) {
    const errName = err?.name || '';
    const errMsg = err?.message || '';

    if (errName === 'InvalidStateError') {
      return {
        success: false,
        error: 'A biometria deste aparelho já está vinculada ao seu perfil.',
      };
    }
    if (
      errName === 'SecurityError' ||
      errMsg.toLowerCase().includes('feature policy') ||
      errMsg.toLowerCase().includes('permissions policy') ||
      errMsg.toLowerCase().includes('publickey-credentials')
    ) {
      return {
        success: false,
        error:
          'Para ativar o Face ID / Impressão Digital, abra o aplicativo diretamente no navegador do celular ou tela inicial (fora de janelas embutidas).',
      };
    }
    if (errName === 'NotAllowedError' || errName === 'AbortError') {
      return {
        success: false,
        error: 'Leitura biométrica cancelada ou não autorizada no aparelho.',
      };
    }

    return {
      success: false,
      error: 'Não foi possível registrar a biometria neste dispositivo. Verifique se o Face ID ou Impressão Digital está ativo no aparelho.',
    };
  }
}

/**
 * Realiza a autenticação biométrica (WebAuthn Assertion) para login sem senha ou desbloqueio do app
 */
export async function authenticateWithBiometrics(options?: {
  userId?: string;
  username?: string;
}): Promise<{
  success: boolean;
  user?: UserProfile;
  error?: string;
}> {
  if (
    typeof window === 'undefined' ||
    typeof window.PublicKeyCredential === 'undefined' ||
    !navigator.credentials?.get
  ) {
    return {
      success: false,
      error: 'Autenticação biométrica não disponível neste navegador.',
    };
  }

  const allCredentials = getStoredBiometricCredentials();
  let candidateCredentials = allCredentials;

  if (options?.userId) {
    candidateCredentials = allCredentials.filter((c) => c.userId === options.userId);
  } else if (options?.username) {
    const cleanUsername = options.username.trim().toLowerCase();
    candidateCredentials = allCredentials.filter(
      (c) => c.username.toLowerCase() === cleanUsername
    );
  }

  if (candidateCredentials.length === 0) {
    return {
      success: false,
      error: 'Nenhuma biometria cadastrada neste aparelho. Entre com sua senha e ative o Face ID / Impressão Digital no seu Perfil.',
    };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    const rpId = window.location.hostname || 'localhost';

    const allowCredentials: PublicKeyCredentialDescriptor[] = candidateCredentials.map(
      (cred) => ({
        id: base64UrlToUint8Array(cred.credentialId) as BufferSource,
        type: 'public-key',
        transports: ['internal'],
      })
    );

    const publicKeyRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge: challenge as BufferSource,
      rpId,
      allowCredentials,
      userVerification: 'required',
      timeout: 60000,
    };

    const assertion = (await navigator.credentials.get({
      publicKey: publicKeyRequestOptions,
    })) as PublicKeyCredential | null;

    if (!assertion || !assertion.rawId || !assertion.response) {
      return {
        success: false,
        error: 'Verificação biométrica não concluída.',
      };
    }

    const assertionResponse = assertion.response as AuthenticatorAssertionResponse;

    // 1. Verifica clientDataJSON (type === 'webauthn.get', challenge exato e origin exata)
    const expectedChallengeB64 = bufferToBase64Url(challenge);
    try {
      const clientDataStr = new TextDecoder().decode(assertionResponse.clientDataJSON);
      const clientData = JSON.parse(clientDataStr);
      if (
        clientData.type !== 'webauthn.get' ||
        clientData.challenge !== expectedChallengeB64 ||
        clientData.origin !== window.location.origin
      ) {
        return {
          success: false,
          error: 'Desafio ou origem WebAuthn inválidos. Autenticação bloqueada.',
        };
      }
    } catch {
      return {
        success: false,
        error: 'Dados de resposta WebAuthn corrompidos.',
      };
    }

    // 2. Verifica authenticatorData: exige flags UP (User Present = 0x01) e UV (User Verified = 0x04)
    if (assertionResponse.authenticatorData) {
      const authData = new Uint8Array(assertionResponse.authenticatorData);
      if (authData.byteLength < 37) {
        return {
          success: false,
          error: 'AuthenticatorData WebAuthn inválido.',
        };
      }
      const flags = authData[32];
      const isUserPresent = (flags & 0x01) !== 0;
      const isUserVerified = (flags & 0x04) !== 0;
      if (!isUserPresent || !isUserVerified) {
        return {
          success: false,
          error: 'Verificação biométrica presencial não confirmada pelo sensor do dispositivo.',
        };
      }
    }

    // 3. Exige correspondência exata do credentialId retornado pelo autenticador (sem fallback inseguro)
    const assertedCredentialId = bufferToBase64Url(assertion.rawId);
    const matchedRecord = candidateCredentials.find(
      (c) => c.credentialId === assertedCredentialId
    );

    if (!matchedRecord) {
      return {
        success: false,
        error: 'Credencial biométrica não reconhecida para este perfil.',
      };
    }

    // Atualiza timestamp de último uso da credencial
    const updatedAll = allCredentials.map((c) =>
      c.credentialId === matchedRecord!.credentialId
        ? { ...c, lastUsedAt: new Date().toISOString() }
        : c
    );
    safeStorage.set(BIOMETRIC_CREDENTIALS_KEY, updatedAll);

    const loginRes = authStorage.loginWithBiometricUserId(matchedRecord.userId);
    if (loginRes.error || !loginRes.user) {
      return {
        success: false,
        error: loginRes.error || 'Perfil vinculado à biometria não foi encontrado.',
      };
    }

    markBiometricSessionUnlocked(loginRes.user.id, true);
    notifyBiometricChange();

    return {
      success: true,
      user: loginRes.user,
    };
  } catch (err: any) {
    const errName = err?.name || '';
    const errMsg = err?.message || '';

    if (
      errName === 'SecurityError' ||
      errMsg.toLowerCase().includes('feature policy') ||
      errMsg.toLowerCase().includes('permissions policy') ||
      errMsg.toLowerCase().includes('publickey-credentials')
    ) {
      return {
        success: false,
        error:
          'O navegador bloqueou o sensor biométrico dentro desta visualização embutida. Abra o app em tela cheia no celular ou use sua senha.',
      };
    }

    if (errName === 'NotAllowedError' || errName === 'AbortError') {
      return {
        success: false,
        error: 'Leitura biométrica cancelada ou não reconhecida. Tente novamente ou use sua senha.',
      };
    }

    return {
      success: false,
      error: 'Falha ao validar biometria. Tente novamente ou acesse com sua senha.',
    };
  }
}
