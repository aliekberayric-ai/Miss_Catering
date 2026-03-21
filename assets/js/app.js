import { CONFIG } from './config.js';
import { loadSiteData } from './data.js';
import { getLang, setLang } from './i18n.js';

function escapeHtml(text = '') {
  return String(text).replace(/[&<>"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[char]));
}

function navLabel(key, lang) {
  const labels = {
    about: { de: 'Über uns', en: 'About us', tr: 'Hakkımızda' },
    staff: { de: 'Mitarbeiter', en: 'Team', tr: 'Ekibimiz' },
    prices: { de: 'Preislisten', en: 'Prices', tr: 'Fiyatlar' },
    packages: { de: 'Pakete', en: 'Packages', tr: 'Paketler' },
    menu: { de: 'Menü', en: 'Menu', tr: 'Menü' },
    gallery: { de: 'Galerie', en: 'Gallery', tr: 'Galeri' },
    contact: { de: 'Kontaktformular', en: 'Contact form', tr: 'İletişim Formu' },
    impressum: { de: 'Impressum', en: 'Legal notice', tr: 'Künye' },
    admin: { de: 'Admin Login', en: 'Admin Login', tr: 'Admin Girişi' }
  };

  return labels[key]?.[lang] || labels[key]?.de || key;
}

function pageTitleLabel(rawTitle, lang) {
  const map = {
    'Admin': { de: 'Admin', en: 'Admin', tr: 'Admin' },
    'Über uns': { de: 'Über uns', en: 'About us', tr: 'Hakkımızda' },
    'Mitarbeiter': { de: 'Mitarbeiter', en: 'Team', tr: 'Ekibimiz' },
    'Preislisten': { de: 'Preislisten', en: 'Prices', tr: 'Fiyatlar' },
    'Pakete': { de: 'Pakete', en: 'Packages', tr: 'Paketler' },
    'Menü': { de: 'Menü', en: 'Menu', tr: 'Menü' },
    'Galerie': { de: 'Galerie', en: 'Gallery', tr: 'Galeri' },
    'Kontaktformular': { de: 'Kontaktformular', en: 'Contact form', tr: 'İletişim Formu' },
    'Impressum': { de: 'Impressum', en: 'Legal notice', tr: 'Künye' },
    'Paket Builder': { de: 'Paket Builder', en: 'Package Builder', tr: 'Paket Oluşturucu' }
  };

  return map[rawTitle]?.[lang] || rawTitle || CONFIG.siteName || 'Miss Catering';
}

function renderLanguageSwitch(lang) {
  const langs = [
    { code: 'de', label: 'DE' },
    { code: 'en', label: 'EN' },
    { code: 'tr', label: 'TR' }
  ];

  return `
    <div class="lang-switch" aria-label="Language switch">
      ${langs.map(item => `
        <button
          type="button"
          class="${item.code === lang ? 'active' : ''}"
          data-lang="${item.code}"
          aria-pressed="${item.code === lang ? 'true' : 'false'}"
        >
          ${item.label}
        </button>
      `).join('')}
    </div>
  `;
}

function renderHeader(data, lang) {
  const header = document.querySelector('[data-header]');
  if (!header) return;

  const branding = data.branding || {};
  const logoText = branding.logoText || 'MC';
  const logoImage = data.branding?.logoImage || '';
  const tagline =
    branding.tagline?.[lang] ||
    branding.tagline?.de ||
    'Speisen mit Eleganz';

  header.innerHTML = `
    <div class="container nav-shell">
      <a class="brand" href="index.html" aria-label="${escapeHtml(CONFIG.siteName || 'Miss Catering')}">
        <div class="brand-mark">${escapeHtml(logoText)}</div>
        <div class="brand-copy">
          <strong>${escapeHtml(CONFIG.siteName || 'Miss Catering')}</strong>
          <span>${escapeHtml(tagline)}</span>
        </div>
      </a>

      <nav class="main-nav" aria-label="Main navigation">
        <a href="about.html">${navLabel('about', lang)}</a>
        <a href="staff.html">${navLabel('staff', lang)}</a>
        <a href="prices.html">${navLabel('prices', lang)}</a>
        <a href="packages.html">${navLabel('packages', lang)}</a>
        <a href="menu.html">${navLabel('menu', lang)}</a>
        <a href="gallery.html">${navLabel('gallery', lang)}</a>
        <a href="contact.html">${navLabel('contact', lang)}</a>
        <a href="impressum.html">${navLabel('impressum', lang)}</a>
        <a href="login.html">${navLabel('admin', lang)}</a>
      </nav>

      ${renderLanguageSwitch(lang)}
    </div>
  `;
}

function renderFooter(data, lang) {
  const footer = document.querySelector('[data-footer]');
  if (!footer) return;

  const branding = data.branding || {};
  const tagline =
    branding.tagline?.[lang] ||
    branding.tagline?.de ||
    'Speisen mit Eleganz';

  const contact = data.contact || {};
  const impressum = data.impressum || {};

  footer.innerHTML = `
    <div class="container footer-grid">
      <div>
        <strong>${escapeHtml(CONFIG.siteName || 'Miss Catering')}</strong>
        <p>${escapeHtml(tagline)}</p>
      </div>

      <div>
        <strong>${navLabel('contact', lang)}</strong>
        <p>
          ${escapeHtml(contact.address || '')}<br>
          ${escapeHtml(contact.phone || '')}<br>
          ${escapeHtml(contact.mail || CONFIG.siteEmail || '')}
        </p>
      </div>

      <div>
        <strong>${navLabel('impressum', lang)}</strong>
        <p>
          ${escapeHtml(impressum.owner || '')}<br>
          ${escapeHtml(impressum.street || '')}<br>
          ${escapeHtml(impressum.city || '')}
        </p>
      </div>
    </div>
  `;
}

function markActiveNav() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === path) {
      link.classList.add('active');
    }
  });
}

function bindLanguageButtons() {
  document.querySelectorAll('[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang');
      if (!lang) return;
      setLang(lang);
      location.reload();
    });
  });
}

function applyDocumentTitle(lang) {
  const rawTitle = document.body?.dataset?.title || '';
  const label = pageTitleLabel(rawTitle, lang);
  document.title = `${label} | ${CONFIG.siteName || 'Miss Catering'}`;
}

async function initChrome() {
  const lang = getLang();
  const data = await loadSiteData();

  renderHeader(data, lang);
  renderFooter(data, lang);
  markActiveNav();
  bindLanguageButtons();
  applyDocumentTitle(lang);
}

window.addEventListener('DOMContentLoaded', initChrome);
