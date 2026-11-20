import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { HomeContinueReading } from '../HomeContinueReading';
import { Work, Chapter } from '../../../types';
import { ReadingProgressDto } from '../../../api/authApi';

const mockMangaWork: Work = {
  id: 'work-manga',
  slug: 'saga-sol',
  title: 'Saga do Sol',
  authorId: 'auth-1',
  authorName: 'Autor Teste',
  coverUrl: '/cover-manga.jpg',
  bannerUrl: '/banner-manga.jpg',
  synopsis: 'Sinopse teste',
  genres: ['Ação'],
  status: 'ongoing',
  format: 'MANGA',
  totalChapters: 10,
  totalViews: 100,
  totalLikes: 20,
  totalFavorites: 5,
  totalComments: 2,
  rating: 4.5,
  updatedAt: '2026-11-20T00:00:00Z',
};

const mockNovelWork: Work = {
  ...mockMangaWork,
  id: 'work-novel',
  slug: 'reino-luz',
  title: 'Reino da Luz',
  format: 'LIGHT_NOVEL',
};

const mockChapter: Chapter = {
  id: 'chap-1',
  workId: 'work-1',
  number: 3,
  title: 'Capítulo Três',
  pages: [],
  createdAt: '2026-11-20T00:00:00Z',
  publicReleaseAt: '',
  views: 10,
  likes: 5,
  commentsCount: 1,
};

describe('HomeContinueReading', () => {
  it('renders correctly for Manga with page counter and progress bar', () => {
    const progress: ReadingProgressDto = {
      id: 'prog-1',
      workId: 'work-manga',
      chapterId: 'chap-1',
      chapterNumber: 3,
      chapterTitle: 'Capítulo Três',
      page: 15,
      totalPages: 30,
      updatedAt: '2026-11-20T00:00:00Z',
    };

    const html = renderToString(
      <HomeContinueReading
        progress={progress}
        progressWork={mockMangaWork}
        progressChapter={mockChapter}
        onOpenChapter={() => {}}
        onSelectWork={() => {}}
      />
    );

    expect(html).toContain('Saga do Sol');
    expect(html).toContain('PÁG. 15/30');
    expect(html).toContain('width:50%');
  });

  it('renders correctly for Light Novel with percentage and progress bar', () => {
    const progress: ReadingProgressDto = {
      id: 'prog-2',
      workId: 'work-novel',
      chapterId: 'chap-1',
      chapterNumber: 3,
      chapterTitle: 'Capítulo Três',
      page: 45,
      totalPages: 100,
      updatedAt: '2026-11-20T00:00:00Z',
    };

    const html = renderToString(
      <HomeContinueReading
        progress={progress}
        progressWork={mockNovelWork}
        progressChapter={mockChapter}
        onOpenChapter={() => {}}
        onSelectWork={() => {}}
      />
    );

    expect(html).toContain('Reino da Luz');
    expect(html).toContain('CAP. 3 · 45%');
    expect(html).toContain('width:45%');
  });

  it('returns null when progress or work is missing', () => {
    const html = renderToString(
      <HomeContinueReading
        progress={null}
        progressWork={mockNovelWork}
        progressChapter={mockChapter}
        onOpenChapter={() => {}}
        onSelectWork={() => {}}
      />
    );

    expect(html).toBe('');
  });
});
