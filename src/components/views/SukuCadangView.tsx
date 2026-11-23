import React, { useMemo, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { KpiCard } from '../ui/KpiCard';
import { MotionCard, MotionStaggerGrid } from '../ui/MotionPrimitives';
import { DataTable, type DataTableColumn, type DataTableFilter } from '../ui/DataTable';
import { ChartCanvas } from '../charts/ChartCanvas';
import { fmtInt, fmtM, fmtRp } from '../../utils/formatters';
import type { SukuCadangData, SukuCadangRow } from '../../types/dashboard';

interface SukuCadangViewProps {
  sukuCadang: SukuCadangData | null;
  tahun: number;
  isDark: boolean;
}

export const SukuCadangView: React.FC<SukuCadangViewProps> = ({ sukuCadang, tahun, isDark }) => {
  const [fVendor, setFVendor] = useState<string>('__ALL__');
  const [fJudul, setFJudul] = useState<string>('__ALL__');
  const [fMaterial, setFMaterial] = useState<string>('__ALL__');
  const [vendorSearch, setVendorSearch] = useState('');

  const rows = sukuCadang?.rows || [];

  const vendorOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      if (r[2]) s.add(r[2]);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'id'));
  }, [rows]);

  const judulOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      if (r[1]) s.add(r[1]);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'id'));
  }, [rows]);

  const materialOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      if (r[3]) s.add(r[3]);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'id')).slice(0, 120);
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (fVendor !== '__ALL__' && r[2] !== fVendor) return false;
      if (fJudul !== '__ALL__' && r[1] !== fJudul) return false;
      if (fMaterial !== '__ALL__' && r[3] !== fMaterial) return false;
      return true;
    });
  }, [rows, fVendor, fJudul, fMaterial]);

  const filteredTotal = useMemo(
    () => filteredRows.reduce((s, r) => s + r[5] * r[6], 0),
    [filteredRows]
  );

  const topMaterials = useMemo(() => {
    const map: Record<string, { label: string; nilai: number }> = {};
    filteredRows.forEach((r) => {
      const k = r[3] || r[0] || '(tanpa nama)';
      if (!map[k]) map[k] = { label: k, nilai: 0 };
      map[k].nilai += r[5] * r[6];
    });
    return Object.values(map)
      .sort((a, b) => b.nilai - a.nilai)
      .slice(0, 10);
  }, [filteredRows]);

  const vendorSummary = useMemo(() => {
    const map: Record<string, { vendor: string; baris: number; qty: number; nilai: number }> = {};
    rows.forEach((r) => {
      const v = r[2] || '(belum ada vendor)';
      if (!map[v]) map[v] = { vendor: v, baris: 0, qty: 0, nilai: 0 };
      map[v].baris++;
      map[v].qty += r[5];
      map[v].nilai += r[5] * r[6];
    });
    const q = vendorSearch.trim().toLowerCase();
    return Object.values(map)
      .filter((v) => !q || v.vendor.toLowerCase().includes(q))
      .sort((a, b) => b.nilai - a.nilai);
  }, [rows, vendorSearch]);

  if (!sukuCadang) {
    return (
      <div className="rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] p-8 text-center text-sm text-slate-500 dark:text-[#9CA8AA]">
        Data suku cadang tidak tersedia di spreadsheet tahun {tahun}.
      </div>
    );
  }

  const hasFilter = fVendor !== '__ALL__' || fJudul !== '__ALL__' || fMaterial !== '__ALL__';

  const columns: DataTableColumn<SukuCadangRow>[] = [
    {
      key: 'mat',
      header: 'Matnum',
      sortValue: (r) => r[0],
      render: (r) => <span className="font-mono-num text-slate-500">{r[0] || '—'}</span>,
    },
    {
      key: 'judul',
      header: 'Judul Pengadaan',
      sortValue: (r) => r[1],
      render: (r) => <span className="font-medium text-slate-800 dark:text-slate-100 line-clamp-2 max-w-xs">{r[1] || '—'}</span>,
    },
    {
      key: 'vendor',
      header: 'Vendor',
      sortValue: (r) => r[2],
      render: (r) => <span className="text-slate-700 dark:text-slate-200">{r[2] || '—'}</span>,
    },
    {
      key: 'desk',
      header: 'Deskripsi Material',
      sortValue: (r) => r[3],
      render: (r) => <span className="text-slate-600 dark:text-slate-300 line-clamp-2 max-w-sm">{r[3] || '—'}</span>,
    },
    {
      key: 'sat',
      header: 'Satuan',
      align: 'center',
      sortValue: (r) => r[4],
      render: (r) => <span className="text-slate-500">{r[4] || '—'}</span>,
    },
    {
      key: 'qty',
      header: 'Qty',
      align: 'right',
      sortValue: (r) => r[5],
      render: (r) => <span className="tabular-nums">{fmtInt(r[5])}</span>,
    },
    {
      key: 'harga',
      header: 'Harga Satuan',
      align: 'right',
      sortValue: (r) => r[6],
      render: (r) => <span className="tabular-nums whitespace-nowrap">{fmtRp(r[6])}</span>,
    },
    {
      key: 'jumlah',
      header: 'Jumlah',
      align: 'right',
      sortValue: (r) => r[5] * r[6],
      render: (r) => <span className="font-semibold tabular-nums whitespace-nowrap">{fmtRp(r[5] * r[6])}</span>,
    },
  ];

  const filters: DataTableFilter<SukuCadangRow>[] = [
    {
      id: 'vendor',
      label: 'Vendor',
      options: vendorOptions,
      value: fVendor,
      onChange: setFVendor,
      matches: (r, val) => r[2] === val,
    },
    {
      id: 'judul',
      label: 'Judul Pengadaan',
      options: judulOptions,
      value: fJudul,
      onChange: setFJudul,
      matches: (r, val) => r[1] === val,
    },
    {
      id: 'material',
      label: 'Material',
      options: materialOptions,
      value: fMaterial,
      onChange: setFMaterial,
      matches: (r, val) => r[3] === val,
    },
  ];

  return (
    <div className="space-y-3">
      <MotionStaggerGrid className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          title="Total nilai suku cadang"
          value={fmtM(filteredTotal)}
          subline={fmtRp(filteredTotal)}
          accentColor="blue"
        />
        <KpiCard
          title="Jumlah item material"
          value={fmtInt(filteredRows.length)}
          subline={`Dari ${fmtInt(sukuCadang.jumlahBaris)} total baris`}
          accentColor="emerald"
        />
        <KpiCard
          title="Jumlah vendor terdaftar"
          value={fmtInt(vendorSummary.length)}
          subline="Terhubung dari daftar pengadaan"
          accentColor="blue"
        />
      </MotionStaggerGrid>

      {hasFilter && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#C69320]/40 dark:border-[#D4AF37]/40 bg-[#FBF5E4]/85 dark:bg-[#142226] px-3.5 py-2 text-xs">
          <span className="font-bold text-[#855C0D] dark:text-[#F5DFA0]">Filter aktif:</span>
          {fVendor !== '__ALL__' && (
            <button
              type="button"
              onClick={() => setFVendor('__ALL__')}
              className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-[#0D1619] border border-[#DCD4C0] dark:border-[#23353B] px-2 py-0.5 font-semibold cursor-pointer"
            >
              Vendor: {fVendor} <X className="w-3 h-3" />
            </button>
          )}
          {fJudul !== '__ALL__' && (
            <button
              type="button"
              onClick={() => setFJudul('__ALL__')}
              className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-[#0D1619] border border-[#DCD4C0] dark:border-[#23353B] px-2 py-0.5 font-semibold cursor-pointer"
            >
              Judul: {fJudul.slice(0, 32)} <X className="w-3 h-3" />
            </button>
          )}
          {fMaterial !== '__ALL__' && (
            <button
              type="button"
              onClick={() => setFMaterial('__ALL__')}
              className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-[#0D1619] border border-[#DCD4C0] dark:border-[#23353B] px-2 py-0.5 font-semibold cursor-pointer"
            >
              Material: {fMaterial.slice(0, 32)} <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setFVendor('__ALL__');
              setFJudul('__ALL__');
              setFMaterial('__ALL__');
            }}
            className="ml-auto inline-flex items-center gap-1 font-bold text-[#8E6510] dark:text-[#E6C45A] hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Reset filter
          </button>
        </div>
      )}

      {/* Top 10 Material Horizontal Bar + Vendor Table */}
      <MotionStaggerGrid className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <MotionCard className="lg:col-span-6 rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] p-3.5 flex flex-col">
          <div className="mb-2 shrink-0">
            <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">
              10 material dengan nilai terbesar
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#9CA8AA] mt-0.5">
              Klik batang untuk memfilter material di tabel
            </p>
          </div>

          <ChartCanvas
            isDark={isDark}
            heightClass="flex-1 min-h-[280px]"
            deps={[topMaterials, fMaterial]}
            buildConfig={(_, dark) => ({
              type: 'bar',
              data: {
                labels: topMaterials.map((m) =>
                  m.label.length > 28 ? `${m.label.slice(0, 26)}…` : m.label
                ),
                datasets: [
                  {
                    label: 'Nilai',
                    data: topMaterials.map((m) => m.nilai),
                    backgroundColor: topMaterials.map((m) =>
                      fMaterial === m.label ? '#E55A1B' : dark ? '#D4AF37' : '#B88B28'
                    ),
                    borderRadius: 5,
                  },
                ],
              },
              options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 2, right: 6, bottom: 0, left: 0 } },
                onClick: (_evt: unknown, els: Array<{ index: number }>) => {
                  if (els.length > 0) {
                    const mat = topMaterials[els[0].index]?.label;
                    if (mat) setFMaterial((cur) => (cur === mat ? '__ALL__' : mat));
                  }
                },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (items: Array<{ dataIndex?: number }>) =>
                        topMaterials[items[0]?.dataIndex ?? 0]?.label || '',
                      label: (item: { parsed: { x: number | null } }) => ` ${fmtRp(item.parsed.x)}`,
                    },
                  },
                },
                scales: {
                  x: {
                    beginAtZero: true,
                    grid: { color: dark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.06)' },
                    ticks: {
                      color: dark ? '#94A3B8' : '#64748B',
                      font: { size: 10 },
                      padding: 4,
                      callback: (v: string | number) => fmtM(Number(v)),
                    },
                  },
                  y: {
                    grid: { display: false },
                    ticks: { color: dark ? '#CBD5E1' : '#334155', font: { size: 10 }, padding: 4 },
                  },
                },
              },
            })}
          />
        </MotionCard>

        <MotionCard className="lg:col-span-6 rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[#E5DFD0] dark:border-[#1D2D32] flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">Vendor suku cadang</h3>
              <p className="text-xs text-slate-500 dark:text-[#9CA8AA]">Klik baris vendor untuk menyaring data</p>
            </div>
            <input
              type="text"
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
              placeholder="Cari vendor..."
              className="rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-[#FAF8F2] dark:bg-[#111D21] px-2.5 py-1 text-xs w-44 text-slate-900 dark:text-[#F4EFE4] focus:outline-none focus:ring-2 focus:ring-[#C69320]/30"
            />
          </div>
          <div className="overflow-x-auto max-h-72 flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[#FAF8F2] dark:bg-[#111D21] border-b border-[#E5DFD0] dark:border-[#1D2D32] text-[11px] uppercase tracking-wider text-slate-500 dark:text-[#9CA8AA]">
                <tr>
                  <th className="px-3.5 py-2 font-bold">Vendor</th>
                  <th className="px-3 py-2 text-right font-bold">Item</th>
                  <th className="px-3 py-2 text-right font-bold">Qty</th>
                  <th className="px-3.5 py-2 text-right font-bold">Total Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEAE0] dark:divide-[#19282D]">
                {vendorSummary.map((v) => {
                  const active = fVendor === v.vendor;
                  return (
                    <tr
                      key={v.vendor}
                      onClick={() => setFVendor((cur) => (cur === v.vendor ? '__ALL__' : v.vendor))}
                      className={`cursor-pointer transition ${
                        active ? 'bg-[#FBF5E4] dark:bg-[#D4AF37]/15 font-semibold' : 'hover:bg-[#FAF8F2] dark:hover:bg-[#121E22]'
                      }`}
                    >
                      <td className="px-3.5 py-2 text-slate-800 dark:text-slate-100">{v.vendor}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtInt(v.baris)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtInt(v.qty)}</td>
                      <td className="px-3.5 py-2 text-right tabular-nums font-medium">{fmtRp(v.nilai)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </MotionCard>
      </MotionStaggerGrid>

      {/* Main DataTable */}
      <DataTable
        title="Rekap Pengadaan Suku Cadang"
        subtitle="Klik judul kolom untuk mengurutkan"
        rows={filteredRows}
        columns={columns}
        filters={filters}
        searchPlaceholder="Cari matnum, judul pengadaan, vendor, atau deskripsi..."
        searchPredicate={(r, q) =>
          [r[0], r[1], r[2], r[3]].some((c) => c.toLowerCase().includes(q))
        }
        pageSize={25}
        footerRow={
          <tr>
            <td colSpan={7} className="px-3.5 py-2.5 text-left">
              TOTAL {hasFilter ? '(FILTER AKTIF)' : 'SEMUA'}
            </td>
            <td className="px-3.5 py-2.5 text-right tabular-nums">{fmtRp(filteredTotal)}</td>
          </tr>
        }
      />
    </div>
  );
};
