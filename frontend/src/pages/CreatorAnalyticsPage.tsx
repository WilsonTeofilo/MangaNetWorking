import {
  BarChart3,
  ChevronDown,
  Download,
  Eye,
  MousePointerClick,
  RefreshCw,
  Target,
  Users,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Win } from '../components/ui/Win';
import {
  brl,
  dateLabel,
  dateTimeLabel,
  DISCOVERY_INSTRUMENTED_AT,
  MIN_SAMPLE,
  number,
  percent,
} from '../components/analytics/analyticsFormatters';
import { CreatorAudienceHeatmap } from '../components/analytics/CreatorAudienceHeatmap';
import { CreatorContentTable } from '../components/analytics/CreatorContentTable';
import { CreatorDailyChart } from '../components/analytics/CreatorDailyChart';
import { CreatorDetailedWorksList } from '../components/analytics/CreatorDetailedWorksList';
import { CreatorFunnelPanel } from '../components/analytics/CreatorFunnelPanel';
import { CreatorRealtimeSidebar } from '../components/analytics/CreatorRealtimeSidebar';
import { CreatorRetentionCurve } from '../components/analytics/CreatorRetentionCurve';
import { FinanceRow, StatCard } from '../components/analytics/StatCard';
import { PERIODS, useCreatorAnalyticsData } from '../components/analytics/useCreatorAnalyticsData';

/**
 * Análises do canal do criador — no espírito do Studio (visão geral do conteúdo,
 * recorte por obra/capítulo, período selecionável, tempo real e comparação), com a
 * identidade visual "Banca de Rua".
 *
 * Nenhum número é inventado: tudo vem de `GET /api/creators/analytics`. Métrica sem
 * instrumentação aparece como indisponível (`—`), nunca como zero.
 */
