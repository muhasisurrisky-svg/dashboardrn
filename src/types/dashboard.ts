export type UnitType = 'perencanaan' | 'fasilitas';
export type TahunType = '2025' | '2026' | '2027';
export type TriwulanType = 'all' | '1' | '2' | '3' | '4';
export type UserRole = 'admin' | 'user';

export type PerencanaanTabId =
  | 'ringkasan'
  | 'anggaran'
  | 'pengadaan'
  | 'program'
  | 'nusantara'
  | 'suku'
  | 'apar'
  | 'penugasan'
  | 'input';

export type FasilitasTabId =
  | 'fas_ringkasan'
  | 'apar'
  | 'fas_prolis'
  | 'fas_kelayakan';

export type TabId = PerencanaanTabId | FasilitasTabId;

export interface SpreadsheetConfig {
  id2026: string;
  id2025: string;
  id2027: string;
  idProlis: string;
  idBysgu: string;
  aparTahunFasilitas: '2026' | '2027';
}

export interface SheetSourceLink {
  nama: string;
  url: string;
}

export interface AnggaranRow {
  no: string | number;
  fc: string;
  ci: string;
  rkap: number;
  release: number;
  commitment: number;
  actual: number;
  consumed: number;
  available: number;
  pct: number;
}

export interface AnggaranData {
  rows: AnggaranRow[];
  total: {
    rkap: number;
    release: number;
    commitment: number;
    actual: number;
    consumed: number;
    available: number;
    pct: number;
  };
  tgl?: string | null;
}

export interface KurvaAnggaranPoint {
  periode: string;
  rencana: number | null;
  konsumsi: number | null;
}

/**
 * Tuple mirroring Code.gs:
 * [0: noDok, 1: deskripsi, 2: ci, 3: tipe, 4: vendor, 5: nilaiSpk, 6: tglSpk, 7: posisiBerkas, 8: status, 9: kategori, 10: bulan(1..12 or 0)]
 */
export type PengadaanRow = [
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  string,
  string,
  'Selesai' | 'Dalam Proses' | 'Gagal/Batal',
  number
];

export interface PengadaanData {
  total: number;
  selesai: number;
  proses: number;
  gagal: number;
  pctSelesai: number;
  totalSpk: number;
  perBulanJml: number[];
  perBulanNilai: number[];
  rows: PengadaanRow[];
}

export interface ProgramRingkasItem {
  program: string;
  total: number;
  realisasi: number;
  tsgo: number;
  belumMasuk: number;
  konservasi: number;
  lainnya: number;
  pct: number;
}

export interface ProgramBulanSeries {
  rencana: number[];
  realisasi: number[];
}

export interface ProgramDetailRow {
  c: string[];
  mr: number;
  mp: number;
  real: boolean;
}

export interface ProgramData {
  ringkas: ProgramRingkasItem[];
  bulan: Record<string, ProgramBulanSeries>;
  detail: Record<string, ProgramDetailRow[]>;
  detailHead: string[];
}

export interface NusantaraItem {
  kereta: string;
  kelompok: string;
  posisi: string;
  rencana: number;
  aktual: number;
  deviasi: number;
  sisa: number;
  status: string;
}

export interface NusantaraKurvaPoint {
  periode: string;
  rencana: number | null;
  aktual: number | null;
}

export interface NusantaraData {
  kpi: {
    aktual: string;
    rencana: string;
    deviasi: string;
    selesai: string;
    aktualNum: number;
    rencanaNum: number;
    deviasiNum: number;
    selesaiNum: number;
  };
  items: NusantaraItem[];
  kurva: NusantaraKurvaPoint[];
}

/**
 * Tuple mirroring Code.gs:
 * [0: matnum, 1: judul, 2: vendor, 3: deskripsiMaterial, 4: satuan, 5: qty, 6: hargaSatuan]
 */
export type SukuCadangRow = [string, string, string, string, string, number, number];

export interface SukuCadangData {
  total: number;
  jumlahBaris: number;
  perSumber: Record<string, { baris: number; nilai: number }>;
  rows: SukuCadangRow[];
}

/**
 * Tuple mirroring Code.gs:
 * [0: no, 1: nama, 2: tipe, 3: mitra, 4: rab, 5: hps, 6: nilaiPerjanjian, 7: tglKontrak, 8: noKontrak, 9: mppl, 10: status, 11: ket]
 */
export type PenugasanRow = [
  string,
  string,
  string,
  string,
  number,
  number,
  number,
  string,
  string,
  string,
  string,
  string
];

