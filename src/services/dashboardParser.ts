import {
  APAR_BATAS_HARI,
  APAR_NAMA_SHEET,
  BLN_PENDEK,
  BULAN_ID,
  FAS_SHEET_BYSGU,
  FAS_SHEET_PROLIS,
  KOLOM_TAMPIL,
  NILAI_BATAL_DIHITUNG,
  SH,
  SH25,
  SUMBER_HALAMAN,
  SUMBER_HALAMAN25,
} from '../config/spreadsheets';
import type {
  AnggaranData,
  AnggaranRow,
  AparData,
  AparRow,
  AparStatus,
  BysguData,
  BysguRow,
  DashboardData,
  FasilitasData,
  InputBarisResult,
  InputFieldSchema,
  InputSchema,
  InputTargetDef,
  KurvaAnggaranPoint,
  NusantaraData,
  NusantaraItem,
  NusantaraKurvaPoint,
  PengadaanData,
  PengadaanRow,
  PenugasanData,
  PenugasanRow,
  ProgramBulanSeries,
  ProgramData,
  ProgramDetailRow,
  ProgramRingkasItem,
  ProlisData,
  ProlisRow,
  SheetSourceLink,
  SukuCadangData,
  SukuCadangRow,
} from '../types/dashboard';
import { batchGetFormattedValues, colToA1, getRawSheetRange, quoteSheetName, type SpreadsheetMeta } from './sheetsApi';

/* ---------------------------- Helper utilities (exact port of Code.gs) ---------------------------- */

export function num_(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v === null || v === undefined) return 0;
  let s = String(v).replace(/Rp/gi, '').replace(/[%\s]/g, '');
  if (!s || s === '-') return 0;
  let neg = false;
  if (s.charAt(0) === '-' || (s.charAt(0) === '(' && s.slice(-1) === ')')) {
    neg = true;
    s = s.replace(/[-()]/g, '');
  }
  if (s.indexOf(',') > -1) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  if (Number.isNaN(n)) return 0;
  return neg ? -n : n;
}

export function norm_(s: unknown): string {
  return String(s === null || s === undefined ? '' : s)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function katPbj_(s: unknown): 'Selesai' | 'Dalam Proses' | 'Gagal/Batal' {
  const n = norm_(s);
  if (/gagal|batal/.test(n)) return 'Gagal/Batal';
  if (/\b(belum|tidak|bukan)\b/.test(n)) return 'Dalam Proses';
  if (/selesai|\bclosed?\b|cair/.test(n)) return 'Selesai';
  return 'Dalam Proses';
}

export function rapiVendor_(s: unknown): string {
  const cleaned = String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  return cleaned.replace(/^(PT|CV|UD)\.?\s+/, '$1 ').replace(/\s*,\s*/g, ', ');
}

export function barisTotal_(s: unknown): boolean {
  return /^(grand\s*total|sub\s*total|total|jumlah)\s*:?$/i.test(String(s || '').trim());
}

export function col_(head: string[], nama: string): number {
  const n = norm_(nama);
  let i = head.indexOf(n);
  if (i > -1) return i;
  i = head.findIndex((x) => x.indexOf(n) === 0);
  if (i > -1) return i;
  return head.findIndex((x) => x.indexOf(n) > -1);
}

export function need_(idx: number, nama: string, sheetName: string): number {
  if (idx < 0) throw new Error(`Kolom "${nama}" tidak ditemukan di sheet "${sheetName}"`);
  return idx;
}

const BLN_MAP_: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  mei: 5,
  may: 5,
  jun: 6,
  jul: 7,
  agu: 8,
  agt: 8,
  aug: 8,
  sep: 9,
  sept: 9,
  okt: 10,
  oct: 10,
  nov: 11,
  des: 12,
  dec: 12,
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
};

export function parseTgl_(s: unknown): { d: number; m: number; y: number } | null {
  const str = String(s || '').trim();
  let m = str.match(/^(\d{1,2})[-\s]([A-Za-z]+)[-\s](\d{2,4})/);
  if (m) {
    const b = BLN_MAP_[m[2].toLowerCase()];
    if (b) {
      let y = +m[3];
      if (y < 100) y += 2000;
      return { d: +m[1], m: b, y };
    }
  }
  m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return { d: +m[1], m: +m[2], y: +m[3] };
  m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return { d: +m[3], m: +m[2], y: +m[1] };
  return null;
}

export function rapikanTgl_(s: unknown): string {
  const t = parseTgl_(s);
  if (!t) return String(s === null || s === undefined ? '' : s).trim();
  return `${t.d}-${BLN_PENDEK[t.m - 1]}-${String(t.y).slice(-2)}`;
}

export function aparParseTgl_(s: unknown): Date | null {
  const str = String(s || '').trim();
  if (!str) return null;
  const m = str.match(/^([A-Za-z]+)[-\s/.](\d{2,4})$/);
  if (m) {
    const b = BLN_MAP_[m[1].toLowerCase()];
    if (b) {
      let y = +m[2];
      if (y < 100) y += 2000;
      return new Date(y, b, 0);
    }
  }
  const t = parseTgl_(str);
  return t ? new Date(t.y, t.m - 1, t.d) : null;
}

export function serialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial) || serial < 20000 || serial > 90000) return null;
  // Excel/Google Sheets epoch: Dec 30, 1899
  const utcMs = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
  const d = new Date(utcMs);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function getTable(sheetsMap: Record<string, string[][]>, nama: string, headerRow = 1): { head: string[]; rows: string[][] } {
  const vals = sheetsMap[nama];
  if (!vals) throw new Error(`Sheet "${nama}" tidak ditemukan`);
  const h = (headerRow || 1) - 1;
  if (!vals[h]) throw new Error(`Sheet "${nama}" kosong atau baris header tidak ada`);
  const maxLen = vals.reduce((m, r) => Math.max(m, r.length), 0);
  const pad = (r: string[]) => {
    const c = r.slice();
    while (c.length < maxLen) c.push('');
    return c;
  };
  return { head: pad(vals[h]).map(norm_), rows: vals.slice(h + 1).map(pad) };
}

function buildSumberMap(meta: SpreadsheetMeta, daftarHalaman: Record<string, string[]>): Record<string, SheetSourceLink[]> {
  const gid: Record<string, number> = {};
  meta.sheets.forEach((s) => {
    gid[s.title] = s.sheetId;
  });
  const base = `https://docs.google.com/spreadsheets/d/${meta.spreadsheetId}/edit`;
  const hasil: Record<string, SheetSourceLink[]> = {};
  Object.keys(daftarHalaman).forEach((hal) => {
    const daftar: SheetSourceLink[] = [];
    const sudah: Record<string, boolean> = {};
    daftarHalaman[hal].forEach((nama) => {
      if (sudah[nama] || gid[nama] === undefined) return;
      sudah[nama] = true;
      daftar.push({ nama, url: `${base}?gid=${gid[nama]}#gid=${gid[nama]}` });
    });
    hasil[hal] = daftar;
  });
  return hasil;
}

