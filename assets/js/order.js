import { loadSiteData, pickLang, money } from './data.js';
import { t } from './i18n.js';
import { saveOrder } from './storage.js';

function categoryLabel(key) {
  return {
    fingerfood: 'Fingerfood',
    starters: 'Vorspeisen',
    mains: 'Hauptgerichte',
    desserts: 'Dessert'
  }[key] || key;
}

function buildLine(item, category, index) {
  const inputId = `${category}-${index}`;
  const unitLabel = item.unit === 'person' ? t('perPerson') : t('perPortion');
  return `
    <label class="check-row">
      <div class="check-left">
        <input type="checkbox" data-item-check id="${inputId}" data-category="${category}" data-index="${index}" data-price="${item.price}">
        <span class="fake-check">✓</span>
        <span>
          <strong>${pickLang(item.name)}</strong>
          <small>${money(item.price)} ${unitLabel}</small>
        </span>
      </div>
      <input class="qty-input" type="number" min="1" value="1" data-item-qty="${inputId}">
    </label>
  `;
}

function createInvoiceHtml(order) {
  return `
    <html><head><meta charset="utf-8"><title>Rechnung ${order.id}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;line-height:1.4}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}</style>
    </head><body>
      <h1>Miss Catering</h1>
      <h2>Bestellübersicht / Rechnung</h2>
      <p><strong>ID:</strong> ${order.id}<br><strong>Name:</strong> ${order.customerName}<br><strong>E-Mail:</strong> ${order.customerEmail}<br><strong>Personen:</strong> ${order.persons}</p>
      <table>
        <thead><tr><th>Kategorie</th><th>Artikel</th><th>Menge</th><th>Einzelpreis</th><th>Gesamt</th></tr></thead>
        <tbody>
          ${order.items.map(item => `<tr><td>${item.category}</td><td>${item.name}</td><td>${item.qty}</td><td>${money(item.price)}</td><td>${money(item.total)}</td></tr>`).join('')}
        </tbody>
      </table>
      <h3>Gesamtsumme: ${money(order.total)}</h3>
    </body></html>
  `;
}

function downloadFile(filename, content, type = 'text/html') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function renderPackageBuilder() {
  const data = await loadSiteData();
  const wrapper = document.querySelector('#package-detail');
  if (!wrapper) return;

  const slug = new URLSearchParams(location.search).get('slug') || 'business';
  const pack = data.packages.find(p => p.slug === slug) || data.packages[0];

  wrapper.innerHTML = `
    <section class="page-card package-hero-card">
      <h1>${pickLang(pack.title)}</h1>
      <p>${pickLang(pack.description)}</p>
      <p><strong>Basis:</strong> ${money(pack.basePricePerPerson)} ${t('perPerson')}</p>
      <div class="order-head-fields">
        <input id="customerName" type="text" placeholder="Name">
        <input id="customerEmail" type="email" placeholder="E-Mail">
        <input id="persons" type="number" min="1" value="25" placeholder="Personenanzahl">
      </div>
    </section>

    <section class="builder-grid">
      ${Object.entries(data.catalog).map(([key, items]) => `
        <div class="builder-card">
          <h2>${categoryLabel(key)}</h2>
          ${items.map((item, index) => buildLine(item, key, index)).join('')}
        </div>
      `).join('')}
    </section>

    <section class="summary-card">
      <h2>${t('orderBuilder')}</h2>
      <div id="summary-lines"></div>
      <div class="total-box">
        <span>${t('total')}</span>
        <strong id="grand-total">${money(0)}</strong>
      </div>
      <div class="summary-actions">
        <button id="saveInvoice" class="btn btn-primary">${t('saveInvoice')}</button>
        <button id="sendMail" class="btn btn-secondary">${t('sendMail')}</button>
        <button id="resetOrder" class="btn btn-ghost">${t('reset')}</button>
      </div>
    </section>
  `;

  const checks = [...document.querySelectorAll('[data-item-check]')];
  const personsInput = document.querySelector('#persons');
  const summaryLines = document.querySelector('#summary-lines');
  const grandTotal = document.querySelector('#grand-total');

  function collect() {
    const persons = Math.max(1, Number(personsInput.value || 1));
    const selectedItems = [];
    let total = pack.basePricePerPerson * persons;

    selectedItems.push({
      category: 'Paket',
      name: pickLang(pack.title),
      qty: persons,
      price: pack.basePricePerPerson,
      total: pack.basePricePerPerson * persons
    });

    checks.forEach(check => {
      if (!check.checked) return;
      const id = check.id;
      const qty = Math.max(1, Number(document.querySelector(`[data-item-qty="${id}"]`).value || 1));
      const category = check.dataset.category;
      const item = data.catalog[category][Number(check.dataset.index)];
      const lineTotal = Number(check.dataset.price) * qty;
      total += lineTotal;
      selectedItems.push({
        category: categoryLabel(category),
        name: pickLang(item.name),
        qty,
        price: Number(check.dataset.price),
        total: lineTotal
      });
    });

    summaryLines.innerHTML = selectedItems.map(item => `
      <div class="summary-line">
        <span>${item.category} · ${item.name} × ${item.qty}</span>
        <strong>${money(item.total)}</strong>
      </div>
    `).join('');
    grandTotal.textContent = money(total);
    return { selectedItems, total, persons };
  }

  wrapper.addEventListener('input', collect);
  collect();

  document.querySelector('#resetOrder').addEventListener('click', () => {
    checks.forEach(check => check.checked = false);
    document.querySelectorAll('.qty-input').forEach(input => input.value = 1);
    personsInput.value = 25;
    collect();
  });

  document.querySelector('#saveInvoice').addEventListener('click', async () => {
    const customerName = document.querySelector('#customerName').value.trim() || 'Unbekannt';
    const customerEmail = document.querySelector('#customerEmail').value.trim() || 'ohne-mail';
    const { selectedItems, total, persons } = collect();
    const order = {
      id: `MC-${Date.now()}`,
      customerName,
      customerEmail,
      packageSlug: pack.slug,
      persons,
      items: selectedItems,
      total,
      createdAt: new Date().toISOString()
    };
    await saveOrder(order);
    downloadFile(`${order.id}.html`, createInvoiceHtml(order));
    alert('Rechnung gespeichert und Archiv-Eintrag angelegt.');
  });

  document.querySelector('#sendMail').addEventListener('click', () => {
    const customerName = document.querySelector('#customerName').value.trim() || 'Kunde';
    const customerEmail = document.querySelector('#customerEmail').value.trim() || '';
    const { selectedItems, total, persons } = collect();
    const lines = selectedItems.map(item => `- ${item.category}: ${item.name} x ${item.qty} = ${money(item.total)}`).join('%0D%0A');
    const subject = encodeURIComponent(`Anfrage ${pickLang(pack.title)} - ${customerName}`);
    const body = encodeURIComponent(`Name: ${customerName}\nE-Mail: ${customerEmail}\nPersonen: ${persons}\n\nAuswahl:\n${decodeURIComponent(lines)}\n\nGesamt: ${money(total)}`);
    window.location.href = `mailto:bestellung@miss-catering.de?subject=${subject}&body=${body}`;
  });
}
