import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import type { Plugin } from 'chart.js';
import { KpiCard } from '../ui/KpiCard';
import { MotionCard, MotionStaggerGrid } from '../ui/MotionPrimitives';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import { DonutPanel } from '../charts/DonutPanel';
import { ChartCanvas } from '../charts/ChartCanvas';
import {
  BLN_LABEL,
  TIPE_COLORS,
  fmtInt,
  fmtM,
  fmtP,
  fmtRp,
  katBadgeClass,
  rpOrDash,
  twBulanMask,
  twLabelText,
  twRange,
} from '../../utils/formatters';
import type { PengadaanData, PengadaanRow, TriwulanType } from '../../types/dashboard';

interface PengadaanViewProps {
  pengadaan: PengadaanData | null;
  tahun: number;
  tw: TriwulanType;
  isDark: boolean;
  initialKategori?: string | null;
}

export const PengadaanView: React.FC<PengadaanViewProps> = ({
  pengadaan,
  tahun,
  tw,
  isDark,
  initialKategori,
}) => {
  const [fKat, setFKat] = useState<string | null>(initialKategori || null);
  const [fTipe, setFTipe] = useState<string | null>(null);
  const [fBulan, setFBulan] = useState<number | null>(null);
  const [fVendor, setFVendor] = useState<string | null>(null);
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorSortBy, setVendorSortBy] = useState<'nilai' | 'dok' | 'selesai'>('nilai');

  useEffect(() => {
    if (initialKategori) setFKat(initialKategori);
  }, [initialKategori]);

  const qRange = twRange(tw);
  const twMask = useMemo(() => twBulanMask(tw), [tw]);

  const baseRows = useMemo(() => {
    if (!pengadaan) return [];
    if (!qRange) return pengadaan.rows;
    return pengadaan.rows.filter((r) => r[10] >= qRange[0] && r[10] <= qRange[1]);
  }, [pengadaan, qRange]);

  const filteredRows = useMemo(() => {
    return baseRows.filter((r) => {
      if (fKat && r[9] !== fKat) return false;
      if (fTipe && (r[3] || '(belum diisi)').toUpperCase() !== fTipe) return false;
      if (fBulan && r[10] !== fBulan) return false;
      if (fVendor && (r[4] || '(belum ada vendor)') !== fVendor) return false;
      return true;
    });
  }, [baseRows, fKat, fTipe, fBulan, fVendor]);

  const summary = useMemo(() => {
    const src = baseRows;
    const total = src.length;
    const selesai = src.filter((r) => r[9] === 'Selesai').length;
    const proses = src.filter((r) => r[9] === 'Dalam Proses').length;
    const gagal = src.filter((r) => r[9] === 'Gagal/Batal').length;
    const nilai = filteredRows.reduce((s, r) => s + r[5], 0);
    return {
      total,
      selesai,
      proses,
      gagal,
      pctSelesai: total > 0 ? (selesai / total) * 100 : 0,
      nilai,
    };
  }, [baseRows, filteredRows]);

  const tipeAgg = useMemo(() => {
    const cnt: Record<string, number> = {};
    const val: Record<string, number> = {};
    baseRows.forEach((r) => {
      if (fKat && r[9] !== fKat) return;
      if (fBulan && r[10] !== fBulan) return;
      const t = (r[3] || '(belum diisi)').toUpperCase();
      cnt[t] = (cnt[t] || 0) + 1;
      val[t] = (val[t] || 0) + r[5];
    });
    const keys = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]);
    return {
      totalCnt: keys.reduce((s, k) => s + cnt[k], 0),
      totalVal: keys.reduce((s, k) => s + val[k], 0),
      countSegs: keys.map((k) => ({
        label: k,
        value: cnt[k],
        color: TIPE_COLORS[k] || '#6366F1',
        detailText: `${fmtInt(cnt[k])}`,
      })),
      valueSegs: keys
        .filter((k) => val[k] > 0)
        .map((k) => ({
          label: k,
          value: val[k],
          color: TIPE_COLORS[k] || '#6366F1',
          detailText: fmtM(val[k]),
        })),
    };
  }, [baseRows, fKat, fBulan]);

  const monthlyCounts = useMemo(() => {
    const arr = new Array(12).fill(0);
    baseRows.forEach((r) => {
      if (fKat && r[9] !== fKat) return;
      if (fTipe && (r[3] || '(belum diisi)').toUpperCase() !== fTipe) return;
      if (r[10] >= 1 && r[10] <= 12) arr[r[10] - 1]++;
    });
    return arr;
  }, [baseRows, fKat, fTipe]);

  const vendorStats = useMemo(() => {
    const map: Record<string, { vendor: string; dok: number; selesai: number; proses: number; gagal: number; nilai: number }> =
      {};
    baseRows.forEach((r) => {
      if (fKat && r[9] !== fKat) return;
      if (fTipe && (r[3] || '(belum diisi)').toUpperCase() !== fTipe) return;
      if (fBulan && r[10] !== fBulan) return;
      const v = r[4] || '(belum ada vendor)';
      if (!map[v]) map[v] = { vendor: v, dok: 0, selesai: 0, proses: 0, gagal: 0, nilai: 0 };
      map[v].dok++;
      if (r[9] === 'Selesai') map[v].selesai++;
      else if (r[9] === 'Dalam Proses') map[v].proses++;
      else map[v].gagal++;
      map[v].nilai += r[5];
    });
    const q = vendorSearch.trim().toLowerCase();
    return Object.values(map)
      .filter((v) => !q || v.vendor.toLowerCase().includes(q))
      .sort((a, b) => {
        if (vendorSortBy === 'dok') return b.dok - a.dok;
        if (vendorSortBy === 'selesai') return b.selesai - a.selesai;
        return b.nilai - a.nilai;
      });
  }, [baseRows, fKat, fTipe, fBulan, vendorSearch, vendorSortBy]);

  if (!pengadaan) {
    return (
      <div className="rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] p-8 text-center text-sm text-slate-500 dark:text-[#9CA8AA]">
        Data pengadaan tidak tersedia di spreadsheet tahun {tahun}.
      </div>
    );
  }

  const hasFilter = Boolean(fKat || fTipe || fBulan || fVendor);
  const resetFilters = () => {
    setFKat(null);
    setFTipe(null);
    setFBulan(null);
    setFVendor(null);
  };

  const columns: DataTableColumn<PengadaanRow>[] = [
    {
      key: 'no',
      header: 'No Dok',
      sortValue: (r) => r[0],
      render: (r) => <span className="font-mono-num text-slate-500">{r[0] || '—'}</span>,
    },
    {
      key: 'desk',
      header: 'Deskripsi Pekerjaan',
      sortValue: (r) => r[1],
      render: (r) => <span className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2 max-w-md">{r[1]}</span>,
    },
    {
      key: 'ci',
      header: 'CI',
      sortValue: (r) => r[2],
      render: (r) => <span className="text-slate-500 dark:text-slate-400 text-[11px]">{r[2] || '—'}</span>,
    },
    {
      key: 'tipe',
      header: 'Tipe',
      sortValue: (r) => r[3],
      render: (r) => <span className="font-medium">{r[3] || '—'}</span>,
    },
    {
      key: 'vendor',
      header: 'Vendor',
      sortValue: (r) => r[4],
      render: (r) => <span className="text-slate-700 dark:text-slate-200">{r[4] || '—'}</span>,
    },
    {
      key: 'nilai',
      header: 'Nilai SPK/Kontrak',
      align: 'right',
      sortValue: (r) => r[5],
      render: (r) => <span className="font-semibold tabular-nums whitespace-nowrap">{rpOrDash(r[5])}</span>,
    },
    {
      key: 'tgl',
      header: 'Tanggal',
      sortValue: (r) => r[6],
      render: (r) => <span className="tabular-nums whitespace-nowrap text-slate-500">{r[6] || '—'}</span>,
    },
    {
      key: 'pos',
      header: 'Posisi Berkas',
      sortValue: (r) => r[7],
      render: (r) => <span className="text-slate-500 dark:text-slate-400">{r[7] || '—'}</span>,
    },
    {
      key: 'st',
      header: 'Status',
      sortValue: (r) => r[8],
      render: (r) => <span className="text-slate-600 dark:text-slate-300">{r[8] || '—'}</span>,
    },
    {
      key: 'kat',
      header: 'Kategori',
      sortValue: (r) => r[9],
      render: (r) => (
        <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${katBadgeClass(r[9])}`}>
          {r[9]}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {/* 5 Interactive KPI Cards */}
      <MotionStaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard
          title="Total dokumen"
          value={fmtInt(summary.total)}
          subline={`SPK / UMDS / kontrak${qRange ? ` · ${twLabelText(tw)}` : ''}`}
          accentColor="blue"
          active={!fKat}
          onClick={() => setFKat(null)}
        />
        <KpiCard
          title="Selesai"
          value={fmtInt(summary.selesai)}
          subline={`${fmtP(summary.pctSelesai)} dari total · klik untuk filter`}
          accentColor="emerald"
          active={fKat === 'Selesai'}
          onClick={() => setFKat((cur) => (cur === 'Selesai' ? null : 'Selesai'))}
        />
        <KpiCard
          title="Dalam proses"
          value={fmtInt(summary.proses)}
          subline="Klik untuk filter"
          accentColor="amber"
          active={fKat === 'Dalam Proses'}
          onClick={() => setFKat((cur) => (cur === 'Dalam Proses' ? null : 'Dalam Proses'))}
        />
        <KpiCard
          title="Gagal / batal"
          value={fmtInt(summary.gagal)}
          subline="Klik untuk filter"
          accentColor="rose"
          active={fKat === 'Gagal/Batal'}
          onClick={() => setFKat((cur) => (cur === 'Gagal/Batal' ? null : 'Gagal/Batal'))}
        />
        <KpiCard
          title="Total nilai SPK/kontrak"
          value={fmtM(summary.nilai)}
          subline={fmtRp(summary.nilai)}
          accentColor="blue"
        />
      </MotionStaggerGrid>

      {/* Active Filter Chips */}
      {hasFilter && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#C69320]/40 dark:border-[#D4AF37]/40 bg-[#FBF5E4]/85 dark:bg-[#142226] px-3.5 py-2 text-xs">
          <span className="font-bold text-[#855C0D] dark:text-[#F5DFA0]">Filter aktif:</span>
          {fKat && (
            <button
              type="button"
              onClick={() => setFKat(null)}
              className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-[#0D1619] border border-[#DCD4C0] dark:border-[#23353B] px-2 py-0.5 font-semibold text-slate-800 dark:text-[#F4EFE4] cursor-pointer"
            >
              Status: {fKat} <X className="w-3 h-3" />
            </button>
          )}
          {fTipe && (
            <button
              type="button"
              onClick={() => setFTipe(null)}
              className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-[#0D1619] border border-[#DCD4C0] dark:border-[#23353B] px-2 py-0.5 font-semibold text-slate-800 dark:text-[#F4EFE4] cursor-pointer"
            >
              Tipe: {fTipe} <X className="w-3 h-3" />
            </button>
          )}
          {fBulan && (
            <button
              type="button"
              onClick={() => setFBulan(null)}
              className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-[#0D1619] border border-[#DCD4C0] dark:border-[#23353B] px-2 py-0.5 font-semibold text-slate-800 dark:text-[#F4EFE4] cursor-pointer"
            >
              Bulan: {BLN_LABEL[fBulan - 1]} <X className="w-3 h-3" />
            </button>
          )}
          {fVendor && (
            <button
              type="button"
              onClick={() => setFVendor(null)}
              className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-[#0D1619] border border-[#DCD4C0] dark:border-[#23353B] px-2 py-0.5 font-semibold text-slate-800 dark:text-[#F4EFE4] cursor-pointer"
            >
              Vendor: {fVendor} <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto inline-flex items-center gap-1 font-bold text-[#8E6510] dark:text-[#E6C45A] hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Reset filter
          </button>
        </div>
      )}

      {/* Middle Charts Row */}
      <MotionStaggerGrid className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <MotionCard className="lg:col-span-5 rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] p-3.5 flex flex-col">
          <div className="mb-2 shrink-0">
            <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">Komposisi tipe pengadaan</h3>
            <p className="text-xs text-slate-500 dark:text-[#9CA8AA] mt-0.5">
              Klik tipe atau segmen untuk menyaring data
            </p>
          </div>
          <div className="flex-1 flex flex-col">
            <DonutPanel
              size={180}
              centerValue={fmtInt(tipeAgg.totalCnt)}
              centerLabel="dokumen"
              activeLabel={fTipe}
              onSelect={(lbl) => setFTipe((cur) => (cur === lbl ? null : lbl))}
              segments={tipeAgg.countSegs}
            />
          </div>
        </MotionCard>

        <MotionCard className="lg:col-span-7 rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] p-3.5 flex flex-col">
          <div className="mb-2 shrink-0">
            <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">
              Total Pengadaan per Bulan {tahun}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#9CA8AA] mt-0.5">
              Jumlah dokumen berdasarkan bulan UMDS, SPK/kontrak. Klik batang bulan untuk menyaring.
            </p>
          </div>
          <ChartCanvas
            isDark={isDark}
            heightClass="flex-1 min-h-[250px]"
            deps={[monthlyCounts, fBulan, twMask]}
            buildConfig={(_, dark) => {
              const labelPlugin: Plugin<'bar'> = {
                id: 'barTopLabels',
                afterDatasetsDraw(chart) {
                  const meta = chart.getDatasetMeta(0);
                  const c = chart.ctx;
                  c.save();
                  c.font = '700 11px "Plus Jakarta Sans", sans-serif';
                  c.fillStyle = dark ? '#E5DFD0' : '#1E293B';
                  c.textAlign = 'center';
                  meta.data.forEach((bar, i) => {
                    const val = monthlyCounts[i];
                    if (val > 0) c.fillText(String(val), bar.x, bar.y - 6);
                  });
                  c.restore();
                },
              };

              return {
                type: 'bar',
                data: {
                  labels: BLN_LABEL,
                  datasets: [
                    {
                      label: 'Dokumen',
                      data: monthlyCounts,
                      backgroundColor: BLN_LABEL.map((_, i) => {
                        const m = i + 1;
                        if (fBulan === m) return '#E55A1B';
                        if (!twMask[i] || (fBulan && fBulan !== m)) {
                          return dark ? 'rgba(212, 175, 55, 0.22)' : 'rgba(184, 139, 40, 0.22)';
                        }
                        return dark ? '#D4AF37' : '#B88B28';
                      }),
                      borderRadius: 6,
                      maxBarThickness: 42,
                    },
                  ],
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  onClick: (_evt: unknown, elements: Array<{ index: number }>) => {
                    if (elements.length > 0) {
                      const m = elements[0].index + 1;
                      setFBulan((cur) => (cur === m ? null : m));
                    }
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (item: { parsed: { y: number | null } }) => ` ${fmtInt(item.parsed.y)} dokumen`,
                      },
                    },
                  },
                  layout: { padding: { top: 18, right: 4, bottom: 0, left: 0 } },
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
                plugins: [labelPlugin],
              };
            }}
          />
        </MotionCard>
      </MotionStaggerGrid>

      {/* Bottom 2-column Row: Nilai per Tipe + Kategori Vendor */}
      <MotionStaggerGrid className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <MotionCard className="lg:col-span-5 rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] p-3.5 flex flex-col">
          <div className="mb-2 shrink-0">
            <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">Nilai per tipe pengadaan</h3>
            <p className="text-xs text-slate-500 dark:text-[#9CA8AA] mt-0.5">
              Akumulasi nilai kontrak per jenis dokumen
            </p>
          </div>
          <div className="flex-1 flex flex-col">
            <DonutPanel
              size={180}
              centerValue={fmtM(tipeAgg.totalVal)}
              centerLabel="total nilai"
              activeLabel={fTipe}
              onSelect={(lbl) => setFTipe((cur) => (cur === lbl ? null : lbl))}
              segments={tipeAgg.valueSegs}
            />
          </div>
        </MotionCard>

        <MotionCard className="lg:col-span-7 rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[#E5DFD0] dark:border-[#1D2D32] flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">Kategori Vendor</h3>
              <p className="text-xs text-slate-500 dark:text-[#9CA8AA]">
                Klik baris vendor untuk memfilter daftar dokumen di bawah
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={vendorSearch}
                onChange={(e) => setVendorSearch(e.target.value)}
                placeholder="Cari nama vendor..."
                className="rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-[#FAF8F2] dark:bg-[#111D21] px-2.5 py-1 text-xs w-44 text-slate-900 dark:text-[#F4EFE4] focus:outline-none focus:ring-2 focus:ring-[#C69320]/30"
              />
              <span className="text-xs text-slate-500 dark:text-[#8E9B9E] tabular-nums">{vendorStats.length} vendor</span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-72 flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#FAF8F2] dark:bg-[#111D21] border-b border-[#E5DFD0] dark:border-[#1D2D32] text-[11px] uppercase tracking-wider text-slate-500 dark:text-[#9CA8AA]">
                <tr>
                  <th className="px-3.5 py-2 font-bold">Vendor</th>
                  <th
                    className="px-3 py-2 text-right font-bold cursor-pointer hover:text-[#A67C21] dark:hover:text-[#E6C45A]"
                    onClick={() => setVendorSortBy('dok')}
                  >
                    Dokumen {vendorSortBy === 'dok' ? '▼' : ''}
                  </th>
                  <th
                    className="px-3 py-2 text-right font-bold cursor-pointer hover:text-[#A67C21] dark:hover:text-[#E6C45A]"
                    onClick={() => setVendorSortBy('selesai')}
                  >
                    Selesai {vendorSortBy === 'selesai' ? '▼' : ''}
                  </th>
                  <th className="px-3 py-2 text-right font-bold">Proses</th>
                  <th className="px-3 py-2 text-right font-bold">Gagal</th>
                  <th
                    className="px-3.5 py-2 text-right font-bold cursor-pointer hover:text-[#A67C21] dark:hover:text-[#E6C45A]"
                    onClick={() => setVendorSortBy('nilai')}
                  >
                    Nilai {vendorSortBy === 'nilai' ? '▼' : ''}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEAE0] dark:divide-[#19282D] text-xs">
                {vendorStats.slice(0, 50).map((v) => {
                  const active = fVendor === v.vendor;
                  return (
                    <tr
                      key={v.vendor}
                      onClick={() => setFVendor((cur) => (cur === v.vendor ? null : v.vendor))}
                      className={`cursor-pointer transition ${
                        active
                          ? 'bg-[#FBF5E4] dark:bg-[#D4AF37]/15 font-semibold'
                          : 'hover:bg-[#FAF8F2] dark:hover:bg-[#121E22]'
                      }`}
                    >
                      <td className="px-3.5 py-2 text-slate-800 dark:text-slate-100">{v.vendor}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{v.dok}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        {v.selesai}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-amber-600 dark:text-amber-400">
                        {v.proses}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-rose-600 dark:text-rose-400">
                        {v.gagal}
                      </td>
                      <td className="px-3.5 py-2 text-right tabular-nums font-medium">{fmtRp(v.nilai)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </MotionCard>
      </MotionStaggerGrid>

      {/* Main Document Table */}
      <DataTable
        title="Daftar pengadaan / Jasa"
        subtitle="Klik judul kolom untuk mengurutkan. Tabel ini mengikuti semua filter di atas."
        rows={filteredRows}
        columns={columns}
        searchPlaceholder="Cari nomor dokumen, deskripsi, vendor, atau posisi berkas..."
        searchPredicate={(r, q) =>
          [r[0], r[1], r[2], r[3], r[4], r[7], r[8]].some((c) => c.toLowerCase().includes(q))
        }
        pageSize={25}
      />
    </div>
  );
};
