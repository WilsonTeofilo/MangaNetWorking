import { ChapterBlocksDto, ChapterType, ProseBlock } from '../../../utils/proseEditorialPolicy';

export const STEPS = [
  { id: 1, label: 'Detalhes' },
  { id: 2, label: 'Escrever' },
  { id: 3, label: 'Revisar' },
  { id: 4, label: 'Publicar' },
] as const;

export const CHAPTER_TYPE_LABEL: Record<ChapterType, string> = {
  REGULAR: 'Capítulo regular',
  PROLOGUE: 'Prólogo (capítulo 0)',
  SPECIAL: 'Conteúdo especial',
};

export interface ChapterDraft {
  chapterNumber?: number;
  title?: string;
  pages?: string[];
  coverUrl?: string | null;
  releaseDate?: string | null;
  content?: string | null;
  blocksJson?: string | null;
  chapterType?: ChapterType | null;
}

let blockSeq = 0;
export function nextKey(): string {
  blockSeq += 1;
  return `lnb-${Date.now().toString(36)}-${blockSeq}`;
}

export interface TextEditorBlock {
  key: string;
  type: 'text';
  text: string;
}

export interface IllustrationEditorBlock {
  key: string;
  type: 'illustration';
  fileId: string;
  altText: string;
  width: number;
  previewUrl?: string;
  fileName?: string;
  uploading?: boolean;
}

export interface SeparatorEditorBlock {
  key: string;
  type: 'separator';
  style: 'scene' | 'time' | 'pov' | 'line';
}

export type EditorBlock = TextEditorBlock | IllustrationEditorBlock | SeparatorEditorBlock;

export function newTextBlock(initialText: string = ''): TextEditorBlock {
  return { key: nextKey(), type: 'text', text: initialText };
}

export function newIllustrationBlock(
  fileId: string = '',
  previewUrl?: string,
  fileName?: string
): IllustrationEditorBlock {
  return {
    key: nextKey(),
    type: 'illustration',
    fileId,
    previewUrl: previewUrl ?? (fileId ? illustrationSrc(fileId) : undefined),
    fileName,
    altText: '',
    width: 100,
  };
}

export function newSeparatorBlock(style: 'scene' | 'time' | 'pov' | 'line' = 'scene'): SeparatorEditorBlock {
  return { key: nextKey(), type: 'separator', style };
}

export function illustrationSrc(fileId: string): string {
  if (!fileId) return '';
  if (fileId.startsWith('http') || fileId.startsWith('/')) return fileId;
  return `/api/storage/${fileId}`;
}

export function toProseBlock(block: EditorBlock): ProseBlock {
  if (block.type === 'text') {
    return { type: 'text', content: { text: block.text } };
  }
  if (block.type === 'illustration') {
    return {
      type: 'illustration',
      content: {
        fileId: block.fileId,
        altText: block.altText.trim() || undefined,
        width: block.width,
      },
    };
  }
  return { type: 'separator', content: { style: block.style } };
}

export function fromProseBlock(block: ProseBlock): EditorBlock {
  if (block.type === 'text') {
    return { key: nextKey(), type: 'text', text: block.content?.text ?? '' };
  }
  if (block.type === 'illustration') {
    const fileId = block.content?.fileId ?? '';
    return {
      key: nextKey(),
      type: 'illustration',
      fileId,
      altText: block.content?.altText ?? '',
      width: block.content?.width ?? 100,
      previewUrl: illustrationSrc(fileId),
    };
  }
  const style = (block.content?.style ?? 'scene') as SeparatorEditorBlock['style'];
  return { key: nextKey(), type: 'separator', style };
}

export function initialBlocks(draft?: ChapterDraft | null): EditorBlock[] {
  if (draft?.blocksJson) {
    try {
      const parsed = JSON.parse(draft.blocksJson) as ChapterBlocksDto;
      if (Array.isArray(parsed?.blocks) && parsed.blocks.length > 0) {
        return parsed.blocks.map(fromProseBlock);
      }
    } catch {
      // fallback
    }
  }
  if (draft?.content && draft.content.trim()) {
    return draft.content
      .split(/\n{2,}/)
      .filter((paragraph) => paragraph.trim().length > 0)
      .map((paragraph) => ({ key: nextKey(), type: 'text' as const, text: paragraph }));
  }
  return [newTextBlock()];
}

export const SEPARATOR_LABEL: Record<SeparatorEditorBlock['style'], { label: string; glyph: string }> = {
  scene: { label: 'Quebra de cena', glyph: '• • •' },
  time: { label: 'Passagem de tempo', glyph: '~ ~ ~' },
  pov: { label: 'Mudança de POV', glyph: '◆ ◆ ◆' },
  line: { label: 'Linha simples', glyph: '—' },
};

export function getSeparatorGlyph(style?: string): string {
  if (style === 'time') return '~ ~ ~';
  if (style === 'pov') return '◆ ◆ ◆';
  if (style === 'line') return '—';
  return '• • •';
}
