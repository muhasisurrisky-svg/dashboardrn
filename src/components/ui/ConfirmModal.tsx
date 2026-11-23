import React from 'react';
import { AlertTriangle, FileSpreadsheet, ShieldAlert, X } from 'lucide-react';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  actionType: 'tambah' | 'ubah' | 'hapus';
  spreadsheetId: string;
  sheetName: string;
  details?: Array<{ label: string; value: string }>;
  warningText?: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  description,
  actionType,
  spreadsheetId,
  sheetName,
  details,
  warningText,
  confirmLabel,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const isDanger = actionType === 'hapus';
  const btnCls = isDanger
    ? 'bg-rose-600 hover:bg-rose-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isDanger
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
              }`}
            >
              {isDanger ? <ShieldAlert className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {warningText && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span>{warningText}</span>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">Sheet tujuan</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-right">{sheetName}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">ID Spreadsheet</span>
              <span className="font-mono-num text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-[230px]">
                {spreadsheetId}
              </span>
            </div>
            {details?.map((d) => (
              <div key={d.label} className="flex justify-between gap-2 pt-1 border-t border-slate-200/70 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400">{d.label}</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 text-right truncate max-w-[240px]">
                  {d.value || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition disabled:opacity-60 ${btnCls}`}
          >
            {loading ? 'Memproses...' : confirmLabel || 'Ya, lanjutkan'}
          </button>
        </div>
      </div>
    </div>
  );
};
