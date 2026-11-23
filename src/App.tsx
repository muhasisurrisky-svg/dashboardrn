import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-xs text-slate-500">
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

  const metadataItems: string[] = [];
  if (unit === 'perencanaan' && currentData) {
    metadataItems.push(`Update Pengadaan: ${currentData.hariIni}`);
    if (currentData.tglAnggaran) {
      metadataItems.push(`Anggaran (${tahun === '2025' ? 'RKAD' : 'ZFMF01'}): ${currentData.tglAnggaran}`);
    }
    metadataItems.push(`Program: ${currentData.hariIni}`);
  } else if (unit === 'fasilitas' && fasCache) {
    metadataItems.push(`Update Data: ${fasCache.hariIni}`);
    if (fasCache.prolis) metadataItems.push(`PROLIS: ${fasCache.prolis.rows.length} mesin`);
    if (fasCache.bysgu) metadataItems.push(`BY SGU: ${fasCache.bysgu.rows.length} item`);
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
      <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Train className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
                Balai Yasa
              </div>
              <div className="text-[11px] font-medium text-blue-600 dark:text-blue-400 truncate">
                Surabaya Gubeng
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSidebarCollapsed((c) => !c)}
          className="hidden lg:inline-flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          title={collapsed ? 'Perluas menu' : 'Perkecil menu'}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
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
              className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
                active
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
              } ${collapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : ''}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 dark:border-slate-800 p-2.5 space-y-1">
        <button
          type="button"
          onClick={() => setIsDark((d) => !d)}
          title={isDark ? 'Light Mode' : 'Dark Mode'}
          className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 ${
            collapsed ? 'justify-center px-2' : ''
          }`}
        >
          {isDark ? <Sun className="w-4 h-4 shrink-0 text-amber-400" /> : <Moon className="w-4 h-4 shrink-0" />}
          {!collapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        <button
          type="button"
          onClick={handleToggleFullscreen}
          title={isFullscreen ? 'Exit FullScreen' : 'FullScreen'}
          className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 ${
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
          className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 ${
            collapsed ? 'justify-center px-2' : ''
          }`}
        >
          <Presentation className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Presentation Mode</span>}
        </button>

        {!collapsed && (
          <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">
                  Masuk sebagai <span className="uppercase text-blue-600 dark:text-blue-400">{role}</span>
                </div>
                {(unit === 'fasilitas' ? fasCache?.loadedAt : currentData?.loadedAt) && (
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Dimuat {unit === 'fasilitas' ? fasCache?.loadedAt : currentData?.loadedAt}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleSignOut(role === 'admin' ? 'user' : 'admin')}
                className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 shrink-0"
              >
                Ganti Peran
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleSignOut()}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600"
            >
              <LogOut className="w-3 h-3" />
              Keluar
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {!presMode && (
        <aside
          className={`hidden lg:flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 h-screen transition-all duration-200 ${
            sidebarCollapsed ? 'w-[76px]' : 'w-[248px]'
          }`}
        >
          {renderSidebarContent(sidebarCollapsed)}
        </aside>
      )}

      {mobileMenuOpen && !presMode && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/50" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative z-10 w-64 max-w-[80vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-3 top-3.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              aria-label="Tutup menu"
            >
              <X className="w-4 h-4" />
            </button>
            {renderSidebarContent(false)}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {!presMode && (
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                  aria-label="Buka menu"
                >
                  <Menu className="w-4 h-4" />
                </button>
              )}
              <DanantaraLogo compact={presMode} />
            </div>

            <div className="text-center min-w-0 px-2">
              <h1 className="text-sm sm:text-base lg:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 truncate">
                {headerTitle}
              </h1>
              <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 truncate">
                UPT Balai Yasa Surabaya Gubeng
              </p>
              {metadataItems.length > 0 && !presMode && (
                <p className="hidden md:block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {metadataItems.join(' · ')}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {presMode && (
                <div className="hidden sm:flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-xs">
                  <button
                    type="button"
                    onClick={() => stepPresTab(-1)}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                    title="Slide sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-1.5 font-semibold text-slate-700 dark:text-slate-200">
                    {navItems.find((n) => n.id === activeTab)?.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => stepPresTab(1)}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                    title="Slide berikutnya"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <span className="h-4 w-px bg-slate-300 dark:bg-slate-600 mx-1" />
                  <button
                    type="button"
                    onClick={() => setPresZoom((z) => Math.max(70, z - 5))}
                    className="px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold"
                  >
                    A-
                  </button>
                  <span className="tabular-nums text-[11px] text-slate-500 w-9 text-center">{presZoom}%</span>
                  <button
                    type="button"
                    onClick={() => setPresZoom((z) => Math.min(115, z + 5))}
                    className="px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold"
                  >
                    A+
                  </button>
                  <span className="h-4 w-px bg-slate-300 dark:bg-slate-600 mx-1" />
                  <button
                    type="button"
                    onClick={() => setPresMode(false)}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-2.5 py-1 text-[11px] font-semibold"
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
          className="flex-1 p-4 sm:p-6 space-y-4 max-w-[1600px] w-full mx-auto"
          style={presMode ? { zoom: `${presZoom}%` } : undefined}
        >
          {!presMode && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Unit:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setUnit('perencanaan')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition ${
                        unit === 'perencanaan'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Perencanaan
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnit('fasilitas')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition ${
                        unit === 'fasilitas'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Fasilitas
                    </button>
                  </div>
                </div>

                {unit === 'perencanaan' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tahun:</span>
                    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 text-xs">
                      {(['2025', '2026', '2027'] as TahunType[]).map((y) => (
                        <button
                          key={y}
                          type="button"
                          onClick={() => setTahun(y)}
                          className={`px-2.5 py-1 rounded-md font-semibold tabular-nums transition ${
                            tahun === y
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab !== 'input' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Filter triwulan:</span>
                    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 text-xs">
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
                          className={`px-2.5 py-1 rounded-md font-medium transition ${
                            tw === q.id
                              ? 'bg-blue-600 text-white font-semibold shadow-xs'
                              : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {q.lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
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
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 disabled:opacity-50"
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
                    className="h-28 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                ))}
              </div>
              <div className="h-72 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" />
            </div>
          ) : (
            <>
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
            </>
          )}

          {!presMode && activeSumberLinks.length > 0 && <SumberCard links={activeSumberLinks} />}
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

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm">
          <div
            className={`rounded-xl border px-4 py-3 text-xs font-semibold shadow-lg flex items-center gap-2 ${
              toast.type === 'error'
                ? 'border-rose-300 bg-rose-600 text-white'
                : 'border-emerald-300 bg-emerald-600 text-white'
            }`}
          >
            <span>{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
