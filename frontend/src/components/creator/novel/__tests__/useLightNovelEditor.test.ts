import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { createRoot } from 'react-dom/client';
import { useLightNovelEditor, UseLightNovelEditorProps } from '../useLightNovelEditor';
import { workApi } from '../../../../api/workApi';

// Mock do contexto de autenticação com capacidade de alterar uid
const mockAuthState = {
  user: {
    uid: 'user-ln-1',
    name: 'Autor Novel Teste',
    email: 'novel@test.com',
    username: 'novelista',
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
    createChapter: vi.fn().mockResolvedValue({ id: 'chap-new', chapterNumber: 1 }),
    updateChapter: vi.fn().mockResolvedValue({ id: 'chap-updated', chapterNumber: 1 }),
  },
}));

// Helper para montar hooks com React 19 em ambiente .ts sem JSX
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

describe('useLightNovelEditor', () => {
  const defaultProps: UseLightNovelEditorProps = {
    workId: 'work-novel-200',
    nextChapterNumber: 1,
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
    mockAuthState.user.uid = 'user-ln-1';
    vi.clearAllMocks();
  });

  it('recupera rascunho de light novel com blocos válidos (< 24h) sob mn:ln-draft:${userId}:${workId}:novo', () => {
    const draftKey = `mn:ln-draft:user-ln-1:work-novel-200:novo`;
    const savedTime = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(); // 3h atrás

    localStorage.setItem(
      draftKey,
      JSON.stringify({
        title: 'Capítulo Rascunhado de Novel',
        chapterType: 'SPECIAL',
        blocks: [
          { key: 'blk-1', type: 'text', text: 'Parágrafo inicial restaurado.' },
          { key: 'blk-2', type: 'separator', style: 'scene' },
        ],
        savedAt: savedTime,
      })
    );

    const { result, unmount } = renderHook(() => useLightNovelEditor(defaultProps));

    expect(result.current.recoverable).not.toBeNull();
    expect(result.current.recoverable?.title).toBe('Capítulo Rascunhado de Novel');
    expect(result.current.recoverable?.chapterType).toBe('SPECIAL');
    expect(result.current.recoverable?.blocks).toHaveLength(2);
    const firstBlock = result.current.recoverable?.blocks[0];
    expect(firstBlock?.type).toBe('text');
    if (firstBlock?.type === 'text') {
      expect(firstBlock.text).toBe('Parágrafo inicial restaurado.');
    }

    // Restaura rascunho e valida atualização dos estados
    act(() => {
      result.current.restoreDraft();
    });

    expect(result.current.chapterTitle).toBe('Capítulo Rascunhado de Novel');
    expect(result.current.chapterType).toBe('SPECIAL');
    expect(result.current.blocks).toHaveLength(2);
    expect(result.current.recoverable).toBeNull();

    unmount();
  });

  it('ignora rascunho para guest (user.uid === "guest")', () => {
    mockAuthState.user.uid = 'guest';
    const draftKey = `mn:ln-draft:guest:work-novel-200:novo`;

    localStorage.setItem(
      draftKey,
      JSON.stringify({
        title: 'Rascunho de Convidado',
        chapterType: 'REGULAR',
        blocks: [{ key: 'blk-g', type: 'text', text: 'Conteúdo guest' }],
        savedAt: new Date().toISOString(),
      })
    );

    const { result, unmount } = renderHook(() => useLightNovelEditor(defaultProps));

    expect(result.current.recoverable).toBeNull();
    unmount();
  });

  it('ignora e expurga do localStorage rascunho expirado (> 24h) ou timestamp inválido', () => {
    const draftKey = `mn:ln-draft:user-ln-1:work-novel-200:novo`;
    const expiredTime = new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(); // 28h atrás

    localStorage.setItem(
      draftKey,
      JSON.stringify({
        title: 'Novel Antiga Expirada',
        chapterType: 'REGULAR',
        blocks: [{ key: 'blk-exp', type: 'text', text: 'Conteúdo antigo' }],
        savedAt: expiredTime,
      })
    );

    const { result, unmount } = renderHook(() => useLightNovelEditor(defaultProps));

    expect(result.current.recoverable).toBeNull();
    // Expurgo automático do storage quando expirado
    expect(localStorage.getItem(draftKey)).toBeNull();

    unmount();
  });

  it('step lock: maxStep = 1 quando título inválido, maxStep = 2 quando sem blocos/inválido, maxStep = 4 em modo edição', () => {
    // 1. Início padrão: título "Capítulo 1" (válido), mas bloco inicial vazio (menos de 1000 chars -> editorial inválido)
    const { result, unmount } = renderHook(() => useLightNovelEditor(defaultProps));

    expect(result.current.titleError).toBeNull();
    expect(result.current.editorial.valid).toBe(false);
    expect(result.current.maxStep).toBe(2);

    // Tentativa de navegar além de maxStep é limitada a 2
    act(() => {
      result.current.goToStep(3);
    });
    expect(result.current.step).toBe(2);

    // 2. Título inválido (vazio) -> maxStep reduz para 1
    act(() => {
      result.current.setChapterTitle('   ');
    });
    expect(result.current.titleError).toBe('Informe o título do capítulo.');
    expect(result.current.maxStep).toBe(1);

    // Tentativa de navegar para etapa 2 é barrada no step 1
    act(() => {
      result.current.goToStep(2);
    });
    expect(result.current.step).toBe(1);

    unmount();

    // 3. Modo edição: todas as etapas liberadas (maxStep = 4)
    const editProps: UseLightNovelEditorProps = {
      workId: 'work-novel-200',
      nextChapterNumber: 2,
      editingNumber: 2,
      draft: {
        chapterNumber: 2,
        title: 'Capítulo em Edição',
        content: 'Conteúdo existente',
      },
    };

    const { result: editResult, unmount: unmountEdit } = renderHook(() => useLightNovelEditor(editProps));

    expect(editResult.current.maxStep).toBe(4);

    // Consegue avançar livremente para a etapa 4
    act(() => {
      editResult.current.goToStep(4);
    });
    expect(editResult.current.step).toBe(4);

    unmountEdit();
  });

  it('contrato: ao publicar, envia payload com blocksJson estruturado e não content', async () => {
    const { result, unmount } = renderHook(() => useLightNovelEditor(defaultProps));

    // Define título válido
    act(() => {
      result.current.setChapterTitle('Capítulo Épico Oficial');
    });

    // Cria texto que satisfaz a política editorial mínima de 1.000 caracteres para REGULAR
    const proseText = 'Era uma vez uma jornada épica através dos reinos esquecidos de MangaNetWorking. '.repeat(20);
    expect(proseText.length).toBeGreaterThan(1000);

    const firstBlockKey = result.current.blocks[0]?.key;
    expect(firstBlockKey).toBeDefined();

    act(() => {
      result.current.updateBlock(firstBlockKey, (b) => ({
        ...b,
        text: proseText,
      }));
    });

    expect(result.current.editorial.valid).toBe(true);

    // Publica o capítulo
    await act(async () => {
      await result.current.handlePublish();
    });

    expect(result.current.error).toBeNull();
    expect(vi.mocked(workApi.createChapter)).toHaveBeenCalledTimes(1);

    const [calledWorkId, callPayload] = vi.mocked(workApi.createChapter).mock.calls[0];
    expect(calledWorkId).toBe('work-novel-200');

    // Validações estritas do contrato de API:
    // 1. Deve conter blocksJson como string JSON válida
    expect(callPayload.blocksJson).toBeDefined();
    expect(typeof callPayload.blocksJson).toBe('string');

    const parsedBlocks = JSON.parse(callPayload.blocksJson as string);
    expect(parsedBlocks.version).toBe(1);
    expect(Array.isArray(parsedBlocks.blocks)).toBe(true);
    expect(parsedBlocks.blocks[0].type).toBe('text');
    expect(parsedBlocks.blocks[0].content.text).toBe(proseText);

    // 2. Não deve enviar o campo legado "content"
    expect('content' in (callPayload as unknown as Record<string, unknown>)).toBe(false);

    // 3. Formato deve ser PROSE
    expect(callPayload.format).toBe('PROSE');
    expect(callPayload.title).toBe('Capítulo Épico Oficial');

    unmount();
  });

  it('descarta rascunho limpando localStorage e recoverable', () => {
    const draftKey = `mn:ln-draft:user-ln-1:work-novel-200:novo`;
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        title: 'Rascunho para Descartar',
        chapterType: 'REGULAR',
        blocks: [{ key: 'b-disc', type: 'text', text: 'Descarte' }],
        savedAt: new Date().toISOString(),
      })
    );

    const { result, unmount } = renderHook(() => useLightNovelEditor(defaultProps));

    expect(result.current.recoverable).not.toBeNull();

    act(() => {
      result.current.discardStoredDraft();
    });

    expect(result.current.recoverable).toBeNull();
    expect(localStorage.getItem(draftKey)).toBeNull();

    unmount();
  });
});
