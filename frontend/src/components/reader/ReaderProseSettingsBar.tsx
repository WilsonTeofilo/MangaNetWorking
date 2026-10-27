import { useState } from 'react';
import { Minus, Plus, Settings2, X } from 'lucide-react';
import { ProseSettings } from './readerTypes';

interface ReaderProseSettingsBarProps {
  settings: ProseSettings;
  onUpdate: (patch: Partial<ProseSettings>) => void;
}

export function ReaderProseSettingsBar({ settings, onUpdate }: ReaderProseSettingsBarProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="prose-reading-settings"
        aria-label="Configuração de leitura"
        title="Configuração de leitura"
        className={`p-1.5 border transition-colors ${
          open
            ? 'border-[var(--mn-yellow)] text-[var(--mn-yellow)] bg-[var(--mn-ink-2)]'
            : 'border-[var(--mn-line)] bg-[var(--mn-ink-2)] text-[var(--mn-mute)] hover:text-[var(--mn-paper)] hover:border-[var(--mn-paper)]'
        }`}
      >
        <Settings2 size={16} />
      </button>

      {open && (
        <div
          id="prose-reading-settings"
          role="dialog"
          aria-label="Configuração de leitura"
          className="absolute right-0 top-full mt-2 w-64 border border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-3 space-y-3 z-50 shadow-[4px_4px_0_rgba(0,0,0,0.4)]"
        >
          <div className="flex items-center justify-between">
            <p className="font-pixel text-[11px] uppercase text-[var(--mn-yellow)]">Leitura</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar configuração de leitura"
              className="text-[var(--mn-mute)] hover:text-[var(--mn-paper)]"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-1">
            <p className="font-body text-[11px] text-[var(--mn-mute)]">Fonte</p>
            <div className="flex border border-[var(--mn-line)]">
              <button
                type="button"
                aria-pressed={settings.serif}
                onClick={() => onUpdate({ serif: true })}
                className={`flex-1 px-2 py-1 font-body text-xs ${
                  settings.serif ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)]' : 'text-[var(--mn-paper)]'
                }`}
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                Serifa
              </button>
              <button
                type="button"
                aria-pressed={!settings.serif}
                onClick={() => onUpdate({ serif: false })}
                className={`flex-1 px-2 py-1 font-body text-xs border-l border-[var(--mn-line)] ${
                  !settings.serif ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)]' : 'text-[var(--mn-paper)]'
                }`}
              >
                Sem serifa
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-body text-[11px] text-[var(--mn-mute)]">
              Tamanho do texto · <span className="tabular-nums">{settings.fontSize}px</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdate({ fontSize: Math.max(15, settings.fontSize - 1) })}
                disabled={settings.fontSize <= 15}
                aria-label="Diminuir tamanho do texto"
                className="p-1.5 border border-[var(--mn-line)] text-[var(--mn-paper)] disabled:opacity-40"
              >
                <Minus size={13} />
              </button>
              <span className="flex-1 text-center font-body text-sm text-[var(--mn-paper)] tabular-nums">
                {settings.fontSize}
              </span>
              <button
                type="button"
                onClick={() => onUpdate({ fontSize: Math.min(26, settings.fontSize + 1) })}
                disabled={settings.fontSize >= 26}
                aria-label="Aumentar tamanho do texto"
                className="p-1.5 border border-[var(--mn-line)] text-[var(--mn-paper)] disabled:opacity-40"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-body text-[11px] text-[var(--mn-mute)]">Entrelinha</p>
            <div className="flex border border-[var(--mn-line)]">
              {[1.6, 1.9, 2.2].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={settings.lineHeight === value}
                  onClick={() => onUpdate({ lineHeight: value })}
                  className={`flex-1 px-2 py-1 font-body text-xs tabular-nums ${
                    settings.lineHeight === value
                      ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)]'
                      : 'text-[var(--mn-paper)]'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-body text-[11px] text-[var(--mn-mute)]">Largura da coluna</p>
            <div className="flex border border-[var(--mn-line)]">
              {[620, 720, 820].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={settings.maxWidth === value}
                  onClick={() => onUpdate({ maxWidth: value })}
                  className={`flex-1 px-2 py-1 font-body text-xs tabular-nums ${
                    settings.maxWidth === value
                      ? 'bg-[var(--mn-yellow)] text-[var(--mn-ink)]'
                      : 'text-[var(--mn-paper)]'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
