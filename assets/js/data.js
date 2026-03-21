import { getSupabaseClient } from './supabase.js';
import { getLang } from './i18n.js';

let cache = null;

function normalizeRows(rows = []) {
  const map = {};
  for (const row of rows) {
    if (!row || !row.section_key) continue;
    map[row.section_key] = row.payload;
  }
  return map;
}

async function loadFromSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('site_content')
      .select('section_key, payload');

    if (error) {
      console.warn('Supabase load failed:', error.message);
      return null;
    }

    return normalizeRows(data || []);
  } catch (error) {
    console.warn('Supabase exception:', error.message);
    return null;
  }
}

async function loadJsonFallback() {
  try {
    const res = await fetch('./assets/data/site-data.json', {
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error(`site-data.json not found (${res.status})`);
    }

    return await res.json();
  } catch (error) {
    console.warn('JSON fallback failed:', error.message);
    return {};
  }
}

function mergeData(map = {}, fallback = {}) {
  return {
    branding: map.branding || fallback.branding || {
      logoText: 'MC',
      "logoImage": '',
      tagline: {
        de: 'Speisen mit Eleganz',
        en: 'Cuisine with elegance',
        tr: 'Zarafetli Türk mutfağı'
      }
    },

    about: map.about || fallback.about || {
      de: '',
      en: '',
      tr: ''
    },

    team: map.team || fallback.team || [],

    priceLists: map.priceLists || fallback.priceLists || [],

    packages: map.packages || fallback.packages || [],

    gallery: map.gallery || fallback.gallery || [],

    contact: map.contact || fallback.contact || {
      address: '',
      phone: '',
      mail: ''
    },

    impressum: map.impressum || fallback.impressum || {
      company: 'Miss Catering',
      owner: '',
      street: '',
      city: '',
      mail: '',
      phone: ''
    },

    catalog: map.catalog || fallback.catalog || {
      fingerfood: [],
      starters: [],
      mains: [],
      desserts: []
    },

    homeSections: map.homeSections || fallback.homeSections || []
  };
}

export async function loadSiteData() {
  if (cache) return cache;

  const fallback = await loadJsonFallback();
  const supabaseMap = await loadFromSupabase();

  cache = mergeData(supabaseMap || {}, fallback || {});
  return cache;
}

export function clearSiteDataCache() {
  cache = null;
}

export function pickLang(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';

  const lang = getLang();
  return value[lang] || value.de || value.en || value.tr || '';
}

export function money(value) {
  const lang = getLang();

  const locale =
    lang === 'tr' ? 'tr-TR' :
    lang === 'en' ? 'en-GB' :
    'de-DE';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR'
  }).format(Number(value || 0));
}
