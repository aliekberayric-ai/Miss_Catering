import { CONFIG } from './config.js';
import { getSession, isAdmin, logout } from './auth.js';
import { getSupabaseClient } from './supabase.js';
import { loadSiteData, clearSiteDataCache } from './data.js';
import { uploadImage } from './storage.js';

function escapeHtml(text = '') {
  return String(text).replace(/[&<>"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[char]));
}

function setValue(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.value = value ?? '';
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

/* =========================
   TEMPLATES
========================= */

function teamCardTemplate(item = {}, index = 0) {
  return `
    <article class="admin-edit-card team-editor-card">
      <div class="admin-card-head">
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
      <div class="admin-card-head">
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
      <div class="admin-card-head">
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

      <div class="admin-card-head">
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

      <div class="admin-image-tools">
        <input data-field="image" type="text" placeholder="Bild-URL" value="${escapeHtml(image)}">
        <input data-field="image-file" type="file" accept="image/*">
        <img class="admin-image-preview" src="${escapeHtml(image)}" alt="Vorschau" style="${image ? '' : 'display:none;'}">
      </div>
    </article>
  `;
}

function galleryCardTemplate(item = {}, index = 0) {
  return `
    <article class="admin-edit-card gallery-editor-card">
      <div class="admin-card-head">
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
      <div class="admin-card-head">
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
        <input data-field="link" type="text" placeholder="Link, z. B. about.html" value="${escapeHtml(item.link || '')}">
        <input data-field="image" type="text" placeholder="Bild-URL" value="${escapeHtml(item.image || '')}">
      </div>
    </article>
  `;
}

/* =========================
   COLLECTORS
========================= */

function collectTeamFromDom() {
  return [...document.querySelectorAll('.team-editor-card')].map(card => ({
    name: card.querySelector('[data-field="name"]')?.value || '',
    role: {
      de: card.querySelector('[data-field="role-de"]')?.value || '',
      en: card.querySelector('[data-field="role-en"]')?.value || '',
      tr: card.querySelector('[data-field="role-tr"]')?.value || ''
    },
    image: card.querySelector('[data-field="image"]')?.value || ''
  }));
}

function collectPricesFromDom() {
  return [...document.querySelectorAll('.price-editor-card')].map(card => ({
    title: {
      de: card.querySelector('[data-field="title-de"]')?.value || '',
      en: card.querySelector('[data-field="title-en"]')?.value || '',
      tr: card.querySelector('[data-field="title-tr"]')?.value || ''
    },
    price: Number(card.querySelector('[data-field="price"]')?.value || 0),
    unit: card.querySelector('[data-field="unit"]')?.value || 'person'
  }));
}

function collectPackagesFromDom() {
  return [...document.querySelectorAll('.package-editor-card')].map(card => ({
    slug: card.querySelector('[data-field="slug"]')?.value || '',
    price: Number(card.querySelector('[data-field="price"]')?.value || 0),
    title: {
      de: card.querySelector('[data-field="title-de"]')?.value || '',
      en: card.querySelector('[data-field="title-en"]')?.value || '',
      tr: card.querySelector('[data-field="title-tr"]')?.value || ''
    },
    description: {
      de: card.querySelector('[data-field="desc-de"]')?.value || '',
      en: card.querySelector('[data-field="desc-en"]')?.value || '',
      tr: card.querySelector('[data-field="desc-tr"]')?.value || ''
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
        de: card.querySelector('[data-field="name-de"]')?.value || '',
        en: card.querySelector('[data-field="name-en"]')?.value || '',
        tr: card.querySelector('[data-field="name-tr"]')?.value || ''
      },
      price: Number(card.querySelector('[data-field="price"]')?.value || 0),
      unit: card.querySelector('[data-field="unit"]')?.value || 'portion'
    });
  });

  return result;
}

function collectGalleryFromDom() {
  return [...document.querySelectorAll('.gallery-editor-card')].map(card => ({
    title: card.querySelector('[data-field="title"]')?.value || '',
    image: card.querySelector('[data-field="image"]')?.value || ''
  }));
}

function collectHomeSectionsFromDom() {
  return [...document.querySelectorAll('.home-section-editor-card')].map(card => ({
    title: {
      de: card.querySelector('[data-field="title-de"]')?.value || '',
      en: card.querySelector('[data-field="title-en"]')?.value || '',
      tr: card.querySelector('[data-field="title-tr"]')?.value || ''
    },
    text: {
      de: card.querySelector('[data-field="text-de"]')?.value || '',
      en: card.querySelector('[data-field="text-en"]')?.value || '',
      tr: card.querySelector('[data-field="text-tr"]')?.value || ''
    },
    button: {
      de: card.querySelector('[data-field="button-de"]')?.value || '',
      en: card.querySelector('[data-field="button-en"]')?.value || '',
      tr: card.querySelector('[data-field="button-tr"]')?.value || ''
    },
    link: card.querySelector('[data-field="link"]')?.value || '',
    image: card.querySelector('[data-field="image"]')?.value || ''
  }));
}

/* =========================
   RENDERERS
========================= */

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
      <div class="admin-card-head">
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

function renderOrderDetails(order) {
  const payload = order.payload || {};
  const selected = payload.selectedItems || payload.selectedExtras || [];

  const selectedItemsHtml = Array.isArray(selected) && selected.length
    ? `
      <ul class="order-item-list">
        ${selected.map(item => `
          <li>
            <span>${escapeHtml(item.name || item.title || '-')}</span>
            <strong>${escapeHtml(String(item.priceLabel || item.price || ''))}</strong>
          </li>
        `).join('')}
      </ul>
    `
    : '<p>Keine Extras ausgewählt.</p>';

  return `
    <div class="order-detail-grid">
      <section class="order-detail-section">
        <h4>Kundendaten</h4>
        <p><strong>Name:</strong> ${escapeHtml(order.customer_name || '-')}</p>
        <p><strong>E-Mail:</strong> ${escapeHtml(order.customer_email || '-')}</p>
        <p><strong>Paket:</strong> ${escapeHtml(order.package_slug || '-')}</p>
        <p><strong>Personen:</strong> ${escapeHtml(String(order.persons || 0))}</p>
        <p><strong>Gesamt:</strong> ${escapeHtml(Number(order.total_price || 0).toFixed(2))} €</p>
      </section>

      <section class="order-detail-section">
        <h4>Status</h4>
        <p><strong>Aktuell:</strong> ${escapeHtml(order.status || 'neu')}</p>
        <p><strong>Erstellt:</strong> ${escapeHtml(new Date(order.created_at).toLocaleString('de-DE'))}</p>
      </section>

      <section class="order-detail-section order-detail-full">
        <h4>Ausgewählte Extras</h4>
        ${selectedItemsHtml}
      </section>
    </div>
  `;
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
    <article class="admin-order-card" data-order-id="${order.id}">
      <div class="admin-order-header">
        <div>
          <h3>Bestellung #${order.id}</h3>
          <p>
            <strong>${escapeHtml(order.customer_name || 'Unbekannt')}</strong><br>
            ${escapeHtml(order.customer_email || '')}<br>
            Paket: ${escapeHtml(order.package_slug || '-')} ·
            Personen: ${Number(order.persons || 0)} ·
            Gesamt: ${Number(order.total_price || 0).toFixed(2)} €
          </p>
          <p>Erstellt: ${new Date(order.created_at).toLocaleString('de-DE')}</p>
        </div>

        <div class="admin-order-actions">
          <select class="order-status-select">
            <option value="neu" ${order.status === 'neu' ? 'selected' : ''}>Neu</option>
            <option value="bearbeitet" ${order.status === 'bearbeitet' ? 'selected' : ''}>Bearbeitet</option>
            <option value="erledigt" ${order.status === 'erledigt' ? 'selected' : ''}>Erledigt</option>
          </select>

          <button type="button" class="btn btn-primary save-order-status-btn">Status speichern</button>
          <button type="button" class="btn btn-secondary delete-order-btn">Löschen</button>
        </div>
      </div>

      <details>
        <summary>Details anzeigen</summary>
        ${renderOrderDetails(order)}
      </details>
    </article>
  `).join('');
}

/* =========================
   FORM FILL
========================= */

async function fillFormFields() {
  const data = await loadSiteData();

  setValue('#branding-logoText', data.branding?.logoText || 'MC');
  setValue('#branding-logoImage', data.branding?.logoImage || '');
  setValue('#branding-tagline-de', data.branding?.tagline?.de || '');
  setValue('#branding-tagline-en', data.branding?.tagline?.en || '');
  setValue('#branding-tagline-tr', data.branding?.tagline?.tr || '');

  const brandingPreview = document.querySelector('#branding-logoPreview');
  if (brandingPreview) {
    brandingPreview.src = data.branding?.logoImage || '';
    brandingPreview.style.display = data.branding?.logoImage ? 'block' : 'none';
  }

  setValue('#about-de', data.about?.de || '');
  setValue('#about-en', data.about?.en || '');
  setValue('#about-tr', data.about?.tr || '');

  setValue('#contact-address', data.contact?.address || '');
  setValue('#contact-phone', data.contact?.phone || '');
  setValue('#contact-mail', data.contact?.mail || '');

  setValue('#impressum-company', data.impressum?.company || '');
  setValue('#impressum-owner', data.impressum?.owner || '');
  setValue('#impressum-street', data.impressum?.street || '');
  setValue('#impressum-city', data.impressum?.city || '');
  setValue('#impressum-mail', data.impressum?.mail || '');
  setValue('#impressum-phone', data.impressum?.phone || '');

  renderTeamEditor(data.team || []);
  renderPricesEditor(data.priceLists || []);
  renderPackagesEditor(data.packages || []);
  renderMenuEditor(data.catalog || { fingerfood: [], starters: [], mains: [], desserts: [] });
  renderGalleryEditor(data.gallery || []);
  renderHomeSectionsEditor(data.homeSections || []);
}

/* =========================
   ORDERS ACTIONS
========================= */

async function updateOrderStatus(orderId, status) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase nicht verbunden.');

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  if (error) throw error;
}

async function deleteOrder(orderId) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase nicht verbunden.');

  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId);

  if (error) throw error;
}

/* =========================
   BOOT
========================= */

async function boot() {
  const gate = document.querySelector('#admin-gate');
  const app = document.querySelector('#admin-app');
  const status = document.querySelector('#admin-status');

  const session = await getSession();
  const admin = await isAdmin();

  if (!session || !admin) {
    if (gate) gate.hidden = false;
    if (app) app.hidden = true;
    if (status) status.innerHTML = `<p>${CONFIG.demoAdminHint}</p><p>Du bist nicht als Admin freigeschaltet.</p>`;
    return;
  }

  if (gate) gate.hidden = true;
  if (app) app.hidden = false;

  await fillFormFields();
  await renderOrders();
}

window.addEventListener('DOMContentLoaded', boot);

/* =========================
   CLICK HANDLER
========================= */

document.addEventListener('click', async (event) => {
  if (event.target.matches('#logoutBtn')) {
    await logout();
    location.href = 'login.html';
    return;
  }

  if (event.target.matches('#saveBrandingBtn')) {
    try {
      await saveSection('branding', {
        logoText: document.querySelector('#branding-logoText')?.value || 'MC',
        logoImage: document.querySelector('#branding-logoImage')?.value || '',
        tagline: {
          de: document.querySelector('#branding-tagline-de')?.value || '',
          en: document.querySelector('#branding-tagline-en')?.value || '',
          tr: document.querySelector('#branding-tagline-tr')?.value || ''
        }
      });

      const preview = document.querySelector('#branding-logoPreview');
      if (preview) {
        const url = document.querySelector('#branding-logoImage')?.value || '';
        preview.src = url;
        preview.style.display = url ? 'block' : 'none';
      }

      msg('Branding gespeichert.');
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
    return;
  }

  if (event.target.matches('#saveAboutBtn')) {
    try {
      await saveSection('about', {
        de: document.querySelector('#about-de')?.value || '',
        en: document.querySelector('#about-en')?.value || '',
        tr: document.querySelector('#about-tr')?.value || ''
      });
      msg('Über uns gespeichert.');
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
    return;
  }

  if (event.target.matches('#saveContactBtn')) {
    try {
      await saveSection('contact', {
        address: document.querySelector('#contact-address')?.value || '',
        phone: document.querySelector('#contact-phone')?.value || '',
        mail: document.querySelector('#contact-mail')?.value || ''
      });
      msg('Kontakt gespeichert.');
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
    return;
  }

  if (event.target.matches('#saveImpressumBtn')) {
    try {
      await saveSection('impressum', {
        company: document.querySelector('#impressum-company')?.value || '',
        owner: document.querySelector('#impressum-owner')?.value || '',
        street: document.querySelector('#impressum-street')?.value || '',
        city: document.querySelector('#impressum-city')?.value || '',
        mail: document.querySelector('#impressum-mail')?.value || '',
        phone: document.querySelector('#impressum-phone')?.value || ''
      });
      msg('Impressum gespeichert.');
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
    return;
  }

  if (event.target.matches('#addTeamMemberBtn')) {
    const current = collectTeamFromDom();
    current.push({ name: '', role: { de: '', en: '', tr: '' }, image: '' });
    renderTeamEditor(current);
    return;
  }

  if (event.target.matches('.remove-team-btn')) {
    event.target.closest('.team-editor-card')?.remove();
    return;
  }

  if (event.target.matches('#saveTeamBtn')) {
    try {
      await saveSection('team', collectTeamFromDom());
      msg('Mitarbeiter gespeichert.');
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
    return;
  }

  if (event.target.matches('#addPriceBtn')) {
    const current = collectPricesFromDom();
    current.push({ title: { de: '', en: '', tr: '' }, price: 0, unit: 'person' });
    renderPricesEditor(current);
    return;
  }

  if (event.target.matches('.remove-price-btn')) {
    event.target.closest('.price-editor-card')?.remove();
    return;
  }

  if (event.target.matches('#savePricesBtn')) {
    try {
      await saveSection('priceLists', collectPricesFromDom());
      msg('Preislisten gespeichert.');
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
    return;
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
    return;
  }

  if (event.target.matches('.remove-package-btn')) {
    event.target.closest('.package-editor-card')?.remove();
    return;
  }

  if (event.target.matches('#savePackagesBtn')) {
    try {
      await saveSection('packages', collectPackagesFromDom());
      msg('Pakete gespeichert.');
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
    return;
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
    return;
  }

  if (event.target.matches('.remove-menu-item-btn')) {
    event.target.closest('.menu-item-editor-card')?.remove();
    return;
  }

  if (event.target.matches('#saveMenuBtn')) {
    try {
      await saveSection('catalog', collectMenuFromDom());
      msg('Menü gespeichert.');
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
    return;
  }

  if (event.target.matches('#addGalleryBtn')) {
    const current = collectGalleryFromDom();
    current.push({ title: '', image: '' });
    renderGalleryEditor(current);
    return;
  }

  if (event.target.matches('.remove-gallery-btn')) {
    event.target.closest('.gallery-editor-card')?.remove();
    return;
  }

  if (event.target.matches('#saveGalleryBtn')) {
    try {
      await saveSection('gallery', collectGalleryFromDom());
      msg('Galerie gespeichert.');
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
    return;
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
    return;
  }

  if (event.target.matches('.remove-home-section-btn')) {
    event.target.closest('.home-section-editor-card')?.remove();
    return;
  }

  if (event.target.matches('#saveHomeSectionsBtn')) {
    try {
      await saveSection('homeSections', collectHomeSectionsFromDom());
      msg('Startseiten-Kacheln gespeichert.');
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
    return;
  }

  if (event.target.matches('.save-order-status-btn')) {
    try {
      const card = event.target.closest('.admin-order-card');
      if (!card) return;

      const orderId = Number(card.getAttribute('data-order-id'));
      const status = card.querySelector('.order-status-select')?.value || 'neu';

      await updateOrderStatus(orderId, status);
      msg('Bestellstatus gespeichert.');
      await renderOrders();
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
    return;
  }

  if (event.target.matches('.delete-order-btn')) {
    try {
      const card = event.target.closest('.admin-order-card');
      if (!card) return;

      const orderId = Number(card.getAttribute('data-order-id'));
      const confirmed = window.confirm(`Bestellung #${orderId} wirklich löschen?`);
      if (!confirmed) return;

      await deleteOrder(orderId);
      msg('Bestellung gelöscht.');
      await renderOrders();
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
    return;
  }
});

/* =========================
   INPUT / CHANGE
========================= */

document.addEventListener('input', (event) => {
  if (event.target.matches('#branding-logoImage')) {
    const preview = document.querySelector('#branding-logoPreview');
    if (!preview) return;

    preview.src = event.target.value || '';
    preview.style.display = event.target.value ? 'block' : 'none';
  }
});

document.addEventListener('change', async (event) => {
  if (event.target.matches('#branding-logoFile')) {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const url = await uploadImage(file, 'branding');

      const input = document.querySelector('#branding-logoImage');
      const preview = document.querySelector('#branding-logoPreview');

      if (input) input.value = url;
      if (preview) {
        preview.src = url;
        preview.style.display = 'block';
      }

      msg('Logo hochgeladen. Jetzt Branding speichern.');
    } catch (error) {
      msg(`Fehler beim Logo-Upload: ${error.message}`, true);
    }
  }
});
