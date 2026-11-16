import { describe, it, expect } from 'vitest';
import { parsePagesJson, mapChapterSummary } from '../apiMappers';

describe('apiMappers utility', () => {
  it('should parse valid JSON array of image pages', () => {
    const json = '["/storage/page-1.webp", "/storage/page-2.webp"]';
    const pages = parsePagesJson(json);
    expect(pages).toEqual(['/storage/page-1.webp', '/storage/page-2.webp']);
  });

  it('should handle null, empty or invalid JSON gracefully', () => {
    expect(parsePagesJson(null)).toEqual([]);
    expect(parsePagesJson('')).toEqual([]);
    expect(parsePagesJson('not-a-json')).toEqual([]);
    expect(parsePagesJson('{"notAnArray": true}')).toEqual([]);
  });

  it('should map chapter summary DTO to frontend Chapter type', () => {
    const chapter = mapChapterSummary(
      {
        id: 'c-1',
        chapterNumber: 5,
        title: 'O Despertar da Lâmina',
        likes: 42,
        views: 120,
        isEarlyAccess: false,
        publicReleaseAt: '2026-10-25T12:00:00Z',
      },
      'work-1'
    );

    expect(chapter.id).toBe('c-1');
    expect(chapter.number).toBe(5);
    expect(chapter.title).toBe('O Despertar da Lâmina');
    expect(chapter.likes).toBe(42);
    expect(chapter.views).toBe(120);
    expect(chapter.isEarlyAccess).toBe(false);
  });
});
