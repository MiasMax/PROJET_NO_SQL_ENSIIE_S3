import React from 'react';

/**
 * CardWearOverlay - Ultra-Photorealistic Physical Card Wear & Condition Engine
 * 
 * Accurately replicates authentic physical trading card damage (PSA / Cardmarket grading):
 * - MINT (10): Zero flaws, pristine factory luster, perfect corners and edges.
 * - NEAR_MINT (9): Microscopic edge-whitening flecks on perimeter, sharp corners.
 * - EXCELLENT (7.5): Visible border whitening on dark ink, hairline surface scratches on foil.
 * - GOOD (6): Continuous edge chipping, authentic corner dog-ear bend with highlight/shadow,
 *             surface scuff patches, and slight patina.
 * - PLAYED (4.5): Heavy through-body crease with delamination halo, bent paper surface lighting,
 *                 severe perimeter chipping, worn-down rounded corners, and cardstock desaturation.
 *
 * Features:
 * - Genuine paper fiber fracture paths with highlight ridges and deep indentation shadows.
 * - Delamination halos simulating top plastic film separation from white paperboard core.
 * - Organic chipping specks mimicking real binder/sleeve rub-off.
 * - Dynamic specular reaction: folds catch light when card is tilted in 3D.
 */
export default function CardWearOverlay({
  condition = 'NEAR_MINT',
  className = '',
  showPinDetails = false,
  isDetailStage = false,
  glarePos = null,
}) {
  const cond = (condition || 'NEAR_MINT').toUpperCase();

  if (cond === 'MINT') {
    return null;
  }

  const isNearMint = cond === 'NEAR_MINT';
  const isExcellent = cond === 'EXCELLENT';
  const isGood = cond === 'GOOD';
  const isPlayed = cond === 'PLAYED' || cond === 'POOR';

  // Dynamic crease glint when 3D light moves across the bend (~y: 45-55%)
  const creaseGlintOpacity = glarePos && isPlayed
    ? Math.max(0, 1 - Math.abs(glarePos.y - 50) / 25) * 0.4
    : 0;

  return (
    <div
      className={`absolute inset-0 pointer-events-none select-none overflow-hidden rounded-inherit z-15 ${className}`}
      aria-hidden="true"
    >
      {/* 1. Paper Aging / Cardstock Patina Tint */}
      {(isGood || isPlayed) && (
        <div
          className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
          style={{
            background: isPlayed
              ? 'radial-gradient(circle at 50% 50%, rgba(135, 105, 55, 0.09) 0%, rgba(35, 25, 12, 0.22) 100%)'
              : 'radial-gradient(circle at 50% 50%, rgba(135, 105, 55, 0.04) 0%, rgba(35, 25, 12, 0.10) 100%)',
            mixBlendMode: 'multiply',
          }}
        />
      )}

      {/* 2. Micro Edge Whitening Inset (Sub-pixel border rub-off) */}
      <div
        className="absolute inset-0 rounded-inherit transition-all duration-300 pointer-events-none"
        style={{
          boxShadow: isNearMint
            ? 'inset 0 0 1px 0.5px rgba(255, 255, 255, 0.45)'
            : isExcellent
            ? 'inset 0 0 2px 1px rgba(255, 255, 255, 0.65), inset 0 2px 3px rgba(255, 255, 255, 0.35)'
            : isGood
            ? 'inset 0 0 3px 1.5px rgba(255, 255, 255, 0.82), inset 2px 0 6px rgba(255, 255, 255, 0.45), inset -2px 0 6px rgba(255, 255, 255, 0.45)'
            : 'inset 0 0 4px 2px rgba(255, 255, 255, 0.95), inset 3px 0 8px rgba(255, 255, 255, 0.65), inset -3px 0 8px rgba(255, 255, 255, 0.65), inset 0 3px 8px rgba(255, 255, 255, 0.55)',
          mixBlendMode: 'screen',
        }}
      />

      {/* 3. Scalable SVG Vector Wear Elements (ViewBox: 300 x 420 standard Pokémon card ratio) */}
      <svg
        viewBox="0 0 300 420"
        className="w-full h-full absolute inset-0 preserve-3d"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Deep crease groove shadow filter */}
          <filter id="crease-groove-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.6" />
            <feOffset dx="1.0" dy="1.8" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.85" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Delamination halo soft blur */}
          <filter id="delamination-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.2" />
          </filter>

          {/* Radial gradients for corner dog-ear wear & chipping */}
          <radialGradient id="corner-fray-tr" cx="100%" cy="0%" r="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0.65" />
            <stop offset="70%" stopColor="#f8fafc" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="corner-fray-bl" cx="0%" cy="100%" r="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="80%" stopColor="#f8fafc" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="corner-fray-br" cx="100%" cy="100%" r="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          {/* Surface abrasion texture gradient */}
          <radialGradient id="surface-scuff" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.20" />
            <stop offset="85%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ----------------- 1. NEAR MINT (Subtle sub-pixel edge whitening) ----------------- */}
        {isNearMint && (
          <g opacity="0.75">
            {/* Corner flecks */}
            <path
              d="M 293,2 L 298,1 L 299,6"
              stroke="#ffffff"
              strokeWidth="1.2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 2,411 L 4,418 L 10,419"
              stroke="#ffffff"
              strokeWidth="1.0"
              fill="none"
              strokeLinecap="round"
            />
            {/* Fine perimeter tick marks (chipping) */}
            <circle cx="298" cy="85" r="0.7" fill="#ffffff" opacity="0.8" />
            <circle cx="298.5" cy="190" r="0.6" fill="#ffffff" opacity="0.7" />
            <circle cx="2" cy="140" r="0.7" fill="#ffffff" opacity="0.8" />
          </g>
        )}

        {/* ----------------- 2. EXCELLENT (Visible border whitening & micro-scratches) ----------------- */}
        {(isExcellent || isGood || isPlayed) && (
          <g>
            {/* Top-Right and Top-Left Corner Fraying */}
            <path
              d="M 284,1 L 298.5,1 L 299,16 C 294,9 290,5 284,1 Z"
              fill="url(#corner-fray-tr)"
              opacity={isExcellent ? 0.8 : 0.95}
            />

            {/* Hairline Holo Scratches (Micro-rayures sur vernis et foil) */}
            <g stroke="#ffffff" strokeLinecap="round" opacity={isExcellent ? 0.45 : 0.65} style={{ mixBlendMode: 'screen' }}>
              <path d="M 45,115 C 65,125 90,140 120,158" strokeWidth="0.65" fill="none" />
              <path d="M 68,105 C 88,118 115,135 142,150" strokeWidth="0.5" fill="none" />
              <path d="M 158,75 C 180,90 205,108 232,122" strokeWidth="0.75" fill="none" />
              <path d="M 185,200 C 205,215 228,232 250,248" strokeWidth="0.55" fill="none" />
              <path d="M 85,270 C 115,282 145,295 178,305" strokeWidth="0.6" fill="none" />
            </g>

            {/* Organic Edge Chipping along borders (White paper stock peeking through dark ink) */}
            <path
              d="M 35,1.5 L 75,1.5 M 95,1.5 L 140,1.8 M 165,1.5 L 225,1.5 M 245,1.5 L 285,1.5"
              stroke="#ffffff"
              strokeWidth={isExcellent ? 1.2 : 1.8}
              strokeDasharray="4,6,12,3,7,4,15,3"
              fill="none"
              opacity="0.8"
            />
            <path
              d="M 298.5,60 L 298.5,110 M 298.5,135 L 298.5,190 M 298.5,220 L 298.5,310"
              stroke="#ffffff"
              strokeWidth={isExcellent ? 1.2 : 1.8}
              strokeDasharray="6,4,14,3,8,5,18,4"
              fill="none"
              opacity="0.8"
            />
          </g>
        )}

        {/* ----------------- 3. GOOD (Dog-ear corner fold & surface scuffs) ----------------- */}
        {(isGood || isPlayed) && (
          <g>
            {/* CORNER DOG-EAR FOLD (Top-Right corner bent over) */}
            <g filter="url(#crease-groove-shadow)">
              {/* Soft delamination halo along corner bend */}
              <path
                d="M 230,0 Q 262,28 300,62"
                stroke="#ffffff"
                strokeWidth="7"
                fill="none"
                opacity="0.25"
                filter="url(#delamination-blur)"
              />
              {/* Deep indented shadow */}
              <path
                d="M 232,-1 L 253,18 L 276,43 L 301,62"
                stroke="#020409"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity="0.75"
              />
              {/* Highlight fiber ridge */}
              <path
                d="M 231,-1.8 L 252,17.2 L 275,42.2 L 300,61.2"
                stroke="#ffffff"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity="0.95"
              />
              {/* Branching stress cracks on fold */}
              <path
                d="M 253,18 L 247,27 M 276,43 L 283,50 M 264,30 L 258,38"
                stroke="#ffffff"
                strokeWidth="1.0"
                strokeLinecap="round"
                fill="none"
                opacity="0.8"
              />
            </g>

            {/* Bottom-left corner paper core fraying */}
            <path
              d="M 0,390 L 22,419 L 0,419 Z"
              fill="url(#corner-fray-bl)"
              opacity="0.92"
            />

            {/* Center-left surface abrasion / binder scuff patch */}
            <ellipse
              cx="135"
              cy="235"
              rx="55"
              ry="32"
              fill="url(#surface-scuff)"
              transform="rotate(-18, 135, 235)"
              style={{ mixBlendMode: 'screen' }}
            />

            {/* Left border & Bottom border continuous chipping */}
            <path
              d="M 1.5,90 L 1.5,170 M 1.5,210 L 1.5,320 M 1.5,340 L 1.5,390"
              stroke="#ffffff"
              strokeWidth="2.0"
              strokeDasharray="8,4,16,3,10,6"
              fill="none"
              opacity="0.85"
            />
            <path
              d="M 60,418.5 L 140,418.5 M 170,418.5 L 250,418.5"
              stroke="#ffffff"
              strokeWidth="2.0"
              strokeDasharray="10,5,20,4,8,6"
              fill="none"
              opacity="0.85"
            />
          </g>
        )}

        {/* ----------------- 4. PLAYED (Major through-body crease & severe physical fractures) ----------------- */}
        {isPlayed && (
          <g>
            {/* MAJOR THROUGH-BODY CREASE (Plis traversant franc avec cassure et halo de délamination) */}
            <g>
              {/* Bent Paper Angular Lighting Illusion (Top half slightly lit, bottom half shaded) */}
              <path
                d="M 0,172 Q 45,180 95,196 T 190,213 T 300,203 L 300,0 L 0,0 Z"
                fill="rgba(255, 255, 255, 0.05)"
                style={{ mixBlendMode: 'overlay' }}
              />
              <path
                d="M 0,174 Q 45,182 95,198 T 190,215 T 300,205 L 300,420 L 0,420 Z"
                fill="rgba(0, 0, 0, 0.08)"
                style={{ mixBlendMode: 'multiply' }}
              />

              {/* Plastic Coating Delamination Halo (Milky translucent band where laminate separated) */}
              <path
                d="M 0,173 Q 45,181 95,197 T 190,214 T 300,204"
                stroke="#ffffff"
                strokeWidth="11"
                strokeLinecap="round"
                fill="none"
                opacity="0.22"
                filter="url(#delamination-blur)"
              />

              {/* Deep Valley Groove Shadow (Indentation cast by the paper fold) */}
              <path
                d="M 0,175.5 Q 45,183.5 95,199.5 T 190,216.5 T 300,206.5"
                stroke="#03060d"
                strokeWidth="3.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity="0.88"
              />

              {/* Raw Exposed White Paperboard Core Ridge (Fracture où l'encre a craqué) */}
              <path
                d="M 0,173.2 Q 45,180.5 95,196.2 T 190,213.2 T 300,203.2"
                stroke="#ffffff"
                strokeWidth="2.0"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={0.96 + creaseGlintOpacity}
              />

              {/* Secondary Branching Stress Fractures (Craquelures secondaires rayonnantes) */}
              <g stroke="#03060d" strokeWidth="2.2" strokeLinecap="round" opacity="0.8">
                <path d="M 95,199 Q 120,230 148,268" fill="none" />
                <path d="M 190,216 Q 215,235 240,258" fill="none" />
                <path d="M 45,183 Q 30,165 20,152" fill="none" />
              </g>
              <g stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.95">
                <path d="M 94.5,198 Q 119.5,229 147.5,267" fill="none" />
                <path d="M 189.5,215 Q 214.5,234 239.5,257" fill="none" />
                <path d="M 44.5,182 Q 29.5,164 19.5,151" fill="none" />
              </g>

              {/* Micro-wrinkles along fold line */}
              <path
                d="M 55,185 L 50,175 M 130,206 L 135,216 M 225,213 L 220,223 M 175,214 L 180,203 M 265,209 L 270,219"
                stroke="#ffffff"
                strokeWidth="1.1"
                strokeLinecap="round"
                fill="none"
                opacity="0.85"
              />
            </g>

            {/* Bottom-Right Heavy Dog-Ear Fold */}
            <g filter="url(#crease-groove-shadow)">
              {/* Delamination halo */}
              <path
                d="M 240,419 Q 270,395 300,370"
                stroke="#ffffff"
                strokeWidth="7"
                fill="none"
                opacity="0.24"
                filter="url(#delamination-blur)"
              />
              {/* Shadow */}
              <path
                d="M 242,420 L 274,395 L 301,372"
                stroke="#03060d"
                strokeWidth="3.0"
                fill="none"
                opacity="0.85"
              />
              {/* Highlight ridge */}
              <path
                d="M 241,418.8 L 273,393.8 L 300,370.8"
                stroke="#ffffff"
                strokeWidth="1.8"
                fill="none"
                opacity="0.95"
              />
              <path
                d="M 274,395 L 282,403 M 260,405 L 255,413"
                stroke="#ffffff"
                strokeWidth="1.0"
                strokeLinecap="round"
                fill="none"
                opacity="0.85"
              />
            </g>

            {/* Bottom-right corner core exposure */}
            <path
              d="M 285,419 L 300,405 L 300,419 Z"
              fill="url(#corner-fray-br)"
              opacity="0.95"
            />

            {/* Complete Perimeter Paper Peeling (Severe border whitening all around) */}
            <rect
              x="1.5"
              y="1.5"
              width="297"
              height="417"
              rx="14"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeDasharray="16,5,30,6,22,4,12,6"
              opacity="0.88"
            />

            {/* Pressure dents (traces d'ongle ou d'écrasement) */}
            <path
              d="M 75,95 Q 83,89 91,95"
              stroke="#03060d"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
              opacity="0.75"
            />
            <path
              d="M 75,93.8 Q 83,87.8 91,93.8"
              stroke="#ffffff"
              strokeWidth="1.3"
              strokeLinecap="round"
              fill="none"
              opacity="0.9"
            />

            <path
              d="M 215,335 Q 223,329 231,335"
              stroke="#03060d"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
              opacity="0.75"
            />
            <path
              d="M 215,333.8 Q 223,327.8 231,333.8"
              stroke="#ffffff"
              strokeWidth="1.3"
              strokeLinecap="round"
              fill="none"
              opacity="0.9"
            />
          </g>
        )}
      </svg>

      {/* 4. Diagnostic HUD Markers (When '📍 Repérer défauts' is activated in Studio) */}
      {showPinDetails && isDetailStage && (
        <div className="absolute inset-0 pointer-events-none">
          {isPlayed && (
            <div className="absolute top-[47%] left-[10%] bg-red-600/95 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-xl backdrop-blur-sm border border-white/20 flex items-center gap-1 animate-pulse">
              <span>⚠️ Pliure majeure (traversante)</span>
            </div>
          )}
          {isPlayed && (
            <div className="absolute bottom-[10%] right-[10%] bg-red-600/95 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-xl backdrop-blur-sm border border-white/20 flex items-center gap-1">
              <span>⚠️ Pliure d'angle</span>
            </div>
          )}
          {isGood && (
            <div className="absolute top-[9%] right-[9%] bg-amber-600/95 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-xl backdrop-blur-sm border border-white/20 flex items-center gap-1">
              <span>⚠️ Pli corné (dog-ear)</span>
            </div>
          )}
          {(isExcellent || isGood || isPlayed) && (
            <div className="absolute bottom-[4%] left-[4%] bg-sky-600/95 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-xl backdrop-blur-sm border border-white/20 flex items-center gap-1">
              <span>🔍 Blanchiment de bordure</span>
            </div>
          )}
          {(isExcellent || isGood || isPlayed) && (
            <div className="absolute top-[32%] right-[18%] bg-purple-600/95 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-xl backdrop-blur-sm border border-white/20 flex items-center gap-1">
              <span>✨ Micro-rayures foil</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
