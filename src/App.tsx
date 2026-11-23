import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { staggerContainerVariants } from './components/ui/MotionPrimitives';
import {
  AlertTriangle,
  Building2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Edit,
  Flame,
  LayoutDashboard,
  LogOut,
  Maximize2,
  Menu,
  Minimize2,
  Moon,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Presentation,
  RefreshCw,
  Settings2,
  ShoppingCart,
  Sun,
  Train,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { DanantaraLogo, KaiRightLogos } from './components/BrandLogos';
import { LoginGate } from './components/LoginGate';
import { SumberCard } from './components/ui/SumberCard';
import { SpreadsheetSettingsModal } from './components/ui/SpreadsheetSettingsModal';
import { RingkasanView } from './components/views/RingkasanView';
import { AnggaranView } from './components/views/AnggaranView';
import { PengadaanView } from './components/views/PengadaanView';
import { ProgramView } from './components/views/ProgramView';
import { NusantaraView } from './components/views/NusantaraView';
import { SukuCadangView } from './components/views/SukuCadangView';
import { AparView } from './components/views/AparView';
import { PenugasanView } from './components/views/PenugasanView';
import { InputDataView } from './components/views/InputDataView';
import {
  FasilitasKelayakanView,
  FasilitasProlisView,
  FasilitasRingkasanView,
} from './components/views/FasilitasViews';
import {
  getSpreadsheetIdByYear,
  loadSpreadsheetConfig,
  saveSpreadsheetConfig,
} from './config/spreadsheets';
import {
  fetchAparFromSheets,
  fetchDashboardFromSheets,
  fetchFasilitasFromSheets,
} from './services/dashboardParser';
import {
  clearMemorySession,
  fetchAuthStatus,
  getMemorySession,
  loginWithPassword,
  setupInitialPasswords,
  type AuthSession,
  type AuthStatus,
} from './services/passwordAuth';
import { getSpreadsheetMeta, type SpreadsheetMeta } from './services/sheetsApi';
import type {
  AparData,
  DashboardData,
  FasilitasData,
  SheetSourceLink,
  SpreadsheetConfig,
  TabId,
  TahunType,
  TriwulanType,
  UnitType,
  UserRole,
} from './types/dashboard';

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function App() {
  /* ---------------- Theme ---------------- */
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('by_sgu_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem('by_sgu_theme', isDark ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [isDark]);

  /* ---------------- Password Auth State ---------------- */
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [session, setSession] = useState<AuthSession | null>(() => getMemorySession());
  const [selectedLoginRole, setSelectedLoginRole] = useState<UserRole>('admin');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshAuthStatus = useCallback(async () => {
    try {
      const st = await fetchAuthStatus();
      setAuthStatus(st);
    } catch (err: any) {
      setAuthError(err?.message || 'Gagal terhubung ke server.');
    }
  }, []);

  useEffect(() => {
    refreshAuthStatus();
  }, [refreshAuthStatus]);

  /* ---------------- App Navigation & Global Filters ---------------- */
  const [unit, setUnit] = useState<UnitType>('perencanaan');
  const [tahun, setTahun] = useState<TahunType>('2026');
  const [tw, setTw] = useState<TriwulanType>('all');
  const [activeTab, setActiveTab] = useState<TabId>('ringkasan');

  const [presetProg, setPresetProg] = useState<string | null>(null);
  const [presetPbjKat, setPresetPbjKat] = useState<string | null>(null);

  /* ---------------- Shell State ---------------- */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [presMode, setPresMode] = useState(false);
  const [presZoom, setPresZoom] = useState(95);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  /* ---------------- Sheet Config & Data State ---------------- */
  const [sheetConfig, setSheetConfig] = useState<SpreadsheetConfig>(() => loadSpreadsheetConfig());
  const [dashCache, setDashCache] = useState<Record<string, DashboardData>>({});
  const [aparCache, setAparCache] = useState<Record<string, AparData>>({});
  const [fasCache, setFasCache] = useState<FasilitasData | null>(null);

  const [loadingMain, setLoadingMain] = useState(false);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dataBatchKey, setDataBatchKey] = useState(0);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4200);
  }, []);

  const handleAuthError = useCallback(() => {
    clearMemorySession();
    setSession(null);
    setAuthError('Sesi Anda telah berakhir. Silakan masukkan kata sandi kembali.');
  }, []);

  const handlePasswordLogin = async (loginRole: UserRole, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const s = await loginWithPassword(loginRole, password);
      setSession(s);
    } catch (err: any) {
      setAuthError(err?.message || 'Kata sandi salah.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSetupInitial = async (adminPassword: string, userPassword: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const s = await setupInitialPasswords(adminPassword, userPassword);
      setSession(s);
      await refreshAuthStatus();
    } catch (err: any) {
      setAuthError(err?.message || 'Gagal menyimpan kata sandi awal.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = (nextRole?: UserRole) => {
    clearMemorySession();
    setSession(null);
    setDashCache({});
    setAparCache({});
    setFasCache(null);
    setAuthError(null);
    if (nextRole) setSelectedLoginRole(nextRole);
  };

  const accessToken = session?.token || null;
  const role: UserRole = session?.role || 'user';

  /* ---------------- Data Loaders ---------------- */
  const loadPerencanaan = useCallback(
    async (yr: TahunType, force = false) => {
      if (!accessToken) return;
      if (!force && dashCache[yr]) return;
      const ssId = getSpreadsheetIdByYear(sheetConfig, yr);
      setLoadingMain(true);
      setLoadError(null);
      try {
        const meta = await getSpreadsheetMeta(ssId, accessToken);
        const data = await fetchDashboardFromSheets(ssId, yr, accessToken, meta);
        setDashCache((prev) => ({ ...prev, [yr]: data }));
        setDataBatchKey((k) => k + 1);

        if (yr !== '2025') {
          try {
            const apar = await fetchAparFromSheets(ssId, accessToken, meta);
            setAparCache((prev) => ({ ...prev, [yr]: apar }));
          } catch {
            // APAR optional on some sheets
          }
        }
      } catch (err: any) {
        if (err?.name === 'SheetsAuthError') {
          handleAuthError();
        } else {
          setLoadError(err?.message || `Gagal memuat data spreadsheet tahun ${yr}.`);
        }
      } finally {
        setLoadingMain(false);
      }
    },
    [accessToken, dashCache, sheetConfig, handleAuthError]
  );

  const loadPrevYear = useCallback(async () => {
    if (!accessToken) return;
    const prevYr = String(Number(tahun) - 1) as TahunType;
    if (prevYr !== '2025' && prevYr !== '2026') return;
    if (dashCache[prevYr]) return;
    const ssId = getSpreadsheetIdByYear(sheetConfig, prevYr);
    setLoadingPrev(true);
    try {
      const meta = await getSpreadsheetMeta(ssId, accessToken);
      const data = await fetchDashboardFromSheets(ssId, prevYr, accessToken, meta);
      setDashCache((prev) => ({ ...prev, [prevYr]: data }));
    } catch (err: any) {
      if (err?.name === 'SheetsAuthError') handleAuthError();
      else showToast(`Data tahun ${prevYr} tidak dapat dimuat: ${err?.message || ''}`, 'error');
    } finally {
      setLoadingPrev(false);
    }
  }, [accessToken, tahun, dashCache, sheetConfig, handleAuthError, showToast]);

  const loadFasilitas = useCallback(
    async (force = false) => {
      if (!accessToken) return;
      if (!force && fasCache) return;
      setLoadingMain(true);
      setLoadError(null);
      try {
        const aparId =
          sheetConfig.aparTahunFasilitas === '2027' ? sheetConfig.id2027 : sheetConfig.id2026;
        const safeMeta = async (id: string): Promise<SpreadsheetMeta | null> => {
          try {
            return await getSpreadsheetMeta(id, accessToken);
          } catch (err: any) {
            if (err?.name === 'SheetsAuthError') throw err;
            return null;
          }
        };
        const [metaProlis, metaBysgu, metaApar] = await Promise.all([
          safeMeta(sheetConfig.idProlis),
          safeMeta(sheetConfig.idBysgu),
          safeMeta(aparId),
        ]);

        const fas = await fetchFasilitasFromSheets(
          sheetConfig.idProlis,
          sheetConfig.idBysgu,
          aparId,
          accessToken,
          { prolis: metaProlis, bysgu: metaBysgu, apar: metaApar }
        );
        setFasCache(fas);
        setDataBatchKey((k) => k + 1);
      } catch (err: any) {
        if (err?.name === 'SheetsAuthError') {
          handleAuthError();
        } else {
          setLoadError(err?.message || 'Gagal memuat data Unit Fasilitas.');
        }
      } finally {
        setLoadingMain(false);
      }
    },
    [accessToken, fasCache, sheetConfig, handleAuthError]
  );

  useEffect(() => {
    if (!accessToken) return;
    if (unit === 'perencanaan') {
      loadPerencanaan(tahun, false);
    } else {
      loadFasilitas(false);
    }
  }, [accessToken, unit, tahun, loadPerencanaan, loadFasilitas]);

  /* ---------------- Dynamic Navigation Menu ---------------- */
  const navItems: NavItem[] = useMemo(() => {
    if (unit === 'fasilitas') {
      return [
        { id: 'fas_ringkasan', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'apar', label: 'APAR', icon: Flame },
        { id: 'fas_prolis', label: 'PROLIS Mesin', icon: Wrench },
        { id: 'fas_kelayakan', label: 'Kelayakan Kelas A', icon: ClipboardCheck },
      ];
    }

    const list: NavItem[] = [
      { id: 'ringkasan', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'anggaran', label: 'Anggaran', icon: Wallet },
      { id: 'pengadaan', label: 'Pengadaan', icon: ShoppingCart },
      { id: 'program', label: 'Program', icon: CalendarCheck },
    ];
    if (tahun === '2025') {
      list.push({ id: 'penugasan', label: 'Penugasan', icon: Building2 });
    } else {
      list.push({ id: 'nusantara', label: 'Nusantara Explorer', icon: Train });
    }
    list.push({ id: 'suku', label: 'Suku Cadang', icon: Package });
    if (tahun !== '2025') {
      list.push({ id: 'apar', label: 'APAR', icon: Flame });
    }
    if (role === 'admin') {
      list.push({ id: 'input', label: 'Input Data', icon: Edit });
    }
    return list;
  }, [unit, tahun, role]);

  useEffect(() => {
    if (!navItems.some((n) => n.id === activeTab)) {
      setActiveTab(navItems[0].id);
    }
  }, [navItems, activeTab]);

  /* ---------------- Presentation Mode Controls ---------------- */
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const stepPresTab = (dir: -1 | 1) => {
    const idx = navItems.findIndex((n) => n.id === activeTab);
    if (idx < 0) return;
    const next = (idx + dir + navItems.length) % navItems.length;
    setActiveTab(navItems[next].id);
  };

  useEffect(() => {
    if (!presMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresMode(false);
      else if (e.key === 'ArrowRight') stepPresTab(1);
      else if (e.key === 'ArrowLeft') stepPresTab(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presMode, navItems, activeTab]);

  /* ---------------- Auth Guard ---------------- */
  if (!authStatus) {
    return (
      <div className="min-h-screen nusantara-canvas flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-[#9CA8AA]">
        Menghubungkan ke server dashboard...
      </div>
    );
  }

  if (!session || !accessToken) {
    return (
      <LoginGate
        authStatus={authStatus}
        selectedRole={selectedLoginRole}
        onChangeRole={setSelectedLoginRole}
        loading={authLoading}
        error={authError}
        onLogin={handlePasswordLogin}
        onSetupInitial={handleSetupInitial}
      />
    );
  }

  const currentData = dashCache[tahun] || null;
  const prevTahunKey = String(Number(tahun) - 1);
  const prevData = dashCache[prevTahunKey] || null;
  const currentApar = unit === 'fasilitas' ? fasCache?.apar || null : aparCache[tahun] || null;

  const headerTitle =
    unit === 'fasilitas'
      ? 'Dashboard Monitoring Unit Fasilitas'
      : `Dashboard Monitoring Unit Perencanaan Tahun ${tahun}`;

  const metadataRows: Array<{ label: string; value: string }> = [];
  if (unit === 'perencanaan' && currentData) {
    metadataRows.push({ label: 'Update Pengadaan Per Tanggal:', value: currentData.hariIni });
    if (currentData.tglAnggaran) {
      metadataRows.push({
        label: `Update Anggaran (${tahun === '2025' ? 'RKAD' : 'ZFMF01'}) Per Tanggal:`,
        value: currentData.tglAnggaran,
      });
    }
    metadataRows.push({ label: 'Update Program Per Tanggal:', value: currentData.hariIni });
  } else if (unit === 'fasilitas' && fasCache) {
    metadataRows.push({ label: 'Update Data Per Tanggal:', value: fasCache.hariIni });
    if (fasCache.prolis) {
      metadataRows.push({ label: 'PROLIS:', value: `${fasCache.prolis.rows.length} mesin` });
    }
    if (fasCache.bysgu) {
      metadataRows.push({ label: 'BY SGU:', value: `${fasCache.bysgu.rows.length} item` });
    }
  }

  const activeSumberLinks: SheetSourceLink[] =
    role !== 'admin'
      ? []
      : unit === 'fasilitas'
      ? fasCache?.sumber?.[activeTab] || []
      : currentData?.sumber?.[activeTab] ||
        (activeTab === 'apar' && currentApar?.urlSheet
          ? [{ nama: 'PENGECEKAN APAR', url: currentApar.urlSheet }]
          : []);

  const currentErrors = unit === 'fasilitas' ? fasCache?.errors || [] : currentData?.errors || [];

  const handleNavigate = (tab: TabId, preset?: { prog?: string; pengadaanKat?: string }) => {
    setPresetProg(preset?.prog || null);
    setPresetPbjKat(preset?.pengadaanKat || null);
    setActiveTab(tab);
  };

  const renderSidebarContent = (collapsed: boolean) => (
    <div className="flex flex-col h-full">
      {/* Sidebar Header — vertical stack when collapsed so toggle never overlaps Balai Yasa badge */}
      <div
        className={`border-b border-[#E5DFD0] dark:border-[#1D2D32] shrink-0 ${
          collapsed
            ? 'px-2 py-3 flex flex-col items-center gap-2'
            : 'px-3.5 py-3.5 flex items-center justify-between gap-2'
        }`}
      >
        <div className={`flex items-center gap-2.5 min-w-0 ${collapsed ? 'justify-center' : 'flex-1'}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0D1C21] to-[#173038] text-[#E6C45A] border border-[#D4AF37]/45 flex items-center justify-center shrink-0 shadow-xs">
            <Train className="w-4.5 h-4.5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-display text-sm font-extrabold text-slate-950 dark:text-[#F7F3E9] leading-tight truncate">
                Balai Yasa
              </div>
              <div className="text-[11px] font-bold text-[#8E6510] dark:text-[#E6C45A] truncate">
                Surabaya Gubeng
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSidebarCollapsed((c) => !c)}
          className="hidden lg:inline-flex items-center justify-center p-1.5 rounded-lg text-slate-500 dark:text-[#9CA8AA] hover:text-slate-900 dark:hover:text-[#F5DFA0] hover:bg-stone-100 dark:hover:bg-[#152227] shrink-0 cursor-pointer transition"
          title={collapsed ? 'Perluas menu' : 'Perkecil menu'}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Unified Scrollable Body: Unit/Tahun + Nav + Mode Toggles + Actions scroll together (not frozen) */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {!collapsed ? (
          <div className="px-3.5 py-3 border-b border-[#E5DFD0] dark:border-[#1D2D32] space-y-2.5 bg-[#FAF8F2]/80 dark:bg-[#0A1215]/70 shrink-0">
            <div>
              <label
                htmlFor="sidebar-unit-select"
                className="block text-[11px] font-bold text-slate-600 dark:text-[#9CA8AA] mb-1"
              >
                Unit
              </label>
              <select
                id="sidebar-unit-select"
                value={unit}
                onChange={(e) => setUnit(e.target.value as UnitType)}
                className="w-full rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-white dark:bg-[#111D21] px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-[#F7F3E9] focus:outline-none focus:ring-2 focus:ring-[#C69320]/35 dark:focus:ring-[#D4AF37]/35 cursor-pointer"
              >
                <option value="perencanaan">Perencanaan</option>
                <option value="fasilitas">Fasilitas</option>
              </select>
            </div>

            {unit === 'perencanaan' && (
              <div>
                <label
                  htmlFor="sidebar-tahun-select"
                  className="block text-[11px] font-bold text-slate-600 dark:text-[#9CA8AA] mb-1"
                >
                  Tahun data
                </label>
                <select
                  id="sidebar-tahun-select"
                  value={tahun}
                  onChange={(e) => setTahun(e.target.value as TahunType)}
                  className="w-full rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-white dark:bg-[#111D21] px-2.5 py-1.5 text-xs font-bold tabular-nums text-slate-900 dark:text-[#F7F3E9] focus:outline-none focus:ring-2 focus:ring-[#C69320]/35 dark:focus:ring-[#D4AF37]/35 cursor-pointer"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2027">2027</option>
                </select>
              </div>
            )}
          </div>
        ) : (
          <div className="px-2 py-2.5 border-b border-[#E5DFD0] dark:border-[#1D2D32] flex flex-col items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setUnit((u) => (u === 'perencanaan' ? 'fasilitas' : 'perencanaan'))}
              title={`Unit: ${unit === 'perencanaan' ? 'Perencanaan' : 'Fasilitas'} (klik untuk ganti)`}
              className="w-full rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-[#FAF8F2] dark:bg-[#111D21] py-1 text-[10px] font-extrabold text-[#8E6510] dark:text-[#E6C45A] hover:bg-stone-100 dark:hover:bg-[#17272C] cursor-pointer"
            >
              {unit === 'perencanaan' ? 'PRC' : 'FAS'}
            </button>
            {unit === 'perencanaan' && (
              <button
                type="button"
                onClick={() =>
                  setTahun((y) => (y === '2026' ? '2025' : y === '2025' ? '2027' : '2026'))
                }
                title={`Tahun data: ${tahun} (klik untuk ganti)`}
                className="w-full rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-[#FAF8F2] dark:bg-[#111D21] py-1 text-[10px] font-extrabold tabular-nums text-slate-800 dark:text-[#F7F3E9] hover:bg-stone-100 dark:hover:bg-[#17272C] cursor-pointer"
              >
                {tahun}
              </button>
            )}
          </div>
        )}

        <nav className="px-2.5 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setPresetProg(null);
                  setPresetPbjKat(null);
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition cursor-pointer ${
                  active
                    ? 'bg-[#FBF5E4] text-[#855C0D] border border-[#D4AF37]/45 dark:bg-[#D4AF37]/15 dark:text-[#F5DFA0] dark:border-[#D4AF37]/35 font-bold shadow-2xs'
                    : 'border border-transparent text-slate-700 dark:text-[#C8C3B6] font-semibold hover:bg-stone-100/80 dark:hover:bg-[#142024]'
                } ${collapsed ? 'justify-center px-2' : ''}`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-[#A67C21] dark:text-[#E6C45A]' : 'text-slate-500 dark:text-[#8E9B9E]'
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[#E5DFD0] dark:border-[#1D2D32] p-2.5 space-y-1">
          <button
            type="button"
            onClick={() => setIsDark((d) => !d)}
            title={isDark ? 'Light Mode' : 'Dark Mode'}
            className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-[#C8C3B6] hover:bg-stone-100 dark:hover:bg-[#142024] transition cursor-pointer ${
              collapsed ? 'justify-center px-2' : ''
            }`}
          >
            {isDark ? (
              <Sun className="w-4 h-4 shrink-0 text-[#E6C45A]" />
            ) : (
              <Moon className="w-4 h-4 shrink-0 text-[#8E6510]" />
            )}
            {!collapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit FullScreen' : 'FullScreen'}
            className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-[#C8C3B6] hover:bg-stone-100 dark:hover:bg-[#142024] transition cursor-pointer ${
              collapsed ? 'justify-center px-2' : ''
            }`}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 shrink-0" /> : <Maximize2 className="w-4 h-4 shrink-0" />}
            {!collapsed && <span>{isFullscreen ? 'Keluar FullScreen' : 'FullScreen'}</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              setPresMode(true);
              setMobileMenuOpen(false);
            }}
            title="Presentation Mode"
            className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-[#C8C3B6] hover:bg-stone-100 dark:hover:bg-[#142024] transition cursor-pointer ${
              collapsed ? 'justify-center px-2' : ''
            }`}
          >
            <Presentation className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Presentation Mode</span>}
          </button>

          {!collapsed ? (
            <div className="pt-2 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleSignOut(role === 'admin' ? 'user' : 'admin')}
                className="rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-white dark:bg-[#111D21] px-2 py-1.5 text-[11px] font-bold text-slate-700 dark:text-[#E5DFD0] hover:border-[#C69320] dark:hover:border-[#D4AF37] transition cursor-pointer"
              >
                Ganti Peran
              </button>
              <button
                type="button"
                onClick={() => handleSignOut()}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-white dark:bg-[#111D21] px-2 py-1.5 text-[11px] font-bold text-slate-700 dark:text-[#E5DFD0] hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-800 transition cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                Keluar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleSignOut()}
              title="Keluar"
              className="w-full flex items-center justify-center rounded-xl px-2 py-2 text-slate-600 dark:text-[#9CA8AA] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-stone-100 dark:hover:bg-[#142024] transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex nusantara-canvas text-slate-900 dark:text-[#F4EFE4]">
      {!presMode && (
        <aside
          className={`hidden lg:flex flex-col shrink-0 border-r border-[#E5DFD0] dark:border-[#1D2D32] bg-white/95 dark:bg-[#0B1417]/95 backdrop-blur-sm sticky top-0 h-screen transition-all duration-200 ${
            sidebarCollapsed ? 'w-[76px]' : 'w-[248px]'
          }`}
        >
          {renderSidebarContent(sidebarCollapsed)}
        </aside>
      )}

      {mobileMenuOpen && !presMode && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative z-10 w-64 max-w-[82vw] bg-white dark:bg-[#0B1417] border-r border-[#E5DFD0] dark:border-[#1D2D32] h-full">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-3 top-3.5 p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              aria-label="Tutup menu"
            >
              <X className="w-4 h-4" />
            </button>
            {renderSidebarContent(false)}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 border-b border-[#E5DFD0] dark:border-[#1D2D32] bg-white/95 dark:bg-[#0B1417]/95 backdrop-blur-md px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {!presMode && (
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden p-1.5 rounded-lg border border-[#DCD4C0] dark:border-[#23353B] text-slate-700 dark:text-[#E5DFD0]"
                  aria-label="Buka menu"
                >
                  <Menu className="w-4 h-4" />
                </button>
              )}
              <DanantaraLogo compact={presMode} />
            </div>

            <div className="text-center min-w-0 px-2">
              <h1 className="font-display text-sm sm:text-base lg:text-xl font-extrabold tracking-tight text-slate-950 dark:text-white truncate">
                {headerTitle}
              </h1>
              <p className="text-xs font-bold text-black dark:text-[#E8D5A3] truncate mt-0.5">
                UPT Balai Yasa Surabaya Gubeng
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {presMode && (
                <div className="hidden sm:flex items-center gap-1 rounded-xl border border-[#DCD4C0] dark:border-[#23353B] bg-[#FAF8F2] dark:bg-[#111D21] px-2 py-1 text-xs">
                  <button
                    type="button"
                    onClick={() => stepPresTab(-1)}
                    className="p-1 rounded hover:bg-stone-200 dark:hover:bg-[#1A2A30] cursor-pointer"
                    title="Slide sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-1.5 font-bold text-slate-800 dark:text-[#F5DFA0]">
                    {navItems.find((n) => n.id === activeTab)?.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => stepPresTab(1)}
                    className="p-1 rounded hover:bg-stone-200 dark:hover:bg-[#1A2A30] cursor-pointer"
                    title="Slide berikutnya"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <span className="h-4 w-px bg-stone-300 dark:bg-[#23353B] mx-1" />
                  <button
                    type="button"
                    onClick={() => setPresZoom((z) => Math.max(70, z - 5))}
                    className="px-1.5 py-0.5 rounded hover:bg-stone-200 dark:hover:bg-[#1A2A30] font-bold cursor-pointer"
                  >
                    A-
                  </button>
                  <span className="tabular-nums text-[11px] font-semibold text-slate-600 dark:text-[#9CA8AA] w-9 text-center">
                    {presZoom}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setPresZoom((z) => Math.min(115, z + 5))}
                    className="px-1.5 py-0.5 rounded hover:bg-stone-200 dark:hover:bg-[#1A2A30] font-bold cursor-pointer"
                  >
                    A+
                  </button>
                  <span className="h-4 w-px bg-stone-300 dark:bg-[#23353B] mx-1" />
                  <button
                    type="button"
                    onClick={() => setPresMode(false)}
                    className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#C89B32] to-[#E5C158] text-[#070D0F] px-2.5 py-1 text-[11px] font-extrabold cursor-pointer"
                  >
                    Keluar
                  </button>
                </div>
              )}
              <KaiRightLogos compact={presMode} />
            </div>
          </div>
        </header>

        <main
          className="flex-1 p-3 sm:p-4 space-y-2.5 max-w-[1800px] w-full mx-auto"
          style={presMode ? { zoom: `${presZoom}%` } : undefined}
        >
          {/* Stacked Update Dates exactly matching reference */}
          {!presMode && metadataRows.length > 0 && (
            <div className="space-y-0.5 px-0.5 text-xs leading-snug">
              {metadataRows.map((m) => (
                <div key={m.label} className="text-slate-600 dark:text-[#9CA8AA] font-medium">
                  <span>{m.label} </span>
                  <span className="font-extrabold text-slate-950 dark:text-[#F7F3E9]">{m.value}</span>
                </div>
              ))}
            </div>
          )}

          {!presMode && (
            <div className="rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] px-3.5 py-2 flex flex-wrap items-center justify-between gap-2.5">
              {activeTab !== 'input' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-[#9CA8AA] whitespace-nowrap">
                    Filter triwulan:
                  </span>
                  <div className="inline-flex flex-wrap rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-[#FAF8F2] dark:bg-[#091114] p-0.5 text-xs">
                    {(
                      [
                        { id: 'all', lbl: 'Tahun ini' },
                        { id: '1', lbl: 'TW 1' },
                        { id: '2', lbl: 'TW 2' },
                        { id: '3', lbl: 'TW 3' },
                        { id: '4', lbl: 'TW 4' },
                      ] as Array<{ id: TriwulanType; lbl: string }>
                    ).map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setTw(q.id)}
                        className={`px-2.5 py-1 rounded-md font-bold whitespace-nowrap transition cursor-pointer ${
                          tw === q.id
                            ? 'bg-gradient-to-r from-[#B88B28] to-[#D4AF37] text-[#070D0F] shadow-xs'
                            : 'text-slate-700 dark:text-[#C8C3B6] hover:text-slate-950 dark:hover:text-white'
                        }`}
                      >
                        {q.lbl}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2 ml-auto">
                {role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-[#FAF8F2] dark:bg-[#111D21] px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-[#E5DFD0] hover:border-[#C69320] dark:hover:border-[#D4AF37] whitespace-nowrap shrink-0 transition cursor-pointer"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Pengaturan</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={loadingMain}
                  onClick={() =>
                    unit === 'fasilitas' ? loadFasilitas(true) : loadPerencanaan(tahun, true)
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#C69320]/40 dark:border-[#D4AF37]/40 bg-[#FBF5E4] dark:bg-[#142226] px-2.5 py-1.5 text-xs font-extrabold text-[#7E570B] dark:text-[#E6C45A] hover:brightness-95 dark:hover:brightness-110 disabled:opacity-50 whitespace-nowrap shrink-0 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingMain ? 'animate-spin' : ''}`} />
                  <span>Muat ulang data</span>
                </button>
              </div>
            </div>
          )}

          {loadError && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-rose-700 dark:text-rose-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div>
                  <div className="font-semibold">Gagal membaca Google Spreadsheet</div>
                  <div className="mt-0.5 opacity-90">{loadError}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(true)}
                    className="rounded-lg border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 px-3 py-1.5 font-semibold"
                  >
                    Cek ID Spreadsheet
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    unit === 'fasilitas' ? loadFasilitas(true) : loadPerencanaan(tahun, true)
                  }
                  className="rounded-lg bg-rose-600 text-white px-3 py-1.5 font-semibold hover:bg-rose-700"
                >
                  Coba lagi
                </button>
              </div>
            </div>
          )}

          {currentErrors.length > 0 && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200">
              <span className="font-semibold">Catatan sheet:</span> {currentErrors.join(' · ')}
            </div>
          )}

          {loadingMain && !(unit === 'fasilitas' ? fasCache : currentData) ? (
            <div className="space-y-4 animate-pulse">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-28 rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619]"
                  />
                ))}
              </div>
              <div className="h-72 rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619]" />
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={true}>
              <motion.div
                key={`${unit}-${tahun}-${activeTab}-${dataBatchKey}`}
                variants={staggerContainerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-2.5"
              >
                {unit === 'perencanaan' && currentData && (
                  <>
                    {activeTab === 'ringkasan' && (
                      <RingkasanView
                        data={currentData}
                        aparData={currentApar}
                        prevData={prevData}
                        prevLoading={loadingPrev}
                        onRequestPrevYear={loadPrevYear}
                        tw={tw}
                        isDark={isDark}
                        onNavigate={handleNavigate}
                      />
                    )}
                    {activeTab === 'anggaran' && (
                      <AnggaranView
                        anggaran={currentData.anggaran}
                        kurvaAnggaran={currentData.kurvaAnggaran}
                        tglAnggaran={currentData.tglAnggaran}
                        tahun={currentData.tahun}
                        isDark={isDark}
                      />
                    )}
                    {activeTab === 'pengadaan' && (
                      <PengadaanView
                        pengadaan={currentData.pengadaan}
                        tahun={currentData.tahun}
                        tw={tw}
                        isDark={isDark}
                        initialKategori={presetPbjKat}
                      />
                    )}
                    {activeTab === 'program' && (
                      <ProgramView
                        program={currentData.program}
                        tahun={currentData.tahun}
                        tw={tw}
                        isDark={isDark}
                        initialProgram={presetProg}
                      />
                    )}
                    {activeTab === 'nusantara' && (
                      <NusantaraView
                        nusantara={currentData.nusantara}
                        tahun={currentData.tahun}
                        isDark={isDark}
                      />
                    )}
                    {activeTab === 'suku' && (
                      <SukuCadangView
                        sukuCadang={currentData.sukuCadang}
                        tahun={currentData.tahun}
                        isDark={isDark}
                      />
                    )}
                    {activeTab === 'apar' && <AparView apar={currentApar} />}
                    {activeTab === 'penugasan' && <PenugasanView penugasan={currentData.penugasan} />}
                    {activeTab === 'input' && (
                      <InputDataView
                        spreadsheetId={getSpreadsheetIdByYear(sheetConfig, tahun)}
                        tahun={tahun}
                        role={role}
                        accessToken={accessToken}
                        writeCapable={Boolean(authStatus.writeCapable)}
                        onAuthError={handleAuthError}
                        onDataMutated={() => loadPerencanaan(tahun, true)}
                        onToast={showToast}
                      />
                    )}
                  </>
                )}

                {unit === 'fasilitas' && fasCache && (
                  <>
                    {activeTab === 'fas_ringkasan' && (
                      <FasilitasRingkasanView
                        fasilitas={fasCache}
                        tw={tw}
                        isDark={isDark}
                        onNavigate={handleNavigate}
                      />
                    )}
                    {activeTab === 'apar' && <AparView apar={fasCache.apar} />}
                    {activeTab === 'fas_prolis' && (
                      <FasilitasProlisView fasilitas={fasCache} isDark={isDark} />
                    )}
                    {activeTab === 'fas_kelayakan' && (
                      <FasilitasKelayakanView fasilitas={fasCache} isDark={isDark} />
                    )}
                  </>
                )}

                {!presMode && activeSumberLinks.length > 0 && <SumberCard links={activeSumberLinks} />}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      {presMode && (
        <div className="fixed bottom-4 right-4 sm:hidden z-40">
          <button
            type="button"
            onClick={() => setPresMode(false)}
            className="rounded-xl bg-slate-900 text-white px-3.5 py-2 text-xs font-semibold shadow-lg"
          >
            Keluar Presentasi
          </button>
        </div>
      )}

      <SpreadsheetSettingsModal
        open={settingsOpen}
        config={sheetConfig}
        token={accessToken}
        authStatus={authStatus}
        onClose={() => setSettingsOpen(false)}
        onPasswordsUpdated={refreshAuthStatus}
        onToast={showToast}
        onSave={(next) => {
          setSheetConfig(next);
          saveSpreadsheetConfig(next);
          setDashCache({});
          setAparCache({});
          setFasCache(null);
          showToast('Konfigurasi Spreadsheet disimpan. Memuat ulang data...', 'success');
        }}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className="fixed bottom-5 right-5 z-50 max-w-sm"
          >
            <div
              className={`rounded-xl border px-4 py-3 text-xs font-semibold shadow-lg flex items-center gap-2 ${
                toast.type === 'error'
                  ? 'border-rose-300 bg-rose-600 text-white'
                  : 'border-emerald-300 bg-emerald-600 text-white'
              }`}
            >
              <span>{toast.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
