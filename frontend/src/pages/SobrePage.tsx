import { useState } from 'react';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { KokuinLanding } from '../components/about/KokuinLanding';
import { Button } from '../components/ui/Button';
import './SobrePage.css';

interface SobrePageProps {
  onBackToFeed: () => void;
  onExplore: () => void;
}

function FounderPortrait() {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const showMangaPortrait = isRevealed || isHovered;

  return (
    <figure className="mx-auto w-full max-w-sm">
      <button
        type="button"
        aria-label={isRevealed ? 'Voltar ao retrato original' : 'Revelar o retrato em estilo mangá'}
        aria-pressed={isRevealed}
        onClick={() => setIsRevealed((revealed) => !revealed)}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') setIsHovered(true);
        }}
        onPointerLeave={() => setIsHovered(false)}
        className={`sobre-portrait group relative block aspect-[4/5] w-full overflow-hidden border-2 border-[var(--mn-ink)] bg-[var(--mn-paper)] text-left shadow-[6px_6px_0_var(--mn-ink)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--mn-paper)]${
          showMangaPortrait ? ' is-shaking' : ''
        }`}
      >
        <img
          src="/assets/about/teofilo.jpg"
          alt="Retrato de Wilson Teofilo"
          width={747}
          height={1000}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <img
          src="/assets/about/teofilo-manga.jpg"
          alt=""
          aria-hidden="true"
          width={960}
          height={1200}
          className="sobre-portrait__manga absolute inset-0 h-full w-full object-cover"
          style={{
            clipPath: showMangaPortrait ? 'circle(150% at 50% 50%)' : 'circle(0% at 50% 50%)',
            transform: showMangaPortrait ? 'scale(1.01)' : 'scale(1.03)',
          }}
        />
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--mn-ink)]/90 to-transparent px-4 pb-4 pt-14 font-pixel text-xs tracking-wide text-[var(--mn-paper)]">
          {isRevealed ? 'TOQUE PARA VOLTAR' : 'PASSE O MOUSE OU TOQUE PARA REVELAR'}
        </span>
      </button>
      <figcaption className="mt-4 border-l-4 border-[var(--mn-ink)] pl-3">
        <span className="block font-pixel text-xs tracking-wider text-[var(--mn-ink)]">CRIADOR E FUNDADOR</span>
        <span className="sobre-founder-name mt-1 block font-display text-xl uppercase text-[var(--mn-paper)]">
          Wilson Teofilo
        </span>
      </figcaption>
    </figure>
  );
}

export function SobrePage({ onBackToFeed, onExplore }: SobrePageProps) {
  return (
    <main className="sobre-page w-full">
      <div className="mn-container">
        <header className="flex items-center justify-between gap-4 py-6">
          <p className="font-pixel text-xs tracking-widest text-[var(--mn-yellow)]">SOBRE O PROJETO</p>
          <Button variant="ghost" onClick={onBackToFeed} className="!text-xs">
            <ArrowLeft size={14} aria-hidden="true" />
            VOLTAR
          </Button>
        </header>

        <section className="mn-on-yellow grid items-center gap-10 border-y-2 border-[var(--mn-ink)] bg-[var(--mn-yellow)] px-5 py-8 text-[var(--mn-ink)] sm:px-8 sm:py-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:px-12">
          <div className="space-y-6">
            <p className="font-pixel text-xs tracking-widest">UMA IDEIA QUE CRESCEU JUNTO COM UMA HISTÓRIA</p>
            <h1 className="max-w-[14ch] font-display text-4xl uppercase leading-[0.98] tracking-tight sm:text-5xl lg:text-6xl">
              Toda história merece encontrar seu jeito de existir.
            </h1>
            <p className="max-w-2xl font-body text-base leading-relaxed sm:text-lg">
              A MangaNetWorking conecta quem cria e quem lê. Estamos construindo um espaço digital para
              descobrir obras autorais, acompanhar capítulos e apoiar criadores — seja com histórias em
              imagens, seja com histórias em palavras. Nem todo mundo desenha; muita gente tem uma boa
              história para contar.
            </p>
            <Button
              variant="primary"
              onClick={onExplore}
              className="!border-[var(--mn-ink)] !bg-[var(--mn-ink)] !text-[var(--mn-yellow)] !shadow-[4px_4px_0_var(--mn-paper)] hover:!shadow-[6px_6px_0_var(--mn-paper)]"
            >
              CONHECER O CATÁLOGO <ArrowUpRight size={16} aria-hidden="true" />
            </Button>
          </div>
          <div>
            <FounderPortrait />
          </div>
        </section>

        <section className="grid gap-8 border-b-2 border-[var(--mn-line)] py-12 md:grid-cols-[0.75fr_1.25fr] md:gap-16 md:py-16">
          <div>
            <p className="font-pixel text-xs tracking-widest text-[var(--mn-yellow)]">DE ONDE VIEMOS</p>
            <h2 className="mt-3 max-w-[12ch] font-display text-3xl uppercase leading-tight text-[var(--mn-paper)] sm:text-4xl">
              Primeiro, um site para uma história.
            </h2>
          </div>
          <div className="space-y-5 font-body leading-relaxed text-[var(--mn-mute)]">
            <p>
              O projeto começou por dois motivos: um trabalho da faculdade que precisava usar React e o
              antigo MangaTeofilo, um site feito para apresentar uma única obra minha, <em className="text-[var(--mn-paper)]">Kokuin — Herança do Abismo</em>.
              Como único administrador, eu publicava os capítulos e avisava quem escolhia receber novidades
              e alertas de lançamento — por e-mail ou pelo próprio site.
            </p>
            <p>
              Enquanto construía, comecei a pensar que aquele espaço podia servir a mais gente. Nem todo
              mundo sabe desenhar, mas muita gente ama criar mundos e personagens. A MangaNetWorking nasceu
              dessa vontade: transformar uma vitrine de uma obra só em um lugar para histórias independentes
              encontrarem seus leitores.
            </p>
            <p>
              A proposta inclui mangás e light novels: quadrinhos para quem conta com imagens e narrativas em
              prosa para quem prefere escrever. O suporte completo aos dois formatos ainda faz parte da
              construção do produto.
            </p>
          </div>
        </section>
      </div>

      <KokuinLanding onExplore={onExplore} />

      <div className="mn-container">
        <footer className="border-t-2 border-[var(--mn-line)] py-8">
          <p className="max-w-xl font-body text-sm leading-relaxed text-[var(--mn-mute)]">
            Um projeto independente, feito por quem também publica uma história — e quer abrir espaço para muitas outras.
          </p>
        </footer>
      </div>
    </main>
  );
}
