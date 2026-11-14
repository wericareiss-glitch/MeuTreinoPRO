/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Heart, 
  Copy, 
  Check, 
  X, 
  QrCode, 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  Coffee, 
  Zap, 
  Flame, 
  Award, 
  Crown,
  Sparkles
} from 'lucide-react';
import { getProtectedCreatorKey, getMaskedCreatorKey, getMaskedCreatorName } from '../utils/privacy';
import { generatePixPayload } from '../utils/pixPayload';

export interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (message: string) => void;
}

interface DonationPreset {
  value: number;
  label: string;
  badge: string;
  icon: React.ReactNode;
  desc: string;
}

const PRESETS: DonationPreset[] = [
  {
    value: 5,
    label: 'R$ 5,00',
    badge: 'Café Expresso',
    icon: <Coffee className="w-4 h-4 text-amber-400" />,
    desc: 'Um incentivo para manter o app sempre evoluindo!',
  },
  {
    value: 10,
    label: 'R$ 10,00',
    badge: 'Energia',
    icon: <Zap className="w-4 h-4 text-emerald-400" />,
    desc: 'Ajuda a manter seus treinos salvos e disponíveis.',
  },
  {
    value: 20,
    label: 'R$ 20,00',
    badge: 'Whey Protein',
    icon: <Flame className="w-4 h-4 text-orange-400" />,
    desc: 'Apoio para manter o aplicativo rápido e estável.',
  },
  {
    value: 50,
    label: 'R$ 50,00',
    badge: 'Apoiador Pro',
    icon: <Award className="w-4 h-4 text-rose-400" />,
    desc: 'Financia novas ferramentas de treino.',
  },
  {
    value: 100,
    label: 'R$ 100,00',
    badge: 'Patrocinador',
    icon: <Crown className="w-4 h-4 text-yellow-400" />,
    desc: 'Incentivo máximo para a evolução do app.',
  },
];