export function CreatorAnalyticsPage() {
  const {
    data,
    loading,
    error,
    days,
    setDays,
    tab,
    setTab,
    expandedWork,
    setExpandedWork,
    setRefreshKey,
    loadedAt,
    exporting,
    exportError,
    works,
    viewsPerDay,
    totals,
    comparison,
    realtime,
    realtimeTotal,
    contentWorks,
    viewsDelta,
    readersDelta,
    handleExport,
    periodPhrase,
  } = useCreatorAnalyticsData();

  return (
    <section className="mn-container py-6 sm:py-8 space-y-6 min-w-0">
      {/* Cabeçalho do painel */}
      <header className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-4 sm:p-6 shadow-[6px_6px_0_var(--mn-yellow)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="font-pixel text-[11px] tracking-widest text-[var(--mn-mute)] uppercase">Criador</p>
            <h1 className="font-display text-2xl sm:text-4xl text-[var(--mn-paper)] uppercase mt-1 flex items-center gap-3">
              <BarChart3 size={28} className="shrink-0 text-[var(--mn-yellow)]" aria-hidden="true" />
              <span className="min-w-0 break-words">Análises do canal</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--mn-mute)]">
              Visão geral de todas as obras e o recorte de cada capítulo — visualizações válidas,
              leitores, descoberta, retenção e resultado.
            </p>
          </div>

          <div className="flex flex-wrap items-stretch gap-2 self-start">
            <label className="flex items-center gap-2 border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] px-3 py-2">
              <span className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">Período</span>
              <select
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
                className="max-w-[170px] bg-transparent font-display text-sm uppercase text-[var(--mn-paper)] outline-none"
              >
                {PERIODS.map((option) => (
                  <option key={option.days} value={option.days} className="bg-[var(--mn-ink)]">
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="text-[var(--mn-yellow)]" aria-hidden="true" />
            </label>

            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              className="inline-flex items-center gap-1.5 border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] px-3 font-pixel text-[10px] uppercase text-[var(--mn-paper)] hover:border-[var(--mn-yellow)]"
              aria-label="Atualizar analytics"
            >
              <RefreshCw size={13} aria-hidden="true" /> Atualizar
            </button>

            <Button
              type="button"
              onClick={handleExport}
              disabled={exporting || !data}
              className="!min-h-[42px] !px-3 !text-[10px]"
            >
              <Download size={14} className="mr-1.5" aria-hidden="true" />
              {exporting ? 'EXPORTANDO...' : 'EXPORTAR CSV'}
            </Button>
          </div>
        </div>

        {/* Período, comparação e atualização separados — sem ambiguidade */}
        {data && (
          <dl className="mt-4 grid gap-x-6 gap-y-1 border-t border-[var(--mn-line)] pt-3 font-body text-[11px] text-[var(--mn-mute)] sm:grid-cols-3">
            <div>
              <dt className="font-pixel text-[9px] uppercase">Período selecionado</dt>
              <dd className="tabular-nums text-[var(--mn-paper)]">
                {dateLabel(data.from)} — {dateLabel(data.to)}
              </dd>
            </div>
            <div>
              <dt className="font-pixel text-[9px] uppercase">Comparação</dt>
              <dd className="tabular-nums text-[var(--mn-paper)]">
                {comparison ? `${dateLabel(comparison.from)} — ${dateLabel(comparison.to)}` : '—'}
              </dd>
            </div>
            <div>
              <dt className="font-pixel text-[9px] uppercase">Última atualização</dt>
              <dd className="tabular-nums text-[var(--mn-paper)]">
                {loadedAt ? dateTimeLabel(loadedAt) : '—'}
              </dd>
            </div>
          </dl>
        )}

        {/* Abas no estilo Studio: sublinhado amarelo no ativo */}
        <nav className="mt-5 flex gap-6 border-b-2 border-[var(--mn-line)]" aria-label="Seções de analytics">
          {[
            { id: 'overview' as const, label: 'VISÃO GERAL' },
            { id: 'content' as const, label: 'CONTEÚDO' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-pressed={tab === item.id}
              className={`-mb-[2px] border-b-4 px-1 pb-2 font-display text-sm uppercase tracking-wide transition-colors ${
                tab === item.id
                  ? 'border-[var(--mn-yellow)] text-[var(--mn-paper)]'
                  : 'border-transparent text-[var(--mn-mute)] hover:text-[var(--mn-paper)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {error && (
        <p role="alert" className="border-2 border-[var(--mn-red)] bg-[var(--mn-ink-2)] p-4 text-[var(--mn-paper)]">
          {error}
        </p>
      )}
      {exportError && (
        <p role="alert" className="border-2 border-[var(--mn-red)] bg-[var(--mn-ink-2)] p-4 text-[var(--mn-paper)]">
          {exportError}
        </p>
      )}

      {loading && (
        <p className="font-pixel text-xs text-[var(--mn-mute)] uppercase" role="status" aria-live="polite">
          Carregando analytics...
        </p>
      )}

      {data && !loading && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6 min-w-0">
            <p className="font-display text-xl sm:text-3xl text-[var(--mn-paper)] leading-tight">
              {totals && totals.views > 0 ? (
                <>
                  Suas obras tiveram{' '}
                  <span className="text-[var(--mn-yellow)]">{number(totals.views)}</span>{' '}
                  {totals.views === 1 ? 'visualização válida' : 'visualizações válidas'} {periodPhrase}
                </>
              ) : (
                <>Ainda sem visualizações válidas registradas {periodPhrase}</>
              )}
            </p>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <StatCard
                icon={<Eye size={15} />}
                label="Visualizações válidas"
                value={totals ? number(totals.views) : '—'}
                hint="Primeira página realmente lida. Abrir e sair não conta."
                delta={viewsDelta}
              />
              <StatCard
                icon={<Users size={15} />}
                label="Leitores únicos"
                value={totals ? number(totals.uniqueReaders) : '—'}
                hint="Distintos na janela; não é a soma dos dias."
                delta={readersDelta}
              />
              <StatCard
                icon={<MousePointerClick size={15} />}
                label="Impressões elegíveis"
                value={totals ? number(totals.impressions) : '—'}
                hint={`Card ≥50% visível por ~1s. Medido desde ${DISCOVERY_INSTRUMENTED_AT}.`}
              />
              <StatCard
                icon={<Target size={15} />}
                label="CTR"
                value={totals ? percent(totals.ctrPercent) : '—'}
                hint="Aberturas atribuídas / impressões elegíveis."
                badge={
                  totals && totals.impressions > 0 && totals.impressions < MIN_SAMPLE
                    ? 'amostra pequena'
                    : undefined
                }
              />
            </div>

            {tab === 'overview' ? (
              <>
                <Win title="VISUALIZAÇÕES POR DIA.EXE">
                  <CreatorDailyChart data={viewsPerDay} comparison={comparison ?? undefined} />
                </Win>

                <CreatorFunnelPanel funnel={data.funnel} />

                <Win title="CONTEÚDO PRINCIPAL NO PERÍODO">
                  <CreatorContentTable
                    works={contentWorks}
                    expandedWork={expandedWork}
                    onToggle={(workId) => setExpandedWork((current) => (current === workId ? null : workId))}
                  />
                </Win>

                <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
                  <Win title="RETENÇÃO POR PÁGINA.EXE">
                    <CreatorRetentionCurve rows={data.pageRetention} sampleReaders={totals?.uniqueReaders ?? 0} />
                  </Win>

                  <Win title="QUANDO A AUDIÊNCIA LÊ.EXE">
                    <CreatorAudienceHeatmap heatmap={data.audienceHeatmap} />
                  </Win>
                </div>

                <Win title="FINANCEIRO DA JANELA.EXE">
                  <dl className="grid gap-3 font-body text-sm sm:grid-cols-2">
                    <FinanceRow label="Doações" value={brl(Number(data.netDonationsBrl))} />
                    <FinanceRow label="Membros" value={brl(Number(data.netMembershipsBrl))} />
                    <FinanceRow label="Saques" value={brl(Number(data.netWithdrawalsBrl))} />
                    <FinanceRow label="Saldo disponível" value={brl(Number(data.walletBalanceBrl))} highlight />
                  </dl>
                  <p className="mt-3 font-body text-[11px] text-[var(--mn-mute)]">
                    Somente lançamentos reais do ledger financeiro. Nenhuma receita é estimada a
                    partir de visualizações.
                  </p>
                </Win>
              </>
            ) : (
              <CreatorDetailedWorksList works={works} />
            )}
          </div>

          {/* Coluna em tempo real (como o painel do Studio) */}
          <CreatorRealtimeSidebar
            realtime={realtime}
            realtimeTotal={realtimeTotal}
            works={works}
            onViewContent={() => setTab('content')}
          />
        </div>
      )}
    </section>
  );
}