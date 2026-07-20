import { getSettings, saveSettings } from './storage.js';
export function applyTheme(theme) {
  const resolved = theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
  document.documentElement.dataset.theme = resolved;
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => { const label=resolved === 'dark' ? '☀ الوضع الفاتح' : '☾ الوضع الداكن';btn.textContent=label;btn.setAttribute('aria-label',`التبديل إلى ${label.replace(/^[^ ]+ /,'')}`); });
}
export function initTheme() {
  const setting = getSettings().theme || 'system'; applyTheme(setting);
  const bind=()=>document.querySelectorAll('[data-theme-toggle]:not([data-theme-bound])').forEach(btn => {btn.dataset.themeBound='true';btn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    saveSettings({ ...getSettings(), theme: next }); applyTheme(next);
  })});bind();document.addEventListener('app:partials-loaded',()=>{applyTheme(getSettings().theme||'system');bind()});
}
