import { request } from './client';

export interface OfflineDownloadManifestDto {
  chapterId: string;
  workTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  pages: string[];
  clientEncryptionKeyId: string;
  requiresSecureWindow: boolean;
  offlineLicenseExpiresAt: string;
  notice: string;
}

export const mobileOfflineApi = {
  getDownloadManifest(chapterId: string): Promise<OfflineDownloadManifestDto> {
    return request<OfflineDownloadManifestDto>(`/mobile/offline/download-manifest/${chapterId}`);
  },
};