function formatTodayId(): string {
  const d = new Date();
  return `${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
}

/* ---------------------------- Parsers Tahun 2026 & 2027 ---------------------------- */

function parseTglAnggaran(sheetsMap: Record<string, string[][]>): string | null {
  const v = sheetsMap[SH.ANG_DASH];
  if (!v) return null;
  for (let i = 0; i < Math.min(8, v.length); i++) {
    for (let j = 0; j < Math.min(6, v[i].length); j++) {
      const s = String(v[i][j] || '');
      if (/zfmf01/i.test(s)) {
        const m = s.match(/tanggal\s*:?\s*(.+)$/i);
        return m ? m[1].trim() : s.trim();
      }
    }
  }
  return null;
}

function parseAnggaran(sheetsMap: Record<string, string[][]>): AnggaranData {
  const S = SH.ANGGARAN;
  const t = getTable(sheetsMap, S, 1);
  const h = t.head;
  const iNo = col_(h, 'no');
  const iFC = col_(h, 'funds center');
  const iCI = need_(col_(h, 'cost item'), 'Cost Item (CI)', S);
  const iRkap = need_(col_(h, 'rkap'), 'RKAP', S);
  const iRel = need_(col_(h, 'release budget'), 'Release Budget', S);
  const iCom = col_(h, 'commitment');
  const iAct = col_(h, 'actual');
  const iCon = need_(col_(h, 'consumed budget'), 'Consumed Budget', S);
  const iAv = col_(h, 'budget available');

  const rows: AnggaranRow[] = [];
  t.rows.forEach((r) => {
    const ci = String(r[iCI] || '').trim();
    if (!ci || /^(total|jumlah|perencanaan)/i.test(ci)) return;
    if (iNo > -1 && !String(r[iNo] || '').trim()) return;
    const rel = num_(r[iRel]);
    const con = num_(r[iCon]);
    rows.push({
      no: iNo > -1 ? r[iNo] : '',
      fc: iFC > -1 ? r[iFC] : '',
      ci,
      rkap: num_(r[iRkap]),
      release: rel,
      commitment: iCom > -1 ? num_(r[iCom]) : 0,
      actual: iAct > -1 ? num_(r[iAct]) : 0,
      consumed: con,
      available: iAv > -1 ? num_(r[iAv]) : rel - con,
      pct: rel > 0 ? (con / rel) * 100 : 0,
    });
  });

  const total = { rkap: 0, release: 0, commitment: 0, actual: 0, consumed: 0, available: 0, pct: 0 };
  rows.forEach((r) => {
    total.rkap += r.rkap;
    total.release += r.release;
    total.commitment += r.commitment;
    total.actual += r.actual;
    total.consumed += r.consumed;
    total.available += r.available;
  });
  total.pct = total.release > 0 ? (total.consumed / total.release) * 100 : 0;
  return { rows, total };
}

function parseKurvaAnggaran(sheetsMap: Record<string, string[][]>, namaSheet: string): KurvaAnggaranPoint[] | null {
  try {
    const v = sheetsMap[namaSheet];
    if (!v || !v.length) return null;
    let hr = -1;
    for (let i = 0; i < Math.min(v.length, 10) && hr < 0; i++) {
      if (v[i].some((c) => norm_(c) === 'periode')) hr = i;
    }
    if (hr < 0) return null;
    const h = v[hr].map(norm_);
    const iP = h.indexOf('periode');
    const iR = h.findIndex((x) => x.indexOf('rencana') === 0);
    const iK = h.findIndex((x) => x.indexOf('konsumsi') === 0 || x.indexOf('consumed') === 0 || x.indexOf('realisasi') === 0);
    if (iR < 0 || iK < 0) return null;
    const out: KurvaAnggaranPoint[] = [];
    for (let i = hr + 1; i < v.length; i++) {
      const p = String(v[i][iP] || '').trim();
      if (!p || /^(total|jumlah)/i.test(p)) continue;
      const r = String(v[i][iR] || '').trim();
      const k = String(v[i][iK] || '').trim();
      out.push({
        periode: p,
        rencana: r === '' ? null : num_(r),
        konsumsi: k === '' ? null : num_(k),
      });
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

function parsePengadaan(sheetsMap: Record<string, string[][]>, tahunSS: number): PengadaanData {
  const S = SH.PENGADAAN;
  const t = getTable(sheetsMap, S, 1);
  const h = t.head;
  const iNo = col_(h, 'no dok');
  const iDesk = need_(col_(h, 'deskripsi pekerjaan'), 'Deskripsi Pekerjaan', S);
  const iCI = col_(h, 'deskripsi ci');
  const iTipe = col_(h, 'tipe pengadaan');
  const iVen = col_(h, 'vendor');
  const iSpk = col_(h, 'nilai spk');
  const iTgl = col_(h, 'tgl spk');
  const iPos = col_(h, 'posisi berkas');
  const iSt = col_(h, 'status');
  const iKat = col_(h, 'kategori');
  const iBln = col_(h, 'bulan kontrak');

  const get = (r: string[], i: number) => (i > -1 ? String(r[i] || '').trim() : '');
  const rows: PengadaanRow[] = [];
  const hit = { Selesai: 0, 'Dalam Proses': 0, 'Gagal/Batal': 0 };
  const perBulanJml = new Array(12).fill(0);
  const perBulanNilai = new Array(12).fill(0);
  let totalSpk = 0;

  t.rows.forEach((r) => {
    if (!get(r, iDesk)) return;
    if (barisTotal_(get(r, iDesk))) return;
    const kat = katPbj_(get(r, iKat) || get(r, iSt));
    hit[kat]++;

    let spk = iSpk > -1 ? num_(r[iSpk]) : 0;
    if (!NILAI_BATAL_DIHITUNG && kat === 'Gagal/Batal') spk = 0;
    totalSpk += spk;

    let bln = iBln > -1 ? Math.round(num_(r[iBln])) : 0;
    if (!(bln >= 1 && bln <= 12)) {
      const tg = parseTgl_(get(r, iTgl));
      bln = tg && tg.y === tahunSS ? tg.m : 0;
    }
    if (bln >= 1 && bln <= 12) {
      perBulanJml[bln - 1]++;
      perBulanNilai[bln - 1] += spk;
    }

    // Normalize minor spreadsheet float artifacts like "133.0" on No Dok
    let noDok = get(r, iNo);
    if (/^\d+\.0$/.test(noDok)) noDok = noDok.slice(0, -2);

    rows.push([
      noDok,
      get(r, iDesk),
      get(r, iCI),
      get(r, iTipe),
      rapiVendor_(get(r, iVen)),
      spk,
      rapikanTgl_(get(r, iTgl)),
      get(r, iPos),
      get(r, iSt),
      kat,
      bln,
    ]);
  });

  const total = rows.length;
  return {
    total,
    selesai: hit['Selesai'],
    proses: hit['Dalam Proses'],
    gagal: hit['Gagal/Batal'],
    pctSelesai: total > 0 ? (hit['Selesai'] / total) * 100 : 0,
    totalSpk,
    perBulanJml,
    perBulanNilai,
    rows,
  };
}

function parseProgram(sheetsMap: Record<string, string[][]>, namaSum: string, namaDetail: string): ProgramData {
  const v = sheetsMap[namaSum];
  if (!v) throw new Error(`Sheet "${namaSum}" tidak ditemukan`);
  let hr = -1;
  let hc = -1;
  for (let i = 0; i < v.length && hr < 0; i++) {
    for (let j = 0; j < v[i].length - 1; j++) {
      if (norm_(v[i][j]) === 'program' && norm_(v[i][j + 1]) === 'total unit') {
        hr = i;
        hc = j;
        break;
      }
    }
  }
  if (hr < 0) throw new Error(`Tabel "Program | Total Unit" tidak ditemukan di sheet ${namaSum}`);

  const head = v[hr].slice(hc).map(norm_);
  const ix = (n: string) => col_(head, n);
  const iT = ix('total unit');
  const iR = ix('realisasi');
  const iTs = ix('tsgo');
  const iB = ix('belum masuk');
  const iK = ix('konservasi');
  const iL = ix('lainnya');

  const ringkas: ProgramRingkasItem[] = [];
  for (let i = hr + 1; i < v.length; i++) {
    const p = String(v[i][hc] || '').trim();
    if (!p || !/^[A-Za-z]/.test(p) || barisTotal_(p)) break;
    const total = iT > -1 ? num_(v[i][hc + iT]) : 0;
    const real = iR > -1 ? num_(v[i][hc + iR]) : 0;
    ringkas.push({
      program: p,
      total,
      realisasi: real,
      tsgo: iTs > -1 ? num_(v[i][hc + iTs]) : 0,
      belumMasuk: iB > -1 ? num_(v[i][hc + iB]) : 0,
      konservasi: iK > -1 ? num_(v[i][hc + iK]) : 0,
      lainnya: iL > -1 ? num_(v[i][hc + iL]) : 0,
      pct: total > 0 ? (real / total) * 100 : 0,
    });
  }

  const bulan: Record<string, ProgramBulanSeries> = {};
  const detail: Record<string, ProgramDetailRow[]> = {};
  let detailHead: string[] = [];

  try {
    const vals = sheetsMap[namaDetail];
    if (vals && vals.length > 0) {
      const headAsli = vals[0];
      const headN = headAsli.map(norm_);
      const rows = vals.slice(1);
      const iP = col_(headN, 'program');
      const iKat = col_(headN, 'kategori status');
      const iRen = col_(headN, 'no bln rencana');
      const iPro = col_(headN, 'no bln produksi');

      let tampil = KOLOM_TAMPIL.map((n) => col_(headN, n)).filter((i) => i > -1);
      if (!tampil.length) {
        for (let i = 0; i < headN.length && tampil.length < 8; i++) {
          if (headN[i]) tampil.push(i);
        }
      }
      detailHead = tampil.map((i) => headAsli[i] || '');
      const kolTgl = tampil.filter((i) => /^tgl/.test(headN[i]));

      if (iP > -1 && iKat > -1 && iRen > -1 && iPro > -1) {
        const semuaBulan: ProgramBulanSeries = {
          rencana: new Array(12).fill(0),
          realisasi: new Array(12).fill(0),
        };
        rows.forEach((r) => {
          const p = String(r[iP] || '').trim();
          if (!p) return;
          if (!bulan[p]) {
            bulan[p] = { rencana: new Array(12).fill(0), realisasi: new Array(12).fill(0) };
            detail[p] = [];
          }
          const mr = Math.round(num_(r[iRen]));
          const mp = Math.round(num_(r[iPro]));
          const real = norm_(r[iKat]) === 'realisasi';
          if (mr >= 1 && mr <= 12) {
            bulan[p].rencana[mr - 1]++;
            semuaBulan.rencana[mr - 1]++;
          }
          if (real && mp >= 1 && mp <= 12) {
            bulan[p].realisasi[mp - 1]++;
            semuaBulan.realisasi[mp - 1]++;
          }
          detail[p].push({
            c: tampil.map((i) => (kolTgl.indexOf(i) > -1 ? rapikanTgl_(r[i]) : String(r[i] ?? ''))),
            mr,
            mp,
            real,
          });
        });
        if (semuaBulan.rencana.some((n) => n > 0) || semuaBulan.realisasi.some((n) => n > 0)) {
          bulan.__SEMUA__ = semuaBulan;
        }
      }
    }
  } catch {
    // optional detail sheet
  }

  // Fallback: parse "2. Rencana vs Realisasi per Bulan" section on summary sheet if bulan.__SEMUA__ is missing
  if (!bulan.__SEMUA__) {
    try {
      let br = -1;
      let bc = -1;
      for (let i = hr + 1; i < v.length && br < 0; i++) {
        for (let j = 0; j < v[i].length; j++) {
          if (norm_(v[i][j]) === 'bulan') {
            br = i;
            bc = j;
            break;
          }
        }
      }
      if (br > -1 && bc > -1) {
        const bHead1 = v[br].map(norm_);
        const bHead2 = (v[br + 1] || []).map(norm_);
        const iTotRen = bHead1.findIndex((x, j) => j > bc && x === 'total rencana');
        const iTotReal = bHead1.findIndex((x, j) => j > bc && x === 'total realisasi');

        // Map per-program Rencana/Realisasi column pairs in Section 2
        const progPairs: Record<string, { renCol: number; realCol: number }> = {};
        let curProg = '';
        for (let j = bc + 1; j < bHead1.length; j++) {
          const h1 = String(v[br][j] || '').trim();
          const h1n = norm_(h1);
          if (h1 && !h1n.startsWith('total') && !h1n.startsWith('kum')) {
            curProg = h1;
          } else if (h1n.startsWith('total') || h1n.startsWith('kum')) {
            curProg = '';
          }
          const h2n = bHead2[j] || '';
          if (curProg && (h2n === 'rencana' || h2n === 'realisasi')) {
            if (!progPairs[curProg]) progPairs[curProg] = { renCol: -1, realCol: -1 };
            if (h2n === 'rencana') progPairs[curProg].renCol = j;
            if (h2n === 'realisasi') progPairs[curProg].realCol = j;
          }
        }

        const semuaFallback: ProgramBulanSeries = {
          rencana: new Array(12).fill(0),
          realisasi: new Array(12).fill(0),
        };
        const hasSubRow = bHead2.some((x) => x === 'rencana' || x === 'realisasi');
        for (let i = br + (hasSubRow ? 2 : 1); i < v.length; i++) {
          const bName = norm_(v[i][bc]);
          if (!bName || barisTotal_(bName)) break;
          const mNum = BLN_MAP_[bName];
          if (!mNum || mNum < 1 || mNum > 12) continue;
          const idx = mNum - 1;

          let rowRen = iTotRen > -1 ? num_(v[i][iTotRen]) : 0;
          let rowReal = iTotReal > -1 ? num_(v[i][iTotReal]) : 0;
          let sumPairRen = 0;
          let sumPairReal = 0;

          Object.entries(progPairs).forEach(([pName, cols]) => {
            if (!bulan[pName]) {
              bulan[pName] = { rencana: new Array(12).fill(0), realisasi: new Array(12).fill(0) };
            }
            const rVal = cols.renCol > -1 ? num_(v[i][cols.renCol]) : 0;
            const aVal = cols.realCol > -1 ? num_(v[i][cols.realCol]) : 0;
            bulan[pName].rencana[idx] = rVal;
            bulan[pName].realisasi[idx] = aVal;
            sumPairRen += rVal;
            sumPairReal += aVal;
          });

          if (iTotRen < 0) rowRen = sumPairRen;
          if (iTotReal < 0) rowReal = sumPairReal;
          semuaFallback.rencana[idx] = rowRen;
          semuaFallback.realisasi[idx] = rowReal;
        }

        if (semuaFallback.rencana.some((n) => n > 0) || semuaFallback.realisasi.some((n) => n > 0)) {
          bulan.__SEMUA__ = semuaFallback;
        }
      }
    } catch {
      // optional monthly summary section
    }
  }

  // Re-sync summary counts from detail rows
  if (Object.keys(detail).length) {
    const hit: Record<string, { total: number; realisasi: number; tsgo: number; belumMasuk: number; konservasi: number; lainnya: number }> = {};
    Object.keys(detail).forEach((p) => {
      const c = { total: 0, realisasi: 0, tsgo: 0, belumMasuk: 0, konservasi: 0, lainnya: 0 };
      detail[p].forEach((r) => {
        c.total++;
        const t = r.c.join(' ').toLowerCase();
        if (r.real) c.realisasi++;
        else if (/tsgo/.test(t)) c.tsgo++;
        else if (/konservasi|geser/.test(t)) c.konservasi++;
        else if (/belum/.test(t)) c.belumMasuk++;
        else c.lainnya++;
      });
      hit[norm_(p)] = c;
    });

    ringkas.forEach((r) => {
      const c = hit[norm_(r.program)];
      if (!c) return;
      r.total = c.total;
      r.realisasi = c.realisasi;
      r.tsgo = c.tsgo;
      r.belumMasuk = c.belumMasuk;
      r.konservasi = c.konservasi;
      r.lainnya = c.lainnya;
      r.pct = r.total > 0 ? (r.realisasi / r.total) * 100 : 0;
    });
  }

  return { ringkas, bulan, detail, detailHead };
}

function parseNusantara(sheetsMap: Record<string, string[][]>): NusantaraData {
  const v = sheetsMap[SH.NUS_SUM];
  if (!v) throw new Error(`Sheet "${SH.NUS_SUM}" tidak ditemukan`);
  const cari = (awalan: string) => {
    for (let i = 0; i < v.length; i++) {
      for (let j = 0; j < v[i].length; j++) {
        if (norm_(v[i][j]).indexOf(awalan) === 0) {
          for (let k = j + 1; k < v[i].length; k++) {
            if (String(v[i][k] || '').trim() !== '') return String(v[i][k]).trim();
          }
        }
      }
    }
    return '';
  };

  const kpi = {
    aktual: cari('rata-rata aktual'),
    rencana: cari('rata-rata program'),
    deviasi: cari('deviasi'),
    selesai: cari('kereta selesai'),
    aktualNum: 0,
    rencanaNum: 0,
    deviasiNum: 0,
    selesaiNum: 0,
  };
  kpi.aktualNum = num_(kpi.aktual);
  kpi.rencanaNum = num_(kpi.rencana);
  kpi.deviasiNum = num_(kpi.deviasi);

  const t = getTable(sheetsMap, SH.NUS, 1);
  const h = t.head;
  const iK = need_(col_(h, 'kereta'), 'Kereta / Pekerjaan', SH.NUS);
  const iG = col_(h, 'kelompok');
  const iPos = col_(h, 'posisi data');
  const iRen = col_(h, 'rencana kumulatif');
  const iAk = col_(h, 'aktual kumulatif');
  const iDev = col_(h, 'deviasi');
  const iSisa = col_(h, 'sisa');
  const iSt = col_(h, 'status');

  const items: NusantaraItem[] = [];
  t.rows.forEach((r) => {
    const k = String(r[iK] || '').trim();
    if (!k) return;
    items.push({
      kereta: k,
      kelompok: iG > -1 ? r[iG] : '',
      posisi: iPos > -1 ? r[iPos] : '',
      rencana: iRen > -1 ? num_(r[iRen]) : 0,
      aktual: iAk > -1 ? num_(r[iAk]) : 0,
      deviasi: iDev > -1 ? num_(r[iDev]) : 0,
      sisa: iSisa > -1 ? num_(r[iSisa]) : 0,
      status: iSt > -1 ? r[iSt] : '',
    });
  });

  const nSelesai = items.filter((x) => norm_(x.status) === 'selesai' || x.aktual >= 99.995).length;
  kpi.selesai = String(nSelesai);
  kpi.selesaiNum = nSelesai;

  const kurva: NusantaraKurvaPoint[] = [];
  try {
    const kv = sheetsMap[SH.KURVA];
    if (kv && kv.length > 2) {
      const head = kv[1].map(norm_);
      const iP = head.indexOf('periode');
      const iR = head.findIndex((x) => x.indexOf('rata-rata rencana') === 0);
      const iA = head.findIndex((x) => x.indexOf('rata-rata aktual') === 0);
      if (iP > -1 && iR > -1 && iA > -1) {
        for (let i = 2; i < kv.length; i++) {
          const p = String(kv[i][iP] || '').trim();
          if (!p) continue;
          const rv = String(kv[i][iR] || '').trim();
          const av = String(kv[i][iA] || '').trim();
          kurva.push({
            periode: p,
            rencana: rv === '' ? null : num_(rv),
            aktual: av === '' ? null : num_(av),
          });
        }
      }
    }
  } catch {
    // optional kurva
  }

  return { kpi, items, kurva };
}

function buatCariVendor_(daftar: Array<[string, string]>): (judul: string) => string {
  const memo: Record<string, string> = {};
  return (judul: string) => {
    const j = norm_(judul);
    if (!j) return '';
    if (memo[j] !== undefined) return memo[j];
    let hasil = '';
    for (let i = 0; i < daftar.length && !hasil; i++) {
      if (daftar[i][0] === j) hasil = daftar[i][1];
    }
    if (!hasil && j.length >= 20) {
      for (let i = 0; i < daftar.length && !hasil; i++) {
        if (daftar[i][0].indexOf(j) > -1 || j.indexOf(daftar[i][0]) > -1) hasil = daftar[i][1];
      }
    }
    memo[j] = hasil;
    return hasil;
  };
}

function parseSukuCadang(sheetsMap: Record<string, string[][]>): SukuCadangData {
  const S = SH.SPARE;
  const t = getTable(sheetsMap, S, 1);
  const h = t.head;
  const iM = col_(h, 'matnum');
  const iSum = col_(h, 'sumber');
  const iJ = need_(col_(h, 'judul pengadaan'), 'Judul Pengadaan', S);
  const iD = col_(h, 'deskripsi material');
  const iSat = col_(h, 'satuan');
  const iQ = col_(h, 'qty');
  const iH = col_(h, 'harga satuan');
  const iTot = need_(col_(h, 'jumlah harga'), 'Jumlah Harga', S);
  const iV = col_(h, 'vendor');

  const daftar: Array<[string, string]> = [];
  if (iV < 0 && sheetsMap[SH.PENGADAAN]) {
    try {
      const p = getTable(sheetsMap, SH.PENGADAAN, 1);
      const pD = col_(p.head, 'deskripsi pekerjaan');
      const pV = col_(p.head, 'vendor');
      if (pD > -1 && pV > -1) {
        p.rows.forEach((r) => {
          const d = norm_(r[pD]);
          const v = String(r[pV] || '').trim();
          if (d && v) daftar.push([d, rapiVendor_(v)]);
        });
      }
    } catch {
      // optional
    }
  }
  const cariVendor = buatCariVendor_(daftar);

  const rows: SukuCadangRow[] = [];
  const perSumber: Record<string, { baris: number; nilai: number }> = {};
  let total = 0;

  t.rows.forEach((r) => {
    if (!String(r[iJ] || '').trim() && !String(iM > -1 ? r[iM] : '').trim()) return;
    const jml = num_(r[iTot]);
    total += jml;
    const s = iSum > -1 ? String(r[iSum] || '').trim() || 'Lainnya' : 'Lainnya';
    if (!perSumber[s]) perSumber[s] = { baris: 0, nilai: 0 };
    perSumber[s].baris++;
    perSumber[s].nilai += jml;
    const rawV = iV > -1 ? String(r[iV] || '').trim() : cariVendor(r[iJ]);
    const vendor = rawV ? rapiVendor_(rawV) : '(belum ada vendor)';
    rows.push([
      iM > -1 ? r[iM] : '',
      r[iJ],
      vendor,
      iD > -1 ? r[iD] : '',
      iSat > -1 ? r[iSat] : '',
      iQ > -1 ? num_(r[iQ]) : 0,
      iH > -1 ? num_(r[iH]) : 0,
    ]);
  });

  return { total, jumlahBaris: rows.length, perSumber, rows };
}

/* ---------------------------- Parsers Tahun 2025 ---------------------------- */

function parseAnggaran25(sheetsMap: Record<string, string[][]>): AnggaranData {
  const S = SH25.RKAD;
  const t = getTable(sheetsMap, S, 1);
  const h = t.head;
  const iCI = need_(col_(h, 'funds center/commitment item'), 'Funds Center/Commitment Item', S);
  const iDes = col_(h, 'deskripsi ci');
  const iRkap = need_(col_(h, 'rkap'), 'RKAP', S);
  const iRel = need_(col_(h, 'release budget'), 'Release Budget', S);
  const iCom = col_(h, 'comitment');
  const iAct = col_(h, 'actual');
  const iCon = need_(col_(h, 'consumed budget'), 'Consumed Budget', S);
  const iAv = col_(h, 'budget available');
  const iTgl = col_(h, 'tgl. update');

  const rows: AnggaranRow[] = [];
  let tgl: string | null = null;
  let no = 0;

  t.rows.forEach((r) => {
    const ci = String(r[iCI] || '').trim();
    if (!ci || /^(total|jumlah)/i.test(ci)) return;
    const rel = num_(r[iRel]);
    const con = num_(r[iCon]);
    if (!tgl && iTgl > -1 && String(r[iTgl] || '').trim()) tgl = String(r[iTgl]).trim();
    rows.push({
      no: ++no,
      fc: iDes > -1 ? r[iDes] : '',
      ci,
      rkap: num_(r[iRkap]),
      release: rel,
      commitment: iCom > -1 ? num_(r[iCom]) : 0,
      actual: iAct > -1 ? num_(r[iAct]) : 0,
      consumed: con,
      available: iAv > -1 ? num_(r[iAv]) : rel - con,
      pct: rel > 0 ? (con / rel) * 100 : 0,
    });
  });

  const total = { rkap: 0, release: 0, commitment: 0, actual: 0, consumed: 0, available: 0, pct: 0 };
  rows.forEach((r) => {
    total.rkap += r.rkap;
    total.release += r.release;
    total.commitment += r.commitment;
    total.actual += r.actual;
    total.consumed += r.consumed;
    total.available += r.available;
  });
  total.pct = total.release > 0 ? (total.consumed / total.release) * 100 : 0;
  return { rows, total, tgl };
}

function parsePengadaan25(sheetsMap: Record<string, string[][]>): PengadaanData {
  const S = SH25.PENGADAAN;
  const t = getTable(sheetsMap, S, 1);
  const h = t.head;
  const iNo = col_(h, 'no dokumen');
  const iDesk = need_(col_(h, 'deskripsi'), 'DESKRIPSI', S);
  const iCI = col_(h, 'deskripsi ci');
  const iTipe = col_(h, 'tipe pengadaan');
  const iVen = col_(h, 'vendor');
  const iSpk = need_(col_(h, 'netto / bruto spk,kontrak, umds'), 'NETTO / BRUTO SPK,KONTRAK, UMDS', S);
  const iTgl = col_(h, 'tgl spk/kontrak');
  const iPos = col_(h, 'posisi berkas');
  const iSt = col_(h, 'status');

  const get = (r: string[], i: number) => (i > -1 ? String(r[i] || '').trim() : '');
  const rows: PengadaanRow[] = [];
  const hit = { Selesai: 0, 'Dalam Proses': 0, 'Gagal/Batal': 0 };
  const perBulanJml = new Array(12).fill(0);
  const perBulanNilai = new Array(12).fill(0);
  let totalSpk = 0;

  t.rows.forEach((r) => {
    if (!get(r, iDesk)) return;
    if (barisTotal_(get(r, iDesk))) return;
    const kat = katPbj_(get(r, iSt));
    hit[kat]++;

    let spk = num_(r[iSpk]);
    if (!NILAI_BATAL_DIHITUNG && kat === 'Gagal/Batal') spk = 0;
    totalSpk += spk;

    const tg = parseTgl_(get(r, iTgl));
    const bln = tg && tg.y === 2025 ? tg.m : 0;
    if (bln >= 1 && bln <= 12) {
      perBulanJml[bln - 1]++;
      perBulanNilai[bln - 1] += spk;
    }

    rows.push([
      get(r, iNo),
      get(r, iDesk),
      get(r, iCI),
      get(r, iTipe),
      rapiVendor_(get(r, iVen)),
      spk,
      rapikanTgl_(get(r, iTgl)),
      get(r, iPos),
      get(r, iSt),
      kat,
      bln,
    ]);
  });

  const total = rows.length;
  return {
    total,
    selesai: hit['Selesai'],
    proses: hit['Dalam Proses'],
    gagal: hit['Gagal/Batal'],
    pctSelesai: total > 0 ? (hit['Selesai'] / total) * 100 : 0,
    totalSpk,
    perBulanJml,
    perBulanNilai,
    rows,
  };
}

function parseSukuCadang25(sheetsMap: Record<string, string[][]>, pbj: PengadaanData | null): SukuCadangData {
  const daftar: Array<[string, string]> = [];
  if (pbj?.rows) {
    pbj.rows.forEach((r) => {
      const d = norm_(r[1]);
      const v = String(r[4] || '').trim();
      if (d && v) daftar.push([d, v]);
    });
  }
  const cariVendor = buatCariVendor_(daftar);

  const rows: SukuCadangRow[] = [];
  const perSumber: Record<string, { baris: number; nilai: number }> = {};
  let total = 0;

  const baca = (nama: string, sumber: string, k: { judul: string; desk: string; qty: string; harga: string }) => {
    const t = getTable(sheetsMap, nama, 1);
    const h = t.head;
    const iJ = need_(col_(h, k.judul), k.judul, nama);
    const iM = col_(h, 'matnum');
    const iD = col_(h, k.desk);
    const iSat = col_(h, 'satuan');
    const iQ = col_(h, k.qty);
    const iH = col_(h, k.harga);

    t.rows.forEach((r) => {
      const judul = String(r[iJ] || '').trim();
      const mat = iM > -1 ? String(r[iM] || '').trim() : '';
      if (!judul && !mat) return;
      const qty = iQ > -1 ? num_(r[iQ]) : 0;
      const harga = iH > -1 ? num_(r[iH]) : 0;
      const jml = qty * harga;
      total += jml;
      if (!perSumber[sumber]) perSumber[sumber] = { baris: 0, nilai: 0 };
      perSumber[sumber].baris++;
      perSumber[sumber].nilai += jml;
      rows.push([
        mat,
        judul,
        cariVendor(judul) || '(belum ada vendor)',
        iD > -1 ? r[iD] : '',
        iSat > -1 ? r[iSat] : '',
        qty,
        harga,
      ]);
    });
  };

  baca(SH25.SUKCAD_KONTRAK, 'Sukcad Kontrak / Persediaan', {
    judul: 'judul pengadaan',
    desk: 'deskripsi',
    qty: 'qty',
    harga: 'harga satuan rab',
  });
  baca(SH25.SUKCAD_UMDS, 'Sukcad UMDS', {
    judul: 'pengadaan',
    desk: 'deskripsi barang',
    qty: 'vol',
    harga: 'harga sukcad',
  });

  return { total, jumlahBaris: rows.length, perSumber, rows };
}

function parsePenugasan25(sheetsMap: Record<string, string[][]>): PenugasanData {
  const S = SH25.PENUGASAN;
  const t = getTable(sheetsMap, S, 1);
  const h = t.head;
  const iNo = col_(h, 'no');
  const iNama = need_(col_(h, 'nama pengadaan'), 'NAMA PENGADAAN', S);
  const iRab = col_(h, 'nilai rab');
  const iHps = col_(h, 'nilai hps');
  const iNil = col_(h, 'nilai perjanjian');
  const iMitra = col_(h, 'mitra');
  const iTgl = col_(h, 'tgl kontrak');
  const iNoK = col_(h, 'no. kontrak');
  const iMppl = col_(h, 'mppl');
  const iKet = col_(h, 'keterangan');
  const iTipe = col_(h, 'tipe pengadaan');
  const iProg = col_(h, 'progres');

  const mulai = [iTipe, iProg].filter((i) => i > -1);
  const dari = mulai.length ? Math.min(...mulai) : 0;
  const get = (r: string[], i: number) => (i > -1 ? String(r[i] || '').trim() : '');

  const rows: PenugasanRow[] = [];
  const perStatus: Record<string, number> = {};
  const perTipe: Record<string, number> = {};
  let nilaiRab = 0;
  let nilaiPerjanjian = 0;
  let batal = 0;

  t.rows.forEach((r) => {
    if (!get(r, iNama)) return;
    const ekor = r.slice(dari).join(' ');
    const isBatal = /batal|gagal/i.test(ekor);
    const status = isBatal ? 'BATAL' : get(r, iProg) || '-';
    let tipe = get(r, iTipe);
    if (/batal/i.test(tipe)) tipe = '';
    tipe = tipe || '(belum diisi)';
    const rab = num_(r[iRab]);
    const hps = num_(r[iHps]);
    const nil = num_(r[iNil]);
    nilaiRab += rab;
    nilaiPerjanjian += nil;
    if (isBatal) batal++;
    perStatus[status] = (perStatus[status] || 0) + 1;
    perTipe[tipe] = (perTipe[tipe] || 0) + 1;
    rows.push([
      get(r, iNo),
      get(r, iNama),
      tipe,
      get(r, iMitra),
      rab,
      hps,
      nil,
      rapikanTgl_(get(r, iTgl)),
      get(r, iNoK),
      get(r, iMppl),
      status,
      get(r, iKet),
    ]);
  });

  return {
    total: rows.length,
    nilaiRab,
    nilaiPerjanjian,
    batal,
    perStatus,
    perTipe,
    rows,
  };
}

/* ---------------------------- APAR Parser ---------------------------- */

export function parseApar(vals: string[][]): AparData {
  const S = APAR_NAMA_SHEET;
  if (!vals || !vals.length) throw new Error(`Sheet "${S}" tidak ditemukan atau kosong`);
  let hr = -1;
  for (let i = 0; i < Math.min(vals.length, 15) && hr < 0; i++) {
    if (vals[i].some((c) => norm_(c) === 'no. apar')) hr = i;
  }
  if (hr < 0) throw new Error(`Header "NO. APAR" tidak ditemukan di sheet "${S}"`);

  const maxLen = vals.reduce((m, r) => Math.max(m, r.length), 0);
  const pad = (r: string[]) => {
    const c = r.slice();
    while (c.length < maxLen) c.push('');
    return c;
  };
  const h1 = pad(vals[hr]).map(norm_);
  const h2 = pad(vals[hr + 1] || []).map(norm_);
  const sub = h2.some((x) => x === 'pressure');
  const head = h1.map((x, j) => (sub && h2[j]) || x);

  const iNo = need_(col_(head, 'no. apar'), 'NO. APAR', S);
  const iLok = need_(col_(head, 'lokasi'), 'LOKASI', S);
  const iKad = need_(col_(head, 'kadaluarsa'), 'KADALUARSA', S);
  const iJen = col_(head, 'jenis');
  const iKap = col_(head, 'kapasitas');
  const iCek = col_(head, 'tanggal terakhir pengecekan');
  const iPre = col_(head, 'pressure');
  const iSeg = col_(head, 'segel');
  const iSel = col_(head, 'selang');
  const iTab = col_(head, 'kondisi tabung');
  const iTem = col_(head, 'tempat');
  const iBar = col_(head, 'barcode');
  const iNext = col_(head, 'kadaluarsa berikutnya');

  const get = (r: string[], i: number) => (i > -1 ? String(r[i] || '').trim() : '');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const perStatus: Record<AparStatus, number> = {
    Aman: 0,
    'Segera kadaluarsa': 0,
    Kadaluarsa: 0,
    'Tidak ada data': 0,
  };
  const bulanMap: Record<number, { key: number; label: string; n: number; lewat: boolean }> = {};
  const rows: AparRow[] = [];
  let tanpaLokasi = 0;
  let sudahCek = 0;
  let sudahGanti = 0;

  vals.slice(hr + (sub ? 2 : 1)).forEach((rawRow) => {
    const r = pad(rawRow);
    const no = get(r, iNo);
    const lok = get(r, iLok);
    if (!no && !lok) return;
    const kad = get(r, iKad);
    const nxt = get(r, iNext);
    const cek = get(r, iCek);
    const bar = get(r, iBar);

    const tgl = aparParseTgl_(nxt || kad);
    let status: AparStatus = 'Tidak ada data';
    let sisa: number | '' = '';
    if (tgl) {
      sisa = Math.round((tgl.getTime() - today.getTime()) / 86400000);
      status = sisa < 0 ? 'Kadaluarsa' : sisa <= APAR_BATAS_HARI ? 'Segera kadaluarsa' : 'Aman';
      const key = tgl.getFullYear() * 100 + tgl.getMonth() + 1;
      if (!bulanMap[key]) {
        bulanMap[key] = {
          key,
          label: `${BULAN_ID[tgl.getMonth()].slice(0, 3)} ${tgl.getFullYear()}`,
          n: 0,
          lewat: tgl < today,
        };
      }
      bulanMap[key].n++;
    }
    perStatus[status]++;
    if (!lok) tanpaLokasi++;
    if (cek) sudahCek++;
    if (bar || nxt) sudahGanti++;

    rows.push([
      no,
      lok,
      get(r, iJen),
      get(r, iKap),
      kad,
      cek,
      get(r, iPre),
      get(r, iSeg),
      get(r, iSel),
      get(r, iTab),
      get(r, iTem),
      bar,
      nxt,
      status,
      sisa,
    ]);
  });

  return {
    total: rows.length,
    tanpaLokasi,
    sudahCek,
    sudahGanti,
    batasHari: APAR_BATAS_HARI,
    acuan: `${today.getDate()} ${BULAN_ID[today.getMonth()]} ${today.getFullYear()}`,
    perStatus,
    perBulan: Object.keys(bulanMap)
      .map((k) => bulanMap[Number(k)])
      .sort((a, b) => a.key - b.key),
    rows,
  };
}

/* ---------------------------- Fasilitas Parsers (PROLIS & BYSGU) ---------------------------- */

function extractMonthIdx(cell: string): number {
  const n = norm_(cell);
  if (!n) return -1;
  const keys = Object.keys(BLN_MAP_);
  for (const k of keys) {
    if (n === k || n.startsWith(`${k} `) || n.startsWith(`${k}-`) || n.startsWith(`${k}/`)) {
      return BLN_MAP_[k] - 1;
    }
  }
  return -1;
}

function normKondisiChar(v: string): 'B' | 'R' | 'A' | '-' {
  const n = norm_(v);
  if (!n || n === '-') return '-';
  if (n === 'b' || /baik|\bok\b|layak/.test(n)) return 'B';
  if (n === 'a' || /afkir|usulan/.test(n)) return 'A';
  if (n === 'r' || /rusak/.test(n)) return 'R';
  return '-';
}

function parseProlis(vals: string[][]): ProlisData {
  const S = FAS_SHEET_PROLIS;
  if (!vals || !vals.length) throw new Error(`Sheet "${S}" tidak ditemukan atau kosong`);
  const maxLen = vals.reduce((m, r) => Math.max(m, r.length), 0);
  const pad = (r: string[]) => {
    const c = r.slice();
    while (c.length < maxLen) c.push('');
    return c;
  };

  // Find header row containing "jenis" or "no mesin" or "mesin"
  let hr = -1;
  for (let i = 0; i < Math.min(15, vals.length) && hr < 0; i++) {
    const rowN = vals[i].map(norm_);
    if (rowN.some((c) => /jenis|mesin|spesifikasi/.test(c)) && rowN.some((c) => c === 'no' || c === 'no.' || c === 'lokasi')) {
      hr = i;
    }
  }
  if (hr < 0) hr = 0;

  const h0 = pad(vals[hr] || []).map(norm_);
  const h1 = pad(vals[hr + 1] || []).map(norm_);
  const hPrev = hr > 0 ? pad(vals[hr - 1] || []).map(norm_) : new Array(maxLen).fill('');

  // Check if subheader exists below hr (e.g. "prog", "real", "kond" under Jan..Des) or section above hr
  const hasSubBelow = h1.some((c) => /^(prog|program|real|realisasi|kond|kondisi)$/.test(c));
  const dataStart = hr + (hasSubBelow ? 2 : 1);

  const combinedHead = h0.map((c, j) => c || h1[j] || hPrev[j] || '');
  const iNo = col_(combinedHead, 'no');
  const iThn = col_(combinedHead, 'tahun');
  const iJen = col_(combinedHead, 'jenis');
  const iSpes = col_(combinedHead, 'spesifikasi');
  const iMesin = col_(combinedHead, 'no mesin') > -1 ? col_(combinedHead, 'no mesin') : col_(combinedHead, 'mesin');
  const iLok = col_(combinedHead, 'lokasi');
  const iDok = col_(combinedHead, 'dokumentasi') > -1 ? col_(combinedHead, 'dokumentasi') : col_(combinedHead, 'link');

  // Map 12 months for Program, Realisasi, Kondisi
  const progCols = new Array(12).fill(-1);
  const realCols = new Array(12).fill(-1);
  const kondCols = new Array(12).fill(-1);

  if (hasSubBelow) {
    let curMonth = -1;
    for (let j = 0; j < maxLen; j++) {
      const mIdx = extractMonthIdx(h0[j]);
      if (mIdx > -1) curMonth = mIdx;
      const sub = h1[j];
      if (curMonth > -1) {
        if (/prog/.test(sub)) progCols[curMonth] = j;
        else if (/real/.test(sub)) realCols[curMonth] = j;
        else if (/kond|stat/.test(sub)) kondCols[curMonth] = j;
      }
    }
  } else {
    // Check section row above or single columns with month prefix/suffix
    let curSection: 'prog' | 'real' | 'kond' | '' = '';
    for (let j = 0; j < maxLen; j++) {
      const top = hPrev[j];
      if (/program|rencana/.test(top)) curSection = 'prog';
      else if (/realisasi/.test(top)) curSection = 'real';
      else if (/kondisi/.test(top)) curSection = 'kond';

      const mIdx = extractMonthIdx(h0[j]);
      if (mIdx > -1) {
        if (curSection === 'prog' || /prog/.test(h0[j])) progCols[mIdx] = j;
        else if (curSection === 'real' || /real/.test(h0[j])) realCols[mIdx] = j;
        else if (curSection === 'kond' || /kond/.test(h0[j])) kondCols[mIdx] = j;
        else if (progCols[mIdx] === -1) progCols[mIdx] = j;
        else if (realCols[mIdx] === -1) realCols[mIdx] = j;
        else if (kondCols[mIdx] === -1) kondCols[mIdx] = j;
      }
    }
  }

  const rows: ProlisRow[] = [];
  const tahunSet = new Set<number>();

  vals.slice(dataStart).forEach((raw) => {
    const r = pad(raw);
    const jenis = iJen > -1 ? String(r[iJen] || '').trim() : '';
    const mesin = iMesin > -1 ? String(r[iMesin] || '').trim() : '';
    const spes = iSpes > -1 ? String(r[iSpes] || '').trim() : '';
    if (!jenis && !mesin && !spes) return;
    if (barisTotal_(jenis) || barisTotal_(mesin)) return;

    const thVal = iThn > -1 ? Math.round(num_(r[iThn])) : 0;
    if (thVal > 2000) tahunSet.add(thVal);

    const progLabels: string[] = [];
    let realBits = '';
    let adaKondBits = '';
    let kondChars = '';

    for (let m = 0; m < 12; m++) {
      const pv = progCols[m] > -1 ? String(r[progCols[m]] || '').trim() : '';
      const rv = realCols[m] > -1 ? String(r[realCols[m]] || '').trim() : '';
      const kv = kondCols[m] > -1 ? String(r[kondCols[m]] || '').trim() : '';

      const hasProg = Boolean(pv && pv !== '-' && pv !== '0' && norm_(pv) !== 'tidak');
      progLabels.push(hasProg ? pv : '');

      const isReal = Boolean(rv && rv !== '-' && rv !== '0' && /^(1|ya|v|✓|x|ada|selesai|realisasi|ok|done|true)$/i.test(rv)) ||
        (num_(rv) > 0 && !/^0$/.test(rv));
      realBits += isReal ? '1' : '0';

      const kChar = normKondisiChar(kv);
      adaKondBits += kChar !== '-' ? '1' : '0';
      kondChars += kChar;
    }

    rows.push([
      iNo > -1 ? String(r[iNo] || '').trim() : '',
      thVal || 2026,
      jenis,
      spes,
      mesin,
      iLok > -1 ? String(r[iLok] || '').trim() : '',
      iDok > -1 ? String(r[iDok] || '').trim() : '',
      '',
      progLabels,
      realBits,
      adaKondBits,
      kondChars,
    ]);
  });

  const tahunList = Array.from(tahunSet).sort((a, b) => b - a);
  const tahun = tahunList[0] || new Date().getFullYear();
  return { tahun, tahunList, rows };
}

function parseBysgu(vals: string[][]): BysguData {
  const S = FAS_SHEET_BYSGU;
  if (!vals || !vals.length) throw new Error(`Sheet "${S}" tidak ditemukan atau kosong`);
  const maxLen = vals.reduce((m, r) => Math.max(m, r.length), 0);
  const pad = (r: string[]) => {
    const c = r.slice();
    while (c.length < maxLen) c.push('');
    return c;
  };

  let hr = -1;
  for (let i = 0; i < Math.min(15, vals.length) && hr < 0; i++) {
    const rowN = vals[i].map(norm_);
    if (rowN.some((c) => /fasilitas|persyaratan|eksisting/.test(c)) && rowN.some((c) => /item|jenis|no/.test(c))) {
      hr = i;
    }
  }
  if (hr < 0) hr = 0;

  const h = pad(vals[hr]).map(norm_);
  const iNo = col_(h, 'no');
  const iJen = col_(h, 'jenis');
  const iFas = col_(h, 'fasilitas');
  const iItem = col_(h, 'item');
  const iPers = col_(h, 'persyaratan') > -1 ? col_(h, 'persyaratan') : col_(h, 'spesifikasi');
  const iTw = col_(h, 'tw') > -1 ? col_(h, 'tw') : col_(h, 'triwulan');
  const iTh = col_(h, 'tahun');
  const iWajib = col_(h, 'kelas a') > -1 ? col_(h, 'kelas a') : col_(h, 'wajib');
  const iEks = col_(h, 'eksisting');
  const iKet = col_(h, 'keterangan');

  const rows: BysguRow[] = [];
  const tahunSet = new Set<number>();

  vals.slice(hr + 1).forEach((raw) => {
    const r = pad(raw);
    const jen = iJen > -1 ? String(r[iJen] || '').trim() : '';
    const fas = iFas > -1 ? String(r[iFas] || '').trim() : '';
    const item = iItem > -1 ? String(r[iItem] || '').trim() : '';
    if (!jen && !fas && !item) return;
    if (barisTotal_(jen) || barisTotal_(item)) return;

    const twRaw = iTw > -1 ? String(r[iTw] || '').trim() : '';
    const twMatch = twRaw.match(/([1-4])/);
    const tw = twMatch ? Number(twMatch[1]) : 0;

    const th = iTh > -1 ? Math.round(num_(r[iTh])) : 0;
    if (th > 2000) tahunSet.add(th);

    const wjRaw = iWajib > -1 ? norm_(r[iWajib]) : '';
    const wajib: 0 | 1 =
      wjRaw && wjRaw !== '-' && wjRaw !== '0' && wjRaw !== 'tidak' && !/bukan|tidak/.test(wjRaw) ? 1 : 0;

    const eks = iEks > -1 ? num_(r[iEks]) : 0;
    const ket = iKet > -1 ? String(r[iKet] || '').trim() : '';
    const ketN = norm_(ket);
    const isAda = eks > 0 || (/\bada\b/.test(ketN) && !/\b(tidak|belum)\s+ada\b/.test(ketN));
    const status: 'A' | 'B' | 'T' = isAda ? 'A' : wajib === 1 ? 'B' : 'T';

    rows.push([
      iNo > -1 ? String(r[iNo] || '').trim() : '',
      jen,
      fas,
      item,
      iPers > -1 ? String(r[iPers] || '').trim() : '',
      tw,
      th,
      wajib,
      eks,
      ket,
      status,
    ]);
  });

  const tahunList = Array.from(tahunSet).sort((a, b) => b - a);
  const tahun = tahunList[0] || new Date().getFullYear();
  return { tahun, tahunList, rows };
}

/* ---------------------------- Main Fetchers ---------------------------- */

export async function fetchDashboardFromSheets(
  spreadsheetId: string,
  tahunStr: '2025' | '2026' | '2027',
  token: string,
  meta: SpreadsheetMeta
): Promise<DashboardData> {
  const existingTitles = new Set(meta.sheets.map((s) => s.title));
  const errors: string[] = [];

  const desiredSheets =
    tahunStr === '2025'
      ? [
          SH25.RKAD,
          SH25.KURVA_ANG,
          SH25.PENGADAAN,
          SH25.SUKCAD_KONTRAK,
          SH25.SUKCAD_UMDS,
          SH25.PENUGASAN,
          SH25.PROGRAM_SUM,
          SH25.PROGRAM,
        ]
      : [
          SH.ANGGARAN,
          SH.ANG_DASH,
          SH.KURVA_ANG,
          SH.PENGADAAN,
          SH.PROGRAM_SUM,
          SH.PROGRAM,
          SH.NUS_SUM,
          SH.NUS,
          SH.KURVA,
          SH.SPARE,
        ];

  const toFetch = desiredSheets.filter((name) => existingTitles.has(name));
  const sheetsMap = await batchGetFormattedValues(spreadsheetId, toFetch, token);

  const safe = <T>(nama: string, fn: () => T): T | null => {
    try {
      return fn();
    } catch (e: any) {
      errors.push(`${nama}: ${e?.message || String(e)}`);
      return null;
    }
  };

  if (tahunStr === '2025') {
    const ang = safe('Anggaran', () => parseAnggaran25(sheetsMap));
    const pbj = safe('Pengadaan', () => parsePengadaan25(sheetsMap));
    return {
      tahun: 2025,
      hariIni: formatTodayId(),
      urlUtama: meta.spreadsheetUrl,
      sumber: buildSumberMap(meta, SUMBER_HALAMAN25),
      tglAnggaran: ang?.tgl || null,
      anggaran: ang,
      kurvaAnggaran: parseKurvaAnggaran(sheetsMap, SH25.KURVA_ANG),
      pengadaan: pbj,
      program: safe('Program', () => parseProgram(sheetsMap, SH25.PROGRAM_SUM, SH25.PROGRAM)),
      nusantara: null,
      sukuCadang: safe('Suku Cadang', () => parseSukuCadang25(sheetsMap, pbj)),
      penugasan: safe('Penugasan', () => parsePenugasan25(sheetsMap)),
      errors,
      loadedAt: new Date().toLocaleString('id-ID'),
    };
  }

  const yrNum = Number(tahunStr);
  return {
    tahun: yrNum,
    hariIni: formatTodayId(),
    urlUtama: meta.spreadsheetUrl,
    sumber: buildSumberMap(meta, SUMBER_HALAMAN),
    tglAnggaran: safe('Tanggal anggaran', () => parseTglAnggaran(sheetsMap)),
    anggaran: safe('Anggaran', () => parseAnggaran(sheetsMap)),
    kurvaAnggaran: parseKurvaAnggaran(sheetsMap, SH.KURVA_ANG),
    pengadaan: safe('Pengadaan', () => parsePengadaan(sheetsMap, yrNum)),
    program: safe('Program', () => parseProgram(sheetsMap, SH.PROGRAM_SUM, SH.PROGRAM)),
    nusantara: safe('Nusantara', () => parseNusantara(sheetsMap)),
    sukuCadang: safe('Suku Cadang', () => parseSukuCadang(sheetsMap)),
    errors,
    loadedAt: new Date().toLocaleString('id-ID'),
  };
}

export async function fetchAparFromSheets(
  spreadsheetId: string,
  token: string,
  meta: SpreadsheetMeta
): Promise<AparData> {
  const hasSheet = meta.sheets.find((s) => s.title === APAR_NAMA_SHEET);
  if (!hasSheet) throw new Error(`Sheet "${APAR_NAMA_SHEET}" tidak ditemukan di spreadsheet`);
  const map = await batchGetFormattedValues(spreadsheetId, [APAR_NAMA_SHEET], token);
  const data = parseApar(map[APAR_NAMA_SHEET] || []);
  data.urlSheet = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?gid=${hasSheet.sheetId}#gid=${hasSheet.sheetId}`;
  return data;
}

