import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';

/* ------------------------------------------------------------------
   Constants & Security Boundaries
------------------------------------------------------------------ */
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.cwd(), '.data');
const AUTH_STORE_PATH = path.join(DATA_DIR, 'auth.json');

const SESSION_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAKS_GAGAL = 5;
const MAKS_GAGAL_GLOBAL = 40;
const KUNCI_MS = 10 * 60 * 1000; // 10 minutes
const SPREADSHEET_ID_RE = /^[a-zA-Z0-9_-]{10,120}$/;

// Ephemeral session signing fallback if SESSION_SECRET env is absent
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

type Role = 'admin' | 'user';

interface AuthStore {
  adminHash?: string;
  userHash?: string;
  updatedAt?: string;
}

interface SessionPayload {
  role: Role;
  iat: number;
  exp: number;
}

interface AuthedRequest extends Request {
  auth?: SessionPayload;
}

/* ------------------------------------------------------------------
   Credential Store & Password Hashing (scrypt + timingSafeEqual)
------------------------------------------------------------------ */
function readAuthStore(): AuthStore {
  try {
    if (!fs.existsSync(AUTH_STORE_PATH)) return {};
    const raw = fs.readFileSync(AUTH_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as AuthStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAuthStore(next: AuthStore): void {
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  const tmpPath = `${AUTH_STORE_PATH}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(next, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmpPath, AUTH_STORE_PATH);
}

function hashPasswordScrypt(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyScrypt(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, hex] = parts;
  if (!salt || !hex) return false;
  try {
    const expected = Buffer.from(hex, 'hex');
    const actual = crypto.scryptSync(password, salt, 64);
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function verifyEnvSecret(input: string, envSecret: string): boolean {
  const a = crypto.createHash('sha256').update(String(input)).digest();
  const b = crypto.createHash('sha256').update(String(envSecret)).digest();
  return crypto.timingSafeEqual(a, b);
}

/* ------------------------------------------------------------------
   Session Tokens (HMAC-SHA256 Bearer)
------------------------------------------------------------------ */
function signSessionToken(role: Role): { token: string; exp: number } {
  const now = Date.now();
  const payload: SessionPayload = { role, iat: now, exp: now + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return { token: `${body}.${sig}`, exp: payload.exp };
}

function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;
  try {
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expectedSig, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload || (payload.role !== 'admin' && payload.role !== 'user')) return null;
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk kembali.' });
    return;
  }
  const payload = verifySessionToken(match[1].trim());
  if (!payload) {
    res.status(401).json({ error: 'Sesi telah berakhir. Silakan masuk kembali.' });
    return;
  }
  req.auth = payload;
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.auth || req.auth.role !== 'admin') {
    res.status(403).json({ error: 'Akses ditolak. Fitur ini khusus Admin.' });
    return;
  }
  next();
}

/* ------------------------------------------------------------------
   Login Rate Limiting
------------------------------------------------------------------ */
const failByIp = new Map<string, { count: number; resetAt: number }>();
let globalFail = { count: 0, resetAt: 0 };

function clientKey(req: Request): string {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || req.ip || 'unknown';
}

function checkRateLimit(ip: string): string | null {
  const now = Date.now();
  if (globalFail.resetAt > now && globalFail.count >= MAKS_GAGAL_GLOBAL) {
    return 'Terlalu banyak percobaan masuk. Coba lagi dalam 10 menit.';
  }
  const rec = failByIp.get(ip);
  if (rec && rec.resetAt > now && rec.count >= MAKS_GAGAL) {
    return 'Terlalu banyak percobaan sandi salah. Coba lagi dalam 10 menit.';
  }
  return null;
}

function recordFailure(ip: string): number {
  const now = Date.now();
  if (globalFail.resetAt <= now) {
    globalFail = { count: 1, resetAt: now + KUNCI_MS };
  } else {
    globalFail.count++;
  }
  const rec = failByIp.get(ip);
  if (!rec || rec.resetAt <= now) {
    failByIp.set(ip, { count: 1, resetAt: now + KUNCI_MS });
    return MAKS_GAGAL - 1;
  }
  rec.count++;
  return Math.max(0, MAKS_GAGAL - rec.count);
}

function clearFailure(ip: string): void {
  failByIp.delete(ip);
}

/* ------------------------------------------------------------------
   Optional Google Service Account Token (for Admin Writes & API v4)
------------------------------------------------------------------ */
interface ServiceAccountCreds {
  client_email: string;
  private_key: string;
}

let cachedSaToken: { token: string; expMs: number } | null = null;

function getServiceAccountCreds(): ServiceAccountCreds | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccountCreds>;
    if (parsed.client_email && parsed.private_key) {
      return {
        client_email: String(parsed.client_email),
        private_key: String(parsed.private_key).replace(/\\n/g, '\n'),
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function getServiceAccountToken(): Promise<string | null> {
  const creds = getServiceAccountCreds();
  if (!creds) return null;
  const now = Date.now();
  if (cachedSaToken && cachedSaToken.expMs - 60_000 > now) {
    return cachedSaToken.token;
  }

  const iat = Math.floor(now / 1000);
  const exp = iat + 3600;
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim = Buffer.from(
    JSON.stringify({
      iss: creds.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp,
      iat,
    })
  ).toString('base64url');

  const signInput = `${header}.${claim}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signInput);
  const signature = signer.sign(creds.private_key, 'base64url');
  const assertion = `${signInput}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || 'Gagal memperoleh token Service Account Google.');
  }
  cachedSaToken = {
    token: json.access_token,
    expMs: now + (json.expires_in || 3600) * 1000,
  };
  return cachedSaToken.token;
}

/* ------------------------------------------------------------------
   Google Sheets Public CSV Reader + RFC-4180 Parser
------------------------------------------------------------------ */
function assertValidSpreadsheetId(id: unknown): string {
  const s = String(id || '').trim();
  if (!SPREADSHEET_ID_RE.test(s)) {
    throw new Error('ID Spreadsheet tidak valid.');
  }
  return s;
}

function parseCsvMatrix(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\r') {
      if (csv[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

interface PublicSheetTab {
  sheetId: number;
  title: string;
  rowCount: number;
  columnCount: number;
}

interface PublicSpreadsheetMeta {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheets: PublicSheetTab[];
}

async function fetchPublicMeta(spreadsheetId: string): Promise<PublicSpreadsheetMeta> {
  const saToken = await getServiceAccountToken().catch(() => null);
  if (saToken) {
    const fields = 'spreadsheetId,properties.title,spreadsheetUrl,sheets.properties(sheetId,title,gridProperties)';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=${encodeURIComponent(fields)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${saToken}` } });
    if (res.ok) {
      const raw = (await res.json()) as any;
      return {
        spreadsheetId: String(raw.spreadsheetId || spreadsheetId),
        title: String(raw.properties?.title || spreadsheetId),
        spreadsheetUrl: String(raw.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`),
        sheets: (raw.sheets || []).map((s: any) => ({
          sheetId: Number(s.properties?.sheetId ?? 0),
          title: String(s.properties?.title ?? ''),
          rowCount: Number(s.properties?.gridProperties?.rowCount ?? 1000),
          columnCount: Number(s.properties?.gridProperties?.columnCount ?? 26),
        })),
      };
    }
  }

  const htmlRes = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlview`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!htmlRes.ok) {
    throw new Error(
      htmlRes.status === 401 || htmlRes.status === 403
        ? 'Spreadsheet ini bersifat privat. Pastikan setelan berbagi Google Sheet diatur ke "Siapa saja yang memiliki link dapat melihat", atau tambahkan GOOGLE_SERVICE_ACCOUNT_JSON.'
        : `Gagal membuka spreadsheet (${htmlRes.status}).`
    );
  }
  const html = await htmlRes.text();
  if (/accounts\.google\.com\/ServiceLogin/i.test(html)) {
    throw new Error(
      'Spreadsheet ini memerlukan izin akses. Atur Google Sheet ke "Siapa saja yang memiliki link dapat melihat" atau konfigurasikan GOOGLE_SERVICE_ACCOUNT_JSON.'
    );
  }

  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/\s*-\s*Google\s+Sheets\s*$/i, '').trim()) : spreadsheetId;

  const sheets: PublicSheetTab[] = [];
  const re = /items\.push\(\{name:\s*"((?:[^"\\]|\\.)*)",\s*pageUrl:\s*"[^"]*",\s*gid:\s*"(\d+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const name = JSON.parse(`"${m[1]}"`) as string;
      sheets.push({
        sheetId: Number(m[2]),
        title: name,
        rowCount: 1000,
        columnCount: 26,
      });
    } catch {
      // skip malformed entry
    }
  }

  if (!sheets.length) {
    throw new Error('Daftar tab sheet tidak terbaca. Pastikan link Google Sheet valid dan dapat diakses.');
  }

  return {
    spreadsheetId,
    title,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheets,
  };
}

