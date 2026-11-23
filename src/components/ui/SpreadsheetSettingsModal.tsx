import React, { useEffect, useState } from 'react';
import { KeyRound, RotateCcw, Settings2, X } from 'lucide-react';
import { DEFAULT_SPREADSHEETS, extractSpreadsheetId } from '../../config/spreadsheets';
import { updateServerPasswords, type AuthStatus } from '../../services/passwordAuth';
import type { SpreadsheetConfig } from '../../types/dashboard';

interface SpreadsheetSettingsModalProps {
  open: boolean;
  config: SpreadsheetConfig;
  token: string;
  authStatus: AuthStatus | null;
  onSave: (next: SpreadsheetConfig) => void;
  onPasswordsUpdated: () => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
  onClose: () => void;
}

export const SpreadsheetSettingsModal: React.FC<SpreadsheetSettingsModalProps> = ({
  open,
  config,
  token,
  authStatus,
  onSave,
  onPasswordsUpdated,
  onToast,
  onClose,
}) => {
  const [tab, setTab] = useState<'sheets' | 'passwords'>('sheets');
  const [draft, setDraft] = useState<SpreadsheetConfig>(config);
  const [newAdminPw, setNewAdminPw] = useState('');
  const [newUserPw, setNewUserPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(config);
      setNewAdminPw('');
      setNewUserPw('');
    }
  }, [open, config]);

  if (!open) return null;

  const fields: Array<{ key: keyof Omit<SpreadsheetConfig, 'aparTahunFasilitas'>; label: string; hint: string }> = [
    { key: 'id2026', label: 'Spreadsheet Perencanaan 2026', hint: 'ZFM01, Pengadaan, Program, Nusantara, Suku Cadang, APAR' },
    { key: 'id2025', label: 'Spreadsheet Perencanaan 2025', hint: 'RKAD, UMDS/SPK/Kontrak, Penugasan, Program' },
    { key: 'id2027', label: 'Spreadsheet Perencanaan 2027', hint: 'Data monitoring tahun 2027' },
    { key: 'idProlis', label: 'Spreadsheet PROLIS (Unit Fasilitas)', hint: 'Sheet PROLIS — BALAI YASA SURABAYA GUBENG' },
    { key: 'idBysgu', label: 'Spreadsheet BY SGU (Unit Fasilitas)', hint: 'Sheet BYSGU — Kelayakan Kelas A' },
  ];

  const handleSavePasswords = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPw && !newUserPw) {
      onToast('Isi minimal salah satu sandi baru.', 'error');
      return;
    }
    setSavingPw(true);
    try {
      await updateServerPasswords(token, {
        newAdminPassword: newAdminPw || undefined,
        newUserPassword: newUserPw || undefined,
      });
      setNewAdminPw('');
      setNewUserPw('');
      onPasswordsUpdated();
      onToast('Kata sandi berhasil diperbarui.', 'success');
    } catch (err: any) {
      onToast(err?.message || 'Gagal memperbarui kata sandi.', 'error');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              {tab === 'sheets' ? <Settings2 className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Pengaturan Admin</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kelola ID Google Spreadsheet dan kata sandi akses dashboard
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={() => setTab('sheets')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition ${
              tab === 'sheets'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Sumber Google Sheet
          </button>
          <button
            type="button"
            onClick={() => setTab('passwords')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition ${
              tab === 'passwords'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Kata Sandi Akses
          </button>
        </div>

        {tab === 'sheets' ? (
          <>
            <div className="px-5 py-4 space-y-3.5 max-h-[60vh] overflow-y-auto">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    {f.label}
                  </label>
                  <input
                    type="text"
                    value={draft[f.key]}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [f.key]: extractSpreadsheetId(e.target.value) }))
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono-num text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{f.hint}</p>
                </div>
              ))}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Sumber Tahun APAR di Unit Fasilitas
                </label>
                <select
                  value={draft.aparTahunFasilitas}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      aparTahunFasilitas: e.target.value === '2027' ? '2027' : '2026',
                    }))
                  }
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-slate-100"
                >
                  <option value="2026">Spreadsheet 2026</option>
                  <option value="2027">Spreadsheet 2027</option>
                </select>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setDraft({ ...DEFAULT_SPREADSHEETS })}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset ke bawaan
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSave(draft);
                    onClose();
                  }}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-semibold"
                >
                  Simpan & Muat Ulang
                </button>
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={handleSavePasswords}>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Sandi User (Mode Baca)
                </label>
                {authStatus?.envUserConfigured ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sandi User saat ini dikelola melalui environment secret <code className="font-mono-num">USER_PASSWORD</code>.
                  </p>
                ) : (
                  <>
                    <input
                      type="password"
                      minLength={4}
                      value={newUserPw}
                      onChange={(e) => setNewUserPw(e.target.value)}
                      placeholder={
                        authStatus?.userPasswordConfigured
                          ? 'Kosongkan jika tidak ingin mengubah (isi min. 4 karakter)'
                          : 'Belum diatur — isi min. 4 karakter untuk mengaktifkan akun User'
                      }
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                    />
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Sandi Admin Baru
                </label>
                {authStatus?.envAdminConfigured ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sandi Admin saat ini dikelola melalui environment secret <code className="font-mono-num">ADMIN_PASSWORD</code>.
                  </p>
                ) : (
                  <input
                    type="password"
                    minLength={4}
                    value={newAdminPw}
                    onChange={(e) => setNewAdminPw(e.target.value)}
                    placeholder="Kosongkan jika tidak ingin mengubah (isi min. 4 karakter)"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                  />
                )}
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold"
              >
                Tutup
              </button>
              {(!authStatus?.envAdminConfigured || !authStatus?.envUserConfigured) && (
                <button
                  type="submit"
                  disabled={savingPw}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-semibold disabled:opacity-60"
                >
                  {savingPw ? 'Menyimpan...' : 'Simpan Sandi'}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
