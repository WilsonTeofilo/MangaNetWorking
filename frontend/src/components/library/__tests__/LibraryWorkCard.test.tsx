import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { LibraryWorkCard, LibraryCardData } from '../LibraryWorkCard';
import { Work } from '../../../types';

const mockWork: Work = {
  id: 'work-1',
  slug: 'saga-do-sol',
  title: 'Saga do Sol',
  authorId: 'auth-1',
  authorName: 'Akira Toriyama',
  coverUrl: '/cover.jpg',
  bannerUrl: '/banner.jpg',
  synopsis: 'Uma jornada épica.',
  genres: ['Ação', 'Aventura'],
  status: 'ongoing',
  format: 'MANGA',
  totalChapters: 42,
  totalViews: 1000,
  totalLikes: 250,
  totalFavorites: 80,
  totalComments: 30,
  rating: 4.8,
  updatedAt: '2026-11-16T00:00:00Z',
};

const mockCard: LibraryCardData = {
  work: mockWork,
  entry: {
    id: 'work-1',
    slug: 'saga-do-sol',
    title: 'Saga do Sol',
    coverUrl: '/cover.jpg',
    authorName: 'Akira Toriyama',
    authorHandle: 'akira',
    format: 'MANGA',
    status: 'ongoing',
    totalChapters: 42,
  },
  progress: {
    id: 'prog-1',
    workId: 'work-1',
    chapterId: 'chap-5',
    chapterNumber: 5,
    chapterTitle: 'O Retorno',
    page: 12,
    totalPages: 48,
    updatedAt: '2026-11-16T00:00:00Z',
  },
  finished: false,
  page: 12,
  totalPages: 48,
};

describe('LibraryWorkCard', () => {
  it('renders clean card with title, author and total chapters', () => {
    const html = renderToString(
      <LibraryWorkCard
        card={mockCard}
        onSelectWork={() => {}}
        onRemoveFavorite={() => {}}
      />
    );

    expect(html).toContain('Saga do Sol');
    expect(html).toContain('Akira Toriyama');
    expect(html).toContain('42 CAPS');
  });

  it('does NOT contain obsolete stacked buttons or details link', () => {
    const html = renderToString(
      <LibraryWorkCard
        card={mockCard}
        onSelectWork={() => {}}
        onRemoveFavorite={() => {}}
      />
    );

    // Botoes eliminados na despoluicao
    expect(html).not.toContain('CONTINUAR DE ONDE PAROU');
    expect(html).not.toContain('DETALHES →');
    expect(html).not.toContain('ESCOLHER CAPÍTULO');
  });

  it('renders embedded progress bar and discrete page counter', () => {
    const html = renderToString(
      <LibraryWorkCard
        card={mockCard}
        onSelectWork={() => {}}
        onRemoveFavorite={() => {}}
      />
    );

    // Barra de progresso de 3px e texto silkscreen
    expect(html).toContain('h-[3px]');
    expect(html).toContain('PÁG. 12/48');
    expect(html).toContain('25%');
  });

  it('renders trash button with aria-label for discrete removal', () => {
    const html = renderToString(
      <LibraryWorkCard
        card={mockCard}
        onSelectWork={() => {}}
        onRemoveFavorite={() => {}}
      />
    );

    expect(html).toContain('aria-label="Remover da biblioteca"');
  });
});
