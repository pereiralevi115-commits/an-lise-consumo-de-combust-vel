import React from 'react';
import { Trophy } from 'lucide-react';

export default function RankingMotoristas() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="w-8 h-8 text-yellow-400" />
        <h1 className="text-3xl font-bold text-white">Ranking de Motoristas</h1>
      </div>
      <p className="text-slate-400">Página em construção.</p>
    </div>
  );
}