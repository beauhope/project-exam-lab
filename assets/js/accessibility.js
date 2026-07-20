export function announce(message) {
  const region = document.querySelector('[data-live]');
  if (region) { region.textContent = ''; requestAnimationFrame(() => { region.textContent = message; }); }
}
export function initAccessibility() {
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') document.querySelectorAll('dialog[open]').forEach(d => d.close());
  });
}
