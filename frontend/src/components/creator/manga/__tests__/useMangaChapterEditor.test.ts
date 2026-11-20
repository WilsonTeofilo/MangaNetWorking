import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useMangaChapterEditor, UseMangaChapterEditorProps } from '../useMangaChapterEditor';

// Mock do contexto de autenticação com capacidade de alterar uid
const mockAuthState = {
  user: {
    uid: 'user-manga-1',
    name: 'Mangaká Teste',
    email: 'manga@test.com',
    username: 'mangaka',
    isCreator: true,
  },
  isAuthenticated: true,
};

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

vi.mock('../../../../api/storageApi', () => ({
  storageApi: {
    uploadBatch: vi.fn(),
    uploadFile: vi.fn(),
  },
}));

vi.mock('../../../../api/workApi', () => ({
  workApi: {
    createChapter: vi.fn(),
    updateChapter: vi.fn(),
  },
}));

// Helper para montar hooks com React 19
function renderHook<TProps, TResult>(
  hook: (props: TProps) => TResult,
  options?: { initialProps?: TProps }
) {
  const result = { current: undefined as unknown as TResult };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  let currentProps = options?.initialProps;

  function HookWrapper() {
    result.current = hook(currentProps as TProps);
    return null;
  }

  act(() => {
    root.render(React.createElement(HookWrapper));
  });

  return {
    result,
    rerender: (newProps?: TProps) => {
      if (newProps !== undefined) {
        currentProps = newProps;
      }
      act(() => {
        root.render(React.createElement(HookWrapper));
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('useMangaChapterEditor', () => {
  const defaultProps: UseMangaChapterEditorProps = {
    workId: 'work-manga-100',
    workTitle: 'Mangá Incrível',
    nextChapterNumber: 5,
  };

  beforeAll(() => {
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    if (typeof URL.createObjectURL === 'undefined') {
      URL.createObjectURL = vi.fn((file: Blob | File) => `blob:mock-${(file as File).name || 'file'}`);
    }
    if (typeof URL.revokeObjectURL === 'undefined') {
      URL.revokeObjectURL = vi.fn();
    }
  });

  beforeEach(() => {
    localStorage.clear();
    mockAuthState.user.uid = 'user-manga-1';
    vi.clearAllMocks();
  });

  it('recupera rascunho recente (< 24h) com chave mn:manga-draft:${userId}:${workId}', () => {
    const draftKey = `mn:manga-draft:user-manga-1:work-manga-100`;
    const savedTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2h atrás
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        chapterTitle: 'Capítulo Rascunhado 5',
        releaseDate: '2026-11-20T15:30',
        chapterType: 'SPECIAL',
        savedAt: savedTime,
      })
    );

    const { result, unmount } = renderHook(() => useMangaChapterEditor(defaultProps));

    expect(result.current.recoverable).not.toBeNull();
    expect(result.current.recoverable?.chapterTitle).toBe('Capítulo Rascunhado 5');
    expect(result.current.recoverable?.chapterType).toBe('SPECIAL');
    expect(result.current.recoverable?.releaseDate).toBe('2026-11-20T15:30');
    expect(result.current.recoverable?.savedAt).toBe(savedTime);

    // Testa restauração do rascunho
    act(() => {
      result.current.restoreDraft();
    });

    expect(result.current.chapterTitle).toBe('Capítulo Rascunhado 5');
    expect(result.current.chapterType).toBe('SPECIAL');
    expect(result.current.releaseDate).toBe('2026-11-20T15:30');
    expect(result.current.recoverable).toBeNull();

    unmount();
  });

  it('ignora rascunhos de convidados (user.uid === "guest")', () => {
    mockAuthState.user.uid = 'guest';
    const draftKey = `mn:manga-draft:guest:work-manga-100`;
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        chapterTitle: 'Rascunho de Convidado',
        releaseDate: '',
        chapterType: 'REGULAR',
        savedAt: new Date().toISOString(),
      })
    );

    const { result, unmount } = renderHook(() => useMangaChapterEditor(defaultProps));

    expect(result.current.recoverable).toBeNull();
    unmount();
  });

  it('ignora rascunhos expirados com timestamp > 24h', () => {
    const draftKey = `mn:manga-draft:user-manga-1:work-manga-100`;
    const expiredTime = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(); // 26h atrás
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        chapterTitle: 'Capítulo Antigo Expirado',
        releaseDate: '',
        chapterType: 'REGULAR',
        savedAt: expiredTime,
      })
    );

    const { result, unmount } = renderHook(() => useMangaChapterEditor(defaultProps));

    expect(result.current.recoverable).toBeNull();
    unmount();
  });

  it('rejeita arquivos com tamanho acima de 15 MB e exibe erro', () => {
    const { result, unmount } = renderHook(() => useMangaChapterEditor(defaultProps));

    // Arquivo simulado de 16 MB
    const hugeFile = new File(['x'], 'huge-page.png', { type: 'image/png' });
    Object.defineProperty(hugeFile, 'size', { value: 16 * 1024 * 1024 });

    act(() => {
      result.current.addPages([hugeFile]);
    });

    expect(result.current.pages).toHaveLength(0);
    expect(result.current.error).toContain('15 MB');
    unmount();
  });

  it('rejeita páginas que ultrapassam o teto de 300 páginas e bloqueia excedentes', () => {
    const { result, unmount } = renderHook(() => useMangaChapterEditor(defaultProps));

    // Criar lote com 305 arquivos válidos (1 KB cada)
    const files = Array.from({ length: 305 }, (_, i) => {
      const file = new File(['fake-image-bytes'], `p${i + 1}.jpg`, { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 });
      return file;
    });

    act(() => {
      result.current.addPages(files);
    });

    // Deve aceitar apenas 300 páginas e indicar erro informativo para os 5 excedentes
    expect(result.current.pages).toHaveLength(300);
    expect(result.current.error).toContain('5 acima do limite de páginas');

    // Ao tentar adicionar mais páginas quando já está em 300, bloqueia totalmente
    const extraFile = new File(['fake'], 'extra.jpg', { type: 'image/jpeg' });
    Object.defineProperty(extraFile, 'size', { value: 1024 });

    act(() => {
      result.current.addPages([extraFile]);
    });

    expect(result.current.pages).toHaveLength(300);
    expect(result.current.error).toBe('Este capítulo já atingiu o limite de 300 páginas.');
    unmount();
  });

  it('descarta rascunho limpando localStorage e recoverable', () => {
    const draftKey = `mn:manga-draft:user-manga-1:work-manga-100`;
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        chapterTitle: 'Rascunho a Descartar',
        releaseDate: '',
        chapterType: 'REGULAR',
        savedAt: new Date(Date.now() - 1000).toISOString(),
      })
    );

    const { result, unmount } = renderHook(() => useMangaChapterEditor(defaultProps));

    expect(result.current.recoverable).not.toBeNull();

    act(() => {
      result.current.discardStoredDraft();
    });

    expect(result.current.recoverable).toBeNull();
    expect(localStorage.getItem(draftKey)).toBeNull();
    unmount();
  });
});
