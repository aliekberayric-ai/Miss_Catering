import { CONFIG } from './config.js';
import { getSession, isAdmin, logout } from './auth.js';
import { getSupabaseClient } from './supabase.js';
import { loadSiteData, clearSiteDataCache, pickLang } from './data.js';

function escapeHtml(text = '') {
  return String(text).replace(/[&<>"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[char]));
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

function teamCardTemplate(item = {}, index = 0) {
  return `
    <article class="admin-edit-card team-editor-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <h3>${escapeHtml(item.name || `Mitarbeiter ${index + 1}`)}</h3>
        <button type="button" class="btn btn-secondary remove-team-btn">Entfernen</button>
      </div>
      <div class="admin-grid">
        <input data-field="name" type="text" placeholder="Name" value="${escapeHtml(item.name || '')}">
        <input data-field="role-de" type="text" placeholder="Rolle DE" value="${escapeHtml(item.role?.de || '')}">
        <input data-field="role-en" type="text" placeholder="Rolle EN" value="${escapeHtml(item.role?.en || '')}">
        <input data-field="role-tr" type="text" placeholder="Rolle TR" value="${escapeHtml(item.role?.tr || '')}">
        <input data-field="image" type="text" placeholder="Bild-URL" value="${escapeHtml(item.image || '')}">
      </div>
    </article>
  `;
}

function priceCardTemplate(item = {}, index = 0) {
  return `
    <article class="admin-edit-card price-editor-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <h3>${escapeHtml(item.title?.de || `Preis ${index + 1}`)}</h3>
        <button type="button" class="btn btn-secondary remove-price-btn">Entfernen</button>
      </div>
      <div class="admin-grid">
        <input data-field="title-de" type="text" placeholder="Titel DE" value="${escapeHtml(item.title?.de || '')}">
        <input data-field="title-en" type="text" placeholder="Titel EN" value="${escapeHtml(item.title?.en || '')}">
        <input data-field="title-tr" type="text" placeholder="Titel TR" value="${escapeHtml(item.title?.tr || '')}">
        <input data-field="price" type="number" step="0.01" placeholder="Preis" value="${escapeHtml(item.price ?? '')}">
        <select data-field="unit">
          <option value="person" ${item.unit === 'person' ? 'selected' : ''}>Person</option>
          <option value="portion" ${item.unit === 'portion' ? 'selected' : ''}>Portion</option>
        </select>
      </div>
    </article>
  `;
}

function packageCardTemplate(item = {}, index = 0) {
  return `
    <article class="admin-edit-card package-editor-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <h3>${escapeHtml(item.title?.de || `Paket ${index + 1}`)}</h3>
        <button type="button" class="btn btn-secondary remove-package-btn">Entfernen</button>
      </div>
      <div class="admin-grid">
        <input data-field="slug" type="text" placeholder="Slug" value="${escapeHtml(item.slug || '')}">
        <input data-field="price" type="number" step="0.01" placeholder="Preis pro Person" value="${escapeHtml(item.price ?? item.basePricePerPerson ?? '')}">
        <input data-field="title-de" type="text" placeholder="Titel DE" value="${escapeHtml(item.title?.de || '')}">
        <input data-field="title-en" type="text" placeholder="Titel EN" value="${escapeHtml(item.title?.en || '')}">
        <input data-field="title-tr" type="text" placeholder="Titel TR" value="${escapeHtml(item.title?.tr || '')}">
      </div>
      <div class="admin-grid">
        <textarea data-field="desc-de" rows="3" placeholder="Beschreibung DE">${escapeHtml(item.description?.de || '')}</textarea>
        <textarea data-field="desc-en" rows="3" placeholder="Beschreibung EN">${escapeHtml(item.description?.en || '')}</textarea>
        <textarea data-field="desc-tr" rows="3" placeholder="Beschreibung TR">${escapeHtml(item.description?.tr || '')}</textarea>
      </div>
    </article>
  `;
}

function menuItemCardTemplate(item = {}, category = '', index = 0) {
  return `
    <article class="admin-edit-card menu-item-editor-card" data-category="${escapeHtml(category)}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <h3>${escapeHtml(item.name?.de || `${category} ${index + 1}`)}</h3>
        <button type="button" class="btn btn-secondary remove-menu-item-btn">Entfernen</button>
      </div>
      <div class="admin-grid">
        <input data-field="name-de" type="text" placeholder="Name DE" value="${escapeHtml(item.name?.de || '')}">
        <input data-field="name-en" type="text" placeholder="Name EN" value="${escapeHtml(item.name?.en || '')}">
        <input data-field="name-tr" type="text" placeholder="Name TR" value="${escapeHtml(item.name?.tr || '')}">
        <input data-field="price" type="number" step="0.01" placeholder="Preis" value="${escapeHtml(item.price ?? '')}">
        <select data-field="unit">
          <option value="person" ${item.unit === 'person' ? 'selected' : ''}>Person</option>
          <option value="portion" ${item.unit === 'portion' ? 'selected' : ''}>Portion</option>
        </select>
      </div>
    </article>
  `;
}

function galleryCardTemplate(item = {}, index = 0) {
  return `
    <article class="admin-edit-card gallery-editor-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <h3>${escapeHtml(item.title || `Bild ${index + 1}`)}</h3>
        <button type="button" class="btn btn-secondary remove-gallery-btn">Entfernen</button>
      </div>
      <div class="admin-grid">
        <input data-field="title" type="text" placeholder="Titel" value="${escapeHtml(item.title || '')}">
        <input data-field="image" type="text" placeholder="Bild-URL" value="${escapeHtml(item.image || '')}">
      </div>
    </article>
  `;
}

function homeCardTemplate(item = {}, index = 0) {
  return `
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
  `;
}

function collectTeamFromDom() {
  return [...document.querySelectorAll('.team-editor-card')].map(card => ({
    name: card.querySelector('[data-field="name"]').value,
    role: {
      de: card.querySelector('[data-field="role-de"]').value,
      en: card.querySelector('[data-field="role-en"]').value,
      tr: card.querySelector('[data-field="role-tr"]').value
    },
    image: card.querySelector('[data-field="image"]').value
  }));
}

function collectPricesFromDom() {
  return [...document.querySelectorAll('.price-editor-card')].map(card => ({
    title: {
      de: card.querySelector('[data-field="title-de"]').value,
      en: card.querySelector('[data-field="title-en"]').value,
      tr: card.querySelector('[data-field="title-tr"]').value
    },
    price: Number(card.querySelector('[data-field="price"]').value || 0),
    unit: card.querySelector('[data-field="unit"]').value
  }));
}

function collectPackagesFromDom() {
  return [...document.querySelectorAll('.package-editor-card')].map(card => ({
    slug: card.querySelector('[data-field="slug"]').value,
    price: Number(card.querySelector('[data-field="price"]').value || 0),
    title: {
      de: card.querySelector('[data-field="title-de"]').value,
      en: card.querySelector('[data-field="title-en"]').value,
      tr: card.querySelector('[data-field="title-tr"]').value
    },
    description: {
      de: card.querySelector('[data-field="desc-de"]').value,
      en: card.querySelector('[data-field="desc-en"]').value,
      tr: card.querySelector('[data-field="desc-tr"]').value
    }
  }));
}

function collectMenuFromDom() {
  const result = {
    fingerfood: [],
    starters: [],
    mains: [],
    desserts: []
  };

  [...document.querySelectorAll('.menu-item-editor-card')].forEach(card => {
    const category = card.getAttribute('data-category');
    if (!result[category]) return;

    result[category].push({
      name: {
        de: card.querySelector('[data-field="name-de"]').value,
        en: card.querySelector('[data-field="name-en"]').value,
        tr: card.querySelector('[data-field="name-tr"]').value
      },
      price: Number(card.querySelector('[data-field="price"]').value || 0),
      unit: card.querySelector('[data-field="unit"]').value
    });
  });

  return result;
}

function collectGalleryFromDom() {
  return [...document.querySelectorAll('.gallery-editor-card')].map(card => ({
    title: card.querySelector('[data-field="title"]').value,
    image: card.querySelector('[data-field="image"]').value
  }));
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

function renderTeamEditor(items = []) {
  const root = document.querySelector('#team-editor');
  if (!root) return;
  root.innerHTML = items.map((item, i) => teamCardTemplate(item, i)).join('');
}

function renderPricesEditor(items = []) {
  const root = document.querySelector('#prices-editor');
  if (!root) return;
  root.innerHTML = items.map((item, i) => priceCardTemplate(item, i)).join('');
}

function renderPackagesEditor(items = []) {
  const root = document.querySelector('#packages-editor');
  if (!root) return;
  root.innerHTML = items.map((item, i) => packageCardTemplate(item, i)).join('');
}

function renderMenuEditor(catalog = {}) {
  const root = document.querySelector('#menu-editor');
  if (!root) return;

  const categories = [
    { key: 'fingerfood', label: 'Fingerfood' },
    { key: 'starters', label: 'Vorspeisen' },
    { key: 'mains', label: 'Hauptgerichte' },
    { key: 'desserts', label: 'Desserts' }
  ];

  root.innerHTML = categories.map(cat => `
    <section class="admin-edit-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <h3>${cat.label}</h3>
        <button type="button" class="btn btn-secondary add-menu-item-btn" data-category="${cat.key}">+ Eintrag hinzufügen</button>
      </div>
      <div class="menu-category-list" data-menu-category="${cat.key}">
        ${(catalog[cat.key] || []).map((item, i) => menuItemCardTemplate(item, cat.key, i)).join('')}
      </div>
    </section>
  `).join('');
}

function renderGalleryEditor(items = []) {
  const root = document.querySelector('#gallery-editor');
  if (!root) return;
  root.innerHTML = items.map((item, i) => galleryCardTemplate(item, i)).join('');
}

function renderHomeSectionsEditor(items = []) {
  const root = document.querySelector('#home-sections-editor');
  if (!root) return;
  root.innerHTML = items.map((item, i) => homeCardTemplate(item, i)).join('');
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

  renderTeamEditor(data.team || []);
  renderPricesEditor(data.priceLists || []);
  renderPackagesEditor(data.packages || []);
  renderMenuEditor(data.catalog || { fingerfood: [], starters: [], mains: [], desserts: [] });
  renderGalleryEditor(data.gallery || []);
  renderHomeSectionsEditor(data.homeSections || []);
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

document.addEventListener('click', async (event) => {
  if (event.target.matches('#logoutBtn')) {
    await logout();
    location.href = 'login.html';
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
      });
      msg('Impressum gespeichert.');
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
  }

  if (event.target.matches('#addTeamMemberBtn')) {
    const current = collectTeamFromDom();
    current.push({ name: '', role: { de: '', en: '', tr: '' }, image: '' });
    renderTeamEditor(current);
  }

  if (event.target.matches('.remove-team-btn')) {
    event.target.closest('.team-editor-card')?.remove();
  }

  if (event.target.matches('#saveTeamBtn')) {
    try {
      await saveSection('team', collectTeamFromDom());
      msg('Mitarbeiter gespeichert.');
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
  }

  if (event.target.matches('#addPriceBtn')) {
    const current = collectPricesFromDom();
    current.push({ title: { de: '', en: '', tr: '' }, price: 0, unit: 'person' });
    renderPricesEditor(current);
  }

  if (event.target.matches('.remove-price-btn')) {
    event.target.closest('.price-editor-card')?.remove();
  }

  if (event.target.matches('#savePricesBtn')) {
    try {
      await saveSection('priceLists', collectPricesFromDom());
      msg('Preislisten gespeichert.');
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
  }

  if (event.target.matches('#addPackageBtn')) {
    const current = collectPackagesFromDom();
    current.push({
      slug: '',
      price: 0,
      title: { de: '', en: '', tr: '' },
      description: { de: '', en: '', tr: '' }
    });
    renderPackagesEditor(current);
  }

  if (event.target.matches('.remove-package-btn')) {
    event.target.closest('.package-editor-card')?.remove();
  }

  if (event.target.matches('#savePackagesBtn')) {
    try {
      await saveSection('packages', collectPackagesFromDom());
      msg('Pakete gespeichert.');
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
  }

  if (event.target.matches('.add-menu-item-btn')) {
    const category = event.target.getAttribute('data-category');
    const list = document.querySelector(`[data-menu-category="${category}"]`);
    if (!list) return;
    list.insertAdjacentHTML('beforeend', menuItemCardTemplate({
      name: { de: '', en: '', tr: '' },
      price: 0,
      unit: 'portion'
    }, category, list.children.length));
  }

  if (event.target.matches('.remove-menu-item-btn')) {
    event.target.closest('.menu-item-editor-card')?.remove();
  }

  if (event.target.matches('#saveMenuBtn')) {
    try {
      await saveSection('catalog', collectMenuFromDom());
      msg('Menü gespeichert.');
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
  }

  if (event.target.matches('#addGalleryBtn')) {
    const current = collectGalleryFromDom();
    current.push({ title: '', image: '' });
    renderGalleryEditor(current);
  }

  if (event.target.matches('.remove-gallery-btn')) {
    event.target.closest('.gallery-editor-card')?.remove();
  }

  if (event.target.matches('#saveGalleryBtn')) {
    try {
      await saveSection('gallery', collectGalleryFromDom());
      msg('Galerie gespeichert.');
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
  }

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
