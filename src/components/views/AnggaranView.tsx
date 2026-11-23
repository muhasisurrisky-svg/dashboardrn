import React from 'react';
import { KpiCard } from '../ui/KpiCard';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import { SCurveChart } from '../charts/SCurveChart';
import { fmtM, fmtP, fmtRp, statusTier } from '../../utils/formatters';
import type { AnggaranData, AnggaranRow, KurvaAnggaranPoint } from '../../types/dashboard';

interface AnggaranViewProps {
  anggaran: AnggaranData | null;
  kurvaAnggaran: KurvaAnggaranPoint[] | null;
  tglAnggaran: string | null;
  tahun: number;
  isDark: boolean;
}

export const AnggaranView: React.FC<AnggaranViewProps> = ({
  anggaran,
  kurvaAnggaran,
  tglAnggaran,
  tahun,
  isDark,
}) => {
  if (!anggaran) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
        Data anggaran tidak tersedia di spreadsheet tahun {tahun}.
      </div>
    );
  }

  const { total, rows } = anggaran;

  const columns: DataTableColumn<AnggaranRow>[] = [
    {
      key: 'no',
      header: 'No',
      align: 'center',
      sortValue: (r) => Number(r.no) || 0,
      render: (r) => <span className="text-slate-500 tabular-nums">{r.no}</span>,
    },
    {
      key: 'fc',
      header: 'Funds Center',
      sortValue: (r) => r.fc,
      render: (r) => <span className="font-mono-num text-slate-600 dark:text-slate-300">{r.fc || '—'}</span>,
    },
    {
      key: 'ci',
      header: 'Cost Item (CI)',
      sortValue: (r) => r.ci,
      render: (r) => <span className="font-medium text-slate-900 dark:text-slate-100">{r.ci}</span>,
    },
    {
      key: 'rkap',
      header: 'RKAP',
      align: 'right',
      sortValue: (r) => r.rkap,
      render: (r) => <span className="tabular-nums">{fmtRp(r.rkap)}</span>,
    },
    {
      key: 'release',
      header: 'Release Budget',
      align: 'right',
      sortValue: (r) => r.release,
      render: (r) => <span className="tabular-nums">{fmtRp(r.release)}</span>,
    },
    {
      key: 'commitment',
      header: 'Commitment',
      align: 'right',
      sortValue: (r) => r.commitment,
      render: (r) => <span className="tabular-nums">{fmtRp(r.commitment)}</span>,
    },
    {
      key: 'actual',
      header: 'Actual',
      align: 'right',
      sortValue: (r) => r.actual,
      render: (r) => <span className="tabular-nums">{fmtRp(r.actual)}</span>,
    },
    {
      key: 'consumed',
      header: 'Consumed Budget',
      align: 'right',
      sortValue: (r) => r.consumed,
      render: (r) => <span className="font-semibold tabular-nums">{fmtRp(r.consumed)}</span>,
    },
    {
      key: 'available',
      header: 'Budget Available',
      align: 'right',
      sortValue: (r) => r.available,
      render: (r) => <span className="tabular-nums">{fmtRp(r.available)}</span>,
    },
    {
      key: 'pct',
      header: 'Penyerapan',
      align: 'right',
      sortValue: (r) => r.pct,
      render: (r) => {
        const tier = statusTier(r.pct);
        return <span className={`font-bold tabular-nums ${tier.textClass}`}>{fmtP(r.pct)}</span>;
      },
    },
  ];

  const totalTier = statusTier(total.pct);

  return (
    <div className="space-y-3">
      {kurvaAnggaran && kurvaAnggaran.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex flex-col">
          <div className="mb-2 shrink-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Kurva S penyerapan anggaran
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kumulatif rencana anggaran terhadap realisasi konsumsi per periode
            </p>
          </div>
          <SCurveChart
            labels={kurvaAnggaran.map((p) => p.periode)}
            rencana={kurvaAnggaran.map((p) => p.rencana)}
            realisasi={kurvaAnggaran.map((p) => p.konsumsi)}
            unitLabel="Rp"
            formatValue={(v) => fmtM(v)}
            formatSelisih={(v) => `${v >= 0 ? '+' : ''}${fmtM(v)}`}
            isDark={isDark}
            heightClass="h-64 sm:h-72"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard title="Total RKAP" value={fmtM(total.rkap)} subline={fmtRp(total.rkap)} accentColor="blue" />
        <KpiCard
          title="Total Release Budget"
          value={fmtM(total.release)}
          subline={fmtRp(total.release)}
          accentColor="blue"
        />
        <KpiCard
          title="Total Consumed"
          value={fmtM(total.consumed)}
          subline={fmtRp(total.consumed)}
          pctForStatus={total.pct}
          footer={<span className={totalTier.textClass}>Penyerapan {fmtP(total.pct)}</span>}
        />
        <KpiCard
          title="Budget Available"
          value={fmtM(total.available)}
          subline={fmtRp(total.available)}
          accentColor={total.available >= 0 ? 'emerald' : 'rose'}
        />
      </div>

      <DataTable
        title="Penyerapan per cost item"
        subtitle={`Data ${tahun === 2025 ? 'RKAD' : 'ZFMF01'}${tglAnggaran ? ` per ${tglAnggaran}` : ''} · penyerapan keseluruhan ${fmtP(total.pct)}`}
        rows={rows}
        columns={columns}
        searchPlaceholder="Cari funds center atau cost item..."
        searchPredicate={(r, q) => r.ci.toLowerCase().includes(q) || r.fc.toLowerCase().includes(q)}
        pageSize={25}
        rowKey={(r) => `${r.no}-${r.ci}`}
        footerRow={
          <tr>
            <td colSpan={3} className="px-3.5 py-2.5 text-left">
              TOTAL
            </td>
            <td className="px-3.5 py-2.5 text-right tabular-nums">{fmtRp(total.rkap)}</td>
            <td className="px-3.5 py-2.5 text-right tabular-nums">{fmtRp(total.release)}</td>
            <td className="px-3.5 py-2.5 text-right tabular-nums">{fmtRp(total.commitment)}</td>
            <td className="px-3.5 py-2.5 text-right tabular-nums">{fmtRp(total.actual)}</td>
            <td className="px-3.5 py-2.5 text-right tabular-nums">{fmtRp(total.consumed)}</td>
            <td className="px-3.5 py-2.5 text-right tabular-nums">{fmtRp(total.available)}</td>
            <td className={`px-3.5 py-2.5 text-right tabular-nums font-bold ${totalTier.textClass}`}>
              {fmtP(total.pct)}
            </td>
          </tr>
        }
      />
    </div>
  );
};
