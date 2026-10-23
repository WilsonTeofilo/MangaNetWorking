/**
 * MangaNetWorking API Client
 * Centralized, anti-hardcoded HTTP client for backend interaction.
 * Sessão por cookie HttpOnly (ADR-002): NÃO guardamos tokens em localStorage.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  public status: number;
  public data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const responseData = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg =
      (typeof responseData === 'object' && (responseData.message || responseData.error)) ||
      `Erro na requisição (${response.status})`;
    throw new ApiError(response.status, errorMsg, responseData);
  }

  return responseData as T;
}

/**
 * Baixa um arquivo binário autenticado (CSV de analytics) sem expor o conteúdo no DOM.
 * O nome vem do `Content-Disposition`; se o servidor não enviar, usa o fallback.
 */
export async function downloadFile(endpoint: string, fallbackFilename: string): Promise<void> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, { method: 'GET', credentials: 'include' });

  if (!response.ok) {
    let message = `Erro na requisição (${response.status})`;
    try {
      const payload = await response.json();
      message = payload.message || payload.error || message;
    } catch {
      // Corpo não-JSON: mantém a mensagem pelo status.
    }
    throw new ApiError(response.status, message);
  }

  const disposition = response.headers.get('content-disposition') || '';
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const filename = match?.[1]?.trim() || fallbackFilename;

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Dá tempo ao navegador de iniciar o download antes de liberar a URL.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}
