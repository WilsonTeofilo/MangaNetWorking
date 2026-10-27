export interface PageItem {
  key: string;
  /** Arquivo novo (ainda não enviado). Ausente em página já publicada. */
  file?: File;
  /** URL definitiva da página (no modo de edição, a página já está no storage). */
  url?: string;
  previewUrl: string;
}

export interface ChecklistItem {
  id: number;
  label: string;
  ok: boolean;
}

export const MANGA_WIZARD_STEPS = [
  { id: 1, label: 'Upload' },
  { id: 2, label: 'Organizar páginas' },
  { id: 3, label: 'Capa do capítulo' },
  { id: 4, label: 'Revisar' },
  { id: 5, label: 'Publicar' },
] as const;
