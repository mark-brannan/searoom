// Display catalogs, merged. Two sources, one plane (ADR 0003 / REQ-LANG-6):
//
// - **Package catalogs** — colregs `data/i18n/<lang>.json` — own the closed
//   vocabularies: light names, fact values, modality, role and encounter
//   labels. Those words are the package's to define; the app must not hold a
//   second copy that can drift from the ids it ships.
// - **App catalogs** — `./en.json`, `./fi.json` — own the chrome: buttons,
//   headings, signpost prose, anything composed rather than named.
//
// A package string supersedes an app string of the same key, so extraction
// upstream is a delete here, never a rewrite. `catalogDuplicates()` names any
// key still held in both; `i18n.test.ts` asserts it is empty.
//
// Key shape: the package stores `category:value` under a category object
// (`strings.lights['light:masthead']`); the app's message ids are
// `category.value`. A key that already carries its own `category:` prefix
// keeps it (`:` becomes `.`); one that does not is qualified by the object it
// sits in (`jurisdictions.intl`).

import pkgEn from 'colregs/data/i18n/en.json' with { type: 'json' };
import pkgFi from 'colregs/data/i18n/fi.json' with { type: 'json' };
import appEn from './en.json' with { type: 'json' };
import appFi from './fi.json' with { type: 'json' };

export type Catalog = Record<string, string>;

/** colregs' i18n file shape — static strings only, no ICU (REQ-LANG-6). */
interface PackageCatalog {
  language: string;
  provenance?: {
    contributors?: string[];
    reviewed_by?: string[];
    review_date?: string;
  };
  strings: Record<string, Record<string, string>>;
}

/** `{ lights: { 'light:masthead': … } }` -> `{ 'light.masthead': … }`. */
export function flattenPackageCatalog(cat: PackageCatalog): Catalog {
  const out: Catalog = {};
  for (const [category, entries] of Object.entries(cat.strings)) {
    for (const [key, value] of Object.entries(entries)) {
      out[key.includes(':') ? key.replace(':', '.') : `${category}.${key}`] =
        value;
    }
  }
  return out;
}

const packageCatalogs: Record<string, Catalog> = {
  en: flattenPackageCatalog(pkgEn as PackageCatalog),
  fi: flattenPackageCatalog(pkgFi as PackageCatalog),
};

const appCatalogs: Record<string, Catalog> = {
  en: appEn as Catalog,
  fi: appFi as Catalog,
};

export const LOCALES = ['en', 'fi'] as const;
export type Locale = (typeof LOCALES)[number];

export function isLocale(v: string): v is Locale {
  return (LOCALES as readonly string[]).includes(v);
}

/**
 * The catalog react-intl is given for `locale`. English underneath, so an
 * untranslated key falls back to English rather than rendering its id — the
 * gap is deliberate and visible under the draft label (REQ-LANG-8). Package
 * strings sit above app strings at each language.
 */
export function catalogFor(locale: Locale): Catalog {
  if (locale === 'en') return { ...appCatalogs.en, ...packageCatalogs.en };
  return {
    ...appCatalogs.en,
    ...packageCatalogs.en,
    ...appCatalogs[locale],
    ...packageCatalogs[locale],
  };
}

/**
 * Keys a language holds in both the app catalog and the package catalog —
 * the duplication REQ-LANG-6 extraction is meant to remove. Empty is the
 * invariant; a non-empty list means a label the package now owns is still
 * being maintained app-side.
 */
export function catalogDuplicates(locale: Locale): string[] {
  const app = appCatalogs[locale] ?? {};
  return Object.keys(packageCatalogs[locale] ?? {})
    .filter((k) => k in app)
    .sort();
}

/** Provenance of a package catalog, for the locale picker and the review pack. */
export function packageProvenance(locale: Locale) {
  const cat = (locale === 'fi' ? pkgFi : pkgEn) as PackageCatalog;
  return cat.provenance;
}

export const catalogs: Record<Locale, Catalog> = {
  en: catalogFor('en'),
  fi: catalogFor('fi'),
};
