export type TranslationCatalog = Record<string, Record<string, string>>;

export function resolveLocale(localeOverride: string, contextLocale: string, catalogs: TranslationCatalog): string {
  const requested = (localeOverride || contextLocale || 'en').toLowerCase().replace('_', '-');
  const [base] = requested.split('-');
  return catalogs[requested] ? requested : catalogs[base] ? base : 'en';
}

export function translate(
  key: string,
  locale: string,
  catalogs: TranslationCatalog[],
  fallback: TranslationCatalog,
): string {
  for (const catalog of catalogs) {
    const value = catalog[locale]?.[key];
    if (value) return value;
  }
  return fallback.en?.[key] ?? key;
}

export function resolveTheme(theme: 'light' | 'dark' | 'auto', prefersLight: boolean): 'light' | 'dark' {
  return theme === 'auto' ? (prefersLight ? 'light' : 'dark') : theme;
}
