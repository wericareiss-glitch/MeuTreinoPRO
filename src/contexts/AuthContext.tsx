/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile, MuscleGroup } from '../types/workout';
import { authStorage } from '../utils/auth';
import { safeStorage } from '../utils/storage';
import {
  auth,
  syncUserProfileToCloud,
  syncAllToFirebase
} from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { checkAndTriggerScheduledNotification } from '../utils/notifications';
import {
  isBiometricAppLockEnabled,
  isBiometricSessionUnlocked,
  onBiometricChange,
} from '../utils/biometricAuth';

export interface AuthContextType {
  currentUser: UserProfile | null;
  isAuthOpen: boolean;
  setIsAuthOpen: (open: boolean) => void;
  isBudgetOpen: boolean;
  setIsBudgetOpen: (open: boolean) => void;
  isBiometricLocked: boolean;
  setIsBiometricLocked: (locked: boolean) => void;
  handleAuthSuccess: (user: UserProfile) => void;
  handleLogout: () => void;
  handleDeleteProfile: (userId: string) => void;
  handleSwitchProfile: () => void;
  updateUser: (updatedUser: UserProfile) => void;
  handleSaveBudgets: (weekly: number, muscleBudgets: Record<MuscleGroup, number>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{
  children: React.ReactNode;
  onShowToast: (msg: string) => void;
}> = ({ children, onShowToast }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authStorage.getActiveUser());
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(() => !authStorage.getActiveUser());
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [isBiometricLocked, setIsBiometricLocked] = useState<boolean>(() => {
    const u = authStorage.getActiveUser();
    if (!u) return false;
    return isBiometricAppLockEnabled(u.id) && !isBiometricSessionUnlocked(u.id);
  });

  // Sync biometrics
  useEffect(() => {
    const syncBiometricLock = () => {
      if (!currentUser) {
        setIsBiometricLocked(false);
        return;
      }
      setIsBiometricLocked(
        isBiometricAppLockEnabled(currentUser.id) &&
          !isBiometricSessionUnlocked(currentUser.id)
      );
    };
    syncBiometricLock();
    return onBiometricChange(syncBiometricLock);
  }, [currentUser]);

  // Push notifications check
  useEffect(() => {
    if (!currentUser?.id) return;
    const checkNow = () => {
      checkAndTriggerScheduledNotification(currentUser.id, currentUser.name || 'Atleta');
    };
    checkNow();
    const interval = setInterval(checkNow, 25000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkNow();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentUser?.id, currentUser?.name]);

  // Sync to Firebase on login / load
  useEffect(() => {
    if (currentUser?.id && !currentUser.isVisitor && !currentUser.id.startsWith('user_guest_') && auth.currentUser) {
      syncAllToFirebase(currentUser.id, currentUser).catch(() => {});
    }
  }, [currentUser?.id]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser && currentUser && !currentUser.isVisitor && !currentUser.id.startsWith('user_guest_')) {
        syncAllToFirebase(currentUser.id, currentUser).catch(() => {});
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleAuthSuccess = useCallback((user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthOpen(false);
    authStorage.setActiveUserId(user.id);
    onShowToast(`Bem-vindo, ${user.name}!`);
  }, [onShowToast]);

  const handleLogout = useCallback(() => {
    authStorage.logout();
    setCurrentUser(null);
    setIsAuthOpen(true);
    onShowToast('Sessão encerrada.');
  }, [onShowToast]);

  const handleDeleteProfile = useCallback((userId: string) => {
    authStorage.deleteUser(userId);
    authStorage.logout();
    setCurrentUser(null);
    setIsAuthOpen(true);
    onShowToast('Perfil excluído e sessão encerrada com segurança.');
  }, [onShowToast]);

  const handleSwitchProfile = useCallback(() => {
    authStorage.logout();
    setCurrentUser(null);
    setIsAuthOpen(true);
    onShowToast('Sessão bloqueada. Faça login para acessar outro perfil.');
  }, [onShowToast]);

  const updateUser = useCallback((updated: UserProfile) => {
    setCurrentUser(updated);
    authStorage.saveUsers(
      authStorage.getUsers().map((u) => (u.id === updated.id ? updated : u))
    );
    if (!updated.isVisitor) {
      syncUserProfileToCloud(updated).catch(() => {});
    }
  }, []);

  const handleSaveBudgets = useCallback((weekly: number, muscleBudgets: Record<MuscleGroup, number>) => {
    if (!currentUser) return;
    const updated = authStorage.updateProfile(currentUser.id, {
      weeklyBudget: weekly,
      muscleBudgets,
    });
    if (updated) {
      setCurrentUser(updated);
      onShowToast(`Metas de volume atualizadas para ${weekly} séries/semana!`);
      if (!updated.isVisitor) {
        syncUserProfileToCloud(updated).catch(() => {});
      }
    }
    setIsBudgetOpen(false);
  }, [currentUser, onShowToast]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthOpen,
        setIsAuthOpen,
        isBudgetOpen,
        setIsBudgetOpen,
        isBiometricLocked,
        setIsBiometricLocked,
        handleAuthSuccess,
        handleLogout,
        handleDeleteProfile,
        handleSwitchProfile,
        updateUser,
        handleSaveBudgets,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
