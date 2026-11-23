import React, { useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, ExternalLink, RotateCcw, X } from 'lucide-react';
import { KpiCard } from '../ui/KpiCard';
import { DonutPanel } from '../charts/DonutPanel';
import { ChartCanvas } from '../charts/ChartCanvas';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import {
  BLN_LABEL,
  fmtInt,
  fmtP,
  twBulanMask,
  twLabelText,
  twRange,
} from '../../utils/formatters';
import type { BysguRow, FasilitasData, ProlisRow, TabId, TriwulanType } from '../../types/dashboard';

function latestKond(r: ProlisRow): 'B' | 'R' | 'A' | '-' {
  for (let m = 11; m >= 0; m--) {
    if (r[10][m] === '1') {
      const ch = r[11][m];
      if (ch === 'B' || ch === 'R' || ch === 'A') return ch;
    }
  }
  return '-';
}

function kondLabel(k: 'B' | 'R' | 'A' | '-'): string {
  if (k === 'B') return 'Baik';
  if (k === 'R') return 'Rusak';
  if (k === 'A') return 'Usulan Afkir';
  return 'Belum ada data';
}

function kondBadgeClass(k: 'B' | 'R' | 'A' | '-'): string {
  if (k === 'B') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60';
  }
  if (k === 'R') {
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60';
  }
  if (k === 'A') {
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60';
  }
  return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
}

/* ================================ 1. FASILITAS RINGKASAN ================================ */

interface FasilitasRingkasanProps {
  fasilitas: FasilitasData;
  tw: TriwulanType;
  isDark: boolean;
  onNavigate: (tab: TabId) => void;
}

