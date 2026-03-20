import { loadSiteData } from "./data.js";
import { getLang, setLang } from "./i18n.js";

function safe(value = "") {
  return String(value);
}

function langText(value, lang = "de") {
  if (typeof value === "string") return value;
  return value?.[lang] || value?.de || "";
}

function navLabels(lang) {
  return {
    about: { de: "Über uns", en: "About us", tr: "Hakkımızda" }[lang],
    staff: { de: "Mitarbeiter", en: "Team", tr: "Ekip" }[lang],
    prices: { de: "Preislisten", en: "Prices", tr: "Fiyatlar" }[lang],
    packages: { de: "Pakete", en: "Packages", tr: "Paketler" }[lang],
    menu: { de: "Menü", en: "Menu", tr: "Menü" }[lang],
    gallery: { de: "Galerie", en: "Gallery", tr: "Galeri" }[lang],
    contact: { de: "Kontaktformular", en: "Contact", tr: "İletişim" }[lang],
    impressum: { de: "Impressum", en: "Imprint", tr: "Künye" }[lang],
    login: { de: "Admin Login", en: "Admin Login", tr: "Admin Giriş" }[lang]
  };
}

function buildHeader(data, lang) {
  const labels = navLabels(lang);
  const header = document.querySelector("[data-header]");
  if (!header) return;

  header.innerHTML = `
    <div class="container header-inner">
      <a class="brand" href="index.html">
        <div class="brand-mark">${safe(data.branding?.logoText || "MC")}</div>
        <div class="brand-text">
          <strong>Miss Catering</strong>
          <span>${safe(langText(data.branding?.tagline, lang) || "Speisen mit Eleganz")}</span>
        </div>
      </a>

      <nav class="main-nav">
        <a href="about.html">${labels.about}</a>
        <a href="staff.html">${labels.staff}</a>
        <a href="prices.html">${labels.prices}</a>
        <a href="packages.html">${labels.packages}</a>
        <a href="menu.html">${labels.menu}</a>
        <a href="gallery.html">${labels.gallery}</a>
        <a href="contact.html">${labels.contact}</a>
        <a href="impressum.html">${labels.impressum}</a>
        <a href="login.html" class="admin-link">${labels.login}</a>
      </nav>

      <div class="lang-switch">
        <button data-lang="de" class="${lang === "de" ? "active" : ""}">DE</button>
        <button data-lang="en" class="${lang === "en" ? "active" : ""}">EN</button>
        <button data-lang="tr" class="${lang === "tr" ? "active" : ""}">TR</button>
      </div>
    </div>
  `;
}

function buildFooter(data, lang) {
  const footer = document.querySelector("[data-footer]");
  if (!footer) return;

  const contact = data.contact || {};
  const imp = data.impressum || {};

  footer.innerHTML = `
    <div class="container footer-grid">
      <div>
        <strong>Miss Catering</strong>
        <p>${safe(langText(data.branding?.tagline, lang) || "Speisen mit Eleganz")}</p>
      </div>

      <div>
        <strong>${navLabels(lang).contact}</strong>
        <p>
          ${safe(contact.address || "")}<br>
          ${safe(contact.phone || "")}<br>
          ${safe(contact.mail || "")}
        </p>
      </div>

      <div>
        <strong>${navLabels(lang).impressum}</strong>
        <p>
          ${safe(imp.owner || "")}<br>
          ${safe(imp.street || "")}<br>
          ${safe(imp.city || "")}
        </p>
      </div>
    </div>
  `;
}

async function bootApp() {
  const lang = getLang();
  const data = await loadSiteData();

  buildHeader(data, lang);
  buildFooter(data, lang);

  document.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-lang]");
    if (!btn) return;

    const newLang = btn.getAttribute("data-lang");
    setLang(newLang);
    location.reload();
  });
}

window.addEventListener("DOMContentLoaded", bootApp);
