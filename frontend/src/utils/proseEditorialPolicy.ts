/** Espelho de UX da política de domínio do backend. A validação autoritativa é sempre server-side. */
export const PROSE_EDITORIAL_POLICY = {
  minimum: 1_000,
  shortWarningBelow: 3_000,
  recommendedMinimum: 6_000,
  recommendedMaximum: 18_000,
  maximum: 30_000,
  specialMinimum: 300,
} as const;

export type ChapterType = 'REGULAR' | 'PROLOGUE' | 'SPECIAL';

export interface ProseBlockText {
  type: 'text';
  content: { text: string };
}

export interface ProseBlockIllustration {
  type: 'illustration';
  content: { fileId: string; altText?: string; width?: number; height?: number };
}

export interface ProseBlockSeparator {
  type: 'separator';
  content?: { style?: string };
}

export type ProseBlock = ProseBlockText | ProseBlockIllustration | ProseBlockSeparator;

export interface ChapterBlocksDto {
  version: number;
  blocks: ProseBlock[];
}

/** Conta o texto visível segundo a sanitização de texto simples atual do backend. */
export function countVisibleProseCharacters(raw: string): number {
  const withoutScripts = raw.replace(/<script.*?>.*?<\/script>/gis, '');
  const withoutTags = withoutScripts.replace(/<[^>]*>/gs, '');
  const visible = withoutTags.replace(/javascript:/gi, '').normalize('NFC').replace(/\r\n?/g, '\n').trim();
  return Array.from(visible).length;
}

/** Valida capítulo no frontend (espelho da validação server-side). */
export function validateChapterBlocks(blocks: ChapterBlocksDto, chapterType: ChapterType = 'REGULAR'): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!blocks || blocks.version < 1 || blocks.version > 1) {
    errors.push('Versão de blocos não suportada.');
    return { valid: false, errors };
  }
  
  if (!blocks.blocks || blocks.blocks.length === 0) {
    errors.push('Capítulo precisa ter pelo menos um bloco.');
    return { valid: false, errors };
  }

  let illustrationCount = 0;
  let totalVisibleChars = 0;
  let hasTextBlock = false;

  for (let i = 0; i < blocks.blocks.length; i++) {
    const block = blocks.blocks[i];
    
    if (block.type === 'text') {
      hasTextBlock = true;
      const normalized = block.content.text
        .replace(/<script.*?>.*?<\/script>/gis, '')
        .replace(/<[^>]*>/gs, '')
        .replace(/javascript:/gi, '')
        .normalize('NFC')
        .replace(/\r\n?/g, '\n')
        .trim();
      const count = Array.from(normalized).length;
      if (count > 30_000) {
        errors.push(`Bloco de texto #${i + 1} excede 30.000 caracteres visíveis.`);
      }
      totalVisibleChars += count;
    } else if (block.type === 'illustration') {
      illustrationCount++;
      if (illustrationCount > 6) {
        errors.push('Capítulo excede o limite de 6 ilustrações intercaladas.');
      }
    } else if (block.type === 'separator') {
      // separadores não contam para limites
    } else {
      errors.push(`Tipo de bloco desconhecido na posição ${i + 1}.`);
    }
  }

  const minChars = chapterType === 'REGULAR' ? PROSE_EDITORIAL_POLICY.minimum : PROSE_EDITORIAL_POLICY.specialMinimum;
  const typeLabel = chapterType === 'REGULAR' ? 'Capítulo regular' : chapterType === 'PROLOGUE' ? 'Prólogo' : 'Conteúdo especial';

  if (chapterType === 'PROLOGUE' && !hasTextBlock) {
    errors.push('Prólogo precisa ter pelo menos um bloco de texto.');
  }

  if (totalVisibleChars < minChars) {
    errors.push(`${typeLabel} precisa ter pelo menos ${minChars} caracteres visíveis no total (encontrados: ${totalVisibleChars}).`);
  }
  if (totalVisibleChars > PROSE_EDITORIAL_POLICY.maximum) {
    errors.push(`${typeLabel} pode ter no máximo ${PROSE_EDITORIAL_POLICY.maximum} caracteres visíveis no total (encontrados: ${totalVisibleChars}).`);
  }

  return { valid: errors.length === 0, errors };
}

/** Conta caracteres visíveis totais dos blocos de texto. */
export function countTotalVisibleChars(blocks: ChapterBlocksDto): number {
  if (!blocks || !blocks.blocks) return 0;
  let total = 0;
  for (const block of blocks.blocks) {
    if (block.type === 'text') {
      const normalized = block.content.text
        .replace(/<script.*?>.*?<\/script>/gis, '')
        .replace(/<[^>]*>/gs, '')
        .replace(/javascript:/gi, '')
        .normalize('NFC')
        .replace(/\r\n?/g, '\n')
        .trim();
      total += Array.from(normalized).length;
    }
  }
  return total;
}

/** Converte blocos para texto simples (fallback para compatibilidade). */
export function blocksToPlainText(blocks: ChapterBlocksDto): string {
  if (!blocks || !blocks.blocks) return '';
  const parts: string[] = [];
  for (const block of blocks.blocks) {
    if (block.type === 'text') {
      const normalized = block.content.text
        .replace(/<script.*?>.*?<\/script>/gis, '')
        .replace(/<[^>]*>/gs, '')
        .replace(/javascript:/gi, '')
        .normalize('NFC')
        .replace(/\r\n?/g, '\n')
        .trim();
      parts.push(normalized);
    } else if (block.type === 'separator') {
      parts.push('---\n\n');
    }
  }
  return parts.join('\n\n');
}