export const DonationModal: React.FC<DonationModalProps> = ({ 
  isOpen, 
  onClose,
  onShowToast 
}) => {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(20);
  const [customValue, setCustomValue] = useState<string>('20,00');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [pixPayload, setPixPayload] = useState<string>('');
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [isKeyRevealed, setIsKeyRevealed] = useState<boolean>(false);

  const rawKey = getProtectedCreatorKey();
  const maskedKey = getMaskedCreatorKey();

  // Calcular valor numérico atual
  const numericAmount = (() => {
    const parsed = parseFloat(customValue.replace(',', '.'));
    return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
  })();

  // Gerar novo payload PIX e novo QR Code automaticamente sempre que o valor mudar
  useEffect(() => {
    if (!isOpen) return;

    try {
      const payload = generatePixPayload({
        pixKey: rawKey,
        amount: numericAmount > 0 ? numericAmount : undefined,
        merchantName: 'MEUTREINO PRO',
        merchantCity: 'SAO PAULO',
      });
      setPixPayload(payload);

      QRCode.toDataURL(payload, {
        width: 220,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      }).then((url) => {
        setQrCodeDataUrl(url);
      }).catch(() => {
        setQrCodeDataUrl('');
      });
    } catch {
      // Ignora falhas de parsing
    }
  }, [isOpen, numericAmount, rawKey]);

  if (!isOpen) return null;

  const handleSelectPreset = (val: number) => {
    setSelectedPreset(val);
    setCustomValue(val.toFixed(2).replace('.', ','));
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9,]/g, '');
    setCustomValue(raw);
    setSelectedPreset(null);
  };

  const triggerVibrate = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 30, 60]);
      } catch {}
    }
  };

  const handleCopyPayload = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && pixPayload) {
      navigator.clipboard.writeText(pixPayload).then(() => {
        setCopiedPayload(true);
        triggerVibrate();
        if (onShowToast) {
          onShowToast('Código PIX Copia e Cola copiado com sucesso!');
        }
        setTimeout(() => setCopiedPayload(false), 2800);
      });
    }
  };

  const handleCopyKey = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(rawKey).then(() => {
        setCopiedKey(true);
        triggerVibrate();
        if (onShowToast) {
          onShowToast('Chave PIX copiada com sucesso!');
        }
        setTimeout(() => setCopiedKey(false), 2800);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
      <div 
        className="menu-dropdown-surface border border-theme-menu rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Glow de fundo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-to-b from-pink-500/15 via-rose-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-theme-menu-subtle flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-theme-heading">
                  Apoie o MeuTreino Pro 💖
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  PIX
                </span>
              </div>
              <p className="text-xs text-theme-muted">
                Contribuição voluntária para manutenção do app
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-theme-muted hover:text-theme-heading flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 overscroll-contain">
          {/* Mensagem Institucional Discreta */}
          <div className="bg-theme-surface-secondary border border-theme-subtle rounded-2xl p-3.5 text-xs text-theme-muted leading-relaxed">
            O <strong>MeuTreino Pro</strong> é um projeto independente, gratuito e sem anúncios invasivos. Sua contribuição voluntária ajuda a manter o app no ar e financia novas ferramentas de treino.
          </div>

          {/* 1. Escolha de Valores Fixos */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-theme-muted uppercase tracking-wider block">
              Escolha uma sugestão de valor:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleSelectPreset(preset.value)}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[78px] ${
                      isSelected
                        ? 'bg-pink-500/15 border-pink-500 text-theme-heading shadow-md shadow-pink-500/15 ring-1 ring-pink-500/30'
                        : 'bg-theme-surface-secondary border-theme-subtle text-theme-muted hover:border-pink-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5">
                        {preset.icon}
                        <span className="text-[10px] font-bold">{preset.badge}</span>
                      </div>
                      <span className="text-xs font-mono font-black text-pink-400">{preset.label}</span>
                    </div>
                    <p className="text-[10px] text-theme-muted leading-tight mt-1 line-clamp-1">{preset.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Campo de Valor Livre */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-theme-muted uppercase tracking-wider block">
              Ou digite outro valor livre:
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-black text-sm text-pink-400">
                  R$
                </span>
                <input
                  type="text"
                  value={customValue}
                  onChange={handleCustomChange}
                  placeholder="0,00"
                  className="w-full pl-10 pr-3 py-2 rounded-xl bg-theme-surface-secondary border border-theme-subtle text-theme-heading font-mono font-bold text-sm focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>
              <div className="flex items-center gap-1">
                {[5, 10, 25].map((add) => (
                  <button
                    key={add}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(customValue.replace(',', '.') || '0');
                      const next = (isNaN(cur) ? 0 : cur) + add;
                      setCustomValue(next.toFixed(2).replace('.', ','));
                      setSelectedPreset(null);
                    }}
                    className="px-2 py-2 rounded-xl bg-theme-surface-secondary hover:bg-white/5 border border-theme-subtle text-[11px] font-mono font-bold text-theme-muted hover:text-theme-heading transition-colors cursor-pointer"
                  >
                    +{add}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. QR Code Automático com o Valor Escolhido */}
          <div className="p-4 rounded-2xl bg-theme-surface-secondary border border-theme-subtle flex flex-col items-center text-center space-y-3">
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-extrabold text-theme-heading flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>QR Code Automático</span>
              </span>
              <span className="text-xs font-mono font-black px-2 py-0.5 rounded-lg bg-pink-500/20 text-pink-300 border border-pink-500/30">
                {numericAmount > 0 ? `R$ ${numericAmount.toFixed(2).replace('.', ',')}` : 'Valor Livre'}
              </span>
            </div>

            {/* Imagem do QR Code Renderizado */}
            {qrCodeDataUrl ? (
              <div className="p-2.5 bg-white rounded-2xl shadow-md border-2 border-slate-200">
                <img 
                  src={qrCodeDataUrl} 
                  alt="QR Code PIX para Doação"
                  className="w-44 h-44 object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="w-44 h-44 rounded-2xl bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                Gerando QR Code...
              </div>
            )}

            <p className="text-[11px] text-theme-muted max-w-xs">
              Aponte a câmera do aplicativo do seu banco para ler o QR Code com o valor já configurado.
            </p>

            {/* Botão Copiar PIX Copia e Cola */}
            <button
              type="button"
              onClick={handleCopyPayload}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98 ${
                copiedPayload
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {copiedPayload ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Código Copia e Cola Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Código PIX (Copia e Cola)</span>
                </>
              )}
            </button>
          </div>

          {/* 4. Chave PIX Protegida & Oculta */}
          <div className="p-3.5 rounded-2xl bg-theme-surface-secondary border border-theme-subtle space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-theme-muted uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-pink-400" />
                <span>Chave PIX (Protegida)</span>
              </span>

              <button
                type="button"
                onClick={() => setIsKeyRevealed((prev) => !prev)}
                className="flex items-center gap-1 text-[11px] font-semibold text-theme-muted hover:text-theme-heading transition-colors cursor-pointer"
              >
                {isKeyRevealed ? (
                  <>
                    <EyeOff className="w-3 h-3" />
                    <span>Ocultar</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    <span>Revelar</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 bg-theme-menu p-2.5 rounded-xl border border-theme-subtle">
              <span className="font-mono text-xs font-bold text-theme-heading truncate">
                {isKeyRevealed ? rawKey : maskedKey}
              </span>

              <button
                type="button"
                onClick={handleCopyKey}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-theme-surface-secondary hover:bg-white/5 border border-theme-subtle text-theme-heading transition-colors cursor-pointer shrink-0 flex items-center gap-1 active:scale-95"
              >
                {copiedKey ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copiada</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar Chave</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-theme-muted pt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Destinatário: {getMaskedCreatorName()}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-theme-menu-subtle flex items-center justify-between gap-3">
          <span className="text-xs text-theme-muted font-medium">
            Muito obrigado pelo seu apoio! 🙏
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-theme-surface-secondary hover:bg-white/5 text-theme-heading transition-colors cursor-pointer border border-theme-subtle"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
