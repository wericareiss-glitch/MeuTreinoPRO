import React from 'react';
import { X, User } from 'lucide-react';
import { UserProfile } from '../types/workout';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateUser: (u: UserProfile) => void;
  onLogout: () => void;
  onOpenVolumeBudget: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onLogout }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Perfil de {user.name}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full py-3 rounded-2xl bg-rose-500/20 text-rose-300 font-bold text-xs border border-rose-500/40"
        >
          Sair da Conta
        </button>
      </div>
    </div>
  );
};
