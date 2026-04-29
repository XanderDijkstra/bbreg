const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api';

export interface ApiError {
  status: number;
  code: string;
  message: string;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      const err: ApiError = {
        status: res.status,
        code: 'INVALID_JSON',
        message: `Forventet JSON, fikk ${res.headers.get('content-type') ?? 'ukjent type'}.`,
      };
      throw err;
    }
  }
  if (!res.ok) {
    const e = json as { error?: { code?: string; message?: string } } | null;
    const err: ApiError = {
      status: res.status,
      code: e?.error?.code ?? 'UNKNOWN',
      message: e?.error?.message ?? `HTTP ${res.status}`,
    };
    throw err;
  }
  return json as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
