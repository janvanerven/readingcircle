const API_BASE = '/api';

let accessToken: string | null = null;
let onAuthError: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setOnAuthError(handler: () => void) {
  onAuthError = handler;
}

async function refreshToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    accessToken = data.accessToken;
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Try refresh on 401
  if (res.status === 401 && accessToken) {
    const newToken = await refreshToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: 'include',
      });
    } else {
      onAuthError?.();
      throw new ApiError(401, 'Session expired');
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new ApiError(res.status, body.error || 'Request failed', body.code);
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
