/**
 * O backend recebe `publicReleaseAt` como `LocalDateTime` (ISO-8601 sem offset/timezone).
 * `Date.toISOString()` produz UTC com sufixo "Z", que o Jackson NÃO desserializa como LocalDateTime.
 * Este helper devolve o horário local no formato "YYYY-MM-DDTHH:mm:ss", evitando enviar uma data
 * deslocada (o que marcaria incorretamente o capítulo como acesso antecipado).
 */
export function toBackendLocalDateTime(date: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}
