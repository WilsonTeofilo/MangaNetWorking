import { Upload, Crop, Crown } from 'lucide-react';
import { Button } from '../../ui/Button';

export type WorkspaceTab = 'overview' | 'works' | 'missions' | 'settings';

export interface CreatorKpiHeaderProps {
  avatarUrl?: string | null;
  profileName: string;
  displayHandle: string;
  monetizationLevel: number;
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  onPrimaryCtaClick: () => void;
  isUploadingAvatar?: boolean;
  onAvatarFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAdjustPhoto?: () => void;
}

const TABS: { key: WorkspaceTab; label: string }[] = [
  { key: 'overview', label: 'VISÃO GERAL' },
  { key: 'works', label: 'MINHAS OBRAS' },
  { key: 'missions', label: 'MISSÕES & XP' },
  { key: 'settings', label: 'PERFIL & AJUSTES' },
];

/**
 * Topo sóbrio e elegante do Workspace do Autor.
 * Contém dados essenciais de identidade, único CTA primário e navegação por abas.
 */
export function CreatorKpiHeader({
  avatarUrl,
  profileName,
  displayHandle,
  monetizationLevel,
  activeTab,
  onTabChange,
  onPrimaryCtaClick,
  isUploadingAvatar = false,
  onAvatarFileChange,
  onAdjustPhoto,
}: CreatorKpiHeaderProps) {
  const cleanHandle = displayHandle?.replace(/^@/, '') || '-';
  const displayedName = profileName || 'CRIADOR';

  return (
    <header className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] shadow-[4px_4px_0_var(--mn-ink)] p-5 sm:p-7 space-y-6 select-none">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Identidade do Autor: Avatar e Nomes */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="relative group shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-[var(--mn-yellow)] bg-[var(--mn-ink)] overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayedName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display text-2xl text-[var(--mn-yellow)] bg-[var(--mn-ink-2)]">
                  {displayedName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Ações discretas de avatar */}
            <div className="flex items-center gap-1.5 mt-2">
              <label
                className={`inline-flex items-center gap-1 border border-[var(--mn-line)] px-2 py-1 font-pixel text-[10px] text-[var(--mn-paper)] hover:border-[var(--mn-yellow)] cursor-pointer transition-colors ${
                  isUploadingAvatar ? 'opacity-50 pointer-events-none' : ''
                }`}
                title="Subir nova foto de perfil"
              >
                <Upload size={10} />
                <span>{isUploadingAvatar ? 'ENVIANDO…' : 'TROCAR'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={isUploadingAvatar}
                  onChange={onAvatarFileChange}
                  className="sr-only"
                />
              </label>

              {avatarUrl && onAdjustPhoto && (
                <button
                  type="button"
                  onClick={onAdjustPhoto}
                  disabled={isUploadingAvatar}
                  className="inline-flex items-center gap-1 border border-[var(--mn-line)] px-2 py-1 font-pixel text-[10px] text-[var(--mn-paper)] hover:border-[var(--mn-yellow)] transition-colors"
                  title="Reajustar recorte da foto atual"
                >
                  <Crop size={10} />
                  <span>REAJUSTAR</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[11px] text-[var(--mn-yellow)] tracking-wider uppercase font-bold">
                PAINEL DO AUTOR
              </span>
              <span className="inline-flex items-center gap-1 border border-[var(--mn-line)] bg-[var(--mn-ink)] px-2 py-0.5 font-pixel text-[10px] text-[var(--mn-paper)]">
                <Crown size={10} className="text-[var(--mn-yellow)]" />
                LV.{monetizationLevel || 1}
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl text-[var(--mn-paper)] uppercase tracking-wide leading-none">
              {displayedName}
            </h1>

            <span className="font-body text-xs text-[var(--mn-mute)] block">
              @{cleanHandle}
            </span>
          </div>
        </div>

        {/* 1 ÚNICO CTA Primário no Topo */}
        <div className="w-full md:w-auto shrink-0">
          <Button
            type="button"
            variant="primary"
            onClick={onPrimaryCtaClick}
            className="w-full md:w-auto !px-6 !py-3 font-display text-sm tracking-wider uppercase"
          >
            + NOVA OBRA
          </Button>
        </div>
      </div>

      {/* Barra de Abas Internas */}
      <nav
        aria-label="Abas do workspace"
        className="flex flex-wrap gap-2 border-t-2 border-[var(--mn-line)] pt-4"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`px-4 py-2 font-display text-xs sm:text-sm tracking-wider uppercase transition-colors border-2 ${
                isActive
                  ? 'border-[var(--mn-yellow)] bg-[var(--mn-yellow)] text-[var(--mn-ink)] shadow-[2px_2px_0_var(--mn-ink)] font-bold'
                  : 'border-transparent text-[var(--mn-mute)] hover:text-[var(--mn-paper)] hover:border-[var(--mn-line)] bg-transparent'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
