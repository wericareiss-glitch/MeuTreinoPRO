/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserProfile, WorkoutSessionSummary } from '../../types/workout';

export interface ProfileViewProps {
  user: UserProfile;
  sessions: WorkoutSessionSummary[];
  onUpdateUser: (updated: UserProfile) => void;
  onLogout: () => void;
  onOpenVolumeBudget: () => void;
  onExportBackup?: () => void;
  onImportBackup?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onViewSummary?: (session: WorkoutSessionSummary) => void;
  onClearHistory?: () => void;
  onDeleteProfile?: (userId: string) => void;
  onSwitchProfile?: () => void;
}
