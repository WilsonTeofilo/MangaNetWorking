import { useEffect, useState } from 'react';
import { Work } from '../types';
import { MOCK_WORKS } from '../data/mockData';
import { workApi } from '../api/workApi';
import { mapFeedToWork } from '../utils/apiMappers';

/**
 * Carrega o catálogo a partir do feed real (`GET /api/feed`) com fallback para os mocks.
 * Garante que a demo nunca fique vazia caso a API esteja indisponível ou sem obras.
 */
export function useCatalogWorks(): Work[] {
  const [works, setWorks] = useState<Work[]>(MOCK_WORKS);

  useEffect(() => {
    let active = true;
    workApi
      .getFeed('recommended', undefined, 50)
      .then((list) => {
        if (active && Array.isArray(list) && list.length > 0) {
          setWorks(list.map(mapFeedToWork));
        }
      })
      .catch(() => {
        // Mantém os mocks se o feed falhar.
      });
    return () => {
      active = false;
    };
  }, []);

  return works;
}
