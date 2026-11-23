import type { UserRole } from '../types/dashboard';

export interface AuthStatus {
  initialized: boolean;
  envAdminConfigured: boolean;
  envUserConfigured: boolean;
  userPasswordConfigured: boolean;
  writeCapable: boolean;
}

export interface AuthSession {
  token: string;
  role: UserRole;
  exp: number;
}

// Keep session token strictly in memory (never in localStorage or sessionStorage).
let memorySession: AuthSession | null = null;

export function getMemorySession(): AuthSession | null {
  if (!memorySession) return null;
  if (Date.now() > memorySession.exp) {
    memorySession = null;
    return null;
  }
  return memorySession;
}

export function clearMemorySession(): void {
  memorySession = null;
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await fetch('/api/auth/status');
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || 'Gagal memeriksa status autentikasi server.');
  }
  return json as AuthStatus;
}

export async function setupInitialPasswords(
  adminPassword: string,
  userPassword?: string
): Promise<AuthSession> {
  const res = await fetch('/api/auth/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminPassword, userPassword: userPassword || '' }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || 'Gagal menyimpan pengaturan sandi awal.');
  }
  const session: AuthSession = {
    token: String(json.token),
    role: json.role === 'admin' ? 'admin' : 'user',
    exp: Number(json.exp),
  };
  memorySession = session;
  return session;
}

export async function loginWithPassword(role: UserRole, password: string): Promise<AuthSession> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, password }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || 'Gagal masuk.');
  }
  const session: AuthSession = {
    token: String(json.token),
    role: json.role === 'admin' ? 'admin' : 'user',
    exp: Number(json.exp),
  };
  memorySession = session;
  return session;
}

export async function updateServerPasswords(
  token: string,
  payload: { newAdminPassword?: string; newUserPassword?: string }
): Promise<void> {
  const res = await fetch('/api/auth/passwords', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || 'Gagal memperbarui sandi.');
  }
}