export async function fetchFasilitasFromSheets(
  idProlis: string,
  idBysgu: string,
  idApar: string,
  token: string,
  metas: { prolis: SpreadsheetMeta | null; bysgu: SpreadsheetMeta | null; apar: SpreadsheetMeta | null }
): Promise<FasilitasData> {
  const errors: string[] = [];
  let prolis: ProlisData | null = null;
  let bysgu: BysguData | null = null;
  let apar: AparData | null = null;
  const sumber: Record<string, SheetSourceLink[]> = {
    fas_ringkasan: [],
    fas_prolis: [],
    fas_kelayakan: [],
    apar: [],
  };

  await Promise.all([
    (async () => {
      try {
        if (!metas.prolis) throw new Error('Spreadsheet PROLIS gagal dibuka');
        const sh = metas.prolis.sheets.find((s) => s.title === FAS_SHEET_PROLIS);
        if (!sh) throw new Error(`Sheet "${FAS_SHEET_PROLIS}" tidak ditemukan`);
        const map = await batchGetFormattedValues(idProlis, [FAS_SHEET_PROLIS], token);
        prolis = parseProlis(map[FAS_SHEET_PROLIS] || []);
        const url = `https://docs.google.com/spreadsheets/d/${idProlis}/edit?gid=${sh.sheetId}#gid=${sh.sheetId}`;
        sumber.fas_prolis.push({ nama: FAS_SHEET_PROLIS, url });
        sumber.fas_ringkasan.push({ nama: FAS_SHEET_PROLIS, url });
      } catch (e: any) {
        errors.push(`PROLIS: ${e?.message || String(e)}`);
      }
    })(),
    (async () => {
      try {
        if (!metas.bysgu) throw new Error('Spreadsheet BY SGU gagal dibuka');
        const sh = metas.bysgu.sheets.find((s) => s.title === FAS_SHEET_BYSGU);
        if (!sh) throw new Error(`Sheet "${FAS_SHEET_BYSGU}" tidak ditemukan`);
        const map = await batchGetFormattedValues(idBysgu, [FAS_SHEET_BYSGU], token);
        bysgu = parseBysgu(map[FAS_SHEET_BYSGU] || []);
        const url = `https://docs.google.com/spreadsheets/d/${idBysgu}/edit?gid=${sh.sheetId}#gid=${sh.sheetId}`;
        sumber.fas_kelayakan.push({ nama: FAS_SHEET_BYSGU, url });
        sumber.fas_ringkasan.push({ nama: FAS_SHEET_BYSGU, url });
      } catch (e: any) {
        errors.push(`BY SGU: ${e?.message || String(e)}`);
      }
    })(),
    (async () => {
      try {
        if (!metas.apar) throw new Error('Spreadsheet APAR gagal dibuka');
        apar = await fetchAparFromSheets(idApar, token, metas.apar);
        if (apar.urlSheet) {
          sumber.apar.push({ nama: APAR_NAMA_SHEET, url: apar.urlSheet });
          sumber.fas_ringkasan.push({ nama: APAR_NAMA_SHEET, url: apar.urlSheet });
        }
      } catch (e: any) {
        errors.push(`APAR: ${e?.message || String(e)}`);
      }
    })(),
  ]);

  return {
    hariIni: formatTodayId(),
    prolis,
    bysgu,
    apar,
    sumber,
    errors,
    loadedAt: new Date().toLocaleString('id-ID'),
  };
}

