import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../../ui/Button';

interface NovelPublishStepProps {
  busy: boolean;
  isEditing: boolean;
  isScheduled: boolean;
  scheduledDate: () => Date;
  onPublish: () => void;
  canPublish: boolean;
}

export function NovelPublishStep({
  busy,
  isEditing,
  isScheduled,
  scheduledDate,
  onPublish,
  canPublish,
}: NovelPublishStepProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-2 border-[var(--mn-yellow)] bg-[var(--mn-yellow)]/10 flex items-center justify-center text-[var(--mn-yellow)]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display text-lg text-[var(--mn-paper)] uppercase">
              {isEditing ? 'SALVAR ATUALIZAÇÕES DO CAPÍTULO' : 'TUDO PRONTO PARA PUBLICAR'}
            </h3>
            <p className="text-xs font-mono text-[var(--mn-mute)]">
              {isEditing
                ? 'Os comentários, curtidas e visualizações acumuladas deste capítulo serão preservados intactos.'
                : 'Seus seguidores receberão notificação na central interna assim que o capítulo for liberado.'}
            </p>
          </div>
        </div>

        <div className="border-t border-[var(--mn-line)] pt-4 text-xs font-mono text-[var(--mn-mute)] space-y-2">
          <p className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--mn-green)] shrink-0" />
            <span>Documento de blocos formatado e sanitizado pelo servidor</span>
          </p>
          <p className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--mn-green)] shrink-0" />
            <span>Validação de caracteres e ilustrações autorizadas</span>
          </p>
          <p className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--mn-green)] shrink-0" />
            <span>
              {isScheduled
                ? `Disponível para leitura pública a partir de ${scheduledDate().toLocaleString('pt-BR')}`
                : 'Disponível para leitura imediatamente'}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          variant="primary"
          onClick={onPublish}
          disabled={busy || !canPublish}
          className="!text-lg !px-8 inline-flex items-center gap-2"
        >
          {busy ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>SALVANDO NO SERVIDOR...</span>
            </>
          ) : isEditing ? (
            'SALVAR ALTERAÇÕES'
          ) : isScheduled ? (
            'AGENDAR LANÇAMENTO'
          ) : (
            'PUBLICAR AGORA'
          )}
        </Button>
      </div>

      {!canPublish && (
        <div className="p-3 bg-[var(--mn-red)]/10 border border-[var(--mn-red)] text-xs font-mono text-[var(--mn-red)] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Existem pendências editoriais ou de título. Volte às etapas anteriores para corrigir antes de publicar.</span>
        </div>
      )}
    </div>
  );
}
