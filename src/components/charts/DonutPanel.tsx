import React, { useEffect, useState } from 'react';
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
  legendLayout?: 'list' | 'inline' | 'stacked-list';
  showPctInLegend?: boolean;
  dense?: boolean;
}

export const DonutPanel: React.FC<DonutPanelProps> = ({
  segments,
  centerValue,
  centerLabel,
  activeLabel,
  onSelect,
  size = 176,
  legendLayout = 'list',
  showPctInLegend = true,
  dense = false,
}) => {
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    setDrawn(false);
    let id = 0;
    id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => setDrawn(true));
    });
    return () => {
      if (id) cancelAnimationFrame(id);
    };
  }, [segments]);

  const total = segments.reduce((s, d) => s + Math.max(0, d.value), 0);
  const cx = 80;
  const cy = 80;
  const r = 60;
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

  const isList = legendLayout === 'list' || legendLayout === 'stacked-list';
  const compactCenter = centerValue.length > 6 || size <= 156;
  const centerValueCls = compactCenter
    ? 'text-base sm:text-[17px] font-extrabold tracking-tight'
    : 'text-xl sm:text-2xl font-extrabold tracking-tight';

  return (
    <div
      className={
        legendLayout === 'list'
          ? 'w-full h-full flex-1 flex flex-col sm:flex-row items-center justify-between gap-4'
          : legendLayout === 'stacked-list'
          ? 'w-full h-full flex-1 flex flex-col items-center justify-between gap-2.5'
          : 'w-full h-full flex-1 flex flex-col items-center justify-between gap-2.5'
      }
    >
      <div
        className={`relative shrink-0 ${legendLayout !== 'list' ? 'my-auto' : ''}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="currentColor"
            className="text-stone-200/80 dark:text-[#1A2A30]"
            strokeWidth="21"
          />
          {arcs.map((a) => {
            if (a.len <= 0) return null;
            const isDim = activeLabel && activeLabel !== a.label;
            const targetLen = Math.max(0, a.len - 1.5);
            return (
              <circle
                key={a.label}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={a.color}
                strokeWidth="21"
                strokeDasharray={`${drawn ? targetLen : 0} ${circ}`}
                strokeDashoffset={-a.startOffset}
                className={`transition-[stroke-dasharray,opacity] duration-700 ease-out ${
                  onSelect ? 'cursor-pointer hover:opacity-85' : ''
                } ${isDim ? 'opacity-30' : 'opacity-100'}`}
                onClick={() => onSelect?.(a.label)}
              >
                <title>{`${a.label}: ${fmtInt(a.value)} (${fmtP(a.frac * 100)})`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
          <span className={`${centerValueCls} font-display text-slate-950 dark:text-[#F7F3E9] tabular-nums leading-none`}>
            {centerValue}
          </span>
          <span className="text-[10px] font-semibold text-slate-500 dark:text-[#9CA8AA] mt-1 leading-none">
            {centerLabel}
          </span>
        </div>
      </div>

      {isList ? (
        <div className={legendLayout === 'stacked-list' ? 'w-full space-y-0.5' : 'flex-1 w-full min-w-0 space-y-1'}>
          {arcs.map((a) => {
            const isActive = activeLabel === a.label;
            const isDim = activeLabel && !isActive;
            return (
              <button
                key={a.label}
                type="button"
                disabled={!onSelect}
                onClick={() => onSelect?.(a.label)}
                className={`w-full flex items-center justify-between gap-2 rounded-lg ${
                  dense ? 'px-1.5 py-1 text-[11px]' : 'px-2 py-1 text-xs'
                } text-left transition ${
                  onSelect
                    ? 'hover:bg-stone-100 dark:hover:bg-[#152227] cursor-pointer'
                    : 'cursor-default'
                } ${
                  isActive
                    ? 'bg-stone-100 dark:bg-[#152227] ring-1 ring-[#C69320]/45 dark:ring-[#D4AF37]/50'
                    : ''
                } ${isDim ? 'opacity-50' : ''}`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                  <span className="font-semibold text-slate-800 dark:text-[#E5DFD0] truncate">{a.label}</span>
                </span>
                <span className="flex items-center gap-2 shrink-0 tabular-nums">
                  {showPctInLegend && (
                    <span className="text-[11px] font-medium text-slate-500 dark:text-[#8E9B9E]">
                      {fmtP(a.frac * 100)}
                    </span>
                  )}
                  <span className="font-bold text-slate-950 dark:text-white">
                    {a.detailText || fmtInt(a.value)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="w-full flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          {arcs.map((a) => {
            const isActive = activeLabel === a.label;
            const isDim = activeLabel && !isActive;
            return (
              <button
                key={a.label}
                type="button"
                disabled={!onSelect}
                onClick={() => onSelect?.(a.label)}
                className={`inline-flex items-center gap-1.5 text-xs rounded-md px-1.5 py-0.5 transition ${
                  onSelect ? 'hover:bg-stone-100 dark:hover:bg-[#152227] cursor-pointer' : 'cursor-default'
                } ${
                  isActive
                    ? 'bg-stone-100 dark:bg-[#152227] ring-1 ring-[#C69320]/45 dark:ring-[#D4AF37]/50'
                    : ''
                } ${isDim ? 'opacity-50' : ''}`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                <span className="text-slate-700 dark:text-[#D5CFC2] font-semibold">{a.label}</span>
                <span className="font-bold text-slate-950 dark:text-white tabular-nums">
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
