import { AlertTriangle, Check, Eye } from 'lucide-react';
import { Button } from '../../ui/Button';
import {
  ChapterType,
  PROSE_EDITORIAL_POLICY,
  ValidationResult,
} from '../../../utils/proseEditorialPolicy';
import { CHAPTER_TYPE_LABEL, EditorBlock } from './novelEditorTypes';

interface NovelReviewStepProps {
  chapterTitle: string;
  chapterType: ChapterType;
  totalChars: number;
  illustrationCount: number;
  textBlockCount: number;
  blocks: EditorBlock[];
  editorial: ValidationResult;
  structureErrors: string[];
  isScheduled: boolean;
  scheduledDate: () => Date;
  onOpenPreview: () => void;
}

export function NovelReviewStep({
  chapterTitle,
  chapterType,
  totalChars,
  illustrationCount,
  textBlockCount,
  blocks,
  editorial,
  structureErrors,
  isScheduled,
  scheduledDate,
  onOpenPreview,
}: NovelReviewStepProps) {
  const minChars = chapterType === 'REGULAR' ? PROSE_EDITORIAL_POLICY.minimum : PROSE_EDITORIAL_POLICY.specialMinimum;
  const targetMin = PROSE_EDITORIAL_POLICY.recommendedMinimum;
  const targetMax = PROSE_EDITORIAL_POLICY.recommendedMaximum;
  const maxChars = PROSE_EDITORIAL_POLICY.maximum;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* 1. Sumário do Capítulo */}
      <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] p-5 space-y-4">
        <h3 className="font-display text-lg text-[var(--mn-paper)] uppercase">
          SUMÁRIO DO CAPÍTULO
        </h3>

        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <span className="text-[var(--mn-mute)] block">TÍTULO:</span>
            <span className="font-bold text-[var(--mn-paper)] text-sm">{chapterTitle}</span>
          </div>
          <div>
            <span className="text-[var(--mn-mute)] block">TIPO:</span>
            <span className="font-bold text-[var(--mn-yellow)]">{CHAPTER_TYPE_LABEL[chapterType]}</span>
          </div>
          <div>
            <span className="text-[var(--mn-mute)] block">CARACTERES VISÍVEIS:</span>
            <span className="font-bold text-[var(--mn-paper)] tabular-nums">
              {totalChars.toLocaleString()}
            </span>{' '}
            <span className="text-[var(--mn-mute)]">({targetMin}-{targetMax} recomendados)</span>
          </div>
          <div>
            <span className="text-[var(--mn-mute)] block">ILUSTRAÇÕES:</span>
            <span className="font-bold text-[var(--mn-paper)]">{illustrationCount} de 6</span>
          </div>
          <div>
            <span className="text-[var(--mn-mute)] block">PARÁGRAFOS / BLOCOS:</span>
            <span className="text-[var(--mn-paper)]">
              {textBlockCount} textos, {blocks.length} blocos total
            </span>
          </div>
          <div>
            <span className="text-[var(--mn-mute)] block">LANÇAMENTO:</span>
            <span className="text-[var(--mn-paper)]">
              {isScheduled
                ? `Agendado para ${scheduledDate().toLocaleString('pt-BR')}`
                : 'Imediato (ao clicar em publicar)'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Checklist da Política Editorial */}
      <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] p-5 space-y-3">
        <h3 className="font-display text-base text-[var(--mn-paper)] uppercase">
          CONFORMIDADE COM A POLÍTICA EDITORIAL
        </h3>

        <ul className="space-y-2 text-xs font-mono">
          <li className="flex items-center gap-2">
            {totalChars >= minChars && totalChars <= maxChars ? (
              <Check className="w-4 h-4 text-[var(--mn-green)] shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[var(--mn-red)] shrink-0" />
            )}
            <span>
              Mínimo técnico de {minChars} caracteres (atual: {totalChars.toLocaleString()})
            </span>
          </li>
          <li className="flex items-center gap-2">
            {illustrationCount <= 6 ? (
              <Check className="w-4 h-4 text-[var(--mn-green)] shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[var(--mn-red)] shrink-0" />
            )}
            <span>Limite de até 6 ilustrações por capítulo (atual: {illustrationCount})</span>
          </li>
          <li className="flex items-center gap-2">
            {structureErrors.length === 0 ? (
              <Check className="w-4 h-4 text-[var(--mn-green)] shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[var(--mn-red)] shrink-0" />
            )}
            <span>Todas as ilustrações enviadas com sucesso para o storage</span>
          </li>
        </ul>

        {!editorial.valid && editorial.errors.length > 0 && (
          <div className="mt-3 p-3 bg-[var(--mn-red)]/10 border border-[var(--mn-red)] text-xs font-mono text-[var(--mn-red)] space-y-1">
            {editorial.errors.map((err: string, idx: number) => (
              <p key={idx}>• {err}</p>
            ))}
          </div>
        )}
      </div>

      {/* 3. Botão de Prévia Fiel */}
      <div className="p-4 border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] flex items-center justify-between">
        <div>
          <h4 className="font-display text-sm text-[var(--mn-paper)] uppercase">PRÉVIA DO LEITOR</h4>
          <p className="text-xs font-mono text-[var(--mn-mute)]">
            Veja exatamente como os leitores visualizarão o texto e as imagens em scroll contínuo.
          </p>
        </div>
        <Button variant="ghost" onClick={onOpenPreview} className="inline-flex items-center gap-1.5">
          <Eye className="w-4 h-4" /> ABRIR PRÉVIA
        </Button>
      </div>
    </div>
  );
}
