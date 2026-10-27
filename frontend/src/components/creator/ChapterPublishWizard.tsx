import { LightNovelChapterWizard } from './LightNovelChapterWizard';
import { MangaChapterWizard } from './manga/MangaChapterWizard';
import type { ChapterDraft } from './LightNovelChapterWizard';

export type { ChapterDraft };

export interface ChapterPublishWizardProps {
  workId: string;
  workTitle: string;
  workFormat?: 'MANGA' | 'LIGHT_NOVEL' | null;
  nextChapterNumber: number;
  /** Capítulo em edição (páginas, texto e metadados já gravados). */
  draft?: ChapterDraft | null;
  /** Números de capítulo já usados na obra (light novel: impede um segundo capítulo 0). */
  existingChapterNumbers?: number[];
  /** Publicou/editou: o painel recarrega a lista de capítulos. */
  onPublished?: () => void;
}

/**
 * Roteia para o wizard especialista conforme o formato da obra.
 * - MANGA: páginas de imagens ordenadas (MangaChapterWizard).
 * - LIGHT_NOVEL: editor de blocos tipados e ilustrações (LightNovelChapterWizard).
 */
export function ChapterPublishWizard(props: ChapterPublishWizardProps) {
  if (props.workFormat === 'LIGHT_NOVEL') {
    return <LightNovelChapterWizard {...props} />;
  }
  return <MangaChapterWizard {...props} />;
}
