import React, { useMemo, useState } from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import { KpiCard } from '../ui/KpiCard';
import { DonutPanel } from '../charts/DonutPanel';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import { aparBadgeClass, fmtInt, fmtP } from '../../utils/formatters';
import type { AparData, AparRow } from '../../types/dashboard';

interface AparViewProps {
  apar: AparData | null;
}

export const AparView: React.FC<AparViewProps> = ({ apar }) => {
  const [fStatus, setFStatus] = useState<string | null>(null);
  const [fLokasi, setFLokasi] = useState<string | null>(null);
  const [lokSearch, setLokSearch] = useState('');

  const rows = apar?.rows || [];

  const lokasiSummary = useMemo(() => {
    const map: Record<string, { lok: string; total: number; aman: number; segera: number; kad: number }> = {};
    rows.forEach((r) => {
      const lok = r[1] || '(belum diisi)';
      if (!map[lok]) map[lok] = { lok, total: 0, aman: 0, segera: 0, kad: 0 };
      map[lok].total++;
      if (r[13] === 'Aman') map[lok].aman++;
      else if (r[13] === 'Segera kadaluarsa') map[lok].segera++;
      else if (r[13] === 'Kadaluarsa') map[lok].kad++;
    });
    const q = lokSearch.trim().toLowerCase();
    return Object.values(map)
      .filter((l) => !q || l.lok.toLowerCase().includes(q))
      .sort((a, b) => b.kad - a.kad || b.segera - a.segera || b.total - a.total);
  }, [rows, lokSearch]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (fStatus && r[13] !== fStatus) return false;
      if (fLokasi && (r[1] || '(belum diisi)') !== fLokasi) return false;
      return true;
    });
  }, [rows, fStatus, fLokasi]);

  if (!apar) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
        Data APAR tidak tersedia di spreadsheet aktif.
      </div>
    );
  }

  const hasFilter = Boolean(fStatus || fLokasi);
  const belumCek = Math.max(0, apar.total - apar.sudahCek);

  const columns: DataTableColumn<AparRow>[] = [
    {
      key: 'no',
      header: 'No. APAR',
      sortValue: (r) => r[0],
      render: (r) => <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">{r[0] || '—'}</span>,
    },
    {
      key: 'lok',
      header: 'Lokasi',
      sortValue: (r) => r[1],
      render: (r) => <span className="font-medium">{r[1] || '—'}</span>,
    },
    {
      key: 'jenis',
      header: 'Jenis',
      sortValue: (r) => r[2],
      render: (r) => <span>{r[2] || '—'}</span>,
    },
    {
      key: 'kap',
      header: 'Kapasitas',
      sortValue: (r) => r[3],
      render: (r) => <span className="tabular-nums">{r[3] || '—'}</span>,
    },
    {
      key: 'kad',
      header: 'Kadaluarsa',
      sortValue: (r) => r[12] || r[4],
      render: (r) => <span className="tabular-nums whitespace-nowrap">{r[12] || r[4] || '—'}</span>,
    },
    {
      key: 'cek',
      header: 'Terakhir Cek',
      sortValue: (r) => r[5],
      render: (r) => <span className="tabular-nums whitespace-nowrap text-slate-500">{r[5] || '—'}</span>,
    },
    {
      key: 'pre',
      header: 'Pressure',
      render: (r) => <span>{r[6] || '—'}</span>,
    },
    {
      key: 'seg',
      header: 'Segel',
      render: (r) => <span>{r[7] || '—'}</span>,
    },
    {
      key: 'sel',
      header: 'Selang',
      render: (r) => <span>{r[8] || '—'}</span>,
    },
    {
      key: 'tab',
      header: 'Tabung',
      render: (r) => <span>{r[9] || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r[13],
      render: (r) => (
        <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${aparBadgeClass(r[13])}`}>
          {r[13]}
        </span>
      ),
    },
    {
      key: 'sisa',
      header: 'Sisa Hari',
      align: 'right',
      sortValue: (r) => (r[14] === '' ? 999999 : Number(r[14])),
      render: (r) => {
        if (r[14] === '') return <span className="text-slate-400">—</span>;
        const n = Number(r[14]);
        return (
          <span
            className={`tabular-nums font-semibold ${
              n < 0 ? 'text-rose-600 dark:text-rose-400' : n <= apar.batasHari ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {n < 0 ? `Lewat ${Math.abs(n)} hr` : `${n} hr`}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-3">
      {(apar.tanpaLokasi > 0 || belumCek > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {apar.tanpaLokasi > 0 && (
              <span>
                <strong>{fmtInt(apar.tanpaLokasi)}</strong> APAR belum memiliki keterangan lokasi
              </span>
            )}
            {belumCek > 0 && (
              <span>
                <strong>{fmtInt(belumCek)}</strong> APAR belum tercatat tanggal pengecekan terakhir
              </span>
            )}
          </div>
        </div>
      )}

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          title="Total APAR"
          value={fmtInt(apar.total)}
          subline={`Acuan ${apar.acuan}`}
          accentColor="blue"
          active={!fStatus}
          onClick={() => setFStatus(null)}
        />
        <KpiCard
          title="Aman"
          value={fmtInt(apar.perStatus.Aman)}
          subline={`${fmtP(apar.total > 0 ? (apar.perStatus.Aman / apar.total) * 100 : 0)} · klik filter`}
          accentColor="emerald"
          active={fStatus === 'Aman'}
          onClick={() => setFStatus((c) => (c === 'Aman' ? null : 'Aman'))}
        />
        <KpiCard
          title="Segera kadaluarsa"
          value={fmtInt(apar.perStatus['Segera kadaluarsa'])}
          subline={`≤ ${apar.batasHari} hari · klik filter`}
          accentColor="amber"
          active={fStatus === 'Segera kadaluarsa'}
          onClick={() => setFStatus((c) => (c === 'Segera kadaluarsa' ? null : 'Segera kadaluarsa'))}
        />
        <KpiCard
          title="Kadaluarsa"
          value={fmtInt(apar.perStatus.Kadaluarsa)}
          subline="Perlu penggantian segera"
          accentColor="rose"
          active={fStatus === 'Kadaluarsa'}
          onClick={() => setFStatus((c) => (c === 'Kadaluarsa' ? null : 'Kadaluarsa'))}
        />
        <KpiCard
          title="Sudah dicek"
          value={fmtInt(apar.sudahCek)}
          subline={`${fmtP(apar.total > 0 ? (apar.sudahCek / apar.total) * 100 : 0)} dari total`}
          accentColor="blue"
        />
        <KpiCard
          title="Sudah ganti / barcode"
          value={fmtInt(apar.sudahGanti)}
          subline="Memiliki barcode atau tanggal baru"
          accentColor="emerald"
        />
      </div>

      {hasFilter && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/30 px-3.5 py-2 text-xs">
          <span className="font-semibold text-blue-700 dark:text-blue-300">Filter APAR aktif:</span>
          {fStatus && (
            <button
              type="button"
              onClick={() => setFStatus(null)}
              className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 px-2 py-0.5 font-medium"
            >
              Status: {fStatus} <X className="w-3 h-3" />
            </button>
          )}
          {fLokasi && (
            <button
              type="button"
              onClick={() => setFLokasi(null)}
              className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 px-2 py-0.5 font-medium"
            >
              Lokasi: {fLokasi} <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setFStatus(null);
              setFLokasi(null);
            }}
            className="ml-auto inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-300 hover:underline"
          >
            <RotateCcw className="w-3 h-3" /> Reset filter
          </button>
        </div>
      )}

      {/* Middle Row: Donut + Titik Penempatan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex flex-col">
          <div className="mb-2 shrink-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Status kadaluarsa APAR</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Klik status untuk memfilter daftar APAR
            </p>
          </div>
          <div className="flex-1 flex flex-col">
            <DonutPanel
              size={180}
              centerValue={fmtInt(apar.total)}
              centerLabel="unit APAR"
              activeLabel={fStatus}
              onSelect={(lbl) => setFStatus((c) => (c === lbl ? null : lbl))}
              segments={[
                { label: 'Aman', value: apar.perStatus.Aman, color: '#10B981' },
                { label: 'Segera kadaluarsa', value: apar.perStatus['Segera kadaluarsa'], color: '#F59E0B' },
                { label: 'Kadaluarsa', value: apar.perStatus.Kadaluarsa, color: '#EF4444' },
                { label: 'Tidak ada data', value: apar.perStatus['Tidak ada data'], color: '#94A3B8' },
              ]}
            />
          </div>
        </div>

        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Titik penempatan</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Klik lokasi untuk memfilter daftar APAR</p>
            </div>
            <input
              type="text"
              value={lokSearch}
              onChange={(e) => setLokSearch(e.target.value)}
              placeholder="Cari lokasi..."
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs w-44 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div className="overflow-x-auto max-h-72 flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3.5 py-2 font-semibold">Lokasi</th>
                  <th className="px-3 py-2 text-right font-semibold">Total</th>
                  <th className="px-3 py-2 text-right font-semibold">Aman</th>
                  <th className="px-3 py-2 text-right font-semibold">Segera</th>
                  <th className="px-3.5 py-2 text-right font-semibold">Kadaluarsa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lokasiSummary.map((l) => {
                  const active = fLokasi === l.lok;
                  return (
                    <tr
                      key={l.lok}
                      onClick={() => setFLokasi((c) => (c === l.lok ? null : l.lok))}
                      className={`cursor-pointer transition ${
                        active ? 'bg-blue-50 dark:bg-blue-950/40 font-semibold' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="px-3.5 py-2 text-slate-800 dark:text-slate-100">{l.lok}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{l.total}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        {l.aman}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-amber-600 dark:text-amber-400">
                        {l.segera}
                      </td>
                      <td className="px-3.5 py-2 text-right tabular-nums text-rose-600 dark:text-rose-400 font-semibold">
                        {l.kad}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Main APAR Table */}
      <DataTable
        title="Daftar APAR dan titik penempatan"
        subtitle="Klik judul kolom untuk mengurutkan"
        rows={filteredRows}
        columns={columns}
        searchPlaceholder="Cari nomor APAR, lokasi, jenis, atau status..."
        searchPredicate={(r, q) =>
          [r[0], r[1], r[2], r[3], r[13]].some((c) => c.toLowerCase().includes(q))
        }
        pageSize={25}
      />
    </div>
  );
};
