import { useCallback, useEffect, useState } from 'react';
import { workApi, WorkCommentDto } from '../../api/workApi';
import { useAuth } from '../../context/AuthContext';

const PAGE_SIZE = 10;

function updateComment(
  comments: WorkCommentDto[],
  commentId: string,
  update: (comment: WorkCommentDto) => WorkCommentDto,
): WorkCommentDto[] {
  return comments.map((comment) => {
    if (comment.id === commentId) return update(comment);
    if (comment.replies.length === 0) return comment;
    return { ...comment, replies: updateComment(comment.replies, commentId, update) };
  });
}

interface UseWorkCommentsProps {
  workId: string;
  chapterId?: string;
  onRequireAuth?: () => void;
}

export function useWorkComments({ workId, chapterId, onRequireAuth }: UseWorkCommentsProps) {
  const { isAuthenticated, user } = useAuth();
  const [comments, setComments] = useState<WorkCommentDto[]>([]);
  const [body, setBody] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState<'top' | 'new'>('top');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const load = useCallback(
    (nextPage: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      workApi
        .listComments(workId, { chapterId, page: nextPage, size: PAGE_SIZE, sort })
        .then((result) => {
          setComments((current) => (append ? [...current, ...result.items] : result.items));
          setPage(result.page);
          setTotal(result.total);
          setHasMore(result.hasMore);
        })
        .catch(() => setError('Não foi possível carregar os comentários.'))
        .finally(() => {
          setLoading(false);
          setLoadingMore(false);
        });
    },
    [workId, chapterId, sort],
  );

  useEffect(() => {
    load(0, false);
  }, [load]);

  const markBusy = (id: string, busy: boolean) => {
    setBusyIds((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const requireAuth = (authMessage: string) => {
    if (onRequireAuth) {
      onRequireAuth();
      return;
    }
    setError(authMessage);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    if (text.length === 0) return;
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      await workApi.createComment(workId, text, chapterId);
      setBody('');
      setMessage('Comentário publicado.');
      load(0, false);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível publicar o comentário.');
    } finally {
      setSending(false);
    }
  };

  const submitReply = async (parentId: string) => {
    const text = replyBody.trim();
    if (text.length === 0) return;
    setError(null);
    setMessage(null);
    markBusy(parentId, true);
    try {
      const created = await workApi.createComment(workId, text, chapterId, parentId);
      setComments((current) =>
        updateComment(current, parentId, (comment) => ({
          ...comment,
          replies: [...comment.replies, created],
          replyCount: comment.replyCount + 1,
        })),
      );
      setReplyBody('');
      setReplyingTo(null);
      setTotal((value) => value + 1);
      setMessage('Resposta publicada.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível publicar a resposta.');
    } finally {
      markBusy(parentId, false);
    }
  };

  const toggleLike = async (comment: WorkCommentDto) => {
    if (!isAuthenticated) {
      requireAuth('Entre na sua conta para curtir comentários.');
      return;
    }
    if (busyIds.has(comment.id)) return;
    const previous = comment;
    markBusy(comment.id, true);
    setComments((current) =>
      updateComment(current, comment.id, (item) => ({
        ...item,
        likedByMe: !item.likedByMe,
        likesCount: Math.max(0, item.likesCount + (item.likedByMe ? -1 : 1)),
      })),
    );
    try {
      const result = await workApi.toggleCommentLike(workId, comment.id);
      setComments((current) =>
        updateComment(current, comment.id, (item) => ({
          ...item,
          likedByMe: result.liked,
          likesCount: result.likesCount,
        })),
      );
    } catch {
      setComments((current) => updateComment(current, comment.id, () => previous));
      setError('Não foi possível registrar a curtida.');
    } finally {
      markBusy(comment.id, false);
    }
  };

  const startEdit = (comment: WorkCommentDto) => {
    setEditingId(comment.id);
    setEditBody(comment.body);
    setError(null);
  };

  const saveEdit = async (commentId: string) => {
    const text = editBody.trim();
    if (text.length === 0) return;
    markBusy(commentId, true);
    try {
      const updated = await workApi.editComment(workId, commentId, text);
      setComments((current) =>
        updateComment(current, commentId, (item) => ({
          ...item,
          body: updated.body,
          edited: true,
          editedAt: updated.editedAt,
        })),
      );
      setEditingId(null);
      setEditBody('');
      setMessage('Comentário editado.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível editar o comentário.');
    } finally {
      markBusy(commentId, false);
    }
  };

  const removeComment = async (comment: WorkCommentDto) => {
    if (!window.confirm('Excluir este comentário? As respostas continuam visíveis.')) return;
    markBusy(comment.id, true);
    try {
      await workApi.deleteComment(workId, comment.id);
      setComments((current) =>
        updateComment(current, comment.id, (item) => ({
          ...item,
          deleted: true,
          body: '[comentário excluído]',
          edited: false,
        })),
      );
      setTotal((value) => Math.max(0, value - 1));
      setMessage('Comentário excluído.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível excluir o comentário.');
    } finally {
      markBusy(comment.id, false);
    }
  };

  const reportComment = async (comment: WorkCommentDto) => {
    if (!isAuthenticated) {
      requireAuth('Entre na sua conta para denunciar.');
      return;
    }
    const reason = window.prompt('Motivo da denúncia (ex.: spam, ofensa, assédio):');
    if (!reason || reason.trim().length === 0) return;
    markBusy(comment.id, true);
    try {
      await workApi.reportComment(workId, comment.id, reason.trim());
      setMessage('Denúncia enviada para a moderação.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar a denúncia.');
    } finally {
      markBusy(comment.id, false);
    }
  };

  return {
    isAuthenticated,
    user,
    comments,
    body,
    setBody,
    page,
    total,
    hasMore,
    sort,
    setSort,
    loading,
    loadingMore,
    sending,
    error,
    message,
    replyingTo,
    setReplyingTo,
    replyBody,
    setReplyBody,
    editingId,
    setEditingId,
    editBody,
    setEditBody,
    busyIds,
    load,
    submit,
    submitReply,
    toggleLike,
    startEdit,
    saveEdit,
    removeComment,
    reportComment,
  };
}
