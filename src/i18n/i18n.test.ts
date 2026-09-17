// The display-catalog split (REQ-LANG-6): closed vocabularies come from the
// colregs package, chrome stays app-side, and no key is maintained in both.

import { describe, expect, it } from 'vitest';
import pkgEn from 'colregs/data/i18n/en.json' with { type: 'json' };
import appEn from './en.json' with { type: 'json' };
import appFi from './fi.json' with { type: 'json' };
import {
  LOCALES,
  catalogDuplicates,
  catalogFor,
  flattenPackageCatalog,
} from './index';

describe('display catalogs', () => {
  it('holds no key in both the app catalog and the package catalog', () => {
    for (const locale of LOCALES) {
      expect(catalogDuplicates(locale), locale).toEqual([]);
    }
  });

  it('flattens the package catalog onto the app key shape', () => {
    const flat = flattenPackageCatalog(pkgEn as never);
    // `category:value` keys keep their own prefix …
    expect(flat['light.masthead']).toBe('Masthead light');
    expect(flat['activity.trawling']).toBe('Trawling');
    // … and a bare key is qualified by the object it sits in.
    expect(flat['jurisdictions.intl']).toBe('International');
  });

  it('serves vocabulary labels the app no longer carries', () => {
    const en = catalogFor('en');
    for (const id of [
      'light.masthead',
      'modality.shall',
      'propulsion.sail',
      'activity.nuc',
      'position.anchored',
      'obstruction_side.port',
    ]) {
      expect(en[id], id).toBeTruthy();
      expect(appEn as Record<string, string>).not.toHaveProperty(id);
    }
  });

  it('lets a package string supersede an app string of the same key', () => {
    const app = { 'light.masthead': 'app copy', 'app.only': 'chrome' };
    const merged = { ...app, ...flattenPackageCatalog(pkgEn as never) };
    expect(merged['light.masthead']).toBe('Masthead light');
    expect(merged['app.only']).toBe('chrome');
  });

  it('falls back through Finnish to English rather than rendering an id', () => {
    const fi = catalogFor('fi');
    const en = catalogFor('en');
    for (const id of Object.keys(en)) expect(fi[id], id).toBeTruthy();
    // a key colregs ships in Finnish comes back Finnish …
    expect(fi['light.masthead']).toBe('Mastovalo');
    // … one it ships only in English falls back, not to the raw id
    expect(fi['role.give-way']).toBe(en['role.give-way']);
  });

  it('keeps Finnish fact labels app-side until colregs ships them', () => {
    // colregs fi.json covers lights and modality only; the fact vocabularies
    // stay in the app catalog, and must not be dropped in the split.
    const fi = appFi as Record<string, string>;
    for (const id of ['activity.nuc', 'position.anchored', 'propulsion.sail'])
      expect(fi, id).toHaveProperty(id);
  });

  it('translates every app chrome key into Finnish', () => {
    const missing = Object.keys(appEn as Record<string, string>).filter(
      (k) => !(k in (appFi as Record<string, string>)),
    );
    expect(missing).toEqual([]);
  });
});
