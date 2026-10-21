import { useEffect, useState } from 'react';
import { BarChart3, Eye, Heart, Users, Wallet } from 'lucide-react';
import { creatorAnalyticsApi, CreatorAnalyticsDto } from '../api/creatorAnalyticsApi';
import { Button } from '../components/ui/Button';
import { Win } from '../components/ui/Win';

/**
 * Página de Analytics do criador.
 *
 * Separada do workspace: cada painel do criador tem a própria tela e o próprio endpoint
 * (`GET /api/creators/analytics`). Nenhum número é inventado no front — o que o servidor
 * não devolve aparece como zero.
 */
export function CreatorAnalyticsPage() {
  const [data, setData] = useState<CreatorAnalyticsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    let active = true;
    setLoading(true);
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

  const brl = (value: number) =>
    Number.isFinite(value) ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ —';

  const totalReads = (data?.readsPerDay ?? []).reduce((sum, day) => sum + Number(day.reads), 0);
  const uniqueReaders = (data?.readsPerDay ?? []).reduce((sum, day) => sum + Number(day.uniqueReaders), 0);
  const maxReads = Math.max(1, ...(data?.readsPerDay ?? []).map((day) => Number(day.reads)));

  return (
    <section className="mn-container py-10 space-y-8">
      <header className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-6 shadow-[6px_6px_0_var(--mn-yellow)]">
        <p className="font-pixel text-[11px] tracking-widest text-[var(--mn-mute)] uppercase">Criador</p>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase mt-1 flex items-center gap-3">
          <BarChart3 size={28} className="text-[var(--mn-yellow)]" /> Analytics
        </h1>
        <p className="mt-2 text-sm text-[var(--mn-mute)]">
          Leituras, leitores únicos, retenção por página e resultado financeiro da janela selecionada.
        </p>
        <div className="mt-4 flex gap-2">
          {[7, 30, 90].map((option) => (
            <Button
              key={option}
              onClick={() => setDays(option)}
              variant={days === option ? 'primary' : 'ghost'}
              aria-pressed={days === option}
            >
              {option} DIAS
            </Button>
          ))}
        </div>
      </header>

      {error && (
        <p role="alert" className="border-2 border-[var(--mn-red)] bg-[var(--mn-ink-2)] p-4 text-[var(--mn-paper)]">
          {error}
        </p>
      )}

      {loading && <p className="font-pixel text-xs text-[var(--mn-mute)] uppercase">Carregando analytics...</p>}

      {data && !loading && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Eye size={16} />} label="Leituras" value={String(totalReads)} />
            <StatCard icon={<Users size={16} />} label="Leitores únicos" value={String(uniqueReaders)} />
            <StatCard icon={<Wallet size={16} />} label="Receita líquida" value={brl(Number(data.netEarningsBrl))} />
            <StatCard icon={<Heart size={16} />} label="Membros" value={String(data.monthlyMembersCount)} />
          </div>

          <Win title="LEITURAS POR DIA.EXE">
            <ul className="space-y-2">
              {(data.readsPerDay ?? []).length === 0 && (
                <li className="font-pixel text-xs text-[var(--mn-mute)] uppercase">Sem leituras no período.</li>
              )}
              {(data.readsPerDay ?? []).map((day) => (
                <li key={day.date} className="flex items-center gap-3">
                  <span className="font-pixel text-[11px] text-[var(--mn-mute)] w-24">{day.date}</span>
                  <span className="h-3 bg-[var(--mn-yellow)]" style={{ width: `${(Number(day.reads) / maxReads) * 100}%` }} />
                  <span className="font-pixel text-[11px] text-[var(--mn-paper)]">{day.reads}</span>
                </li>
              ))}
            </ul>
          </Win>

          <Win title="RETENÇÃO POR PÁGINA.EXE">
            <ul className="space-y-2">
              {(data.pageRetention ?? []).length === 0 && (
                <li className="font-pixel text-xs text-[var(--mn-mute)] uppercase">Sem dados de retenção.</li>
              )}
              {(data.pageRetention ?? []).map((row) => (
                <li key={row.page} className="flex items-center gap-3">
                  <span className="font-pixel text-[11px] text-[var(--mn-mute)] w-16">PÁG. {row.page}</span>
                  <span className="h-3 bg-[var(--mn-teal)]" style={{ width: `${Math.min(100, row.retentionPercent)}%` }} />
                  <span className="font-pixel text-[11px] text-[var(--mn-paper)]">
                    {row.readers} ({row.retentionPercent.toFixed(0)}%)
                  </span>
                </li>
              ))}
            </ul>
          </Win>

          <Win title="FINANCEIRO DA JANELA.EXE">
            <dl className="grid sm:grid-cols-2 gap-3 font-body text-sm">
              <div className="flex justify-between border-b border-[var(--mn-line)] py-1">
                <dt className="text-[var(--mn-mute)]">Doações</dt>
                <dd className="text-[var(--mn-paper)]">{brl(Number(data.netDonationsBrl))}</dd>
              </div>
              <div className="flex justify-between border-b border-[var(--mn-line)] py-1">
                <dt className="text-[var(--mn-mute)]">Membros</dt>
                <dd className="text-[var(--mn-paper)]">{brl(Number(data.netMembershipsBrl))}</dd>
              </div>
              <div className="flex justify-between border-b border-[var(--mn-line)] py-1">
                <dt className="text-[var(--mn-mute)]">Saques</dt>
                <dd className="text-[var(--mn-paper)]">{brl(Number(data.netWithdrawalsBrl))}</dd>
              </div>
              <div className="flex justify-between border-b border-[var(--mn-line)] py-1">
                <dt className="text-[var(--mn-mute)]">Saldo</dt>
                <dd className="text-[var(--mn-paper)]">{brl(Number(data.walletBalanceBrl))}</dd>
              </div>
            </dl>
          </Win>
        </>
      )}
    </section>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-4">
      <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)] flex items-center gap-1.5">
        {icon} {label}
      </p>
      <p className="font-display text-2xl text-[var(--mn-paper)] mt-2 break-words">{value}</p>
    </div>
  );
}
