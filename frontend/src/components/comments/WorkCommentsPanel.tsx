import { ChevronDown, MessageSquare, Send } from 'lucide-react';
import { useWorkComments } from './useWorkComments';
import { CommentItem } from './CommentItem';

interface WorkCommentsPanelProps {
  workId: string;
  /** Quando presente, lista e publica apenas comentários deste capítulo. */
  chapterId?: string;
  /** Título opcional para o fim do capítulo. */
  heading?: string;
  /** Visitante: envia para login/cadastro e retorna para esta conversa. */
  onRequireAuth?: () => void;
}

export function WorkCommentsPanel({
  workId,
  chapterId,
  heading,
  onRequireAuth,
}: WorkCommentsPanelProps) {
  const {
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
  } = useWorkComments({ workId, chapterId, onRequireAuth });

  return (
    <section
      id={chapterId ? 'chapter-comments' : 'work-comments'}
      className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-5 sm:p-6 space-y-4 scroll-mt-24"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-pixel text-[12px] text-[var(--mn-yellow)] tracking-wider uppercase block font-bold flex items-center gap-2">
          <MessageSquare size={14} /> {heading ?? 'COMENTÁRIOS'} ({total})
        </span>
        <button
          type="button"
          onClick={() => setSort((value) => (value === 'top' ? 'new' : 'top'))}
          className="font-pixel text-[10px] uppercase text-[var(--mn-mute)] border-2 border-[var(--mn-line)] px-2 py-1 hover:border-[var(--mn-yellow)]"
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
            className="w-full bg-[var(--mn-ink)] border-2 border-[var(--mn-line)] px-3 py-2 font-body text-sm text-[var(--mn-paper)] placeholder:text-[var(--mn-mute)] focus:border-[var(--mn-yellow)] focus:outline-none"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="font-pixel text-[11px] text-[var(--mn-mute)] uppercase">
              como @{user.username || 'sem-username'}
            </span>
            <button
              type="submit"
              disabled={sending || body.trim().length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 font-pixel text-[11px] uppercase bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-paper)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={13} /> {sending ? 'ENVIANDO...' : 'COMENTAR'}
            </button>
          </div>
        </form>
      ) : (
        <div className="border-2 border-dashed border-[var(--mn-line)] bg-[var(--mn-ink)] p-4 space-y-3">
          <p className="font-display text-base text-[var(--mn-paper)] uppercase">
            Entre para comentar neste capítulo
          </p>
          <p className="font-body text-xs text-[var(--mn-mute)] leading-relaxed">
            Você será levado para o login ou cadastro e volta direto para esta conversa. O username
            aparece no comentário; os dados do perfil só ficam visíveis se você mantiver o perfil público.
          </p>
          <button
            type="button"
            onClick={onRequireAuth}
            className="inline-flex items-center gap-2 px-4 py-2 font-pixel text-[11px] uppercase bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-paper)]"
          >
            <Send size={13} /> ENTRAR E COMENTAR
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="font-body text-xs text-[var(--mn-red)]">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="font-pixel text-[11px] uppercase text-[var(--mn-teal)]">
          {message}
        </p>
      )}

      {loading ? (
        <p className="font-pixel text-[11px] text-[var(--mn-mute)] uppercase">Carregando comentários...</p>
      ) : (
        <ul className="space-y-3">
          {comments.length === 0 && (
            <li className="font-pixel text-[11px] text-[var(--mn-mute)] uppercase">
              Nenhum comentário ainda. Seja o primeiro.
            </li>
          )}
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUsername={user.username}
              editingId={editingId}
              editBody={editBody}
              setEditBody={setEditBody}
              startEdit={startEdit}
              cancelEdit={() => {
                setEditingId(null);
                setEditBody('');
              }}
              saveEdit={saveEdit}
              toggleLike={toggleLike}
              deleteComment={removeComment}
              reportComment={reportComment}
              startReply={(id) => {
                setReplyingTo(id);
                setReplyBody('');
              }}
              replyingTo={replyingTo}
              replyBody={replyBody}
              setReplyBody={setReplyBody}
              cancelReply={() => {
                setReplyingTo(null);
                setReplyBody('');
              }}
              submitReply={submitReply}
              busyIds={busyIds}
              sending={sending}
            />
          ))}
        </ul>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={() => load(page + 1, true)}
          disabled={loadingMore}
          className="inline-flex items-center gap-2 px-4 py-2 font-pixel text-[10px] uppercase text-[var(--mn-paper)] border-2 border-[var(--mn-line)] hover:border-[var(--mn-yellow)] disabled:opacity-50"
        >
          <ChevronDown size={12} /> {loadingMore ? 'CARREGANDO...' : 'CARREGAR MAIS'}
        </button>
      )}
    </section>
  );
}
