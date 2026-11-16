import logoSymbol from '../../../assets/brand/logo-symbol.svg';

interface HeaderBrandProps {
  onGoHome: () => void;
}

export function HeaderBrand({ onGoHome }: HeaderBrandProps) {
  return (
    <div
      className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0"
      onClick={onGoHome}
      title="MangaNetWorking — A Banca Digital do Mangá Independente"
    >
      <img
        src={logoSymbol}
        alt="MangaNetWorking"
        className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 -rotate-2 group-hover:rotate-0 transition-transform duration-100"
      />
      <div>
        <span className="hidden min-[360px]:block font-logo text-base sm:text-xl md:text-2xl text-[var(--mn-yellow)] leading-none tracking-wide">
          MANGA<span className="text-[var(--mn-paper)]">NETWORKING</span>
        </span>
      </div>
    </div>
  );
}
