import { loadSiteData, pickLang, money } from "./data.js";
import { getSupabaseClient } from "./supabase.js";

function escapeHtml(text = "") {
  return String(text).replace(/[&<>"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[char]));
}

function getSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("slug") || "";
}

function setMessage(text, isError = false) {
  const el = document.querySelector("#builder-message");
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? "#ff8a8a" : "#9ff0b7";
}

function getPersonsCount() {
  const value = Number(document.querySelector("#persons-count")?.value || 1);
  return Math.max(1, Number.isFinite(value) ? value : 1);
}

function getCustomerData() {
  return {
    name: (document.querySelector("#customer-name")?.value || "").trim(),
    email: (document.querySelector("#customer-email")?.value || "").trim(),
    phone: (document.querySelector("#customer-phone")?.value || "").trim()
  };
}

function validateCustomerData() {
  const { name, email } = getCustomerData();

  if (!name) {
    return { ok: false, message: "Bitte Name eingeben." };
  }

  if (!email) {
    return { ok: false, message: "Bitte E-Mail eingeben." };
  }

  const simpleEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!simpleEmailRegex.test(email)) {
    return { ok: false, message: "Bitte eine gültige E-Mail eingeben." };
  }

  return { ok: true };
}

function renderOptionItem(item, categoryKey, index) {
  const id = `${categoryKey}-${index}`;
  const price = Number(item.price || 0);
  const unit = item.unit || "portion";
  const name = item.name?.de || item.name?.en || item.name?.tr || "";

 const unitText = item.unit === 'person' ? 'Person' : 'Portion';
 const priceText = `${Number(item.price || 0).toFixed(2).replace('.', ',')} € / ${unitText}`;

return `
  <label class="builder-option-item">
    <div class="builder-option-left">
      <input
        type="checkbox"
        value="${escapeHtml(name)}"
        data-price="${Number(item.price || 0)}"
        data-unit="${escapeHtml(item.unit || 'portion')}"
        data-name="${escapeHtml(name)}"
      >

      <div class="builder-option-thumb">
        ${
          item.image
            ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(name)}">`
            : `<div class="thumb-placeholder"></div>`
        }
      </div>

      <span class="builder-option-label">${escapeHtml(name)}</span>
    </div>

    <strong>${priceText}</strong>
  </label>
`;
}

function renderCategory(targetId, items, categoryKey) {
  const target = document.querySelector(`#${targetId}`);
  if (!target) return;

  target.innerHTML = (items || [])
    .map((item, index) => renderOptionItem(item, categoryKey, index))
    .join("");

  if (!items || !items.length) {
    target.innerHTML = `<p>Keine Einträge vorhanden.</p>`;
  }
}

function getCheckedItems() {
  return [
    ...document.querySelectorAll('.builder-option-item input[type="checkbox"]:checked')
  ].map((input) => ({
    category: input.dataset.category || "",
    name: input.dataset.name || "",
    price: Number(input.dataset.price || 0),
    unit: input.dataset.unit || "portion"
  }));
}

function calculateTotals(pkg) {
  const persons = getPersonsCount();
  const checkedItems = getCheckedItems();
  const basePricePerPerson = Number(pkg.price ?? pkg.basePricePerPerson ?? 0);

  const baseTotal = basePricePerPerson * persons;

  let extrasTotal = 0;
  for (const item of checkedItems) {
    if (item.unit === "person") {
      extrasTotal += item.price * persons;
    } else {
      extrasTotal += item.price;
    }
  }

  const grandTotal = baseTotal + extrasTotal;

  return {
    persons,
    checkedItems,
    basePricePerPerson,
    baseTotal,
    extrasTotal,
    grandTotal
  };
}

function updateSummary(pkg) {
  const summary = calculateTotals(pkg);

  const packageName = pickLang(pkg.title);

  const packageNameEl = document.querySelector("#summary-package-name");
  const personsEl = document.querySelector("#summary-persons");
  const baseTotalEl = document.querySelector("#summary-base-total");
  const extrasTotalEl = document.querySelector("#summary-extras-total");
  const grandTotalEl = document.querySelector("#summary-grand-total");
  const previewEl = document.querySelector("#selected-items-preview");

  if (packageNameEl) packageNameEl.textContent = packageName;
  if (personsEl) personsEl.textContent = String(summary.persons);
  if (baseTotalEl) baseTotalEl.textContent = money(summary.baseTotal);
  if (extrasTotalEl) extrasTotalEl.textContent = money(summary.extrasTotal);
  if (grandTotalEl) grandTotalEl.textContent = money(summary.grandTotal);

  if (!previewEl) return;

  if (!summary.checkedItems.length) {
    previewEl.innerHTML = "<p>Noch keine Extras ausgewählt.</p>";
    return;
  }

  previewEl.innerHTML = summary.checkedItems.map((item) => `
    <div class="selected-preview-item">
      <span>${escapeHtml(item.name)}</span>
      <strong>${money(item.price)} / ${escapeHtml(item.unit)}</strong>
    </div>
  `).join("");
}

