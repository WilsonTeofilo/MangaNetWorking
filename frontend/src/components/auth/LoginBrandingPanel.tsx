import mascotSvg from '../../assets/brand/mascot-placeholder.svg';
import logoWordmark from '../../assets/brand/logo-wordmark.svg';

export function LoginBrandingPanel() {
  return (
    <div className="bg-[var(--mn-yellow)] text-[var(--mn-ink)] p-8 sm:p-12 flex flex-col justify-between border-b-2 md:border-b-0 md:border-r-2 border-[var(--mn-ink)] relative overflow-hidden mn-grain">
      <div className="absolute inset-0 mn-halftone opacity-15 pointer-events-none" />

      <div className="relative z-10 space-y-4">
        <span className="font-pixel text-[12px] text-[var(--mn-ink)] font-bold tracking-widest block">
          PORTAL EDITORIAL INDEPENDENTE
        </span>
        <img src={logoWordmark} alt="MangaNetWorking" className="w-56 -rotate-1" />
        <p className="font-body text-sm text-[var(--mn-ink)] font-medium leading-relaxed mt-2">
          A banca digital onde você lê direto dos criadores e apoia as
          produções independentes nacionais com transparência.
        </p>
      </div>

      <div className="relative z-10 py-8 flex flex-col items-center">
        <img
          src={mascotSvg}
          alt="Mascote Nanquim"
          className="w-32 h-36 object-contain -rotate-3 hover:rotate-0 transition-transform duration-200"
        />
        <span className="font-pixel text-[12px] text-[var(--mn-ink)] font-bold mt-2">
          NANQUIM · MASCOTE OFICIAL
        </span>
      </div>

      <div className="relative z-10 border-t-2 border-[var(--mn-ink)] pt-3 font-pixel text-[12px] text-[var(--mn-ink)]">
        AUTORIA PROTEGIDA · ZERO PIRATARIA
      </div>
    </div>
  );
}
