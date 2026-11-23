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
    : 'bg-gradient-to-r from-[#B88B28] to-[#D4AF37] hover:brightness-105 text-[#070D0F] font-extrabold';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#E5DFD0] dark:border-[#23353B] bg-white dark:bg-[#0D1619] shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5DFD0] dark:border-[#1D2D32] flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isDanger
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-[#FBF5E4] text-[#8E6510] dark:bg-[#142226] dark:text-[#E6C45A]'
              }`}
            >
              {isDanger ? <ShieldAlert className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">{title}</h3>
              <p className="text-xs text-slate-500 dark:text-[#9CA8AA] mt-0.5">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
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

          <div className="rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-[#FAF8F2] dark:bg-[#111D21] p-3 space-y-1.5 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 dark:text-[#9CA8AA]">Sheet tujuan</span>
              <span className="font-bold text-slate-950 dark:text-white text-right">{sheetName}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 dark:text-[#9CA8AA]">ID Spreadsheet</span>
              <span className="font-mono-num text-[11px] text-slate-600 dark:text-[#D5CFC2] truncate max-w-[230px]">
                {spreadsheetId}
              </span>
            </div>
            {details?.map((d) => (
              <div key={d.label} className="flex justify-between gap-2 pt-1 border-t border-[#E5DFD0] dark:border-[#1D2D32]">
                <span className="text-slate-500 dark:text-[#9CA8AA]">{d.label}</span>
                <span className="font-semibold text-slate-800 dark:text-[#F4EFE4] text-right truncate max-w-[240px]">
                  {d.value || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-3.5 bg-[#FAF8F2] dark:bg-[#091114] border-t border-[#E5DFD0] dark:border-[#1D2D32] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-white dark:bg-[#111D21] px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-[#E5DFD0] hover:bg-stone-100 dark:hover:bg-[#16262B] cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition disabled:opacity-60 cursor-pointer ${btnCls}`}
          >
            {loading ? 'Memproses...' : confirmLabel || 'Ya, lanjutkan'}
          </button>
        </div>
      </div>
    </div>
  );
};
