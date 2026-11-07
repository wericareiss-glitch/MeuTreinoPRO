/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, HelpCircle, X, AlertCircle, CheckCircle2 } from 'lucide-react';

export type TechnicalTermKey =
  | 'SERIES'
  | 'REPS'
  | '1RM'
  | '6RM'
  | 'SET_TYPES'
  | 'BISET'
  | 'PR';

interface TermMetadata {
  code: TechnicalTermKey;
  title: string;
  shortSubtitle: string;
  conciseExplanation: string;
  technicalFailureGuide: string;
  practicalExamples: string[];
  accentColor: string;
}

export const TECHNICAL_TERMS_DICTIONARY: Record<TechnicalTermKey, TermMetadata> = {
  SERIES: {
    code: 'SERIES',
    title: 'Séries (Sets de Trabalho)',
    shortSubtitle: 'Rodadas completas de um mesmo exercício',
    conciseExplanation:
      'Cada bloco de repetições seguido por um período de descanso. Exemplo: "3 séries" significa executar o exercício 3 vezes com pausa de recuperação entre elas.',
    technicalFailureGuide:
      'Como validar uma Série Efetiva: Para gerar hipertrofia, a série precisa terminar próxima da falha técnica concêntrica. Se a última repetição subiu na mesma velocidade da primeira, o peso está leve (série de aquecimento).',
    practicalExamples: [
      '1ª Série: Músculo descansado — controle a descida em 2 a 3 segundos.',
      'Última Série: Fadiga acumulada — mantenha a postura sem compensar com a lombar.',
    ],
    accentColor: 'text-emerald-400 border-emerald-500/40',
  },
  REPS: {
    code: 'REPS',
    title: 'Repetições (Reps)',
    shortSubtitle: 'Ciclos completos de movimento dentro de uma série',
    conciseExplanation:
      'Quantidade de vezes seguidas que você levanta (fase concêntrica) e desce (fase excêntrica) o peso antes de descansar.',
    technicalFailureGuide:
      'Falha Técnica vs. Repetição Parcial: Uma repetição só conta como completa quando atinge a mesma amplitude das primeiras. Quando você não consegue mais completar o curso todo sem impulso, atingiu a falha técnica.',
    practicalExamples: [
      'Faixa 6–8 reps: Maior foco em tensão mecânica e carga alta.',
      'Faixa 10–15 reps: Excelente controle articular e estresse metabólico.',
    ],
    accentColor: 'text-sky-400 border-sky-500/40',
  },
  '1RM': {
    code: '1RM',
    title: '1RM (Uma Repetição Máxima Estimada)',
    shortSubtitle: 'Carga máxima teórica para 1 única repetição perfeita',
    conciseExplanation:
      'Calculado automaticamente pelas fórmulas científicas de Epley/Brzycki com base no peso e repetições que você registrou na série.',
    technicalFailureGuide:
      'Segurança Articular: Você nunca precisa testar 1 repetição máxima real (o que traz risco de lesão). Basta treinar com técnica estrita na sua faixa normal de 6 a 12 reps para descobrir seu 1RM estimado.',
    practicalExamples: [
      'Ex: 80kg × 8 reps projeta um 1RM estimado de ~101kg.',
      'Se seu 1RM estimado subiu ao longo das semanas, houve sobrecarga progressiva!',
    ],
    accentColor: 'text-purple-400 border-purple-500/40',
  },
  '6RM': {
    code: '6RM',
    title: '6RM (Seis Repetições Máximas Estimadas)',
    shortSubtitle: 'Peso estimado que levaria à falha técnica na 6ª repetição',
    conciseExplanation:
      'Mostra qual carga você aguentaria para fazer exatamente 6 repetições até o limite técnico. Ideal para calibrar séries pesadas de força e hipertrofia.',
    technicalFailureGuide:
      'Como usar na prática: Na carga de 6RM, a 4ª repetição já começa a pesar, a 5ª desacelera bastante e a 6ª é a última repetição possível sem roubar.',
    practicalExamples: [
      'Use o 6RM sugerido quando quiser fazer uma série mais pesada (Top Set) de 6 reps.',
    ],
    accentColor: 'text-amber-400 border-amber-500/40',
  },
  SET_TYPES: {
    code: 'SET_TYPES',
    title: 'Tipos de Série (W · T · F · D · RP)',
    shortSubtitle: 'Classificação biomecânica de intensidade da série',
    conciseExplanation:
      'Permite diferenciar séries preparatórias de séries principais e técnicas avançadas de intensificação.',
    technicalFailureGuide:
      'Como sentir o limite em técnicas avançadas: Em séries de Falha (F), Drop-set (D) ou Rest-Pause (RP), pare no exato segundo em que a técnica quebrar (ex: cotovelos abrindo demais ou coluna saindo do banco).',
    practicalExamples: [
      'W (Warm-up / Aquecimento): 50% a 70% da carga, para lubrificar as articulações.',
      'T (Trabalho): Série principal pesada mantendo boa velocidade e cadência.',
      'F (Falha): Série levada até a última repetição completa com postura estrita.',
      'D (Drop-set): Atingiu a falha técnica ➔ reduza 20–30% do peso e faça mais reps imediatamente.',
      'RP (Rest-Pause): Atingiu a falha técnica ➔ respire 15s e faça +3 a 5 reps.',
    ],
    accentColor: 'text-rose-400 border-rose-500/40',
  },
  BISET: {
    code: 'BISET',
    title: 'Bi-set / Super-série',
    shortSubtitle: 'Dois exercícios realizados em sequência sem pausa entre eles',
    conciseExplanation:
      'Você executa a série do 1º exercício e vai imediatamente para o 2º exercício. O cronômetro de descanso só dispara após concluir o segundo.',
    technicalFailureGuide:
      'Controle de Fadiga: No 1º exercício do Bi-set, pare quando restarem poucos graus de amplitude perfeita para manter o controle motor no 2º exercício.',
    practicalExamples: [
      'Bi-set Agonista/Antagonista (ex: Peito + Costas): Economiza tempo mantendo alta carga.',
    ],
    accentColor: 'text-purple-400 border-purple-500/40',
  },
  PR: {
    code: 'PR',
    title: 'PR (Personal Record / Recorde Pessoal)',
    shortSubtitle: 'Maior marca histórica de peso ou 1RM naquele exercício',
    conciseExplanation:
      'Dispara automaticamente quando você supera o maior peso absoluto ou o maior 1RM estimado já registrado no seu histórico para o exercício.',
    technicalFailureGuide:
      'Regra de Ouro do PR Limpo: Um novo recorde só é verdadeiro se a amplitude (descer tudo) e o controle excêntrico forem iguais aos treinos anteriores — nunca sacrifique a postura por anilhas extras.',
    practicalExamples: [
      'PR de Carga: Subiu de 60kg para 62.5kg mantendo a mesma faixa de repetições.',
      'PR de Repetições/1RM: Manteve 60kg, mas subiu de 8 para 10 repetições limpas!',
    ],
    accentColor: 'text-amber-400 border-amber-500/40',
  },
};

