import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  Download,
  Eye,
  MousePointerClick,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { creatorAnalyticsApi, CreatorAnalyticsDto } from '../api/creatorAnalyticsApi';
import { Button } from '../components/ui/Button';
import { Win } from '../components/ui/Win';

type AnalyticsTab = 'overview' | 'content';
type WorkAnalytics = NonNullable<CreatorAnalyticsDto['works']>[number];

const PERIODS = [
  { days: 7, label: 'Últimos 7 dias' },
  { days: 28, label: 'Últimos 28 dias' },
  { days: 90, label: 'Últimos 90 dias' },
  { days: 180, label: 'Últimos 180 dias' },
] as const;

/** Amostra mínima para detalhar curvas/origens/horários (regra de privacidade vigente). */
const MIN_SAMPLE = 10;
/** Início da instrumentação de impressão/abertura — não reconstruímos o passado. */
const DISCOVERY_INSTRUMENTED_AT = '22/10/2026';

const number = (value: number | null | undefined) =>
  value !== null && value !== undefined && Number.isFinite(value)
    ? value.toLocaleString('pt-BR')
    : '—';

const percent = (value: number | null | undefined) =>
  value !== null && value !== undefined && Number.isFinite(value)
    ? `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
    : '—';

const brl = (value: number) =>
  Number.isFinite(value)
    ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'R$ —';

/** Data-só (LocalDate do backend) sem deslocar por fuso. */
const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const DISPLAY_TIMEZONE = 'America/Sao_Paulo';

const dateTimeLabel = (value: string | Date) =>
  new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DISPLAY_TIMEZONE,
  });

/** Faixa da hora cheia no formato do Studio: "Hoje, 14:00 – 15:00". */
const hourRangeLabel = (hour: string) => {
  const start = new Date(hour);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const now = new Date();
  const dayKey = (value: Date) =>
    value.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: DISPLAY_TIMEZONE,
    });
  const day = dayKey(start) === dayKey(now)
    ? 'Hoje'
    : start.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: DISPLAY_TIMEZONE,
      });
  const time = (value: Date) =>
    value.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: DISPLAY_TIMEZONE,
    });
  return `${day}, ${time(start)} – ${time(end)}`;
};

const weekdayLabels = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

/** Variação contra o período anterior. Sem base anterior, não inventa percentual. */
function comparisonDelta(current: number, previous: number | undefined) {
  if (previous === undefined) return null;
  if (previous === 0) {
    return current === 0
      ? { text: 'sem base anterior', tone: 'flat' as const }
      : { text: 'novo no período', tone: 'up' as const };
  }
  const delta = ((current - previous) / previous) * 100;
  return {
    text: `${delta >= 0 ? '+' : ''}${delta.toLocaleString('pt-BR', {
      maximumFractionDigits: 1,
    })}% vs. período anterior`,
    tone: delta > 0 ? ('up' as const) : delta < 0 ? ('down' as const) : ('flat' as const),
  };
}

/**
 * Análises do canal do criador — no espírito do Studio (visão geral do conteúdo,
 * recorte por obra/capítulo, período selecionável, tempo real e comparação), com a
 * identidade visual "Banca de Rua".
 *
 * Nenhum número é inventado: tudo vem de `GET /api/creators/analytics`. Métrica sem
 * instrumentação aparece como indisponível (`—`), nunca como zero.
 */
export function CreatorAnalyticsPage() {
  const [data, setData] = useState<CreatorAnalyticsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<number>(28);
  const [tab, setTab] = useState<AnalyticsTab>('overview');
  const [expandedWork, setExpandedWork] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    creatorAnalyticsApi
      .getAnalytics(days)
      .then((payload) => {
        if (!active) return;
        setData(payload);
        setLoadedAt(new Date());
      })
      .catch(() => {
        if (active) setError('Entre com uma conta de criador para ver os analytics reais.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [days, refreshKey]);

  const works = data?.works ?? [];
  const viewsPerDay = data?.viewsPerDay ?? [];
  // `totals` já vem deduplicado na janela. Nunca somar `uniqueReaders` dos dias:
  // isso contaria o mesmo leitor uma vez por dia em que ele voltou.
  const totals = data?.totals ?? null;
  const comparison = data?.comparison ?? null;
  const realtime = data?.viewsLast48Hours ?? [];
  const realtimeTotal = realtime.reduce((sum, hour) => sum + Number(hour.views), 0);

  const contentWorks = useMemo(
    () => works.filter((work) => work.views > 0 || work.chapters.length > 0 || work.impressions > 0),
    [works]
  );

  const viewsDelta = comparisonDelta(totals?.views ?? 0, comparison?.views);
  const readersDelta = comparisonDelta(totals?.uniqueReaders ?? 0, comparison?.uniqueReaders);

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await creatorAnalyticsApi.downloadCsv(days);
    } catch {
      setExportError('Não foi possível exportar o CSV agora. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };

  const periodPhrase = `nos últimos ${days} dias`;

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
                {dateLabel(data.from)} – {dateLabel(data.to)}
              </dd>
            </div>
            <div>
              <dt className="font-pixel text-[9px] uppercase">Comparação</dt>
              <dd className="tabular-nums text-[var(--mn-paper)]">
                {comparison ? `${dateLabel(comparison.from)} – ${dateLabel(comparison.to)}` : '—'}
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
                  <DailyChart data={viewsPerDay} comparison={comparison ?? undefined} />
                </Win>

                <FunnelPanel funnel={data.funnel} />

                <Win title="CONTEÚDO PRINCIPAL NO PERÍODO">
                  <ContentTable
                    works={contentWorks}
                    expandedWork={expandedWork}
                    onToggle={(workId) => setExpandedWork((current) => (current === workId ? null : workId))}
                  />
                </Win>

                <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
                  <Win title="RETENÇÃO POR PÁGINA.EXE">
                    <RetentionCurve rows={data.pageRetention} sampleReaders={totals?.uniqueReaders ?? 0} />
                  </Win>

                  <Win title="QUANDO A AUDIÊNCIA LÊ.EXE">
                    <AudienceHeatmap heatmap={data.audienceHeatmap} />
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
              <div className="space-y-4">
                {works.length === 0 ? (
                  <p className="border-2 border-dashed border-[var(--mn-line)] p-6 font-pixel text-xs uppercase text-[var(--mn-mute)]">
                    Nenhuma obra publicada ainda.
                  </p>
                ) : (
                  works.map((work) => (
                    <Win key={work.workId} title={work.title.toUpperCase()}>
                      <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="w-24 shrink-0 border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] aspect-[2/3] overflow-hidden">
                          {work.coverUrl ? (
                            <img src={work.coverUrl} alt={work.title} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex h-full items-center justify-center font-pixel text-[10px] text-[var(--mn-mute)]">
                              SEM CAPA
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                            <Metric label="Visualizações" value={number(work.views)} />
                            <Metric label="Leitores únicos" value={number(work.uniqueReaders)} />
                            <Metric label="Impressões" value={number(work.impressions)} />
                            <Metric label="CTR" value={percent(work.ctrPercent)} />
                            <Metric label="Conclusão" value={percent(work.completionRatePercent)} />
                            <Metric label="Capítulos" value={number(work.chapters.length)} />
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[560px] border-collapse text-left">
                              <thead>
                                <tr className="border-b-2 border-[var(--mn-line)] font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
                                  <th className="py-1.5 pr-3">Capítulo</th>
                                  <th className="py-1.5 pr-3">Visualizações</th>
                                  <th className="py-1.5 pr-3">Leitores únicos</th>
                                  <th className="py-1.5">Conclusão estimada</th>
                                </tr>
                              </thead>
                              <tbody>
                                {work.chapters.length === 0 && (
                                  <tr>
                                    <td colSpan={4} className="py-2 font-body text-xs text-[var(--mn-mute)]">
                                      Nenhum capítulo cadastrado.
                                    </td>
                                  </tr>
                                )}
                                {work.chapters.map((chapter) => (
                                  <tr key={chapter.chapterId} className="border-b border-[var(--mn-line)] font-body text-sm">
                                    <td className="py-1.5 pr-3 text-[var(--mn-paper)]">
                                      <span className="tabular-nums">#{chapter.chapterNumber}</span> {chapter.title}
                                    </td>
                                    <td className="py-1.5 pr-3 tabular-nums text-[var(--mn-paper)]">{number(chapter.views)}</td>
                                    <td className="py-1.5 pr-3 tabular-nums text-[var(--mn-paper)]">{number(chapter.uniqueReaders)}</td>
                                    <td className="py-1.5 tabular-nums text-[var(--mn-paper)]">
                                      {percent(chapter.completionRatePercent)}
                                      {chapter.completionRatePercent === null && (
                                        <span className="ml-1 text-[10px] text-[var(--mn-mute)]">prosa: não mensurável</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </Win>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Coluna em tempo real (como o painel do Studio) */}
          <aside className="space-y-4 min-w-0">
            <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg uppercase text-[var(--mn-paper)]">Em tempo real</h2>
                <span className="inline-flex items-center gap-1.5 font-pixel text-[10px] uppercase text-[var(--mn-ok)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--mn-ok)]" /> ao vivo
                </span>
              </div>

              <p className="mt-4 font-display text-3xl text-[var(--mn-paper)] tabular-nums">{number(realtimeTotal)}</p>
              <p className="font-body text-xs text-[var(--mn-mute)]">Visualizações · últimas 48 horas</p>
              <p className="mt-1 font-pixel text-[9px] uppercase text-[var(--mn-mute)]">
                Toque ou passe o mouse nas barras para ver a hora e o total
              </p>

              <RealtimeBars data={realtime} />

              <div className="mt-4 border-t border-[var(--mn-line)] pt-3">
                <p className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">Conteúdo principal</p>
                <ul className="mt-2 space-y-2">
                  {works.slice(0, 5).map((work) => (
                    <li key={work.workId} className="flex items-center gap-2">
                      <div className="h-8 w-6 shrink-0 overflow-hidden border border-[var(--mn-line)] bg-[var(--mn-ink)]">
                        {work.coverUrl ? (
                          <img src={work.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : null}
                      </div>
                      <span className="min-w-0 flex-1 truncate font-body text-xs text-[var(--mn-paper)]" title={work.title}>
                        {work.title}
                      </span>
                      <span className="font-pixel text-[10px] tabular-nums text-[var(--mn-mute)]">
                        {number(work.views)}
                      </span>
                    </li>
                  ))}
                  {works.length === 0 && (
                    <li className="font-body text-xs text-[var(--mn-mute)]">Sem obras ainda.</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-yellow)] p-4 text-[var(--mn-ink)]">
              <p className="font-pixel text-[10px] uppercase">Dica de canal</p>
              <p className="mt-2 font-body text-xs leading-relaxed">
                Compare a página em que os leitores param com o gancho do capítulo seguinte. A curva
                mostra progresso observado, não confirmação de que cada página foi olhada.
              </p>
              <Button
                variant="ghost"
                onClick={() => setTab('content')}
                className="mt-3 !border-[var(--mn-ink)] !text-[var(--mn-ink)]"
              >
                <TrendingUp size={14} className="mr-1" aria-hidden="true" /> VER CONTEÚDO
              </Button>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  delta,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  delta?: { text: string; tone: 'up' | 'down' | 'flat' } | null;
  badge?: string;
}) {
  return (
    <div className="min-w-0 border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-3 sm:p-4">
      <p className="flex items-center gap-1.5 font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
        {icon} <span className="min-w-0 break-words">{label}</span>
      </p>
      <p className="mt-2 break-words font-display text-xl sm:text-2xl text-[var(--mn-paper)] tabular-nums">
        {value}
      </p>
      {badge && (
        <span className="mt-1 inline-block border border-[var(--mn-yellow)] px-1.5 font-pixel text-[8px] uppercase text-[var(--mn-yellow)]">
          {badge}
        </span>
      )}
      {delta && (
        <p
          className={`mt-1 font-body text-[10px] ${
            delta.tone === 'up'
              ? 'text-[var(--mn-ok)]'
              : delta.tone === 'down'
                ? 'text-[var(--mn-red)]'
                : 'text-[var(--mn-mute)]'
          }`}
        >
          {delta.text}
        </p>
      )}
      {hint && <p className="mt-1 font-body text-[10px] leading-snug text-[var(--mn-mute)]">{hint}</p>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">{label}</p>
      <p className="font-display text-xl text-[var(--mn-paper)] tabular-nums">{value}</p>
    </div>
  );
}

function FinanceRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 border-b py-1 ${highlight ? 'border-[var(--mn-yellow)]' : 'border-[var(--mn-line)]'}`}>
      <dt className="text-[var(--mn-mute)]">{label}</dt>
      <dd className={`tabular-nums ${highlight ? 'text-[var(--mn-yellow)]' : 'text-[var(--mn-paper)]'}`}>{value}</dd>
    </div>
  );
}

