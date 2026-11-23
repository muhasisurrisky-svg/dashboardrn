import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { SCurveChart } from '../charts/SCurveChart';
import { DonutPanel } from '../charts/DonutPanel';
import { ChartCanvas } from '../charts/ChartCanvas';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import { MotionCard, MotionStaggerGrid } from '../ui/MotionPrimitives';
import { BLN_LABEL, PROG_ORDER, fmtInt, fmtP, statusTier, twBulanMask, twRange } from '../../utils/formatters';
import type { ProgramData, ProgramDetailRow, TriwulanType } from '../../types/dashboard';

interface ProgramViewProps {
  program: ProgramData | null;
  tahun: number;
  tw: TriwulanType;
  isDark: boolean;
  initialProgram?: string | null;
}

const SEG_TABS = ['Semua', 'GO', 'MO', 'P24', 'P48'];

function classifyUnitStatus(d: ProgramDetailRow): 'Realisasi' | 'TSGO' | 'Belum masuk' | 'Konservasi' | 'Lainnya' {
  if (d.real) return 'Realisasi';
  const s = d.c.join(' ').toLowerCase();
  if (/\btsgo\b/.test(s)) return 'TSGO';
  if (/belum/.test(s)) return 'Belum masuk';
  if (/konser|geser/.test(s)) return 'Konservasi';
  return 'Lainnya';
}

