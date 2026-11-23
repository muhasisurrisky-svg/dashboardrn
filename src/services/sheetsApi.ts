export interface SheetTabMeta {
  sheetId: number;
  title: string;
  rowCount: number;
  columnCount: number;
}

export interface SpreadsheetMeta {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheets: SheetTabMeta[];
}

export class SheetsAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SheetsAuthError';
  }
}

export class SheetsWriteNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SheetsWriteNotConfiguredError';
  }
}

export class SheetsApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'SheetsApiError';
    this.status = status;
  }
}

export function colToA1(colIndex0: number): string {
  let n = colIndex0 + 1;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function quoteSheetName(name: string): string {
  return `'${name.replace(/'/g, "''")}'`;
}

async function apiPost<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    throw new SheetsAuthError('Sesi berakhir. Silakan masuk kembali dengan kata sandi.');
  }

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    if (res.status === 501 && json?.code === 'WRITE_NOT_CONFIGURED') {
      throw new SheetsWriteNotConfiguredError(json.error || 'Penulisan Google Sheet belum dikonfigurasi.');
    }
    throw new SheetsApiError(res.status, json?.error || `Server error (${res.status})`);
  }

  return json as T;
}

const metaCache = new Map<string, SpreadsheetMeta>();

export async function getSpreadsheetMeta(spreadsheetId: string, token: string): Promise<SpreadsheetMeta> {
  const meta = await apiPost<SpreadsheetMeta>('/api/sheets/meta', token, { spreadsheetId });
  metaCache.set(spreadsheetId, meta);
  return meta;
}

export async function batchGetFormattedValues(
  spreadsheetId: string,
  sheetNames: string[],
  token: string,
  _valueRenderOption: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA' = 'FORMATTED_VALUE',
  _dateTimeRenderOption: 'FORMATTED_STRING' | 'SERIAL_NUMBER' = 'FORMATTED_STRING'
): Promise<Record<string, string[][]>> {
  if (!sheetNames.length) return {};
  const knownSheets = metaCache.get(spreadsheetId)?.sheets;
  const res = await apiPost<{ valuesMap: Record<string, string[][]> }>('/api/sheets/batch-get', token, {
    spreadsheetId,
    sheetNames,
    knownSheets,
  });
  return res.valuesMap || {};
}

export async function getRawSheetRange(
  spreadsheetId: string,
  range: string,
  token: string,
  valueRenderOption: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA' = 'UNFORMATTED_VALUE',
  dateTimeRenderOption: 'FORMATTED_STRING' | 'SERIAL_NUMBER' = 'SERIAL_NUMBER'
): Promise<any[][]> {
  const res = await apiPost<{ values: any[][] }>('/api/sheets/raw-range', token, {
    spreadsheetId,
    range,
    valueRenderOption,
    dateTimeRenderOption,
  });
  return res.values || [];
}

export async function updateSheetValuesBatch(
  spreadsheetId: string,
  updates: Array<{ range: string; values: any[][] }>,
  token: string
): Promise<void> {
  if (!updates.length) return;
  await apiPost('/api/sheets/update-batch', token, { spreadsheetId, updates });
}

export async function appendSheetRow(
  spreadsheetId: string,
  sheetName: string,
  rowValues: any[],
  token: string
): Promise<void> {
  await apiPost('/api/sheets/append-row', token, { spreadsheetId, sheetName, rowValues });
}

export async function copyRowFormatAndFormulas(
  spreadsheetId: string,
  sheetId: number,
  sourceRow1Based: number,
  targetRow1Based: number,
  lastCol: number,
  formulaColIndices0: number[],
  token: string
): Promise<void> {
  const requests: any[] = [];
  if (sourceRow1Based >= 1 && targetRow1Based > sourceRow1Based) {
    requests.push({
      copyPaste: {
        source: {
          sheetId,
          startRowIndex: sourceRow1Based - 1,
          endRowIndex: sourceRow1Based,
          startColumnIndex: 0,
          endColumnIndex: lastCol,
        },
        destination: {
          sheetId,
          startRowIndex: targetRow1Based - 1,
          endRowIndex: targetRow1Based,
          startColumnIndex: 0,
          endColumnIndex: lastCol,
        },
        pasteType: 'PASTE_FORMAT',
        pasteOrientation: 'NORMAL',
      },
    });
    formulaColIndices0.forEach((colIdx) => {
      requests.push({
        copyPaste: {
          source: {
            sheetId,
            startRowIndex: sourceRow1Based - 1,
            endRowIndex: sourceRow1Based,
            startColumnIndex: colIdx,
            endColumnIndex: colIdx + 1,
          },
          destination: {
            sheetId,
            startRowIndex: targetRow1Based - 1,
            endRowIndex: targetRow1Based,
            startColumnIndex: colIdx,
            endColumnIndex: colIdx + 1,
          },
          pasteType: 'PASTE_FORMULA',
          pasteOrientation: 'NORMAL',
        },
      });
    });
  }

  if (!requests.length) return;
  await apiPost('/api/sheets/batch-update', token, { spreadsheetId, requests });
}

export async function deleteSheetRow(
  spreadsheetId: string,
  sheetId: number,
  row1Based: number,
  token: string
): Promise<void> {
  await apiPost('/api/sheets/batch-update', token, {
    spreadsheetId,
    requests: [
      {
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: row1Based - 1,
            endIndex: row1Based,
          },
        },
      },
    ],
  });
}

export async function ensureLogSheetAndAppend(
  spreadsheetId: string,
  meta: SpreadsheetMeta,
  logSheetName: string,
  entry: [string, string, string, string, string, number, string],
  token: string
): Promise<void> {
  const exists = meta.sheets.find((s) => s.title === logSheetName);
  if (!exists) {
    await apiPost('/api/sheets/batch-update', token, {
      spreadsheetId,
      requests: [
        {
          addSheet: {
            properties: {
              title: logSheetName,
              gridProperties: { frozenRowCount: 1 },
            },
          },
        },
      ],
    });
    await appendSheetRow(
      spreadsheetId,
      logSheetName,
      ['Waktu', 'Peran', 'Tahun', 'Modul', 'Sheet', 'Baris', 'Data'],
      token
    );
  }
  await appendSheetRow(spreadsheetId, logSheetName, entry, token);
}
