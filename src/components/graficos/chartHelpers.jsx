export const COLORS = {
  liters: '#F59E0B',
  km: '#3B82F6',
  cost: '#10B981',
  neutral: '#64748B',
  betoneira: '#3B82F6',
  bombaLanca: '#10B981',
  bombaEst: '#8B5CF6',
};

export const formatAbbrev = (value) => {
  if (value == null) return '';
  if (Math.abs(value) >= 1000000) return (value / 1000000).toFixed(1) + 'M';
  if (Math.abs(value) >= 1000) return (value / 1000).toFixed(0) + 'k';
  return String(value);
};

export const formatBR = (value, decimals = 0) =>
  typeof value === 'number' ? value.toLocaleString('pt-BR', { maximumFractionDigits: decimals }) : value;

export function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-md">
      {label && <p className="text-xs font-medium text-slate-400 mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="text-sm font-medium">
          {entry.name}: {formatBR(entry.value, Math.abs(entry.value) < 100 ? 2 : 0)}
        </p>
      ))}
    </div>
  );
}

export function TopLabel({ x, y, width, value, suffix = '', decimals = 0 }) {
  if (value == null) return null;
  return (
    <text x={x + width / 2} y={y - 8} fill="#475569" textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="600">
      {formatBR(value, decimals)}{suffix ? ` ${suffix}` : ''}
    </text>
  );
}

export function OutsideLabel({ x, y, width, height, value, suffix = '', decimals = 0 }) {
  if (value == null) return null;
  return (
    <text x={x + width + 8} y={y + height / 2} fill="#334155" textAnchor="start" dominantBaseline="middle" fontSize="11" fontWeight="600">
      {formatBR(value, decimals)}{suffix ? ` ${suffix}` : ''}
    </text>
  );
}