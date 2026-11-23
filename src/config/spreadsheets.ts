import type { InputModuleId, InputTargetDef, SpreadsheetConfig, TahunType } from '../types/dashboard';

export const DEFAULT_SPREADSHEETS: SpreadsheetConfig = {
  id2026: '1LVk1C5pWFbmZHiJxodWNnf-grvOKBh_OC8tfzOjerZ4',
  id2025: '1CRYrMhf0BFOfl7RJ3lPxmPiR39KmvT8TBpUCmuJkgDM',
  id2027: '1cP_Sb4kebZ4LHE-tE-Vu_s7KsZ1DHnr-mSq-QIG947c',
  idProlis: '10ZKVWWLNHrgMi-Gd9E-tGpAYL4ObmRrdEJijrbpFOZ4',
  idBysgu: '13-5ZBQhLtnyYwl38DbD9C8g9VR295UZI8-m1RVIDWBw',
  aparTahunFasilitas: '2026',
};

const STORAGE_KEY = 'by_sgu_sheet_config_v1';

export function loadSpreadsheetConfig(): SpreadsheetConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SPREADSHEETS };
    const parsed = JSON.parse(raw) as Partial<SpreadsheetConfig>;
    return {
      id2026: (parsed.id2026 || DEFAULT_SPREADSHEETS.id2026).trim(),
      id2025: (parsed.id2025 || DEFAULT_SPREADSHEETS.id2025).trim(),
      id2027: (parsed.id2027 || DEFAULT_SPREADSHEETS.id2027).trim(),
      idProlis: (parsed.idProlis || DEFAULT_SPREADSHEETS.idProlis).trim(),
      idBysgu: (parsed.idBysgu || DEFAULT_SPREADSHEETS.idBysgu).trim(),
      aparTahunFasilitas: parsed.aparTahunFasilitas === '2027' ? '2027' : '2026',
    };
  } catch {
    return { ...DEFAULT_SPREADSHEETS };
  }
}

export function saveSpreadsheetConfig(cfg: SpreadsheetConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // ignore storage errors
  }
}

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const m = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : trimmed;
}

export function getSpreadsheetIdByYear(cfg: SpreadsheetConfig, tahun: TahunType): string {
  if (tahun === '2025') return cfg.id2025;
  if (tahun === '2027') return cfg.id2027;
  return cfg.id2026;
}

export const NILAI_BATAL_DIHITUNG = false;
export const APAR_NAMA_SHEET = 'PENGECEKAN APAR';
export const APAR_BATAS_HARI = 90;
export const FAS_SHEET_PROLIS = 'PROLIS';
export const FAS_SHEET_BYSGU = 'BYSGU';
export const LOG_INPUT = 'LOG INPUT';

export const SH = {
  ANGGARAN: 'ZFM01',
  ANG_DASH: 'DASHBOARD ANGGARAN',
  KURVA_ANG: 'KURVA ANGGARAN',
  PENGADAAN: 'Rekap Pengadaan / Jasa',
  PROGRAM_SUM: 'DASHBOARD MO GO,P24 P48',
  PROGRAM: 'Program-P24,P48',
  NUS_SUM: 'DASHBOARD PROG KERETA THE NUSANTARA EXPLORER',
  NUS: 'NUSANTARA EXPLORER',
  KURVA: 'Rekap KurvaS',
  SPARE: 'Rekap Suku Cadang',
} as const;

export const SH25 = {
  RKAD: 'RKAD',
  KURVA_ANG: 'KURVA ANGGARAN',
  PENGADAAN: 'UMDS, SPK, KONTRAK',
  SUKCAD_KONTRAK: 'SUKCAD KONTRAK / PERSEDIAAN',
  SUKCAD_UMDS: 'SUKCAD UMDS',
  PENUGASAN: 'PENUGASAN',
  PROGRAM_SUM: 'DASHBOARD MO GO,P24 P48',
  PROGRAM: 'Program-P24,P48',
} as const;

export const SUMBER_HALAMAN: Record<string, string[]> = {
  ringkasan: [SH.ANGGARAN, SH.KURVA_ANG, SH.PENGADAAN, SH.PROGRAM_SUM, SH.NUS_SUM],
  anggaran: [SH.ANGGARAN, SH.ANG_DASH, SH.KURVA_ANG],
  pengadaan: [SH.PENGADAAN],
  program: [SH.PROGRAM_SUM, SH.PROGRAM],
  nusantara: [SH.NUS_SUM, SH.NUS, SH.KURVA],
  suku: [SH.SPARE, SH.PENGADAAN],
  apar: [APAR_NAMA_SHEET],
};

export const SUMBER_HALAMAN25: Record<string, string[]> = {
  ringkasan: [SH25.RKAD, SH25.KURVA_ANG, SH25.PENGADAAN, SH25.PENUGASAN, SH25.PROGRAM_SUM],
  anggaran: [SH25.RKAD, SH25.KURVA_ANG],
  pengadaan: [SH25.PENGADAAN],
  program: [SH25.PROGRAM_SUM, SH25.PROGRAM],
  suku: [SH25.SUKCAD_KONTRAK, SH25.SUKCAD_UMDS, SH25.PENGADAAN],
  penugasan: [SH25.PENUGASAN],
};

export const KOLOM_TAMPIL = [
  'Sumber',
  'No Sarana / KAI',
  'Jenis',
  'Depo',
  'Program',
  'Bulan Rencana',
  'Status',
  'Tgl Masuk BY',
  'Tgl Keluar',
];

export const BULAN_ID = [
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

export const BLN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function getInputTargets(modul: InputModuleId, tahun: TahunType): InputTargetDef[] {
  const s25 = tahun === '2025';
  const T: Record<InputModuleId, InputTargetDef[]> = {
    pengadaan: s25
      ? [{ sheet: SH25.PENGADAAN, kunci: 'deskripsi' }]
      : [{ sheet: SH.PENGADAAN, kunci: 'deskripsi pekerjaan' }],
    program: [{ sheet: s25 ? SH25.PROGRAM : SH.PROGRAM, kunci: 'no sarana', unik: ['no sarana', 'program'] }],
    suku: s25
      ? [
          { sheet: SH25.SUKCAD_KONTRAK, kunci: 'judul pengadaan' },
          { sheet: SH25.SUKCAD_UMDS, kunci: 'pengadaan' },
        ]
      : [{ sheet: SH.SPARE, kunci: 'judul pengadaan' }],
    apar: s25 ? [] : [{ sheet: APAR_NAMA_SHEET, kunci: 'no. apar', unik: ['no. apar'], sub: true }],
  };
  return T[modul] || [];
}