async function saveOrderToSupabase(pkg) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase nicht verbunden.");
  }

  const validation = validateCustomerData();
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const customer = getCustomerData();
  const summary = calculateTotals(pkg);

  const payload = {
    package: {
      slug: pkg.slug || "",
      title: pkg.title || {},
      description: pkg.description || {},
      price: Number(pkg.price ?? pkg.basePricePerPerson ?? 0)
    },
    customer,
    summary,
    created_at_client: new Date().toISOString()
  };

  const { error } = await supabase.from("orders").insert({
    customer_name: customer.name,
    customer_email: customer.email,
    package_slug: pkg.slug || "",
    persons: summary.persons,
    total_price: summary.grandTotal,
    payload
  });

  if (error) {
    throw error;
  }
}

function openPrintWindow(pkg) {
  const customer = getCustomerData();
  const summary = calculateTotals(pkg);
  const packageName = pickLang(pkg.title);

  const itemsHtml = summary.checkedItems.length
    ? summary.checkedItems.map((item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.category)}</td>
          <td>${escapeHtml(item.unit)}</td>
          <td>${money(item.price)}</td>
        </tr>
      `).join("")
    : `
      <tr>
        <td colspan="4">Keine Extras ausgewählt</td>
      </tr>
    `;

  const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <title>Miss Catering - Angebot</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 32px;
          color: #222;
        }
        h1, h2, h3 {
          margin-bottom: 8px;
        }
        p {
          margin: 6px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
        }
        th, td {
          border: 1px solid #ccc;
          padding: 10px;
          text-align: left;
        }
        .summary {
          margin-top: 24px;
        }
        .summary p {
          margin: 8px 0;
        }
      </style>
    </head>
    <body>
      <h1>Miss Catering</h1>
      <h2>Angebot / Bestellung</h2>

      <p><strong>Kunde:</strong> ${escapeHtml(customer.name)}</p>
      <p><strong>E-Mail:</strong> ${escapeHtml(customer.email)}</p>
      <p><strong>Telefon:</strong> ${escapeHtml(customer.phone)}</p>

      <p><strong>Paket:</strong> ${escapeHtml(packageName)}</p>
      <p><strong>Personen:</strong> ${summary.persons}</p>
      <p><strong>Grundpreis pro Person:</strong> ${money(summary.basePricePerPerson)}</p>

      <h3>Ausgewählte Extras</h3>
      <table>
        <thead>
          <tr>
            <th>Position</th>
            <th>Kategorie</th>
            <th>Einheit</th>
            <th>Preis</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="summary">
        <p><strong>Grundpreis gesamt:</strong> ${money(summary.baseTotal)}</p>
        <p><strong>Extras gesamt:</strong> ${money(summary.extrasTotal)}</p>
        <p><strong>Gesamt:</strong> ${money(summary.grandTotal)}</p>
      </div>

      <script>
        window.onload = () => window.print();
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    setMessage("Pop-up wurde blockiert. Bitte Pop-ups erlauben.", true);
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

async function boot() {
  try {
    const data = await loadSiteData();
    const slug = getSlugFromUrl();

    const packages = data.packages || [];
    const pkg = packages.find((item) => item.slug === slug) || packages[0];

    if (!pkg) {
      setMessage("Kein Paket gefunden.", true);
      return;
    }

    const titleEl = document.querySelector("#package-title");
    const descEl = document.querySelector("#package-description");
    const basePriceEl = document.querySelector("#package-base-price");

    if (titleEl) titleEl.textContent = pickLang(pkg.title);
    if (descEl) descEl.textContent = pickLang(pkg.description);
    if (basePriceEl) {
      basePriceEl.textContent = money(Number(pkg.price ?? pkg.basePricePerPerson ?? 0));
    }

    renderCategory("fingerfood-list", data.catalog?.fingerfood || [], "fingerfood");
    renderCategory("starters-list", data.catalog?.starters || [], "starters");
    renderCategory("mains-list", data.catalog?.mains || [], "mains");
    renderCategory("desserts-list", data.catalog?.desserts || [], "desserts");

    updateSummary(pkg);

    document.addEventListener("change", (event) => {
      if (
        event.target.matches('.builder-option-item input‘[type="checkbox"]') ||
        event.target.matches("#persons-count")
      ) {
        updateSummary(pkg);
      }
    });

    document.querySelector("#save-order-btn")?.addEventListener("click", async () => {
      try {
        setMessage("Speichere Bestellung...");
        await saveOrderToSupabase(pkg);
        setMessage("Bestellung wurde gespeichert.");
      } catch (error) {
        setMessage(`Fehler: ${error.message}`, true);
      }
    });

    document.querySelector("#print-order-btn")?.addEventListener("click", () => {
      const validation = validateCustomerData();
      if (!validation.ok) {
        setMessage(validation.message, true);
        return;
      }
      openPrintWindow(pkg);
    });
  } catch (error) {
    setMessage(`Fehler beim Laden: ${error.message}`, true);
  }
}

window.addEventListener("DOMContentLoaded", boot);
