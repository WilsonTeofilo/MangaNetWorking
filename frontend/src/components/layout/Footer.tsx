import logoSymbol from '../../assets/brand/logo-symbol.svg';

export function Footer() {
  return (
    <footer className="w-full bg-[var(--mn-ink)] border-t-2 border-[var(--mn-yellow)] text-[var(--mn-paper)] pt-12 pb-24 lg:pb-12 mt-16 select-none">
      <div className="mn-container space-y-10">
        
        {/* Grade de 4 Colunas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] gap-8 xl:gap-10">
          {/* Coluna 1: Marca & Manifesto */}
          <div className="space-y-3 min-w-0 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 min-w-0">
              <img src={logoSymbol} alt="MN" className="w-8 h-8 -rotate-2 shrink-0" />
              <span className="font-logo text-xl text-[var(--mn-yellow)]">
                MANGA<span className="text-[var(--mn-paper)]">NETWORKING</span>
              </span>
            </div>
            <p className="font-body text-xs text-[var(--mn-mute)] leading-relaxed">
              A banca digital do mangá independente brasileiro: leia direto dos
              autores, apoie com membros e doações, sem pirataria e sem intermediários.
            </p>
          </div>

          {/* Coluna 2: Plataforma */}
          <div className="space-y-2 min-w-0">
            <h4 className="font-display text-base text-[var(--mn-yellow)] uppercase tracking-wider">
              PLATAFORMA
            </h4>
            <ul className="font-body text-xs text-[var(--mn-mute)] space-y-1.5">
              <li><a href="#feed" className="hover:text-[var(--mn-yellow)] transition-colors">Feed &amp; Lançamentos</a></li>
              <li><a href="#catalog" className="hover:text-[var(--mn-yellow)] transition-colors">Catálogo Completo</a></li>
              <li><a href="#library" className="hover:text-[var(--mn-yellow)] transition-colors">Minha Biblioteca</a></li>
              <li><a href="#ranking" className="hover:text-[var(--mn-yellow)] transition-colors">Em Alta Semanal</a></li>
            </ul>
          </div>

          {/* Coluna 3: Criadores */}
          <div className="space-y-2 min-w-0">
            <h4 className="font-display text-base text-[var(--mn-yellow)] uppercase tracking-wider">
              CRIADORES
            </h4>
            <ul className="font-body text-xs text-[var(--mn-mute)] space-y-1.5">
              <li><span className="text-[var(--mn-paper)] font-medium">Seasons &amp; Quests</span></li>
              <li><span>Clube de Membros (Early Access)</span></li>
              <li><span>Doações Diretas via PIX</span></li>
              <li><span>Regras da Temporada 01</span></li>
            </ul>
          </div>

          {/* Coluna 4: Legal & LGPD */}
          <div className="space-y-2 min-w-0">
            <h4 className="font-display text-base text-[var(--mn-yellow)] uppercase tracking-wider">
              LEGAL &amp; PRIVACIDADE
            </h4>
            <ul className="font-body text-xs text-[var(--mn-mute)] space-y-1.5 break-words">
              <li><span>Termos de Uso</span></li>
              <li><span>Política de Privacidade (LGPD)</span></li>
              <li><span>DPO: privacidade@manganetworking.com.br</span></li>
              <li><span className="text-[var(--mn-red)] font-bold">Canal Anti-Pirataria</span></li>
            </ul>
          </div>
        </div>

        {/* Linha de Transparência Financeira Oficial (Legível, >= 12px, >= 4.5:1) */}
        <div className="pt-6 border-t-2 border-[var(--mn-line)] flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-body text-[var(--mn-mute)]">
          <p className="tabular-nums text-center md:text-left">
            <strong className="text-[var(--mn-paper)]">17% de taxa</strong> sobre membros e doações ·{' '}
            <strong className="text-[var(--mn-paper)]">58% dos anúncios</strong> vão para o autor · sem intermediários.
          </p>
          <span className="font-pixel text-[12px] text-[var(--mn-mute)]">
            © 2026 MANGANETWORKING. OBRAS ORIGINAIS PROTEGIDAS.
          </span>
        </div>

      </div>
    </footer>
  );
}
