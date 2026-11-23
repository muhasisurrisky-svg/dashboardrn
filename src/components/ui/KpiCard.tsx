import React from 'react';
import { statusTier } from '../../utils/formatters';

interface KpiCardProps {
  title: string;
  value: string;
  subline?: string;
  subline2?: string;
  footer?: React.ReactNode;
  pctForStatus?: number;
  sparkData?: number[];
  showThresholdBar?: boolean;
  onClick?: () => void;
  active?: boolean;
  accentColor?: 'blue' | 'emerald' | 'amber' | 'rose' | 'neutral';
}

export const SparklineSvg: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const clean = data.filter((v) => Number.isFinite(v));
  if (clean.length < 2) return null;
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const span = max - min || 1;
  const w = 84;
  const h = 32;
  const pts = clean.map((v, i) => {
    const x = (i / (clean.length - 1)) * w;
    const y = h - 4 - ((v - min) / span) * (h - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const areaPts = `0,${h} ${pts.join(' ')} ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-20 h-8 shrink-0 overflow-visible" aria-hidden="true">
      <polygon points={areaPts} fill={color} fillOpacity="0.14" />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts.join(' ')}
      />
    </svg>
  );
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subline,
  subline2,
  footer,
  pctForStatus,
  sparkData,
  showThresholdBar = false,
  onClick,
  active = false,
  accentColor,
}) => {
  const tier = pctForStatus !== undefined ? statusTier(pctForStatus) : null;
  const colorMap: Record<string, string> = {
    blue: '#3B82F6',
    emerald: '#10B981',
    amber: '#F59E0B',
    rose: '#EF4444',
    neutral: '#64748B',
  };
  const stroke = accentColor ? colorMap[accentColor] : tier?.barColor || '#3B82F6';
  const clampedPct = Math.max(0, Math.min(100, pctForStatus ?? 0));

  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`text-left w-full rounded-xl border bg-white dark:bg-slate-900 p-4 transition-all ${
        onClick
          ? 'cursor-pointer hover:border-blue-400 dark:hover:border-blue-500/70 hover:shadow-sm'
          : ''
      } ${
        active
          ? 'border-blue-600 ring-2 ring-blue-500/20 dark:border-blue-400'
          : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-snug">{title}</span>
        {tier && (
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold shrink-0 ${tier.textClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${tier.dotClass}`} />
            {tier.label}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums leading-none">
            {value}
          </div>
          {subline && (
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums truncate" title={subline}>
              {subline}
            </p>
          )}
          {subline2 && (
            <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums truncate" title={subline2}>
              {subline2}
            </p>
          )}
        </div>
        {sparkData && sparkData.length >= 2 && <SparklineSvg data={sparkData} color={stroke} />}
      </div>

      {showThresholdBar && pctForStatus !== undefined && (
        <div className="mt-3 relative h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-visible">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${clampedPct}%`, backgroundColor: stroke }}
          />
          <span
            className="absolute -top-0.5 bottom-[-2px] w-px bg-slate-400/70 dark:bg-slate-500/70"
            style={{ left: '80%' }}
            title="Batas peringatan 80%"
          />
          <span
            className="absolute -top-0.5 bottom-[-2px] w-px bg-slate-600 dark:bg-slate-300"
            style={{ left: '95%' }}
            title="Target tercapai 95%"
          />
        </div>
      )}

      {footer && <div className="mt-2.5 text-xs font-medium">{footer}</div>}
    </Tag>
  );
};
