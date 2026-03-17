import { getLang } from './i18n.js';

let cache = null;

export async function loadSiteData() {
  if (cache) return cache;
  const response = await fetch('assets/data/site-data.json');
  cache = await response.json();
  return cache;
}

export function pickLang(value) {
  if (typeof value === 'string') return value;
  const lang = getLang();
  return value?.[lang] || value?.de || '';
}

export function money(value) {
  return new Intl.NumberFormat(getLang() === 'de' ? 'de-DE' : getLang() === 'tr' ? 'tr-TR' : 'en-GB', {
    style: 'currency',
    currency: 'EUR'
  }).format(Number(value || 0));
}
