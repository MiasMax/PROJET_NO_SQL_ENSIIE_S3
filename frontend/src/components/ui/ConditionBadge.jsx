import React from 'react';
import { getConditionMeta } from '../../utils/format';

export default function ConditionBadge({ condition, status, showGrade = false, className = '' }) {
  if (status === 'SOLD') {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-[5px] border text-[11px] font-bold tracking-tight bg-neo-alt text-neo-ink-3 border-neo-border ${className}`}
      >
        Vendue
      </span>
    );
  }

  const meta = getConditionMeta(condition);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] border text-[11px] font-bold tracking-tight ${meta.badgeClass} ${className}`}
    >
      <span>{meta.label}</span>
      {showGrade && <span className="font-mono text-[10px] opacity-80">({meta.grade}/10)</span>}
    </span>
  );
}

