/**
 * MangaNetWorking API Client
 * Centralized, anti-hardcoded HTTP client for backend interaction.
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

let authToken: string | null = localStorage.getItem('manganetworking_token');

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('manganetworking_token', token);
  } else {
    localStorage.removeItem('manganetworking_token');
  }
}

export function getAuthToken(): string | null {
  return authToken || localStorage.getItem('manganetworking_token');
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

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
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
