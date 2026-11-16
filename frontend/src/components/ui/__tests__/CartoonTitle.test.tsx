import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CartoonTitle } from '../CartoonTitle';

describe('CartoonTitle', () => {
  it('renderiza título com acessibilidade no container e blocos alternados', () => {
    const html = renderToString(<CartoonTitle title="TESTE MIOMYA" />);

    expect(html).toContain('aria-label="TESTE MIOMYA"');
    expect(html).toContain('bg-black');
    expect(html).toContain('bg-white');
    expect(html).toContain('T');
    expect(html).toContain('M');
  });

  it('retorna null quando título é vazio ou só espaços', () => {
    const html = renderToString(<CartoonTitle title="   " />);
    expect(html).toBe('');
  });
});