/** Área/linha por dia com tooltip em mouse, toque e teclado + comparação anterior. */
function DailyChart({
  data,
  comparison,
}: {
  data: { date: string; views: number; uniqueReaders: number }[];
  comparison: CreatorAnalyticsDto['comparison'];
}) {
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const width = 760;
  const height = 250;
  const padX = 42;
  const padY = 22;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const previousByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const day of comparison?.viewsPerDay ?? []) {
      map.set(day.date, day.views);
    }
    return map;
  }, [comparison]);

  if (data.length === 0) {
    return <p className="font-pixel text-xs uppercase text-[var(--mn-mute)]">Sem visualizações no período.</p>;
  }

  const max = Math.max(
    1,
    ...data.map((day) => Number(day.views)),
    ...data.map((day) => previousByDate.get(day.date) ?? 0)
  );
  const x = (index: number) =>
    padX + (data.length <= 1 ? innerW / 2 : (index / (data.length - 1)) * innerW);
  const y = (value: number) => padY + innerH - (value / max) * innerH;
  const points = data.map((day, index) => `${x(index)},${y(Number(day.views))}`);
  const line = points.length > 0 ? `M${points.join(' L')}` : '';
  const area = points.length > 0 ? `${line} L${x(data.length - 1)},${padY + innerH} L${x(0)},${padY + innerH} Z` : '';
  const previousPoints = data.map((day, index) => `${x(index)},${y(previousByDate.get(day.date) ?? 0)}`);
  const previousLine = comparison && previousPoints.length > 0 ? `M${previousPoints.join(' L')}` : '';
  const grid = [0, 0.5, 1].map((factor) => y(max * factor));

  const activeDay = active !== null ? data[active] : null;
  const activePrevious = activeDay ? previousByDate.get(activeDay.date) : undefined;
  const activeXPercent = active !== null ? (x(active) / width) * 100 : 50;

  const pick = (clientX: number, element: SVGSVGElement) => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0) return;
    const svgX = ((clientX - rect.left) / rect.width) * width;
    const raw = data.length <= 1 ? 0 : ((svgX - padX) / innerW) * (data.length - 1);
    const index = Math.min(data.length - 1, Math.max(0, Math.round(raw)));
    setActive(index);
  };

  const moveActive = (direction: 1 | -1) => {
    setActive((current) => {
      if (current === null) return direction === 1 ? 0 : data.length - 1;
      return Math.min(data.length - 1, Math.max(0, current + direction));
    });
  };

  return (
    <div className="relative min-w-0">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-pixel text-[9px] uppercase text-[var(--mn-mute)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-[var(--mn-yellow)]" aria-hidden="true" /> Período atual
        </span>
        {comparison && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-[var(--mn-teal)]" aria-hidden="true" />
            Período anterior
          </span>
        )}
        <span className="normal-case text-[var(--mn-mute)]">Toque, passe o mouse ou use ← →</span>
      </div>

      {activeDay && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute top-8 z-10 w-max max-w-[230px] border border-[var(--mn-line)] bg-[var(--mn-ink)] px-2.5 py-1.5 text-left shadow-[3px_3px_0_var(--mn-line)]"
          style={{
            left: `${Math.min(88, Math.max(12, activeXPercent))}%`,
            transform: `translateX(${
              activeXPercent > 65 ? '-85%' : activeXPercent < 35 ? '-15%' : '-50%'
            })`,
          }}
        >
          <p className="font-pixel text-[9px] uppercase text-[var(--mn-mute)]">{dateLabel(activeDay.date)}</p>
          <p className="font-display text-lg leading-tight text-[var(--mn-teal)] tabular-nums">
            {number(activeDay.views)} {activeDay.views === 1 ? 'visualização' : 'visualizações'}
          </p>
          {comparison && (
            <p className="font-body text-[10px] text-[var(--mn-mute)]">
              Período anterior: {number(activePrevious ?? 0)}
            </p>
          )}
          <p className="font-body text-[10px] text-[var(--mn-mute)]">
            {number(activeDay.uniqueReaders)}{' '}
            {activeDay.uniqueReaders === 1 ? 'leitor único' : 'leitores únicos'}
          </p>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full touch-pan-y focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mn-yellow)]"
        role="img"
        tabIndex={0}
        aria-label={`Visualizações por dia entre ${dateLabel(data[0].date)} e ${dateLabel(data[data.length - 1].date)}. Use as setas para explorar os dias.`}
        onPointerMove={(event) => pick(event.clientX, event.currentTarget)}
        onPointerLeave={() => setActive(null)}
        onPointerDown={(event) => pick(event.clientX, event.currentTarget)}
        onBlur={() => setActive(null)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            moveActive(1);
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            moveActive(-1);
          } else if (event.key === 'Home') {
            event.preventDefault();
            setActive(0);
          } else if (event.key === 'End') {
            event.preventDefault();
            setActive(data.length - 1);
          } else if (event.key === 'Escape') {
            setActive(null);
          }
        }}
      >
        {grid.map((position, index) => (
          <line
            key={`grid-${index}`}
            x1={padX}
            y1={position}
            x2={width - padX}
            y2={position}
            stroke="var(--mn-line)"
            strokeWidth={1}
            strokeDasharray={index === 2 ? '0' : '3 4'}
          />
        ))}
        {area && <path d={area} fill="url(#readsArea)" />}
        <defs>
          <linearGradient id="readsArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFD400" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FFD400" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {previousLine && (
          <path
            d={previousLine}
            fill="none"
            stroke="var(--mn-teal)"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            opacity={0.75}
          />
        )}
        {line && <path d={line} fill="none" stroke="#FFD400" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
        {active !== null && (
          <line
            x1={x(active)}
            y1={padY}
            x2={x(active)}
            y2={padY + innerH}
            stroke="var(--mn-yellow)"
            strokeWidth={1}
            strokeDasharray="2 3"
            opacity={0.8}
          />
        )}
        {data.map((day, index) => (
          <circle
            key={day.date}
            cx={x(index)}
            cy={y(Number(day.views))}
            r={active === index ? 4.5 : 2.5}
            fill="#FFD400"
            stroke={active === index ? 'var(--mn-ink)' : 'none'}
            strokeWidth={1.5}
          >
            <title>{`${dateLabel(day.date)}: ${number(day.views)} visualização(ões)`}</title>
          </circle>
        ))}
        <text x={padX} y={height - 2} fill="#A9A59A" fontSize="10">
          {dateLabel(data[0].date)}
        </text>
        <text x={width - padX} y={height - 2} fill="#A9A59A" fontSize="10" textAnchor="end">
          {dateLabel(data[data.length - 1].date)}
        </text>
        <text x={padX - 6} y={padY + 4} fill="#A9A59A" fontSize="10" textAnchor="end">
          {max}
        </text>
        <text x={padX - 6} y={padY + innerH / 2 + 4} fill="#A9A59A" fontSize="10" textAnchor="end">
          {Math.round(max / 2)}
        </text>
        <text x={padX - 6} y={padY + innerH} fill="#A9A59A" fontSize="10" textAnchor="end">
          0
        </text>
      </svg>
      <p className="mt-1 font-body text-[10px] text-[var(--mn-mute)]">
        Datas no fuso America/Sao_Paulo. O valor de cada dia é a visualização válida, não a página lida.
      </p>
    </div>
  );
}