export interface PenugasanData {
  total: number;
  nilaiRab: number;
  nilaiPerjanjian: number;
  batal: number;
  perStatus: Record<string, number>;
  perTipe: Record<string, number>;
  rows: PenugasanRow[];
}

export type AparStatus = 'Aman' | 'Segera kadaluarsa' | 'Kadaluarsa' | 'Tidak ada data';

/**
 * Tuple mirroring Code.gs:
 * [0: no, 1: lok, 2: jenis, 3: kap, 4: kad, 5: cek, 6: pre, 7: seg, 8: sel, 9: tab, 10: tem, 11: bar, 12: nxt, 13: status, 14: sisa]
 */
export type AparRow = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  AparStatus,
  number | ''
];

export interface AparData {
  total: number;
  tanpaLokasi: number;
  sudahCek: number;
  sudahGanti: number;
  batasHari: number;
  acuan: string;
  perStatus: Record<AparStatus, number>;
  perBulan: Array<{ key: number; label: string; n: number; lewat: boolean }>;
  rows: AparRow[];
  urlSheet?: string;
}

export interface DashboardData {
  tahun: number;
  hariIni: string;
  urlUtama: string;
  sumber: Record<string, SheetSourceLink[]> | null;
  tglAnggaran: string | null;
  anggaran: AnggaranData | null;
  kurvaAnggaran: KurvaAnggaranPoint[] | null;
  pengadaan: PengadaanData | null;
  program: ProgramData | null;
  nusantara: NusantaraData | null;
  sukuCadang: SukuCadangData | null;
  penugasan?: PenugasanData | null;
  errors: string[];
  loadedAt: string;
}

/**
 * Fasilitas PROLIS tuple:
 * [0: no, 1: tahun(num/str), 2: jenis, 3: spes, 4: mesin, 5: lok, 6: dok, 7: extra, 8: progLabels[12], 9: realBits(12-char), 10: adaKondBits(12-char), 11: kondChars(12-char)]
 */
export type ProlisRow = [
  string,
  number,
  string,
  string,
  string,
  string,
  string,
  string,
  string[],
  string,
  string,
  string
];

export interface ProlisData {
  tahun: number;
  tahunList: number[];
  rows: ProlisRow[];
}

/**
 * Fasilitas BY SGU tuple:
 * [0: no, 1: jenisFasilitas, 2: fasilitas, 3: item, 4: persyaratan, 5: tw(1..4), 6: tahun, 7: wajib(0|1), 8: eksisting, 9: keterangan, 10: status('A'|'B'|'T')]
 */
export type BysguRow = [
  string,
  string,
  string,
  string,
  string,
  number,
  number,
  0 | 1,
  number,
  string,
  'A' | 'B' | 'T'
];

export interface BysguData {
  tahun: number;
  tahunList: number[];
  rows: BysguRow[];
}

export interface FasilitasData {
  hariIni: string;
  prolis: ProlisData | null;
  bysgu: BysguData | null;
  apar: AparData | null;
  sumber: Record<string, SheetSourceLink[]> | null;
  errors: string[];
  loadedAt: string;
}

/* Input Data CRUD types */
export type InputModuleId = 'pengadaan' | 'program' | 'suku' | 'apar';

export interface InputTargetDef {
  sheet: string;
  kunci: string;
  unik?: string[];
  sub?: boolean;
}

export interface InputFieldSchema {
  i: number;
  label: string;
  tipe: 'teks' | 'angka' | 'tgl' | 'bulan';
  fmt: 'date' | 'text' | '';
  opsi: string[];
  formula: boolean;
  wajib: boolean;
}

export interface InputSchema {
  fields: InputFieldSchema[];
  pratinjauKepala: string[];
  terakhir: string[][];
  mulai: number;
  lastCol: number;
  lastRow: number;
  kcol: number;
}

export interface InputSchemaResult {
  targets: Array<{ idx: number; nama: string }>;
  idx: number;
  sheet: string;
  targetDef?: InputTargetDef;
  skema?: InputSchema;
  pesan?: string;
}

export interface InputBarisRow {
  r: number;
  k: string;
  c: string[];
}

export interface InputBarisResult {
  targets: Array<{ idx: number; nama: string }>;
  idx: number;
  sheet: string;
  targetDef?: InputTargetDef;
  skema?: InputSchema;
  fields: InputFieldSchema[];
  kepala: string[];
  total: number;
  hal: number;
  pages: number;
  rows: InputBarisRow[];
  pesan?: string;
}
