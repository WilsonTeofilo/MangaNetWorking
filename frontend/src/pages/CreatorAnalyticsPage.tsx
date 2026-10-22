import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Eye, Heart, Users, Wallet, ChevronDown, BookOpen, TrendingUp } from 'lucide-react';
import { creatorAnalyticsApi, CreatorAnalyticsDto } from '../api/creatorAnalyticsApi';
import { Button } from '../components/ui/Button';
import { Win } from '../components/ui/Win';

type AnalyticsTab = 'overview' | 'content';

const PERIODS = [
  { days: 7, label: 'Últimos 7 dias' },
  { days: 28, label: 'Últimos 28 dias' },
  { days: 90, label: 'Últimos 90 dias' },
  { days: 180, label: 'Últimos 180 dias' },
] as const;

const number = (value: number) =>
  Number.isFinite(value) ? value.toLocaleString('pt-BR') : '0';

const brl = (value: number) =>
  Number.isFinite(value) ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ —';

const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });

const hourLabel = (hour: string) =>
  new Date(hour).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit' });

/**
 * Análises do canal do criador — no espírito do Studio (visão geral do conteúdo,
 * recorte por obra e por capítulo, período selecionável e painel em tempo real),
 * com a identidade visual "Banca de Rua".
 *
 * <p>Nenhum número é inventado: tudo vem de `GET /api/creators/analytics`, que lê os
 * eventos reais de leitura do MongoDB e o ledger financeiro do PostgreSQL.</p>
 */