export const FasilitasRingkasanView: React.FC<FasilitasRingkasanProps> = ({
  fasilitas,
  tw,
  isDark,
  onNavigate,
}) => {
  const qRange = twRange(tw);
  const twMask = useMemo(() => twBulanMask(tw), [tw]);
  const { prolis, bysgu, apar } = fasilitas;

  const prolisSummary = useMemo(() => {
    const rows = prolis?.rows || [];
    let baik = 0;
    let rusak = 0;
    let afkir = 0;
    let kosong = 0;
    let totalProg = 0;
    let totalReal = 0;
    const perBulanProg = new Array(12).fill(0);
    const perBulanReal = new Array(12).fill(0);

    rows.forEach((r) => {
      const k = latestKond(r);
      if (k === 'B') baik++;
      else if (k === 'R') rusak++;
      else if (k === 'A') afkir++;
      else kosong++;

      for (let m = 0; m < 12; m++) {
        const hasP = Boolean(r[8][m]);
        const hasR = r[9][m] === '1';
        if (hasP) perBulanProg[m]++;
        if (hasR) perBulanReal[m]++;
        if (!qRange || (m + 1 >= qRange[0] && m + 1 <= qRange[1])) {
          if (hasP) totalProg++;
          if (hasR) totalReal++;
        }
      }
    });

    return {
      totalMesin: rows.length,
      baik,
      rusak,
      afkir,
      kosong,
      totalProg,
      totalReal,
      pctReal: totalProg > 0 ? (totalReal / totalProg) * 100 : 0,
      perBulanProg,
      perBulanReal,
    };
  }, [prolis, qRange]);

  const bysguSummary = useMemo(() => {
    const rows = (bysgu?.rows || []).filter((r) => {
      if (!qRange) return true;
      return r[5] === 0 || String(r[5]) === tw;
    });
    const wajibRows = rows.filter((r) => r[7] === 1);
    const ada = wajibRows.filter((r) => r[10] === 'A').length;
    const belum = wajibRows.filter((r) => r[10] === 'B').length;
    const tidakWajib = rows.filter((r) => r[10] === 'T').length;
    const pct = wajibRows.length > 0 ? (ada / wajibRows.length) * 100 : 0;

    // Group top jenis fasilitas
    const byJenis: Record<string, { jenis: string; ada: number; belum: number; tw: number }> = {};
    rows.forEach((r) => {
      const j = r[1] || 'Lainnya';
      if (!byJenis[j]) byJenis[j] = { jenis: j, ada: 0, belum: 0, tw: 0 };
      if (r[10] === 'A') byJenis[j].ada++;
      else if (r[10] === 'B') byJenis[j].belum++;
      else byJenis[j].tw++;
    });
    const jenisList = Object.values(byJenis).sort(
      (a, b) => b.ada + b.belum - (a.ada + a.belum)
    );

    return {
      total: rows.length,
      wajibCount: wajibRows.length,
      ada,
      belum,
      tidakWajib,
      pct,
      jenisList: jenisList.slice(0, 8),
    };
  }, [bysgu, qRange, tw]);

  const aparAmanPct = apar && apar.total > 0 ? (apar.perStatus.Aman / apar.total) * 100 : 0;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Ringkasan kinerja Unit Fasilitas (PROLIS, Kelayakan Kelas A, dan APAR){qRange ? ` · ${twLabelText(tw)}` : ''}
      </p>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <KpiCard
          title="Realisasi PROLIS"
          value={prolis ? fmtP(prolisSummary.pctReal) : '—'}
          subline={
            prolis
              ? `${fmtInt(prolisSummary.totalReal)} dari ${fmtInt(prolisSummary.totalProg)} jadwal`
              : 'Data PROLIS gagal dimuat'
          }
          pctForStatus={prolis ? prolisSummary.pctReal : undefined}
          showThresholdBar={Boolean(prolis)}
          onClick={() => onNavigate('fas_prolis')}
          footer={
            prolis && (
              <span className="text-slate-500 dark:text-slate-400">
                {fmtInt(prolisSummary.totalMesin)} mesin terdaftar
              </span>
            )
          }
        />

        <KpiCard
          title="Kondisi mesin baik"
          value={
            prolis
              ? fmtP(
                  prolisSummary.totalMesin > 0
                    ? (prolisSummary.baik / prolisSummary.totalMesin) * 100
                    : 0
                )
              : '—'
          }
          subline={
            prolis
              ? `${fmtInt(prolisSummary.baik)} baik · ${fmtInt(prolisSummary.rusak)} rusak · ${fmtInt(prolisSummary.afkir)} afkir`
              : '—'
          }
          pctForStatus={
            prolis && prolisSummary.totalMesin > 0
              ? (prolisSummary.baik / prolisSummary.totalMesin) * 100
              : undefined
          }
          onClick={() => onNavigate('fas_prolis')}
        />

        <KpiCard
          title="Kelayakan Kelas A"
          value={bysgu ? fmtP(bysguSummary.pct) : '—'}
          subline={
            bysgu
              ? `${fmtInt(bysguSummary.ada)} memenuhi dari ${fmtInt(bysguSummary.wajibCount)} wajib`
              : 'Data BY SGU gagal dimuat'
          }
          pctForStatus={bysgu ? bysguSummary.pct : undefined}
          showThresholdBar={Boolean(bysgu)}
          onClick={() => onNavigate('fas_kelayakan')}
          footer={
            bysgu && (
              <span className={bysguSummary.belum > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}>
                {fmtInt(bysguSummary.belum)} item belum tersedia
              </span>
            )
          }
        />

        <KpiCard
          title="APAR kondisi aman"
          value={apar ? fmtP(aparAmanPct) : '—'}
          subline={
            apar
              ? `${fmtInt(apar.perStatus.Aman)} aman dari ${fmtInt(apar.total)} unit`
              : 'Data APAR belum tersedia'
          }
          pctForStatus={apar ? aparAmanPct : undefined}
          showThresholdBar={Boolean(apar)}
          onClick={() => onNavigate('apar')}
          footer={
            apar && (
              <span className={apar.perStatus.Kadaluarsa > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600'}>
                {fmtInt(apar.perStatus.Kadaluarsa)} kadaluarsa · {fmtInt(apar.perStatus['Segera kadaluarsa'])} segera
              </span>
            )
          }
        />
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Kondisi mesin PROLIS</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Status pengecekan terakhir</p>
          </div>
          <DonutPanel
            centerValue={fmtInt(prolisSummary.totalMesin)}
            centerLabel="mesin"
            onSelect={() => onNavigate('fas_prolis')}
            segments={[
              { label: 'Baik', value: prolisSummary.baik, color: '#10B981' },
              { label: 'Rusak', value: prolisSummary.rusak, color: '#EF4444' },
              { label: 'Usulan Afkir', value: prolisSummary.afkir, color: '#F59E0B' },
              { label: 'Belum ada data', value: prolisSummary.kosong, color: '#94A3B8' },
            ]}
          />
        </div>

        <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Status APAR</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Kepatuhan masa berlaku APAR</p>
          </div>
          {apar ? (
            <DonutPanel
              centerValue={fmtInt(apar.total)}
              centerLabel="APAR"
              onSelect={() => onNavigate('apar')}
              segments={[
                { label: 'Aman', value: apar.perStatus.Aman, color: '#10B981' },
                { label: 'Segera kadaluarsa', value: apar.perStatus['Segera kadaluarsa'], color: '#F59E0B' },
                { label: 'Kadaluarsa', value: apar.perStatus.Kadaluarsa, color: '#EF4444' },
                { label: 'Tidak ada data', value: apar.perStatus['Tidak ada data'], color: '#94A3B8' },
              ]}
            />
          ) : (
            <p className="text-xs text-slate-400 py-10 text-center">Data APAR tidak tersedia.</p>
          )}
        </div>

        <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Perlu perhatian</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tindak lanjut cepat Unit Fasilitas</p>
          </div>
          <div className="space-y-2">
            {prolisSummary.rusak > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('fas_prolis')}
                className="w-full text-left rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 px-3 py-2.5 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>{prolisSummary.rusak}</strong> mesin dalam kondisi rusak ({prolisSummary.afkir} usulan afkir)
                  </span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            )}
            {bysguSummary.belum > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('fas_kelayakan')}
                className="w-full text-left rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>{bysguSummary.belum}</strong> item wajib Kelas A belum tersedia
                  </span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            )}
            {apar && (apar.perStatus.Kadaluarsa > 0 || apar.perStatus['Segera kadaluarsa'] > 0) && (
              <button
                type="button"
                onClick={() => onNavigate('apar')}
                className="w-full text-left rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 px-3 py-2.5 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>{apar.perStatus.Kadaluarsa}</strong> APAR kadaluarsa ·{' '}
                    <strong>{apar.perStatus['Segera kadaluarsa']}</strong> segera kadaluarsa
                  </span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Program vs realisasi PROLIS per bulan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Jumlah jadwal pemeliharaan dan realisasinya sepanjang tahun
            </p>
          </div>
          <ChartCanvas
            isDark={isDark}
            heightClass="h-56"
            deps={[prolisSummary.perBulanProg, prolisSummary.perBulanReal, twMask]}
            buildConfig={(_, dark) => ({
              type: 'bar',
              data: {
                labels: BLN_LABEL,
                datasets: [
                  {
                    label: 'Program',
                    data: prolisSummary.perBulanProg,
                    backgroundColor: BLN_LABEL.map((_, i) =>
                      !twMask[i] ? 'rgba(59, 130, 246, 0.2)' : '#3B82F6'
                    ),
                    borderRadius: 4,
                  },
                  {
                    label: 'Realisasi',
                    data: prolisSummary.perBulanReal,
                    backgroundColor: BLN_LABEL.map((_, i) =>
                      !twMask[i] ? 'rgba(16, 185, 129, 0.2)' : '#10B981'
                    ),
                    borderRadius: 4,
                  },
                ],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { color: dark ? '#94A3B8' : '#64748B', font: { size: 11 } } },
                },
                scales: {
                  x: { grid: { display: false }, ticks: { color: dark ? '#94A3B8' : '#64748B', font: { size: 11 } } },
                  y: {
                    beginAtZero: true,
                    grid: { color: dark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.06)' },
                    ticks: { color: dark ? '#94A3B8' : '#64748B', font: { size: 11 } },
                  },
                },
              },
            })}
          />
        </div>

        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Kelayakan Kelas A per jenis fasilitas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Perbandingan item memenuhi vs belum tersedia
            </p>
          </div>
          <ChartCanvas
            isDark={isDark}
            heightClass="h-56"
            deps={[bysguSummary.jenisList]}
            buildConfig={(_, dark) => ({
              type: 'bar',
              data: {
                labels: bysguSummary.jenisList.map((j) =>
                  j.jenis.length > 22 ? `${j.jenis.slice(0, 20)}…` : j.jenis
                ),
                datasets: [
                  { label: 'Ada / Memenuhi', data: bysguSummary.jenisList.map((j) => j.ada), backgroundColor: '#10B981', borderRadius: 3 },
                  { label: 'Belum Ada', data: bysguSummary.jenisList.map((j) => j.belum), backgroundColor: '#EF4444', borderRadius: 3 },
                  { label: 'Tidak Wajib', data: bysguSummary.jenisList.map((j) => j.tw), backgroundColor: '#94A3B8', borderRadius: 3 },
                ],
              },
              options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { color: dark ? '#94A3B8' : '#64748B', font: { size: 10 } } },
                },
                scales: {
                  x: {
                    stacked: true,
                    grid: { color: dark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.06)' },
                    ticks: { color: dark ? '#94A3B8' : '#64748B', font: { size: 10 } },
                  },
                  y: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { color: dark ? '#CBD5E1' : '#334155', font: { size: 10 } },
                  },
                },
              },
            })}
          />
        </div>
      </div>
    </div>
  );
};

