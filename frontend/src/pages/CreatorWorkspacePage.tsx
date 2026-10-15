import { useState } from 'react';
import { ShieldAlert, Check } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Win } from '../components/ui/Win';
import { LevelPatch } from '../components/ui/LevelPatch';
import { XpBar } from '../components/ui/XpBar';
import { Sticker } from '../components/ui/Sticker';
import { MOCK_CREATORS } from '../data/mockData';

export function CreatorWorkspacePage() {
  const creator = MOCK_CREATORS['creator-teofilo'] || Object.values(MOCK_CREATORS)[0];

  const [profileName, setProfileName] = useState(creator.name);
  const [bio, setBio] = useState(creator.bio);
  const [membershipPrice, setMembershipPrice] = useState(creator.membershipPriceBrl);
  const [avatarPreview] = useState(creator.avatarUrl);
  const [declaredOriginal, setDeclaredOriginal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="mn-container py-8 space-y-10 select-none pb-24">
      
      {/* 1. Aviso Mandatório Anti-Pirataria em Caixa de Carimbo */}
      <div className="border-2 border-[#E8402F] bg-[#E8402F]/10 p-5 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-[#E8402F]" />
          <h2 className="font-display text-lg text-[#E8402F] uppercase tracking-wide">
            AVISO MANDATÓRIO: AUTORIA ORIGINAL E TOLERÂNCIA ZERO À PIRATARIA
          </h2>
        </div>
        <p className="font-body text-xs text-[#F4EFE3] leading-relaxed">
          É <strong>estritamente proibido</strong> upar obras de terceiros, scans, mangás comerciais existentes (como Bleach, Naruto, One Piece) ou traduções não autorizadas. Infratores sofrerão <strong>remoção imediata da obra e suspensão/banimento permanente da conta</strong> nos termos do Art. 184 do Código Penal. Proibido conteúdo pornográfico explícito ou hentai.
        </p>
      </div>

      {/* 2. Topo do Painel: Season 01, Patches e XP */}
      <div className="border-2 border-[#34343A] bg-[#151517] shadow-[6px_6px_0_#F4EFE3] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-[#34343A] pb-6">
          <div className="flex items-center gap-4">
            <div className="p-1 bg-[#F4EFE3] border-2 border-[#0B0B0C] shadow-[3px_3px_0_#FFD400]">
              <img
                src={avatarPreview}
                alt={profileName}
                className="w-16 h-16 object-cover border border-[#0B0B0C]"
              />
            </div>

            <div>
              <span className="font-pixel text-[11px] text-[#FFD400] tracking-widest block uppercase font-bold">
                PAINEL DO AUTOR · SEASON 01
              </span>
              <h1 className="font-display text-3xl sm:text-4xl text-[#F4EFE3] uppercase">
                {profileName}
              </h1>
              <span className="font-body text-xs text-[#A9A59A]">
                @{creator.handle} · Faltam 23 dias para o fim da temporada
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Sticker kind="new" label="CRIADOR DA TEMPORADA" rotate={-2} />
          </div>
        </div>

        {/* Patches dos 4 Níveis e Barra de XP */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <LevelPatch level={1} isUnlocked={true} />
              <LevelPatch level={2} isUnlocked={true} />
              <LevelPatch level={3} isUnlocked={false} />
              <LevelPatch level={4} isUnlocked={false} />
            </div>

            <div className="w-full md:w-80">
              <XpBar value={340} max={500} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Grade com Janelas Retrô: Quests Semanais + Ganhos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* Janela de Missões Semanais */}
        <Win title="QUEST_SEMANAL.EXE">
          <div className="space-y-4">
            <div className="border-b border-[#34343A] pb-2">
              <span className="font-pixel text-xs text-[#FFD400]">
                MISSÕES ATIVAS (SEMANA 03)
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3 border-2 border-[#0B0B0C] bg-[#0B0B0C] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm text-[#F4EFE3] uppercase">
                    1. CONSISTÊNCIA DE LANÇAMENTO
                  </span>
                  <Check size={16} className="text-[#FFD400]" />
                </div>
                <p className="font-body text-xs text-[#A9A59A]">
                  Publicar ao menos 1 capítulo novo nesta semana.
                </p>
                <span className="font-pixel text-[10px] text-[#FFD400] block mt-1">
                  RECOMPENSA: +15% DESCOBERTA NO FEED POR 48H
                </span>
              </div>

              <div className="p-3 border-2 border-[#34343A] bg-[#151517] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm text-[#F4EFE3] uppercase">
                    2. DIÁLOGO COM A COMUNIDADE
                  </span>
                  <span className="font-pixel text-[10px] text-[#A9A59A]">EM PROGRESSO</span>
                </div>
                <p className="font-body text-xs text-[#A9A59A]">
                  Responder 5 comentários de leitores nas suas obras.
                </p>
                <span className="font-pixel text-[10px] text-[#A9A59A] block mt-1">
                  PROGRESSO: 3/5 COMENTÁRIOS
                </span>
              </div>

              <div className="p-3 border-2 border-[#34343A] bg-[#151517] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm text-[#F4EFE3] uppercase">
                    3. RETENÇÃO DO LEITOR
                  </span>
                  <span className="font-pixel text-[10px] text-[#A9A59A]">BLOQUEADO</span>
                </div>
                <p className="font-body text-xs text-[#A9A59A]">
                  Alcançar 1.000 leituras completas em capítulos gratuitos.
                </p>
              </div>
            </div>
          </div>
        </Win>

        {/* Janela de Ganhos Financeiros Transparentes */}
        <Win title="GANHOS.EXE">
          <div className="space-y-4">
            <div className="border-b border-[#34343A] pb-2">
              <span className="font-pixel text-xs text-[#FFD400]">
                DIVISÃO FINANCEIRA REAL (SERVIDOR)
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-[#0B0B0C] border border-[#34343A]">
                <span className="font-body text-xs text-[#A9A59A]">CLUBE DE MEMBROS (LÍQUIDO 83%)</span>
                <span className="font-display text-lg text-[#FFD400] tabular-nums">
                  R$ 1.240,00
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-[#0B0B0C] border border-[#34343A]">
                <span className="font-body text-xs text-[#A9A59A]">DOAÇÕES DIRETAS PIX (83%)</span>
                <span className="font-display text-lg text-[#FFD400] tabular-nums">
                  R$ 480,00
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-[#0B0B0C] border border-[#34343A]">
                <span className="font-body text-xs text-[#A9A59A]">MONETIZAÇÃO DE ANÚNCIOS (58%)</span>
                <span className="font-display text-lg text-[#FFD400] tabular-nums">
                  R$ 215,40
                </span>
              </div>

              <div className="p-3 border-2 border-[#FFD400] bg-[#FFD400] text-[#0B0B0C] flex justify-between items-center">
                <span className="font-display text-sm uppercase">SALDO DISPONÍVEL PARA SAQUE</span>
                <span className="font-display text-2xl tabular-nums">
                  R$ 1.935,40
                </span>
              </div>
            </div>

            <p className="font-body text-[11px] text-[#A9A59A] leading-relaxed pt-1">
              * Taxa padrão de 17% retida para infraestrutura e servidores. Ao alcançar o Nível 4 na Season, a taxa cai para 10% por 15 dias.
            </p>
          </div>
        </Win>

      </div>

      {/* 4. Formulário de Perfil do Autor com Declaração de Autoria */}
      <form onSubmit={handleSave} className="border-2 border-[#34343A] bg-[#151517] p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="font-display text-2xl text-[#F4EFE3] uppercase">
            CONFIGURAÇÕES DO CRIADOR
          </h2>
          <p className="font-body text-xs text-[#A9A59A] mt-0.5">
            Atualize seus dados públicos e valor da assinatura de membros.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="NOME ARTÍSTICO"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
          />

          <Field
            label="VALOR DA MENSALIDADE DE MEMBROS (R$)"
            type="number"
            step="0.01"
            value={membershipPrice}
            onChange={(e) => setMembershipPrice(Number(e.target.value))}
            helperText="Preço cobrado dos leitores para acesso antecipado"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-body text-sm font-semibold text-[#F4EFE3] block">
            BIOGRAFIA EDITORIAL
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full p-3 bg-[#151517] text-[#F4EFE3] font-body text-sm border-2 border-[#34343A] focus:border-[#F4EFE3] focus:shadow-[3px_3px_0_#FFD400] outline-none"
          />
        </div>

        {/* Declaração de Autoria Original Obrigatória (Seção 8.9) */}
        <div className="p-4 border-2 border-[#FFD400] bg-[#0B0B0C] space-y-2">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={declaredOriginal}
              onChange={(e) => setDeclaredOriginal(e.target.checked)}
              className="mt-1 w-5 h-5 accent-[#FFD400] cursor-pointer"
            />
            <span className="font-display text-sm text-[#F4EFE3] uppercase leading-snug">
              DECLARO QUE TODAS AS OBRAS E CAPÍTULOS PUBLICADOS NESTA CONTA SÃO
              DE MINHA AUTORIA ORIGINAL E NÃO VIOLAM DIREITOS DE TERCEIROS.
            </span>
          </label>
          <span className="font-body text-[11px] text-[#A9A59A] block pl-8">
            Declaração com validade jurídica vinculada ao cadastro para fins do Art. 184 do CP.
          </span>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            type="submit"
            variant="primary"
            disabled={!declaredOriginal}
            className="!px-6"
          >
            {isSaved ? 'DADOS SALVOS COM SUCESSO!' : 'SALVAR ALTERAÇÕES'}
          </Button>

          {isSaved && (
            <span className="font-pixel text-xs text-[#3DDC84] flex items-center gap-1">
              <Check size={14} /> SALVO NO SERVIDOR
            </span>
          )}
        </div>
      </form>

    </div>
  );
}
