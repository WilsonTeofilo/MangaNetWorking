import { useMemo } from 'react';
import { Heart, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MOCK_WORKS, MOCK_CHAPTERS } from '../data/mockData';
import { Work, Chapter } from '../types';
import { Cover } from '../components/ui/Cover';
import { Button } from '../components/ui/Button';
import mascotSvg from '../assets/brand/mascot-placeholder.svg';

interface BibliotecaPageProps {
  onSelectWork: (work: Work) => void;
  onOpenChapter: (work: Work, chapter: Chapter) => void;
  onNavigateToCatalog: () => void;
}

export function BibliotecaPage({
  onSelectWork,
  onOpenChapter,
  onNavigateToCatalog,
}: BibliotecaPageProps) {
  const { user, toggleFavorite } = useAuth();

  const favoriteCards = useMemo(() => {
    return user.favorites
      .map((workId) => {
        const obra = MOCK_WORKS.find((w) => w.id === workId) || null;
        const workChapters = MOCK_CHAPTERS.filter((c) => c.workId === workId).sort(
          (a, b) => b.number - a.number
        );
        const ultimoCap = workChapters[0] || null;
        const primeiroCap =
          [...workChapters].sort((a, b) => a.number - b.number)[0] || null;

        return {
          workId,
          obra,
          totalCapitulos: workChapters.length,
          ultimoCap,
          primeiroCap,
        };
      })
      .filter((item) => Boolean(item.obra));
  }, [user.favorites]);

  return (
    <div className="mn-container py-8 space-y-8 select-none">
      
      {/* Header da Biblioteca */}
      <header className="border-b-2 border-[#34343A] pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="font-pixel text-[12px] text-[#FFD400] tracking-widest block uppercase font-bold">
            COLEÇÃO DO LEITOR
          </span>
          <h1 className="font-display text-4xl sm:text-5xl text-[#F4EFE3] uppercase">
            MINHA BIBLIOTECA
          </h1>
          <p className="font-body text-xs sm:text-sm text-[#A9A59A] mt-1">
            Seus mangás salvos com atalho rápido para os últimos capítulos
            lançados.
          </p>
        </div>

        <div className="flex items-center gap-2 border-2 border-[#34343A] px-3 py-1.5 bg-[#151517]">
          <Heart size={16} className="fill-[#FFD400] text-[#FFD400]" />
          <span className="font-display text-lg text-[#F4EFE3] tabular-nums">
            {favoriteCards.length}
          </span>
          <span className="font-pixel text-[12px] text-[#A9A59A]">TÍTULOS</span>
        </div>
      </header>

      {/* Estado Vazio com Mascote Nanquim */}
      {favoriteCards.length === 0 ? (
        <section className="p-12 text-center border-2 border-dashed border-[#34343A] bg-[#151517] space-y-4 max-w-lg mx-auto">
          <img
            src={mascotSvg}
            alt="Mascote Nanquim"
            className="w-20 h-24 mx-auto opacity-80"
          />
          <h2 className="font-display text-2xl text-[#FFD400] uppercase">
            NADA POR AQUI AINDA
          </h2>
          <p className="font-body text-xs text-[#A9A59A]">
            Favorita uma obra no catálogo e ela cai direto aqui na sua banca
            pessoal.
          </p>
          <div className="pt-2">
            <Button variant="primary" onClick={onNavigateToCatalog}>
              EXPLORAR CATÁLOGO
            </Button>
          </div>
        </section>
      ) : (
        /* Grade de Cards da Biblioteca */
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {favoriteCards.map(({ obra, totalCapitulos, ultimoCap, primeiroCap }) => {
            if (!obra) return null;

            return (
              <article
                key={obra.id}
                className="group flex flex-col border-2 border-[#34343A] bg-[#151517] shadow-[4px_4px_0_#F4EFE3] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_#FFD400] transition-all"
              >
                {/* Capa 2:3 Clicável */}
                <div
                  className="relative cursor-pointer overflow-hidden aspect-[2/3]"
                  onClick={() => onSelectWork(obra)}
                >
                  <Cover
                    src={obra.coverUrl}
                    title={obra.title}
                    aspectRatio="2/3"
                    dropShadow={false}
                  />

                  {/* Contador de Capítulos no Canto Superior */}
                  <span className="absolute top-2 right-2 bg-[#0B0B0C] border border-[#FFD400] text-[#FFD400] px-1.5 py-0.5 font-pixel text-[12px] tabular-nums">
                    {totalCapitulos} CAPS
                  </span>
                </div>

                {/* Dados da Obra e Ações */}
                <div className="p-3 flex flex-col flex-1 justify-between gap-3">
                  <div>
                    <h3
                      onClick={() => onSelectWork(obra)}
                      className="font-display text-base leading-tight uppercase line-clamp-2 text-[#F4EFE3] group-hover:text-[#FFD400] cursor-pointer transition-colors"
                      title={obra.title}
                    >
                      {obra.title}
                    </h3>
                    <p className="font-body text-[12px] text-[#A9A59A] truncate mt-0.5">
                      por {obra.authorName}
                    </p>
                  </div>

                  {/* Ações Rápidas: Ler e Desfavoritar */}
                  <div className="pt-2 border-t border-[#34343A] flex flex-col gap-2">
                    {ultimoCap ? (
                      <button
                        type="button"
                        onClick={() => onOpenChapter(obra, ultimoCap)}
                        className="w-full py-1.5 px-2 bg-[#FFD400] text-[#0B0B0C] border border-[#0B0B0C] font-display text-xs tracking-wider uppercase hover:bg-[#E0B800] transition-colors"
                      >
                        LER #{ultimoCap.number}
                      </button>
                    ) : primeiroCap ? (
                      <button
                        type="button"
                        onClick={() => onOpenChapter(obra, primeiroCap)}
                        className="w-full py-1.5 px-2 bg-[#FFD400] text-[#0B0B0C] border border-[#0B0B0C] font-display text-xs tracking-wider uppercase hover:bg-[#E0B800] transition-colors"
                      >
                        LER DO INÍCIO
                      </button>
                    ) : null}

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => onSelectWork(obra)}
                        className="font-pixel text-[12px] text-[#A9A59A] hover:text-[#FFD400]"
                      >
                        DETALHES →
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleFavorite(obra.id)}
                        className="text-[#A9A59A] hover:text-[#E8402F] p-1"
                        title="Remover da biblioteca"
                        aria-label="Remover da biblioteca"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

    </div>
  );
}
