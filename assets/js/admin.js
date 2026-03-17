import { CONFIG } from './config.js';
import { getSession, isAdmin, logout } from './auth.js';
import { getSupabaseClient } from './supabase.js';
import { loadSiteData, clearSiteDataCache, pickLang } from './data.js';

const state = {
  packages: [],
  catalog: { fingerfood: [], starters: [], mains: [], desserts: [] },
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
            <option value="portion" ${item.unit === 'portion' ? 'selected' : ''}>Portion</option>
            <option value="person" ${item.unit === 'person' ? 'selected' : ''}>Person</option>
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
        <label>Bild-URL<input class="gallery-image" type="url" value="${escapeHtml(item.image || '')}" placeholder="https://..."></label>
      </div>
      <div class="gallery-preview-wrap">
        ${item.image ? `<img class="gallery-preview-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title || 'Preview')}">` : '<div class="gallery-preview-empty">Noch keine Bildvorschau</div>'}
      </div>
    </article>
  `;
}

function renderPackagesEditor() {
  const root = document.querySelector('#packages-admin-list');
  if (!root) return;
  root.innerHTML = state.packages.map(item => packageCardTemplate(item)).join('');
}

function renderMenuEditor() {
  const keys = ['fingerfood', 'starters', 'mains', 'desserts'];
  for (const key of keys) {
    const root = document.querySelector(`#menu-${key}-list`);
    if (!root) continue;
    root.innerHTML = (state.catalog[key] || []).map(item => menuCardTemplate(item, key)).join('');
  }
}

function renderGalleryEditor() {
  const root = document.querySelector('#gallery-admin-list');
  if (!root) return;
  root.innerHTML = state.gallery.map(item => galleryCardTemplate(item)).join('');
}

function collectPackagesFromDom() {
  return Array.from(document.querySelectorAll('.package-editor-card')).map(card => {
    const titleDe = card.querySelector('.pkg-title-de').value.trim();
    const slug = card.querySelector('.pkg-slug').value.trim() || slugify(titleDe);
    return {
      slug,
      title: {
        de: titleDe,
        en: card.querySelector('.pkg-title-en').value.trim(),
        tr: card.querySelector('.pkg-title-tr').value.trim()
      },
      description: {
        de: card.querySelector('.pkg-desc-de').value.trim(),
        en: card.querySelector('.pkg-desc-en').value.trim(),
        tr: card.querySelector('.pkg-desc-tr').value.trim()
      },
      basePricePerPerson: Number(card.querySelector('.pkg-price').value || 0)
    };
  }).filter(item => item.slug && item.title.de);
}

function collectMenuFromDom() {
  const catalog = { fingerfood: [], starters: [], mains: [], desserts: [] };
  document.querySelectorAll('.menu-editor-card').forEach(card => {
    const category = card.dataset.category;
    if (!catalog[category]) return;
    const item = {
      name: {
        de: card.querySelector('.menu-name-de').value.trim(),
        en: card.querySelector('.menu-name-en').value.trim(),
        tr: card.querySelector('.menu-name-tr').value.trim()
      },
      price: Number(card.querySelector('.menu-price').value || 0),
      unit: card.querySelector('.menu-unit').value
    };
    if (item.name.de) catalog[category].push(item);
  });
  return catalog;
}

function collectGalleryFromDom() {
  return Array.from(document.querySelectorAll('.gallery-editor-card')).map(card => ({
    title: card.querySelector('.gallery-title').value.trim(),
    image: card.querySelector('.gallery-image').value.trim()
  })).filter(item => item.title || item.image);
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

  state.packages = Array.isArray(data.packages) ? structuredClone(data.packages) : [];
  state.catalog = data.catalog ? structuredClone(data.catalog) : { fingerfood: [], starters: [], mains: [], desserts: [] };
  state.gallery = Array.isArray(data.gallery) ? structuredClone(data.gallery) : [];

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
      const packages = collectPackagesFromDom();
      await saveSection('packages', packages);
      state.packages = packages;
      renderPackagesEditor();
      msg('Pakete gespeichert.');
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
  }

  if (event.target.matches('.admin-add-menu-item')) {
    const category = event.target.dataset.category;
    if (!state.catalog[category]) return;
    state.catalog[category].push({
      name: { de: '', en: '', tr: '' },
      price: 0,
      unit: category === 'mains' ? 'person' : 'portion'
    });
    renderMenuEditor();
  }

  if (event.target.matches('.remove-menu-item-btn')) {
    event.target.closest('.menu-editor-card')?.remove();
  }

  if (event.target.matches('#saveMenuBtn')) {
    try {
      const catalog = collectMenuFromDom();
      await saveSection('catalog', catalog);
      state.catalog = catalog;
      renderMenuEditor();
      msg('Menü gespeichert.');
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
      const gallery = collectGalleryFromDom();
      await saveSection('gallery', gallery);
      state.gallery = gallery;
      renderGalleryEditor();
      msg('Galerie gespeichert.');
    } catch (error) {
      msg(`Fehler: ${error.message}`, true);
    }
  }
});

document.addEventListener('input', (event) => {
  if (event.target.matches('.gallery-title, .gallery-image')) {
    const card = event.target.closest('.gallery-editor-card');
    if (!card) return;
    const title = card.querySelector('.gallery-title').value.trim() || 'Neues Bild';
    const image = card.querySelector('.gallery-image').value.trim();
    const strong = card.querySelector('.admin-editor-top strong');
    if (strong) strong.textContent = title;
    const preview = card.querySelector('.gallery-preview-wrap');
    if (!preview) return;
    preview.innerHTML = image
      ? `<img class="gallery-preview-image" src="${escapeHtml(image)}" alt="${escapeHtml(title)}">`
      : '<div class="gallery-preview-empty">Noch keine Bildvorschau</div>';
  }

  if (event.target.matches('.pkg-title-de')) {
    const card = event.target.closest('.package-editor-card');
    if (!card) return;
    const title = event.target.value.trim() || 'Neues Paket';
    const strong = card.querySelector('.admin-editor-top strong');
    if (strong) strong.textContent = title;
    const slugInput = card.querySelector('.pkg-slug');
    if (slugInput && !slugInput.value.trim()) slugInput.value = slugify(title);
  }

  if (event.target.matches('.menu-name-de')) {
    const card = event.target.closest('.menu-editor-card');
    if (!card) return;
    const title = event.target.value.trim() || 'Neuer Menüpunkt';
    const strong = card.querySelector('.admin-editor-top strong');
    if (strong) strong.textContent = title;
  }
});
