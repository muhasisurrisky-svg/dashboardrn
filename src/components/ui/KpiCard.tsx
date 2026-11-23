import React from 'react';
import { motion } from 'motion/react';
import { statusTier } from '../../utils/formatters';
import { DASHBOARD_EASE, MotionFillBar, staggerItemVariants } from './MotionPrimitives';

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
    <motion.svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-20 h-8 shrink-0 overflow-visible"
      aria-hidden="true"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: DASHBOARD_EASE, delay: 0.14 }}
    >
      <polygon points={areaPts} fill={color} fillOpacity="0.16" />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts.join(' ')}
      />
    </motion.svg>
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
    blue: '#D4AF37',
    emerald: '#10B981',
    amber: '#F59E0B',
    rose: '#EF4444',
    neutral: '#64748B',
  };
  const stroke = accentColor ? colorMap[accentColor] : tier?.barColor || '#D4AF37';
  const clampedPct = Math.max(0, Math.min(100, pctForStatus ?? 0));

  const cardClassName = `text-left w-full rounded-xl border bg-white dark:bg-[#0D1619] p-4 transition-[border-color,box-shadow,background-color] duration-200 ${
    onClick
      ? 'cursor-pointer hover:border-[#B88B28]/70 dark:hover:border-[#D4AF37]/60 hover:shadow-md'
      : ''
  } ${
    active
      ? 'border-[#B88B28] ring-2 ring-[#C69320]/25 dark:border-[#D4AF37] dark:ring-[#D4AF37]/25'
      : 'border-[#E5DFD0] dark:border-[#1D2D32]'
  }`;

  const innerContent = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-bold text-slate-600 dark:text-[#A9B3B5] leading-snug">{title}</span>
        {tier && (
          <span className={`text-[11px] font-bold shrink-0 ${tier.textClass}`}>{tier.label}</span>
        )}
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-2xl sm:text-[26px] font-extrabold tracking-tight text-slate-950 dark:text-[#F7F3E9] tabular-nums leading-none">
            {value}
          </div>
          {subline && (
            <p
              className="mt-1.5 text-xs font-medium text-slate-600 dark:text-[#9CA8AA] tabular-nums truncate"
              title={subline}
            >
              {subline}
            </p>
          )}
          {subline2 && (
            <p
              className="mt-0.5 text-[11px] text-slate-500 dark:text-[#7E8C8F] tabular-nums truncate"
              title={subline2}
            >
              {subline2}
            </p>
          )}
        </div>
        {sparkData && sparkData.length >= 2 && <SparklineSvg data={sparkData} color={stroke} />}
      </div>

      {showThresholdBar && pctForStatus !== undefined && (
        <div className="mt-3 relative h-2 rounded-full bg-stone-200/80 dark:bg-[#18262B] overflow-visible">
          <MotionFillBar pct={clampedPct} color={stroke} />
          <span
            className="absolute -top-0.5 bottom-[-2px] w-px bg-slate-400/70 dark:bg-slate-500/70"
            style={{ left: '80%' }}
            title="Batas peringatan 80%"
          />
          <span
            className="absolute -top-0.5 bottom-[-2px] w-px bg-slate-700 dark:bg-[#E6C45A]/80"
            style={{ left: '95%' }}
            title="Target tercapai 95%"
          />
        </div>
      )}

      {footer && <div className="mt-2.5 text-xs font-semibold">{footer}</div>}
    </>
  );

  if (onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        variants={staggerItemVariants}
        whileHover={{ y: -2, transition: { duration: 0.16 } }}
        whileTap={{ scale: 0.99 }}
        className={cardClassName}
      >
        {innerContent}
      </motion.button>
    );
  }

  return (
    <motion.div variants={staggerItemVariants} className={cardClassName}>
      {innerContent}
    </motion.div>
  );
};
