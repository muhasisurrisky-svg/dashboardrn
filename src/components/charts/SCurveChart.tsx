import React, { useMemo } from 'react';
import type { Plugin } from 'chart.js';
import { ChartCanvas } from './ChartCanvas';
import { fmtInt, fmtP, statusTier } from '../../utils/formatters';

export interface SCurvePointSummary {
  label: string;
  rencana: number;
  realisasi: number;
  selisih: number;
  pct: number;
}

interface SCurveChartProps {
  labels: string[];
  rencana: Array<number | null>;
  realisasi: Array<number | null>;
  unitLabel: string;
  formatValue?: (v: number) => string;
  formatSelisih?: (v: number) => string;
  isDark: boolean;
  heightClass?: string;
  showSummaryStrip?: boolean;
  isPercentScale?: boolean;
}

export const SCurveChart: React.FC<SCurveChartProps> = ({
  labels,
  rencana,
  realisasi,
  unitLabel,
  formatValue = (v) => `${fmtInt(v)} ${unitLabel}`.trim(),
  formatSelisih = (v) => `${v >= 0 ? '+' : ''}${fmtInt(v)} ${unitLabel}`.trim(),
  isDark,
  heightClass = 'h-72',
  showSummaryStrip = true,
  isPercentScale = false,
}) => {
  const summary: SCurvePointSummary | null = useMemo(() => {
    let lastIdx = -1;
    for (let i = realisasi.length - 1; i >= 0; i--) {
      if (realisasi[i] !== null && realisasi[i] !== undefined) {
        lastIdx = i;
        break;
      }
    }
    if (lastIdx < 0) return null;
    const ren = Number(rencana[lastIdx] ?? 0);
    const real = Number(realisasi[lastIdx] ?? 0);
    const sel = real - ren;
    const pct = ren > 0 ? (real / ren) * 100 : isPercentScale ? real : 0;
    return {
      label: labels[lastIdx] || '',
      rencana: ren,
      realisasi: real,
      selisih: sel,
      pct,
    };
  }, [labels, rencana, realisasi, isPercentScale]);

  const tier = summary ? statusTier(summary.pct) : null;

  return (
    <div className="space-y-3">
      {showSummaryStrip && summary && tier && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-3 py-2">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Rencana per {summary.label}
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
              {formatValue(summary.rencana)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-3 py-2">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Realisasi</div>
            <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
              {formatValue(summary.realisasi)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-3 py-2">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Selisih</div>
            <div
              className={`text-sm sm:text-base font-bold tabular-nums mt-0.5 ${
                summary.selisih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatSelisih(summary.selisih)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-3 py-2">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Pencapaian</div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {fmtP(summary.pct)}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${tier.textClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${tier.dotClass}`} />
                {tier.label}
              </span>
            </div>
          </div>
        </div>
      )}

      <ChartCanvas
        isDark={isDark}
        heightClass={heightClass}
        deps={[labels, rencana, realisasi, unitLabel, isPercentScale]}
        buildConfig={(ctx, dark) => {
          const textMuted = dark ? '#94A3B8' : '#64748B';
          const gridColor = dark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.06)';
          const renColor = dark ? '#818CF8' : '#3B82F6';
          const realColor = '#10B981';

          const grad = ctx.createLinearGradient(0, 0, 0, 260);
          grad.addColorStop(0, dark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.18)');
          grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

          // Deviation line & pill badge plugin at the last filled realisasi index
          const deviasiPlugin: Plugin<'line'> = {
            id: 'scurveDeviasiPlugin',
            afterDatasetsDraw(chart) {
              const metaRen = chart.getDatasetMeta(0);
              const metaReal = chart.getDatasetMeta(1);
              let li = -1;
              for (let i = realisasi.length - 1; i >= 0; i--) {
                if (realisasi[i] !== null && realisasi[i] !== undefined) {
                  li = i;
                  break;
                }
              }
              if (li < 0) return;
              const p0 = metaRen.data[li];
              const p1 = metaReal.data[li];
              if (!p0 || !p1) return;
              const sel = Number(realisasi[li] ?? 0) - Number(rencana[li] ?? 0);
              const label = formatSelisih(sel);
              const c = chart.ctx;
              c.save();

              // Vertical connector between Rencana & Realisasi
              if (Math.abs(p1.y - p0.y) > 4) {
                c.beginPath();
                c.strokeStyle = sel >= 0 ? '#10B981' : '#EF4444';
                c.lineWidth = 1.75;
                c.moveTo(p1.x, p0.y);
                c.lineTo(p1.x, p1.y);
                c.stroke();
              }

              // Small pill badge to the right/left of point
              c.font = '600 11px "DM Sans", sans-serif';
              const tw = c.measureText(label).width;
              const bw = tw + 14;
              const bh = 22;
              const bx = Math.min(Math.max(p1.x - bw / 2, chart.chartArea.left + 4), chart.chartArea.right - bw - 4);
              const by = sel <= 0
                ? Math.min(p1.y + 8, chart.chartArea.bottom - bh - 4)
                : Math.max(p1.y - bh - 8, chart.chartArea.top + 4);

              c.fillStyle = sel >= 0
                ? (dark ? 'rgba(6, 78, 59, 0.9)' : 'rgba(236, 253, 245, 0.96)')
                : (dark ? 'rgba(127, 29, 29, 0.9)' : 'rgba(254, 242, 242, 0.96)');
              c.strokeStyle = sel >= 0 ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)';
              c.lineWidth = 1;
              c.beginPath();
              c.roundRect(bx, by, bw, bh, 6);
              c.fill();
              c.stroke();

              c.fillStyle = sel >= 0
                ? (dark ? '#6EE7B7' : '#047857')
                : (dark ? '#FCA5A5' : '#B91C1C');
              c.textAlign = 'center';
              c.textBaseline = 'middle';
              c.fillText(label, bx + bw / 2, by + bh / 2);
              c.restore();
            },
          };

          return {
            type: 'line',
            data: {
              labels,
              datasets: [
                {
                  label: 'Rencana',
                  data: rencana,
                  borderColor: renColor,
                  borderWidth: 2,
                  borderDash: [5, 4],
                  pointRadius: 0,
                  pointHoverRadius: 4,
                  tension: 0.25,
                  fill: false,
                  spanGaps: true,
                },
                {
                  label: 'Realisasi',
                  data: realisasi,
                  borderColor: realColor,
                  backgroundColor: grad,
                  borderWidth: 2.5,
                  pointRadius: 3,
                  pointHoverRadius: 5,
                  pointBackgroundColor: realColor,
                  pointBorderColor: dark ? '#0F172A' : '#FFFFFF',
                  pointBorderWidth: 1.5,
                  tension: 0.25,
                  fill: true,
                  spanGaps: false,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              interaction: { mode: 'index', intersect: false },
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    color: textMuted,
                    boxWidth: 12,
                    boxHeight: 12,
                    usePointStyle: true,
                    padding: 14,
                    font: { size: 11, weight: 'bold' },
                  },
                },
                tooltip: {
                  backgroundColor: dark ? '#0F172A' : '#FFFFFF',
                  titleColor: dark ? '#F8FAFC' : '#0F172A',
                  bodyColor: dark ? '#CBD5E1' : '#334155',
                  borderColor: dark ? '#334155' : '#E2E8F0',
                  borderWidth: 1,
                  padding: 10,
                  callbacks: {
                    label(item: { parsed: { y: number | null }; dataset: { label?: string } }) {
                      const val = item.parsed.y;
                      if (val === null || val === undefined) return '';
                      return ` ${item.dataset.label || ''}: ${formatValue(val)}`;
                    },
                  },
                },
              },
              scales: {
                x: {
                  grid: { display: false },
                  ticks: { color: textMuted, font: { size: 11 } },
                },
                y: {
                  beginAtZero: true,
                  suggestedMax: isPercentScale ? 105 : undefined,
                  grid: { color: gridColor },
                  ticks: {
                    color: textMuted,
                    font: { size: 11 },
                    callback: (v: string | number) => (isPercentScale ? `${v}%` : fmtInt(Number(v))),
                  },
                },
              },
            },
            plugins: [deviasiPlugin],
          };
        }}
      />
    </div>
  );
};
