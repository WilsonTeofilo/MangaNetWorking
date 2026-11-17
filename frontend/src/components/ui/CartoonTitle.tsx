export interface CartoonTitleProps {
  title: string;
  className?: string;
  /** Nível de cabeçalho semântico (padrão 1). */
  headingLevel?: 1 | 2 | 3;
}

/**
 * Título de obra no estilo icônico Colagem Cartoon Network / Bloco de Rua.
 * Alterna blocos pretos com texto branco e blocos brancos com texto preto,
 * com moldura sólida preta e sombra de bloco 3D de alto impacto.
 */
export function CartoonTitle({
  title,
  className = '',
  headingLevel = 1,
}: CartoonTitleProps) {
  const cleanTitle = (title || '').trim();
  if (!cleanTitle) return null;

  const words = cleanTitle.split(/\s+/);
  let globalCharIndex = 0;

  const HeadingTag = `h${headingLevel}` as 'h1' | 'h2' | 'h3';

  return (
    <HeadingTag
      className={`flex flex-wrap items-center gap-x-6 sm:gap-x-8 md:gap-x-9 gap-y-3 sm:gap-y-4 select-none ${className}`}
      aria-label={cleanTitle}
    >
      {words.map((word, wordIndex) => {
        const letters = Array.from(word);
        return (
          <span
            key={`word-${wordIndex}`}
            className="inline-flex items-center shadow-[3px_3px_0_#000000] sm:shadow-[5px_5px_0_#000000]"
            aria-hidden="true"
          >
            {letters.map((char, charIndex) => {
              const isDark = globalCharIndex % 2 === 0;
              globalCharIndex++;

              return (
                <span
                  key={`char-${wordIndex}-${charIndex}`}
                  className={`inline-flex items-center justify-center font-display uppercase font-black leading-none shrink-0 transition-transform duration-75 hover:-translate-y-0.5
                    w-7 h-9 text-lg
                    sm:w-10 sm:h-12 sm:text-2xl
                    md:w-12 md:h-14 md:text-3xl
                    border-y-2 border-l-2 border-black last:border-r-2
                    ${isDark ? 'bg-black text-white' : 'bg-white text-black'}
                  `}
                >
                  {char}
                </span>
              );
            })}
          </span>
        );
      })}
    </HeadingTag>
  );
}
