/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trash2 } from 'lucide-react';

export interface DeleteProfileModalProps {
  isOpen: boolean;
  userName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteProfileModal: React.FC<DeleteProfileModalProps> = ({
  isOpen,
  userName,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#101828] border border-rose-500/40 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
        <div className="flex items-center gap-3 mb-3 text-rose-400">
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30">
            <Trash2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-black text-white">Excluir Perfil?</h3>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Tem certeza que deseja apagar o perfil <strong className="text-white">{userName}</strong>? Todos os treinos gerados, histórico e registros deste aparelho serão excluídos. Esta ação não pode ser desfeita.
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30 transition-all cursor-pointer active:scale-95"
          >
            Sim, Excluir Perfil
          </button>
        </div>
      </div>
    </div>
  );
};
