import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { MotionCard } from './MotionPrimitives';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  sortValue?: (row: T) => string | number;
  render: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  widthClass?: string;
}

export interface DataTableFilter<T> {
  id: string;
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  matches: (row: T, val: string) => boolean;
}

interface DataTableProps<T> {
  title?: string;
  subtitle?: string;
  rows: T[];
  columns: DataTableColumn<T>[];
  searchPlaceholder?: string;
  searchPredicate?: (row: T, queryLower: string) => boolean;
  filters?: DataTableFilter<T>[];
  pageSize?: number;
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
  onRowClick?: (row: T) => void;
  footerRow?: React.ReactNode;
  headerRight?: React.ReactNode;
  emptyText?: string;
  compact?: boolean;
  maxBodyHeightClass?: string;
  rowKey?: (row: T, idx: number) => string | number;
}

export function DataTable<T>({
  title,
  subtitle,
  rows,
  columns,
  searchPlaceholder = 'Cari...',
  searchPredicate,
  filters,
  pageSize = 25,
  defaultSortKey,
  defaultSortDir = 'asc',
  onRowClick,
  footerRow,
  headerRight,
  emptyText = 'Tidak ada data yang cocok dengan filter saat ini.',
  compact = false,
  maxBodyHeightClass,
  rowKey,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && searchPredicate && !searchPredicate(r, q)) return false;
      if (filters) {
        for (const f of filters) {
          if (f.value && f.value !== '__ALL__' && !f.matches(r, f.value)) return false;
        }
      }
      return true;
    });
  }, [rows, query, searchPredicate, filters]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    const sv = col.sortValue;
    const copy = filtered.slice();
    copy.sort((a, b) => {
      const va = sv(a);
      const vb = sv(b);
      let cmp = 0;
      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb;
      } else {
        cmp = String(va).localeCompare(String(vb), 'id', { numeric: true });
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const safePage = Math.min(page, totalPages - 1);
  const visibleRows = useMemo(() => {
    if (pageSize <= 0) return sorted;
    return sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);
  }, [sorted, safePage, pageSize]);

  const toggleSort = (col: DataTableColumn<T>) => {
    if (!col.sortValue) return;
    setPage(0);
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  };

  return (
    <MotionCard className="rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] overflow-hidden">
      {(title || subtitle || searchPredicate || filters?.length || headerRight) && (
        <div className="px-4 py-3.5 border-b border-[#E5DFD0] dark:border-[#1D2D32] space-y-3">
          {(title || subtitle || headerRight) && (
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                {title && (
                  <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">{title}</h3>
                )}
                {subtitle && <p className="text-xs text-slate-500 dark:text-[#9CA8AA] mt-0.5">{subtitle}</p>}
              </div>
              <div className="flex items-center gap-2">
                {headerRight}
                <span className="text-xs font-bold text-slate-600 dark:text-[#9CA8AA] tabular-nums">
                  {sorted.length.toLocaleString('id-ID')} baris
                </span>
              </div>
            </div>
          )}

          {(searchPredicate || (filters && filters.length > 0)) && (
            <div className="flex flex-wrap items-center gap-2">
              {searchPredicate && (
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(0);
                    }}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-[#FAF8F2] dark:bg-[#111D21] pl-8 pr-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C69320]/30 dark:focus:ring-[#D4AF37]/30 focus:border-[#C69320] dark:focus:border-[#D4AF37]"
                  />
                </div>
              )}

              {filters?.map((f) => (
                <select
                  key={f.id}
                  aria-label={f.label}
                  value={f.value}
                  onChange={(e) => {
                    f.onChange(e.target.value);
                    setPage(0);
                  }}
                  className="rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-[#FAF8F2] dark:bg-[#111D21] px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-[#E5DFD0] focus:outline-none focus:ring-2 focus:ring-[#C69320]/30 dark:focus:ring-[#D4AF37]/30 focus:border-[#C69320] dark:focus:border-[#D4AF37] max-w-[240px]"
                >
                  <option value="__ALL__">Semua {f.label}</option>
                  {f.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={`overflow-x-auto ${maxBodyHeightClass || ''}`}>
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-[#FAF8F2] dark:bg-[#101C20] border-b border-[#E5DFD0] dark:border-[#1D2D32]">
            <tr>
              {columns.map((col) => {
                const alignCls =
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                const sortable = Boolean(col.sortValue);
                const isActiveSort = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={sortable ? () => toggleSort(col) : undefined}
                    className={`${compact ? 'px-3 py-2' : 'px-3.5 py-2.5'} text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap select-none ${alignCls} ${
                      sortable ? 'cursor-pointer hover:text-slate-800 dark:hover:text-slate-200' : ''
                    } ${col.headerClassName || ''} ${col.widthClass || ''}`}
                  >
                    <span className={`inline-flex items-center gap-1 ${col.align === 'right' ? 'flex-row-reverse' : ''}`}>
                      <span>{col.header}</span>
                      {sortable && (
                        <span className="text-slate-400">
                          {isActiveSort ? (
                            sortDir === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-[#A67C21] dark:text-[#E6C45A]" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-[#A67C21] dark:text-[#E6C45A]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-45" />
                          )}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDE8DC] dark:divide-[#172429]">
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-slate-500 dark:text-[#9CA8AA]">
                  {emptyText}
                </td>
              </tr>
            ) : (
              visibleRows.map((row, idx) => (
                <tr
                  key={rowKey ? rowKey(row, idx) : idx}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`transition-colors ${
                    onRowClick
                      ? 'cursor-pointer hover:bg-[#FBF5E4]/65 dark:hover:bg-[#D4AF37]/10'
                      : 'hover:bg-[#FAF8F2] dark:hover:bg-[#111C20]'
                  }`}
                >
                  {columns.map((col) => {
                    const alignCls =
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                    return (
                      <td
                        key={col.key}
                        className={`${compact ? 'px-3 py-2' : 'px-3.5 py-2.5'} text-xs text-slate-700 dark:text-slate-200 ${alignCls} ${
                          col.className || ''
                        }`}
                      >
                        {col.render(row, safePage * pageSize + idx)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
          {footerRow && (
            <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 font-semibold text-xs text-slate-900 dark:text-slate-100">
              {footerRow}
            </tfoot>
          )}
        </table>
      </div>

      {/* Only render pagination when totalPages > 1 */}
      {totalPages > 1 && (
        <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900">
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Halaman {safePage + 1} dari {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Berikutnya
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </MotionCard>
  );
}
