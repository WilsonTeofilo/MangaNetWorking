import { useEffect, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { workApi, WorkCommentDto } from '../../api/workApi';
import { useAuth } from '../../context/AuthContext';

/**
 * Comentários da obra.
 *
 * Regra de privacidade aplicada pelo servidor: o username do autor sempre aparece;
 * nome e avatar só aparecem quando o perfil do autor é público. Perfil privado continua
 * comentando, mas não expõe nada além do username.
 */
export function WorkCommentsPanel({ workId }: { workId: string }) {
  const { isAuthenticated, user } = useAuth();
  const [comments, setComments] = useState<WorkCommentDto[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    workApi
      .listComments(workId)
      .then(setComments)
      .catch(() => setError('Não foi possível carregar os comentários.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [workId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    if (text.length === 0) return;
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const created = await workApi.createComment(workId, text);
      setComments((current) => [created, ...current]);
      setBody('');
      setMessage('Comentário publicado.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível publicar o comentário.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="border-2 border-[#34343A] bg-[#151517] p-5 sm:p-6 space-y-4">
      <span className="font-pixel text-[12px] text-[#FFD400] tracking-wider uppercase block font-bold flex items-center gap-2">
        <MessageSquare size={14} /> COMENTÁRIOS ({comments.length})
      </span>

      {isAuthenticated ? (
        <form onSubmit={submit} className="space-y-3">
          <label htmlFor="comment-body" className="sr-only">Escreva um comentário</label>
          <textarea
            id="comment-body"
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
        <p className="font-body text-xs text-[#A9A59A]">
          Entre na sua conta para comentar. O username aparece no comentário; os dados do perfil só ficam
          visíveis se o autor mantiver o perfil público.
        </p>
      )}

      {error && <p role="alert" className="font-body text-xs text-[#E8402F]">{error}</p>}
      {message && <p role="status" className="font-pixel text-[11px] uppercase text-[#45A29E]">{message}</p>}

      {loading ? (
        <p className="font-pixel text-[11px] text-[#A9A59A] uppercase">Carregando comentários...</p>
      ) : (
        <ul className="space-y-3">
          {comments.length === 0 && (
            <li className="font-pixel text-[11px] text-[#A9A59A] uppercase">Nenhum comentário ainda.</li>
          )}
          {comments.map((comment) => (
            <li key={comment.id} className="border-2 border-[#2A2C33] bg-[#101114] p-3 space-y-1">
              <div className="flex items-center gap-2">
                {comment.profilePublic && comment.avatarUrl && (
                  <img src={comment.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                )}
                <span className="font-pixel text-[11px] text-[#FFD400] uppercase">@{comment.username}</span>
                {comment.isCreator && (
                  <span className="font-pixel text-[10px] uppercase text-[#45A29E] border border-[#45A29E] px-1">
                    escritor
                  </span>
                )}
                {!comment.profilePublic && (
                  <span className="font-pixel text-[10px] uppercase text-[#6B6B6B]">perfil privado</span>
                )}
              </div>
              <p className="font-body text-sm text-[#F4EFE3] whitespace-pre-wrap break-words">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
