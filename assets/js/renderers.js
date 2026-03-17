import { loadSiteData, pickLang, money } from './data.js';
import { t } from './i18n.js';

export async function renderHome() {
  const data = await loadSiteData();
  const target = document.querySelector('#home-sections');
  if (!target) return;
  const cards = [
    ['about.html', t('aboutTitle')],
    ['packages.html', t('packagesTitle')],
    ['menu.html', t('menuTitle')],
    ['gallery.html', t('galleryTitle')],
    ['contact.html', t('contactTitle')],
    ['prices.html', t('pricesTitle')]
  ];
  target.innerHTML = cards.map(([href, title]) => `
    <a class="feature-card" href="${href}">
      <h3>${title}</h3>
      <p>${pickLang(data.branding.tagline)}</p>
    </a>
  `).join('');
}

export async function renderAbout() {
  const data = await loadSiteData();
  const el = document.querySelector('#about-content');
  if (!el) return;
  el.innerHTML = `<div class="page-card"><p>${pickLang(data.about)}</p></div>`;
}

export async function renderTeam() {
  const data = await loadSiteData();
  const el = document.querySelector('#team-grid');
  if (!el) return;
  el.innerHTML = data.team.map(member => `
    <article class="team-card">
      <img src="${member.image}" alt="${member.name}">
      <div>
        <h3>${member.name}</h3>
        <p>${pickLang(member.role)}</p>
      </div>
    </article>
  `).join('');
}

export async function renderPrices() {
  const data = await loadSiteData();
  const el = document.querySelector('#price-grid');
  if (!el) return;
  el.innerHTML = data.priceLists.map(item => `
    <article class="price-card">
      <h3>${pickLang(item.title)}</h3>
      <p>${money(item.price)} ${item.unit === 'person' ? t('perPerson') : t('perPortion')}</p>
    </article>
  `).join('');
}

export async function renderPackages() {
  const data = await loadSiteData();
  const el = document.querySelector('#packages-grid');
  if (!el) return;
  el.innerHTML = data.packages.map(item => `
    <article class="package-card">
      <h3>${pickLang(item.title)}</h3>
      <p>${pickLang(item.description)}</p>
      <div class="price-row">${money(item.basePricePerPerson)} ${t('perPerson')}</div>
      <a class="btn btn-primary" href="package-detail.html?slug=${item.slug}">${t('choosePackage')}</a>
    </article>
  `).join('');
}

export async function renderMenu() {
  const data = await loadSiteData();
  const el = document.querySelector('#menu-sections');
  if (!el) return;
  const groups = [
    ['fingerfood', 'Fingerfood'],
    ['starters', 'Vorspeisen'],
    ['mains', 'Hauptgerichte'],
    ['desserts', 'Desserts']
  ];

  el.innerHTML = groups.map(([key, title]) => `
    <section class="menu-group">
      <h2>${title}</h2>
      <div class="menu-list">
        ${data.catalog[key].map(item => `
          <article class="menu-item">
            <h3>${pickLang(item.name)}</h3>
            <p>${money(item.price)} ${item.unit === 'person' ? t('perPerson') : t('perPortion')}</p>
          </article>
        `).join('')}
      </div>
    </section>
  `).join('');
}

export async function renderGallery() {
  const data = await loadSiteData();
  const el = document.querySelector('#gallery-grid');
  if (!el) return;
  if (!data.gallery?.length) {
    el.innerHTML = `<p>${t('galleryEmpty')}</p>`;
    return;
  }
  el.innerHTML = data.gallery.map(item => `
    <figure class="gallery-card">
      <img src="${item.image}" alt="${item.title}">
      <figcaption>${item.title}</figcaption>
    </figure>
  `).join('');
}

export async function renderImpressum() {
  const data = await loadSiteData();
  const el = document.querySelector('#impressum-content');
  if (!el) return;
  const i = data.impressum;
  el.innerHTML = `
    <div class="page-card">
      <h2>${i.company}</h2>
      <p>${i.owner}<br>${i.street}<br>${i.city}</p>
      <p>E-Mail: ${i.mail}<br>Telefon: ${i.phone}</p>
    </div>
  `;
}
