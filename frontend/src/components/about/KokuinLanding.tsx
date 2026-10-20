import { useEffect, useRef, useState } from 'react';
import './KokuinLanding.css';

const CAST = [
  {
    id: 'naraa',
    name: 'NARAA',
    gif: '/assets/kokuin/naraa.gif',
    description: 'Com poderes gélidos, Naraa é implacável na caça e veloz contra seus adversários.',
  },
  {
    id: 'miomya',
    name: 'MIOMYA',
    gif: '/assets/kokuin/miomya.gif',
    description: 'Caçadora de elite de Brajiru. Pequena em altura, mas capaz de erguer feras enormes.',
  },
  {
    id: 'rin',
    name: 'RIN',
    gif: '/assets/kokuin/rin.gif',
    description: 'Manipuladora dos raios. Sua pressão espiritual é capaz de mudar a atmosfera ao redor.',
  },
  {
    id: 'kuroi',
    name: 'KUROI',
    gif: '/assets/kokuin/kuroi.gif',
    description: 'O mestre do fogo protege o grupo com suas labaredas purificadoras.',
  },
];

interface KokuinLandingProps {
  onExplore: () => void;
}

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

export function KokuinLanding({ onExplore }: KokuinLandingProps) {
  const portalRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const node = portalRef.current;
    if (!node) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setIsVisible(true);
      return;
    }

    const isInView = () => {
      const rect = node.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
    };

    // Se já está na tela, não esconde nada. O conteúdo visível por padrão
    // evita uma seção em branco caso o observer não entregue frames.
    if (isInView()) {
      setIsVisible(true);
      return;
    }

    setIsVisible(false);

    let revealed = false;
    let observer: IntersectionObserver | null = null;
    let watchdog = 0;

    function cleanup() {
      observer?.disconnect();
      window.clearTimeout(watchdog);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    }

    function reveal() {
      if (revealed) return;
      revealed = true;
      setIsVisible(true);
      cleanup();
    }

    function onScroll() {
      if (isInView()) reveal();
    }

    observer =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            ([entry]) => {
              if (entry.isIntersecting) reveal();
            },
            { threshold: 0.08, rootMargin: '0px 0px -6% 0px' },
          )
        : null;

    observer?.observe(node);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    watchdog = window.setTimeout(() => {
      if (isInView()) reveal();
    }, 3000);

    return cleanup;
  }, []);

  const scrollToLore = () => {
    document.getElementById('kokuin-lore')?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  };

  return (
    <section
      ref={portalRef}
      className={`kokuin-portal${isVisible ? ' is-visible' : ''}`}
      aria-labelledby="kokuin-title"
    >
      <div className="kokuin-portal__seam">
        <span className="kokuin-portal__seam-title">A obra que deu o primeiro passo</span>
        <span className="kokuin-portal__seam-arrow" aria-hidden="true">
          ↓
        </span>
      </div>

      <header className="kokuin-hero">
        <div className="kokuin-hero__stars" aria-hidden="true" />
        <div className="kokuin-hero__content">
          <p className="kokuin-hero__kicker">UNIVERSO 01 // KOKUIN</p>
          <h2 id="kokuin-title" className="kokuin-logo">
            KOKUIN
          </h2>
          <p className="kokuin-sublogo">HERANÇA DO ABISMO</p>
        </div>
        <button type="button" className="kokuin-scroll-cue" onClick={scrollToLore}>
          <span className="kokuin-scroll-cue__text">ROLE PARA CONTINUAR</span>
          <span className="kokuin-scroll-cue__arrow" aria-hidden="true" />
        </button>
      </header>

      <div id="kokuin-lore" className="kokuin-lore">
        <div className="kokuin-lore__copy">
          <span className="kokuin-lore__date">KOKUIN — HERANÇA DO ABISMO</span>
          <h3 className="kokuin-lore__title">A CICATRIZ DOS DEUSES</h3>
          <p>
            Antes das feridas que retalharam o mundo, Kokuin era uma massa única, regida pelas linhagens
            Kiraya e Moshiki. A guerra entre as divindades Yukio, Orochi e Matatabi rompeu o planeta,
            dando origem aos continentes e a novas formas de vida.
          </p>
        </div>

        <figure className="kokuin-banner">
          <img
            src="/assets/kokuin/shito.jpg"
            alt="Kokuin — A Grande Guerra"
            loading="lazy"
            decoding="async"
          />
          <figcaption>KOKUIN // A GRANDE GUERRA</figcaption>
        </figure>

        <div className="kokuin-lore__copy">
          <div className="kokuin-highlight">
            <span className="kokuin-lore__date kokuin-highlight__label">
              DEPOIS DO CATACLISMO (D.C.) — KOKUIN, BRAJIRU.
            </span>
            <p className="kokuin-highlight__text">
              Na densa selva de Brajiru, a caçadora <strong>Miomya Inpachi</strong> resgata do gelo um
              homem de 350 D.C., que estava há 400 anos congelado. <strong>Naraa</strong> desperta em um
              futuro quebrado, com memórias fragmentadas e um poder latente.
            </p>
          </div>
        </div>
      </div>

      <div className="kokuin-cast">
        <h3 className="kokuin-cast__title">O ELENCO</h3>
        <div className="kokuin-cast__grid">
          {CAST.map((character, index) => (
            <article key={character.id} className={`kokuin-char kokuin-char--${character.id}`}>
              <div
                className="kokuin-char__inner"
                style={{ transitionDelay: `${0.18 + index * 0.09}s` }}
              >
                <div className="kokuin-char__media">
                  <img
                    src={character.gif}
                    alt={`${character.name} — personagem de Kokuin`}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="kokuin-char__body">
                  <h4>{character.name}</h4>
                  <p>{character.description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="kokuin-cta">
        <p className="kokuin-cta__label">A HISTÓRIA CONTINUA</p>
        <p className="kokuin-cta__text">
          Kokuin foi a primeira obra da MangaNetWorking. É também o lembrete de por que a plataforma
          existe: dar espaço para uma história encontrar seus leitores.
        </p>
        <div className="kokuin-cta__actions">
          <button type="button" className="kokuin-btn kokuin-btn--primary" onClick={onExplore}>
            EXPLORAR O CATÁLOGO
          </button>
          <button
            type="button"
            className="kokuin-btn kokuin-btn--ghost"
            onClick={() => window.scrollTo({ top: 0, behavior: scrollBehavior() })}
          >
            VOLTAR AO TOPO
          </button>
        </div>
      </div>
    </section>
  );
}
