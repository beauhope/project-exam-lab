const CACHE_NAME = 'project-exam-lab-v1';
const APP_FILES = [
  './','./index.html','./exam.html','./results.html','./review.html','./about.html','./privacy.html','./404.html',
  './manifest.webmanifest','./data/questions.json','./assets/css/styles.css','./assets/css/print.css','./assets/icons/icon.svg',
  './assets/js/config.js','./assets/js/questions-loader.js','./assets/js/question-selector.js','./assets/js/question-renderer.js',
  './assets/js/exam.js','./assets/js/results.js','./assets/js/review.js','./assets/js/storage.js','./assets/js/history.js',
  './assets/js/theme.js','./assets/js/accessibility.js','./assets/js/app.js','./tools/validate.html'
];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES))); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('project-exam-lab-') && k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => { const copy=response.clone();caches.open(CACHE_NAME).then(c=>c.put(event.request,copy));return response; }).catch(() => caches.match(event.request).then(r => r || caches.match('./index.html')))); return;
  }
  event.respondWith(caches.match(event.request).then(cached => {
    const update = fetch(event.request).then(response => { if(response.ok)caches.open(CACHE_NAME).then(c=>c.put(event.request,response.clone()));return response; }).catch(() => cached);
    return cached || update;
  }));
});
