import React, { useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, GitCompare } from 'lucide-react';
import { KpiCard } from '../ui/KpiCard';
import { MotionCard, MotionFillBar, MotionStaggerGrid } from '../ui/MotionPrimitives';
import { DonutPanel } from '../charts/DonutPanel';
import { SCurveChart } from '../charts/SCurveChart';
import {
  BLN_LABEL,
  PROG_ORDER,
  TIPE_COLORS,
  fmtInt,
  fmtM,
  fmtP,
  fmtRp,
  statusTier,
  twLabelText,
  twRange,
} from '../../utils/formatters';
import type { AparData, DashboardData, TabId, TriwulanType } from '../../types/dashboard';

interface RingkasanViewProps {
  data: DashboardData;
  aparData: AparData | null;
  prevData: DashboardData | null;
  prevLoading: boolean;
  onRequestPrevYear: () => void;
  tw: TriwulanType;
  isDark: boolean;
  onNavigate: (tab: TabId, preset?: { prog?: string; pengadaanKat?: string }) => void;
}

const MONTH_NAME_MAP: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  mei: 5,
  may: 5,
  jun: 6,
  jul: 7,
  agu: 8,
  aug: 8,
  sep: 9,
  okt: 10,
  oct: 10,
  nov: 11,
  des: 12,
  dec: 12,
};

function periodToMonth(periode: string): number {
  const s = periode.trim().toLowerCase();
  for (const [k, m] of Object.entries(MONTH_NAME_MAP)) {
    if (s.startsWith(k)) return m;
  }
  return 0;
}

