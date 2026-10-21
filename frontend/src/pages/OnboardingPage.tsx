import { AccountProfilePage } from './AccountProfilePage';

/**
 * Primeira tela depois do cadastro: foto de perfil, escolha de visibilidade (público ou
 * privado) e o botão de ver a própria página pública como os outros veem.
 */
export function OnboardingPage({ onOpenPublicProfile }: { onOpenPublicProfile: (username: string) => void }) {
  return (
    <>
      <section className="mn-container pt-10">
        <div className="border-2 border-[var(--mn-teal)] bg-[var(--mn-ink-2)] p-6 shadow-[6px_6px_0_var(--mn-teal)]">
          <p className="font-pixel text-[11px] tracking-widest text-[var(--mn-mute)] uppercase">Bem-vindo</p>
          <h1 className="font-display text-3xl sm:text-4xl text-[var(--mn-paper)] uppercase mt-1">
            Vamos montar seu perfil
          </h1>
          <p className="mt-2 text-sm text-[var(--mn-mute)]">
            Escolha a foto, decida se o perfil fica público ou privado e veja como os outros vão
            ver você. Dá para mudar isso quando quiser.
          </p>
        </div>
      </section>
      <AccountProfilePage onOpenPublicProfile={onOpenPublicProfile} />
    </>
  );
}