interface SmartTermTooltipProps {
  term: TechnicalTermKey;
  children?: React.ReactNode;
  className?: string;
  showIcon?: boolean;
  align?: 'left' | 'center' | 'right';
}

export const SmartTermTooltip: React.FC<SmartTermTooltipProps> = ({
  term,
  children,
  className = '',
  showIcon = true,
  align = 'center',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    isMobile: boolean;
  }>({ left: 12, top: 80, isMobile: true });

  const containerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const meta = TECHNICAL_TERMS_DICTIONARY[term];

  const updatePosition = useCallback(() => {
    if (!containerRef.current || typeof window === 'undefined') return;
    const rect = containerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw < 640;
    const tooltipWidth = isMobile ? Math.min(vw - 24, 384) : 320;
    const estimatedHeight = 290;

    // Horizontal alignment clamped strictly inside viewport margins (12px)
    let left = 12;
    if (isMobile) {
      left = Math.max(12, Math.round((vw - tooltipWidth) / 2));
    } else {
      if (align === 'left') {
        left = rect.left;
      } else if (align === 'right') {
        left = rect.right - tooltipWidth;
      } else {
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
      }
      left = Math.max(12, Math.min(vw - tooltipWidth - 12, Math.round(left)));
    }

    // Vertical placement: prefer above if there is enough room, otherwise place below, clamped to screen
    const spaceAbove = rect.top;
    const spaceBelow = vh - rect.bottom;

    if (spaceAbove >= estimatedHeight + 16 || (spaceAbove > spaceBelow && spaceAbove >= 180)) {
      const bottomVal = Math.max(12, Math.min(vh - 200, Math.round(vh - rect.top + 8)));
      setCoords({ left, bottom: bottomVal, top: undefined, isMobile });
    } else {
      const topVal = Math.max(12, Math.min(vh - estimatedHeight - 12, Math.round(rect.bottom + 8)));
      setCoords({ left, top: topVal, bottom: undefined, isMobile });
    }
  }, [align]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        (!popoverRef.current || !popoverRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  if (!meta) return <>{children}</>;

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex items-center group/smartterm ${className}`}
      onMouseEnter={() => {
        if (typeof window !== 'undefined' && window.innerWidth >= 640) {
          setIsOpen(true);
        }
      }}
      onMouseLeave={() => {
        if (typeof window !== 'undefined' && window.innerWidth >= 640) {
          setIsOpen(false);
        }
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="inline-flex items-center justify-between gap-1 w-full cursor-pointer focus:outline-none decoration-dotted underline-offset-2 hover:underline text-left"
        aria-label={`Explicação sobre ${meta.title}`}
      >
        {children || <span>{meta.code}</span>}
        {showIcon && (
          <HelpCircle className="w-3 h-3 text-sky-400/80 group-hover/smartterm:text-sky-300 transition-colors shrink-0" />
        )}
      </button>

      {/* Popover Inteligente via Portal (Sempre 100% alinhado com a tela no Mobile e Desktop, sem corte por overflow-hidden) */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: coords.isMobile ? '12px' : `${coords.left}px`,
              right: coords.isMobile ? '12px' : undefined,
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
            }}
            className={`z-[120] ${
              coords.isMobile ? 'mx-auto max-w-[384px]' : 'w-80'
            } p-3.5 rounded-2xl bg-[#070c18]/98 backdrop-blur-md border ${
              meta.accentColor
            } shadow-[0_16px_40px_rgba(0,0,0,0.85)] text-left animate-fadeIn space-y-2 max-h-[80vh] overflow-y-auto`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <h4 className="text-xs font-black text-white leading-tight break-words">
                    {meta.title}
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5 leading-snug">
                  {meta.shortSubtitle}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                aria-label="Fechar explicação"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Explicação Concisa */}
            <p className="text-[11px] text-slate-200 leading-relaxed break-words">
              {meta.conciseExplanation}
            </p>

            {/* Como sentir a Falha Técnica */}
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-300">
                <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Como Sentir a Falha Técnica:</span>
              </div>
              <p className="text-[10.5px] text-amber-100/90 leading-relaxed break-words">
                {meta.technicalFailureGuide}
              </p>
            </div>

            {/* Exemplos Práticos */}
            <div className="space-y-1 pt-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                Exemplos na Prática:
              </span>
              {meta.practicalExamples.map((exText, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-1.5 text-[10.5px] text-slate-300 leading-snug"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="break-words flex-1">{exText}</span>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </span>
  );
};
