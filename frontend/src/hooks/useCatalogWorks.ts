import { useEffect, useState } from 'react';
import { Work } from '../types';
import { workApi } from '../api/workApi';
import { mapFeedToWork } from '../utils/apiMappers';

/**
 * Carrega o catálogo do feed da API real (sem fixtures/mocks em ambiente nenhum).
 */
export function useCatalogWorks(): Work[] {
  const [works, setWorks] = useState<Work[]>([]);

  useEffect(() => {
    let active = true;
    workApi
      .getFeed('recommended', undefined, 50)
      .then((list) => {
        if (!active) return;
        const mapped = Array.isArray(list) ? list.map(mapFeedToWork) : [];
        setWorks(mapped);
      })
      .catch(() => {
        if (active) setWorks([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return works;
}
