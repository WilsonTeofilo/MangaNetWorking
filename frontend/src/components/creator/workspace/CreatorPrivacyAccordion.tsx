import { useState } from 'react';
import { ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { Button } from '../../ui/Button';
import { userApi } from '../../../api/authApi';

export interface CreatorPrivacyAccordionProps {
  displayHandle: string;
  username?: string;
  onOpenPublicProfile?: (username: string) => void;
}

/**
 * Ferramentas de governança e privacidade sob a LGPD (Lei 13.709/2018).
 * Alojado de forma colapsável e discreta na aba de configurações.
 */
export function CreatorPrivacyAccordion({
  displayHandle,
  username,
  onOpenPublicProfile,
}: CreatorPrivacyAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const cleanHandle = displayHandle?.replace(/^@/, '') || username || '';

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      setExportNotice(null);
      await userApi.exportMyData();
      setExportNotice('Arquivo de exportação gerado e transmitido com sucesso.');
      setTimeout(() => setExportNotice(null), 3000);
    } catch {
      setExportNotice('Falha na solicitação de exportação. Tente novamente mais tarde.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    const confirmado = window.confirm(
      'Excluir a conta apaga permanentemente seus dados, revoga as sessões e despublica as obras (Art. 18, VI da LGPD). Deseja realmente prosseguir?'
    );
    if (confirmado) {
      void userApi.deleteMyAccount();
    }
  };

  return (
    <div className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] transition-colors">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full p-4 sm:p-5 text-left select-none hover:bg-[var(--mn-ink)] transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={18} className="text-[var(--mn-mute)]" />
          <h3 className="font-display text-sm sm:text-base text-[var(--mn-paper)] uppercase tracking-wide">
            GOVERNANÇA E PRIVACIDADE (LGPD)
          </h3>
          <span className="hidden sm:inline-block font-pixel text-[10px] text-[var(--mn-mute)] border border-[var(--mn-line)] px-2 py-0.5">
            ART. 18 LGPD
          </span>
        </div>
        <div className="text-[var(--mn-mute)]">
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t-2 border-[var(--mn-line)] p-4 sm:p-6 space-y-4">
          <p className="font-body text-xs text-[var(--mn-mute)] leading-relaxed">
            Seu perfil de escritor é público por padrão para permitir que leitores encontrem seu catálogo (@{cleanHandle}).
            Em conformidade com o Art. 18 da LGPD, você pode consultar seu perfil público, realizar o download dos seus dados pessoais
            ou revogar o consentimento apagando sua conta integralmente.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenPublicProfile?.(cleanHandle)}
            >
              VER MEU PERFIL PÚBLICO
            </Button>

            <Button
              type="button"
              variant="ghost"
              disabled={isExporting}
              onClick={handleExportData}
            >
              {isExporting ? 'EXPORTANDO...' : 'EXPORTAR MEUS DADOS (LGPD)'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={handleDeleteAccount}
              className="hover:!border-[var(--mn-red)] hover:!text-[var(--mn-red)]"
            >
              EXCLUIR MINHA CONTA
            </Button>
          </div>

          {exportNotice && (
            <p className="font-pixel text-[11px] text-[var(--mn-yellow)] pt-1">
              {exportNotice}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
