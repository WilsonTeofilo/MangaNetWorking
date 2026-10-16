import { ApiError } from './client';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface UploadResult {
  filename: string;
  url: string;
}

/**
 * Envia um multipart com a sessão (cookie HttpOnly) anexada.
 * Não definimos Content-Type manualmente: o browser calcula o boundary correto do FormData.
 * Não usamos Authorization/Bearer: a sessão é cookie (ADR-002).
 */
async function postMultipart<T>(path: string, formData: FormData, errorMessage: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(response.status, err.message || errorMessage, err);
  }

  return response.json();
}

/**
 * Limites de fatiamento do lote de páginas. O servidor aceita no máximo 200MB por
 * requisição (`spring.servlet.multipart.max-request-size`) e o container responde 413
 * antes do controller. Fatiar no cliente mantém capítulos longos funcionando e preserva
 * a ordem das páginas (o backend devolve um item por arquivo, na ordem enviada).
 */
const MAX_FILES_PER_BATCH = 50;
const MAX_BYTES_PER_BATCH = 100 * 1024 * 1024; // 100MB: metade do teto do servidor, com folga

/** Divide os arquivos em lotes que não estouram nem a contagem nem o tamanho por requisição. */
function chunkUploads(files: File[]): File[][] {
  const chunks: File[][] = [];
  let current: File[] = [];
  let currentBytes = 0;

  for (const file of files) {
    const exceedsCount = current.length >= MAX_FILES_PER_BATCH;
    const exceedsBytes = current.length > 0 && currentBytes + file.size > MAX_BYTES_PER_BATCH;
    if (exceedsCount || exceedsBytes) {
      chunks.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(file);
    currentBytes += file.size;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

export const storageApi = {
  /**
   * Upload de arquivo de imagem individual (Capa 2:3, Banner 16:9 ou Avatar)
   */
  uploadFile(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    return postMultipart<UploadResult>('/storage/upload', formData, 'Erro no upload de arquivo');
  },

  /**
   * Upload em lote de imagens (Páginas de um novo capítulo).
   * Enviado em lotes sequenciais para não estourar o limite de tamanho por requisição;
   * a ordem das páginas é preservada no resultado concatenado.
   */
  async uploadBatch(files: File[]): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    for (const chunk of chunkUploads(files)) {
      const formData = new FormData();
      chunk.forEach((file) => formData.append('files', file));
      const uploaded = await postMultipart<UploadResult[]>(
        '/storage/upload/batch', formData, 'Erro no upload em lote de páginas');
      results.push(...uploaded);
    }
    return results;
  },
};
