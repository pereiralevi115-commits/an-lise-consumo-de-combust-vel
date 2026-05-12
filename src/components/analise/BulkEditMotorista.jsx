import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { X, Check } from 'lucide-react';

export default function BulkEditMotorista({ selectedIds, onClose, data, pontosMap }) {
  const [editField, setEditField] = useState(''); // 'oculto', 'unit'
  const [editValue, setEditValue] = useState('');
  const [updating, setUpdating] = useState(false);
  const queryClient = useQueryClient();

  const units = [...new Set(data.map(r => r.unitCode))].filter(Boolean).sort();

  const handleUpdate = async () => {
    if (!editField || !editValue) return;
    setUpdating(true);

    const CHUNK = 50;
    let done = 0;

    try {
      for (let i = 0; i < selectedIds.length; i += CHUNK) {
        const chunk = selectedIds.slice(i, i + CHUNK);
        const updateData = editField === 'oculto' ? { oculto: editValue === 'sim' } : { unit: editValue };

        await Promise.all(
          chunk.map(id => base44.entities.FuelRecord.update(id, updateData))
        );

        done += chunk.length;
      }

      queryClient.invalidateQueries({ queryKey: ['fuelRecords'] });
      onClose();
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Editar {selectedIds.length} registros</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Campo</label>
            <select
              value={editField}
              onChange={e => {
                setEditField(e.target.value);
                setEditValue('');
              }}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Selecione um campo</option>
              <option value="oculto">Ocultar / Revelar</option>
              <option value="unit">Usina</option>
            </select>
          </div>

          {editField === 'oculto' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Valor</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditValue('sim')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition border ${
                    editValue === 'sim'
                      ? 'bg-orange-100 border-orange-300 text-orange-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Ocultar
                </button>
                <button
                  onClick={() => setEditValue('não')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition border ${
                    editValue === 'não'
                      ? 'bg-green-100 border-green-300 text-green-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Revelar
                </button>
              </div>
            </div>
          )}

          {editField === 'unit' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Usina</label>
              <select
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Selecione uma usina</option>
                {units.map(u => (
                  <option key={u} value={u}>
                    {pontosMap[String(u)] || u}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-slate-200 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleUpdate}
            disabled={!editField || !editValue || updating}
            className="flex-1 py-2 px-4 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold rounded-lg transition flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            {updating ? 'Atualizando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}