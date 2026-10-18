import { useId } from 'react';

const THEMES = {
  Chinese: ['#9a3412', '#fdba74'],
  Japanese: ['#9f1239', '#fecdd3'],
  Korean: ['#9a3412', '#fed7aa'],
  Mexican: ['#b45309', '#fde68a'],
  Italian: ['#3f6212', '#d9f99d'],
  American: ['#7c2d12', '#fdba74'],
  Indian: ['#9a3412', '#fca5a5'],
  Mediterranean: ['#3f6212', '#bbf7d0'],
};

function shift(name) {
  return [...name].reduce((total, char) => total + char.charCodeAt(0), 0);
}

export function FoodVisual({ cuisine, name, className = '' }) {
  const [from, to] = THEMES[cuisine] || ['#9a3412', '#fed7aa'];
  const offset = shift(name || cuisine || 'meal') % 28;
  const gradientId = `meal${useId().replace(/:/g, '')}`;
  return (
    <div className={`relative overflow-hidden ${className}`} aria-hidden="true">
      <svg viewBox="0 0 320 180" className="h-full w-full">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <rect width="320" height="180" fill={`url(#${gradientId})`} />
        <circle cx={70 + offset} cy="36" r="28" fill="white" opacity="0.16" />
        <circle cx={250 - offset} cy="140" r="46" fill="white" opacity="0.12" />
        <g transform="translate(128 38)" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
          <path d="M8 28h48c0 22-10 36-24 36S8 50 8 28z" fill="white" stroke="none" opacity="0.92" />
          <path d="M18 28c1-12 6-20 14-20s13 8 14 20" stroke="#fff7ed" />
          <path d="M20 46h24" stroke={from} />
        </g>
      </svg>
      <p className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink">
        {cuisine}
      </p>
    </div>
  );
}
