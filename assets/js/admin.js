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

  const packagesPreview = document.querySelector('#packages-preview');
  if (packagesPreview) {
    packagesPreview.innerHTML = (data.packages || []).map(item => `
      <article class="price-card">
        <h3>${escapeHtml(pickLang(item.title))}</h3>
        <p>${escapeHtml(pickLang(item.description))}</p>
        <p><strong>${Number(item.basePricePerPerson || 0).toFixed(2)} € / Person</strong></p>
      </article>
    `).join('');
  }
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
});
