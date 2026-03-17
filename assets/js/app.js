import { t, getLang, setLang } from './i18n.js';
import { loadSiteData, pickLang } from './data.js';

function navItems() {
  return [
    ['about.html', t('aboutTitle')],
    ['staff.html', t('staffTitle')],
    ['prices.html', t('pricesTitle')],
    ['packages.html', t('packagesTitle')],
    ['menu.html', t('menuTitle')],
    ['gallery.html', t('galleryTitle')],
    ['contact.html', t('contactTitle')],
    ['impressum.html', t('impressumTitle')],
    ['login.html', t('loginTitle')]
  ];
}

export async function renderLayout(pageTitle = '') {
  const data = await loadSiteData();
  const header = document.querySelector('[data-header]');
  const footer = document.querySelector('[data-footer]');
  const logoText = data.branding?.logoText || 'MC';

  if (header) {
    header.innerHTML = `
      <div class="container nav-wrap">
        <a class="brand" href="index.html">
          <span class="logo-mark">${logoText}</span>
          <span>
            <strong>Miss Catering</strong>
            <small>${pickLang(data.branding.tagline)}</small>
          </span>
        </a>
        <nav class="nav-links">
          ${navItems().map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}
        </nav>
        <div class="lang-switcher">
          ${['de', 'en', 'tr'].map(lang => `<button class="lang-btn ${getLang() === lang ? 'is-active' : ''}" data-lang="${lang}">${lang.toUpperCase()}</button>`).join('')}
        </div>
      </div>
    `;
  }

  if (footer) {
    footer.innerHTML = `
      <div class="container footer-grid">
        <div>
          <h3>Miss Catering</h3>
          <p>${pickLang(data.branding.tagline)}</p>
        </div>
        <div>
          <h4>${t('contactTitle')}</h4>
          <p>${data.contact.address}<br>${data.contact.phone}<br>${data.contact.mail}</p>
        </div>
        <div>
          <h4>${t('impressumTitle')}</h4>
          <p>${data.impressum.owner}<br>${data.impressum.street}<br>${data.impressum.city}</p>
        </div>
      </div>
    `;
  }

  if (pageTitle) {
    document.title = `${pageTitle} | Miss Catering`;
  }

  document.querySelectorAll('[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      setLang(btn.dataset.lang);
      location.reload();
    });
  });
}

export function setHeroImage() {
  const hero = document.querySelector('.hero-image');
  if (hero) hero.innerHTML = '<div class="hero-card"><span>MC</span></div>';
}

document.addEventListener('DOMContentLoaded', async () => {
  const pageTitle = document.body.dataset.title || '';
  await renderLayout(pageTitle);
  setHeroImage();
});
