/* کار آفلاین: فایل‌های اپ ذخیره می‌شوند؛ فونت‌ها بعد از اولین دریافت. نسخه با هر تغییر فایل‌ها عوض می‌شود. */
const VERSION = 'diet-planner-c7e8ca9359';
const FONTS = 'diet-planner-fonts';
const PRECACHE = ["./", "./index.html", "./manifest.webmanifest", "./lib/docx.iife.js", "./lib/jszip.min.js", "./lib/xlsx-template.js", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-512.png", "./icons/apple-touch-icon.png", "./icons/favicon-48.png"];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FONTS).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(caches.open(FONTS).then(async (cache) => {
      const hit = await cache.match(req);
      const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; });
      if (hit) { net.catch(() => {}); return hit; }
      return net;
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(withTimeout(fetch(req), 4000)
      .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('./index.html', copy)); } return res; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  })));
});
