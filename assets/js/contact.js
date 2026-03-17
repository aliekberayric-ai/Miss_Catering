import { CONFIG } from './config.js';
import { t } from './i18n.js';

export function initContactForm() {
  const form = document.querySelector('#contact-form');
  if (!form) return;

  form.addEventListener('submit', event => {
    event.preventDefault();
    const fd = new FormData(form);
    const subject = encodeURIComponent(`Kontaktanfrage Miss Catering: ${fd.get('subject') || ''}`);
    const body = encodeURIComponent(
      `Name: ${fd.get('name')}\n` +
      `E-Mail: ${fd.get('email')}\n` +
      `Telefon: ${fd.get('phone')}\n` +
      `Nachricht: ${fd.get('message')}`
    );
    window.location.href = `mailto:${CONFIG.siteEmail}?subject=${subject}&body=${body}`;
    alert(t('contactSuccess'));
  });
}
