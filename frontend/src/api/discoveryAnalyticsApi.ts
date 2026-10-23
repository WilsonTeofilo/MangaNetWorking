/**
 * Tracking first-party mínimo de descoberta.
 *
 * Regras de produto:
 * - impressão = card ≥50% visível por ~1s (o hook cuida disso);
 * - abertura = clique na obra, com a superfície de origem;
 * - uma chave por sessão/superfície/obra: retry, re-render e scroll não duplicam;
 * - só leitor autenticado é rastreado (o servidor devolve 401 para anônimo e nada é
 *   gravado); não há fingerprint, IP, e-mail ou texto lido.
 */
export type AnalyticsSurface =
  | 'FEED'
  | 'CATALOGO'
  | 'BUSCA'
  | 'RECOMENDACAO'
  | 'PERFIL_CRIADOR'
  | 'BIBLIOTECA'
  | 'EXTERNO'
  | 'DIRETO';

export interface ImpressionPayload {
  workId: string;
  surface: AnalyticsSurface;
  impressionKey: string;
}

const SESSION_STORAGE_KEY = 'mn:analytics:session';
const QUEUE: ImpressionPayload[] = [];
const SENT = new Set<string>();
const SENT_OPENINGS = new Set<string>();
let flushTimer: number | null = null;

function sessionId(): string {
  try {
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) return stored;
    const generated =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, generated);
    return generated;
  } catch {
    // sessionStorage bloqueado (modo privado restrito): usa um id só em memória.
    return 'sessao-efemera';
  }
}

function impressionKey(workId: string, surface: AnalyticsSurface): string {
  return `${sessionId()}:${surface}:${workId}`;
}

/** Enfileira a impressão e agenda um envio em lote (máx. 20 por POST). */
export function trackImpression(workId: string, surface: AnalyticsSurface): void {
  if (!workId) return;
  const key = impressionKey(workId, surface);
  if (SENT.has(key)) return;
  SENT.add(key);
  QUEUE.push({ workId, surface, impressionKey: key });
  if (flushTimer === null) {
    flushTimer = window.setTimeout(flushImpressions, 800);
  }
}

function flushImpressions(): void {
  flushTimer = null;
  while (QUEUE.length > 0) {
    const batch = QUEUE.splice(0, 20);
    const body = JSON.stringify({ impressions: batch });
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon('/api/analytics/impressions', blob);
      } else {
        void fetch('/api/analytics/impressions', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => undefined);
      }
    } catch {
      // Telemetria é best-effort: nunca bloqueia a navegação.
    }
  }
}

/** Registra a abertura antes de navegar para a obra. */
export function trackOpening(workId: string, surface: AnalyticsSurface): void {
  if (!workId) return;
  const key = impressionKey(workId, surface);
  if (SENT_OPENINGS.has(key)) return;
  SENT_OPENINGS.add(key);
  try {
    void fetch('/api/analytics/openings', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workId, surface, openingKey: key }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Best-effort.
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushImpressions);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushImpressions();
  });
}