/* ================================ 2. FASILITAS PROLIS ================================ */

interface FasilitasProlisProps {
  fasilitas: FasilitasData;
  isDark: boolean;
}

export const FasilitasProlisView: React.FC<FasilitasProlisProps> = ({ fasilitas, isDark }) => {
  const prolis = fasilitas.prolis;
  const [fTahun, setFTahun] = useState<string>(prolis ? String(prolis.tahun) : '__ALL__');
  const [fJenis, setFJenis] = useState<string>('__ALL__');
  const [fLok, setFLok] = useState<string>('__ALL__');
  const [fKond, setFKond] = useState<string>('__ALL__');

  const allRows = prolis?.rows || [];

  const filtered = useMemo(() => {
    return allRows.filter((r) => {
      if (fTahun !== '__ALL__' && String(r[1]) !== fTahun) return false;
      if (fJenis !== '__ALL__' && r[2] !== fJenis) return false;
      if (fLok !== '__ALL__' && r[5] !== fLok) return false;
      if (fKond !== '__ALL__' && latestKond(r) !== fKond) return false;
      return true;
    });
  }, [allRows, fTahun, fJenis, fLok, fKond]);

  const jenisOpts = useMemo(
    () => Array.from(new Set(allRows.map((r) => r[2]).filter(Boolean))).sort(),
    [allRows]
  );
  const lokOpts = useMemo(
    () => Array.from(new Set(allRows.map((r) => r[5]).filter(Boolean))).sort(),
    [allRows]
  );

  const stats = useMemo(() => {
    let prog = 0;
    let real = 0;
    let baik = 0;
    let rusak = 0;
    let afkir = 0;
    const perBulanProg = new Array(12).fill(0);
    const perBulanReal = new Array(12).fill(0);
    const byJenis: Record<string, { jenis: string; B: number; R: number; A: number; none: number }> = {};

    filtered.forEach((r) => {
      const k = latestKond(r);
      if (k === 'B') baik++;
      else if (k === 'R') rusak++;
      else if (k === 'A') afkir++;

      const j = r[2] || 'Lainnya';
      if (!byJenis[j]) byJenis[j] = { jenis: j, B: 0, R: 0, A: 0, none: 0 };
      if (k === 'B') byJenis[j].B++;
      else if (k === 'R') byJenis[j].R++;
      else if (k === 'A') byJenis[j].A++;
      else byJenis[j].none++;

      for (let m = 0; m < 12; m++) {
        if (r[8][m]) {
          prog++;
          perBulanProg[m]++;
        }
        if (r[9][m] === '1') {
          real++;
          perBulanReal[m]++;
        }
      }
    });

    const topJenis = Object.values(byJenis)
      .sort((a, b) => b.B + b.R + b.A + b.none - (a.B + a.R + a.A + a.none))
      .slice(0, 12);

    return { prog, real, baik, rusak, afkir, perBulanProg, perBulanReal, topJenis };
  }, [filtered]);

  if (!prolis) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
        Data PROLIS tidak tersedia atau gagal dibuka.
      </div>
    );
  }

  const columns: DataTableColumn<ProlisRow>[] = [
    {
      key: 'no',
      header: 'No',
      align: 'center',
      sortValue: (r) => Number(r[0]) || 0,
      render: (r) => <span className="tabular-nums text-slate-500">{r[0] || '—'}</span>,
    },
    {
      key: 'mesin',
      header: 'No. Mesin',
      sortValue: (r) => r[4],
      render: (r) => <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">{r[4] || '—'}</span>,
    },
    {
      key: 'jenis',
      header: 'Jenis Mesin',
      sortValue: (r) => r[2],
      render: (r) => <span className="font-medium">{r[2] || '—'}</span>,
    },
    {
      key: 'spes',
      header: 'Spesifikasi',
      sortValue: (r) => r[3],
      render: (r) => <span className="text-slate-600 dark:text-slate-300 line-clamp-2 max-w-xs">{r[3] || '—'}</span>,
    },
    {
      key: 'lok',
      header: 'Lokasi',
      sortValue: (r) => r[5],
      render: (r) => <span>{r[5] || '—'}</span>,
    },
    {
      key: 'jadwal',
      header: 'Prog / Real',
      align: 'center',
      render: (r) => {
        const p = r[8].filter(Boolean).length;
        const rl = r[9].split('').filter((c) => c === '1').length;
        return (
          <span className="tabular-nums font-medium">
            {rl}/{p} bln
          </span>
        );
      },
    },
    {
      key: 'kond',
      header: 'Kondisi Terakhir',
      sortValue: (r) => latestKond(r),
      render: (r) => {
        const k = latestKond(r);
        return (
          <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${kondBadgeClass(k)}`}>
            {kondLabel(k)}
          </span>
        );
      },
    },
    {
      key: 'dok',
      header: 'Dokumentasi',
      render: (r) =>
        r[6] && /^https?:\/\//i.test(r[6]) ? (
          <a
            href={r[6]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Buka <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <KpiCard title="Jumlah mesin" value={fmtInt(filtered.length)} subline={`Tahun ${fTahun === '__ALL__' ? 'Semua' : fTahun}`} accentColor="blue" />
        <KpiCard
          title="Realisasi pemeliharaan"
          value={fmtP(stats.prog > 0 ? (stats.real / stats.prog) * 100 : 0)}
          subline={`${fmtInt(stats.real)} dari ${fmtInt(stats.prog)} jadwal bulanan`}
          pctForStatus={stats.prog > 0 ? (stats.real / stats.prog) * 100 : 0}
        />
        <KpiCard
          title="Kondisi mesin"
          value={`${fmtInt(stats.baik)} Baik`}
          subline={`${fmtInt(stats.rusak)} rusak · ${fmtInt(stats.afkir)} usulan afkir`}
          accentColor={stats.rusak > 0 ? 'amber' : 'emerald'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Program vs realisasi per bulan
          </h3>
          <ChartCanvas
            isDark={isDark}
            heightClass="h-56"
            deps={[stats.perBulanProg, stats.perBulanReal]}
            buildConfig={(_, dark) => ({
              type: 'bar',
              data: {
                labels: BLN_LABEL,
                datasets: [
                  { label: 'Program', data: stats.perBulanProg, backgroundColor: '#3B82F6', borderRadius: 4 },
                  { label: 'Realisasi', data: stats.perBulanReal, backgroundColor: '#10B981', borderRadius: 4 },
                ],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: dark ? '#94A3B8' : '#64748B', font: { size: 11 } } } },
                scales: {
                  x: { grid: { display: false }, ticks: { color: dark ? '#94A3B8' : '#64748B', font: { size: 11 } } },
                  y: { beginAtZero: true, grid: { color: dark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.06)' }, ticks: { color: dark ? '#94A3B8' : '#64748B', font: { size: 11 } } },
                },
              },
            })}
          />
        </div>

        <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Kondisi per jenis mesin (Top 12)
          </h3>
          <ChartCanvas
            isDark={isDark}
            heightClass="h-56"
            deps={[stats.topJenis]}
            buildConfig={(_, dark) => ({
              type: 'bar',
              data: {
                labels: stats.topJenis.map((t) => (t.jenis.length > 22 ? `${t.jenis.slice(0, 20)}…` : t.jenis)),
                datasets: [
                  { label: 'Baik', data: stats.topJenis.map((t) => t.B), backgroundColor: '#10B981' },
                  { label: 'Rusak', data: stats.topJenis.map((t) => t.R), backgroundColor: '#EF4444' },
                  { label: 'Afkir', data: stats.topJenis.map((t) => t.A), backgroundColor: '#F59E0B' },
                  { label: 'Belum ada', data: stats.topJenis.map((t) => t.none), backgroundColor: '#94A3B8' },
                ],
              },
              options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: dark ? '#94A3B8' : '#64748B', font: { size: 10 } } } },
                scales: {
                  x: { stacked: true, grid: { color: dark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.06)' }, ticks: { color: dark ? '#94A3B8' : '#64748B', font: { size: 10 } } },
                  y: { stacked: true, grid: { display: false }, ticks: { color: dark ? '#CBD5E1' : '#334155', font: { size: 10 } } },
                },
              },
            })}
          />
        </div>
      </div>

      <DataTable
        title="Daftar mesin & peralatan (PROLIS)"
        rows={filtered}
        columns={columns}
        searchPlaceholder="Cari nomor mesin, jenis, spesifikasi, atau lokasi..."
        searchPredicate={(r, q) => [r[2], r[3], r[4], r[5]].some((c) => c.toLowerCase().includes(q))}
        filters={[
          {
            id: 'tahun',
            label: 'Tahun',
            options: prolis.tahunList.map(String),
            value: fTahun,
            onChange: setFTahun,
            matches: (r, v) => String(r[1]) === v,
          },
          {
            id: 'jenis',
            label: 'Jenis',
            options: jenisOpts,
            value: fJenis,
            onChange: setFJenis,
            matches: (r, v) => r[2] === v,
          },
          {
            id: 'lok',
            label: 'Lokasi',
            options: lokOpts,
            value: fLok,
            onChange: setFLok,
            matches: (r, v) => r[5] === v,
          },
          {
            id: 'kond',
            label: 'Kondisi',
            options: ['B', 'R', 'A', '-'],
            value: fKond,
            onChange: setFKond,
            matches: (r, v) => latestKond(r) === v,
          },
        ]}
        pageSize={25}
      />
    </div>
  );
};

/* ================================ 3. FASILITAS KELAYAKAN KELAS A ================================ */

interface FasilitasKelayakanProps {
  fasilitas: FasilitasData;
  isDark: boolean;
}

export const FasilitasKelayakanView: React.FC<FasilitasKelayakanProps> = ({ fasilitas, isDark }) => {
  const bysgu = fasilitas.bysgu;
  const [fTahun, setFTahun] = useState<string>(bysgu ? String(bysgu.tahun) : '__ALL__');
  const [fJenis, setFJenis] = useState<string>('__ALL__');
  const [fTw, setFTw] = useState<string>('__ALL__');
  const [fStatus, setFStatus] = useState<string>('__ALL__');

  const allRows = bysgu?.rows || [];

  const filtered = useMemo(() => {
    return allRows.filter((r) => {
      if (fTahun !== '__ALL__' && String(r[6]) !== fTahun) return false;
      if (fJenis !== '__ALL__' && r[1] !== fJenis) return false;
      if (fTw !== '__ALL__' && `TW ${r[5]}` !== fTw) return false;
      if (fStatus !== '__ALL__') {
        const label = r[10] === 'A' ? 'Ada / Memenuhi' : r[10] === 'B' ? 'Belum Ada (Wajib)' : 'Tidak Wajib';
        if (label !== fStatus) return false;
      }
      return true;
    });
  }, [allRows, fTahun, fJenis, fTw, fStatus]);

  const stats = useMemo(() => {
    const wajib = filtered.filter((r) => r[7] === 1);
    const ada = wajib.filter((r) => r[10] === 'A').length;
    const belum = wajib.filter((r) => r[10] === 'B').length;
    const tidakWajib = filtered.filter((r) => r[10] === 'T').length;
    const pct = wajib.length > 0 ? (ada / wajib.length) * 100 : 0;

    const map: Record<string, { jenis: string; A: number; B: number; T: number }> = {};
    filtered.forEach((r) => {
      const j = r[1] || 'Lainnya';
      if (!map[j]) map[j] = { jenis: j, A: 0, B: 0, T: 0 };
      map[j][r[10]]++;
    });
    const perJenis = Object.values(map).sort((a, b) => b.A + b.B + b.T - (a.A + a.B + a.T));

    return { total: filtered.length, wajibCount: wajib.length, ada, belum, tidakWajib, pct, perJenis };
  }, [filtered]);

  if (!bysgu) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
        Data Kelayakan Kelas A (BY SGU) tidak tersedia atau gagal dibuka.
      </div>
    );
  }

  const jenisOpts = Array.from(new Set(allRows.map((r) => r[1]).filter(Boolean))).sort();
  const hasFilter = fTahun !== String(bysgu.tahun) || fJenis !== '__ALL__' || fTw !== '__ALL__' || fStatus !== '__ALL__';

  const columns: DataTableColumn<BysguRow>[] = [
    {
      key: 'no',
      header: 'No',
      align: 'center',
      sortValue: (r) => Number(r[0]) || 0,
      render: (r) => <span className="tabular-nums text-slate-500">{r[0] || '—'}</span>,
    },
    {
      key: 'jenis',
      header: 'Jenis Fasilitas',
      sortValue: (r) => r[1],
      render: (r) => <span className="font-medium">{r[1] || '—'}</span>,
    },
    {
      key: 'fas',
      header: 'Fasilitas',
      sortValue: (r) => r[2],
      render: (r) => <span>{r[2] || '—'}</span>,
    },
    {
      key: 'item',
      header: 'Item',
      sortValue: (r) => r[3],
      render: (r) => <span className="font-semibold text-slate-900 dark:text-slate-100">{r[3] || '—'}</span>,
    },
    {
      key: 'pers',
      header: 'Persyaratan',
      sortValue: (r) => r[4],
      render: (r) => <span className="text-slate-600 dark:text-slate-300 line-clamp-2 max-w-xs">{r[4] || '—'}</span>,
    },
    {
      key: 'tw',
      header: 'TW',
      align: 'center',
      sortValue: (r) => r[5],
      render: (r) => <span className="tabular-nums">{r[5] ? `TW ${r[5]}` : '—'}</span>,
    },
    {
      key: 'eks',
      header: 'Eksisting',
      align: 'right',
      sortValue: (r) => r[8],
      render: (r) => <span className="tabular-nums font-medium">{fmtInt(r[8])}</span>,
    },
    {
      key: 'ket',
      header: 'Keterangan',
      sortValue: (r) => r[9],
      render: (r) => <span className="text-slate-500">{r[9] || '—'}</span>,
    },
    {
      key: 'st',
      header: 'Status',
      sortValue: (r) => r[10],
      render: (r) => {
        const cls =
          r[10] === 'A'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60'
            : r[10] === 'B'
            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60'
            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        const lbl = r[10] === 'A' ? 'Ada / Memenuhi' : r[10] === 'B' ? 'Belum Ada (Wajib)' : 'Tidak Wajib';
        return <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${cls}`}>{lbl}</span>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <KpiCard title="Persentase kelayakan" value={fmtP(stats.pct)} subline={`${fmtInt(stats.ada)} dari ${fmtInt(stats.wajibCount)} item wajib`} pctForStatus={stats.pct} showThresholdBar />
        <KpiCard title="Memenuhi syarat" value={fmtInt(stats.ada)} subline="Item wajib berstatus Ada" accentColor="emerald" />
        <KpiCard title="Belum tersedia" value={fmtInt(stats.belum)} subline="Wajib Kelas A perlu pemenuhan" accentColor="rose" />
        <KpiCard title="Tidak wajib" value={fmtInt(stats.tidakWajib)} subline={`Dari ${fmtInt(stats.total)} item tercatat`} accentColor="neutral" />
      </div>

      {hasFilter && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/30 px-3.5 py-2 text-xs">
          <span className="font-semibold text-blue-700 dark:text-blue-300">Filter aktif</span>
          {fJenis !== '__ALL__' && (
            <button
              type="button"
              onClick={() => setFJenis('__ALL__')}
              className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-slate-800 border border-blue-200 px-2 py-0.5"
            >
              Jenis: {fJenis} <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setFTahun(String(bysgu.tahun));
              setFJenis('__ALL__');
              setFTw('__ALL__');
              setFStatus('__ALL__');
            }}
            className="ml-auto inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-300 hover:underline"
          >
            <RotateCcw className="w-3 h-3" /> Reset filter
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Kelayakan per jenis fasilitas
        </h3>
        <ChartCanvas
          isDark={isDark}
          heightClass="h-60"
          deps={[stats.perJenis]}
          buildConfig={(_, dark) => ({
            type: 'bar',
            data: {
              labels: stats.perJenis.map((j) => (j.jenis.length > 26 ? `${j.jenis.slice(0, 24)}…` : j.jenis)),
              datasets: [
                { label: 'Ada / Memenuhi', data: stats.perJenis.map((j) => j.A), backgroundColor: '#10B981' },
                { label: 'Belum Ada (Wajib)', data: stats.perJenis.map((j) => j.B), backgroundColor: '#EF4444' },
                { label: 'Tidak Wajib', data: stats.perJenis.map((j) => j.T), backgroundColor: '#94A3B8' },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom', labels: { color: dark ? '#94A3B8' : '#64748B', font: { size: 11 } } } },
              scales: {
                x: { stacked: true, grid: { display: false }, ticks: { color: dark ? '#94A3B8' : '#64748B', font: { size: 10 } } },
                y: { stacked: true, beginAtZero: true, grid: { color: dark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.06)' }, ticks: { color: dark ? '#94A3B8' : '#64748B', font: { size: 11 } } },
              },
            },
          })}
        />
      </div>

      <DataTable
        title="Daftar persyaratan & kondisi eksisting (BY SGU)"
        rows={filtered}
        columns={columns}
        searchPlaceholder="Cari jenis fasilitas, item, persyaratan, atau keterangan..."
        searchPredicate={(r, q) => [r[1], r[2], r[3], r[4], r[9]].some((c) => c.toLowerCase().includes(q))}
        filters={[
          {
            id: 'tahun',
            label: 'Tahun',
            options: bysgu.tahunList.map(String),
            value: fTahun,
            onChange: setFTahun,
            matches: (r, v) => String(r[6]) === v,
          },
          {
            id: 'jenis',
            label: 'Jenis Fasilitas',
            options: jenisOpts,
            value: fJenis,
            onChange: setFJenis,
            matches: (r, v) => r[1] === v,
          },
          {
            id: 'tw',
            label: 'TW',
            options: ['TW 1', 'TW 2', 'TW 3', 'TW 4'],
            value: fTw,
            onChange: setFTw,
            matches: (r, v) => `TW ${r[5]}` === v,
          },
          {
            id: 'status',
            label: 'Status',
            options: ['Ada / Memenuhi', 'Belum Ada (Wajib)', 'Tidak Wajib'],
            value: fStatus,
            onChange: setFStatus,
            matches: (r, v) =>
              (r[10] === 'A' ? 'Ada / Memenuhi' : r[10] === 'B' ? 'Belum Ada (Wajib)' : 'Tidak Wajib') === v,
          },
        ]}
        pageSize={25}
      />
    </div>
  );
};
