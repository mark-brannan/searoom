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

export const catalogs: Record<Locale, Catalog> = {
  en: catalogFor('en'),
  fi: catalogFor('fi'),
};

/**
 * Pseudo-locale for layout testing: the English catalog accented and
 * lengthened ~40%, so clipping and overflow show up before a real translation
 * is in. Reached only by `?loc=en-XA`; it is not in `catalogs`, so the
 * language picker never lists it and a stored preference never selects it.
 * ICU placeholders (`{name}`, plural and select blocks) and tags are left
 * intact so messages still format.
 */
export const PSEUDO_LOCALE = 'en-XA';

const ACCENTS: Record<string, string> = {
  a: 'à',
  b: 'ƀ',
  c: 'ç',
  d: 'ð',
  e: 'é',
  f: 'ƒ',
  g: 'ĝ',
  h: 'ĥ',
  i: 'î',
  j: 'ĵ',
  k: 'ķ',
  l: 'ļ',
  n: 'ñ',
  o: 'ö',
  p: 'þ',
  r: 'ŕ',
  s: 'š',
  t: 'ţ',
  u: 'ü',
  w: 'ŵ',
  y: 'ý',
  z: 'ž',
  A: 'À',
  B: 'Ɓ',
  C: 'Ç',
  D: 'Ð',
  E: 'É',
  G: 'Ĝ',
  H: 'Ĥ',
  I: 'Î',
  K: 'Ķ',
  L: 'Ļ',
  N: 'Ñ',
  O: 'Ö',
  P: 'Þ',
  R: 'Ŕ',
  S: 'Š',
  T: 'Ţ',
  U: 'Ü',
  W: 'Ŵ',
  Y: 'Ý',
  Z: 'Ž',
};

/**
 * Accent the message text, pad with ~40% filler, bracket. Argument heads
 * (`{n, plural, one`), `#` and `<tags>` stay as they are; the text inside
 * plural/select branches is accented like the rest.
 */
export function pseudoLocalize(message: string): string {
  let i = 0;
  // Text up to the `}` that closes the enclosing branch, or the end.
  const text = (nested: boolean): string => {
    let out = '';
    while (i < message.length) {
      const ch = message[i];
      if (ch === '}' && nested) return out;
      if (ch === '{') out += argument();
      else if (ch === '<') {
        const end = message.indexOf('>', i);
        const stop = end < 0 ? message.length : end + 1;
        out += message.slice(i, stop);
        i = stop;
      } else {
        out += nested && ch === '#' ? ch : (ACCENTS[ch] ?? ch);
        i++;
      }
    }
    return out;
  };
  // `{…}` from its `{` to its `}`: head copied, each `{branch}` body as text.
  const argument = (): string => {
    let out = message[i++];
    while (i < message.length) {
      const ch = message[i++];
      out += ch;
      if (ch === '}') return out;
      if (ch === '{') {
        out += text(true);
        if (i < message.length) out += message[i++];
      }
    }
    return out;
  };
  const out = text(false);
  // spaced, so the filler wraps like words instead of forcing one wide line
  const pad = Array(Math.ceil(message.length * 0.2)).fill('~').join(' ');
  return `[${out} ${pad}]`;
}

export function pseudoCatalog(): Catalog {
  return Object.fromEntries(
    Object.entries(catalogFor('en')).map(([k, v]) => [k, pseudoLocalize(v)]),
  );
}
