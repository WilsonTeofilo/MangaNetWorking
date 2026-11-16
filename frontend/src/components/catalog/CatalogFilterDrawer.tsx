import { X } from 'lucide-react';
import { AUDIENCE_OPTIONS, ORDER_OPTIONS, STATUS_OPTIONS, CatalogFilters } from '../../utils/catalogFilters';

interface CatalogFilterDrawerProps {
  isOpen: boolean;
  filters: CatalogFilters;
  onClose: () => void;
  onApply: (patch: Partial<CatalogFilters> | ((prev: CatalogFilters) => CatalogFilters), mode?: 'push' | 'replace') => void;
  onClearAll: () => void;
}

export function CatalogFilterDrawer({
  isOpen,
  filters,
  onClose,
  onApply,
  onClearAll,
}: CatalogFilterDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--mn-ink)]/70"
        aria-label="Fechar filtros"
        onClick={onClose}
      />
      <aside
        id="catalog-filter-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-filter-title"
        className="relative w-full max-w-sm h-full bg-[var(--mn-paper)] text-[var(--mn-ink)] border-l-2 border-[var(--mn-ink)] overflow-y-auto"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--mn-yellow)] border-b-2 border-[var(--mn-ink)]">
          <h2 id="catalog-filter-title" className="font-display text-xl uppercase">
            Filtros
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 border-2 border-[var(--mn-ink)]"
            aria-label="Fechar filtros"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          <section className="space-y-2">
            <h3 className="font-pixel text-[12px] uppercase tracking-wider">Status</h3>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onApply({ status: option.value, page: 0 })}
                  aria-pressed={filters.status === option.value}
                  className={`px-2.5 py-1.5 font-body text-sm border-2 border-[var(--mn-ink)] text-left ${
                    filters.status === option.value
                      ? 'bg-[var(--mn-ink)] text-[var(--mn-yellow)]'
                      : 'bg-transparent'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-pixel text-[12px] uppercase tracking-wider">Público</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onApply({ publico: 'all', page: 0 })}
                aria-pressed={filters.publico === 'all'}
                className={`flex-1 px-2.5 py-1.5 font-body text-sm border-2 border-[var(--mn-ink)] ${
                  filters.publico === 'all'
                    ? 'bg-[var(--mn-ink)] text-[var(--mn-yellow)]'
                    : 'bg-transparent'
                }`}
              >
                Todos
              </button>
              {AUDIENCE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onApply({ publico: option.value, page: 0 })}
                  aria-pressed={filters.publico === option.value}
                  className={`flex-1 px-2.5 py-1.5 font-body text-sm border-2 border-[var(--mn-ink)] ${
                    filters.publico === option.value
                      ? 'bg-[var(--mn-ink)] text-[var(--mn-yellow)]'
                      : 'bg-transparent'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <label className="font-pixel text-[12px] uppercase tracking-wider block" htmlFor="catalog-order">
              Ordem
            </label>
            <select
              id="catalog-order"
              value={filters.ordem}
              onChange={(event) =>
                onApply({
                  ordem: event.target.value as (typeof ORDER_OPTIONS)[number]['value'],
                  page: 0,
                })
              }
              className="w-full px-2.5 py-2 bg-[var(--mn-paper)] border-2 border-[var(--mn-ink)] font-body text-sm"
            >
              {ORDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </section>

          {/* Filtro contextual: só faz sentido para light novel. */}
          {filters.formato === 'LIGHT_NOVEL' && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.ilustracoes}
                onChange={(event) => onApply({ ilustracoes: event.target.checked, page: 0 })}
                className="mt-0.5 h-4 w-4 accent-[var(--mn-ink)]"
              />
              <span>
                <span className="font-body text-sm block">Com ilustrações</span>
                <span className="font-body text-[11px] text-[var(--mn-line)] block">
                  Light novels com apresentação ilustrada da obra.
                </span>
              </span>
            </label>
          )}

          <div className="flex items-center justify-between pt-2 border-t-2 border-[var(--mn-ink)]">
            <button
              type="button"
              onClick={onClearAll}
              className="font-pixel text-[12px] uppercase underline underline-offset-4"
            >
              Limpar tudo
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[var(--mn-yellow)] text-[var(--mn-ink)] font-pixel text-[12px] uppercase border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-ink)]"
            >
              Ver resultados
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
