/**
 * Espelho da regra de username do servidor (`UsernamePolicy`).
 *
 * A decisão final é SEMPRE do backend: este módulo só existe para o leitor receber
 * o erro enquanto digita, em vez de descobrir depois do cadastro. As regras são:
 * minúsculas, sem espaço, só letras ASCII/números/ponto/sublinhado, 3–30 caracteres,
 * sem símbolo no início ou no fim, sem símbolo repetido e sem palavra reservada.
 */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

const PATTERN = /^[a-z0-9]+(?:[._][a-z0-9]+)*$/;

const RESERVED = new Set([
  'admin', 'administrador', 'administracao', 'root', 'owner', 'staff', 'equipe',
  'suporte', 'atendimento', 'contato', 'ajuda', 'sistema', 'moderador', 'moderacao',
  'oficial', 'verificado', 'manganetworking', 'manga', 'mangas', 'mangaonline',
  'instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'whatsapp', 'discord',
  'login', 'cadastro', 'registro', 'conta', 'perfil', 'usuario', 'usuarios',
  'api', 'www', 'app', 'site', 'loja', 'pagamento', 'financeiro', 'pix', 'vip',
]);

export type UsernameValidation =
  | { valid: true; value: string }
  | { valid: false; value: string; message: string };

/** Remove qualquer espaço em branco (o username nunca aceita espaço). */
export function sanitizeUsernameInput(raw: string): string {
  return raw.replace(/\s+/g, '').toLowerCase();
}

/** Valida e canonicaliza o username no cliente (mesma mensagem do servidor). */
export function validateUsername(raw: string): UsernameValidation {
  const value = sanitizeUsernameInput(raw);
  if (value.length < USERNAME_MIN_LENGTH || value.length > USERNAME_MAX_LENGTH) {
    return {
      valid: false,
      value,
      message: `O username deve ter entre ${USERNAME_MIN_LENGTH} e ${USERNAME_MAX_LENGTH} caracteres.`,
    };
  }
  if (!PATTERN.test(value)) {
    return {
      valid: false,
      value,
      message:
        'Use apenas letras sem acento, números, ponto e sublinhado — sem símbolo no início/fim e sem ponto ou sublinhado repetido.',
    };
  }
  if (RESERVED.has(value)) {
    return { valid: false, value, message: 'Este username é reservado para a plataforma. Escolha outro.' };
  }
  return { valid: true, value };
}
