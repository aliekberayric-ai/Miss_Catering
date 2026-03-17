import { CONFIG } from './config.js';
import { readLocalOrders } from './storage.js';
import { getSession, isAdmin, logout } from './auth.js';

function escapeHtml(text = '') {
  return text.replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

async function renderOrders() {
  const list = document.querySelector('#orders-list');
  if (!list) return;
  const orders = readLocalOrders();
  if (!orders.length) {
    list.innerHTML = '<p>Noch keine lokalen Bestellungen gespeichert.</p>';
    return;
  }
  list.innerHTML = orders.map(order => `
    <article class="admin-order-card">
      <h3>${escapeHtml(order.id)}</h3>
      <p><strong>${escapeHtml(order.customerName)}</strong> · ${escapeHtml(order.customerEmail)} · ${order.persons} Personen</p>
      <p><strong>Gesamt:</strong> ${order.total.toFixed(2)} €</p>
      <details>
        <summary>Positionen anzeigen</summary>
        <ul>${order.items.map(item => `<li>${escapeHtml(item.category)} – ${escapeHtml(item.name)} × ${item.qty} = ${item.total.toFixed(2)} €</li>`).join('')}</ul>
      </details>
    </article>
  `).join('');
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
    status.innerHTML = `<p>${CONFIG.demoAdminHint}</p><p>Mit echtem Admin-Zugang werden hier später CRUD-Formulare für Menü, Pakete, Galerie und Mitarbeiter freigeschaltet.</p>`;
    return;
  }

  gate.hidden = true;
  app.hidden = false;
  await renderOrders();
}

window.addEventListener('DOMContentLoaded', boot);

document.addEventListener('click', async (event) => {
  if (event.target.matches('#logoutBtn')) {
    await logout();
    location.href = 'login.html';
  }
});
