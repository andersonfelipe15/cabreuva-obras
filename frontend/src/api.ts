// Cliente HTTP simples com token JWT em localStorage.
const BASE = '/api';

export function getToken(): string | null {
  return localStorage.getItem('token');
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, { ...options, headers });
  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const body = await res.json();
      if (body.validation) message = body.validation.join('\n');
      else if (body.message) message = Array.isArray(body.message) ? body.message.join('\n') : body.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body?: unknown) =>
    request<T>(p, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(p: string, body?: unknown) =>
    request<T>(p, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(p: string) => request<T>(p, { method: 'DELETE' }),
};

export interface UploadedFile {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

// Upload real de anexo (multipart) — o browser define o boundary sozinho.
export async function uploadFile(file: File): Promise<UploadedFile> {
  const fd = new FormData();
  fd.append('file', file);
  const token = getToken();
  const res = await fetch(BASE + '/files', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });
  if (!res.ok) throw new Error('Falha no upload do arquivo');
  return res.json();
}
