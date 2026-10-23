import { useState, useMemo } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { useCatalogWorks } from '../hooks/useCatalogWorks';
import { Work, Genre } from '../types';
import { useAuth } from '../context/AuthContext';
import { WorkCard } from '../components/ui/WorkCard';
import mascotSvg from '../assets/brand/mascot-placeholder.svg';

interface CatalogPageProps {
  onSelectWork: (work: Work) => void;
}

const GENRES = [
  'Todos',
  'Shonen',
  'Seinen',
  'Ação',
  'Fantasia',
  'Sci-Fi',
  'Sobrenatural',
  'Romance',
  'Drama',
  'Comédia',
];

export function CatalogPage({ onSelectWork }: CatalogPageProps) {
  const { user, toggleFavorite } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'completed'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Catálogo real (feed) com fallback para mock.
  const catalogWorks = useCatalogWorks();

  // Filtragem reativa do Catálogo
  const filteredWorks = useMemo(() => {
    return catalogWorks.filter((work) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        work.title.toLowerCase().includes(term) ||
        work.authorName.toLowerCase().includes(term) ||
        work.synopsis.toLowerCase().includes(term) ||
        work.genres.some((g) => g.toLowerCase().includes(term));

      const matchesGenre =
        selectedGenre === 'Todos' || work.genres.includes(selectedGenre as Genre);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'ongoing' && work.status === 'ongoing') ||
        (statusFilter === 'completed' && work.status === 'completed');

      return matchesSearch && matchesGenre && matchesStatus;
    });
  }, [searchTerm, selectedGenre, statusFilter, catalogWorks]);

  return (
    <div className="w-full space-y-8 select-none pb-16">
      
      {/* 1. Cabeçalho Oficial em Bloco Amarelo (#FFD400) com Busca */}
      <section className="w-full bg-[#FFD400] text-[#0B0B0C] border-b-2 border-[#0B0B0C] py-8">
        <div className="mn-container space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="font-pixel text-[12px] tracking-wider text-[#0B0B0C] font-bold block mb-2.5">
                EDITORIAL INDEPENDENTE
              </span>
              <h1 className="font-display text-4xl sm:text-6xl text-[#0B0B0C] leading-[1.08] pt-1 uppercase">
                CATÁLOGO DE OBRAS
              </h1>
              <p className="font-body text-xs sm:text-sm text-[#0B0B0C] font-medium mt-1 max-w-xl">
                Explore todas as publicações originais com suporte financeiro
                direto aos quadrinistas, sem intermediários.
              </p>
            </div>

            {/* Barra de Busca Brutalista */}
            <div className="w-full md:w-80 relative">
              <div className="relative flex items-center">
                <Search className="absolute left-3 text-[#0B0B0C]" size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar obra, autor ou gênero..."
                  className="w-full pl-9 pr-9 py-2.5 bg-[#F4EFE3] text-[#0B0B0C] font-body text-sm border-2 border-[#0B0B0C] shadow-[3px_3px_0_#0B0B0C] focus:shadow-[5px_5px_0_#0B0B0C] outline-none placeholder-[#55524A]"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 text-[#0B0B0C] hover:scale-110"
                    aria-label="Limpar busca"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Chips de Gênero com Rolagem Horizontal */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {GENRES.map((genre) => {
              const isSelected = selectedGenre === genre;
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenre(genre)}
                  className={`px-3 py-1 font-pixel text-[12px] tracking-wider uppercase border-2 border-[#0B0B0C] whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-[#0B0B0C] text-[#FFD400] shadow-[2px_2px_0_#0B0B0C]'
                      : 'bg-transparent text-[#0B0B0C] hover:bg-[rgba(11,11,12,0.1)]'
                  }`}
                >
                  {genre}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1 font-pixel text-[12px] tracking-wider uppercase border-2 border-[#0B0B0C] flex items-center gap-1.5 whitespace-nowrap ml-auto ${
                showFilters || statusFilter !== 'all'
                  ? 'bg-[#0B0B0C] text-[#FFD400]'
                  : 'bg-transparent text-[#0B0B0C]'
              }`}
            >
              <SlidersHorizontal size={12} />
              <span>STATUS</span>
            </button>
          </div>

          {/* Filtro de Status Expansível */}
          {showFilters && (
            <div className="pt-2 flex gap-2 border-t border-[#0B0B0C]">
              {(['all', 'ongoing', 'completed'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 font-pixel text-[12px] border border-[#0B0B0C] ${
                    statusFilter === st
                      ? 'bg-[#0B0B0C] text-[#FFD400]'
                      : 'bg-[#F4EFE3] text-[#0B0B0C]'
                  }`}
                >
                  {st === 'all' ? 'TODOS OS STATUS' : st === 'ongoing' ? 'EM ANDAMENTO' : 'CONCLUÍDO'}
                </button>
              ))}
            </div>
          )}

        </div>
      </section>

      {/* 2. Grade de Obras com Container Unificado */}
      <div className="mn-container space-y-6">
        <div className="flex items-center justify-between border-b-2 border-[#34343A] pb-2 font-pixel text-[12px] text-[#A9A59A]">
          <span>EXIBINDO {filteredWorks.length} TÍTULOS</span>
          <span>ORDEM: RELEVÂNCIA</span>
        </div>

        {filteredWorks.length === 0 ? (
          /* Estado Vazio com Mascote Nanquim Oficial */
          <div className="p-12 text-center border-2 border-dashed border-[#34343A] bg-[#151517] space-y-4 max-w-lg mx-auto">
            <img
              src={mascotSvg}
              alt="Mascote Nanquim"
              className="w-20 h-24 mx-auto opacity-80"
            />
            <h3 className="font-display text-2xl text-[#FFD400] uppercase">
              NENHUMA OBRA ENCONTRADA
            </h3>
            <p className="font-body text-xs text-[#A9A59A]">
              Nem o Nanquim achou nada com esses filtros. Tente buscar por outro
              gênero ou termo.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedGenre('Todos');
                setStatusFilter('all');
              }}
              className="px-4 py-2 font-display text-sm tracking-wider uppercase bg-[#FFD400] text-[#0B0B0C] border-2 border-[#0B0B0C] shadow-[3px_3px_0_#F4EFE3] hover:scale-105 transition-transform"
            >
              LIMPAR FILTROS
            </button>
          </div>
        ) : (
          /* Grade Oficial 2:3 */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filteredWorks.map((work) => (
              <WorkCard
                key={work.id}
                work={work}
                onSelect={onSelectWork}
                isFavorite={user.favorites.includes(work.id)}
                onToggleFavorite={toggleFavorite}
                analyticsSurface={searchTerm.trim() ? 'BUSCA' : 'CATALOGO'}
                analyticsEnabled={Boolean(user.uid)}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
