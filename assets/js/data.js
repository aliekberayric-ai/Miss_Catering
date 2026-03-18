import { getLang } from './i18n.js';
import { getSupabaseClient } from './supabase.js';

let cache = null;

async function loadJsonFallback() {
  const response = await fetch('assets/data/site-data.json');
  return await response.json();
}

async function loadFromSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('site_content')
    .select('section_key, payload');

  if (error || !data) return null;

  const map = Object.fromEntries(data.map(row => [row.section_key, row.payload]));

  return {
    branding: {
      logoText: 'MC',
      tagline: {
        de: 'Türkische Speisen mit Eleganz',
        en: 'Turkish cuisine with elegance',
        tr: 'Zarafetle Türk mutfağı'
      }
    },
    homeSections: map.homeSections || [],
    about: map.about || {},
    team: map.team || [],
    priceLists: map.priceLists || [],
    packages: map.packages || [],
    catalog: map.catalog || { fingerfood: [], starters: [], mains: [], desserts: [] },
    gallery: map.gallery || [],
    contact: map.contact || {},
    impressum: map.impressum || {}
  };
}

export async function loadSiteData() {
  if (cache) return cache;

  const supabaseData = await loadFromSupabase();
  if (supabaseData) {
    cache = supabaseData;
    return cache;
  }

  cache = await loadJsonFallback();
  return cache;
}

export function clearSiteDataCache() {
  cache = null;
}

export function pickLang(value) {
  if (typeof value === 'string') return value;
  const lang = getLang();
  return value?.[lang] || value?.de || '';
}

export function money(value) {
  return new Intl.NumberFormat(
    getLang() === 'de' ? 'de-DE' : getLang() === 'tr' ? 'tr-TR' : 'en-GB',
    { style: 'currency', currency: 'EUR' }
  ).format(Number(value || 0));
}
