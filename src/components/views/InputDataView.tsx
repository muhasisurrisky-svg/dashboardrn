import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  FilePlus2,
  Loader2,
  Lock,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { LOG_INPUT, getInputTargets } from '../../config/spreadsheets';
import {
  formatInputWriteValue,
  formatSheetValueForForm,
  loadInputBarisFromSheet,
  loadInputSchemaFromSheet,
  norm_,
} from '../../services/dashboardParser';
import {
  batchGetFormattedValues,
  colToA1,
  copyRowFormatAndFormulas,
  deleteSheetRow,
  ensureLogSheetAndAppend,
  getRawSheetRange,
  getSpreadsheetMeta,
  quoteSheetName,
  updateSheetValuesBatch,
  type SpreadsheetMeta,
} from '../../services/sheetsApi';
import { ConfirmModal } from '../ui/ConfirmModal';
import type {
  InputBarisResult,
  InputBarisRow,
  InputFieldSchema,
  InputModuleId,
  InputSchemaResult,
  TahunType,
  UserRole,
} from '../../types/dashboard';

interface InputDataViewProps {
  spreadsheetId: string;
  tahun: TahunType;
  role: UserRole;
  accessToken: string | null;
  writeCapable: boolean;
  onDataMutated: () => void;
  onAuthError: () => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

const MODULES: Array<{ id: InputModuleId; label: string }> = [
  { id: 'pengadaan', label: 'Pengadaan' },
  { id: 'program', label: 'Program' },
  { id: 'suku', label: 'Suku Cadang' },
  { id: 'apar', label: 'APAR' },
];

type PendingAction =
  | {
      kind: 'tambah';
      warningText?: string;
      payload: Record<number, string>;
    }
  | {
      kind: 'ubah';
      row1Based: number;
      payload: Record<number, string>;
    }
  | {
      kind: 'hapus';
      row1Based: number;
      label: string;
    };

export const InputDataView: React.FC<InputDataViewProps> = ({
  spreadsheetId,
  tahun,
  role,
  accessToken,
  writeCapable,
  onDataMutated,
  onAuthError,
  onToast,
}) => {
  const [mode, setMode] = useState<'tambah' | 'kelola'>('tambah');
  const [modul, setModul] = useState<InputModuleId>('pengadaan');
  const [targetIdx, setTargetIdx] = useState<number>(0);

  const [schemaRes, setSchemaRes] = useState<InputSchemaResult | null>(null);
  const [barisRes, setBarisRes] = useState<InputBarisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add form state
  const [formValues, setFormValues] = useState<Record<number, string>>({});

  // Manage/Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);

  // Edit modal state
  const [editingRow, setEditingRow] = useState<{
    row1Based: number;
    values: Record<number, string>;
  } | null>(null);

  // Confirm modal state (mandatory before any Google Sheets write/update/delete)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [mutating, setMutating] = useState(false);

  const loadData = useCallback(async () => {
    if (!accessToken || role !== 'admin' || !writeCapable) return;
    const targetList = getInputTargets(modul, tahun);
    if (!targetList.length) {
      setSchemaRes({
        targets: [],
        idx: 0,
        sheet: '',
        pesan: `Modul ${modul.toUpperCase()} tidak tersedia di spreadsheet tahun ${tahun}.`,
      });
      setBarisRes(null);
      return;
    }

    const safeIdx = Math.min(Math.max(targetIdx, 0), targetList.length - 1);
    const chosen = targetList[safeIdx];
    const mappedTargets = targetList.map((t, idx) => ({ idx, nama: t.sheet }));

    setLoading(true);
    setErrorMsg(null);
    try {
      if (mode === 'tambah') {
        const skema = await loadInputSchemaFromSheet(spreadsheetId, chosen, accessToken);
        setSchemaRes({
          targets: mappedTargets,
          idx: safeIdx,
          sheet: chosen.sheet,
          targetDef: chosen,
          skema,
        });
        setFormValues({});
      } else {
        const res = await loadInputBarisFromSheet(
          spreadsheetId,
          chosen,
          safeIdx,
          mappedTargets,
          searchQuery,
          page,
          accessToken
        );
        setBarisRes(res);
      }
    } catch (err: any) {
      if (err?.name === 'SheetsAuthError') {
        onAuthError();
      }
      setErrorMsg(err?.message || 'Gagal membaca struktur sheet.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, role, writeCapable, modul, tahun, targetIdx, mode, spreadsheetId, searchQuery, page, onAuthError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset sub-target when modul or tahun changes
  useEffect(() => {
    setTargetIdx(0);
    setPage(0);
  }, [modul, tahun]);

  if (role !== 'admin') {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-2">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <Lock className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Akses Khusus Admin</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Halaman Input Data (tambah, ubah, dan hapus baris Google Sheet) hanya aktif saat Anda masuk dengan peran Admin.
        </p>
      </div>
    );
  }

  if (!writeCapable) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Mode Baca Aktif — Penulisan Membutuhkan Service Account
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Karena login saat ini menggunakan kata sandi (tanpa login akun Google), aplikasi membaca seluruh data
              dashboard secara otomatis dari Google Sheets. Untuk mengaktifkan fitur{' '}
              <strong>Tambah / Edit / Hapus</strong> langsung ke Google Sheet dari halaman ini:
            </p>
            <ol className="list-decimal list-inside text-xs text-slate-600 dark:text-slate-300 space-y-1 pt-1">
              <li>Buat Service Account di Google Cloud Console dan salin isi file JSON-nya.</li>
              <li>
                Tambahkan sebagai secret bernama <code className="font-mono-num">GOOGLE_SERVICE_ACCOUNT_JSON</code> di
                pengaturan Secrets aplikasi.
              </li>
              <li>Bagikan Google Spreadsheet terkait sebagai <strong>Editor</strong> ke alamat email Service Account tersebut.</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const validateFields = (fields: InputFieldSchema[], vals: Record<number, string>): string | null => {
    for (const f of fields) {
      if (f.formula) continue;
      if (f.wajib && !String(vals[f.i] || '').trim()) {
        return `Kolom wajib "${f.label}" harus diisi.`;
      }
    }
    const colMasuk = fields.find((f) => /masuk/.test(f.label.toLowerCase()));
    const colKeluar = fields.find((f) => /keluar/.test(f.label.toLowerCase()));
    if (colMasuk && colKeluar) {
      const m = vals[colMasuk.i];
      const k = vals[colKeluar.i];
      if (m && k && k < m) {
        return `"${colKeluar.label}" tidak boleh lebih awal dari "${colMasuk.label}".`;
      }
    }
    return null;
  };

  const handleRequestAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schemaRes?.skema || !schemaRes.targetDef || !accessToken) return;
    const err = validateFields(schemaRes.skema.fields, formValues);
    if (err) {
      onToast(err, 'error');
      return;
    }

    // Check duplicate on unik keys before opening ConfirmModal
    let warningText: string | undefined;
    try {
      const target = schemaRes.targetDef;
      const dispMap = await batchGetFormattedValues(spreadsheetId, [target.sheet], accessToken, 'FORMATTED_VALUE');
      const dispRows = dispMap[target.sheet] || [];
      const unikCols = (target.unik && target.unik.length ? target.unik : [target.kunci])
        .map((uk) => schemaRes.skema!.fields.find((f) => norm_(f.label).includes(norm_(uk))))
        .filter((f): f is InputFieldSchema => Boolean(f));

      if (unikCols.length > 0) {
        const dupIdx = dispRows.slice(schemaRes.skema.mulai - 1).findIndex((row) =>
          unikCols.every((f) => norm_(row[f.i]) && norm_(row[f.i]) === norm_(formValues[f.i] || ''))
        );
        if (dupIdx >= 0) {
          const rowNum = schemaRes.skema.mulai + dupIdx;
          warningText = `Data serupa sudah tercatat pada baris ${rowNum} di sheet "${target.sheet}". Pastikan Anda tidak menambahkan duplikat.`;
        }
      }
    } catch {
      // ignore duplicate pre-check network error; allow confirmation
    }

    setPendingAction({
      kind: 'tambah',
      warningText,
      payload: { ...formValues },
    });
  };

  const handleOpenEdit = async (rowItem: InputBarisRow) => {
    if (!barisRes?.skema || !accessToken) return;
    setLoading(true);
    try {
      const range = `${quoteSheetName(barisRes.sheet)}!A${rowItem.r}:${colToA1(barisRes.skema.lastCol - 1)}${rowItem.r}`;
      const [rawRows, dispRows] = await Promise.all([
        getRawSheetRange(spreadsheetId, range, accessToken, 'UNFORMATTED_VALUE', 'SERIAL_NUMBER'),
        getRawSheetRange(spreadsheetId, range, accessToken, 'FORMATTED_VALUE', 'FORMATTED_STRING'),
      ]);
      const rawRow = rawRows[0] || [];
      const dispRow = dispRows[0] || [];
      const vals: Record<number, string> = {};
      barisRes.skema.fields.forEach((f) => {
        if (!f.formula) {
          vals[f.i] = formatSheetValueForForm(f, rawRow[f.i], String(dispRow[f.i] || ''));
        }
      });
      setEditingRow({ row1Based: rowItem.r, values: vals });
    } catch (err: any) {
      if (err?.name === 'SheetsAuthError') onAuthError();
      onToast(err?.message || 'Gagal membuka baris untuk diedit.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const executeConfirmedMutation = async () => {
    if (!pendingAction || !accessToken) return;
    setMutating(true);
    try {
      const meta: SpreadsheetMeta = await getSpreadsheetMeta(spreadsheetId, accessToken);

      if (pendingAction.kind === 'tambah') {
        if (!schemaRes?.skema || !schemaRes.targetDef) return;
        const sheetName = schemaRes.sheet;
        const shMeta = meta.sheets.find((s) => s.title === sheetName);
        if (!shMeta) throw new Error(`Sheet "${sheetName}" tidak ditemukan.`);

        const dispMap = await batchGetFormattedValues(spreadsheetId, [sheetName], accessToken, 'FORMATTED_VALUE');
        const dispRows = dispMap[sheetName] || [];
        const kcol = schemaRes.skema.kcol;

        // Find last occupied key row
        let lastUsedRow = schemaRes.skema.mulai - 1;
        for (let idx = dispRows.length - 1; idx >= schemaRes.skema.mulai - 1; idx--) {
          if (String(dispRows[idx]?.[kcol] || '').trim()) {
            lastUsedRow = idx + 1;
            break;
          }
        }
        const targetRow = Math.max(lastUsedRow + 1, schemaRes.skema.mulai);

        // Copy format & formulas from previous data row if available
        const formulaCols = schemaRes.skema.fields.filter((f) => f.formula).map((f) => f.i);
        if (lastUsedRow >= schemaRes.skema.mulai) {
          await copyRowFormatAndFormulas(
            spreadsheetId,
            shMeta.sheetId,
            lastUsedRow,
            targetRow,
            schemaRes.skema.lastCol,
            formulaCols,
            accessToken
          );
        }

        const updates: Array<{ range: string; values: any[][] }> = [];
        const logSummary: Record<string, string | number> = {};
        schemaRes.skema.fields.forEach((f) => {
          if (f.formula) return;
          const v = pendingAction.payload[f.i];
          if (v === undefined || v === '') return;
          const formatted = formatInputWriteValue(f, v);
          updates.push({
            range: `${quoteSheetName(sheetName)}!${colToA1(f.i)}${targetRow}`,
            values: [[formatted]],
          });
          logSummary[f.label] = formatted;
        });

        await updateSheetValuesBatch(spreadsheetId, updates, accessToken);
        await ensureLogSheetAndAppend(
          spreadsheetId,
          meta,
          LOG_INPUT,
          [
            new Date().toLocaleString('id-ID'),
            'admin',
            tahun,
            modul,
            sheetName,
            targetRow,
            JSON.stringify(logSummary),
          ],
          accessToken
        );

        onToast(`Berhasil menambahkan data ke baris ${targetRow} di "${sheetName}".`, 'success');
        setFormValues({});
      } else if (pendingAction.kind === 'ubah') {
        if (!barisRes?.skema) return;
        const sheetName = barisRes.sheet;
        const targetRow = pendingAction.row1Based;
        const updates: Array<{ range: string; values: any[][] }> = [];
        const logSummary: Record<string, string | number> = {};

        barisRes.skema.fields.forEach((f) => {
          if (f.formula) return;
          const v = pendingAction.payload[f.i] ?? '';
          const formatted = formatInputWriteValue(f, v);
          updates.push({
            range: `${quoteSheetName(sheetName)}!${colToA1(f.i)}${targetRow}`,
            values: [[formatted]],
          });
          if (formatted !== '') logSummary[f.label] = formatted;
        });

        await updateSheetValuesBatch(spreadsheetId, updates, accessToken);
        await ensureLogSheetAndAppend(
          spreadsheetId,
          meta,
          LOG_INPUT,
          [
            new Date().toLocaleString('id-ID'),
            'admin (edit)',
            tahun,
            modul,
            sheetName,
            targetRow,
            JSON.stringify(logSummary),
          ],
          accessToken
        );

        onToast(`Baris ${targetRow} di "${sheetName}" berhasil diperbarui.`, 'success');
        setEditingRow(null);
      } else if (pendingAction.kind === 'hapus') {
        if (!barisRes) return;
        const sheetName = barisRes.sheet;
        const shMeta = meta.sheets.find((s) => s.title === sheetName);
        if (!shMeta) throw new Error(`Sheet "${sheetName}" tidak ditemukan.`);

        await deleteSheetRow(spreadsheetId, shMeta.sheetId, pendingAction.row1Based, accessToken);
        await ensureLogSheetAndAppend(
          spreadsheetId,
          meta,
          LOG_INPUT,
          [
            new Date().toLocaleString('id-ID'),
            'admin (hapus)',
            tahun,
            modul,
            sheetName,
            pendingAction.row1Based,
            pendingAction.label,
          ],
          accessToken
        );

        onToast(`Baris ${pendingAction.row1Based} berhasil dihapus dari "${sheetName}".`, 'success');
      }

      setPendingAction(null);
      await loadData();
      onDataMutated();
    } catch (err: any) {
      if (err?.name === 'SheetsAuthError') onAuthError();
      onToast(err?.message || 'Gagal menyimpan perubahan ke Google Sheet.', 'error');
    } finally {
      setMutating(false);
    }
  };

  const activeTargets = mode === 'tambah' ? schemaRes?.targets || [] : barisRes?.targets || [];
  const activeSheetName = mode === 'tambah' ? schemaRes?.sheet || '' : barisRes?.sheet || '';

  return (
    <div className="space-y-4">
      {/* Top Control Header */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMode('tambah')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition ${
                mode === 'tambah'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              Tambah data
            </button>
            <button
              type="button"
              onClick={() => setMode('kelola')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition ${
                mode === 'kelola'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit / Hapus
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {MODULES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModul(m.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  modul === m.id
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-600'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {activeTargets.length > 1 && (
          <select
            value={targetIdx}
            onChange={(e) => setTargetIdx(Number(e.target.value))}
            aria-label="Pilih sheet tujuan"
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium"
          >
            {activeTargets.map((t) => (
              <option key={t.idx} value={t.idx}>
                Sheet: {t.nama}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Memuat struktur kolom dari Google Sheet...</span>
        </div>
      )}

      {!loading && errorMsg && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs text-rose-700 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      {!loading && !errorMsg && mode === 'tambah' && schemaRes?.pesan && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center text-xs text-slate-500">
          {schemaRes.pesan}
        </div>
      )}

      {/* ADD FORM */}
      {!loading && !errorMsg && mode === 'tambah' && schemaRes?.skema && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <form
            onSubmit={handleRequestAdd}
            className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4"
          >
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Tambah baris baru · {schemaRes.sheet}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kolom dengan rumus otomatis diisi Google Sheet. Kolom bertanda * wajib diisi.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {schemaRes.skema.fields
                .filter((f) => !f.formula)
                .map((f) => {
                  const listId = f.opsi.length ? `dl-${modul}-${f.i}` : undefined;
                  const val = formValues[f.i] || '';
                  return (
                    <div key={f.i} className={f.label.length > 26 ? 'sm:col-span-2' : ''}>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {f.label} {f.wajib && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type={
                          f.tipe === 'tgl'
                            ? 'date'
                            : f.tipe === 'bulan'
                            ? 'month'
                            : f.tipe === 'angka'
                            ? 'number'
                            : 'text'
                        }
                        step={f.tipe === 'angka' ? 'any' : undefined}
                        list={listId}
                        required={f.wajib}
                        value={val}
                        onChange={(e) => setFormValues((prev) => ({ ...prev, [f.i]: e.target.value }))}
                        placeholder={f.opsi.length ? 'Pilih atau ketik nilai...' : `Masukkan ${f.label.toLowerCase()}`}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                      />
                      {listId && (
                        <datalist id={listId}>
                          {f.opsi.map((opt) => (
                            <option key={opt} value={opt} />
                          ))}
                        </datalist>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setFormValues({})}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Bersihkan
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-semibold"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Simpan ke Google Sheet
              </button>
            </div>
          </form>

          {/* 8 Recent Rows Preview */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">8 baris terakhir di sheet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Referensi format data terkini</p>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase text-slate-500">
                  <tr>
                    {schemaRes.skema.pratinjauKepala.map((k) => (
                      <th key={k} className="px-3 py-2 font-semibold whitespace-nowrap">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {schemaRes.skema.terakhir.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 max-w-[160px] truncate" title={cell}>
                          {cell || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!schemaRes.skema.terakhir.length && (
                    <tr>
                      <td
                        colSpan={Math.max(1, schemaRes.skema.pratinjauKepala.length)}
                        className="px-3 py-6 text-center text-slate-400"
                      >
                        Belum ada data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE (EDIT / DELETE) TABLE */}
      {!loading && !errorMsg && mode === 'kelola' && barisRes && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Kelola baris · {barisRes.sheet}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {barisRes.total} baris ditemukan (urutan terbaru di atas)
              </p>
            </div>
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Cari di seluruh kolom sheet..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 py-1.5 text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Baris</th>
                  {barisRes.kepala.map((k) => (
                    <th key={k} className="px-3 py-2 font-semibold whitespace-nowrap">
                      {k}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {barisRes.rows.map((rowItem) => (
                  <tr key={rowItem.r} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2 font-mono-num text-slate-500">#{rowItem.r}</td>
                    {rowItem.c.map((cell, idx) => (
                      <td key={idx} className="px-3 py-2 max-w-[190px] truncate" title={cell}>
                        {cell || '—'}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(rowItem)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPendingAction({
                              kind: 'hapus',
                              row1Based: rowItem.r,
                              label: rowItem.k,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-rose-200 dark:border-rose-800/70 px-2 py-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="w-3 h-3" /> Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!barisRes.rows.length && (
                  <tr>
                    <td
                      colSpan={barisRes.kepala.length + 2}
                      className="px-4 py-8 text-center text-slate-400"
                    >
                      Tidak ada baris yang cocok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {barisRes.pages > 1 && (
            <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Halaman {barisRes.hal + 1} dari {barisRes.pages}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={barisRes.hal <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={barisRes.hal >= barisRes.pages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 disabled:opacity-40"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingRow && barisRes?.skema && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Edit Baris #{editingRow.row1Based} · {barisRes.sheet}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ubah nilai kolom non-rumus</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
              {barisRes.skema.fields
                .filter((f) => !f.formula)
                .map((f) => (
                  <div key={f.i} className={f.label.length > 26 ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {f.label} {f.wajib && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type={
                        f.tipe === 'tgl'
                          ? 'date'
                          : f.tipe === 'bulan'
                          ? 'month'
                          : f.tipe === 'angka'
                          ? 'number'
                          : 'text'
                      }
                      step={f.tipe === 'angka' ? 'any' : undefined}
                      value={editingRow.values[f.i] || ''}
                      onChange={(e) =>
                        setEditingRow((prev) =>
                          prev
                            ? {
                                ...prev,
                                values: { ...prev.values, [f.i]: e.target.value },
                              }
                            : null
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs"
                    />
                  </div>
                ))}
            </div>

            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const err = validateFields(barisRes.skema!.fields, editingRow.values);
                  if (err) {
                    onToast(err, 'error');
                    return;
                  }
                  setPendingAction({
                    kind: 'ubah',
                    row1Based: editingRow.row1Based,
                    payload: editingRow.values,
                  });
                }}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-semibold"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Confirmation Modal */}
      <ConfirmModal
        open={Boolean(pendingAction)}
        actionType={pendingAction?.kind || 'tambah'}
        title={
          pendingAction?.kind === 'hapus'
            ? `Konfirmasi Hapus Baris #${pendingAction.row1Based}`
            : pendingAction?.kind === 'ubah'
            ? `Konfirmasi Perubahan Baris #${pendingAction.row1Based}`
            : 'Konfirmasi Tambah Data ke Google Sheet'
        }
        description={
          pendingAction?.kind === 'hapus'
            ? 'Tindakan ini akan menghapus baris secara permanen di Google Sheet.'
            : 'Perubahan akan langsung ditulis ke Google Sheet dan dicatat di LOG INPUT.'
        }
        spreadsheetId={spreadsheetId}
        sheetName={activeSheetName}
        warningText={pendingAction?.kind === 'tambah' ? pendingAction.warningText : undefined}
        details={
          pendingAction?.kind === 'hapus'
            ? [{ label: 'Data kunci', value: pendingAction.label }]
            : pendingAction
            ? Object.entries(pendingAction.payload)
                .filter(([, v]) => v !== '')
                .slice(0, 5)
                .map(([idx, val]) => {
                  const fld = (mode === 'tambah' ? schemaRes?.skema?.fields : barisRes?.skema?.fields)?.find(
                    (f) => f.i === Number(idx)
                  );
                  return { label: fld?.label || `Kolom ${idx}`, value: val };
                })
            : undefined
        }
        confirmLabel={
          pendingAction?.kind === 'hapus'
            ? 'Ya, Hapus Baris'
            : pendingAction?.kind === 'ubah'
            ? 'Ya, Simpan Perubahan'
            : 'Ya, Tambah Data'
        }
        loading={mutating}
        onConfirm={executeConfirmedMutation}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
};
