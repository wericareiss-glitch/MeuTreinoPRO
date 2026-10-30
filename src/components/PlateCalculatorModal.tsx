/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Disc } from 'lucide-react';

interface PlateCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWeight?: number;
}

const AVAILABLE_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export const PlateCalculatorModal: React.FC<PlateCalculatorModalProps> = ({
  isOpen,
  onClose,
  initialWeight = 80,
}) => {
  const [targetWeight, setTargetWeight] = useState(initialWeight || 80);
  const [barWeight, setBarWeight] = useState(20);

  React.useEffect(() => {
    if (initialWeight && initialWeight > 0) {
      setTargetWeight(initialWeight);
    }
  }, [initialWeight, isOpen]);

  if (!isOpen) return null;

  // Calculate plates per side
  const weightToPlate = Math.max(0, targetWeight - barWeight);
  const weightPerSide = weightToPlate / 2;

  let remaining = weightPerSide;
  const platesPerSide: { weight: number; count: number }[] = [];

  for (const plate of AVAILABLE_PLATES) {
    if (remaining >= plate) {
      const count = Math.floor(remaining / plate);
      platesPerSide.push({ weight: plate, count });
      remaining = Math.round((remaining - count * plate) * 100) / 100;
    }
  }

  const getPlateColor = (plate: number) => {
    switch (plate) {
      case 25:
        return 'bg-red-600 text-white border-red-500';
      case 20:
        return 'bg-blue-600 text-white border-blue-500';
      case 15:
        return 'bg-yellow-500 text-slate-950 border-yellow-400 font-black';
      case 10:
        return 'bg-emerald-600 text-white border-emerald-500';
      case 5:
        return 'bg-slate-300 text-slate-950 border-white font-black';
      case 2.5:
        return 'bg-slate-700 text-white border-slate-600';
      case 1.25:
        return 'bg-slate-800 text-slate-300 border-slate-700';
      default:
        return 'bg-slate-700 text-white border-slate-600';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Disc className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Calculadora de Anilhas na Barra
              </h3>
              <p className="text-xs text-slate-400">Distribuição Simétrica por Lado</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-[#0c1220] p-3 rounded-xl border border-slate-800">
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Carga Alvo Total
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="2.5"
                value={targetWeight}
                onChange={(e) => setTargetWeight(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#131d31] border border-slate-700 rounded-lg px-2.5 py-1 text-center font-mono font-bold text-white text-base focus:outline-none focus:border-sky-400"
              />
              <span className="text-xs text-slate-400 font-mono">kg</span>
            </div>
            {/* Quick +/- buttons */}
            <div className="flex items-center gap-1 mt-2">
              <button
                type="button"
                onClick={() => setTargetWeight((w) => Math.max(barWeight, w - 5))}
                className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] font-bold"
              >
                -5kg
              </button>
              <button
                type="button"
                onClick={() => setTargetWeight((w) => Math.max(barWeight, w - 2.5))}
                className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] font-bold"
              >
                -2.5
              </button>
              <button
                type="button"
                onClick={() => setTargetWeight((w) => w + 2.5)}
                className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 font-mono text-[10px] font-bold"
              >
                +2.5
              </button>
              <button
                type="button"
                onClick={() => setTargetWeight((w) => w + 5)}
                className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 font-mono text-[10px] font-bold"
              >
                +5kg
              </button>
            </div>
          </div>

          <div className="bg-[#0c1220] p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Peso da Barra
              </label>
              <select
                value={barWeight}
                onChange={(e) => setBarWeight(parseFloat(e.target.value))}
                className="w-full bg-[#131d31] border border-slate-700 rounded-lg px-2 py-1.5 text-center font-mono font-bold text-white text-xs focus:outline-none focus:border-sky-400 cursor-pointer"
              >
                <option value="20">Olímpica Padrão (20 kg)</option>
                <option value="15">Olímpica Feminina (15 kg)</option>
                <option value="10">Barra W / Curta (10 kg)</option>
                <option value="0">Máquina Guiada / Smith (0 kg)</option>
              </select>
            </div>
            {/* Quick Presets */}
            <div className="flex items-center gap-1 mt-2">
              {[50, 70, 90, 110].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTargetWeight(preset)}
                  className={`flex-1 py-1 rounded font-mono text-[10px] transition-colors cursor-pointer ${
                    targetWeight === preset
                      ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                  }`}
                >
                  {preset}k
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calculation Result */}
        <div className="bg-[#0c1220] border border-slate-800 rounded-2xl p-4 text-center mb-5">
          <span className="text-xs font-semibold text-slate-400 block">
            Carga em cada extremidade da barra:
          </span>
          <span className="text-3xl font-black font-mono text-sky-400 tracking-tight my-1 block">
            {weightPerSide} kg <span className="text-xs font-normal text-slate-400">/ lado</span>
          </span>

          {remaining > 0 && (
            <span className="text-[11px] text-amber-400 mt-1 block font-mono">
              (Sobra não divisível pelas anilhas padrão: {remaining * 2}kg)
            </span>
          )}
        </div>

        {/* Visual Plate Representation */}
        <div className="space-y-2 mb-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Anilhas a colocar em CADA lado:
          </div>

          {platesPerSide.length === 0 ? (
            <div className="text-xs text-slate-500 py-3 text-center">
              Nenhuma anilha necessária (barra pura já atinge a carga).
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {platesPerSide.map((item) => (
                <div
                  key={item.weight}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-mono font-bold text-xs shadow-md ${getPlateColor(
                    item.weight
                  )}`}
                >
                  <span className="text-sm">{item.count}&times;</span>
                  <span>{item.weight} kg</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};
