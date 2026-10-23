/* کار آفلاین: فایل‌های اپ ذخیره می‌شوند؛ فونت‌ها بعد از اولین دریافت. نسخه با هر تغییر فایل‌ها عوض می‌شود. */
const VERSION = 'diet-planner-1b3e112253';
const BUILD = 'adf1b4d';
const FONTS = 'diet-planner-fonts';
const PREFIX = VERSION.replace(/-[0-9a-f]+$/, '-');
const PRECACHE = ["./", "./index.html", "./manifest.webmanifest", "./lib/docx.iife.js", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-512.png", "./icons/apple-touch-icon.png", "./icons/favicon-48.png"];
// دو اپ در یک پوشه: اپ دکتر (index.html و …) و اپ منشی (office.html و فایل‌های office*). هر کارگزار فقط فایل‌های اپ خودش را نگه می‌دارد.
const APP = 'doctor';
const CORE = APP === 'office' ? ['./office.html'] : ['./', './index.html'];
const HOME = APP === 'office' ? './office.html' : './index.html';
const NAV = APP === 'office' ? ['office.html'] : ['', 'index.html'];
const BASE = new URL('./', self.location).pathname;
const OWN_DIRS = ['icons/', 'lib/'];
function ownPath(url) {
  if (!url.pathname.startsWith(BASE)) return null;
  const rel = url.pathname.slice(BASE.length);
  const office = rel.startsWith('office');
  if (APP === 'office') return office && !rel.includes('/') ? rel : null;
  if (office) return null;
  if (rel.includes('/') && !OWN_DIRS.some((d) => rel.startsWith(d))) return null;
  return rel;
}

// اگر یکی از فایل‌های جانبی (آیکون، کتابخانه Word) روی سرور نباشد، نسخه تازه باز هم نصب می‌شود
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION)
    .then((c) => c.addAll(CORE).then(() => Promise.all(PRECACHE.filter((u) => !CORE.includes(u)).map((u) => c.add(u).catch(() => null)))))
    .then(() => self.skipWaiting()));
});

// صفحه می‌پرسد این کارگزار مال کدام نسخه است (تا اعلان «نسخه تازه» بی‌جا نیاید)
self.addEventListener('message', (event) => { if (event.data === 'build?' && event.source) event.source.postMessage({ build: BUILD }); });

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    // فقط نسخه‌های قبلی همین اپ پاک می‌شوند (اپ‌های دیگر همین دامنه حافظه خودشان را دارند)
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== VERSION && k !== FONTS).map((k) => caches.delete(k))))
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
  const rel = ownPath(url);
  if (rel === null) return;
  if (req.mode === 'navigate') {
    if (!NAV.includes(rel)) return;
    event.respondWith(withTimeout(fetch(req), 4000)
      .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(HOME, copy)); } return res; })
      .catch(() => caches.match(HOME)));
    return;
  }
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  })));
});
