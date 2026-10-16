import { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Trash2, ArrowLeft, RefreshCw } from 'lucide-react';
import { reportApi, PendingReportItem } from '../api/reportApi';
import { Button } from '../components/ui/Button';

interface ModerationBackofficePageProps {
  onBack: () => void;
}

export function ModerationBackofficePage({ onBack }: ModerationBackofficePageProps) {
  const [reports, setReports] = useState<PendingReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadReports = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await reportApi.getPendingReports();
      setReports(data);
    } catch (error) {
      setReports([]);
      setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar a fila de denúncias.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleSuspend = async (workId: string, workTitle: string, reportId: string) => {
    if (!window.confirm(`CONFIRMAÇÃO EDITORIAL: Suspender cautelarmente a obra "${workTitle}" da plataforma? Ela desaparecerá imediatamente do catálogo e do feed.`)) {
      return;
    }
    setActionError(false);
    try {
      await reportApi.suspendWork(workId, `Suspensão aplicada via Backoffice após análise da denúncia ${reportId}`);
      setActionMessage(`Obra "${workTitle}" foi suspensa cautelarmente.`);
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (error) {
      setActionError(true);
      setActionMessage(error instanceof Error ? error.message : 'Falha ao suspender a obra.');
    }
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleDismiss = async (reportId: string) => {
    setActionError(false);
    try {
      await reportApi.dismissReport(reportId, 'Denúncia considerada improcedente após verificação dos editores.');
      setActionMessage('Denúncia arquivada com sucesso.');
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (error) {
      setActionError(true);
      setActionMessage(error instanceof Error ? error.message : 'Falha ao arquivar a denúncia.');
    }
    setTimeout(() => setActionMessage(null), 4000);
  };

  return (
    <div className="mn-container py-8 space-y-8 select-none pb-24">
      {/* Header da Moderação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#34343A] pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 bg-[#151517] border-2 border-[#34343A] text-[#A9A59A] hover:text-[#FFD400] hover:border-[#FFD400] transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[11px] uppercase tracking-widest text-[#E63946] font-bold">
                CANAL RESTRITO DE INVESTIGAÇÃO
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-[#F4EFE3] uppercase">
              MESA DE MODERAÇÃO EDITORIAL
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={loadReports}
            disabled={isLoading}
            className="flex items-center gap-2 !text-xs !py-2"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>ATUALIZAR FILA</span>
          </Button>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="p-4 bg-[#E8402F] text-white border-2 border-[#0B0B0C] font-body text-sm">
          {loadError}
        </div>
      )}

      {actionMessage && (
        <div role={actionError ? 'alert' : 'status'} className={`p-4 border-2 border-[#0B0B0C] shadow-[4px_4px_0_#0B0B0C] font-display text-sm uppercase flex items-center gap-2 ${actionError ? 'bg-[#E8402F] text-white' : 'bg-[#FFD400] text-[#0B0B0C]'}`}>
          {actionError ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border-2 border-[#34343A] bg-[#151517] p-4">
          <span className="font-pixel text-[10px] text-[#A9A59A] uppercase block">DENÚNCIAS PENDENTES</span>
          <span className="font-display text-3xl text-[#FFD400]">{reports.length}</span>
        </div>
        <div className="border-2 border-[#E63946] bg-[#151517] p-4">
          <span className="font-pixel text-[10px] text-[#E63946] uppercase block">PIRATARIA & SCANLATION</span>
          <span className="font-display text-3xl text-[#E63946]">
            {reports.filter(r => r.reason.includes('PIRACY') || r.reason.includes('COPYRIGHT')).length}
          </span>
        </div>
        <div className="border-2 border-[#34343A] bg-[#151517] p-4">
          <span className="font-pixel text-[10px] text-[#A9A59A] uppercase block">SLA DE RESPOSTA</span>
          <span className="font-display text-3xl text-[#3DDC84]">&lt; 24H</span>
        </div>
      </div>

      {/* Lista de Casos em Triagem */}
      <div className="space-y-4">
        <h2 className="font-display text-xl text-[#F4EFE3] uppercase flex items-center gap-2">
          <ShieldAlert size={18} className="text-[#E63946]" />
          <span>FILA DE INVESTIGAÇÃO DE OBRAS</span>
        </h2>

        {isLoading && <p role="status" className="font-body text-sm text-[#A9A59A]">Carregando a fila...</p>}
        {reports.length === 0 && !isLoading && !loadError ? (
          <div className="p-10 border-2 border-dashed border-[#34343A] text-center space-y-2 bg-[#151517]">
            <CheckCircle2 size={32} className="text-[#3DDC84] mx-auto" />
            <h4 className="font-display text-lg text-[#F4EFE3] uppercase">NENHUMA DENÚNCIA PENDENTE</h4>
            <p className="font-body text-xs text-[#A9A59A]">A fila está vazia no momento; novas denúncias aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((rep) => (
              <div
                key={rep.id}
                className="border-2 border-[#34343A] bg-[#151517] p-5 shadow-[4px_4px_0_#34343A] flex flex-col md:flex-row gap-6 items-start justify-between"
              >
                <div className="flex gap-4 items-start">
                  {rep.workCoverUrl && (
                    <img
                      src={rep.workCoverUrl}
                      alt={rep.workTitle}
                      className="w-16 h-24 object-cover border-2 border-[#0B0B0C] shrink-0"
                    />
                  )}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 bg-[#E63946] text-[#FFFFFF] font-pixel text-[10px] uppercase font-bold">
                        {rep.reason}
                      </span>
                      {rep.chapterNumber && (
                        <span className="px-2 py-0.5 bg-[#0B0B0C] border border-[#34343A] text-[#FFD400] font-pixel text-[10px]">
                          CAP. #{rep.chapterNumber}
                        </span>
                      )}
                      <span className="font-body text-[11px] text-[#A9A59A]">
                        Recebido em {new Date(rep.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <h3 className="font-display text-2xl text-[#F4EFE3] uppercase">
                      {rep.workTitle}
                    </h3>

                    <div className="bg-[#0B0B0C] border border-[#34343A] p-3 max-w-2xl">
                      <span className="font-pixel text-[10px] text-[#A9A59A] uppercase block mb-1">
                        EVIDÊNCIAS APRESENTADAS PELO DENUNCIANTE:
                      </span>
                      <p className="font-body text-xs text-[#F4EFE3] leading-relaxed break-words">
                        {rep.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Ações da Moderação */}
                <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto pt-2 md:pt-0">
                  <Button
                    variant="danger"
                    onClick={() => handleSuspend(rep.workId, rep.workTitle, rep.id)}
                    className="flex items-center justify-center gap-2 !text-xs !py-2.5 !px-4"
                  >
                    <AlertTriangle size={14} />
                    <span>SUSPENDER OBRA</span>
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => handleDismiss(rep.id)}
                    className="flex items-center justify-center gap-2 !text-xs !py-2.5 !px-4"
                  >
                    <Trash2 size={14} />
                    <span>ARQUIVAR DENÚNCIA</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
