export interface ProseBlock {
  type: 'text' | 'illustration' | 'separator';
  content: {
    text?: string;
    fileId?: string;
    altText?: string;
    width?: number;
    height?: number;
    style?: string;
  };
}

export interface ProseSettings {
  fontSize: number;
  lineHeight: number;
  maxWidth: number;
  serif: boolean;
}

export type ReadingMode = 'paginated' | 'vertical';

export const DEFAULT_PROSE_SETTINGS: ProseSettings = {
  fontSize: 18,
  lineHeight: 1.9,
  maxWidth: 720,
  serif: true,
};
