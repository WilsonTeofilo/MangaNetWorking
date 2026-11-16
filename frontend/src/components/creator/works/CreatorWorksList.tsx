import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { CreatorWorkSummaryDto } from '../../../api/workApi';
import { Button } from '../../ui/Button';

export interface CreatorWorksListProps {
  works: CreatorWorkSummaryDto[];
  filteredWorks: CreatorWorkSummaryDto[];
  loading: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  onOpenCreateForm: () => void;
  onEditWork: (work: CreatorWorkSummaryDto) => void;
  onRemoveWork: (work: CreatorWorkSummaryDto) => void;
}

export function CreatorWorksList({
  works,
  filteredWorks,
  loading,
  query,
  onQueryChange,
  onOpenCreateForm,
  onEditWork,
  onRemoveWork,
}: CreatorWorksListProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl text-[var(--mn-paper)] uppercase">Seu catálogo</h2>
        <div className="flex flex-wrap items-center gap-2">
          {works.length > 0 && (
            <label className="flex items-center gap-2 border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] px-3 py-2">
              <Search size={14} className="text-[var(--mn-mute)]" />
              <span className="sr-only">Buscar obra pelo título</span>
              <input
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Buscar por título"
                className="w-48 bg-transparent font-body text-sm text-[var(--mn-paper)] placeholder:text-[var(--mn-mute)] focus:outline-none"
              />
            </label>
          )}
          {works.length > 0 && (
            <Button
              variant="primary"
              onClick={onOpenCreateForm}
              className="!px-5 !py-3 shadow-[4px_4px_0_var(--mn-ink)]"
              title="Abrir o formulário para lançar uma nova obra"
            >
              <Plus size={15} /> LANÇAR NOVA OBRA
            </Button>
          )}
        </div>
      </div>

      {loading && <p className="font-pixel text-[11px] uppercase text-[var(--mn-mute)]">Carregando...</p>}
      {!loading && works.length === 0 && (
        <p className="font-body text-sm text-[var(--mn-mute)]">
          Nenhuma obra ainda. Use o formulário abaixo para lançar a primeira.
        </p>
      )}
      {!loading && works.length > 0 && filteredWorks.length === 0 && (
        <p className="font-body text-sm text-[var(--mn-mute)]">
          Nenhuma obra com esse título. Ajuste a busca ou lance uma nova obra.
        </p>
      )}

      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWorks.map((work) => (
          <li key={work.id} className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-4 space-y-3">
            <div className="flex gap-3">
              <img
                src={work.coverUrl || '/avatar-placeholder.png'}
                alt={work.title}
                className="w-20 h-28 object-cover border-2 border-[var(--mn-line)]"
              />
              <div className="min-w-0">
                <p className="font-display text-sm text-[var(--mn-paper)] uppercase break-words">{work.title}</p>
                <p className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
                  {work.status === 'draft' ? 'Rascunho' : work.status === 'completed' ? 'Concluída' : 'Em lançamento'}
                </p>
                <p className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
                  {work.totalChapters} cap · {work.totalViews} views · {work.totalLikes} curtidas · {work.totalFavorites ?? 0} favoritos
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => onEditWork(work)}>
                <Pencil size={13} /> CONFIGURAR
              </Button>
              <Button variant="ghost" onClick={() => onRemoveWork(work)}>
                <Trash2 size={13} /> REMOVER
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
