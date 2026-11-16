import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { HeaderNav } from '../HeaderNav';

describe('HeaderNav', () => {
  it('renders SOBRE tab with yellow active class when currentTab is about', () => {
    const html = renderToString(
      <HeaderNav currentTab="about" favoritesCount={0} onNavigate={() => {}} />
    );

    expect(html).toContain('SOBRE');
    expect(html).toContain('bg-[var(--mn-yellow)]');
    expect(html).not.toContain('bg-[var(--mn-red)]');
  });

  it('hides count when favoritesCount is 0', () => {
    const html = renderToString(
      <HeaderNav currentTab="feed" favoritesCount={0} onNavigate={() => {}} />
    );

    expect(html).toContain('BIBLIOTECA');
    expect(html).not.toContain('(0)');
  });

  it('shows count when favoritesCount is greater than 0', () => {
    const html = renderToString(
      <HeaderNav currentTab="feed" favoritesCount={4} onNavigate={() => {}} />
    );

    expect(html).toContain('BIBLIOTECA');
    expect(html).toContain('(4)');
  });
});
