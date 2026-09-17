import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Lang } from '../api/types';
import { en, type Dict, type MsgKey } from './en';
import { ar } from './ar';
import { localizeNumerals } from './formatNumber';

const BUNDLES: Record<Lang, Dict> = { en, ar };

type Vars = Record<string, string | number>;

export interface I18n {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  setLang: (lang: Lang) => void;
  /** Typed lookup. A missing key is a compile error. */
  t: (key: MsgKey, vars?: Vars) => string;
  /**
   * Lookup for open-ended backend vocabularies (degradation kinds, chart view
   * names). Falls back to the raw value when the bundle has no entry.
   */
  tOpen: (key: string, fallback: string) => string;
}

const I18nContext = createContext<I18n | null>(null);

function interpolate(template: string, vars: Vars | undefined, lang: Lang): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = vars[name];
    if (value === undefined) return whole;
    return typeof value === 'number' ? localizeNumerals(String(value), lang) : value;
  });
}

export function I18nProvider({
  children,
  initialLang = 'en',
}: {
  children: ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = dir;
  }, [lang, dir]);

  const t = useCallback(
    (key: MsgKey, vars?: Vars) => interpolate(BUNDLES[lang][key], vars, lang),
    [lang],
  );

  const tOpen = useCallback(
    (key: string, fallback: string) => {
      const bundle = BUNDLES[lang] as Record<string, string | undefined>;
      return bundle[key] ?? fallback;
    },
    [lang],
  );

  const value = useMemo<I18n>(() => ({ lang, dir, setLang, t, tOpen }), [lang, dir, t, tOpen]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
