import React from 'react';

export default function SectionHeader({ title, description }) {
  return (
    <div className="flex items-center gap-3 pt-2 pb-1">
      <div className="h-5 w-1 rounded-full bg-slate-300" />
      <div>
        <h2 className="text-base font-semibold text-slate-700">{title}</h2>
        {description && <p className="text-xs text-slate-400">{description}</p>}
      </div>
    </div>
  );
}