/* ---------------------------- Input Data Schema & CRUD Helpers ---------------------------- */

export function parseInputHeader(dispRows: string[][], target: InputTargetDef) {
  if (!dispRows.length) throw new Error(`Sheet "${target.sheet}" kosong`);
  const lastCol = dispRows.reduce((m, r) => Math.max(m, r.length), 0);
  if (lastCol < 1) throw new Error(`Sheet "${target.sheet}" kosong`);
  const pad = (r: string[]) => {
    const c = r.slice();
    while (c.length < lastCol) c.push('');
    return c;
  };
  let hr = 0;
  if (target.sub) {
    hr = -1;
    for (let i = 0; i < Math.min(15, dispRows.length) && hr < 0; i++) {
      if (dispRows[i].some((c) => norm_(c) === target.kunci)) hr = i;
    }
    if (hr < 0) throw new Error(`Header "${target.kunci}" tidak ditemukan di sheet "${target.sheet}"`);
  }
  const h1 = pad(dispRows[hr] || []);
  const h2 = target.sub ? pad(dispRows[hr + 1] || []) : [];
  const sub = Boolean(target.sub && h2.some((x) => norm_(x) === 'pressure'));
  const label = h1.map((x, j) => String((sub && h2[j]) || x || '').trim());
  return {
    label,
    norm: label.map(norm_),
    mulai: hr + (sub ? 2 : 1) + 1, // 1-based row number
    lastCol,
  };
}

