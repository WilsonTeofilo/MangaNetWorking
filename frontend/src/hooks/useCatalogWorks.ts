import { useEffect, useState } from 'react';
import { Work } from '../types';
import { MOCK_WORKS } from '../data/mockData';
import { workApi } from '../api/workApi';
import { mapFeedToWork } from '../utils/apiMappers';

/**
 * Carrega o catálogo do feed; fixtures só são usadas em desenvolvimento.
 */
export function useCatalogWorks(): Work[] {
  const [works, setWorks] = useState<Work[]>(import.meta.env.DEV ? MOCK_WORKS : []);

  useEffect(() => {
    let active = true;
    workApi
      .getFeed('recommended', undefined, 50)
      .then((list) => {
        if (!active) return;
        const mapped = Array.isArray(list) ? list.map(mapFeedToWork) : [];
        setWorks(mapped.length ? mapped : (import.meta.env.DEV ? MOCK_WORKS : []));
      })
      .catch(() => {
        if (active && !import.meta.env.DEV) setWorks([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return works;
}
