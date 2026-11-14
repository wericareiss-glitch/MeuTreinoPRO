/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Bell, Plus, Trash2, MessageSquare, Check } from 'lucide-react';
import { DailyReminderConfig, getNextScheduledReminderInfo } from '../../utils/notifications';

interface ReminderSettingsPanelProps {
  reminderConfig: DailyReminderConfig;
  configuredTimes: string[];
  nextReminderInfo: ReturnType<typeof getNextScheduledReminderInfo>;
  permStatus: NotificationPermission;
  testNotifSuccess: boolean;
  onToggleReminder: () => void;
  onUpdatePrimaryTime: (index: number, newTime: string) => void;
  onAddReminderTime: (timeToAdd?: string) => void;
  onRemoveReminderTime: (timeToRemove: string) => void;
  onToggleDay: (day: number) => void;
  onUpdateCustomMessage: (msg: string) => void;
  onSendTestNotification: () => void;
  onClose: () => void;
}

export const ReminderSettingsPanel: React.FC<ReminderSettingsPanelProps> = ({
  reminderConfig,
  configuredTimes,
  nextReminderInfo,
  permStatus,
  testNotifSuccess,
  onToggleReminder,
  onUpdatePrimaryTime,
  onAddReminderTime,
  onRemoveReminderTime,
  onToggleDay,
  onUpdateCustomMessage,
  onSendTestNotification,
  onClose,
}) => {
  const [newTimeInput, setNewTimeInput] = useState('07:00');

  return (
    <div className="bg-[#0b1220] border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl animate-fadeIn space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white">
              Agenda de Lembretes de Treino
            </h3>
            {nextReminderInfo && (
              <span className="text-[11px] font-mono text-emerald-400 block">
                Próximo aviso: {nextReminderInfo.dayLabel} às {nextReminderInfo.nextTime} ({nextReminderInfo.countdownText})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={onToggleReminder}
            className={`min-h-[36px] px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reminderConfig.enabled
                ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {reminderConfig.enabled ? 'Ativo' : 'Ativar Lembretes'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[36px] px-2.5 text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gerenciador de Horários Definidos */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-slate-300 block">
            Horários Definidos ({configuredTimes.length}):
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {configuredTimes.map((slot, idx) => (
              <div
                key={`${slot}-${idx}`}
                className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5"
              >
                <input
                  type="time"
                  value={slot}
                  onChange={(e) => onUpdatePrimaryTime(idx, e.target.value)}
                  className="bg-transparent text-xs sm:text-sm font-mono font-bold text-amber-300 focus:outline-none cursor-pointer"
                />
                {configuredTimes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveReminderTime(slot)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Remover este horário"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="time"
              value={newTimeInput}
              onChange={(e) => setNewTimeInput(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
            />
            <button
              type="button"
              onClick={() => onAddReminderTime(newTimeInput)}
              className="min-h-[38px] px-3 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[10px] text-slate-500 font-medium">Atalhos:</span>
            {['06:30', '08:00', '12:30', '18:00', '19:30', '21:00'].map((preset) => {
              const isConfigured = configuredTimes.includes(preset);
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onAddReminderTime(preset)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                    isConfigured
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dias da Semana & Mensagem Personalizada */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Dias de Treino:
            </label>
            <div className="grid grid-cols-7 gap-1">
              {[
                { day: 0, label: 'D', full: 'Domingo' },
                { day: 1, label: 'S', full: 'Segunda' },
                { day: 2, label: 'T', full: 'Terça' },
                { day: 3, label: 'Q', full: 'Quarta' },
                { day: 4, label: 'Q', full: 'Quinta' },
                { day: 5, label: 'S', full: 'Sexta' },
                { day: 6, label: 'S', full: 'Sábado' },
              ].map((item) => {
                const isDayActive = reminderConfig.days.includes(item.day);
                return (
                  <button
                    key={item.day}
                    type="button"
                    onClick={() => onToggleDay(item.day)}
                    className={`h-9 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center ${
                      isDayActive
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                        : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
                    }`}
                    title={item.full}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
              <span>Mensagem Personalizada (Opcional):</span>
            </label>
            <input
              type="text"
              value={reminderConfig.customMessage || ''}
              onChange={(e) => onUpdateCustomMessage(e.target.value)}
              placeholder="Ex: Hora de treinar e bater PR hoje!"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="text-xs text-slate-400">
          {permStatus === 'granted' ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              Alertas autorizados no navegador.
            </span>
          ) : permStatus === 'denied' ? (
            <span className="text-rose-400 font-semibold">
              Permissão bloqueada no navegador. Habilite nas configurações do site.
            </span>
          ) : (
            <span>A permissão de notificação será solicitada ao ativar ou testar.</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSendTestNotification}
            className="min-h-[38px] px-3.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span>Testar Alerta</span>
          </button>

          {testNotifSuccess && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-fadeIn">
              <Check className="w-3.5 h-3.5" />
              Enviado!
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
