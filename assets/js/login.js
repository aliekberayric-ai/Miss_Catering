import { login } from './auth.js';
import { t } from './i18n.js';

window.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#login-form');
  const msg = document.querySelector('#login-message');
  const info = document.querySelector('#login-info');
  if (info) info.textContent = t('loginInfo');

  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(form);
    const email = String(fd.get('email') || '');
    const password = String(fd.get('password') || '');
    const result = await login(email, password);
    if (result?.error) {
      msg.textContent = result.error.message;
      return;
    }
    location.href = 'admin.html';
  });
});
