import { useEffect, useState } from 'react';
import { Coins, Wallet, Users, HeartHandshake } from 'lucide-react';
import { creatorApi, CreatorWorkspaceDto } from '../api/creatorApi';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';

/**
 * Monetização do criador: chave PIX (com step-up de 2FA), preço da assinatura de membros
 * e os ganhos financeiros que o servidor devolve. Nenhum saldo é inventado no front.
 */
export function CreatorMonetizationPage() {
  const [workspace, setWorkspace] = useState<CreatorWorkspaceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    creatorApi
      .getWorkspace()
      .then((payload) => {
        if (!active || !payload) return;
        setWorkspace(payload);
        setPrice(String(payload.membershipPriceBrl ?? ''));
      })
      .catch(() => {
        if (active) setError('Entre com uma conta de criador para ver a monetização.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const brl = (value: number) =>
    Number.isFinite(value) ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ —';

  const savePrice = async () => {
    const parsed = Number(price.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Informe um valor válido para a mensalidade.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await creatorApi.updateMembershipPrice(parsed);
      setMessage('Valor da assinatura atualizado.');
    } catch {
      setError('Não foi possível salvar o valor da assinatura.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mn-container py-10 space-y-8">
      <header className="border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink-2)] p-6 shadow-[6px_6px_0_var(--mn-yellow)]">
        <p className="font-pixel text-[11px] tracking-widest text-[var(--mn-mute)] uppercase">Criador</p>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase mt-1 flex items-center gap-3">
          <Coins size={26} className="text-[var(--mn-yellow)]" /> Monetização
        </h1>
        <p className="mt-2 text-sm text-[var(--mn-mute)]">
          Split da plataforma: 83% para o autor e 17% para a MangaNetWorking. Ativar repasse exige
          maioridade, CPF e chave PIX válidos.
        </p>
      </header>

      {error && <p role="alert" className="font-pixel text-xs text-[var(--mn-red)] uppercase">{error}</p>}
      {loading && <p className="font-pixel text-xs text-[var(--mn-mute)] uppercase">Carregando...</p>}

      {workspace && !loading && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card label="Saldo" value={brl(Number(workspace.walletBalanceBrl))} icon={<Wallet size={14} />} />
            <Card label="Doações" value={brl(Number(workspace.totalDonationsBrl))} icon={<HeartHandshake size={14} />} />
            <Card label="Membros" value={String(workspace.monthlyMembersCount)} icon={<Users size={14} />} />
            <Card label="Nível" value={String(workspace.monetizationLevel)} icon={<Coins size={14} />} />
          </div>

          <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-6 space-y-4">
            <h2 className="font-display text-xl text-[var(--mn-paper)] uppercase">Assinatura de membros</h2>
            <Field
              label="VALOR DA MENSALIDADE (R$)"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <Button onClick={savePrice} disabled={saving}>SALVAR VALOR</Button>
          </div>

          <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-6 space-y-2">
            <h2 className="font-display text-xl text-[var(--mn-paper)] uppercase">Chave PIX de repasse</h2>
            <p className="font-pixel text-xs text-[var(--mn-mute)] uppercase">
              {workspace.pixKey ? `${workspace.pixKey} (${workspace.pixKeyType})` : 'Chave PIX ainda não configurada.'}
            </p>
            <p className="font-body text-xs text-[var(--mn-mute)]">
              A troca da chave PIX exige step-up de 2FA no servidor — o botão fica no painel do autor.
            </p>
          </div>

          {message && <p role="status" className="font-pixel text-xs text-[var(--mn-teal)] uppercase">{message}</p>}
        </>
      )}
    </section>
  );
}

function Card({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-4">
      <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)] flex items-center gap-1.5">
        {icon} {label}
      </p>
      <p className="font-display text-2xl text-[var(--mn-paper)] mt-2 break-words">{value}</p>
    </div>
  );
}
