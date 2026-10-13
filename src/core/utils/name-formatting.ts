/** Normaliza nombres personales sin alterar acentos, guiones ni apóstrofes. */
export function formatPersonName(value?: string | null): string {
  if (!value) return '';

  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es-CO')
    .replace(/(^|[\s'-])(\p{L})/gu, (_match, separator: string, letter: string) =>
      `${separator}${letter.toLocaleUpperCase('es-CO')}`
    );
}