export async function loadInputSchemaFromSheet(
  spreadsheetId: string,
  target: InputTargetDef,
  token: string
): Promise<InputSchema> {
  const dispMap = await batchGetFormattedValues(spreadsheetId, [target.sheet], token, 'FORMATTED_VALUE');
  const dispRows = dispMap[target.sheet] || [];
  const k = parseInputHeader(dispRows, target);
  const lastRow = dispRows.length;
  const n = Math.max(0, Math.min(300, lastRow - k.mulai + 1));

  let vals: any[][] = [];
  let frm: any[][] = [];
  if (n > 0) {
    const startRow = lastRow - n + 1;
    const range = `${quoteSheetName(target.sheet)}!A${startRow}:${colToA1(k.lastCol - 1)}${lastRow}`;
    [vals, frm] = await Promise.all([
      getRawSheetRange(spreadsheetId, range, token, 'UNFORMATTED_VALUE', 'SERIAL_NUMBER'),
      getRawSheetRange(spreadsheetId, range, token, 'FORMULA', 'FORMATTED_STRING'),
    ]);
  }

  const kcol = col_(k.norm, target.kunci);
  const fields: InputFieldSchema[] = [];

  for (let j = 0; j < k.lastCol; j++) {
    if (!k.label[j]) continue;
    const kol = vals.map((r) => (r ? r[j] : undefined));
    const nb = kol.filter((v) => v !== '' && v !== null && v !== undefined);
    const strs = nb.filter((v) => typeof v === 'string') as string[];
    const nF = frm.filter((r) => r && typeof r[j] === 'string' && r[j].startsWith('=')).length;
    const formula = n > 0 && nF >= n * 0.5;
    const nums = nb.filter((v) => typeof v === 'number') as number[];
    const isDateHeader = /tgl|tanggal|kadaluarsa|pengecekan/.test(k.norm[j]);
    const serialDates = isDateHeader ? nums.filter((x) => x > 30000 && x < 80000).length : 0;

    let tipe: InputFieldSchema['tipe'] = 'teks';
    let fmt: InputFieldSchema['fmt'] = '';
    let opsi: string[] = [];

    if (nb.length && serialDates >= nb.length * 0.5) {
      tipe = 'tgl';
      fmt = 'date';
    } else if (nb.length && nums.length >= nb.length * 0.6 && !isDateHeader) {
      tipe = 'angka';
    } else if (strs.length && isDateHeader) {
      const full = strs.filter((s) => parseTgl_(s)).length;
      const bln = strs.filter((s) => /^[A-Za-z]+[-\s/.]\d{2,4}$/.test(s.trim())).length;
      if (full >= strs.length * 0.5) {
        tipe = 'tgl';
        fmt = 'text';
      } else if (bln >= strs.length * 0.5) {
        tipe = 'bulan';
        fmt = 'text';
      }
    }

    if (tipe === 'teks' && !formula) {
      const seen: Record<string, number> = {};
      strs.forEach((s) => {
        if (s.trim()) seen[s.trim()] = 1;
      });
      const d = Object.keys(seen);
      if (d.length && d.length <= 40 && strs.length >= d.length * 1.5) {
        opsi = d.sort((a, b) => a.localeCompare(b, 'id'));
      }
    }

    fields.push({
      i: j,
      label: k.label[j],
      tipe,
      fmt,
      opsi,
      formula,
      wajib: j === kcol,
    });
  }

  const vis = fields.filter((f) => !f.formula).slice(0, 7);
  let terakhir: string[][] = [];
  if (lastRow >= k.mulai) {
    const r0 = Math.max(k.mulai, lastRow - 7);
    terakhir = dispRows.slice(r0 - 1, lastRow).map((r) => vis.map((f) => String(r[f.i] || '')));
  }

  return {
    fields,
    pratinjauKepala: vis.map((f) => f.label),
    terakhir,
    mulai: k.mulai,
    lastCol: k.lastCol,
    lastRow,
    kcol,
  };
}

