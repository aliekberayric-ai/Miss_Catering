import { CONFIG } from './config.js';
import { getSession, isAdmin, logout } from './auth.js';
import { getSupabaseClient } from './supabase.js';
import { loadSiteData, clearSiteDataCache, pickLang } from './data.js';

const emptyCatalog = () => ({ fingerfood: [], starters: [], mains: [], desserts: [] });
const state = {
  team: [],
  priceLists: [],
  packages: [],
  catalog: emptyCatalog(),
  gallery: []
};

function escapeHtml(text = '') {
  return String(text).replace(/[&<>\"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[char]));
}

function pickText(item, key) {
  return item?.[key] || '';
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9äöüß\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function msg(text, isError = false) {
  const el = document.querySelector('#admin-message');
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? '#ff8a8a' : '#9ff0b7';
}

async function saveSection(sectionKey, payload) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase nicht verbunden.');

  const { error } = await supabase
    .from('site_content')
    .upsert({ section_key: sectionKey, payload }, { onConflict: 'section_key' });

  if (error) throw error;
  clearSiteDataCache();
}

function teamCardTemplate(item = {}) {
  return `
    <article class="admin-editor-card team-editor-card">
      <div class="admin-editor-top">
        <strong>${escapeHtml(item.name || 'Neuer Mitarbeiter')}</strong>
        <button type="button" class="btn btn-ghost remove-team-btn">Entfernen</button>
      </div>
      <div class="admin-form-grid admin-three-cols">
        <label>Name<input class="team-name" type="text" value="${escapeHtml(item.name || '')}" placeholder="Name"></label>
        <label>Rolle DE<input class="team-role-de" type="text" value="${escapeHtml(item.role?.de || '')}" placeholder="Geschäftsführung"></label>
        <label>Rolle EN<input class="team-role-en" type="text" value="${escapeHtml(item.role?.en || '')}" placeholder="Founder"></label>
        <label>Rolle TR<input class="team-role-tr" type="text" value="${escapeHtml(item.role?.tr || '')}" placeholder="Kurucu"></label>
        <label class="admin-span-2">Bild-URL<input class="team-image" type="text" value="${escapeHtml(item.image || '')}" placeholder="https://..."></label>
      </div>
    </article>
  `;
}

function priceCardTemplate(item = {}) {
  return `
    <article class="admin-editor-card price-editor-card">
      <div class="admin-editor-top">
        <strong>${escapeHtml(pickLang(item.title) || 'Neuer Preis')}</strong>
        <button type="button" class="btn btn-ghost remove-price-btn">Entfernen</button>
      </div>
      <div class="admin-form-grid admin-three-cols">
        <label>Titel DE<input class="price-title-de" type="text" value="${escapeHtml(item.title?.de || '')}" placeholder="Buffet Basic"></label>
        <label>Titel EN<input class="price-title-en" type="text" value="${escapeHtml(item.title?.en || '')}" placeholder="Buffet Basic"></label>
        <label>Titel TR<input class="price-title-tr" type="text" value="${escapeHtml(item.title?.tr || '')}" placeholder="Açık Büfe Basic"></label>
        <label>Preis<input class="price-value" type="number" step="0.01" value="${Number(item.price || 0)}"></label>
        <label>Einheit
          <select class="price-unit">
            <option value="person" ${item.unit === 'person' ? 'selected' : ''}>Person</option>
            <option value="portion" ${item.unit === 'portion' ? 'selected' : ''}>Portion</option>
            <option value="piece" ${item.unit === 'piece' ? 'selected' : ''}>Stück</option>
          </select>
        </label>
      </div>
    </article>
  `;
}

function packageCardTemplate(item = {}) {
  return `
    <article class="admin-editor-card package-editor-card">
      <div class="admin-editor-top">
        <strong>${escapeHtml(pickLang(item.title) || 'Neues Paket')}</strong>
        <button type="button" class="btn btn-ghost remove-package-btn">Entfernen</button>
      </div>
      <div class="admin-form-grid admin-two-cols">
        <label>Slug<input class="pkg-slug" type="text" value="${escapeHtml(item.slug || '')}" placeholder="business"></label>
        <label>Preis pro Person<input class="pkg-price" type="number" step="0.01" value="${Number(item.basePricePerPerson || 0)}"></label>
        <label>Titel DE<input class="pkg-title-de" type="text" value="${escapeHtml(item.title?.de || '')}" placeholder="Businesspaket"></label>
        <label>Titel EN<input class="pkg-title-en" type="text" value="${escapeHtml(item.title?.en || '')}" placeholder="Business Package"></label>
        <label>Titel TR<input class="pkg-title-tr" type="text" value="${escapeHtml(item.title?.tr || '')}" placeholder="Business Paketi"></label>
        <div></div>
        <label>Beschreibung DE<textarea class="pkg-desc-de" rows="3" placeholder="Deutsch">${escapeHtml(item.description?.de || '')}</textarea></label>
        <label>Beschreibung EN<textarea class="pkg-desc-en" rows="3" placeholder="English">${escapeHtml(item.description?.en || '')}</textarea></label>
        <label>Beschreibung TR<textarea class="pkg-desc-tr" rows="3" placeholder="Türkçe">${escapeHtml(item.description?.tr || '')}</textarea></label>
      </div>
    </article>
  `;
}

function menuCardTemplate(item = {}, category = '') {
  return `
    <article class="admin-editor-card menu-editor-card" data-category="${category}">
      <div class="admin-editor-top">
        <strong>${escapeHtml(pickLang(item.name) || 'Neuer Menüpunkt')}</strong>
        <button type="button" class="btn btn-ghost remove-menu-item-btn">Entfernen</button>
      </div>
      <div class="admin-form-grid admin-three-cols">
        <label>Name DE<input class="menu-name-de" type="text" value="${escapeHtml(item.name?.de || '')}" placeholder="Deutsch"></label>
        <label>Name EN<input class="menu-name-en" type="text" value="${escapeHtml(item.name?.en || '')}" placeholder="English"></label>
        <label>Name TR<input class="menu-name-tr" type="text" value="${escapeHtml(item.name?.tr || '')}" placeholder="Türkçe"></label>
        <label>Preis<input class="menu-price" type="number" step="0.01" value="${Number(item.price || 0)}"></label>
        <label>Einheit
          <select class="menu-unit">
            <option value="person" ${item.unit === 'person' ? 'selected' : ''}>Person</option>
            <option value="portion" ${item.unit === 'portion' ? 'selected' : ''}>Portion</option>
            <option value="piece" ${item.unit === 'piece' ? 'selected' : ''}>Stück</option>
          </select>
        </label>
      </div>
    </article>
  `;
}

function galleryCardTemplate(item = {}) {
  return `
    <article class="admin-editor-card gallery-editor-card">
      <div class="admin-editor-top">
        <strong>${escapeHtml(item.title || 'Neues Bild')}</strong>
        <button type="button" class="btn btn-ghost remove-gallery-btn">Entfernen</button>
      </div>
      <div class="admin-form-grid admin-two-cols">
        <label>Titel<input class="gallery-title" type="text" value="${escapeHtml(item.title || '')}" placeholder="Buffet"></label>
        <label>Bild-URL<input class="gallery-image" type="text" value="${escapeHtml(item.image || '')}" placeholder="https://..."></label>
      </div>
      <div class="gallery-preview-wrap">
        ${item.image ? `<img class="gallery-preview-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title || '')}">` : '<div class="gallery-preview-empty">Noch keine Bildvorschau</div>'}
      </div>
    </article>
  `;
}

function renderCards(selector, items, template) {
  const root = document.querySelector(selector);
  if (!root) return;
  root.innerHTML = items.length ? items.map(template).join('') : '<p class="notice">Noch keine Einträge.</p>';
}

function renderTeamEditor() {
  renderCards('#team-admin-list', state.team, teamCardTemplate);
}

function renderPricesEditor() {
  renderCards('#prices-admin-list', state.priceLists, priceCardTemplate);
}

function renderPackagesEditor() {
  renderCards('#packages-admin-list', state.packages, packageCardTemplate);
}

function renderMenuEditor() {
  const categories = [
    ['fingerfood', '#menu-fingerfood-list'],
    ['starters', '#menu-starters-list'],
    ['mains', '#menu-mains-list'],
    ['desserts', '#menu-desserts-list']
  ];
  categories.forEach(([category, selector]) => {
    renderCards(selector, state.catalog?.[category] || [], item => menuCardTemplate(item, category));
  });
}

function renderGalleryEditor() {
  renderCards('#gallery-admin-list', state.gallery, galleryCardTemplate);
}

function collectTeamFromDom() {
  return Array.from(document.querySelectorAll('.team-editor-card')).map(card => ({
    name: card.querySelector('.team-name').value.trim(),
    role: {
      de: card.querySelector('.team-role-de').value.trim(),
      en: card.querySelector('.team-role-en').value.trim(),
      tr: card.querySelector('.team-role-tr').value.trim()
    },
    image: card.querySelector('.team-image').value.trim()
  })).filter(item => item.name || item.image || item.role.de || item.role.en || item.role.tr);
}

function collectPricesFromDom() {
  return Array.from(document.querySelectorAll('.price-editor-card')).map(card => ({
    title: {
      de: card.querySelector('.price-title-de').value.trim(),
      en: card.querySelector('.price-title-en').value.trim(),
      tr: card.querySelector('.price-title-tr').value.trim()
    },
    price: Number(card.querySelector('.price-value').value || 0),
    unit: card.querySelector('.price-unit').value
  })).filter(item => item.title.de || item.title.en || item.title.tr);
}

function collectPackagesFromDom() {
  return Array.from(document.querySelectorAll('.package-editor-card')).map(card => {
    const deTitle = card.querySelector('.pkg-title-de').value.trim();
    return {
      slug: slugify(card.querySelector('.pkg-slug').value || deTitle),
      basePricePerPerson: Number(card.querySelector('.pkg-price').value || 0),
      title: {
        de: deTitle,
        en: card.querySelector('.pkg-title-en').value.trim(),
        tr: card.querySelector('.pkg-title-tr').value.trim()
      },
      description: {
        de: card.querySelector('.pkg-desc-de').value.trim(),
        en: card.querySelector('.pkg-desc-en').value.trim(),
        tr: card.querySelector('.pkg-desc-tr').value.trim()
      }
    };
  }).filter(item => item.title.de || item.title.en || item.title.tr);
}

function collectMenuFromDom() {
  const catalog = emptyCatalog();
  document.querySelectorAll('.menu-editor-card').forEach(card => {
    const category = card.dataset.category;
    const item = {
      name: {
        de: card.querySelector('.menu-name-de').value.trim(),
        en: card.querySelector('.menu-name-en').value.trim(),
        tr: card.querySelector('.menu-name-tr').value.trim()
      },
      price: Number(card.querySelector('.menu-price').value || 0),
      unit: card.querySelector('.menu-unit').value
    };
    if (catalog[category] && (item.name.de || item.name.en || item.name.tr)) {
      catalog[category].push(item);
    }
  });
  return catalog;
}

function collectGalleryFromDom() {
  return Array.from(document.querySelectorAll('.gallery-editor-card')).map(card => ({
    title: card.querySelector('.gallery-title').value.trim(),
    image: card.querySelector('.gallery-image').value.trim()
  })).filter(item => item.title || item.image);
}

function collectHomeSectionsFromDom() {
  return [...document.querySelectorAll('.home-section-editor-card')].map(card => ({
    title: {
      de: card.querySelector('[data-field="title-de"]').value,
      en: card.querySelector('[data-field="title-en"]').value,
      tr: card.querySelector('[data-field="title-tr"]').value
    },
    text: {
      de: card.querySelector('[data-field="text-de"]').value,
      en: card.querySelector('[data-field="text-en"]').value,
      tr: card.querySelector('[data-field="text-tr"]').value
    },
    button: {
      de: card.querySelector('[data-field="button-de"]').value,
      en: card.querySelector('[data-field="button-en"]').value,
      tr: card.querySelector('[data-field="button-tr"]').value
    },
    link: card.querySelector('[data-field="link"]').value,
    image: card.querySelector('[data-field="image"]').value
  }));
}

function renderHomeSectionsEditor(items = []) {
  const root = document.querySelector('#home-sections-editor');
  if (!root) return;

  root.innerHTML = items.map((item, index) => `
    <article class="admin-edit-card home-section-editor-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <h3>Kachel ${index + 1}</h3>
        <button type="button" class="btn btn-secondary remove-home-section-btn">Entfernen</button>
      </div>

      <div class="admin-grid">
        <input data-field="title-de" type="text" placeholder="Titel DE" value="${escapeHtml(item.title?.de || '')}">
        <input data-field="title-en" type="text" placeholder="Titel EN" value="${escapeHtml(item.title?.en || '')}">
        <input data-field="title-tr" type="text" placeholder="Titel TR" value="${escapeHtml(item.title?.tr || '')}">
      </div>

      <div class="admin-grid">
        <textarea data-field="text-de" rows="3" placeholder="Beschreibung DE">${escapeHtml(item.text?.de || '')}</textarea>
        <textarea data-field="text-en" rows="3" placeholder="Beschreibung EN">${escapeHtml(item.text?.en || '')}</textarea>
        <textarea data-field="text-tr" rows="3" placeholder="Beschreibung TR">${escapeHtml(item.text?.tr || '')}</textarea>
      </div>

      <div class="admin-grid">
        <input data-field="button-de" type="text" placeholder="Button DE" value="${escapeHtml(item.button?.de || '')}">
        <input data-field="button-en" type="text" placeholder="Button EN" value="${escapeHtml(item.button?.en || '')}">
        <input data-field="button-tr" type="text" placeholder="Button TR" value="${escapeHtml(item.button?.tr || '')}">
      </div>

      <div class="admin-grid">
        <input data-field="link" type="text" placeholder="Link, z.B. about.html" value="${escapeHtml(item.link || '')}">
        <input data-field="image" type="text" placeholder="Bild-URL" value="${escapeHtml(item.image || '')}">
      </div>
    </article>
  `).join('');
}

async function renderOrders() {
  const list = document.querySelector('#orders-list');
  if (!list) return;

  const supabase = getSupabaseClient();
  if (!supabase) {
    list.innerHTML = '<p>Supabase nicht verbunden.</p>';
    return;
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    list.innerHTML = `<p>Fehler beim Laden der Bestellungen: ${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data?.length) {
    list.innerHTML = '<p>Noch keine Bestellungen vorhanden.</p>';
    return;
  }

  list.innerHTML = data.map(order => `
    <article class="admin-order-card">
      <h3>Bestellung #${order.id}</h3>
      <p><strong>${escapeHtml(order.customer_name || '')}</strong> · ${escapeHtml(order.customer_email || '')} · ${order.persons || 0} Personen</p>
      <p><strong>Gesamt:</strong> ${Number(order.total_price || 0).toFixed(2)} €</p>
      <details>
        <summary>Payload anzeigen</summary>
        <pre>${escapeHtml(JSON.stringify(order.payload, null, 2))}</pre>
      </details>
    </article>
  `).join('');
}

async function fillFormFields() {
  const data = await loadSiteData();

  document.querySelector('#about-de').value = data.about?.de || '';
  document.querySelector('#about-en').value = data.about?.en || '';
  document.querySelector('#about-tr').value = data.about?.tr || '';

  document.querySelector('#contact-address').value = data.contact?.address || '';
  document.querySelector('#contact-phone').value = data.contact?.phone || '';
  document.querySelector('#contact-mail').value = data.contact?.mail || '';

  document.querySelector('#impressum-company').value = data.impressum?.company || '';
  document.querySelector('#impressum-owner').value = data.impressum?.owner || '';
  document.querySelector('#impressum-street').value = data.impressum?.street || '';
  document.querySelector('#impressum-city').value = data.impressum?.city || '';
  document.querySelector('#impressum-mail').value = data.impressum?.mail || '';
  document.querySelector('#impressum-phone').value = data.impressum?.phone || '';

  state.team = Array.isArray(data.team) ? structuredClone(data.team) : [];
  state.priceLists = Array.isArray(data.priceLists) ? structuredClone(data.priceLists) : [];
  state.packages = Array.isArray(data.packages) ? structuredClone(data.packages) : [];
  state.catalog = data.catalog ? structuredClone(data.catalog) : emptyCatalog();
  state.gallery = Array.isArray(data.gallery) ? structuredClone(data.gallery) : [];

  renderTeamEditor();
  renderPricesEditor();
  renderPackagesEditor();
  renderMenuEditor();
  renderGalleryEditor();
}

async function boot() {
  const gate = document.querySelector('#admin-gate');
  const app = document.querySelector('#admin-app');
  const status = document.querySelector('#admin-status');

  const session = await getSession();
  const admin = await isAdmin();

  if (!session || !admin) {
    gate.hidden = false;
    app.hidden = true;
    status.innerHTML = `<p>${CONFIG.demoAdminHint}</p><p>Du bist nicht als Admin freigeschaltet.</p>`;
    return;
  }

  gate.hidden = true;
  app.hidden = false;

  await fillFormFields();
  await renderOrders();
}

window.addEventListener('DOMContentLoaded', boot);

document.addEventListener('input', event => {
  if (event.target.matches('.gallery-image')) {
    const card = event.target.closest('.gallery-editor-card');
    if (!card) return;
    const preview = card.querySelector('.gallery-preview-wrap');
    const title = card.querySelector('.gallery-title')?.value || '';
    const src = event.target.value.trim();
    preview.innerHTML = src
      ? `<img class="gallery-preview-image" src="${escapeHtml(src)}" alt="${escapeHtml(title)}">`
      : '<div class="gallery-preview-empty">Noch keine Bildvorschau</div>';
  }
});

document.addEventListener('click', async event => {
  if (event.target.matches('#logoutBtn')) {
    await logout();
    location.href = 'login.html';
  }

  if (event.target.matches('#addTeamBtn')) {
    state.team.push({ name: '', role: { de: '', en: '', tr: '' }, image: '' });
    renderTeamEditor();
  }
  if (event.target.matches('.remove-team-btn')) {
    event.target.closest('.team-editor-card')?.remove();
  }
  if (event.target.matches('#saveTeamBtn')) {
    try {
      await saveSection('team', collectTeamFromDom());
      msg('Mitarbeiter gespeichert.');
      await fillFormFields();
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
  }

  if (event.target.matches('#addPriceBtn')) {
    state.priceLists.push({ title: { de: '', en: '', tr: '' }, price: 0, unit: 'person' });
    renderPricesEditor();
  }
  if (event.target.matches('.remove-price-btn')) {
    event.target.closest('.price-editor-card')?.remove();
  }
  if (event.target.matches('#savePricesBtn')) {
    try {
      await saveSection('priceLists', collectPricesFromDom());
      msg('Preislisten gespeichert.');
      await fillFormFields();
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
  }

  if (event.target.matches('#saveAboutBtn')) {
    try {
      await saveSection('about', {
        de: document.querySelector('#about-de').value,
        en: document.querySelector('#about-en').value,
        tr: document.querySelector('#about-tr').value
      });
      msg('Über uns gespeichert.');
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
  }

  if (event.target.matches('#saveContactBtn')) {
    try {
      await saveSection('contact', {
        address: document.querySelector('#contact-address').value,
        phone: document.querySelector('#contact-phone').value,
        mail: document.querySelector('#contact-mail').value
      });
      msg('Kontakt gespeichert.');
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
  }

  if (event.target.matches('#saveImpressumBtn')) {
    try {
      await saveSection('impressum', {
        company: document.querySelector('#impressum-company').value,
        owner: document.querySelector('#impressum-owner').value,
        street: document.querySelector('#impressum-street').value,
        city: document.querySelector('#impressum-city').value,
        mail: document.querySelector('#impressum-mail').value,
        phone: document.querySelector('#impressum-phone').value

        if (event.target.matches('#addHomeSectionBtn')) {
    const current = collectHomeSectionsFromDom();
    current.push({
      title: { de: '', en: '', tr: '' },
      text: { de: '', en: '', tr: '' },
      button: { de: '', en: '', tr: '' },
      link: '',
      image: ''
    });
    renderHomeSectionsEditor(current);
  }

  if (event.target.matches('.remove-home-section-btn')) {
    event.target.closest('.home-section-editor-card')?.remove();
  }

  if (event.target.matches('#saveHomeSectionsBtn')) {
    try {
      await saveSection('homeSections', collectHomeSectionsFromDom());
      msg('Startseiten-Kacheln gespeichert.');
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
  }
      });
      msg('Impressum gespeichert.');
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
  }

  if (event.target.matches('#addPackageBtn')) {
    state.packages.push({
      slug: '',
      title: { de: '', en: '', tr: '' },
      description: { de: '', en: '', tr: '' },
      basePricePerPerson: 0
    });
    renderPackagesEditor();
  }
  if (event.target.matches('.remove-package-btn')) {
    event.target.closest('.package-editor-card')?.remove();
  }
  if (event.target.matches('#savePackagesBtn')) {
    try {
      await saveSection('packages', collectPackagesFromDom());
      msg('Pakete gespeichert.');
      await fillFormFields();
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
  }

  if (event.target.matches('.admin-add-menu-item')) {
    const category = event.target.dataset.category;
    state.catalog[category] = state.catalog[category] || [];
    state.catalog[category].push({ name: { de: '', en: '', tr: '' }, price: 0, unit: 'portion' });
    renderMenuEditor();
  }
  if (event.target.matches('.remove-menu-item-btn')) {
    event.target.closest('.menu-editor-card')?.remove();
  }
  if (event.target.matches('#saveMenuBtn')) {
    try {
      await saveSection('catalog', collectMenuFromDom());
      msg('Menü gespeichert.');
      await fillFormFields();
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
  }

  if (event.target.matches('#addGalleryBtn')) {
    state.gallery.push({ title: '', image: '' });
    renderGalleryEditor();
  }
  if (event.target.matches('.remove-gallery-btn')) {
    event.target.closest('.gallery-editor-card')?.remove();
  }
  if (event.target.matches('#saveGalleryBtn')) {
    try {
      await saveSection('gallery', collectGalleryFromDom());
      msg('Galerie gespeichert.');
      await fillFormFields();
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
  }
}
     renderHomeSectionsEditor(data.homeSections || []);                    
                         );
