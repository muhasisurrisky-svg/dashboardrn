import React from 'react';
import { fmtInt, fmtP } from '../../utils/formatters';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
  detailText?: string;
}

interface DonutPanelProps {
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
  activeLabel?: string | null;
  onSelect?: (label: string) => void;
  size?: number;
  legendLayout?: 'list' | 'inline';
  showPctInLegend?: boolean;
}

export const DonutPanel: React.FC<DonutPanelProps> = ({
  segments,
  centerValue,
  centerLabel,
  activeLabel,
  onSelect,
  size = 152,
  legendLayout = 'list',
  showPctInLegend = true,
}) => {
  const total = segments.reduce((s, d) => s + Math.max(0, d.value), 0);
  const cx = 80;
  const cy = 80;
  const r = 58;
  const circ = 2 * Math.PI * r;

  let offset = 0;
  const arcs = segments.map((seg) => {
    const frac = total > 0 ? Math.max(0, seg.value) / total : 0;
    const len = frac * circ;
    const startOffset = offset;
    offset += len;
    return {
      ...seg,
      frac,
      len,
      startOffset,
    };
  });

  return (
    <div
      className={
        legendLayout === 'list'
          ? 'flex flex-col sm:flex-row items-center gap-5'
          : 'flex flex-col items-center gap-4'
      }
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="currentColor"
            className="text-slate-100 dark:text-slate-800"
            strokeWidth="22"
          />
          {arcs.map((a) => {
            if (a.len <= 0) return null;
            const isDim = activeLabel && activeLabel !== a.label;
            return (
              <circle
                key={a.label}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={a.color}
                strokeWidth="22"
                strokeDasharray={`${Math.max(0, a.len - 1.5)} ${circ}`}
                strokeDashoffset={-a.startOffset}
                className={`transition-opacity duration-150 ${onSelect ? 'cursor-pointer hover:opacity-85' : ''} ${
                  isDim ? 'opacity-30' : 'opacity-100'
                }`}
                onClick={() => onSelect?.(a.label)}
              >
                <title>{`${a.label}: ${fmtInt(a.value)} (${fmtP(a.frac * 100)})`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums leading-tight">
            {centerValue}
          </span>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
            {centerLabel}
          </span>
        </div>
      </div>

      {legendLayout === 'list' ? (
        <div className="flex-1 w-full space-y-2">
          {arcs.map((a) => {
            const isActive = activeLabel === a.label;
            const isDim = activeLabel && !isActive;
            return (
              <button
                key={a.label}
                type="button"
                disabled={!onSelect}
                onClick={() => onSelect?.(a.label)}
                className={`w-full flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                  onSelect ? 'hover:bg-slate-100 dark:hover:bg-slate-800/70 cursor-pointer' : 'cursor-default'
                } ${isActive ? 'bg-slate-100 dark:bg-slate-800 ring-1 ring-blue-500/40' : ''} ${
                  isDim ? 'opacity-50' : ''
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                  <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{a.label}</span>
                </span>
                <span className="flex items-center gap-2 shrink-0 tabular-nums">
                  {showPctInLegend && (
                    <span className="text-slate-400 dark:text-slate-500">{fmtP(a.frac * 100)}</span>
                  )}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {a.detailText || fmtInt(a.value)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          {arcs.map((a) => {
            const isActive = activeLabel === a.label;
            const isDim = activeLabel && !isActive;
            return (
              <button
                key={a.label}
                type="button"
                disabled={!onSelect}
                onClick={() => onSelect?.(a.label)}
                className={`inline-flex items-center gap-1.5 text-xs rounded-md px-2 py-1 transition ${
                  onSelect ? 'hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer' : 'cursor-default'
                } ${isActive ? 'bg-slate-100 dark:bg-slate-800 ring-1 ring-blue-500/40' : ''} ${
                  isDim ? 'opacity-50' : ''
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                <span className="text-slate-600 dark:text-slate-300 font-medium">{a.label}</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {a.detailText || fmtInt(a.value)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
