import { useEffect, useRef } from 'react';
import { AnalyticsSurface, trackImpression } from '../api/discoveryAnalyticsApi';

/**
 * Dispara a impressão quando o card fica pelo menos 50% visível por ~1 segundo.
 * Re-render, scroll de volta e remontagem não duplicam: a chave da sessão é estável e o
 * servidor também deduplica.
 */
export function useWorkImpression(
  workId: string,
  surface?: AnalyticsSurface,
  enabled = true
) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !surface || !enabled || !workId) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      trackImpression(workId, surface);
      return;
    }

    let timer: number | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (timer === null) {
              timer = window.setTimeout(() => {
                trackImpression(workId, surface);
                timer = null;
              }, 1000);
            }
          } else if (timer !== null) {
            window.clearTimeout(timer);
            timer = null;
          }
        }
      },
      { threshold: [0, 0.5, 1] }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [workId, surface, enabled]);

  return ref;
}
