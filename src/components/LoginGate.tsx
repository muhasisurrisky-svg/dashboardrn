import React, { useState } from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
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
    <div className="relative min-h-screen overflow-hidden bg-[#060C0E] text-[#F7F3E9] flex flex-col justify-between">
      {/* Full-bleed Nusantara Explorer Wallpaper */}
      <div className="absolute inset-0 z-0">
        <img
          src="/assets/aistudio/IMG_8405__1__f7523b3f.JPG"
          alt="Kereta The Nusantara Explorer di Balai Yasa"
          className="w-full h-full object-cover object-center scale-[1.02]"
          decoding="async"
          fetchPriority="high"
        />
        {/* Measured contrast scrim preserving gold Kawung details on train body */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(115deg, rgba(6,12,14,0.88) 0%, rgba(8,15,18,0.62) 48%, rgba(6,12,14,0.92) 100%)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 24% 62%, rgba(212,175,55,0.14), transparent 55%)',
          }}
        />
      </div>

      {/* Top Brand Header */}
      <header className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-5 pb-3 flex items-center justify-between gap-4">
        <DanantaraLogo forceVariant="dark" />
        <KaiRightLogos forceVariant="dark" />
      </header>

      {/* Main Split Content */}
      <main className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-10">
        {/* Left Editorial Identity */}
        <div className="lg:col-span-6 space-y-4 animate-card-rise">
          <div className="inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.18em] text-[#E6C45A]">
            <span className="h-px w-8 bg-[#D4AF37]" aria-hidden="true" />
            <span>The Nusantara Explorer Palette</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight text-white leading-[1.12] text-balance">
            Dashboard Monitoring{' '}
            <span className="text-[#E6C45A]">Balai Yasa Surabaya Gubeng</span>
          </h1>
          <p className="text-sm sm:text-base text-[#D7D2C5] max-w-xl leading-relaxed font-medium">
            Pemantauan terpadu kinerja Unit Perencanaan dan Unit Fasilitas — anggaran, pengadaan,
            realisasi program perawatan, Nusantara Explorer, suku cadang, dan kelayakan fasilitas.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-[#C9C1B0]">
            <span>UPT Balai Yasa Surabaya Gubeng</span>
            <span className="text-[#D4AF37]" aria-hidden="true">·</span>
            <span>Sinkronisasi Langsung Google Sheets</span>
          </div>
        </div>

        {/* Right Obsidian-Gold Login Card */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto lg:mr-0 lg:ml-auto animate-dash-slide">
          <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#0A1316]/88 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.65)] p-6 sm:p-7 space-y-5">
            <div className="space-y-1">
              <div className="h-1 w-12 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F3DFA2] mb-3" />
              <h2 className="font-display text-xl font-extrabold tracking-tight text-white">
                {authStatus.initialized ? 'Masuk ke Dashboard' : 'Pengaturan Sandi Awal'}
              </h2>
              <p className="text-xs text-[#B7B0A0] font-medium">
                {authStatus.initialized
                  ? 'Pilih peran akses lalu masukkan kata sandi untuk melanjutkan.'
                  : 'Atur kata sandi Admin terlebih dahulu untuk mengamankan akses dashboard.'}
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/60 px-3.5 py-2.5 text-xs font-medium text-rose-200">
                {error}
              </div>
            )}

            {!authStatus.initialized ? (
              <form onSubmit={handleSubmitSetup} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#E6DFD0] mb-1.5">
                    Kata Sandi Admin <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showSetupPw ? 'text' : 'password'}
                      required
                      minLength={4}
                      value={setupAdminPw}
                      onChange={(e) => setSetupAdminPw(e.target.value)}
                      placeholder="Minimal 4 karakter"
                      autoFocus
                      className="w-full rounded-xl border border-[#24363B] bg-[#0F1B1F] pl-9 pr-10 py-2.5 text-xs font-medium text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/35 focus:border-[#D4AF37]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSetupPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#E6C45A]"
                      aria-label="Tampilkan sandi"
                    >
                      {showSetupPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#E6DFD0] mb-1.5">
                    Kata Sandi User (Opsional)
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showSetupPw ? 'text' : 'password'}
                      minLength={4}
                      value={setupUserPw}
                      onChange={(e) => setSetupUserPw(e.target.value)}
                      placeholder="Sandi untuk mode baca (bisa diatur nanti)"
                      className="w-full rounded-xl border border-[#24363B] bg-[#0F1B1F] pl-9 pr-3 py-2.5 text-xs font-medium text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/35 focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || setupAdminPw.length < 4}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C89B32] via-[#DCAC44] to-[#E8C563] text-[#070D0F] px-4 py-3 text-xs font-extrabold tracking-wide shadow-lg shadow-black/30 hover:brightness-105 active:scale-[0.99] transition disabled:opacity-55 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>{loading ? 'Menyimpan...' : 'Simpan Sandi & Masuk'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmitLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#E6DFD0]">Peran Akses</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onChangeRole('admin')}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition cursor-pointer ${
                        selectedRole === 'admin'
                          ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#F5DFA0] shadow-[inset_0_0_0_1px_rgba(212,175,55,0.25)]'
                          : 'border-[#223338] bg-[#0F1A1E] text-[#A8B2B5] hover:border-[#D4AF37]/40 hover:text-white'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeRole('user')}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition cursor-pointer ${
                        selectedRole === 'user'
                          ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#F5DFA0] shadow-[inset_0_0_0_1px_rgba(212,175,55,0.25)]'
                          : 'border-[#223338] bg-[#0F1A1E] text-[#A8B2B5] hover:border-[#D4AF37]/40 hover:text-white'
                      }`}
                    >
                      <UserIcon className="w-4 h-4" />
                      User (Baca)
                    </button>
                  </div>
                  <p className="text-[11px] text-[#9BA39F]">
                    {selectedRole === 'admin'
                      ? 'Akses penuh termasuk pengaturan ID spreadsheet dan input data.'
                      : 'Akses monitoring read-only tanpa menu Input Data atau edit.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#E6DFD0] mb-1.5">
                    Kata Sandi {selectedRole === 'admin' ? 'Admin' : 'User'}
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={`Masukkan kata sandi ${selectedRole === 'admin' ? 'Admin' : 'User'}...`}
                      autoFocus
                      className="w-full rounded-xl border border-[#24363B] bg-[#0F1B1F] pl-9 pr-10 py-2.5 text-xs font-medium text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/35 focus:border-[#D4AF37]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#E6C45A]"
                      aria-label="Tampilkan sandi"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !password}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C89B32] via-[#DCAC44] to-[#E8C563] text-[#070D0F] px-4 py-3 text-xs font-extrabold tracking-wide shadow-lg shadow-black/30 hover:brightness-105 active:scale-[0.99] transition disabled:opacity-55 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>{loading ? 'Memeriksa sandi...' : 'Masuk Dashboard'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="relative z-10 text-center text-[11px] font-medium text-[#BDB6A6] pb-4 px-4">
        PT Kereta Api Indonesia (Persero) · UPT Balai Yasa Surabaya Gubeng
      </footer>
    </div>
  );
};
