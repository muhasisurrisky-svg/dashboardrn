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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl rounded-2xl border border-[#E5DFD0] dark:border-[#23353B] bg-white dark:bg-[#0D1619] shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5DFD0] dark:border-[#1D2D32] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FBF5E4] dark:bg-[#142226] border border-[#D4AF37]/40 text-[#8E6510] dark:text-[#E6C45A] flex items-center justify-center">
              {tab === 'sheets' ? <Settings2 className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-slate-950 dark:text-white">Pengaturan Admin</h3>
              <p className="text-xs text-slate-500 dark:text-[#9CA8AA]">
                Kelola ID Google Spreadsheet dan kata sandi akses dashboard
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="px-5 pt-3 border-b border-[#E5DFD0] dark:border-[#1D2D32] flex gap-2">
          <button
            type="button"
            onClick={() => setTab('sheets')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
              tab === 'sheets'
                ? 'border-[#C69320] text-[#8E6510] dark:border-[#E6C45A] dark:text-[#E6C45A]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Sumber Google Sheet
          </button>
          <button
            type="button"
            onClick={() => setTab('passwords')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
              tab === 'passwords'
                ? 'border-[#C69320] text-[#8E6510] dark:border-[#E6C45A] dark:text-[#E6C45A]'
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
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#D5CFC2] mb-1">
                    {f.label}
                  </label>
                  <input
                    type="text"
                    value={draft[f.key]}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [f.key]: extractSpreadsheetId(e.target.value) }))
                    }
                    className="w-full rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-[#FAF8F2] dark:bg-[#111D21] px-3 py-2 text-xs font-mono-num text-slate-900 dark:text-[#F4EFE4] focus:outline-none focus:ring-2 focus:ring-[#C69320]/30 focus:border-[#C69320]"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-[#7E8C8F] mt-1">{f.hint}</p>
                </div>
              ))}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#D5CFC2] mb-1">
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
                  className="rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-[#FAF8F2] dark:bg-[#111D21] px-3 py-2 text-xs text-slate-900 dark:text-[#F4EFE4]"
                >
                  <option value="2026">Spreadsheet 2026</option>
                  <option value="2027">Spreadsheet 2027</option>
                </select>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-[#FAF8F2] dark:bg-[#091114] border-t border-[#E5DFD0] dark:border-[#1D2D32] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setDraft({ ...DEFAULT_SPREADSHEETS })}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-[#9CA8AA] hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset ke bawaan
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-white dark:bg-[#111D21] px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-[#E5DFD0] hover:bg-stone-100 dark:hover:bg-[#16262B] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSave(draft);
                    onClose();
                  }}
                  className="rounded-lg bg-gradient-to-r from-[#B88B28] to-[#D4AF37] hover:brightness-105 text-[#070D0F] px-4 py-2 text-xs font-extrabold shadow-sm cursor-pointer"
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#D5CFC2] mb-1">
                  Sandi User (Mode Baca)
                </label>
                {authStatus?.envUserConfigured ? (
                  <p className="text-xs text-slate-500 dark:text-[#9CA8AA]">
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
                      className="w-full rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-[#FAF8F2] dark:bg-[#111D21] px-3 py-2 text-xs text-slate-900 dark:text-[#F4EFE4] focus:outline-none focus:ring-2 focus:ring-[#C69320]/30"
                    />
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#D5CFC2] mb-1">
                  Sandi Admin Baru
                </label>
                {authStatus?.envAdminConfigured ? (
                  <p className="text-xs text-slate-500 dark:text-[#9CA8AA]">
                    Sandi Admin saat ini dikelola melalui environment secret <code className="font-mono-num">ADMIN_PASSWORD</code>.
                  </p>
                ) : (
                  <input
                    type="password"
                    minLength={4}
                    value={newAdminPw}
                    onChange={(e) => setNewAdminPw(e.target.value)}
                    placeholder="Kosongkan jika tidak ingin mengubah (isi min. 4 karakter)"
                    className="w-full rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-[#FAF8F2] dark:bg-[#111D21] px-3 py-2 text-xs text-slate-900 dark:text-[#F4EFE4] focus:outline-none focus:ring-2 focus:ring-[#C69320]/30"
                  />
                )}
              </div>
            </div>

            <div className="px-5 py-3.5 bg-[#FAF8F2] dark:bg-[#091114] border-t border-[#E5DFD0] dark:border-[#1D2D32] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-white dark:bg-[#111D21] px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-[#E5DFD0] cursor-pointer"
              >
                Tutup
              </button>
              {(!authStatus?.envAdminConfigured || !authStatus?.envUserConfigured) && (
                <button
                  type="submit"
                  disabled={savingPw}
                  className="rounded-lg bg-gradient-to-r from-[#B88B28] to-[#D4AF37] hover:brightness-105 text-[#070D0F] px-4 py-2 text-xs font-extrabold shadow-sm disabled:opacity-60 cursor-pointer"
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
