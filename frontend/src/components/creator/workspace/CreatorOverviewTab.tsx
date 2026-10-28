import { useEffect, useState } from 'react';
import { BookOpen, DollarSign, Users, Award, Plus, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Cover } from '../../ui/Cover';
import { FormatBadge } from '../../ui/FormatBadge';
import { workApi, CreatorWorkSummaryDto } from '../../../api/workApi';
import { WorkspaceTab } from './CreatorKpiHeader';

export interface CreatorOverviewTabProps {
  walletBalanceBrl: number;
  totalDonationsBrl: number;
  monthlyMembersCount: number;
  onNavigateTab: (tab: WorkspaceTab) => void;
  onOpenDeclarationModal: () => void;
}

function formatBrl(value: number): string {
  if (!Number.isFinite(value)) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function CreatorOverviewTab({
  walletBalanceBrl,
  totalDonationsBrl,
  monthlyMembersCount,
  onNavigateTab,
  onOpenDeclarationModal,
}: CreatorOverviewTabProps) {
  const [works, setWorks] = useState<CreatorWorkSummaryDto[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(true);

  useEffect(() => {
    let active = true;
    workApi
      .listMyWorks()
      .then((data) => {
        if (active) setWorks(data || []);
      })
      .catch(() => {
        if (active) setWorks([]);
      })
      .finally(() => {
        if (active) setLoadingWorks(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const totalViews = works.reduce((sum, w) => sum + (w.totalViews || 0), 0);

  return (
    <div className="space-y-8 select-none">
      {/* 1. Métricas Principais em Cards Sóbrios */}
      <section aria-labelledby="overview-kpis-title">
        <h2 id="overview-kpis-title" className="sr-only">
          Métricas Principais
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Saldo Disponível */}
          <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-5 space-y-2">
            <div className="flex items-center justify-between text-[var(--mn-mute)]">
              <span className="font-pixel text-[11px] uppercase tracking-wider">
                SALDO DISPONÍVEL
              </span>
              <DollarSign size={16} className="text-[var(--mn-yellow)]" />
            </div>
            <p className="font-body text-2xl sm:text-3xl font-bold text-[var(--mn-paper)] tabular-nums">
              {formatBrl(walletBalanceBrl)}
            </p>
            <p className="font-body text-xs text-[var(--mn-mute)]">
              Doações totais acumuladas: <strong className="text-[var(--mn-paper)]">{formatBrl(totalDonationsBrl)}</strong>
            </p>
          </div>

          {/* Card 2: Membros Mensais */}
          <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-5 space-y-2">
            <div className="flex items-center justify-between text-[var(--mn-mute)]">
              <span className="font-pixel text-[11px] uppercase tracking-wider">
                MEMBROS ATIVOS
              </span>
              <Award size={16} className="text-[var(--mn-yellow)]" />
            </div>
            <p className="font-body text-2xl sm:text-3xl font-bold text-[var(--mn-paper)] tabular-nums">
              {monthlyMembersCount}
            </p>
            <p className="font-body text-xs text-[var(--mn-mute)]">
              Assinantes com acesso antecipado a capítulos
            </p>
          </div>

          {/* Card 3: Leitores e Alcance */}
          <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-5 space-y-2 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-[var(--mn-mute)]">
              <span className="font-pixel text-[11px] uppercase tracking-wider">
                LEITURAS TOTAIS
              </span>
              <Users size={16} className="text-[var(--mn-yellow)]" />
            </div>
            <p className="font-body text-2xl sm:text-3xl font-bold text-[var(--mn-paper)] tabular-nums">
              {totalViews.toLocaleString('pt-BR')}
            </p>
            <p className="font-body text-xs text-[var(--mn-mute)]">
              Visualizações somadas em {works.length} {works.length === 1 ? 'obra' : 'obras'}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Rail de Obras Recentes */}
      <section aria-labelledby="recent-works-title" className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-[var(--mn-line)] pb-3">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-[var(--mn-yellow)]" />
            <h2
              id="recent-works-title"
              className="font-display text-lg sm:text-xl text-[var(--mn-paper)] uppercase tracking-wide"
            >
              OBRAS RECENTES
            </h2>
          </div>
          {works.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigateTab('works')}
              className="inline-flex items-center gap-1 font-pixel text-[11px] text-[var(--mn-yellow)] hover:underline uppercase"
            >
              <span>VER TODAS ({works.length})</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>

        {loadingWorks ? (
          <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-8 text-center">
            <span className="font-pixel text-xs text-[var(--mn-mute)]">
              CARREGANDO CATÁLOGO DO AUTOR…
            </span>
          </div>
        ) : works.length === 0 ? (
          <div className="border-2 border-dashed border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-8 text-center space-y-3">
            <p className="font-display text-base text-[var(--mn-paper)] uppercase">
              NENHUMA OBRA CADASTRADA AINDA
            </p>
            <p className="font-body text-xs text-[var(--mn-mute)] max-w-md mx-auto">
              Sua bancada está vazia. Publique seu primeiro mangá ou light novel para começar a receber visualizações e apoio de membros.
            </p>
            <Button
              type="button"
              variant="primary"
              onClick={() => onNavigateTab('works')}
              className="!px-5 !py-2.5 mt-2"
            >
              + PUBLICAR PRIMEIRA OBRA
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {works.slice(0, 4).map((work) => (
              <div
                key={work.id}
                className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-3 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="relative">
                    <Cover
                      src={work.coverUrl || undefined}
                      title={work.title}
                      aspectRatio="2/3"
                      dropShadow={false}
                    />
                    <div className="absolute top-2 left-2">
                      <FormatBadge format={work.format} size="sm" />
                    </div>
                  </div>

                  <h3 className="font-display text-sm sm:text-base text-[var(--mn-paper)] uppercase line-clamp-1">
                    {work.title}
                  </h3>

                  <div className="flex items-center justify-between font-body text-xs text-[var(--mn-mute)]">
                    <span>{work.totalChapters || 0} capítulos</span>
                    <span className="border border-[var(--mn-line)] px-1.5 py-0.5 text-[10px] font-pixel text-[var(--mn-paper)]">
                      {work.status === 'completed' ? 'CONCLUÍDO' : 'EM ANDAMENTO'}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onNavigateTab('works')}
                  className="w-full !py-1.5 text-xs font-display tracking-wider"
                >
                  GERENCIAR
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Ações Rápidas & Conformidade */}
      <section aria-labelledby="quick-actions-title" className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-5 space-y-4">
        <h2 id="quick-actions-title" className="font-display text-sm sm:text-base text-[var(--mn-paper)] uppercase tracking-wide">
          AÇÕES RÁPIDAS DA BANCADA
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onNavigateTab('works')}
            className="inline-flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>NOVA OBRA / CAPÍTULO</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => onNavigateTab('missions')}
            className="inline-flex items-center gap-1.5"
          >
            <Award size={14} />
            <span>VER MISSÕES DA SEASON</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onOpenDeclarationModal}
            className="inline-flex items-center gap-1.5 text-[var(--mn-mute)] hover:text-[var(--mn-paper)]"
          >
            <ShieldCheck size={14} />
            <span>TERMOS DE AUTORIA (ART. 184 CP)</span>
          </Button>
        </div>
      </section>
    </div>
  );
}