export const RingkasanView: React.FC<RingkasanViewProps> = ({
  data,
  aparData,
  prevData,
  prevLoading,
  onRequestPrevYear,
  tw,
  isDark,
  onNavigate,
}) => {
  const [yoyOn, setYoyOn] = useState(false);
  const [kurvaMode, setKurvaMode] = useState<'unit' | 'rupiah'>('unit');

  const qRange = twRange(tw);
  const is2025 = data.tahun === 2025;
  const prevTahunLabel = String(data.tahun - 1);

  const toggleYoy = () => {
    const next = !yoyOn;
    setYoyOn(next);
    if (next && !prevData && !prevLoading) {
      onRequestPrevYear();
    }
  };

  /* ---------------- Anggaran metrics ---------------- */
  const angMetrics = useMemo(() => {
    const tot = data.anggaran?.total;
    if (!tot) return null;

    if (qRange && data.kurvaAnggaran?.length) {
      // Find points inside quarter or up to quarter end
      const pts = data.kurvaAnggaran.map((p) => ({
        ...p,
        m: periodToMonth(p.periode),
      }));
      const inQ = pts.filter((p) => p.m >= qRange[0] && p.m <= qRange[1]);
      const lastInQ = [...inQ].reverse().find((p) => p.konsumsi !== null || p.rencana !== null);
      if (lastInQ && lastInQ.rencana) {
        const kons = lastInQ.konsumsi ?? 0;
        const ren = lastInQ.rencana;
        const pct = ren > 0 ? (kons / ren) * 100 : 0;
        return {
          pct,
          hero: fmtP(pct),
          subline: `${fmtM(kons)} dari rencana ${fmtM(ren)}`,
          footerText: `Selisih ${fmtM(ren - kons)} (${twLabelText(tw)})`,
          footerOk: kons <= ren && pct >= 80,
          spark: pts.filter((p) => p.konsumsi !== null).map((p) => p.konsumsi as number),
        };
      }
    }

    const pct = tot.pct;
    const spark =
      data.kurvaAnggaran
        ?.filter((p) => p.konsumsi !== null)
        .map((p) => p.konsumsi as number) || [];
    return {
      pct,
      hero: fmtP(pct),
      subline: `${fmtM(tot.consumed)} dari RKAP ${fmtM(tot.rkap)}`,
      footerText: qRange
        ? `Sisa ${fmtM(tot.available)} · kumulatif tahunan`
        : `Sisa ${fmtM(tot.available)}`,
      footerOk: tot.available >= 0 && pct >= 80,
      spark,
    };
  }, [data.anggaran, data.kurvaAnggaran, qRange, tw]);

  /* ---------------- Pengadaan metrics ---------------- */
  const pbjMetrics = useMemo(() => {
    const p = data.pengadaan;
    if (!p) return null;
    const rows = qRange
      ? p.rows.filter((r) => r[10] >= qRange[0] && r[10] <= qRange[1])
      : p.rows;
    const total = rows.length;
    const selesai = rows.filter((r) => r[9] === 'Selesai').length;
    const proses = rows.filter((r) => r[9] === 'Dalam Proses').length;
    const gagal = rows.filter((r) => r[9] === 'Gagal/Batal').length;
    const pct = total > 0 ? (selesai / total) * 100 : 0;

    // Cumulative monthly trend for sparkline
    const spark: number[] = [];
    let acc = 0;
    for (let m = 0; m < 12; m++) {
      if (qRange && (m + 1 < qRange[0] || m + 1 > qRange[1])) continue;
      acc += p.perBulanJml[m] || 0;
      if (p.perBulanJml[m] > 0 || spark.length > 0) spark.push(acc);
    }

    return { total, selesai, proses, gagal, pct, rows, spark };
  }, [data.pengadaan, qRange]);

  /* ---------------- Program metrics ---------------- */
  const progMetrics = useMemo(() => {
    const pr = data.program;
    if (!pr) return null;
    const baseRingkas = pr.ringkas.filter((r) => !/^(grand\s*total|sub\s*total|total|jumlah)\s*:?$/i.test(r.program.trim()));

    if (!qRange) {
      const sum = baseRingkas.reduce(
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
      const pct = sum.total > 0 ? (sum.realisasi / sum.total) * 100 : 0;
      return { ringkas: baseRingkas, sum, pct };
    }

    // Quarter-filtered from detail rows
    const ringkas = baseRingkas.map((base) => {
      const det = (pr.detail[base.program] || []).filter((d) => d.mr >= qRange[0] && d.mr <= qRange[1]);
      if (!det.length) {
        return { ...base, total: 0, realisasi: 0, tsgo: 0, belumMasuk: 0, konservasi: 0, lainnya: 0, pct: 0 };
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

    const sum = ringkas.reduce(
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
    const pct = sum.total > 0 ? (sum.realisasi / sum.total) * 100 : 0;
    return { ringkas, sum, pct };
  }, [data.program, qRange]);

  /* ---------------- S-Curve Data (Unit or Rupiah) ---------------- */
  const kurvaUnit = useMemo(() => {
    const bulanMap = data.program?.bulan;
    if (!bulanMap) return null;
    let b = bulanMap.__SEMUA__;
    if (!b) {
      const keys = Object.keys(bulanMap).filter((k) => k !== '__SEMUA__');
      if (!keys.length) return null;
      const sumRen = new Array(12).fill(0);
      const sumReal = new Array(12).fill(0);
      keys.forEach((k) => {
        const s = bulanMap[k];
        if (!s) return;
        for (let i = 0; i < 12; i++) {
          sumRen[i] += s.rencana[i] || 0;
          sumReal[i] += s.realisasi[i] || 0;
        }
      });
      b = { rencana: sumRen, realisasi: sumReal };
    }
    const labels: string[] = [];
    const renCum: Array<number | null> = [];
    const realCum: Array<number | null> = [];
    let cRen = 0;
    let cReal = 0;
    let lastRealIdx = -1;
    for (let i = 0; i < 12; i++) {
      if ((b.realisasi[i] || 0) > 0) lastRealIdx = i;
    }
    for (let i = 0; i < 12; i++) {
      if (qRange && i + 1 > qRange[1]) continue;
      labels.push(BLN_LABEL[i]);
      cRen += b.rencana[i] || 0;
      cReal += b.realisasi[i] || 0;
      renCum.push(cRen);
      realCum.push(i <= lastRealIdx ? cReal : null);
    }
    if (cRen === 0 && lastRealIdx < 0) return null;

    let lastLabel = '';
    let lastSelisih: number | null = null;
    for (let idx = realCum.length - 1; idx >= 0; idx--) {
      const rv = realCum[idx];
      if (rv !== null && rv !== undefined) {
        lastLabel = labels[idx];
        lastSelisih = rv - Number(renCum[idx] ?? 0);
        break;
      }
    }

    return { labels, renCum, realCum, lastLabel, lastSelisih };
  }, [data.program, qRange]);

  const kurvaRupiah = useMemo(() => {
    const ka = data.kurvaAnggaran;
    if (!ka?.length) return null;
    const pts = qRange
      ? ka.filter((p) => {
          const m = periodToMonth(p.periode);
          return m === 0 || m <= qRange[1];
        })
      : ka;
    if (!pts.length) return null;
    return {
      labels: pts.map((p) => p.periode),
      rencana: pts.map((p) => p.rencana),
      konsumsi: pts.map((p) => p.konsumsi),
    };
  }, [data.kurvaAnggaran, qRange]);

  /* ---------------- Top 6 Cost Items ---------------- */
  const topCostItems = useMemo(() => {
    const rows = data.anggaran?.rows || [];
    return rows
      .slice()
      .sort((a, b) => b.rkap - a.rkap)
      .slice(0, 6);
  }, [data.anggaran]);

  /* ---------------- Contract Value by Tipe ---------------- */
  const nilaiPerTipe = useMemo(() => {
    const rows = pbjMetrics?.rows || [];
    const map: Record<string, number> = {};
    rows.forEach((r) => {
      const t = (r[3] || '(belum diisi)').toUpperCase();
      map[t] = (map[t] || 0) + r[5];
    });
    const entries = Object.entries(map)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    return {
      total,
      segments: entries.map(([label, value]) => ({
        label,
        value,
        color: TIPE_COLORS[label] || TIPE_COLORS[label.toUpperCase()] || '#6366F1',
        detailText: fmtM(value),
      })),
    };
  }, [pbjMetrics]);

  /* ---------------- YoY Helpers ---------------- */
  const yoyAnggaranDelta = useMemo(() => {
    if (!yoyOn || !prevData?.anggaran?.total || !angMetrics) return null;
    return angMetrics.pct - prevData.anggaran.total.pct;
  }, [yoyOn, prevData, angMetrics]);

  const yoyPbjDelta = useMemo(() => {
    if (!yoyOn || !prevData?.pengadaan || !pbjMetrics) return null;
    return pbjMetrics.pct - prevData.pengadaan.pctSelesai;
  }, [yoyOn, prevData, pbjMetrics]);

  const yoyProgDelta = useMemo(() => {
    if (!yoyOn || !prevData?.program || !progMetrics) return null;
    const prevSum = prevData.program.ringkas
      .filter((r) => !/^(grand\s*total|sub\s*total|total|jumlah)\s*:?$/i.test(r.program.trim()))
      .reduce(
        (acc, r) => {
          acc.t += r.total;
          acc.r += r.realisasi;
          return acc;
        },
        { t: 0, r: 0 }
      );
    const prevPct = prevSum.t > 0 ? (prevSum.r / prevSum.t) * 100 : 0;
    return progMetrics.pct - prevPct;
  }, [yoyOn, prevData, progMetrics]);

  /* ---------------- Perlu Perhatian List ---------------- */
  const perhatianItems = useMemo(() => {
    const list: Array<{
      title: string;
      desc: string;
      severity: 'rose' | 'amber' | 'blue';
      tab: TabId;
      preset?: { prog?: string; pengadaanKat?: string };
    }> = [];

    if (pbjMetrics && pbjMetrics.gagal > 0) {
      list.push({
        title: `${fmtInt(pbjMetrics.gagal)} pengadaan gagal / batal`,
        desc: `Dari ${fmtInt(pbjMetrics.total)} dokumen (${fmtInt(pbjMetrics.proses)} masih dalam proses)`,
        severity: 'rose',
        tab: 'pengadaan',
        preset: { pengadaanKat: 'Gagal/Batal' },
      });
    }
    if (progMetrics && progMetrics.sum.belumMasuk > 0) {
      list.push({
        title: `${fmtInt(progMetrics.sum.belumMasuk)} unit program belum masuk BY`,
        desc: `${fmtInt(progMetrics.sum.tsgo)} TSGO dan ${fmtInt(progMetrics.sum.konservasi)} konservasi/geser`,
        severity: 'amber',
        tab: 'program',
      });
    }
    const lowCostItems = (data.anggaran?.rows || []).filter((r) => r.release > 0 && r.pct < 80);
    if (lowCostItems.length > 0) {
      list.push({
        title: `${lowCostItems.length} cost item serapan di bawah 80%`,
        desc: lowCostItems
          .slice(0, 2)
          .map((c) => `${c.ci} (${fmtP(c.pct)})`)
          .join(' · '),
        severity: 'amber',
        tab: 'anggaran',
      });
    }
    if (!is2025 && data.nusantara && data.nusantara.kpi.deviasiNum < 0) {
      list.push({
        title: `Deviasi Nusantara Explorer ${data.nusantara.kpi.deviasi}`,
        desc: `Aktual ${data.nusantara.kpi.aktual} vs rencana ${data.nusantara.kpi.rencana}`,
        severity: 'amber',
        tab: 'nusantara',
      });
    }
    if (aparData && (aparData.perStatus.Kadaluarsa > 0 || aparData.perStatus['Segera kadaluarsa'] > 0)) {
      list.push({
        title: `${aparData.perStatus.Kadaluarsa} APAR kadaluarsa · ${aparData.perStatus['Segera kadaluarsa']} segera kadaluarsa`,
        desc: `Batas pantau ${aparData.batasHari} hari dari ${aparData.acuan}`,
        severity: aparData.perStatus.Kadaluarsa > 0 ? 'rose' : 'amber',
        tab: 'apar',
      });
    }
    return list;
  }, [pbjMetrics, progMetrics, data.anggaran, data.nusantara, aparData, is2025]);

  const orderedRingkas = useMemo(() => {
    if (!progMetrics) return [];
    return progMetrics.ringkas
      .slice()
      .sort((a, b) => {
        const ia = PROG_ORDER.indexOf(a.program);
        const ib = PROG_ORDER.indexOf(b.program);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
  }, [progMetrics]);

  return (
    <div className="space-y-3">
      {/* YoY Toggle Bar */}
      <MotionCard className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-600 dark:text-[#9CA8AA]">
          Ringkasan kinerja Unit Perencanaan tahun{' '}
          <span className="font-extrabold text-slate-950 dark:text-[#F5DFA0]">{data.tahun}</span>
          {qRange ? ` · ${twLabelText(tw)}` : ''}
        </p>
        <button
          type="button"
          onClick={toggleYoy}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
            yoyOn
              ? 'border-[#C69320] bg-[#FBF5E4] text-[#855C0D] dark:bg-[#D4AF37]/15 dark:text-[#F5DFA0] dark:border-[#D4AF37]/50'
              : 'border-[#DCD4C0] dark:border-[#23353B] bg-white dark:bg-[#0D1619] text-slate-700 dark:text-[#D5CFC2] hover:border-[#C69320]/60 dark:hover:border-[#D4AF37]/50'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" />
          <span>
            {prevLoading
              ? `Memuat data ${prevTahunLabel}...`
              : yoyOn
              ? `Perbandingan vs ${prevTahunLabel} aktif`
              : `Bandingkan dengan ${prevTahunLabel}`}
          </span>
        </button>
      </MotionCard>

      {/* 4 KPI Cards Row */}
      <MotionStaggerGrid className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard
          title="Anggaran terserap"
          value={angMetrics ? angMetrics.hero : '—'}
          subline={angMetrics?.subline || 'Data anggaran belum tersedia'}
          pctForStatus={angMetrics?.pct}
          sparkData={angMetrics?.spark}
          showThresholdBar={Boolean(angMetrics)}
          onClick={() => onNavigate('anggaran')}
          footer={
            angMetrics && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-emerald-600 dark:text-emerald-400">{angMetrics.footerText}</span>
                {yoyAnggaranDelta !== null && (
                  <span
                    className={`tabular-nums ${
                      yoyAnggaranDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {yoyAnggaranDelta >= 0 ? '+' : ''}
                    {fmtP(yoyAnggaranDelta)} vs {prevTahunLabel}
                  </span>
                )}
              </div>
            )
          }
        />

        <KpiCard
          title="Pengadaan selesai"
          value={pbjMetrics ? fmtP(pbjMetrics.pct) : '—'}
          subline={
            pbjMetrics
              ? `${fmtInt(pbjMetrics.selesai)} dari ${fmtInt(pbjMetrics.total)} dokumen`
              : 'Data pengadaan belum tersedia'
          }
          pctForStatus={pbjMetrics?.pct}
          sparkData={pbjMetrics?.spark}
          showThresholdBar={Boolean(pbjMetrics)}
          onClick={() => onNavigate('pengadaan')}
          footer={
            pbjMetrics && (
              <div className="flex items-center justify-between gap-2">
                <span className={pbjMetrics.gagal > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}>
                  {fmtInt(pbjMetrics.gagal)} gagal / batal
                </span>
                {yoyPbjDelta !== null && (
                  <span
                    className={`tabular-nums ${
                      yoyPbjDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {yoyPbjDelta >= 0 ? '+' : ''}
                    {fmtP(yoyPbjDelta)} vs {prevTahunLabel}
                  </span>
                )}
              </div>
            )
          }
        />

        <KpiCard
          title="Realisasi program"
          value={progMetrics ? fmtP(progMetrics.pct) : '—'}
          subline={
            progMetrics
              ? `${fmtInt(progMetrics.sum.realisasi)} dari ${fmtInt(progMetrics.sum.total)} unit${qRange ? ` (rencana TW ${tw})` : ''}`
              : 'Data program belum tersedia'
          }
          pctForStatus={progMetrics?.pct}
          sparkData={kurvaUnit?.realCum.filter((v): v is number => v !== null)}
          showThresholdBar={Boolean(progMetrics)}
          onClick={() => onNavigate('program')}
          footer={
            progMetrics && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-amber-600 dark:text-amber-400">
                  {fmtInt(progMetrics.sum.belumMasuk)} unit belum masuk
                </span>
                {yoyProgDelta !== null && (
                  <span
                    className={`tabular-nums ${
                      yoyProgDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {yoyProgDelta >= 0 ? '+' : ''}
                    {fmtP(yoyProgDelta)} vs {prevTahunLabel}
                  </span>
                )}
              </div>
            )
          }
        />

        {is2025 ? (
          <KpiCard
            title="Penugasan"
            value={data.penugasan ? fmtInt(data.penugasan.total) : '—'}
            subline={
              data.penugasan
                ? `Nilai kontrak ${fmtM(data.penugasan.nilaiPerjanjian)}`
                : 'Data penugasan tidak tersedia'
            }
            accentColor="blue"
            onClick={() => onNavigate('penugasan')}
            footer={
              data.penugasan && (
                <span className="text-slate-500 dark:text-slate-400">
                  RAB {fmtM(data.penugasan.nilaiRab)} · {fmtInt(data.penugasan.batal)} batal
                </span>
              )
            }
          />
        ) : (
          <KpiCard
            title="Nusantara Explorer"
            value={data.nusantara ? data.nusantara.kpi.aktual : '—'}
            subline={
              data.nusantara
                ? `Rencana ${data.nusantara.kpi.rencana}, deviasi ${data.nusantara.kpi.deviasi}`
                : 'Data Nusantara belum tersedia'
            }
            pctForStatus={data.nusantara?.kpi.aktualNum}
            sparkData={
              data.nusantara?.kurva
                .filter((p) => p.aktual !== null)
                .map((p) => p.aktual as number) || []
            }
            showThresholdBar={Boolean(data.nusantara)}
            onClick={() => onNavigate('nusantara')}
            footer={
              data.nusantara && (
                <span className="text-emerald-600 dark:text-emerald-400">
                  Selesai 100%: {data.nusantara.kpi.selesai} kereta{qRange ? ' · progres kumulatif' : ''}
                </span>
              )
            }
          />
        )}
      </MotionStaggerGrid>

      {/* Middle 3-column Row */}
      <MotionStaggerGrid className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Status unit per program */}
        <MotionCard className="lg:col-span-4 rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] p-3.5 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-2 shrink-0">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">
                Status unit per program
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#9CA8AA] mt-0.5">
                Garis batas 80% &amp; 95%. Klik baris untuk detail.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-2 -mx-2 mb-1 text-[10px] font-semibold text-slate-400 dark:text-[#7E8C8F] shrink-0">
            <div className="w-14 shrink-0" />
            <div className="flex-1 min-w-0 relative h-3.5">
              <span className="absolute left-0">0%</span>
              <span className="absolute -translate-x-1/2" style={{ left: '80%' }}>
                80%
              </span>
              <span className="absolute -translate-x-1/2" style={{ left: '95%' }}>
                95%
              </span>
            </div>
            <div className="w-12 shrink-0" />
          </div>

          <div className="flex-1 flex flex-col justify-between gap-1.5">
            {orderedRingkas.map((r) => {
              const t = statusTier(r.pct);
              const w = Math.max(0, Math.min(100, r.pct));
              return (
                <button
                  key={r.program}
                  type="button"
                  onClick={() => onNavigate('program', { prog: r.program })}
                  className="w-full text-left rounded-lg px-2 py-1.5 -mx-2 hover:bg-stone-100/80 dark:hover:bg-[#142024] transition group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 shrink-0">
                      <div className="font-display text-xs font-extrabold text-slate-950 dark:text-[#F7F3E9] group-hover:text-[#A67C21] dark:group-hover:text-[#E6C45A]">
                        {r.program}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 dark:text-[#8E9B9E] tabular-nums">
                        {fmtInt(r.total)} unit
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="relative h-2.5 rounded-full bg-stone-200/80 dark:bg-[#18262B] overflow-visible">
                        <MotionFillBar pct={w} color={t.barColor} delay={0.18} />
                        <span
                          className="absolute -top-0.5 bottom-[-2px] w-px bg-slate-400/75"
                          style={{ left: '80%' }}
                        />
                        <span
                          className="absolute -top-0.5 bottom-[-2px] w-px bg-slate-700 dark:bg-[#E6C45A]/80"
                          style={{ left: '95%' }}
                        />
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] font-medium text-slate-600 dark:text-[#9CA8AA] tabular-nums">
                        <span>• Realisasi {fmtInt(r.realisasi)}</span>
                        <span>• TSGO {fmtInt(r.tsgo)}</span>
                        <span>• Belum {fmtInt(r.belumMasuk)}</span>
                        <span>• Konservasi {fmtInt(r.konservasi)}</span>
                        {r.lainnya > 0 && <span>• Lainnya {fmtInt(r.lainnya)}</span>}
                      </div>
                    </div>

                    <div className={`w-12 text-right text-xs font-extrabold tabular-nums shrink-0 ${t.textClass}`}>
                      {fmtP(r.pct)}
                    </div>
                  </div>
                </button>
              );
            })}
            {!orderedRingkas.length && (
              <p className="text-xs text-slate-400 py-6 text-center">Belum ada data program.</p>
            )}
          </div>
        </MotionCard>

        {/* Komposisi semua program */}
        <MotionCard className="lg:col-span-3 rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] p-3.5 flex flex-col">
          <div className="mb-2 shrink-0">
            <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">
              Komposisi semua program
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#9CA8AA] mt-0.5">
              Distribusi status seluruh unit{qRange ? ` · TW ${tw}` : ''}
            </p>
          </div>
          {progMetrics ? (
            <div className="flex-1 flex flex-col">
              <DonutPanel
                legendLayout="stacked-list"
                size={164}
                dense
                centerValue={fmtInt(progMetrics.sum.total)}
                centerLabel="unit"
                onSelect={() => onNavigate('program')}
                segments={[
                  {
                    label: 'Realisasi',
                    value: progMetrics.sum.realisasi,
                    color: '#10B981',
                    detailText: `${fmtInt(progMetrics.sum.realisasi)} unit`,
                  },
                  {
                    label: 'TSGO',
                    value: progMetrics.sum.tsgo,
                    color: '#3B82F6',
                    detailText: `${fmtInt(progMetrics.sum.tsgo)} unit`,
                  },
                  {
                    label: 'Belum masuk',
                    value: progMetrics.sum.belumMasuk,
                    color: '#F59E0B',
                    detailText: `${fmtInt(progMetrics.sum.belumMasuk)} unit`,
                  },
                  {
                    label: 'Konservasi',
                    value: progMetrics.sum.konservasi,
                    color: '#94A3B8',
                    detailText: `${fmtInt(progMetrics.sum.konservasi)} unit`,
                  },
                  ...(progMetrics.sum.lainnya > 0
                    ? [
                        {
                          label: 'Lainnya',
                          value: progMetrics.sum.lainnya,
                          color: '#6366F1',
                          detailText: `${fmtInt(progMetrics.sum.lainnya)} unit`,
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-10 text-center my-auto">Data program tidak tersedia.</p>
          )}
        </MotionCard>

        {/* Kurva S */}
        <MotionCard className="lg:col-span-5 rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] p-3.5 flex flex-col">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-2 shrink-0">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">
                Kurva S: {kurvaMode === 'unit' ? 'Program P24/P48 · MO/GO' : 'Penyerapan Anggaran'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#9CA8AA] mt-0.5">
                {kurvaMode === 'unit' && kurvaUnit?.lastLabel && kurvaUnit.lastSelisih !== null
                  ? `${
                      qRange ? `Kumulatif Jan–${BLN_LABEL[qRange[1] - 1]} (s.d. TW ${tw}) · ` : ''
                    }Selisih per ${kurvaUnit.lastLabel}: ${kurvaUnit.lastSelisih >= 0 ? '+' : ''}${fmtInt(kurvaUnit.lastSelisih)} unit`
                  : qRange
                  ? `Kumulatif Jan–${BLN_LABEL[qRange[1] - 1]} (s.d. TW ${tw}) rencana vs realisasi`
                  : 'Perbandingan kumulatif rencana vs realisasi'}
              </p>
            </div>
            {kurvaRupiah && (
              <div className="inline-flex rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-[#FAF8F2] dark:bg-[#091114] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setKurvaMode('unit')}
                  className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                    kurvaMode === 'unit'
                      ? 'bg-gradient-to-r from-[#B88B28] to-[#D4AF37] text-[#070D0F] shadow-xs'
                      : 'text-slate-600 dark:text-[#9CA8AA]'
                  }`}
                >
                  Unit
                </button>
                <button
                  type="button"
                  onClick={() => setKurvaMode('rupiah')}
                  className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                    kurvaMode === 'rupiah'
                      ? 'bg-gradient-to-r from-[#B88B28] to-[#D4AF37] text-[#070D0F] shadow-xs'
                      : 'text-slate-600 dark:text-[#9CA8AA]'
                  }`}
                >
                  Rupiah
                </button>
              </div>
            )}
          </div>

          {kurvaMode === 'rupiah' && kurvaRupiah ? (
            <SCurveChart
              labels={kurvaRupiah.labels}
              rencana={kurvaRupiah.rencana}
              realisasi={kurvaRupiah.konsumsi}
              unitLabel="Rp"
              formatValue={(v) => fmtM(v)}
              formatSelisih={(v) => `${v >= 0 ? '+' : ''}${fmtM(v)}`}
              isDark={isDark}
              heightClass="flex-1 min-h-[260px]"
              showSummaryStrip={false}
            />
          ) : kurvaUnit ? (
            <SCurveChart
              labels={kurvaUnit.labels}
              rencana={kurvaUnit.renCum}
              realisasi={kurvaUnit.realCum}
              unitLabel="unit"
              isDark={isDark}
              heightClass="flex-1 min-h-[260px]"
              showSummaryStrip={false}
            />
          ) : (
            <p className="text-xs text-slate-400 py-10 text-center my-auto">Data Kurva S belum tersedia.</p>
          )}
        </MotionCard>
      </MotionStaggerGrid>

      {/* Bottom 3-column Row */}
      <MotionStaggerGrid className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Top 6 Cost Items */}
        <MotionCard className="lg:col-span-5 rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] p-3.5 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-2 shrink-0">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">
                Anggaran terbesar per cost item
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#9CA8AA] mt-0.5">
                6 cost item dengan RKAP terbesar · batas target 95%
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('anggaran')}
              className="text-xs font-bold text-[#8E6510] dark:text-[#E6C45A] hover:underline inline-flex items-center gap-1 shrink-0 cursor-pointer"
            >
              Semua <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-between gap-2">
            {topCostItems.map((c) => {
              const t = statusTier(c.pct);
              const w = Math.max(0, Math.min(100, c.pct));
              return (
                <div key={`${c.fc}-${c.ci}`} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-800 dark:text-[#E5DFD0] truncate" title={c.ci}>
                      {c.ci}
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-500 dark:text-[#9CA8AA]">
                      {fmtM(c.consumed)} / {fmtM(c.rkap)}{' '}
                      <span className={`font-extrabold ml-1 ${t.textClass}`}>{fmtP(c.pct)}</span>
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-stone-200/80 dark:bg-[#18262B] overflow-visible">
                    <MotionFillBar pct={w} color={t.barColor} delay={0.22} />
                    <span
                      className="absolute -top-0.5 bottom-[-2px] w-px bg-slate-500 dark:bg-[#E6C45A]/80"
                      style={{ left: '95%' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </MotionCard>

        {/* Nilai kontrak per tipe */}
        <MotionCard className="lg:col-span-3 rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] p-3.5 flex flex-col">
          <div className="mb-1.5 shrink-0">
            <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">
              Nilai kontrak per tipe
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#9CA8AA] mt-0.5">
              UMDS, SPK, dan Kontrak{qRange ? ` · ${twLabelText(tw)}` : ''}
            </p>
          </div>
          {nilaiPerTipe.segments.length > 0 ? (
            <div className="flex-1 flex flex-col">
              <DonutPanel
                legendLayout="stacked-list"
                size={156}
                dense
                centerValue={fmtM(nilaiPerTipe.total)}
                centerLabel="total nilai"
                onSelect={() => onNavigate('pengadaan')}
                segments={nilaiPerTipe.segments}
              />
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-10 text-center my-auto">Belum ada nilai kontrak.</p>
          )}
        </MotionCard>

        {/* Perlu perhatian */}
        <MotionCard className="lg:col-span-4 rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] p-3.5 flex flex-col">
          <div className="mb-2 shrink-0">
            <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">Perlu perhatian</h3>
            <p className="text-xs text-slate-500 dark:text-[#9CA8AA] mt-0.5">
              Klik item untuk membuka halaman terkait
            </p>
          </div>

          {perhatianItems.length === 0 ? (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/70 dark:bg-emerald-950/30 p-3 flex items-center gap-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Seluruh indikator utama berada di atas ambang batas.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {perhatianItems.map((item, idx) => {
                const badgeCls =
                  item.severity === 'rose'
                    ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'
                    : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300';
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onNavigate(item.tab, item.preset)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 transition hover:brightness-95 dark:hover:brightness-110 flex items-start justify-between gap-2 cursor-pointer ${badgeCls}`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold leading-snug">{item.title}</div>
                        <div className="text-[11px] opacity-85 mt-0.5 truncate" title={item.desc}>
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" />
                  </button>
                );
              })}
            </div>
          )}
        </MotionCard>
      </MotionStaggerGrid>

      {/* Status Color Legend Strip */}
      <MotionCard className="rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-[#9CA8AA]">
        <span className="font-bold text-slate-800 dark:text-[#E5DFD0]">Panduan warna &amp; batas status:</span>
        <div className="flex flex-wrap items-center gap-4 font-semibold">
          <span className="text-emerald-600 dark:text-emerald-400">≥ 95% Tercapai</span>
          <span className="text-amber-600 dark:text-amber-400">80% – 94,9% Peringatan</span>
          <span className="text-rose-600 dark:text-rose-400">&lt; 80% Perlu Perhatian</span>
        </div>
      </MotionCard>

      {/* Quick sanity hidden usage check */}
      <span className="sr-only">{fmtRp(data.anggaran?.total.rkap)}</span>
    </div>
  );
};
