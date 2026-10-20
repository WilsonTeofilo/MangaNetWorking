/**
 * Cloudflare Pages Function — Proxy Reverso Serverless para o Backend MangaNetWorking
 *
 * Rota: /api/* -> https://{BACKEND_API_HOST}/api/* (ou http://{BACKEND_API_HOST}/api/*)
 *
 * Configuração:
 * Defina a variável de ambiente BACKEND_API_URL no dashboard do Cloudflare Pages
 * (Settings -> Environment variables) com o IP/host da sua VM Oracle (ex: http://140.238.xx.xx:80 ou https://api.manganetworking.com).
 * Se não configurada, o fallback aponta para o localhost padrão.
 */

interface Env {
  BACKEND_API_URL?: string;
}

// Headers "hop-by-hop" que NÃO devem ser repassados por proxies HTTP (RFC 7230)
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // Determina a URL base do backend (configurada via dashboard Cloudflare Pages)
  const backendBase = (env.BACKEND_API_URL || 'http://localhost:8085').replace(/\/+$/, '');
  const targetUrl = `${backendBase}${url.pathname}${url.search}`;

  // Clona e filtra os headers da requisição
  const forwardHeaders = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const lowerKey = key.toLowerCase();
    if (!HOP_BY_HOP_HEADERS.has(lowerKey) && lowerKey !== 'host') {
      forwardHeaders.set(key, value);
    }
  }

  // Identifica o cliente original para proteção de auditoria e rate-limit no Spring
  const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip');
  if (clientIp) {
    forwardHeaders.set('x-forwarded-for', clientIp);
  }
  forwardHeaders.set('x-forwarded-proto', url.protocol.replace(':', ''));
  forwardHeaders.set('x-forwarded-host', url.host);

  try {
    const init: RequestInit = {
      method: request.method,
      headers: forwardHeaders,
      redirect: 'manual',
    };

    // Repassa o corpo da requisição (JSON, multipart/form-data de capítulos, etc.)
    if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) {
      init.body = request.body;
      // @ts-ignore Cloudflare Workers streaming body duplex flag
      init.duplex = 'half';
    }

    const backendResponse = await fetch(targetUrl, init);

    // Constrói os headers de resposta preservando cookies (Set-Cookie) e segurança
    const responseHeaders = new Headers();
    for (const [key, value] of backendResponse.headers.entries()) {
      const lowerKey = key.toLowerCase();
      if (!HOP_BY_HOP_HEADERS.has(lowerKey)) {
        responseHeaders.append(key, value);
      }
    }

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        status: 502,
        error: 'Bad Gateway',
        message: 'Não foi possível conectar ao servidor backend da MangaNetWorking.',
        details: error?.message || 'Gateway Timeout / Connection Refused',
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
