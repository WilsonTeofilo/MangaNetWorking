import { mobileOfflineApi, OfflineDownloadManifestDto } from '../api/mobileOfflineApi';

export interface OfflineChapterMeta {
  chapterId: string;
  workId: string;
  workTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  pages: string[];
  totalPages: number;
  downloadedAt: string;
  expiresAt: string;
}

const CACHE_NAME = 'manganetworking-offline-v1';
const STORAGE_KEY = 'mn_offline_chapters_meta';

export const offlineStorage = {
  getOfflineChapters(): OfflineChapterMeta[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  isChapterOffline(chapterId: string): boolean {
    const list = this.getOfflineChapters();
    return list.some((c) => c.chapterId === chapterId);
  },

  async downloadChapterOffline(chapterId: string, workId: string): Promise<OfflineChapterMeta> {
    // 1. Obter manifesto autorizado do backend (validação de VIP no servidor)
    const manifest: OfflineDownloadManifestDto = await mobileOfflineApi.getDownloadManifest(chapterId);

    // 2. Abrir CacheStorage do navegador
    if (!('caches' in window)) {
      throw new Error('Navegador não suporta CacheStorage offline.');
    }
    const cache = await caches.open(CACHE_NAME);

    // 3. Baixar cada página e armazenar no cache
    if (manifest.pages.length === 0) {
      throw new Error('Este capítulo não possui páginas disponíveis para download offline.');
    }

    let failedPages = 0;
    for (const pageUrl of manifest.pages) {
      try {
        const response = await fetch(pageUrl, { credentials: 'include' });
        if (response.ok) {
          await cache.put(pageUrl, response);
        } else {
          failedPages += 1;
        }
      } catch (err) {
        failedPages += 1;
        console.warn(`[OFFLINE] Falha ao baixar página individual: ${pageUrl}`, err);
      }
    }

    // Não gravar metadados de um download incompleto: o usuário acharia que está offline
    // e o leitor falharia no meio do capítulo.
    if (failedPages > 0) {
      throw new Error(
        `Não foi possível baixar ${failedPages} de ${manifest.pages.length} páginas. ` +
        'Verifique a conexão e tente novamente.'
      );
    }

    // 4. Salvar metadados do capítulo baixado
    const meta: OfflineChapterMeta = {
      chapterId: manifest.chapterId,
      workId,
      workTitle: manifest.workTitle,
      chapterNumber: manifest.chapterNumber,
      chapterTitle: manifest.chapterTitle,
      pages: manifest.pages,
      totalPages: manifest.pages.length,
      downloadedAt: new Date().toISOString(),
      expiresAt: manifest.offlineLicenseExpiresAt,
    };

    const existing = this.getOfflineChapters().filter((c) => c.chapterId !== chapterId);
    existing.push(meta);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

    // Notificar UI de atualização
    window.dispatchEvent(new CustomEvent('offline-storage-updated', { detail: { chapterId } }));

    return meta;
  },

  async removeOfflineChapter(chapterId: string): Promise<void> {
    const list = this.getOfflineChapters();
    const target = list.find((c) => c.chapterId === chapterId);

    if (target && 'caches' in window) {
      const cache = await caches.open(CACHE_NAME);
      for (const pageUrl of target.pages) {
        await cache.delete(pageUrl);
      }
    }

    const updated = list.filter((c) => c.chapterId !== chapterId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    window.dispatchEvent(new CustomEvent('offline-storage-updated', { detail: { chapterId } }));
  },

  async getOfflinePageBlobUrl(pageUrl: string): Promise<string | null> {
    if (!('caches' in window)) return null;
    try {
      const cache = await caches.open(CACHE_NAME);
      const match = await cache.match(pageUrl);
      if (match) {
        const blob = await match.blob();
        return URL.createObjectURL(blob);
      }
    } catch {
      return null;
    }
    return null;
  },
};
