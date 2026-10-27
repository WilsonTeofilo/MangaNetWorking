import { Flag, Heart, MessageSquare, Pencil, Star, Trash2 } from 'lucide-react';
import { WorkCommentDto } from '../../api/workApi';
import { CommentReplyForm } from './CommentReplyForm';

interface CommentItemProps {
  comment: WorkCommentDto;
  isReply?: boolean;
  currentUsername?: string;
  editingId: string | null;
  editBody: string;
  setEditBody: (body: string) => void;
  startEdit: (comment: WorkCommentDto) => void;
  cancelEdit: () => void;
  saveEdit: (commentId: string) => void;
  toggleLike: (comment: WorkCommentDto) => void;
  deleteComment: (comment: WorkCommentDto) => void;
  reportComment: (comment: WorkCommentDto) => void;
  startReply: (commentId: string) => void;
  replyingTo: string | null;
  replyBody: string;
  setReplyBody: (body: string) => void;
  cancelReply: () => void;
  submitReply: (parentId: string) => void;
  busyIds: Set<string>;
  sending: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function CommentItem({
  comment,
  isReply = false,
  currentUsername,
  editingId,
  editBody,
  setEditBody,
  startEdit,
  cancelEdit,
  saveEdit,
  toggleLike,
  deleteComment,
  reportComment,
  startReply,
  replyingTo,
  replyBody,
  setReplyBody,
  cancelReply,
  submitReply,
  busyIds,
  sending,
}: CommentItemProps) {
  const isAuthor = Boolean(currentUsername && currentUsername === comment.username);

  return (
    <li
      className={`border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-3 space-y-2 ${
        isReply ? 'ml-4 sm:ml-6 border-l-4 border-l-[var(--mn-teal)]' : ''
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {comment.profilePublic && comment.avatarUrl && (
          <img src={comment.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
        )}
        <span className="font-pixel text-[11px] text-[var(--mn-yellow)] uppercase">
          @{comment.username}
        </span>
        {comment.subscriber && (
          <span
            title="Assinante ativo deste criador"
            className="inline-flex items-center gap-1 font-pixel text-[10px] uppercase text-[var(--mn-yellow)]"
          >
            <Star size={11} className="fill-[var(--mn-yellow)]" aria-hidden="true" /> membro
          </span>
        )}
        {comment.isCreator && (
          <span className="font-pixel text-[10px] uppercase text-[var(--mn-teal)] border border-[var(--mn-teal)] px-1">
            escritor
          </span>
        )}
        {!comment.profilePublic && (
          <span className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">perfil privado</span>
        )}
        <span className="ml-auto font-pixel text-[10px] text-[var(--mn-mute)] uppercase">
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
            className="w-full bg-[var(--mn-ink)] border-2 border-[var(--mn-line)] px-3 py-2 font-body text-sm text-[var(--mn-paper)] focus:border-[var(--mn-yellow)] focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => saveEdit(comment.id)}
              disabled={editBody.trim().length === 0 || busyIds.has(comment.id)}
              className="px-3 py-1.5 font-pixel text-[10px] uppercase bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] disabled:opacity-50"
            >
              SALVAR
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="px-3 py-1.5 font-pixel text-[10px] uppercase text-[var(--mn-mute)] border-2 border-[var(--mn-line)]"
            >
              CANCELAR
            </button>
          </div>
        </div>
      ) : (
        <p
          className={`font-body text-sm whitespace-pre-wrap break-words ${
            comment.deleted ? 'italic text-[var(--mn-mute)]' : 'text-[var(--mn-paper)]'
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
              comment.likedByMe ? 'text-[var(--mn-red)]' : 'text-[var(--mn-mute)] hover:text-[var(--mn-red)]'
            }`}
          >
            <Heart size={12} className={comment.likedByMe ? 'fill-current' : ''} />
            {comment.likesCount}
          </button>

          {!isReply && (
            <button
              type="button"
              onClick={() => startReply(comment.id)}
              className="inline-flex items-center gap-1 font-pixel text-[10px] uppercase text-[var(--mn-mute)] hover:text-[var(--mn-paper)]"
            >
              <MessageSquare size={12} /> Responder
            </button>
          )}

          {isAuthor && (
            <>
              <button
                type="button"
                onClick={() => startEdit(comment)}
                disabled={busyIds.has(comment.id)}
                className="inline-flex items-center gap-1 font-pixel text-[10px] uppercase text-[var(--mn-mute)] hover:text-[var(--mn-paper)] disabled:opacity-50"
              >
                <Pencil size={12} /> Editar
              </button>
              <button
                type="button"
                onClick={() => deleteComment(comment)}
                disabled={busyIds.has(comment.id)}
                className="inline-flex items-center gap-1 font-pixel text-[10px] uppercase text-[var(--mn-red)] hover:opacity-80 disabled:opacity-50"
              >
                <Trash2 size={12} /> Excluir
              </button>
            </>
          )}

          {!isAuthor && (
            <button
              type="button"
              onClick={() => reportComment(comment)}
              disabled={busyIds.has(comment.id)}
              className="ml-auto inline-flex items-center gap-1 font-pixel text-[10px] uppercase text-[var(--mn-mute)] hover:text-[var(--mn-red)] disabled:opacity-50"
            >
              <Flag size={12} /> Denunciar
            </button>
          )}
        </div>
      )}

      {replyingTo === comment.id && (
        <CommentReplyForm
          replyBody={replyBody}
          setReplyBody={setReplyBody}
          targetUsername={comment.username}
          onCancel={cancelReply}
          onSubmit={() => submitReply(comment.id)}
          disabled={sending}
        />
      )}

      {comment.replies && comment.replies.length > 0 && (
        <ul className="space-y-2 mt-2 pt-2 border-t border-[var(--mn-line)]">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              isReply
              currentUsername={currentUsername}
              editingId={editingId}
              editBody={editBody}
              setEditBody={setEditBody}
              startEdit={startEdit}
              cancelEdit={cancelEdit}
              saveEdit={saveEdit}
              toggleLike={toggleLike}
              deleteComment={deleteComment}
              reportComment={reportComment}
              startReply={startReply}
              replyingTo={replyingTo}
              replyBody={replyBody}
              setReplyBody={setReplyBody}
              cancelReply={cancelReply}
              submitReply={submitReply}
              busyIds={busyIds}
              sending={sending}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
