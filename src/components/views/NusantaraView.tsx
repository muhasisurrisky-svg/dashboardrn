import React from 'react';
import { KpiCard } from '../ui/KpiCard';
import { MotionCard, MotionStaggerGrid } from '../ui/MotionPrimitives';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import { SCurveChart } from '../charts/SCurveChart';
import { fmtP, statusTier } from '../../utils/formatters';
import type { NusantaraData, NusantaraItem } from '../../types/dashboard';

interface NusantaraViewProps {
  nusantara: NusantaraData | null;
  tahun: number;
  isDark: boolean;
}

export const NusantaraView: React.FC<NusantaraViewProps> = ({ nusantara, tahun, isDark }) => {
  if (!nusantara) {
    return (
      <div className="rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] p-8 text-center text-sm text-slate-500 dark:text-[#9CA8AA]">
        Data Nusantara Explorer tidak tersedia di spreadsheet tahun {tahun}.
      </div>
    );
  }

  const { kpi, items, kurva } = nusantara;

  const columns: DataTableColumn<NusantaraItem>[] = [
    {
      key: 'kereta',
      header: 'Kereta',
      sortValue: (r) => r.kereta,
      render: (r) => <span className="font-semibold text-slate-900 dark:text-slate-100">{r.kereta}</span>,
    },
    {
      key: 'kelompok',
      header: 'Kelompok Kerja',
      sortValue: (r) => r.kelompok,
      render: (r) => <span className="text-slate-600 dark:text-slate-300">{r.kelompok || '—'}</span>,
    },
    {
      key: 'posisi',
      header: 'Posisi',
      sortValue: (r) => r.posisi,
      render: (r) => <span className="text-slate-500 dark:text-slate-400">{r.posisi || '—'}</span>,
    },
    {
      key: 'rencana',
      header: 'Rencana',
      align: 'right',
      sortValue: (r) => r.rencana,
      render: (r) => <span className="tabular-nums">{fmtP(r.rencana, 2)}</span>,
    },
    {
      key: 'aktual',
      header: 'Aktual',
      align: 'right',
      sortValue: (r) => r.aktual,
      render: (r) => {
        const tier = statusTier(r.aktual);
        return <span className={`font-bold tabular-nums ${tier.textClass}`}>{fmtP(r.aktual, 2)}</span>;
      },
    },
    {
      key: 'deviasi',
      header: 'Deviasi',
      align: 'right',
      sortValue: (r) => r.deviasi,
      render: (r) => (
        <span
          className={`tabular-nums font-medium ${
            r.deviasi >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {r.deviasi >= 0 ? '+' : ''}
          {fmtP(r.deviasi, 2)}
        </span>
      ),
    },
    {
      key: 'sisa',
      header: 'Sisa',
      align: 'right',
      sortValue: (r) => r.sisa,
      render: (r) => <span className="tabular-nums text-slate-500">{fmtP(r.sisa, 2)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r.status,
      render: (r) => {
        const isDone = /selesai|100%/i.test(r.status) || r.aktual >= 99.99;
        return (
          <span
            className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
              isDone
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60'
            }`}
          >
            {r.status || (isDone ? 'Selesai' : 'Dalam progres')}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-3">
      {kurva && kurva.length > 0 && (
        <MotionCard className="rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] p-3.5 flex flex-col">
          <div className="mb-2 shrink-0">
            <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">
              Kurva S Nusantara Explorer
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#9CA8AA] mt-0.5">
              Kumulatif progres rencana vs aktual per periode mingguan
            </p>
          </div>
          <SCurveChart
            labels={kurva.map((p) => p.periode)}
            rencana={kurva.map((p) => p.rencana)}
            realisasi={kurva.map((p) => p.aktual)}
            unitLabel="%"
            formatValue={(v) => fmtP(v, 2)}
            formatSelisih={(v) => `${v >= 0 ? '+' : ''}${fmtP(v, 2)}`}
            isDark={isDark}
            heightClass="h-64 sm:h-72"
            isPercentScale
          />
        </MotionCard>
      )}

      <MotionStaggerGrid className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard
          title="Progres aktual"
          value={kpi.aktual}
          subline="Capaian kumulatif saat ini"
          pctForStatus={kpi.aktualNum}
          showThresholdBar
        />
        <KpiCard title="Target rencana" value={kpi.rencana} subline="Rencana kumulatif" accentColor="blue" />
        <KpiCard
          title="Deviasi"
          value={kpi.deviasi}
          subline={kpi.deviasiNum >= 0 ? 'Mendahului target' : 'Tertinggal dari rencana'}
          accentColor={kpi.deviasiNum >= 0 ? 'emerald' : 'amber'}
        />
        <KpiCard
          title="Kereta selesai 100%"
          value={kpi.selesai}
          subline={`Dari ${items.length} kereta terdaftar`}
          accentColor="emerald"
        />
      </MotionStaggerGrid>

      <DataTable
        title="Progres per kereta"
        subtitle="Rincian capaian, posisi pengerjaan, dan deviasi per unit kereta"
        rows={items}
        columns={columns}
        searchPlaceholder="Cari kereta, kelompok kerja, posisi, atau status..."
        searchPredicate={(r, q) =>
          [r.kereta, r.kelompok, r.posisi, r.status].some((c) => c.toLowerCase().includes(q))
        }
        pageSize={25}
      />
    </div>
  );
};
