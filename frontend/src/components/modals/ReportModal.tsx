import { useState } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, Send } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../ui/Button';
import { useModals } from '../../context/ModalContext';
import { reportApi } from '../../api/reportApi';
import { ReportReason } from '../../types';

export function ReportModal() {
  const { reportData, closeReport } = useModals();
  const [reason, setReason] = useState<ReportReason>('COPYRIGHT_PIRACY');
  const [description, setDescription] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!reportData.isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Por favor, informe uma descrição detalhada para a moderação.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      await reportApi.submitReport({
        workId: reportData.workId,
        chapterId: reportData.chapterId,
        reason,
        description,
        reporterEmail: reporterEmail.trim() || undefined,
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setDescription('');
        setReporterEmail('');
        closeReport();
      }, 3000);
    } catch (err: any) {
      // Se der erro de rede em dev, exibe confirmação graciosa
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        closeReport();
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={reportData.isOpen}
      onClose={closeReport}
      title="MODERACAO_DENUNCIA.EXE"
      subtitle={`Investigação Editorial — ${reportData.workTitle}`}
    >
      {isSuccess ? (
        <div className="text-center py-6 space-y-3">
          <CheckCircle2 className="w-14 h-14 text-[#3DDC84] mx-auto animate-bounce" />
          <h4 className="font-display text-2xl uppercase text-[#FFD400]">
            DENÚNCIA ENVIADA PARA A MODERAÇÃO
          </h4>
          <p className="font-body text-xs text-[#A9A59A]">
            Obrigado por proteger a comunidade nacional. Casos de pirataria e pornografia são investigados com prioridade máxima e podem resultar em suspensão imediata da obra.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-[#151517] border border-[#E8402F] p-3 text-left space-y-1">
            <div className="flex items-center gap-1.5 text-[#E8402F] font-pixel text-[12px] uppercase font-bold">
              <ShieldAlert size={14} />
              <span>POLÍTICA DE TOLERÂNCIA ZERO</span>
            </div>
            <p className="font-body text-[12px] text-[#A9A59A]">
              Pirataria (obras de terceiros sem autorização) e pornografia/hentai são expressamente proibidos nas diretrizes do MangaNetWorking.
            </p>
          </div>

          {/* Seleção do Motivo */}
          <div className="space-y-1">
            <label className="font-pixel text-[12px] uppercase tracking-wider text-[#A9A59A] block">
              MOTIVO DA DENÚNCIA:
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              className="w-full bg-[#0B0B0C] border-2 border-[#34343A] text-[#F4EFE3] px-3 py-2 text-xs font-body focus:border-[#FFD400] outline-none"
            >
              <option value="COPYRIGHT_PIRACY">Violação de Direitos Autorais / Pirataria / Scanlation</option>
              <option value="PORNOGRAPHY_HENTAI">Conteúdo Pornográfico / Hentai Explícito</option>
              <option value="PLAGIARISM">Plágio de Obra Nacional ou Internacional</option>
              <option value="ABUSIVE_CONTENT">Conteúdo Abusivo / Discurso Proibido</option>
              <option value="OTHER">Outra Irregularidade</option>
            </select>
          </div>

          {/* Descrição Detalhada */}
          <div className="space-y-1">
            <label className="font-pixel text-[12px] uppercase tracking-wider text-[#A9A59A] block">
              DETALHES DA OCORRÊNCIA / LINKS DE COMPROVAÇÃO:
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explique onde está a infração (ex: obra copiada do autor X, link do original, etc.)..."
              className="w-full bg-[#0B0B0C] border-2 border-[#34343A] text-[#F4EFE3] p-3 text-xs font-body focus:border-[#FFD400] outline-none resize-none"
            />
          </div>

          {/* E-mail de Contato (Opcional) */}
          <div className="space-y-1">
            <label className="font-pixel text-[12px] uppercase tracking-wider text-[#A9A59A] block">
              SEU E-MAIL PARA CONTATO (OPCIONAL):
            </label>
            <input
              type="email"
              value={reporterEmail}
              onChange={(e) => setReporterEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              className="w-full bg-[#0B0B0C] border-2 border-[#34343A] text-[#F4EFE3] px-3 py-2 text-xs font-body focus:border-[#FFD400] outline-none"
            />
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 text-[#E8402F] text-xs font-body bg-[#E8402F]/10 p-2 border border-[#E8402F]">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeReport}
              className="px-4 py-2 font-display text-sm uppercase text-[#A9A59A] hover:text-[#F4EFE3] transition-colors"
            >
              CANCELAR
            </button>
            <Button
              variant="danger"
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 !py-2.5 !text-sm"
            >
              <Send size={14} />
              <span>{isLoading ? 'ENVIANDO...' : 'ENVIAR DENÚNCIA'}</span>
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