/** Barras das 48 horas com tooltip de hora e total (padrão Studio). */
function RealtimeBars({ data }: { data: { hour: string; views: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (data.length === 0) {
    return <p className="mt-3 font-pixel text-[10px] uppercase text-[var(--mn-mute)]">Sem dados em tempo real.</p>;
  }
  const max = Math.max(1, ...data.map((hour) => Number(hour.views)));
  const active = hovered !== null ? data[hovered] : null;
  const activePercent = hovered !== null ? ((hovered + 0.5) / data.length) * 100 : 50;
  const clampedPercent = Math.min(88, Math.max(12, activePercent));

  return (
    <div className="relative mt-3">
      {active && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute z-10 w-max max-w-[190px] border border-[var(--mn-line)] bg-[var(--mn-ink)] px-2.5 py-1.5 text-left shadow-[3px_3px_0_var(--mn-line)]"
          style={{
            left: `${clampedPercent}%`,
            top: 0,
            transform: `translateY(-100%) translateX(${
              clampedPercent > 65 ? '-85%' : clampedPercent < 35 ? '-15%' : '-50%'
            })`,
          }}
        >
          <p className="font-pixel text-[9px] uppercase text-[var(--mn-mute)]">{hourRangeLabel(active.hour)}</p>
          <p className="font-display text-lg leading-tight text-[var(--mn-teal)] tabular-nums">
            {number(Number(active.views))}
          </p>
        </div>
      )}
      <div className="flex h-24 items-end gap-[2px]">
        {data.map((hour, index) => (
          <button
            key={hour.hour}
            type="button"
            className="min-w-0 flex-1 cursor-pointer border-0 bg-[var(--mn-yellow)] p-0 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--mn-paper)]"
            style={{
              height: `${Math.max(3, (Number(hour.views) / max) * 100)}%`,
              opacity: Number(hour.views) === 0 ? 0.25 : hovered === index ? 1 : 0.85,
            }}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(index)}
            onBlur={() => setHovered(null)}
            onTouchStart={() => setHovered(index)}
            aria-label={`${hourRangeLabel(hour.hour)}: ${number(Number(hour.views))} ${
              Number(hour.views) === 1 ? 'visualização' : 'visualizações'
            }`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-pixel text-[9px] uppercase text-[var(--mn-mute)]">
        <span>48h atrás</span>
        <span>agora</span>
      </div>
    </div>
  );
}

/** Curva de retenção com valor absoluto, percentual e detalhe acessível. */
function RetentionCurve({
  rows,
  sampleReaders,
}: {
  rows: { page: number; readers: number; retentionPercent: number }[];
  sampleReaders: number;
}) {
  const [active, setActive] = useState<number | null>(null);

  if (rows.length === 0) {
    return <p className="font-pixel text-xs uppercase text-[var(--mn-mute)]">Sem dados de retenção.</p>;
  }
  if (sampleReaders < MIN_SAMPLE) {
    return (
      <div className="space-y-2 border-2 border-dashed border-[var(--mn-line)] p-4">
        <p className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
          Dados insuficientes para detalhar a curva
        </p>
        <p className="font-body text-xs text-[var(--mn-mute)]">
          Amostra atual: {number(sampleReaders)} {sampleReaders === 1 ? 'leitor' : 'leitores'}. O
          detalhamento por página é exibido a partir de {MIN_SAMPLE} leitores na janela, para não
          expor comportamento individual. Os totais acima continuam reais.
        </p>
      </div>
    );
  }

  const activeRow = active !== null ? rows[active] : null;

  return (
    <div>
      {activeRow && (
        <p role="status" aria-live="polite" className="mb-2 font-body text-xs text-[var(--mn-paper)]">
          Página {activeRow.page}: {number(activeRow.readers)} leitores chegaram (
          {percent(activeRow.retentionPercent)}).
        </p>
      )}
      <ul className="space-y-1.5">
        {rows.map((row, index) => (
          <li key={row.page}>
            <button
              type="button"
              className="flex w-full items-center gap-2 border border-transparent px-0 py-0.5 text-left hover:border-[var(--mn-line)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--mn-yellow)]"
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(index)}
              aria-label={`Página ${row.page}: ${row.readers} leitores, ${percent(row.retentionPercent)}`}
            >
              <span className="w-14 shrink-0 font-pixel text-[10px] text-[var(--mn-mute)]">PÁG. {row.page}</span>
              <span className="h-3 min-w-0 flex-1 bg-[var(--mn-ink)]">
                <span
                  className="block h-full bg-[var(--mn-teal)]"
                  style={{ width: `${Math.min(100, row.retentionPercent)}%` }}
                />
              </span>
              <span className="w-20 shrink-0 text-right font-pixel text-[10px] text-[var(--mn-paper)] tabular-nums">
                {number(row.readers)} ({percent(row.retentionPercent)})
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 font-body text-[10px] leading-snug text-[var(--mn-mute)]">
        Base: {number(sampleReaders)}{' '}
        {sampleReaders === 1 ? 'leitor com progresso registrado' : 'leitores com progresso registrado'}. É
        progresso observado, não confirmação de que a pessoa olhou cada página nem causalidade.
      </p>
    </div>
  );
}

/** Matriz dia × hora (últimos 28 dias) com amostra mínima respeitada. */
function AudienceHeatmap({ heatmap }: { heatmap: CreatorAnalyticsDto['audienceHeatmap'] }) {
  const [active, setActive] = useState<{ weekday: number; hour: number; views: number } | null>(null);

  if (!heatmap) {
    return <p className="font-pixel text-xs uppercase text-[var(--mn-mute)]">Relatório indisponível.</p>;
  }
  if (heatmap.sampleSize < MIN_SAMPLE) {
    return (
      <div className="space-y-2 border-2 border-dashed border-[var(--mn-line)] p-4">
        <p className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
          Dados insuficientes para este relatório
        </p>
        <p className="font-body text-xs text-[var(--mn-mute)]">
          Amostra: {number(heatmap.sampleSize)}{' '}
          {heatmap.sampleSize === 1 ? 'visualização' : 'visualizações'} nos últimos {heatmap.days} dias. A
          matriz por dia/hora aparece a partir de {MIN_SAMPLE} visualizações.
        </p>
      </div>
    );
  }

  const cells = new Map<string, number>();
  for (const cell of heatmap.cells) {
    cells.set(`${cell.weekday}-${cell.hour}`, cell.views);
  }
  const max = Math.max(1, ...heatmap.cells.map((cell) => cell.views));

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[620px]">
          <div
            className="grid items-center gap-[2px]"
            style={{ gridTemplateColumns: '34px repeat(24, minmax(14px, 1fr))' }}
          >
            <span aria-hidden="true" />
            {Array.from({ length: 24 }, (_, hour) => (
              <span key={`h-${hour}`} className="text-center font-pixel text-[8px] text-[var(--mn-mute)]">
                {hour % 3 === 0 ? String(hour).padStart(2, '0') : ''}
              </span>
            ))}
            {weekdayLabels.map((label, index) => {
              const weekday = index + 1;
              return (
                <div key={label} className="contents">
                  <span className="font-pixel text-[9px] text-[var(--mn-mute)]">{label}</span>
                  {Array.from({ length: 24 }, (_, hour) => {
                    const views = cells.get(`${weekday}-${hour}`) ?? 0;
                    const opacity = views === 0 ? 0.06 : 0.18 + (views / max) * 0.82;
                    return (
                      <button
                        key={`${weekday}-${hour}`}
                        type="button"
                        className="aspect-square min-h-[14px] w-full border border-[var(--mn-ink)] p-0 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--mn-paper)]"
                        style={{ backgroundColor: `rgba(255, 212, 0, ${opacity})` }}
                        onMouseEnter={() => setActive({ weekday, hour, views })}
                        onMouseLeave={() => setActive(null)}
                        onFocus={() => setActive({ weekday, hour, views })}
                        onBlur={() => setActive(null)}
                        onClick={() => setActive({ weekday, hour, views })}
                        aria-label={`${weekdayLabels[index]}, ${String(hour).padStart(2, '0')}h–${String(
                          (hour + 1) % 24
                        ).padStart(2, '0')}h: ${views} ${views === 1 ? 'visualização' : 'visualizações'}`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p role="status" aria-live="polite" className="mt-2 min-h-[18px] font-body text-xs text-[var(--mn-paper)]">
        {active
          ? `${weekdayLabels[active.weekday - 1]}, ${String(active.hour).padStart(2, '0')}h–${String(
              (active.hour + 1) % 24
            ).padStart(2, '0')}h: ${number(active.views)} ${
              active.views === 1 ? 'visualização' : 'visualizações'
            }`
          : 'Toque, passe o mouse ou navegue por teclado nas células.'}
      </p>
      <p className="mt-1 font-body text-[10px] leading-snug text-[var(--mn-mute)]">
        Últimos {heatmap.days} dias · fuso {heatmap.timezone} · amostra {number(heatmap.sampleSize)}{' '}
        visualizações. Horário observado não é garantia de alcance.
      </p>
    </div>
  );
}

/** Funil de descoberta — só mostra etapas medidas e nunca transforma ausência em zero. */
function FunnelPanel({ funnel }: { funnel: CreatorAnalyticsDto['funnel'] }) {
  if (!funnel) {
    return (
      <Win title="FUNIL DE DESCOBERTA.EXE">
        <p className="font-pixel text-xs uppercase text-[var(--mn-mute)]">Funil indisponível.</p>
      </Win>
    );
  }

  const stages = [
    {
      label: 'Impressões elegíveis',
      value: funnel.impressions,
      available: true,
      hint: `desde ${DISCOVERY_INSTRUMENTED_AT}`,
    },
    {
      label: 'Aberturas',
      value: funnel.openings,
      available: true,
      hint:
        funnel.attributedOpenings === 1
          ? '1 atribuída a impressão'
          : `${number(funnel.attributedOpenings)} atribuídas a impressão`,
    },
    {
      label: 'Inícios qualificados',
      value: funnel.qualifiedStarts,
      available: true,
      hint: 'primeira página realmente lida',
    },
    {
      label: 'Conclusões estimadas',
      value: funnel.completions,
      available: funnel.completions !== null,
      hint:
        funnel.completions === null
          ? 'não mensurável no formato atual'
          : 'mangá: ≥80% das páginas distintas',
    },
  ];
  const max = Math.max(1, ...stages.map((stage) => (stage.available ? Number(stage.value ?? 0) : 0)));

  return (
    <Win title="FUNIL DE DESCOBERTA.EXE">
      <ol className="space-y-2">
        {stages.map((stage) => (
          <li key={stage.label} className="min-w-0">
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">{stage.label}</span>
                <span className="font-display text-sm text-[var(--mn-paper)] tabular-nums">
                  {stage.available ? number(Number(stage.value)) : '—'}
                </span>
              </div>
              <div className="mt-1 h-2 bg-[var(--mn-ink)]">
                <div
                  className="h-full bg-[var(--mn-yellow)]"
                  style={{
                    width:
                      stage.available && Number(stage.value ?? 0) > 0
                        ? `${Math.max(2, (Number(stage.value ?? 0) / max) * 100)}%`
                        : '0%',
                  }}
                />
              </div>
              <p className="mt-0.5 font-body text-[10px] text-[var(--mn-mute)]">{stage.hint}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 border-t border-[var(--mn-line)] pt-2 font-body text-[10px] leading-snug text-[var(--mn-mute)]">
        Clareza de funil: abrir não é ler. A visualização válida (início qualificado) só existe quando
        a primeira página é efetivamente alcançada; página lida alimenta a retenção, nunca uma nova
        visualização. Impressões não são reconstruídas antes de {DISCOVERY_INSTRUMENTED_AT}.
      </p>
    </Win>
  );
}

type SortKey = 'title' | 'views' | 'uniqueReaders' | 'impressions' | 'ctrPercent' | 'completionRatePercent';

function sortValue(work: WorkAnalytics, key: SortKey): number | string {
  if (key === 'title') return work.title.toLowerCase();
  if (key === 'ctrPercent' || key === 'completionRatePercent') {
    return work[key] ?? -1;
  }
  return work[key];
}

/** Tabela "conteúdo principal" com ordenação real e expansão dos capítulos. */
function ContentTable({
  works,
  expandedWork,
  onToggle,
}: {
  works: WorkAnalytics[];
  expandedWork: string | null;
  onToggle: (workId: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('views');
  const [ascending, setAscending] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...works];
    copy.sort((a, b) => {
      const left = sortValue(a, sortKey);
      const right = sortValue(b, sortKey);
      const comparison = typeof left === 'string' && typeof right === 'string'
        ? left.localeCompare(right, 'pt-BR')
        : Number(left) - Number(right);
      return ascending ? comparison : -comparison;
    });
    return copy;
  }, [works, sortKey, ascending]);

  if (works.length === 0) {
    return <p className="font-pixel text-xs uppercase text-[var(--mn-mute)]">Nenhuma obra publicada ainda.</p>;
  }

  const header = (label: string, key: SortKey, extraClass = '') => (
    <th
      scope="col"
      className={`py-2 pr-3 ${extraClass}`}
      aria-sort={sortKey === key ? (ascending ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 font-pixel text-[10px] uppercase text-[var(--mn-mute)] hover:text-[var(--mn-paper)]"
        onClick={() => {
          if (sortKey === key) {
            setAscending((value) => !value);
          } else {
            setSortKey(key);
            setAscending(key === 'title');
          }
        }}
      >
        {label}
        {sortKey === key && (
          <ChevronDown
            size={11}
            aria-hidden="true"
            className={ascending ? 'rotate-180 transition-transform' : 'transition-transform'}
          />
        )}
      </button>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-[var(--mn-line)]">
            {header('Obra', 'title')}
            {header('Visualizações', 'views')}
            {header('Leitores únicos', 'uniqueReaders')}
            {header('Impressões', 'impressions')}
            {header('CTR', 'ctrPercent')}
            {header('Conclusão', 'completionRatePercent')}
            <th scope="col" className="py-2 font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
              Capítulos
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((work) => {
            const expanded = expandedWork === work.workId;
            return (
              <FragmentRow key={work.workId}>
                <tr
                  className="cursor-pointer border-b border-[var(--mn-line)] font-body text-sm hover:bg-[var(--mn-ink-3)]"
                  onClick={() => onToggle(work.workId)}
                >
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-7 shrink-0 overflow-hidden border border-[var(--mn-line)] bg-[var(--mn-ink)]">
                        {work.coverUrl ? (
                          <img src={work.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : null}
                      </div>
                      <span className="min-w-0 break-words text-[var(--mn-paper)]">{work.title}</span>
                      <ChevronDown
                        size={14}
                        className={`shrink-0 text-[var(--mn-mute)] transition-transform ${expanded ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </div>
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-[var(--mn-paper)]">{number(work.views)}</td>
                  <td className="py-2 pr-3 tabular-nums text-[var(--mn-paper)]">{number(work.uniqueReaders)}</td>
                  <td className="py-2 pr-3 tabular-nums text-[var(--mn-paper)]">{number(work.impressions)}</td>
                  <td className="py-2 pr-3 tabular-nums text-[var(--mn-paper)]">{percent(work.ctrPercent)}</td>
                  <td className="py-2 pr-3 tabular-nums text-[var(--mn-paper)]">
                    {percent(work.completionRatePercent)}
                  </td>
                  <td className="py-2 tabular-nums text-[var(--mn-mute)]">{number(work.chapters.length)}</td>
                </tr>
                {expanded && (
                  <tr className="border-b border-[var(--mn-line)] bg-[var(--mn-ink)]">
                    <td colSpan={7} className="px-3 py-3">
                      {work.chapters.length === 0 ? (
                        <p className="font-body text-xs text-[var(--mn-mute)]">Nenhum capítulo cadastrado.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {work.chapters.map((chapter) => (
                            <li key={chapter.chapterId} className="flex flex-wrap items-center justify-between gap-2 font-body text-xs">
                              <span className="min-w-0 truncate text-[var(--mn-paper)]">
                                <BookOpen size={12} className="mr-1 inline text-[var(--mn-yellow)]" aria-hidden="true" />
                                <span className="tabular-nums">#{chapter.chapterNumber}</span> {chapter.title}
                              </span>
                              <span className="shrink-0 tabular-nums text-[var(--mn-mute)]">
                                {number(chapter.views)} visualizações · {number(chapter.uniqueReaders)} leitores ·{' '}
                                {percent(chapter.completionRatePercent)} conclusão
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </FragmentRow>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Agrupa as duas linhas (obra + detalhe) sem uma tabela aninhada. */
function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
