import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { HeaderMobileNav } from '../HeaderMobileNav';

describe('HeaderMobileNav', () => {
  it('renders PERFIL button when user is a reader (not creator)', () => {
    const html = renderToString(
      <HeaderMobileNav
        currentTab="feed"
        isAuthenticated={true}
        isCreator={false}
        onNavigate={() => {}}
      />
    );

    expect(html).toContain('PERFIL');
    expect(html).not.toContain('PAINEL');
  });

  it('renders PAINEL button when user is an authenticated creator', () => {
    const html = renderToString(
      <HeaderMobileNav
        currentTab="feed"
        isAuthenticated={true}
        isCreator={true}
        onNavigate={() => {}}
      />
    );

    expect(html).toContain('PAINEL');
    expect(html).not.toContain('PERFIL');
  });

  it('highlights PAINEL button when currentTab is a creator tab', () => {
    const html = renderToString(
      <HeaderMobileNav
        currentTab="creator-dashboard"
        isAuthenticated={true}
        isCreator={true}
        onNavigate={() => {}}
      />
    );

    expect(html).toContain('PAINEL');
    expect(html).toContain('text-[var(--mn-yellow)]');
  });

  it('renders PERFIL button when user is unauthenticated', () => {
    const html = renderToString(
      <HeaderMobileNav
        currentTab="feed"
        isAuthenticated={false}
        isCreator={false}
        onNavigate={() => {}}
      />
    );

    expect(html).toContain('PERFIL');
  });
});