export async function loadInputBarisFromSheet(
  spreadsheetId: string,
  target: InputTargetDef,
  idx: number,
  targets: Array<{ idx: number; nama: string }>,
  cari: string,
  hal: number,
  token: string
): Promise<InputBarisResult> {
  const dispMap = await batchGetFormattedValues(spreadsheetId, [target.sheet], token, 'FORMATTED_VALUE');
  const dispRows = dispMap[target.sheet] || [];
  const skema = await loadInputSchemaFromSheet(spreadsheetId, target, token);
  if (skema.kcol < 0) throw new Error(`Kolom kunci sheet "${target.sheet}" tidak ditemukan.`);

  const vis = skema.fields.filter((f) => !f.formula).slice(0, 7);
  const qs = norm_(cari || '');
  const rows: Array<{ r: number; k: string; c: string[] }> = [];

  for (let rIdx = dispRows.length - 1; rIdx >= skema.mulai - 1; rIdx--) {
    const row = dispRows[rIdx] || [];
    const kv = String(row[skema.kcol] || '').trim();
    if (!kv) continue;
    if (qs && !row.some((c) => norm_(c).indexOf(qs) > -1)) continue;
    rows.push({
      r: rIdx + 1, // 1-based sheet row
      k: kv,
      c: vis.map((f) => String(row[f.i] || '')),
    });
  }

  const PS = 20;
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / PS));
  const h = Math.min(Math.max(hal || 0, 0), pages - 1);

  return {
    targets,
    idx,
    sheet: target.sheet,
    targetDef: target,
    skema,
    fields: skema.fields,
    kepala: vis.map((f) => f.label),
    total,
    hal: h,
    pages,
    rows: rows.slice(h * PS, h * PS + PS),
  };
}