export function CreatorAnalyticsPage() {
  const [data, setData] = useState<CreatorAnalyticsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<number>(28);
  const [tab, setTab] = useState<AnalyticsTab>('overview');
  const [expandedWork, setExpandedWork] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    creatorAnalyticsApi
      .getAnalytics(days)
      .then((payload) => {
        if (active) setData(payload);
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
  }, [days]);

  const works = data?.works ?? [];
  const readsPerDay = data?.readsPerDay ?? [];
  const totals = useMemo(() => {
    if (data?.totals) return data.totals;
    return {
      reads: readsPerDay.reduce((sum, day) => sum + Number(day.reads), 0),
      uniqueReaders: readsPerDay.reduce((sum, day) => sum + Number(day.uniqueReaders), 0),
    };
  }, [data, readsPerDay]);

  const contentWorks = useMemo(
    () => works.filter((work) => work.reads > 0 || work.chapters.length > 0),
    [works]
  );

  const periodPhrase = `nos últimos ${days} dias`;
  const realtime = data?.readsLast48Hours ?? [];
  const realtimeTotal = realtime.reduce((sum, hour) => sum + Number(hour.reads), 0);

  return (
    <section className="mn-container py-8 space-y-6">
      {/* Cabeçalho do painel */}
      <header className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-6 shadow-[6px_6px_0_var(--mn-yellow)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-pixel text-[11px] tracking-widest text-[var(--mn-mute)] uppercase">Criador</p>
            <h1 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase mt-1 flex items-center gap-3">
              <BarChart3 size={28} className="text-[var(--mn-yellow)]" /> Análises do canal
            </h1>
            <p className="mt-2 text-sm text-[var(--mn-mute)]">
              Visão geral de todas as obras e o recorte de cada capítulo — leituras, leitores, retenção e resultado.
            </p>
          </div>

          <label className="flex items-center gap-2 self-start border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] px-3 py-2">
            <span className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">Período</span>
            <select
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="bg-transparent font-display text-sm uppercase text-[var(--mn-paper)] outline-none"
            >
              {PERIODS.map((option) => (
                <option key={option.days} value={option.days} className="bg-[var(--mn-ink)]">
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="text-[var(--mn-yellow)]" />
          </label>
        </div>

        {/* Abas no estilo Studio: sublinhado amarelo no ativo */}
        <nav className="mt-6 flex gap-6 border-b-2 border-[var(--mn-line)]" aria-label="Seções de analytics">
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

      {loading && <p className="font-pixel text-xs text-[var(--mn-mute)] uppercase">Carregando analytics...</p>}

      {data && !loading && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6 min-w-0">
            <p className="font-display text-2xl sm:text-3xl text-[var(--mn-paper)] leading-tight">
              {totals.reads > 0 ? (
                <>
                  Suas obras tiveram <span className="text-[var(--mn-yellow)]">{number(totals.reads)}</span>{' '}
                  leituras {periodPhrase}
                </>
              ) : (
                <>Ainda sem leituras registradas {periodPhrase}</>
              )}
            </p>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard icon={<Eye size={15} />} label="Leituras" value={number(totals.reads)} />
              <StatCard icon={<Users size={15} />} label="Leitores únicos" value={number(totals.uniqueReaders)} />
              <StatCard icon={<Heart size={15} />} label="Membros" value={number(data.monthlyMembersCount)} />
              <StatCard icon={<Wallet size={15} />} label="Receita líquida" value={brl(Number(data.netEarningsBrl))} />
            </div>

            {tab === 'overview' ? (
              <>
                <Win title="LEITURAS POR DIA.EXE">
                  <ReadsChart data={readsPerDay} />
                </Win>

                <Win title="CONTEÚDO PRINCIPAL NO PERÍODO">
                  <ContentTable
                    works={contentWorks}
                    expandedWork={expandedWork}
                    onToggle={(workId) => setExpandedWork((current) => (current === workId ? null : workId))}
                  />
                </Win>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <Win title="RETENÇÃO POR PÁGINA.EXE">
                    <RetentionBars rows={data.pageRetention} />
                  </Win>

                  <Win title="FINANCEIRO DA JANELA.EXE">
                    <dl className="grid gap-3 font-body text-sm">
                      <FinanceRow label="Doações" value={brl(Number(data.netDonationsBrl))} />
                      <FinanceRow label="Membros" value={brl(Number(data.netMembershipsBrl))} />
                      <FinanceRow label="Saques" value={brl(Number(data.netWithdrawalsBrl))} />
                      <FinanceRow label="Saldo disponível" value={brl(Number(data.walletBalanceBrl))} highlight />
                    </dl>
                  </Win>
                </div>
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
                          <div className="flex flex-wrap items-center gap-4">
                            <Metric label="Leituras" value={number(work.reads)} />
                            <Metric label="Leitores únicos" value={number(work.uniqueReaders)} />
                            <Metric label="Capítulos" value={number(work.chapters.length)} />
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                              <thead>
                                <tr className="border-b-2 border-[var(--mn-line)] font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
                                  <th className="py-1.5 pr-3">Capítulo</th>
                                  <th className="py-1.5 pr-3">Leituras</th>
                                  <th className="py-1.5">Leitores únicos</th>
                                </tr>
                              </thead>
                              <tbody>
                                {work.chapters.length === 0 && (
                                  <tr>
                                    <td colSpan={3} className="py-2 font-body text-xs text-[var(--mn-mute)]">
                                      Nenhum capítulo cadastrado.
                                    </td>
                                  </tr>
                                )}
                                {work.chapters.map((chapter) => (
                                  <tr key={chapter.chapterId} className="border-b border-[var(--mn-line)] font-body text-sm">
                                    <td className="py-1.5 pr-3 text-[var(--mn-paper)]">
                                      <span className="tabular-nums">#{chapter.chapterNumber}</span> {chapter.title}
                                    </td>
                                    <td className="py-1.5 pr-3 tabular-nums text-[var(--mn-paper)]">{number(chapter.reads)}</td>
                                    <td className="py-1.5 tabular-nums text-[var(--mn-paper)]">{number(chapter.uniqueReaders)}</td>
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
          <aside className="space-y-4">
            <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg uppercase text-[var(--mn-paper)]">Em tempo real</h2>
                <span className="inline-flex items-center gap-1.5 font-pixel text-[10px] uppercase text-[var(--mn-ok)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--mn-ok)]" /> ao vivo
                </span>
              </div>

              <p className="mt-4 font-display text-3xl text-[var(--mn-paper)] tabular-nums">{number(realtimeTotal)}</p>
              <p className="font-body text-xs text-[var(--mn-mute)]">Leituras nas últimas 48 horas</p>

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
                        {number(work.reads)}
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
                A retenção cai quando o capítulo demora a engatar. Compare a página em que os leitores
                param com o gancho do capítulo seguinte.
              </p>
              <Button variant="ghost" onClick={() => setTab('content')} className="mt-3 !border-[var(--mn-ink)] !text-[var(--mn-ink)]">
                <TrendingUp size={14} className="mr-1" /> VER CONTEÚDO
              </Button>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-4">
      <p className="font-pixel text-[10px] uppercase text-[var(--mn-mute)] flex items-center gap-1.5">
        {icon} {label}
      </p>
      <p className="font-display text-2xl text-[var(--mn-paper)] mt-2 break-words tabular-nums">{value}</p>
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
    <div className={`flex justify-between border-b py-1 ${highlight ? 'border-[var(--mn-yellow)]' : 'border-[var(--mn-line)]'}`}>
      <dt className="text-[var(--mn-mute)]">{label}</dt>
      <dd className={`tabular-nums ${highlight ? 'text-[var(--mn-yellow)]' : 'text-[var(--mn-paper)]'}`}>{value}</dd>
    </div>
  );
}

/** Área/linha de leituras por dia — SVG puro, sem dependência de gráfico. */
function ReadsChart({ data }: { data: { date: string; reads: number }[] }) {
  const width = 760;
  const height = 230;
  const padX = 36;
  const padY = 18;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const max = Math.max(1, ...data.map((day) => Number(day.reads)));
  const x = (index: number) => padX + (data.length <= 1 ? innerW / 2 : (index / (data.length - 1)) * innerW);
  const y = (value: number) => padY + innerH - (value / max) * innerH;
  const points = data.map((day, index) => `${x(index)},${y(Number(day.reads))}`);
  const line = points.length > 0 ? `M${points.join(' L')}` : '';
  const area = points.length > 0 ? `${line} L${x(data.length - 1)},${padY + innerH} L${x(0)},${padY + innerH} Z` : '';
  const grid = [0, 0.5, 1].map((factor) => y(max * factor));

  if (data.length === 0) {
    return <p className="font-pixel text-xs uppercase text-[var(--mn-mute)]">Sem leituras no período.</p>;
  }

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Leituras por dia">
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
        {line && <path d={line} fill="none" stroke="#FFD400" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
        {data.map((day, index) => (
          <circle key={day.date} cx={x(index)} cy={y(Number(day.reads))} r={2} fill="#FFD400">
            <title>{`${dayLabel(day.date)}: ${number(Number(day.reads))} leitura(s)`}</title>
          </circle>
        ))}
        <text x={padX} y={height - 2} fill="#A9A59A" fontSize="10">
          {dayLabel(data[0].date)}
        </text>
        <text x={width - padX} y={height - 2} fill="#A9A59A" fontSize="10" textAnchor="end">
          {dayLabel(data[data.length - 1].date)}
        </text>
        <text x={padX - 6} y={padY + 4} fill="#A9A59A" fontSize="10" textAnchor="end">
          {max}
        </text>
        <text x={padX - 6} y={padY + innerH} fill="#A9A59A" fontSize="10" textAnchor="end">
          0
        </text>
      </svg>
    </div>
  );
}

/** Barras das 48 horas (painel em tempo real). */
function RealtimeBars({ data }: { data: { hour: string; reads: number }[] }) {
  if (data.length === 0) {
    return <p className="mt-3 font-pixel text-[10px] uppercase text-[var(--mn-mute)]">Sem dados em tempo real.</p>;
  }
  const max = Math.max(1, ...data.map((hour) => Number(hour.reads)));
  return (
    <div className="mt-3">
      <div className="flex h-24 items-end gap-[2px]">
        {data.map((hour) => (
          <div
            key={hour.hour}
            className="flex-1 bg-[var(--mn-yellow)]"
            style={{ height: `${Math.max(3, (Number(hour.reads) / max) * 100)}%`, opacity: Number(hour.reads) === 0 ? 0.25 : 1 }}
            title={`${hourLabel(hour.hour)} · ${number(Number(hour.reads))} leitura(s)`}
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

/** Retenção por página em barras horizontais. */
function RetentionBars({ rows }: { rows: { page: number; readers: number; retentionPercent: number }[] }) {
  if (rows.length === 0) {
    return <p className="font-pixel text-xs uppercase text-[var(--mn-mute)]">Sem dados de retenção.</p>;
  }
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.page} className="flex items-center gap-3">
          <span className="w-16 font-pixel text-[11px] text-[var(--mn-mute)]">PÁG. {row.page}</span>
          <span className="h-3 bg-[var(--mn-teal)]" style={{ width: `${Math.min(100, row.retentionPercent)}%` }} />
          <span className="font-pixel text-[11px] text-[var(--mn-paper)] tabular-nums">
            {number(row.readers)} ({row.retentionPercent.toFixed(0)}%)
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Tabela "conteúdo principal" com expansão dos capítulos de cada obra. */
function ContentTable({
  works,
  expandedWork,
  onToggle,
}: {
  works: CreatorAnalyticsDto['works'];
  expandedWork: string | null;
  onToggle: (workId: string) => void;
}) {
  const list = works ?? [];
  if (list.length === 0) {
    return <p className="font-pixel text-xs uppercase text-[var(--mn-mute)]">Nenhuma obra publicada ainda.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-[var(--mn-line)] font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
            <th className="py-2 pr-3">Obra</th>
            <th className="py-2 pr-3">Leituras</th>
            <th className="py-2 pr-3">Leitores únicos</th>
            <th className="py-2">Capítulos</th>
          </tr>
        </thead>
        <tbody>
          {list.map((work) => {
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
                      <span className="text-[var(--mn-paper)]">{work.title}</span>
                      <ChevronDown
                        size={14}
                        className={`text-[var(--mn-mute)] transition-transform ${expanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-[var(--mn-paper)]">{number(work.reads)}</td>
                  <td className="py-2 pr-3 tabular-nums text-[var(--mn-paper)]">{number(work.uniqueReaders)}</td>
                  <td className="py-2 tabular-nums text-[var(--mn-mute)]">{number(work.chapters.length)}</td>
                </tr>
                {expanded && (
                  <tr className="border-b border-[var(--mn-line)] bg-[var(--mn-ink)]">
                    <td colSpan={4} className="px-3 py-3">
                      {work.chapters.length === 0 ? (
                        <p className="font-body text-xs text-[var(--mn-mute)]">Nenhum capítulo cadastrado.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {work.chapters.map((chapter) => (
                            <li key={chapter.chapterId} className="flex items-center justify-between gap-3 font-body text-xs">
                              <span className="min-w-0 truncate text-[var(--mn-paper)]">
                                <BookOpen size={12} className="mr-1 inline text-[var(--mn-yellow)]" />
                                <span className="tabular-nums">#{chapter.chapterNumber}</span> {chapter.title}
                              </span>
                              <span className="shrink-0 tabular-nums text-[var(--mn-mute)]">
                                {number(chapter.reads)} leituras · {number(chapter.uniqueReaders)} leitores
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
