import { useState } from 'react';
import { Globe, Lock, Heart, Shield, Download, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MOCK_WORKS } from '../data/mockData';
import { Work } from '../types';
import { WorkCard } from '../components/ui/WorkCard';
import { Button } from '../components/ui/Button';

interface ReaderProfilePageProps {
  onSelectWork: (work: Work) => void;
}

export function ReaderProfilePage({ onSelectWork }: ReaderProfilePageProps) {
  const { user } = useAuth();
  const [isPublic, setIsPublic] = useState(true);

  // Obras favoritadas pelo leitor
  const likedWorks = MOCK_WORKS.filter((w: Work) => user.favorites.includes(w.id));

  const handleExportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(user, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `manganetworking-dados-${user.name.toLowerCase().replace(/\s+/g, '-')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="mn-container py-8 space-y-10 select-none pb-20">
      
      {/* 1. Header do Perfil do Leitor (Novo Design System) */}
      <div className="border-2 border-[#34343A] bg-[#151517] shadow-[6px_6px_0_#F4EFE3] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b-2 border-[#34343A] pb-6">
          
          {/* Avatar com Borda de Adesivo Off-White Ampliada (~30px maior) */}
          <div className="flex items-center gap-6">
            <div className="relative p-1.5 bg-[#F4EFE3] border-[3px] border-[#0B0B0C] shadow-[6px_6px_0_#FFD400] -rotate-1 shrink-0">
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-24 h-24 sm:w-28 sm:h-28 object-cover border-2 border-[#0B0B0C]"
              />
            </div>

            <div className="space-y-0.5">
              <span className="font-pixel text-[11px] tracking-widest text-[#FFD400] block uppercase font-bold">
                LEITOR OFICIAL
              </span>
              <h1 className="font-display text-3xl sm:text-4xl text-[#F4EFE3] uppercase">
                {user.name}
              </h1>
              <p className="font-body text-xs text-[#A9A59A] font-medium">
                @wils · Membro desde abr. de 2026
              </p>
            </div>
          </div>

          {/* Switch de Visibilidade Oficial (Conformidade LGPD) */}
          <div className="flex items-center gap-3 bg-[#0B0B0C] border-2 border-[#34343A] p-2">
            <span className="font-pixel text-[10px] text-[#A9A59A] uppercase tracking-wider pl-1">
              VISIBILIDADE:
            </span>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`px-3 py-1 font-pixel text-xs tracking-wider uppercase border-2 transition-all flex items-center gap-1.5 ${
                isPublic
                  ? 'bg-[#FFD400] text-[#0B0B0C] border-[#0B0B0C] shadow-[2px_2px_0_#0B0B0C]'
                  : 'bg-[#212125] text-[#F4EFE3] border-[#34343A]'
              }`}
            >
              {isPublic ? <Globe size={12} /> : <Lock size={12} />}
              <span>{isPublic ? 'PÚBLICO' : 'PRIVADO'}</span>
            </button>
          </div>
        </div>

        {/* 2. Destaque Monumental: 1 Número de Destaque Oficial */}
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-4 pt-2">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-6xl sm:text-7xl text-[#FFD400] leading-none tabular-nums">
              {likedWorks.length}
            </span>
            <span className="font-display text-2xl text-[#F4EFE3] uppercase tracking-wider">
              OBRAS CURTIDAS
            </span>
          </div>

          <div className="sm:ml-auto font-body text-xs text-[#A9A59A] tabular-nums">
            0 criadores apoiados · Nível 1 na Season 01
          </div>
        </div>

        {/* Texto de Apoio de Privacidade LGPD (Legível, >= 12px, >= 4.5:1) */}
        <p className="font-body text-xs text-[#A9A59A] border-t border-[#34343A] pt-4 leading-relaxed">
          Em conformidade com a LGPD, seu perfil só fica visível publicamente
          para outros leitores quando a opção "Público" estiver selecionada. Seus
          dados estão protegidos.
        </p>
      </div>

      {/* 3. Obras Favoritadas pelo Leitor */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-[#34343A] pb-3">
          <h2 className="font-display text-2xl sm:text-3xl text-[#F4EFE3] uppercase tracking-wide flex items-center gap-2">
            <Heart size={20} className="fill-[#FFD400] text-[#FFD400]" />
            OBRAS NA BANCA DO LEITOR
          </h2>
          <span className="font-pixel text-xs text-[#FFD400] tabular-nums">
            {likedWorks.length} TÍTULOS
          </span>
        </div>

        {likedWorks.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-[#34343A] bg-[#151517] space-y-2">
            <p className="font-body text-sm text-[#A9A59A]">
              Você ainda não curtiu nenhum mangá. Explore o Catálogo para favoritar seus títulos favoritos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {likedWorks.map((work) => (
              <WorkCard
                key={work.id}
                work={work}
                onSelect={onSelectWork}
                isFavorite={true}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. Direitos do Titular LGPD (Ações Transparentes) */}
      <section className="border-2 border-[#34343A] bg-[#151517] p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#34343A] pb-3">
          <Shield size={18} className="text-[#FFD400]" />
          <h3 className="font-display text-xl text-[#F4EFE3] uppercase">
            PRIVACIDADE E DADOS DO TITULAR (LGPD)
          </h3>
        </div>

        <p className="font-body text-xs text-[#A9A59A] leading-relaxed">
          Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você
          tem o direito de solicitar a exportação completa de todos os seus dados
          armazenados ou a exclusão irreversível da sua conta.
        </p>

        <div className="flex flex-wrap gap-4 pt-2">
          <Button
            variant="secondary"
            onClick={handleExportData}
            className="flex items-center gap-2 !text-xs !min-h-[40px]"
          >
            <Download size={14} />
            <span>BAIXAR MEUS DADOS (JSON)</span>
          </Button>

          <Button
            variant="danger"
            onClick={() => alert('Para excluir sua conta, entre em contato com nosso DPO em privacidade@manganetworking.com.br ou confirme no modal de segurança.')}
            className="flex items-center gap-2 !text-xs !min-h-[40px]"
          >
            <Trash2 size={14} />
            <span>EXCLUIR CONTA</span>
          </Button>
        </div>
      </section>

    </div>
  );
}
