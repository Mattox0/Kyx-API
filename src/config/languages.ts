export const SUPPORTED_LOCALES = ['fr', 'en'] as const;
export const DEFAULT_LOCALE = 'fr' as const;
export type Locale = typeof SUPPORTED_LOCALES[number];

export function detectLocale(acceptLanguage?: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const lang = acceptLanguage.split(',')[0].split('-')[0].toLowerCase().trim();
  return (SUPPORTED_LOCALES as readonly string[]).includes(lang) ? (lang as Locale) : DEFAULT_LOCALE;
}
