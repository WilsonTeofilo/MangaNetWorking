import { Check } from 'lucide-react';
import { Win } from '../ui/Win';
import { CreatorMissionDto } from '../../api/creatorApi';

/**
 * Painel de MissÃµes & Ganhos do criador (bloco apresentacional).
 *
 * Recebe os dados jÃ¡ calculados pelo servidor e nÃ£o recalcula progresso, recompensa nem
 * saldo. ExtraÃ­do do container do workspace para que cada arquivo tenha uma
 * responsabilidade sÃ³.
 */
export interface CreatorMissionsPanelProps {
  missions: CreatorMissionDto[];
  boostMultiplier: number;
  walletBalanceBrl: number;
  totalDonationsBrl: number;
  monthlyMembersCount: number;
  membershipPriceBrl: number;
}

/** Formata valores monetÃ¡rios em reais (pt-BR). */
function formatBrl(value: number): string {
  if (!Number.isFinite(value)) return 'R$ â€”';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function CreatorMissionsPanel({
  missions,
  boostMultiplier,
  walletBalanceBrl,
  totalDonationsBrl,
  monthlyMembersCount,
  membershipPriceBrl,
}: CreatorMissionsPanelProps) {
  return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* Janela de Missões Semanais */}
        <Win title="QUEST_SEMANAL.EXE">
          <div className="space-y-4">
            <div className="border-b border-[var(--mn-line)] pb-2">
              <span className="font-pixel text-[12px] text-[var(--mn-yellow)]">
                MISSÕES ATIVAS
              </span>
            </div>

            {missions.length > 0 && (
              <div className="space-y-3">
                {missions.map((mission) => (
                  <div
                    key={mission.id}
                    className={`p-3 border-2 space-y-1 ${
                      mission.completed
                        ? 'border-[var(--mn-ink)] bg-[var(--mn-ink)]'
                        : 'border-[var(--mn-line)] bg-[var(--mn-ink-2)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm text-[var(--mn-paper)] uppercase">
                        {mission.title}
                      </span>
                      {mission.completed ? (
                        <Check size={16} className="text-[var(--mn-yellow)]" />
                      ) : (
                        <span className="font-pixel text-[12px] text-[var(--mn-mute)]">EM PROGRESSO</span>
                      )}
                    </div>
                    {mission.description && (
                      <p className="font-body text-xs text-[var(--mn-mute)]">{mission.description}</p>
                    )}
                    <span className="font-pixel text-[12px] text-[var(--mn-yellow)] block mt-1">
                      PROGRESSO: {mission.currentProgress}/{mission.targetGoal}
                    </span>
                    {mission.boostRewardMultiplier ? (
                      <span className="font-pixel text-[12px] text-[var(--mn-yellow)] block">
                        RECOMPENSA: +{Math.round((mission.boostRewardMultiplier - 1) * 100)}% DESCOBERTA
                        NO FEED POR {mission.boostDurationHours ?? 48}H
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            {/* Fallback de demonstração quando o servidor não devolve missões (sem sessão de criador). */}
            {import.meta.env.DEV && missions.length === 0 && (
            <div className="space-y-3">
              <div className="p-3 border-2 border-[var(--mn-ink)] bg-[var(--mn-ink)] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm text-[var(--mn-paper)] uppercase">
                    1. CONSISTÊNCIA DE LANÇAMENTO
                  </span>
                  <Check size={16} className="text-[var(--mn-yellow)]" />
                </div>
                <p className="font-body text-xs text-[var(--mn-mute)]">
                  Publicar ao menos 1 capítulo novo nesta semana.
                </p>
                <span className="font-pixel text-[12px] text-[var(--mn-yellow)] block mt-1">
                  RECOMPENSA: +15% DESCOBERTA NO FEED POR 48H
                </span>
              </div>

              <div className="p-3 border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm text-[var(--mn-paper)] uppercase">
                    2. DIÁLOGO COM A COMUNIDADE
                  </span>
                  <span className="font-pixel text-[12px] text-[var(--mn-mute)]">EM PROGRESSO</span>
                </div>
                <p className="font-body text-xs text-[var(--mn-mute)]">
                  Responder 5 comentários de leitores nas suas obras.
                </p>
                <span className="font-pixel text-[12px] text-[var(--mn-mute)] block mt-1">
                  PROGRESSO: 3/5 COMENTÁRIOS
                </span>
              </div>

              <div className="p-3 border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm text-[var(--mn-paper)] uppercase">
                    3. RETENÇÃO DO LEITOR
                  </span>
                  <span className="font-pixel text-[12px] text-[var(--mn-mute)]">BLOQUEADO</span>
                </div>
                <p className="font-body text-xs text-[var(--mn-mute)]">
                  Alcançar 1.000 leituras completas em capítulos gratuitos.
                </p>
              </div>
            </div>
            )}
          </div>
        </Win>

        {/* Janela de Ganhos Financeiros Transparentes */}
        <Win title="GANHOS.EXE">
          <div className="space-y-4">
            <div className="border-b border-[var(--mn-line)] pb-2">
              <span className="font-pixel text-[12px] text-[var(--mn-yellow)]">
                DIVISÃO FINANCEIRA REAL (SERVIDOR)
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-[var(--mn-ink)] border border-[var(--mn-line)]">
                <span className="font-body text-xs text-[var(--mn-mute)]">DOAÇÕES DIRETAS PIX RECEBIDAS</span>
                <span className="font-display text-lg text-[var(--mn-yellow)] tabular-nums">
                  {totalDonationsBrl == null ? '—' : formatBrl(totalDonationsBrl)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-[var(--mn-ink)] border border-[var(--mn-line)]">
                <span className="font-body text-xs text-[var(--mn-mute)]">MEMBROS ATIVOS NO CLUBE</span>
                <span className="font-display text-lg text-[var(--mn-yellow)] tabular-nums">
                  {monthlyMembersCount ?? '—'}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-[var(--mn-ink)] border border-[var(--mn-line)]">
                <span className="font-body text-xs text-[var(--mn-mute)]">PREÇO DA ASSINATURA MENSAL</span>
                <span className="font-display text-lg text-[var(--mn-yellow)] tabular-nums">
                  {membershipPriceBrl == null ? '—' : formatBrl(membershipPriceBrl)}
                </span>
              </div>

              <div className="p-3 border-2 border-[var(--mn-yellow)] bg-[var(--mn-yellow)] text-[var(--mn-ink)] flex justify-between items-center">
                <span className="font-display text-sm uppercase">SALDO DISPONÍVEL PARA SAQUE</span>
                <span className="font-display text-2xl tabular-nums">
                  {walletBalanceBrl == null ? '—' : formatBrl(walletBalanceBrl)}
                </span>
              </div>
            </div>

            {boostMultiplier > 1 && (
              <span className="font-pixel text-[12px] text-[var(--mn-ok)] block">
                BOOST ATIVO: {boostMultiplier.toFixed(1)}x NO FEED DE DESCOBERTA
              </span>
            )}

            <p className="font-body text-[12px] text-[var(--mn-mute)] leading-relaxed pt-1">
              * Taxa padrão de 17% retida para infraestrutura e servidores. Ao alcançar o Nível 4 na Season, a taxa cai para 10% por 15 dias.
            </p>
          </div>
        </Win>

      </div>
  );
}

