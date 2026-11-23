export const BLN_LABEL = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const BLN_FULL = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const PROG_ORDER = ['GO', 'MO', 'P24', 'P48'];

export const TIPE_COLORS: Record<string, string> = {
  UMDS: '#EF4444',
  SPK: '#10B981',
  KONTRAK: '#3B82F6',
  Kontrak: '#3B82F6',
  'KONTRAK PENUNJUKKAN': '#F59E0B',
  '(belum diisi)': '#94A3B8',
  Lainnya: '#8B5CF6',
};

export function fmtInt(n: number | null | undefined): string {
  return Math.round(Number(n) || 0).toLocaleString('id-ID');
}

export function fmtRp(n: number | null | undefined): string {
  const num = Math.round(Number(n) || 0);
  return num < 0 ? `-Rp${Math.abs(num).toLocaleString('id-ID')}` : `Rp${num.toLocaleString('id-ID')}`;
}

export function rpOrDash(n: number | null | undefined): string {
  return Number(n) > 0 ? fmtRp(n) : '—';
}

export function fmtM(n: number | null | undefined, digits = 1): string {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}Rp${(abs / 1e12).toFixed(digits).replace('.', ',')} T`;
  if (abs >= 1e9) return `${sign}Rp${(abs / 1e9).toFixed(digits).replace('.', ',')} M`;
  if (abs >= 1e6) return `${sign}Rp${(abs / 1e6).toFixed(digits).replace('.', ',')} Jt`;
  return fmtRp(v);
}

export function fmtP(n: number | null | undefined, d = 1): string {
  return `${(Number(n) || 0).toFixed(d).replace('.', ',')}%`;
}

export function fmtJuta(n: number | null | undefined, d = 1): string {
  return `${((Number(n) || 0) / 1e6).toFixed(d).replace('.', ',')} jt`;
}

export interface StatusTierInfo {
  label: 'Tercapai' | 'Peringatan' | 'Perlu Perhatian';
  textClass: string;
  dotClass: string;
  barColor: string;
  badgeBgClass: string;
}

export function statusTier(pct: number): StatusTierInfo {
  if (pct >= 95) {
    return {
      label: 'Tercapai',
      textClass: 'text-emerald-600 dark:text-emerald-400',
      dotClass: 'bg-emerald-500',
      barColor: '#10B981',
      badgeBgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60',
    };
  }
  if (pct >= 80) {
    return {
      label: 'Peringatan',
      textClass: 'text-amber-600 dark:text-amber-400',
      dotClass: 'bg-amber-500',
      barColor: '#F59E0B',
      badgeBgClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60',
    };
  }
  return {
    label: 'Perlu Perhatian',
    textClass: 'text-rose-600 dark:text-rose-400',
    dotClass: 'bg-rose-500',
    barColor: '#EF4444',
    badgeBgClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60',
  };
}

export function katBadgeClass(kat: string): string {
  if (kat === 'Selesai') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60';
  }
  if (kat === 'Gagal/Batal') {
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60';
  }
  return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60';
}

export function aparBadgeClass(status: string): string {
  if (status === 'Aman') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60';
  }
  if (status === 'Segera kadaluarsa') {
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60';
  }
  if (status === 'Kadaluarsa') {
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60';
  }
  return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
}

export function kunci(s: string | null | undefined): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function twRange(tw: string): [number, number] | null {
  if (tw === '1') return [1, 3];
  if (tw === '2') return [4, 6];
  if (tw === '3') return [7, 9];
  if (tw === '4') return [10, 12];
  return null;
}

export function twBulanMask(tw: string): boolean[] {
  const mask = new Array<boolean>(12).fill(true);
  const r = twRange(tw);
  if (!r) return mask;
  return mask.map((_, idx) => idx + 1 >= r[0] && idx + 1 <= r[1]);
}

export function twLabelText(tw: string): string {
  if (tw === '1') return 'TW 1 (Jan–Mar)';
  if (tw === '2') return 'TW 2 (Apr–Jun)';
  if (tw === '3') return 'TW 3 (Jul–Sep)';
  if (tw === '4') return 'TW 4 (Okt–Des)';
  return 'Tahun ini';
}
