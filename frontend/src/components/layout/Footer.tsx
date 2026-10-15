import logoSymbol from '../../assets/brand/logo-symbol.svg';

export function Footer() {
  return (
    <footer className="w-full bg-[#0B0B0C] border-t-2 border-[#FFD400] text-[#F4EFE3] pt-12 pb-24 md:pb-12 mt-16 select-none">
      <div className="mn-container space-y-10">
        
        {/* Grade de 4 Colunas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Coluna 1: Marca & Manifesto */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <img src={logoSymbol} alt="MN" className="w-8 h-8 -rotate-2" />
              <span className="font-logo text-xl text-[#FFD400]">
                MANGA<span className="text-[#F4EFE3]">NETWORKING</span>
              </span>
            </div>
            <p className="font-body text-xs text-[#A9A59A] leading-relaxed">
              A banca digital do mangá independente brasileiro: leia direto dos
              autores, apoie com membros e doações, sem pirataria e sem intermediários.
            </p>
          </div>

          {/* Coluna 2: Plataforma */}
          <div className="space-y-2">
            <h4 className="font-display text-base text-[#FFD400] uppercase tracking-wider">
              PLATAFORMA
            </h4>
            <ul className="font-body text-xs text-[#A9A59A] space-y-1.5">
              <li><a href="#feed" className="hover:text-[#FFD400] transition-colors">Feed &amp; Lançamentos</a></li>
              <li><a href="#catalog" className="hover:text-[#FFD400] transition-colors">Catálogo Completo</a></li>
              <li><a href="#library" className="hover:text-[#FFD400] transition-colors">Minha Biblioteca</a></li>
              <li><a href="#ranking" className="hover:text-[#FFD400] transition-colors">Em Alta Semanal</a></li>
            </ul>
          </div>

          {/* Coluna 3: Criadores */}
          <div className="space-y-2">
            <h4 className="font-display text-base text-[#FFD400] uppercase tracking-wider">
              CRIADORES
            </h4>
            <ul className="font-body text-xs text-[#A9A59A] space-y-1.5">
              <li><span className="text-[#F4EFE3] font-medium">Seasons &amp; Quests</span></li>
              <li><span>Clube de Membros (Early Access)</span></li>
              <li><span>Doações Diretas via PIX</span></li>
              <li><span>Regras da Temporada 01</span></li>
            </ul>
          </div>

          {/* Coluna 4: Legal & LGPD */}
          <div className="space-y-2">
            <h4 className="font-display text-base text-[#FFD400] uppercase tracking-wider">
              LEGAL &amp; PRIVACIDADE
            </h4>
            <ul className="font-body text-xs text-[#A9A59A] space-y-1.5">
              <li><span>Termos de Uso</span></li>
              <li><span>Política de Privacidade (LGPD)</span></li>
              <li><span>DPO: privacidade@manganetworking.com.br</span></li>
              <li><span className="text-[#E8402F] font-bold">Canal Anti-Pirataria</span></li>
            </ul>
          </div>
        </div>

        {/* Linha de Transparência Financeira Oficial (Legível, >= 12px, >= 4.5:1) */}
        <div className="pt-6 border-t-2 border-[#34343A] flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-body text-[#A9A59A]">
          <p className="tabular-nums text-center md:text-left">
            <strong className="text-[#F4EFE3]">17% de taxa</strong> sobre membros e doações ·{' '}
            <strong className="text-[#F4EFE3]">58% dos anúncios</strong> vão para o autor · sem intermediários.
          </p>
          <span className="font-pixel text-[11px] text-[#A9A59A]">
            © 2026 MANGANETWORKING. OBRAS ORIGINAIS PROTEGIDAS.
          </span>
        </div>

      </div>
    </footer>
  );
}
