import React, { useState } from 'react';
import { X, Camera } from 'lucide-react';
import { BodyMeasurement } from '../types/workout';

interface BodyMeasurementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  measurements: BodyMeasurement[];
  onSaveMeasurement: (m: BodyMeasurement) => void;
  onDeleteMeasurement: (id: string) => void;
}

export const BodyMeasurementsModal: React.FC<BodyMeasurementsModalProps> = ({
  isOpen,
  onClose,
  measurements,
  onSaveMeasurement,
}) => {
  const [weight, setWeight] = useState(75);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveMeasurement({
      id: `m_${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      weightKg: weight,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Check-in & Medidas Corporais</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Peso Atual (kg)</label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#0b1220] border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold text-center text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-black cursor-pointer"
          >
            Salvar Check-in
          </button>
        </form>
      </div>
    </div>
  );
};