export function formatInputWriteValue(f: InputFieldSchema, v: unknown): string | number {
  if (v === '' || v === null || v === undefined) return '';
  const s = String(v).trim();
  if (f.tipe === 'angka') {
    const p = parseFloat(s.replace(',', '.'));
    return Number.isNaN(p) ? num_(s) : p;
  }
  if (f.tipe === 'tgl') {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return s;
    if (f.fmt === 'date') {
      // USER_ENTERED accepts yyyy-MM-dd cleanly as a real Sheets Date
      return `${m[1]}-${m[2]}-${m[3]}`;
    }
    return `${Number(m[3])}-${BLN_PENDEK[Number(m[2]) - 1]}-${m[1].slice(-2)}`;
  }
  if (f.tipe === 'bulan') {
    const m = s.match(/^(\d{4})-(\d{2})$/);
    if (!m) return s;
    return `${BLN_PENDEK[Number(m[2]) - 1]}-${m[1].slice(-2)}`;
  }
  return s;
}

export function formatSheetValueForForm(f: InputFieldSchema, rawVal: unknown, dispVal: string): string {
  if ((rawVal === '' || rawVal === null || rawVal === undefined) && !dispVal) return '';
  if (f.tipe === 'tgl') {
    if (typeof rawVal === 'number') {
      const d = serialToDate(rawVal);
      if (d) {
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${mm}-${dd}`;
      }
    }
    const p = parseTgl_(dispVal || rawVal);
    if (p) {
      return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
    }
    return '';
  }
  if (f.tipe === 'bulan') {
    if (typeof rawVal === 'number') {
      const d = serialToDate(rawVal);
      if (d) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    const m = String(dispVal || rawVal).match(/^([A-Za-z]+)[-\s/.](\d{2,4})$/);
    const b = m && BLN_MAP_[m[1].toLowerCase()];
    if (!b) return '';
    let y = Number(m[2]);
    if (y < 100) y += 2000;
    return `${y}-${String(b).padStart(2, '0')}`;
  }
  if (f.tipe === 'angka') {
    if (typeof rawVal === 'number') return String(rawVal);
    return String(num_(dispVal || rawVal));
  }
  return String(dispVal !== undefined && dispVal !== '' ? dispVal : rawVal ?? '');
}
