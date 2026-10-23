import { useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  Flag,
  Heart,
  MessageSquare,
  Pencil,
  Send,
  Star,
  Trash2,
} from 'lucide-react';
import { workApi, WorkCommentDto } from '../../api/workApi';
import { useAuth } from '../../context/AuthContext';

interface WorkCommentsPanelProps {
  workId: string;
  /** Quando presente, lista e publica apenas comentários deste capítulo. */
  chapterId?: string;
  /** Título opcional para o fim do capítulo. */
  heading?: string;
  /** Visitante: envia para login/cadastro e retorna para esta conversa. */
  onRequireAuth?: () => void;
}

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

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Comentários da obra ou do capítulo.
 *
 * A privacidade é decidida no servidor: username sempre aparece; nome/avatar só
 * para perfil público. O selo amarelo é assinatura ativa do criador da obra,
 * confirmada pelo backend, e não um VIP genérico.
 */
export function WorkCommentsPanel({ workId, chapterId, heading, onRequireAuth }: WorkCommentsPanelProps) {
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

  const requireAuth = (message: string) => {
    if (onRequireAuth) {
      onRequireAuth();
      return;
    }
    setError(message);
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

  const renderComment = (comment: WorkCommentDto, isReply = false) => (
    <li
      key={comment.id}
      className={`border-2 border-[#2A2C33] bg-[#101114] p-3 space-y-2 ${
        isReply ? 'ml-4 sm:ml-6 border-l-4 border-l-[#45A29E]' : ''
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {comment.profilePublic && comment.avatarUrl && (
          <img src={comment.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
        )}
        <span className="font-pixel text-[11px] text-[#FFD400] uppercase">@{comment.username}</span>
        {comment.subscriber && (
          <span
            title="Assinante ativo deste criador"
            className="inline-flex items-center gap-1 font-pixel text-[10px] uppercase text-[#FFD400]"
          >
            <Star size={11} className="fill-[#FFD400]" aria-hidden="true" /> membro
          </span>
        )}
        {comment.isCreator && (
          <span className="font-pixel text-[10px] uppercase text-[#45A29E] border border-[#45A29E] px-1">
            escritor
          </span>
        )}
        {!comment.profilePublic && (
          <span className="font-pixel text-[10px] uppercase text-[#6B6B6B]">perfil privado</span>
        )}
        <span className="ml-auto font-pixel text-[10px] text-[#6B6B6B] uppercase">
          {formatDate(comment.createdAt)}
          {comment.edited && !comment.deleted ? ' · editado' : ''}
        </span>
      </div>

      {editingId === comment.id ? (
        <div className="space-y-2">
          <textarea
            value={editBody}
            onChange={(event) => setEditBody(event.target.value)}
            maxLength={1000}
            rows={3}
            className="w-full bg-[#0B0B0C] border-2 border-[#34343A] px-3 py-2 font-body text-sm text-[#F4EFE3] focus:border-[#FFD400] focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => saveEdit(comment.id)}
              disabled={editBody.trim().length === 0 || busyIds.has(comment.id)}
              className="px-3 py-1.5 font-pixel text-[10px] uppercase bg-[#FFD400] text-[#0B0B0C] border-2 border-[#0B0B0C] disabled:opacity-50"
            >
              SALVAR
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setEditBody('');
              }}
              className="px-3 py-1.5 font-pixel text-[10px] uppercase text-[#A9A59A] border-2 border-[#34343A]"
            >
              CANCELAR
            </button>
          </div>
        </div>
      ) : (
        <p
          className={`font-body text-sm whitespace-pre-wrap break-words ${
            comment.deleted ? 'italic text-[#6B6B6B]' : 'text-[#F4EFE3]'
          }`}
        >
          {comment.body}
        </p>
      )}

      {!comment.deleted && (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => toggleLike(comment)}
            disabled={busyIds.has(comment.id)}
            aria-pressed={comment.likedByMe}
            className={`inline-flex items-center gap-1 font-pixel text-[10px] uppercase disabled:opacity-50 ${
              comment.likedByMe ? 'text-[#FF4D6D]' : 'text-[#A9A59A] hover:text-[#FF4D6D]'
            }`}
          >
            <Heart size={12} className={comment.likedByMe ? 'fill-current' : ''} />
            {comment.likesCount}
          </button>

          {!isReply && (
            <button
              type="button"
              onClick={() => {
                setReplyingTo(replyingTo === comment.id ? null : comment.id);
                setReplyBody('');
                setError(null);
              }}
              className="inline-flex items-center gap-1 font-pixel text-[10px] uppercase text-[#A9A59A] hover:text-[#FFD400]"
            >
              <MessageSquare size={12} /> RESPONDER
            </button>
          )}

          {comment.mine && (
            <button
              type="button"
              onClick={() => startEdit(comment)}
              className="inline-flex items-center gap-1 font-pixel text-[10px] uppercase text-[#A9A59A] hover:text-[#FFD400]"
            >
              <Pencil size={12} /> EDITAR
            </button>
          )}
          {comment.mine && (
            <button
              type="button"
              onClick={() => removeComment(comment)}
              disabled={busyIds.has(comment.id)}
              className="inline-flex items-center gap-1 font-pixel text-[10px] uppercase text-[#A9A59A] hover:text-[#E8402F] disabled:opacity-50"
            >
              <Trash2 size={12} /> EXCLUIR
            </button>
          )}
          {!comment.mine && (
            <button
              type="button"
              onClick={() => reportComment(comment)}
              disabled={busyIds.has(comment.id)}
              className="inline-flex items-center gap-1 font-pixel text-[10px] uppercase text-[#6B6B6B] hover:text-[#E8402F] disabled:opacity-50"
            >
              <Flag size={12} /> DENUNCIAR
            </button>
          )}
        </div>
      )}

      {replyingTo === comment.id && (
        <div className="space-y-2 border-t border-[#2A2C33] pt-2">
          <textarea
            value={replyBody}
            onChange={(event) => setReplyBody(event.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Responder neste capítulo..."
            className="w-full bg-[#0B0B0C] border-2 border-[#34343A] px-3 py-2 font-body text-sm text-[#F4EFE3] placeholder:text-[#6B6B6B] focus:border-[#FFD400] focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => submitReply(comment.id)}
              disabled={replyBody.trim().length === 0 || busyIds.has(comment.id)}
              className="px-3 py-1.5 font-pixel text-[10px] uppercase bg-[#FFD400] text-[#0B0B0C] border-2 border-[#0B0B0C] disabled:opacity-50"
            >
              ENVIAR RESPOSTA
            </button>
            <button
              type="button"
              onClick={() => {
                setReplyingTo(null);
                setReplyBody('');
              }}
              className="px-3 py-1.5 font-pixel text-[10px] uppercase text-[#A9A59A] border-2 border-[#34343A]"
            >
              CANCELAR
            </button>
          </div>
        </div>
      )}

      {comment.replies.length > 0 && (
        <ul className="space-y-2 pt-1">{comment.replies.map((reply) => renderComment(reply, true))}</ul>
      )}
      {comment.replyCount > comment.replies.length && !comment.deleted && (
        <p className="font-pixel text-[10px] text-[#6B6B6B] uppercase">
          {comment.replyCount - comment.replies.length} resposta(s) antiga(s)
        </p>
      )}
    </li>
  );

  return (
    <section
      id={chapterId ? 'chapter-comments' : 'work-comments'}
      className="border-2 border-[#34343A] bg-[#151517] p-5 sm:p-6 space-y-4 scroll-mt-24"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-pixel text-[12px] text-[#FFD400] tracking-wider uppercase block font-bold flex items-center gap-2">
          <MessageSquare size={14} /> {heading ?? 'COMENTÁRIOS'} ({total})
        </span>
        <button
          type="button"
          onClick={() => setSort((value) => (value === 'top' ? 'new' : 'top'))}
          className="font-pixel text-[10px] uppercase text-[#A9A59A] border-2 border-[#34343A] px-2 py-1 hover:border-[#FFD400]"
        >
          {sort === 'top' ? 'MAIS CURTIDOS' : 'MAIS RECENTES'}
        </button>
      </div>

      {isAuthenticated ? (
        <form onSubmit={submit} className="space-y-3">
          <label htmlFor={`comment-body-${chapterId ?? 'work'}`} className="sr-only">
            Escreva um comentário
          </label>
          <textarea
            id={`comment-body-${chapterId ?? 'work'}`}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder={
              user.profilePublic === false
                ? 'Seu perfil está privado: o comentário mostra só o seu @username.'
                : 'Deixe um recado para o autor e para os leitores.'
            }
            className="w-full bg-[#0B0B0C] border-2 border-[#34343A] px-3 py-2 font-body text-sm text-[#F4EFE3] placeholder:text-[#6B6B6B] focus:border-[#FFD400] focus:outline-none"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="font-pixel text-[11px] text-[#A9A59A] uppercase">
              como @{user.username || 'sem-username'}
            </span>
            <button
              type="submit"
              disabled={sending || body.trim().length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 font-pixel text-[11px] uppercase bg-[#FFD400] text-[#0B0B0C] border-2 border-[#0B0B0C] shadow-[3px_3px_0_#F4EFE3] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={13} /> {sending ? 'ENVIANDO...' : 'COMENTAR'}
            </button>
          </div>
        </form>
      ) : (
        <div className="border-2 border-dashed border-[#45464F] bg-[#0B0B0C] p-4 space-y-3">
          <p className="font-display text-base text-[#F4EFE3] uppercase">
            Entre para comentar neste capítulo
          </p>
          <p className="font-body text-xs text-[#A9A59A] leading-relaxed">
            Você será levado para o login ou cadastro e volta direto para esta conversa. O username
            aparece no comentário; os dados do perfil só ficam visíveis se você mantiver o perfil público.
          </p>
          <button
            type="button"
            onClick={() => requireAuth('Entre na sua conta para comentar.')}
            className="inline-flex items-center gap-2 px-4 py-2 font-pixel text-[11px] uppercase bg-[#FFD400] text-[#0B0B0C] border-2 border-[#0B0B0C] shadow-[3px_3px_0_#F4EFE3]"
          >
            <Send size={13} /> ENTRAR E COMENTAR
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="font-body text-xs text-[#E8402F]">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="font-pixel text-[11px] uppercase text-[#45A29E]">
          {message}
        </p>
      )}

      {loading ? (
        <p className="font-pixel text-[11px] text-[#A9A59A] uppercase">Carregando comentários...</p>
      ) : (
        <ul className="space-y-3">
          {comments.length === 0 && (
            <li className="font-pixel text-[11px] text-[#A9A59A] uppercase">
              Nenhum comentário ainda. Seja o primeiro.
            </li>
          )}
          {comments.map((comment) => renderComment(comment))}
        </ul>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={() => load(page + 1, true)}
          disabled={loadingMore}
          className="inline-flex items-center gap-2 px-4 py-2 font-pixel text-[10px] uppercase text-[#F4EFE3] border-2 border-[#34343A] hover:border-[#FFD400] disabled:opacity-50"
        >
          <ChevronDown size={12} /> {loadingMore ? 'CARREGANDO...' : 'CARREGAR MAIS'}
        </button>
      )}
    </section>
  );
}
