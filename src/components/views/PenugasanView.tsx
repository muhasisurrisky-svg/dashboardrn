import React, { useMemo, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { KpiCard } from '../ui/KpiCard';
import { MotionCard, MotionFillBar, MotionStaggerGrid } from '../ui/MotionPrimitives';
import { DonutPanel } from '../charts/DonutPanel';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import { TIPE_COLORS, fmtInt, fmtM, fmtRp, rpOrDash } from '../../utils/formatters';
import type { PenugasanData, PenugasanRow } from '../../types/dashboard';

interface PenugasanViewProps {
  penugasan: PenugasanData | null | undefined;
}

const PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#64748B'];

export const PenugasanView: React.FC<PenugasanViewProps> = ({ penugasan }) => {
  const [fStatus, setFStatus] = useState<string | null>(null);
  const [fTipe, setFTipe] = useState<string | null>(null);

  const rows = penugasan?.rows || [];

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (fStatus && r[10] !== fStatus) return false;
      if (fTipe && r[2] !== fTipe) return false;
      return true;
    });
  }, [rows, fStatus, fTipe]);

  if (!penugasan) {
    return (
      <div className="rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] p-8 text-center text-sm text-slate-500 dark:text-[#9CA8AA]">
        Data penugasan hanya tersedia pada spreadsheet tahun 2025.
      </div>
    );
  }

  const statusEntries = Object.entries(penugasan.perStatus).sort((a, b) => b[1] - a[1]);
  const maxStCount = Math.max(1, ...statusEntries.map(([, n]) => n));
  const tipeEntries = Object.entries(penugasan.perTipe).sort((a, b) => b[1] - a[1]);

  const columns: DataTableColumn<PenugasanRow>[] = [
    {
      key: 'no',
      header: 'No',
      align: 'center',
      sortValue: (r) => Number(r[0]) || 0,
      render: (r) => <span className="tabular-nums text-slate-500">{r[0] || '—'}</span>,
    },
    {
      key: 'nama',
      header: 'Nama Pengadaan',
      sortValue: (r) => r[1],
      render: (r) => <span className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2 max-w-md">{r[1]}</span>,
    },
    {
      key: 'tipe',
      header: 'Tipe',
      sortValue: (r) => r[2],
      render: (r) => <span>{r[2]}</span>,
    },
    {
      key: 'mitra',
      header: 'Mitra',
      sortValue: (r) => r[3],
      render: (r) => <span>{r[3] || '—'}</span>,
    },
    {
      key: 'rab',
      header: 'Nilai RAB',
      align: 'right',
      sortValue: (r) => r[4],
      render: (r) => <span className="tabular-nums whitespace-nowrap">{rpOrDash(r[4])}</span>,
    },
    {
      key: 'perjanjian',
      header: 'Nilai Perjanjian',
      align: 'right',
      sortValue: (r) => r[6],
      render: (r) => <span className="font-semibold tabular-nums whitespace-nowrap">{rpOrDash(r[6])}</span>,
    },
    {
      key: 'tgl',
      header: 'Tgl Kontrak',
      sortValue: (r) => r[7],
      render: (r) => <span className="tabular-nums whitespace-nowrap text-slate-500">{r[7] || '—'}</span>,
    },
    {
      key: 'nok',
      header: 'No. Kontrak',
      sortValue: (r) => r[8],
      render: (r) => <span className="font-mono-num text-[11px]">{r[8] || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Progres',
      sortValue: (r) => r[10],
      render: (r) => {
        const isBatal = /batal|gagal/i.test(r[10]);
        return (
          <span
            className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
              isBatal
                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60'
                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60'
            }`}
          >
            {r[10]}
          </span>
        );
      },
    },
  ];

  const hasFilter = Boolean(fStatus || fTipe);

  return (
    <div className="space-y-3">
      <MotionStaggerGrid className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard title="Total penugasan" value={fmtInt(penugasan.total)} subline="Paket penugasan 2025" accentColor="blue" />
        <KpiCard title="Total nilai RAB" value={fmtM(penugasan.nilaiRab)} subline={fmtRp(penugasan.nilaiRab)} accentColor="blue" />
        <KpiCard
          title="Nilai perjanjian"
          value={fmtM(penugasan.nilaiPerjanjian)}
          subline={fmtRp(penugasan.nilaiPerjanjian)}
          accentColor="emerald"
        />
        <KpiCard title="Batal" value={fmtInt(penugasan.batal)} subline="Paket dibatalkan" accentColor="rose" />
      </MotionStaggerGrid>

      {hasFilter && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#C69320]/40 dark:border-[#D4AF37]/40 bg-[#FBF5E4]/85 dark:bg-[#142226] px-3.5 py-2 text-xs">
          <span className="font-bold text-[#855C0D] dark:text-[#F5DFA0]">Filter aktif:</span>
          {fStatus && (
            <button
              type="button"
              onClick={() => setFStatus(null)}
              className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-[#0D1619] border border-[#DCD4C0] dark:border-[#23353B] px-2 py-0.5 font-semibold cursor-pointer"
            >
              Progres: {fStatus} <X className="w-3 h-3" />
            </button>
          )}
          {fTipe && (
            <button
              type="button"
              onClick={() => setFTipe(null)}
              className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-[#0D1619] border border-[#DCD4C0] dark:border-[#23353B] px-2 py-0.5 font-semibold cursor-pointer"
            >
              Tipe: {fTipe} <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setFStatus(null);
              setFTipe(null);
            }}
            className="ml-auto inline-flex items-center gap-1 font-bold text-[#8E6510] dark:text-[#E6C45A] hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Reset filter
          </button>
        </div>
      )}

      <MotionStaggerGrid className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <MotionCard className="lg:col-span-7 rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] p-3.5 flex flex-col">
          <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">Progres penugasan</h3>
          <p className="text-xs text-slate-500 dark:text-[#9CA8AA] mt-0.5 mb-2">
            Klik baris progres untuk menyaring tabel
          </p>
          <div className="flex-1 flex flex-col justify-between gap-1.5">
            {statusEntries.map(([st, cnt]) => {
              const active = fStatus === st;
              const isBatal = /batal|gagal/i.test(st);
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFStatus((c) => (c === st ? null : st))}
                  className={`w-full text-left rounded-lg p-1.5 -mx-1.5 transition cursor-pointer ${
                    active ? 'bg-[#FBF5E4] dark:bg-[#D4AF37]/15' : 'hover:bg-stone-100/80 dark:hover:bg-[#142024]'
                  }`}
                >
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800 dark:text-[#E5DFD0] truncate">{st}</span>
                    <span className="font-extrabold tabular-nums text-slate-950 dark:text-white">{fmtInt(cnt)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-200/80 dark:bg-[#18262B] overflow-hidden">
                    <MotionFillBar
                      pct={(cnt / maxStCount) * 100}
                      color={isBatal ? '#EF4444' : '#C69320'}
                      delay={0.18}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </MotionCard>

        <MotionCard className="lg:col-span-5 rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] p-3.5 flex flex-col">
          <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">Komposisi tipe penugasan</h3>
          <p className="text-xs text-slate-500 dark:text-[#9CA8AA] mt-0.5 mb-2">
            Klik tipe untuk menyaring daftar penugasan
          </p>
          <div className="flex-1 flex flex-col">
            <DonutPanel
              size={180}
              centerValue={fmtInt(penugasan.total)}
              centerLabel="paket"
              activeLabel={fTipe}
              onSelect={(lbl) => setFTipe((c) => (c === lbl ? null : lbl))}
              segments={tipeEntries.map(([lbl, cnt], idx) => ({
                label: lbl,
                value: cnt,
                color: TIPE_COLORS[lbl.toUpperCase()] || PALETTE[idx % PALETTE.length],
              }))}
            />
          </div>
        </MotionCard>
      </MotionStaggerGrid>

      <DataTable
        title="Daftar penugasan"
        rows={filteredRows}
        columns={columns}
        searchPlaceholder="Cari nama pengadaan, mitra, nomor kontrak, atau status..."
        searchPredicate={(r, q) => [r[1], r[2], r[3], r[8], r[10]].some((c) => c.toLowerCase().includes(q))}
        pageSize={25}
      />
    </div>
  );
};
