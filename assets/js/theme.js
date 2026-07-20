import { getSettings, saveSettings } from './storage.js';
export function applyTheme(theme) {
  const resolved = theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
  document.documentElement.dataset.theme = resolved;
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => { btn.textContent = resolved === 'dark' ? '☀ الوضع الفاتح' : '☾ الوضع الداكن'; });
}
export function initTheme() {
  const setting = getSettings().theme || 'system'; applyTheme(setting);
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => btn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    saveSettings({ ...getSettings(), theme: next }); applyTheme(next);
  }));
}
