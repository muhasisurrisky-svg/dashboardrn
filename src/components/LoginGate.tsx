import React, { useState } from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { DanantaraLogo, KaiRightLogos } from './BrandLogos';
import type { AuthStatus } from '../services/passwordAuth';
import type { UserRole } from '../types/dashboard';

interface LoginGateProps {
  authStatus: AuthStatus;
  selectedRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  loading: boolean;
  error: string | null;
  onLogin: (role: UserRole, password: string) => void;
  onSetupInitial: (adminPassword: string, userPassword: string) => void;
}

export const LoginGate: React.FC<LoginGateProps> = ({
  authStatus,
  selectedRole,
  onChangeRole,
  loading,
  error,
  onLogin,
  onSetupInitial,
}) => {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  // First-run initial password setup state (when ADMIN_PASSWORD env & stored hash are both absent)
  const [setupAdminPw, setSetupAdminPw] = useState('');
  const [setupUserPw, setSetupUserPw] = useState('');
  const [showSetupPw, setShowSetupPw] = useState(false);

  const handleSubmitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || loading) return;
    onLogin(selectedRole, password);
  };

  const handleSubmitSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupAdminPw || loading) return;
    onSetupInitial(setupAdminPw, setupUserPw);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 sm:p-6">
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between pt-2">
        <DanantaraLogo />
        <KaiRightLogos />
      </div>

      <main className="max-w-md w-full mx-auto my-8">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="space-y-1.5 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/50 px-3 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
              <Lock className="w-3.5 h-3.5" />
              {authStatus.initialized ? 'Akses Menggunakan Kata Sandi' : 'Pengaturan Sandi Awal'}
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 pt-1">
              Dashboard Monitoring Balai Yasa
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              UPT Balai Yasa Surabaya Gubeng · Unit Perencanaan &amp; Unit Fasilitas
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-800/70 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {!authStatus.initialized ? (
            <form onSubmit={handleSubmitSetup} className="space-y-4">
              <div className="rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/30 p-3 text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                Sandi Admin belum diatur. Buat kata sandi Admin terlebih dahulu untuk mengamankan akses dashboard dan
                pengelolaan data.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Kata Sandi Admin <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showSetupPw ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={setupAdminPw}
                    onChange={(e) => setSetupAdminPw(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-10 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSetupPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Tampilkan sandi"
                  >
                    {showSetupPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Kata Sandi User (Opsional)
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showSetupPw ? 'text' : 'password'}
                    minLength={4}
                    value={setupUserPw}
                    onChange={(e) => setSetupUserPw(e.target.value)}
                    placeholder="Sandi untuk mode baca (bisa diatur nanti)"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || setupAdminPw.length < 4}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 text-xs font-semibold transition disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>{loading ? 'Menyimpan...' : 'Simpan Sandi & Masuk sebagai Admin'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmitLogin} className="space-y-4">
              {/* Role Toggle */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Masuk sebagai
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onChangeRole('admin')}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                      selectedRole === 'admin'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeRole('user')}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                      selectedRole === 'user'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <UserIcon className="w-4 h-4" />
                    User (Baca)
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {selectedRole === 'admin'
                    ? 'Admin dapat melihat sumber sheet, mengatur ID spreadsheet, dan mengelola data.'
                    : 'User hanya membaca dashboard monitoring tanpa akses menu Input Data atau edit.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Kata Sandi {selectedRole === 'admin' ? 'Admin' : 'User'}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={`Masukkan kata sandi ${selectedRole === 'admin' ? 'Admin' : 'User'}...`}
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-10 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    aria-label="Tampilkan sandi"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 text-xs font-semibold transition disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>{loading ? 'Memeriksa sandi...' : 'Masuk Dashboard'}</span>
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="text-center text-[11px] text-slate-400 dark:text-slate-500 pb-2">
        PT Kereta Api Indonesia (Persero) · UPT Balai Yasa Surabaya Gubeng
      </footer>
    </div>
  );
};
