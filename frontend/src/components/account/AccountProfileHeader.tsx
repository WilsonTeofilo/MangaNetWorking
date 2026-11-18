import { Camera, Crop, Crown } from 'lucide-react';
import { UserProfile } from '../../types';
import { Button } from '../ui/Button';

export type AccountTab = 'collection' | 'security';

export interface AccountProfileHeaderProps {
  user: UserProfile;
  avatarUrl: string;
  activeTab: AccountTab;
  onTabChange: (tab: AccountTab) => void;
  onPickAvatar: () => void;
  onRecropAvatar?: () => void;
  uploading: boolean;
}

export function AccountProfileHeader({
  user,
  avatarUrl,
  activeTab,
  onTabChange,
  onPickAvatar,
  onRecropAvatar,
  uploading,
}: AccountProfileHeaderProps) {
  return (
    <header className="border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] shadow-[4px_4px_0_#000000] p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative mx-auto sm:mx-0 w-28 h-28 shrink-0">
          <img
            src={avatarUrl || '/avatar-placeholder.png'}
            alt="Foto de perfil"
            className="w-28 h-28 rounded-full object-cover bg-[var(--mn-ink-2)] border-2 border-[var(--mn-yellow)] shadow-[4px_4px_0_var(--mn-ink)]"
          />
          <button
            type="button"
            onClick={onPickAvatar}
            disabled={uploading}
            className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-60 cursor-pointer"
            title="Trocar foto de perfil"
            aria-label="Trocar foto de perfil"
          >
            <Camera size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-2 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="font-pixel text-[11px] tracking-widest text-[var(--mn-yellow)] uppercase font-bold">
              {user.isCreator ? 'ESCRITOR OFICIAL' : 'LEITOR OFICIAL'}
            </span>
            {user.isVip && (
              <span className="px-2 py-0.5 bg-[var(--mn-yellow)] text-[var(--mn-ink)] font-pixel text-[10px] uppercase font-bold flex items-center gap-1 border border-[var(--mn-ink)]">
                <Crown size={10} className="fill-[var(--mn-ink)]" />
                VIP
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase">
            {user.name}
          </h1>

          <p className="font-pixel text-xs text-[var(--mn-yellow)]">
            {`@${user.username || 'sem-username'}`}
          </p>

          <p className="font-body text-xs text-[var(--mn-mute)]">
            {user.email}
          </p>

          <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
            <Button
              onClick={onPickAvatar}
              disabled={uploading}
              variant="ghost"
              className="!text-xs !py-1 !px-3"
            >
              <Camera size={13} /> {uploading ? 'ENVIANDO...' : 'TROCAR FOTO'}
            </Button>
            {avatarUrl && onRecropAvatar && (
              <Button
                onClick={onRecropAvatar}
                disabled={uploading}
                variant="ghost"
                className="!text-xs !py-1 !px-3"
                title="Reajustar a foto atual"
              >
                <Crop size={13} /> REAJUSTAR FOTO
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Barra de Abas Limpa e Unificada */}
      <div className="flex border-b-2 border-[var(--mn-line)] gap-2 pt-2">
        <button
          type="button"
          onClick={() => onTabChange('collection')}
          className={`px-4 py-2 font-display text-sm tracking-wider uppercase transition-all cursor-pointer ${
            activeTab === 'collection'
              ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-ink)]'
              : 'text-[var(--mn-paper)] hover:text-[var(--mn-yellow)] border-2 border-transparent'
          }`}
        >
          MINHA COLEÇÃO
        </button>
        <button
          type="button"
          onClick={() => onTabChange('security')}
          className={`px-4 py-2 font-display text-sm tracking-wider uppercase transition-all cursor-pointer ${
            activeTab === 'security'
              ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-2 border-[var(--mn-ink)] shadow-[3px_3px_0_var(--mn-ink)]'
              : 'text-[var(--mn-paper)] hover:text-[var(--mn-yellow)] border-2 border-transparent'
          }`}
        >
          SEGURANÇA &amp; DADOS
        </button>
      </div>
    </header>
  );
}
