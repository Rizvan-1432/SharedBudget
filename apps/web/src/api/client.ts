import type { AuthResponse, User } from './types';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '../auth/token-storage';

const base = () => import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const rt = getRefreshToken();
  if (!rt) return false;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${base()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as AuthResponse;
      setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function parseError(res: Response): Promise<never> {
  try {
    const body = (await res.json()) as { code?: string; message?: string };
    throw new ApiError(
      body.code ?? 'HTTP_ERROR',
      body.message ?? res.statusText,
      res.status,
    );
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError('HTTP_ERROR', res.statusText, res.status);
  }
}

async function publicFetch<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string>),
    },
  });
  if (!res.ok) await parseError(res);
  return (await res.json()) as T;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  retried = false,
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };
  if (!headers['Content-Type'] && init.body) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${base()}${path}`, { ...init, headers });

  if (res.status === 401 && !retried && path !== '/auth/refresh') {
    const ok = await tryRefresh();
    if (ok) return apiFetch<T>(path, init, true);
    clearTokens();
  }

  if (!res.ok) {
    await parseError(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return publicFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registerRequest(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return publicFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function meRequest(): Promise<User> {
  return apiFetch<User>('/auth/me');
}

export async function logoutRequest(): Promise<void> {
  const rt = getRefreshToken();
  if (rt) {
    try {
      await apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: rt }),
      });
    } catch {
      /* ignore */
    }
  }
  clearTokens();
}
