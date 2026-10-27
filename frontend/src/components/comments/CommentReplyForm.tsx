import { Send } from 'lucide-react';

interface CommentReplyFormProps {
  replyBody: string;
  setReplyBody: (body: string) => void;
  targetUsername: string;
  onCancel: () => void;
  onSubmit: () => void;
  disabled: boolean;
}

export function CommentReplyForm({
  replyBody,
  setReplyBody,
  targetUsername,
  onCancel,
  onSubmit,
  disabled,
}: CommentReplyFormProps) {
  return (
    <div className="mt-2 space-y-2 border-l-2 border-[var(--mn-yellow)] pl-3">
      <textarea
        value={replyBody}
        onChange={(event) => setReplyBody(event.target.value)}
        maxLength={1000}
        rows={2}
        placeholder={`Respondendo a @${targetUsername}...`}
        className="w-full bg-[var(--mn-ink)] border-2 border-[var(--mn-line)] px-3 py-1.5 font-body text-xs text-[var(--mn-paper)] focus:border-[var(--mn-yellow)] focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={replyBody.trim().length === 0 || disabled}
          className="inline-flex items-center gap-1 px-3 py-1 font-pixel text-[10px] uppercase bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] disabled:opacity-50"
        >
          <Send size={11} /> RESPONDER
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 font-pixel text-[10px] uppercase text-[var(--mn-mute)] border-2 border-[var(--mn-line)]"
        >
          CANCELAR
        </button>
      </div>
    </div>
  );
}
