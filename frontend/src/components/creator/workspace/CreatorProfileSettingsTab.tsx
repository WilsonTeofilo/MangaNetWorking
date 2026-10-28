import { Check, ShieldCheck } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { CreatorPrivacyAccordion } from './CreatorPrivacyAccordion';

export interface CreatorProfileSettingsTabProps {
  profileName: string;
  setProfileName: (val: string) => void;
  bio: string;
  setBio: (val: string) => void;
  instagramUrl: string;
  setInstagramUrl: (val: string) => void;
  youtubeUrl: string;
  setYoutubeUrl: (val: string) => void;
  portfolioUrl: string;
  setPortfolioUrl: (val: string) => void;
  membershipPrice: number | null;
  setMembershipPrice: (val: number | null) => void;
  declaredOriginal: boolean;
  setDeclaredOriginal: (val: boolean) => void;
  isSaving: boolean;
  saveSuccess: boolean;
  saveError: string | null;
  displayHandle: string;
  username?: string;
  onSave: (e: React.FormEvent) => void;
  onOpenPublicProfile?: (username: string) => void;
  onOpenDeclarationModal: () => void;
}

export function CreatorProfileSettingsTab({
  profileName,
  setProfileName,
  bio,
  setBio,
  instagramUrl,
  setInstagramUrl,
  youtubeUrl,
  setYoutubeUrl,
  portfolioUrl,
  setPortfolioUrl,
  membershipPrice,
  setMembershipPrice,
  declaredOriginal,
  setDeclaredOriginal,
  isSaving,
  saveSuccess,
  saveError,
  displayHandle,
  username,
  onSave,
  onOpenPublicProfile,
  onOpenDeclarationModal,
}: CreatorProfileSettingsTabProps) {
  const cleanHandle = displayHandle?.replace(/^@/, '') || username || '-';

  return (
    <div className="space-y-8 select-none">
      {/* Formulário Principal de Configurações */}
      <form
        onSubmit={onSave}
        className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-6 sm:p-8 space-y-6"
      >
        <div className="border-b-2 border-[var(--mn-line)] pb-4">
          <h2 className="font-display text-xl sm:text-2xl text-[var(--mn-paper)] uppercase tracking-wide">
            CONFIGURAÇÕES DO CRIADOR
          </h2>
          <p className="font-body text-xs text-[var(--mn-mute)] mt-1">
            Atualize sua identidade pública editorial e o valor da assinatura de membros.
          </p>
        </div>

        {/* Campos Principais: Nome e Valor de Mensalidade */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="NOME ARTÍSTICO"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="Como você assina suas obras"
          />

          <Field
            label="VALOR DA MENSALIDADE DE MEMBROS (R$)"
            type="number"
            step="0.01"
            value={membershipPrice ?? ''}
            onChange={(e) =>
              setMembershipPrice(e.target.value === '' ? null : Number(e.target.value))
            }
            helperText="Preço cobrado dos leitores para acesso antecipado"
            placeholder="Ex: 9.90"
          />
        </div>

        {/* Biografia Editorial */}
        <div className="space-y-1.5">
          <label
            htmlFor="creator-bio"
            className="font-body text-xs sm:text-sm font-semibold text-[var(--mn-paper)] uppercase block"
          >
            BIOGRAFIA EDITORIAL
          </label>
          <textarea
            id="creator-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Apresente-se aos seus leitores e conte sobre seus projetos..."
            className="w-full p-3 bg-[var(--mn-ink)] text-[var(--mn-paper)] font-body text-sm border-2 border-[var(--mn-line)] focus:border-[var(--mn-yellow)] outline-none"
          />
        </div>

        {/* Vínculo Social Integrado Sóbrio (Sem caixa ciano) */}
        <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] p-4 sm:p-5 space-y-3">
          <div>
            <h3 className="font-display text-sm text-[var(--mn-paper)] uppercase tracking-wide">
              VÍNCULOS SOCIAIS DO AUTOR
            </h3>
            <p className="font-body text-xs text-[var(--mn-mute)] mt-0.5">
              Informe <strong>pelo menos um link oficial</strong> (Instagram, YouTube ou portfólio). É a identidade externa visível aos leitores. Seu handle público é @{cleanHandle}.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <Field
              label="INSTAGRAM"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/..."
            />
            <Field
              label="YOUTUBE"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/@..."
            />
            <Field
              label="PORTFÓLIO"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://behance.net/..."
            />
          </div>
        </div>

        {/* Declaração de Autoria Original */}
        <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink)] p-4 space-y-2">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={declaredOriginal}
              onChange={(e) => setDeclaredOriginal(e.target.checked)}
              className="mt-1 w-4 h-4 accent-[var(--mn-yellow)] cursor-pointer"
            />
            <span className="font-display text-xs sm:text-sm text-[var(--mn-paper)] uppercase leading-snug">
              DECLARO QUE TODAS AS OBRAS E CAPÍTULOS PUBLICADOS NESTA CONTA SÃO DE MINHA AUTORIA ORIGINAL E NÃO VIOLAM DIREITOS DE TERCEIROS.
            </span>
          </label>

          <div className="pl-7 flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-[var(--mn-line)]">
            <span className="font-body text-[11px] text-[var(--mn-mute)]">
              Vínculo de validade jurídica conforme o Art. 184 do Código Penal.
            </span>
            <button
              type="button"
              onClick={onOpenDeclarationModal}
              className="inline-flex items-center gap-1 font-pixel text-[11px] text-[var(--mn-yellow)] hover:underline uppercase"
            >
              <ShieldCheck size={12} />
              <span>CONSULTAR TERMOS COMPLETOS</span>
            </button>
          </div>
        </div>

        {/* Ações de Envio e Feedback */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <Button
            type="submit"
            variant="primary"
            disabled={!declaredOriginal || isSaving}
            className="!px-6 !py-2.5 font-display text-sm tracking-wider uppercase"
          >
            {isSaving ? 'SALVANDO…' : 'SALVAR ALTERAÇÕES'}
          </Button>

          {saveSuccess && (
            <div
              role="status"
              className="flex items-center gap-2 border-2 border-[var(--mn-ok)] bg-[var(--mn-ink)] px-4 py-2 font-pixel text-xs text-[var(--mn-ok)]"
            >
              <Check size={14} />
              <span>DADOS SALVOS COM SUCESSO NO SERVIDOR</span>
            </div>
          )}

          {saveError && (
            <span className="font-body text-xs text-[var(--mn-red)] font-semibold">
              {saveError}
            </span>
          )}
        </div>
      </form>

      {/* Governança LGPD Colapsável no Final */}
      <CreatorPrivacyAccordion
        displayHandle={displayHandle}
        username={username}
        onOpenPublicProfile={onOpenPublicProfile}
      />
    </div>
  );
}
