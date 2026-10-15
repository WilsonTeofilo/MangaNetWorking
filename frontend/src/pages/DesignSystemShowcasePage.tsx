import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Win } from '../components/ui/Win';
import { Sticker } from '../components/ui/Sticker';
import { Cover } from '../components/ui/Cover';
import { Field } from '../components/ui/Field';
import { OtpInput } from '../components/ui/OtpInput';
import { LevelPatch } from '../components/ui/LevelPatch';
import { XpBar } from '../components/ui/XpBar';
import { RankRow } from '../components/ui/RankRow';
import { Marquee } from '../components/ui/Marquee';
import { MOCK_WORKS } from '../data/mockData';

export function DesignSystemShowcasePage() {
  const [otp, setOtp] = useState('123456');
  const [xp, setXp] = useState(340);
  const sampleWork = MOCK_WORKS[0];

  return (
    <div className="mn-container py-10 space-y-12">
      <header className="border-b-2 border-[#34343A] pb-4 flex items-center justify-between">
        <div>
          <span className="font-pixel text-xs text-[#FFD400] tracking-widest block">
            AMBIENTE DE DESENVOLVIMENTO
          </span>
          <h1 className="font-display text-4xl text-[#F4EFE3] uppercase">
            DESIGN SYSTEM SHOWCASE
          </h1>
        </div>
        <span className="font-pixel text-xs bg-[#FFD400] text-[#0B0B0C] px-2 py-1 font-bold">
          DEV ONLY
        </span>
      </header>

      {/* 1. Botões */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl text-[#FFD400]">1. BOTÕES</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="primary">LER AGORA (PRIMARY)</Button>
          <Button variant="secondary">VER DETALHES (SECONDARY)</Button>
          <Button variant="danger">EXCLUIR CONTA (DANGER)</Button>
          <Button variant="ghost">VOLTAR (GHOST)</Button>
          <Button variant="primary" disabled>
            DESABILITADO
          </Button>
        </div>
      </section>

      {/* 2. Janelas Retrô OS */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl text-[#FFD400]">
          2. JANELAS RETRÔ OS (&lt;Win&gt;)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Win title="CONTINUAR_LENDO.EXE">
            <p className="font-body text-sm text-[#F4EFE3]">
              Você parou na página 12 do Capítulo 4. Deseja continuar a leitura
              de onde parou?
            </p>
            <div className="mt-4 flex gap-3">
              <Button variant="primary">CONTINUAR</Button>
              <Button variant="ghost">FICHA DA OBRA</Button>
            </div>
          </Win>

          <Win title="PREVIEW_PAPEL.EXE" theme="paper">
            <p className="font-body text-sm text-[#0B0B0C]">
              Superfície clara de papel off-white com texto nanquim e drop shadow
              preta dura.
            </p>
            <div className="mt-4">
              <Button variant="primary">CONFIRMAR</Button>
            </div>
          </Win>
        </div>
      </section>

      {/* 3. Selos e Stickers */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl text-[#FFD400]">
          3. SELOS E BADGES (&lt;Sticker&gt;)
        </h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Sticker kind="new" rotate={-2} />
          <Sticker kind="members" rotate={2} />
          <Sticker kind="free" />
          <Sticker kind="complete" rotate={-2} />
          <Sticker kind="hiatus" />
        </div>
      </section>

      {/* 4. Patches de Nível e XP */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl text-[#FFD400]">
          4. SEASONS, PATCHES E XP
        </h2>
        <div className="flex flex-wrap gap-4 items-center">
          <LevelPatch level={1} isUnlocked={true} />
          <LevelPatch level={2} isUnlocked={true} />
          <LevelPatch level={3} isUnlocked={true} />
          <LevelPatch level={4} isUnlocked={true} />
          <LevelPatch level={4} isUnlocked={false} />
        </div>

        <div className="max-w-md pt-4">
          <XpBar value={xp} max={500} />
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setXp((x) => Math.max(0, x - 50))}
              className="px-2 py-1 text-xs border border-[#34343A] font-pixel text-[#F4EFE3]"
            >
              -50 XP
            </button>
            <button
              onClick={() => setXp((x) => Math.min(500, x + 50))}
              className="px-2 py-1 text-xs border border-[#34343A] font-pixel text-[#FFD400]"
            >
              +50 XP
            </button>
          </div>
        </div>
      </section>

      {/* 5. Capa 2:3 e Fallback */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl text-[#FFD400]">
          5. CAPAS 2:3 COM FALLBACK EDITORIAL
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl">
          <div>
            <span className="font-pixel text-[10px] text-[#A9A59A] block mb-1">
              COM IMAGEM
            </span>
            <Cover src={sampleWork.coverUrl} title={sampleWork.title} />
          </div>
          <div>
            <span className="font-pixel text-[10px] text-[#A9A59A] block mb-1">
              FALLBACK 1
            </span>
            <Cover title="Kurogane Curse" />
          </div>
          <div>
            <span className="font-pixel text-[10px] text-[#A9A59A] block mb-1">
              FALLBACK 2
            </span>
            <Cover title="Neon Tokyo Shinjuku" />
          </div>
          <div>
            <span className="font-pixel text-[10px] text-[#A9A59A] block mb-1">
              FALLBACK 3
            </span>
            <Cover title="A Chama Dourada" />
          </div>
        </div>
      </section>

      {/* 6. Formulários e OTP 2FA */}
      <section className="space-y-4 max-w-lg">
        <h2 className="font-display text-2xl text-[#FFD400]">
          6. FORMULÁRIOS &amp; OTP 2FA
        </h2>
        <Field label="E-MAIL" placeholder="leitor@manganetworking.com.br" />
        <Field
          label="CHAVE COM ERRO"
          defaultValue="chave-invalida"
          error="Código de confirmação expirado ou incorreto."
        />

        <div className="pt-2">
          <label className="font-body text-sm font-semibold text-[#F4EFE3] block mb-2">
            CÓDIGO DE 6 DÍGITOS 2FA:
          </label>
          <OtpInput value={otp} onChange={setOtp} />
        </div>
      </section>

      {/* 7. Ranking Em Alta */}
      <section className="space-y-4 max-w-2xl">
        <h2 className="font-display text-2xl text-[#FFD400]">
          7. RANKING "EM ALTA" (&lt;RankRow&gt;)
        </h2>
        <div className="border-t-2 border-[#34343A]">
          <RankRow rank={1} work={sampleWork} onSelect={() => {}} />
          <RankRow rank={2} work={MOCK_WORKS[1] || sampleWork} onSelect={() => {}} />
          <RankRow rank={3} work={MOCK_WORKS[2] || sampleWork} onSelect={() => {}} />
        </div>
      </section>

      {/* 8. Fita Ticker Marquee */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl text-[#FFD400]">
          8. FITA MARQUEE
        </h2>
        <Marquee />
      </section>
    </div>
  );
}
