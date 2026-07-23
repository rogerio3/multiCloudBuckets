import type { CreateUserRequest, CreateUserResponse, ListLogsResponse, ListUsersResponse, LoginResponse, PresignResponse, User } from './types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const TOKEN_KEY = 'cla_token';
const USER_KEY = 'cla_user';

/** Typed API error carrying the HTTP status and optional machine-readable code. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** localStorage-backed session persistence (SSR-safe). */
export const session = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  getUser(): User | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },
  save(token: string, user: User): void {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear(): void {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  },
};

function clearSessionAndRedirect(): void {
  session.clear();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

/** Typed fetch wrapper with JWT injection and uniform error handling. */
async function request<T>(
  path: string,
  { method = 'GET', body, auth = true }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = session.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Network error — is the backend running?', 0, 'NetworkError');
  }

  if (res.status === 401 && auth) {
    clearSessionAndRedirect();
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    let code: string | undefined;
    try {
      const data = (await res.json()) as { error?: string; code?: string };
      if (data.error) message = data.error;
      code = data.code;
    } catch {
      // non-JSON error body — keep the generic message
    }
    throw new ApiError(message, res.status, code);
  }

  return (await res.json()) as T;
}

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: { username, password },
      auth: false,
    }),

  me: () => request<{ user: User }>('/api/auth/me'),

  listLogs: (prefix?: string, maxKeys = 100) => {
    const params = new URLSearchParams();
    if (prefix) params.set('prefix', prefix);
    params.set('maxKeys', String(maxKeys));
    return request<ListLogsResponse>(`/api/logs?${params.toString()}`);
  },

  presign: (key: string, expiresIn = 3600) =>
    request<PresignResponse>(`/api/logs/${encodeURIComponent(key)}/presign`, {
      method: 'POST',
      body: { expiresIn },
    }),

  listUsers: () => request<ListUsersResponse>('/api/admin/users'),

  createUser: (data: CreateUserRequest) =>
    request<CreateUserResponse>('/api/admin/users', {
      method: 'POST',
      body: data,
    }),

  /** Fetches a file with the Authorization header and triggers a browser download. */
  async downloadLog(key: string): Promise<void> {
    const token = session.getToken();
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/logs/${encodeURIComponent(key)}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      throw new ApiError('Network error — is the backend running?', 0, 'NetworkError');
    }
    if (res.status === 401) clearSessionAndRedirect();
    if (!res.ok) {
      let message = `Download failed with status ${res.status}`;
      try {
        const data = (await res.json()) as { error?: string };
        if (data.error) message = data.error;
      } catch {
        // keep generic message
      }
      throw new ApiError(message, res.status);
    }
    const blob = await res.blob();
    const filename = key.split('/').pop() ?? 'download.log';
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },
};