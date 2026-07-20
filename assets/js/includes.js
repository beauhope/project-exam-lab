(function () {
  'use strict';
  if (window.__consuTrainIncludes) return;
  window.__consuTrainIncludes = true;
  const script = document.currentScript || [...document.scripts].find(item => /assets\/js\/includes\.js(?:[?#]|$)/.test(item.src));
  const appRoot = script ? new URL('../../', script.src) : new URL('./', location.href);
  window.APP_ROOT_URL = appRoot;

  const resolveResources = root => {
    root.querySelectorAll('[data-app-href]').forEach(el => { el.href = new URL(el.dataset.appHref, appRoot).href; });
    root.querySelectorAll('[data-app-src]').forEach(el => { el.src = new URL(el.dataset.appSrc, appRoot).href; });
  };
  const fallback = (kind, message) => kind === 'header'
    ? `<header class="site-header includes-fallback"><nav class="nav" aria-label="التنقل الرئيسي"><a class="brand-text" href="${new URL('index.html', appRoot)}">ConsuTrain — محاكي إدارة المشاريع</a><span>${message}</span></nav></header>`
    : `<footer class="site-footer includes-fallback"><div class="footer-inner"><p>© ${new Date().getFullYear()} ConsuTrain — جميع الحقوق محفوظة.</p><p>تم تطوير التطبيق بواسطة يوسف جول.</p><p>${message}</p></div></footer>`;

  async function inject(id, file, kind) {
    const host = document.getElementById(id);
    if (!host || host.dataset.loaded === 'true') return;
    host.dataset.loaded = 'true';
    try {
      const response = await fetch(new URL(file, appRoot));
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      host.innerHTML = await response.text(); resolveResources(host);
    } catch (error) {
      console.error(`فشل تحميل ${file} من ${appRoot.href}`, error);
      host.innerHTML = fallback(kind, 'تعذر تحميل بعض عناصر الواجهة. ما زال بإمكانك الانتقال إلى الصفحة الرئيسية.');
    }
  }
  function activate() {
    document.querySelectorAll('[data-current-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('[data-app-href]').forEach(link => { if (new URL(link.href).pathname.split('/').pop() === page) link.setAttribute('aria-current', 'page'); });
    const toggle = document.querySelector('.nav-toggle'), links = document.querySelector('.nav-links');
    const close = () => { if (!toggle || !links) return; toggle.setAttribute('aria-expanded','false'); links.classList.remove('is-open'); document.body.classList.remove('nav-open'); };
    toggle?.addEventListener('click', () => { const open=toggle.getAttribute('aria-expanded')!=='true'; toggle.setAttribute('aria-expanded',String(open)); toggle.setAttribute('aria-label',open?'إغلاق قائمة التنقل':'فتح قائمة التنقل');links.classList.toggle('is-open',open);document.body.classList.toggle('nav-open',open); });
    links?.addEventListener('click', e => { if(e.target.closest('a')) close(); });
    document.addEventListener('click', e => { if(toggle && links && !toggle.contains(e.target) && !links.contains(e.target)) close(); });
    document.addEventListener('keydown', e => { if(e.key==='Escape'){close();toggle?.focus();} });
    document.dispatchEvent(new CustomEvent('app:partials-loaded', { detail: { appRoot: appRoot.href } }));
  }
  Promise.all([inject('site-header','partials/header.html','header'), inject('site-footer','partials/footer.html','footer')]).then(activate);
})();