async function fetchPublicBatchValues(
  spreadsheetId: string,
  sheetNames: string[],
  knownSheets?: PublicSheetTab[]
): Promise<Record<string, string[][]>> {
  if (!sheetNames.length) return {};

  const saToken = await getServiceAccountToken().catch(() => null);
  if (saToken) {
    const params = new URLSearchParams();
    sheetNames.forEach((n) => params.append('ranges', `'${n.replace(/'/g, "''")}'`));
    params.set('valueRenderOption', 'FORMATTED_VALUE');
    params.set('dateTimeRenderOption', 'FORMATTED_STRING');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchGet?${params.toString()}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${saToken}` } });
    if (res.ok) {
      const raw = (await res.json()) as { valueRanges?: Array<{ values?: any[][] }> };
      const out: Record<string, string[][]> = {};
      (raw.valueRanges || []).forEach((vr, idx) => {
        out[sheetNames[idx]] = (vr.values || []).map((row) =>
          row.map((c) => (c === null || c === undefined ? '' : String(c)))
        );
      });
      return out;
    }
  }

  const tabs = knownSheets && knownSheets.length ? knownSheets : (await fetchPublicMeta(spreadsheetId)).sheets;
  const gidByTitle = new Map<string, number>();
  tabs.forEach((t) => gidByTitle.set(t.title, t.sheetId));

  const out: Record<string, string[][]> = {};
  await Promise.all(
    sheetNames.map(async (name) => {
      const gid = gidByTitle.get(name);
      if (gid === undefined) return;
      const csvRes = await fetch(
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      if (!csvRes.ok) {
        throw new Error(`Gagal mengunduh sheet "${name}" (${csvRes.status}).`);
      }
      const csvText = await csvRes.text();
      out[name] = parseCsvMatrix(csvText);
    })
  );
  return out;
}

/* ------------------------------------------------------------------
   Express Server Setup
------------------------------------------------------------------ */
export function createApp() { {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '2mb' }));

  /* --- Auth Routes --- */
  app.get('/api/auth/status', (_req, res) => {
    const store = readAuthStore();
    const envAdminConfigured = Boolean(process.env.ADMIN_PASSWORD);
    const envUserConfigured = Boolean(process.env.USER_PASSWORD);
    const initialized = envAdminConfigured || Boolean(store.adminHash);
    const userPasswordConfigured = envUserConfigured || Boolean(store.userHash);
    const writeCapable = Boolean(getServiceAccountCreds());
    res.json({
      initialized,
      envAdminConfigured,
      envUserConfigured,
      userPasswordConfigured,
      writeCapable,
    });
  });

  app.post('/api/auth/setup', (req, res) => {
    const store = readAuthStore();
    if (process.env.ADMIN_PASSWORD || store.adminHash) {
      res.status(409).json({ error: 'Sandi Admin sudah diatur. Silakan masuk dengan sandi Anda.' });
      return;
    }

    const adminPassword = typeof req.body?.adminPassword === 'string' ? req.body.adminPassword : '';
    const userPassword = typeof req.body?.userPassword === 'string' ? req.body.userPassword : '';

    if (adminPassword.length < 4 || adminPassword.length > 128) {
      res.status(400).json({ error: 'Sandi Admin minimal 4 karakter.' });
      return;
    }
    if (userPassword && (userPassword.length < 4 || userPassword.length > 128)) {
      res.status(400).json({ error: 'Sandi User minimal 4 karakter.' });
      return;
    }

    const next: AuthStore = {
      adminHash: hashPasswordScrypt(adminPassword),
      userHash: userPassword ? hashPasswordScrypt(userPassword) : undefined,
      updatedAt: new Date().toISOString(),
    };
    writeAuthStore(next);

    const session = signSessionToken('admin');
    res.json({ token: session.token, role: 'admin', exp: session.exp });
  });

  app.post('/api/auth/login', (req, res) => {
    const ip = clientKey(req);
    const limited = checkRateLimit(ip);
    if (limited) {
      res.status(429).json({ error: limited });
      return;
    }

    const role: Role = req.body?.role === 'user' ? 'user' : 'admin';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!password) {
      res.status(400).json({ error: 'Masukkan kata sandi terlebih dahulu.' });
      return;
    }

    const store = readAuthStore();
    let matched = false;

    if (role === 'admin') {
      if (process.env.ADMIN_PASSWORD) {
        matched = verifyEnvSecret(password, process.env.ADMIN_PASSWORD);
      } else if (store.adminHash) {
        matched = verifyScrypt(password, store.adminHash);
      } else {
        res.status(400).json({ error: 'Sandi Admin belum diatur.' });
        return;
      }
    } else {
      if (process.env.USER_PASSWORD) {
        matched = verifyEnvSecret(password, process.env.USER_PASSWORD);
      } else if (store.userHash) {
        matched = verifyScrypt(password, store.userHash);
      } else {
        res.status(400).json({ error: 'Sandi User belum diatur oleh Admin.' });
        return;
      }
    }

    if (!matched) {
      const sisa = recordFailure(ip);
      res.status(401).json({
        error:
          sisa > 0
            ? `Kata sandi salah. Sisa percobaan: ${sisa}.`
            : 'Terlalu banyak percobaan salah. Coba lagi dalam 10 menit.',
      });
      return;
    }

    clearFailure(ip);
    const session = signSessionToken(role);
    res.json({ token: session.token, role, exp: session.exp });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    res.json({ role: req.auth!.role, exp: req.auth!.exp });
  });

  app.post('/api/auth/passwords', requireAuth, requireAdmin, (req: AuthedRequest, res) => {
    const store = readAuthStore();
    const newAdminPassword =
      typeof req.body?.newAdminPassword === 'string' ? req.body.newAdminPassword : '';
    const newUserPassword =
      typeof req.body?.newUserPassword === 'string' ? req.body.newUserPassword : '';

    if (!newAdminPassword && !newUserPassword) {
      res.status(400).json({ error: 'Isi minimal salah satu sandi baru yang ingin diperbarui.' });
      return;
    }

    const next: AuthStore = { ...store, updatedAt: new Date().toISOString() };

    if (newAdminPassword) {
      if (process.env.ADMIN_PASSWORD) {
        res.status(400).json({
          error: 'ADMIN_PASSWORD dikelola melalui environment Secrets dan tidak dapat ditimpa dari aplikasi.',
        });
        return;
      }
      if (newAdminPassword.length < 4 || newAdminPassword.length > 128) {
        res.status(400).json({ error: 'Sandi Admin baru minimal 4 karakter.' });
        return;
      }
      next.adminHash = hashPasswordScrypt(newAdminPassword);
    }

    if (newUserPassword) {
      if (process.env.USER_PASSWORD) {
        res.status(400).json({
          error: 'USER_PASSWORD dikelola melalui environment Secrets dan tidak dapat ditimpa dari aplikasi.',
        });
        return;
      }
      if (newUserPassword.length < 4 || newUserPassword.length > 128) {
        res.status(400).json({ error: 'Sandi User baru minimal 4 karakter.' });
        return;
      }
      next.userHash = hashPasswordScrypt(newUserPassword);
    }

    writeAuthStore(next);
    res.json({ ok: true });
  });

  /* --- Protected Google Sheets Read Routes --- */
  app.post('/api/sheets/meta', requireAuth, async (req, res) => {
    try {
      const spreadsheetId = assertValidSpreadsheetId(req.body?.spreadsheetId);
      const meta = await fetchPublicMeta(spreadsheetId);
      res.json(meta);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Gagal membaca metadata spreadsheet.' });
    }
  });

  app.post('/api/sheets/batch-get', requireAuth, async (req, res) => {
    try {
      const spreadsheetId = assertValidSpreadsheetId(req.body?.spreadsheetId);
      const sheetNames: string[] = Array.isArray(req.body?.sheetNames)
        ? req.body.sheetNames.map((s: unknown) => String(s || '')).filter(Boolean)
        : [];
      const knownSheets: PublicSheetTab[] | undefined = Array.isArray(req.body?.knownSheets)
        ? req.body.knownSheets
        : undefined;
      const valuesMap = await fetchPublicBatchValues(spreadsheetId, sheetNames, knownSheets);
      res.json({ valuesMap });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Gagal membaca data Google Sheet.' });
    }
  });

  /* --- Protected Admin Sheets Write / Raw Inspection Routes (Requires Service Account) --- */
  async function requireServiceAccount(res: Response): Promise<string | null> {
    const token = await getServiceAccountToken().catch((err: any) => {
      res.status(500).json({ error: err?.message || 'Gagal autentikasi Service Account Google.' });
      return null;
    });
    if (!token && !res.headersSent) {
      res.status(501).json({
        code: 'WRITE_NOT_CONFIGURED',
        error:
          'Mode baca aktif tanpa login Google. Untuk menulis/mengubah data langsung ke Google Sheet dari menu Input Data, tambahkan GOOGLE_SERVICE_ACCOUNT_JSON pada Secrets server.',
      });
    }
    return token;
  }

  app.post('/api/sheets/raw-range', requireAuth, requireAdmin, async (req, res) => {
    try {
      const spreadsheetId = assertValidSpreadsheetId(req.body?.spreadsheetId);
      const range = String(req.body?.range || '');
      const valueRenderOption = String(req.body?.valueRenderOption || 'UNFORMATTED_VALUE');
      const dateTimeRenderOption = String(req.body?.dateTimeRenderOption || 'SERIAL_NUMBER');
      if (!range) {
        res.status(400).json({ error: 'Range wajib diisi.' });
        return;
      }

      const saToken = await getServiceAccountToken().catch(() => null);
      if (saToken) {
        const params = new URLSearchParams({ valueRenderOption, dateTimeRenderOption });
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?${params.toString()}`;
        const apiRes = await fetch(url, { headers: { Authorization: `Bearer ${saToken}` } });
        const json = (await apiRes.json()) as { values?: any[][]; error?: { message?: string } };
        if (!apiRes.ok) {
          res.status(apiRes.status).json({ error: json?.error?.message || 'Gagal membaca range.' });
          return;
        }
        res.json({ values: json.values || [] });
        return;
      }

      res.status(501).json({
        code: 'WRITE_NOT_CONFIGURED',
        error: 'Penulisan & pemeriksaan rumus Google Sheet membutuhkan GOOGLE_SERVICE_ACCOUNT_JSON pada Secrets server.',
      });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Gagal membaca range.' });
    }
  });

  app.post('/api/sheets/update-batch', requireAuth, requireAdmin, async (req, res) => {
    try {
      const spreadsheetId = assertValidSpreadsheetId(req.body?.spreadsheetId);
      const updates = Array.isArray(req.body?.updates) ? req.body.updates : [];
      const token = await requireServiceAccount(res);
      if (!token) return;

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`;
      const apiRes = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: updates }),
      });
      const json = (await apiRes.json()) as { error?: { message?: string } };
      if (!apiRes.ok) {
        res.status(apiRes.status).json({ error: json?.error?.message || 'Gagal memperbarui Google Sheet.' });
        return;
      }
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Gagal memperbarui Google Sheet.' });
    }
  });

  app.post('/api/sheets/batch-update', requireAuth, requireAdmin, async (req, res) => {
    try {
      const spreadsheetId = assertValidSpreadsheetId(req.body?.spreadsheetId);
      const requests = Array.isArray(req.body?.requests) ? req.body.requests : [];
      const token = await requireServiceAccount(res);
      if (!token) return;

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`;
      const apiRes = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });
      const json = (await apiRes.json()) as { error?: { message?: string } };
      if (!apiRes.ok) {
        res.status(apiRes.status).json({ error: json?.error?.message || 'Gagal menjalankan batchUpdate.' });
        return;
      }
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Gagal menjalankan batchUpdate.' });
    }
  });

  app.post('/api/sheets/append-row', requireAuth, requireAdmin, async (req, res) => {
    try {
      const spreadsheetId = assertValidSpreadsheetId(req.body?.spreadsheetId);
      const sheetName = String(req.body?.sheetName || '');
      const rowValues = Array.isArray(req.body?.rowValues) ? req.body.rowValues : [];
      if (!sheetName) {
        res.status(400).json({ error: 'Nama sheet wajib diisi.' });
        return;
      }
      const token = await requireServiceAccount(res);
      if (!token) return;

      const range = `'${sheetName.replace(/'/g, "''")}'!A1`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
      const apiRes = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [rowValues] }),
      });
      const json = (await apiRes.json()) as { error?: { message?: string } };
      if (!apiRes.ok) {
        res.status(apiRes.status).json({ error: json?.error?.message || 'Gagal menambah baris log.' });
        return;
      }
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Gagal menambah baris log.' });
    }
  });

    return app;
}

async function start() {
  const app = createApp();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server dashboard berjalan di http://0.0.0.0:${PORT}`);
  });
}

// Di Vercel server tidak di-listen; yang dipakai function di api/index.ts
if (!process.env.VERCEL) start();
