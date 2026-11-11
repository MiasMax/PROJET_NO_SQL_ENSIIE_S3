import React from 'react';

export default function PokedexLens({ compact = false }) {
  return (
    <div className="inline-flex items-center gap-1.5 shrink-0" aria-hidden="true">
      {/* Main optical cyan Pokédex camera lens */}
      <span
        className={`${
          compact ? 'w-5 h-5 border-2' : 'w-7 h-7 border-[2.5px]'
        } rounded-full bg-gradient-to-br from-[#67E8F9] via-[#0EA5E9] to-[#0369A1] border-white dark:border-[#30363D] shadow-[0_0_0_1.5px_#111827] relative flex items-center justify-center`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white/85 -translate-x-0.5 -translate-y-0.5" />
      </span>

      {/* Tri-status indicator LEDs (Red / Amber / Green) */}
      {!compact && (
        <span className="inline-flex items-center gap-1 ml-0.5">
          <span className="w-2 h-2 rounded-full bg-[#EF4444] border border-[#7F1D1D]" />
          <span className="w-2 h-2 rounded-full bg-[#F59E0B] border border-[#78350F]" />
          <span className="w-2 h-2 rounded-full bg-[#22C55E] border border-[#14532D]" />
        </span>
      )}
    </div>
  );
}