export const ProgramView: React.FC<ProgramViewProps> = ({
  program,
  tahun,
  tw,
  isDark,
  initialProgram,
}) => {
  const [kurvaProg, setKurvaProg] = useState<string>('__SEMUA__');
  const [segProg, setSegProg] = useState<string>('Semua');
  const [filterProg, setFilterProg] = useState<string | null>(initialProgram || null);
  const [filterBulan, setFilterBulan] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  useEffect(() => {
    if (initialProgram) {
      setFilterProg(initialProgram);
      setSegProg(initialProgram);
      setKurvaProg(initialProgram);
    }
  }, [initialProgram]);

  const qRange = twRange(tw);
  const twMask = useMemo(() => twBulanMask(tw), [tw]);

  const sCurveData = useMemo(() => {
    if (!program) return null;
    let s = program.bulan[kurvaProg];
    if (!s && kurvaProg === '__SEMUA__') {
      const keys = Object.keys(program.bulan).filter((k) => k !== '__SEMUA__');
      if (keys.length) {
        const sumRen = new Array(12).fill(0);
        const sumReal = new Array(12).fill(0);
        keys.forEach((k) => {
          const item = program.bulan[k];
          if (!item) return;
          for (let i = 0; i < 12; i++) {
            sumRen[i] += item.rencana[i] || 0;
            sumReal[i] += item.realisasi[i] || 0;
          }
        });
        s = { rencana: sumRen, realisasi: sumReal };
      }
    }
    if (!s) s = program.bulan.__SEMUA__;
    if (!s) return null;
    const labels: string[] = [];
    const ren: Array<number | null> = [];
    const real: Array<number | null> = [];
    let cRen = 0;
    let cReal = 0;
    let lastRealIdx = -1;
    for (let i = 0; i < 12; i++) {
      if ((s.realisasi[i] || 0) > 0) lastRealIdx = i;
    }
    for (let i = 0; i < 12; i++) {
      if (qRange && i + 1 > qRange[1]) continue;
      labels.push(BLN_LABEL[i]);
      cRen += s.rencana[i] || 0;
      cReal += s.realisasi[i] || 0;
      ren.push(cRen);
      real.push(i <= lastRealIdx ? cReal : null);
    }
    if (cRen === 0 && lastRealIdx < 0) return null;
    return { labels, ren, real };
  }, [program, kurvaProg, qRange]);

  const ringkasSorted = useMemo(() => {
    if (!program) return [];
    const baseList = program.ringkas
      .filter((r) => !/^(grand\s*total|sub\s*total|total|jumlah)\s*:?$/i.test(r.program.trim()))
      .slice()
      .sort((a, b) => {
        const ia = PROG_ORDER.indexOf(a.program);
        const ib = PROG_ORDER.indexOf(b.program);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });

    if (!qRange) return baseList;

    return baseList.map((base) => {
      const det = (program.detail[base.program] || []).filter(
        (d) => d.mr >= qRange[0] && d.mr <= qRange[1]
      );
      if (!det.length) {
        return {
          ...base,
          total: 0,
          realisasi: 0,
          tsgo: 0,
          belumMasuk: 0,
          konservasi: 0,
          lainnya: 0,
          pct: 0,
        };
      }
      let realisasi = 0;
      let tsgo = 0;
      let belumMasuk = 0;
      let konservasi = 0;
      let lainnya = 0;
      det.forEach((d) => {
        const st = d.c.join(' ').toLowerCase();
        if (d.real) realisasi++;
        else if (/\btsgo\b/.test(st)) tsgo++;
        else if (/belum/.test(st)) belumMasuk++;
        else if (/konser|geser/.test(st)) konservasi++;
        else lainnya++;
      });
      const total = det.length;
      return {
        program: base.program,
        total,
        realisasi,
        tsgo,
        belumMasuk,
        konservasi,
        lainnya,
        pct: total > 0 ? (realisasi / total) * 100 : 0,
      };
    });
  }, [program, qRange]);

  const totalsRingkas = useMemo(() => {
    return ringkasSorted.reduce(
      (acc, r) => {
        acc.total += r.total;
        acc.realisasi += r.realisasi;
        acc.tsgo += r.tsgo;
        acc.belumMasuk += r.belumMasuk;
        acc.konservasi += r.konservasi;
        acc.lainnya += r.lainnya;
        return acc;
      },
      { total: 0, realisasi: 0, tsgo: 0, belumMasuk: 0, konservasi: 0, lainnya: 0 }
    );
  }, [ringkasSorted]);

  const barSeries = useMemo(() => {
    if (!program) return { rencana: new Array(12).fill(0), realisasi: new Array(12).fill(0) };
    const key = segProg === 'Semua' ? '__SEMUA__' : segProg;
    if (program.bulan[key]) return program.bulan[key];
    if (key === '__SEMUA__') {
      const sumRen = new Array(12).fill(0);
      const sumReal = new Array(12).fill(0);
      Object.entries(program.bulan).forEach(([k, s]) => {
        if (k === '__SEMUA__' || !s) return;
        for (let i = 0; i < 12; i++) {
          sumRen[i] += s.rencana[i] || 0;
          sumReal[i] += s.realisasi[i] || 0;
        }
      });
      return { rencana: sumRen, realisasi: sumReal };
    }
    return { rencana: new Array(12).fill(0), realisasi: new Array(12).fill(0) };
  }, [program, segProg]);

  const donutStats = useMemo(() => {
    const active = filterProg
      ? ringkasSorted.find((r) => r.program === filterProg)
      : totalsRingkas;
    const base = active || totalsRingkas;
    return base;
  }, [filterProg, ringkasSorted, totalsRingkas]);

  const detailRows = useMemo(() => {
    if (!program) return [];
    const targetKeys = filterProg ? [filterProg] : Object.keys(program.detail);
    const list: Array<ProgramDetailRow & { _prog: string; _kat: string }> = [];
    targetKeys.forEach((pk) => {
      (program.detail[pk] || []).forEach((d) => {
        if (qRange && (d.mr < qRange[0] || d.mr > qRange[1])) return;
        if (filterBulan && d.mr !== filterBulan && d.mp !== filterBulan) return;
        const kat = classifyUnitStatus(d);
        if (filterStatus && kat !== filterStatus) return;
        list.push({ ...d, _prog: pk, _kat: kat });
      });
    });
    return list;
  }, [program, filterProg, qRange, filterBulan, filterStatus]);

  if (!program) {
    return (
      <div className="rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] p-8 text-center text-sm text-slate-500 dark:text-[#9CA8AA]">
        Data program tidak tersedia di spreadsheet tahun {tahun}.
      </div>
    );
  }

  const head = program.detailHead;
  const columns: DataTableColumn<ProgramDetailRow & { _prog: string; _kat: string }>[] = head.map((h, idx) => ({
    key: `col-${idx}`,
    header: h,
    sortValue: (r) => r.c[idx] || '',
    render: (r) => {
      const val = r.c[idx] || '—';
      if (h.toLowerCase().includes('status')) {
        const cls =
          r._kat === 'Realisasi'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60'
            : r._kat === 'TSGO'
            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60'
            : r._kat === 'Belum masuk'
            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60'
            : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        return (
          <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${cls}`}>
            {val}
          </span>
        );
      }
      return <span className={idx === 1 ? 'font-medium text-slate-900 dark:text-slate-100' : ''}>{val}</span>;
    },
  }));

  const hasFilter = Boolean(filterProg || filterBulan || filterStatus);

  return (
    <div className="space-y-3">
      {/* Kurva S Realisasi Program (Top-level Card — no nested card clutter) */}
      <MotionCard className="rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] p-3.5 flex flex-col">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-2 shrink-0">
          <div>
            <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">
              Kurva S realisasi program {kurvaProg === '__SEMUA__' ? 'P24/P48 · MO/GO' : kurvaProg}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#9CA8AA] mt-0.5">
              {qRange
                ? `Kumulatif Jan–${BLN_LABEL[qRange[1] - 1]} (s.d. TW ${tw}) · rencana masuk vs realisasi produksi`
                : 'Kumulatif unit rencana vs realisasi produksi'}
            </p>
          </div>
          <select
            value={kurvaProg}
            onChange={(e) => setKurvaProg(e.target.value)}
            aria-label="Pilih program Kurva S"
            className="rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-[#FAF8F2] dark:bg-[#111D21] px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-[#F4EFE4] focus:outline-none focus:ring-2 focus:ring-[#C69320]/30"
          >
            <option value="__SEMUA__">Semua program</option>
            {ringkasSorted.map((r) => (
              <option key={r.program} value={r.program}>
                {r.program}
              </option>
            ))}
          </select>
        </div>

        {sCurveData ? (
          <SCurveChart
            labels={sCurveData.labels}
            rencana={sCurveData.ren}
            realisasi={sCurveData.real}
            unitLabel="unit"
            isDark={isDark}
            heightClass="h-64 sm:h-72"
          />
        ) : (
          <p className="text-xs text-slate-400 py-8 text-center">Data kurva belum tersedia.</p>
        )}
      </MotionCard>

      {/* Status Unit Per Program Table (Independent Card) */}
      <MotionCard className="rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5DFD0] dark:border-[#1D2D32] flex items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">
              Status unit per program{qRange ? ` · Rencana TW ${tw}` : ''}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#9CA8AA]">
              Klik baris program untuk menyaring grafik komposisi dan daftar unit di bawah
            </p>
          </div>
          {filterProg && (
            <button
              type="button"
              onClick={() => setFilterProg(null)}
              className="text-xs font-bold text-[#8E6510] dark:text-[#E6C45A] hover:underline cursor-pointer"
            >
              Tampilkan semua program
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#FAF8F2] dark:bg-[#111D21] border-b border-[#E5DFD0] dark:border-[#1D2D32] text-[11px] uppercase tracking-wider text-slate-500 dark:text-[#9CA8AA]">
              <tr>
                <th className="px-4 py-2.5 font-bold">Program</th>
                <th className="px-4 py-2.5 text-right font-bold">Total Unit</th>
                <th className="px-4 py-2.5 text-right font-bold">Realisasi</th>
                <th className="px-4 py-2.5 text-right font-bold">TSGO</th>
                <th className="px-4 py-2.5 text-right font-bold">Belum Masuk</th>
                <th className="px-4 py-2.5 text-right font-bold">Konservasi/Geser</th>
                <th className="px-4 py-2.5 text-right font-bold">Lainnya</th>
                <th className="px-4 py-2.5 text-right font-bold">% Realisasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEAE0] dark:divide-[#19282D]">
              {ringkasSorted.map((r) => {
                const active = filterProg === r.program;
                const tier = statusTier(r.pct);
                return (
                  <tr
                    key={r.program}
                    onClick={() => setFilterProg((cur) => (cur === r.program ? null : r.program))}
                    className={`cursor-pointer transition ${
                      active
                        ? 'bg-[#FBF5E4] dark:bg-[#D4AF37]/15 font-semibold'
                        : 'hover:bg-[#FAF8F2] dark:hover:bg-[#121E22]'
                    }`}
                  >
                    <td className="px-4 py-2.5 font-extrabold text-slate-950 dark:text-[#F7F3E9]">{r.program}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtInt(r.total)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                      {fmtInt(r.realisasi)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtInt(r.tsgo)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-amber-600 dark:text-amber-400">
                      {fmtInt(r.belumMasuk)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtInt(r.konservasi)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtInt(r.lainnya)}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-bold ${tier.textClass}`}>
                      {fmtP(r.pct)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-[#FAF8F2] dark:bg-[#111D21] border-t-2 border-[#E5DFD0] dark:border-[#1D2D32] font-bold">
              <tr>
                <td className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{fmtInt(totalsRingkas.total)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{fmtInt(totalsRingkas.realisasi)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{fmtInt(totalsRingkas.tsgo)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{fmtInt(totalsRingkas.belumMasuk)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{fmtInt(totalsRingkas.konservasi)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{fmtInt(totalsRingkas.lainnya)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-bold">
                  {fmtP(totalsRingkas.total > 0 ? (totalsRingkas.realisasi / totalsRingkas.total) * 100 : 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </MotionCard>

      {/* Grouped Bar + Status Donut */}
      <MotionStaggerGrid className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <MotionCard className="lg:col-span-7 rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] p-3.5 flex flex-col">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-2 shrink-0">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">
                Realisasi vs rencana per bulan
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#9CA8AA] mt-0.5">
                Klik batang bulan untuk menyaring daftar unit di bawah
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-[#FAF8F2] dark:bg-[#091114] p-0.5 text-xs">
              {SEG_TABS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSegProg(s);
                    setFilterProg(s === 'Semua' ? null : s);
                  }}
                  className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                    segProg === s
                      ? 'bg-gradient-to-r from-[#B88B28] to-[#D4AF37] text-[#070D0F] shadow-xs'
                      : 'text-slate-600 dark:text-[#9CA8AA] hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <ChartCanvas
            isDark={isDark}
            heightClass="flex-1 min-h-[260px]"
            deps={[barSeries, filterBulan, twMask]}
            buildConfig={(_, dark) => ({
              type: 'bar',
              data: {
                labels: BLN_LABEL,
                datasets: [
                  {
                    label: 'Rencana',
                    data: barSeries.rencana,
                    backgroundColor: BLN_LABEL.map((_, i) =>
                      !twMask[i] || (filterBulan && filterBulan !== i + 1)
                        ? 'rgba(16, 185, 129, 0.22)'
                        : '#10B981'
                    ),
                    borderRadius: 5,
                  },
                  {
                    label: 'Realisasi',
                    data: barSeries.realisasi,
                    backgroundColor: BLN_LABEL.map((_, i) =>
                      !twMask[i] || (filterBulan && filterBulan !== i + 1)
                        ? 'rgba(59, 130, 246, 0.22)'
                        : '#3B82F6'
                    ),
                    borderRadius: 5,
                  },
                ],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 4, right: 4, bottom: 0, left: 0 } },
                onClick: (_evt: unknown, elements: Array<{ index: number }>) => {
                  if (elements.length > 0) {
                    const m = elements[0].index + 1;
                    setFilterBulan((cur) => (cur === m ? null : m));
                  }
                },
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      color: dark ? '#94A3B8' : '#64748B',
                      boxWidth: 10,
                      boxHeight: 10,
                      padding: 8,
                      font: { size: 11 },
                    },
                  },
                },
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: { color: dark ? '#94A3B8' : '#64748B', font: { size: 11 }, padding: 4 },
                  },
                  y: {
                    beginAtZero: true,
                    grid: { color: dark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.06)' },
                    ticks: { color: dark ? '#94A3B8' : '#64748B', font: { size: 11 }, padding: 4 },
                  },
                },
              },
            })}
          />
        </MotionCard>

        <MotionCard className="lg:col-span-5 rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] p-3.5 flex flex-col">
          <div className="mb-2 shrink-0">
            <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">
              Komposisi status unit · {filterProg || 'Semua program'}{qRange ? ` · TW ${tw}` : ''}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#9CA8AA] mt-0.5">
              Klik status untuk memfilter daftar unit di bawah
            </p>
          </div>
          <div className="flex-1 flex flex-col">
            <DonutPanel
              legendLayout="list"
              size={180}
              centerValue={fmtInt(donutStats.total)}
              centerLabel="total unit"
              activeLabel={filterStatus}
              onSelect={(lbl) => setFilterStatus((cur) => (cur === lbl ? null : lbl))}
              segments={[
                { label: 'Realisasi', value: donutStats.realisasi, color: '#10B981' },
                { label: 'TSGO', value: donutStats.tsgo, color: '#3B82F6' },
                { label: 'Belum masuk', value: donutStats.belumMasuk, color: '#F59E0B' },
                { label: 'Konservasi', value: donutStats.konservasi, color: '#94A3B8' },
                ...(donutStats.lainnya > 0
                  ? [{ label: 'Lainnya', value: donutStats.lainnya, color: '#6366F1' }]
                  : []),
              ]}
            />
          </div>
        </MotionCard>
      </MotionStaggerGrid>

      {/* Active filter strip */}
      {hasFilter && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#C69320]/40 dark:border-[#D4AF37]/40 bg-[#FBF5E4]/85 dark:bg-[#142226] px-3.5 py-2 text-xs">
          <span className="font-bold text-[#855C0D] dark:text-[#F5DFA0]">Filter unit aktif:</span>
          {filterProg && (
            <button
              type="button"
              onClick={() => setFilterProg(null)}
              className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-[#0D1619] border border-[#DCD4C0] dark:border-[#23353B] px-2 py-0.5 font-semibold cursor-pointer"
            >
              Program: {filterProg} <X className="w-3 h-3" />
            </button>
          )}
          {filterBulan && (
            <button
              type="button"
              onClick={() => setFilterBulan(null)}
              className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-[#0D1619] border border-[#DCD4C0] dark:border-[#23353B] px-2 py-0.5 font-semibold cursor-pointer"
            >
              Bulan: {BLN_LABEL[filterBulan - 1]} <X className="w-3 h-3" />
            </button>
          )}
          {filterStatus && (
            <button
              type="button"
              onClick={() => setFilterStatus(null)}
              className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-[#0D1619] border border-[#DCD4C0] dark:border-[#23353B] px-2 py-0.5 font-semibold cursor-pointer"
            >
              Status: {filterStatus} <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setFilterProg(null);
              setFilterBulan(null);
              setFilterStatus(null);
            }}
            className="ml-auto inline-flex items-center gap-1 font-bold text-[#8E6510] dark:text-[#E6C45A] hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Reset filter
          </button>
        </div>
      )}

      {/* Detail Unit DataTable */}
      <DataTable
        title="Daftar unit program"
        subtitle="Klik judul kolom untuk mengurutkan"
        rows={detailRows}
        columns={columns}
        searchPlaceholder="Cari nomor sarana, jenis, depo, atau status..."
        searchPredicate={(r, q) => r.c.some((cell) => cell.toLowerCase().includes(q))}
        pageSize={25}
      />
    </div>
  );
};
