import React from 'react';
import { ArrowUpDown, Eye, Heart, Download, CheckCircle2, Loader2, Flag } from 'lucide-react';
import { Work, Chapter } from '../../types';
import { Sticker } from '../ui/Sticker';
import { useAuth } from '../../context/AuthContext';
import { useModals } from '../../context/ModalContext';
import { isChapterEarlyAccess } from '../../utils/discoveryAlgorithm';

export interface WorkChapterListProps {
  work: Work;
  chapters: Chapter[];
  chaptersError: boolean;
  sortOrder: 'asc' | 'desc';
  onToggleSortOrder: () => void;
  onChapterClick: (chapter: Chapter) => void;
  offlineChapterIds: Set<string>;
  downloadingChapterId: string | null;
  onDownloadOffline: (e: React.MouseEvent, chapter: Chapter) => void;
}

export function WorkChapterList({
  work,
  chapters,
  chaptersError,
  sortOrder,
  onToggleSortOrder,
  onChapterClick,
  offlineChapterIds,
  downloadingChapterId,
  onDownloadOffline,
}: WorkChapterListProps) {
  const { user, isMemberOf } = useAuth();
  const { openReport } = useModals();

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between border-b-2 border-[var(--mn-line)] pb-3">
        <h2 className="font-display text-2xl sm:text-3xl text-[var(--mn-paper)] uppercase tracking-wide">
          LISTA DE CAPÍTULOS
        </h2>

        <button
          type="button"
          onClick={onToggleSortOrder}
          className="flex items-center gap-1.5 font-pixel text-[12px] text-[var(--mn-yellow)] hover:underline"
        >
          <ArrowUpDown size={12} />
          <span>{sortOrder === 'asc' ? 'CRESCENTE' : 'DECRESCENTE'}</span>
        </button>
      </div>

      <div className="border-t-2 border-[var(--mn-line)]">
        {chaptersError && chapters.length === 0 && (
          <p className="py-6 font-body text-sm text-[var(--mn-mute)]">
            Não foi possível carregar os capítulos agora. Recarregue a página.
          </p>
        )}
        {chapters.map((chap) => {
          const isLocked = isChapterEarlyAccess(chap) && !isMemberOf(work.authorId);

          return (
            <div
              key={chap.id}
              onClick={() => onChapterClick(chap)}
              className="flex items-center justify-between p-3.5 border-b border-[var(--mn-line)] hover:bg-[var(--mn-ink-2)] cursor-pointer group transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="font-display text-2xl text-[var(--mn-yellow)] tracking-tight w-12 text-center shrink-0">
                  #{chap.number < 10 ? `0${chap.number}` : chap.number}
                </span>

                <div>
                  <h4 className="font-display text-lg text-[var(--mn-paper)] group-hover:text-[var(--mn-yellow)] transition-colors uppercase">
                    {chap.title}
                  </h4>
                  <p className="font-body text-xs text-[var(--mn-mute)] tabular-nums flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>{chap.format === 'PROSE' ? 'Light novel · prosa' : 'Mangá · páginas ilustradas'}</span>
                    <span className="inline-flex items-center gap-1" title="Visualizações do capítulo">
                      <Eye size={12} aria-hidden="true" />
                      {Number(chap.views ?? 0).toLocaleString('pt-BR')}
                    </span>
                    <span className="inline-flex items-center gap-1" title="Curtidas do capítulo">
                      <Heart size={12} aria-hidden="true" />
                      {Number(chap.likes ?? 0).toLocaleString('pt-BR')}
                    </span>
                  </p>
                  {chap.isEarlyAccess && (
                    <p className="font-pixel text-[12px] uppercase text-[var(--mn-ok)]">
                      {isLocked
                        ? `LANÇAMENTO EM ${new Date(chap.publicReleaseAt).toLocaleDateString('pt-BR')} · ANTECIPADO PARA MEMBROS`
                        : `LANÇAMENTO EM ${new Date(chap.publicReleaseAt).toLocaleDateString('pt-BR')}`}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Botão de Download / Indicador Offline VIP */}
                {chap.format !== 'PROSE' && (
                  <button
                    type="button"
                    onClick={(e) => onDownloadOffline(e, chap)}
                    title={
                      offlineChapterIds.has(chap.id)
                        ? 'Capítulo salvo para leitura offline (Clique para remover)'
                        : user?.isVip
                        ? 'Baixar capítulo para leitura offline'
                        : 'Recurso exclusivo para assinantes VIP MangaNetWorking'
                    }
                    className={`p-1.5 border transition-all flex items-center gap-1.5 font-pixel text-[12px] uppercase ${
                      offlineChapterIds.has(chap.id)
                        ? 'border-[var(--mn-ok)] bg-[var(--mn-ok)]/10 text-[var(--mn-ok)]'
                        : 'border-[var(--mn-line)] text-[var(--mn-mute)] hover:border-[var(--mn-yellow)] hover:text-[var(--mn-yellow)]'
                    }`}
                  >
                    {downloadingChapterId === chap.id ? (
                      <Loader2 size={13} className="animate-spin text-[var(--mn-yellow)]" />
                    ) : offlineChapterIds.has(chap.id) ? (
                      <>
                        <CheckCircle2 size={13} />
                        <span className="hidden sm:inline">OFFLINE</span>
                      </>
                    ) : (
                      <>
                        <Download size={13} />
                        <span className="hidden sm:inline">BAIXAR</span>
                      </>
                    )}
                  </button>
                )}

                {isLocked ? (
                  <Sticker kind="members" />
                ) : (
                  <span className="font-pixel text-[12px] text-[var(--mn-mute)] group-hover:text-[var(--mn-yellow)]">
                    LER →
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Botão de Denúncia Discreto */}
      <div className="pt-4 flex justify-end">
        <button
          type="button"
          onClick={() => openReport(work.id, work.title)}
          className="inline-flex items-center gap-1.5 font-body text-xs text-[var(--mn-mute)] hover:text-[var(--mn-red)] transition-colors"
        >
          <Flag size={13} />
          <span>DENUNCIAR ESTA OBRA</span>
        </button>
      </div>
    </section>
  );
}
