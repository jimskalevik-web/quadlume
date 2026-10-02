// Quadlume-nøtt: lagrer appen lokalt, og viser varsel når dagens nøtt er klar.
const VERSION = 'qnott-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-32.png', './icons/badge-96.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k.startsWith('qnott-') && k !== VERSION).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return res;
    }).catch(() => caches.open(VERSION).then(c => c.match('./index.html'))));
    return;
  }
  if (url.origin === location.origin || url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(caches.open(VERSION).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }))));
  }
});

async function getState() { const c = await caches.open('qn-state'); const r = await c.match('state'); return r ? r.json() : null; }
async function putState(s) { const c = await caches.open('qn-state'); await c.put('state', new Response(JSON.stringify(s), { headers: { 'Content-Type': 'application/json' } })); }
function todayIdx(launch) { const d = new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - launch) / 864e5) + 1; }
async function checkDaily() {
  const s = await getState();
  if (!s || !s.notif) return;
  const t = todayIdx(s.launch);
  if ((s.lastSolved || 0) >= t || s.lastNotified === t) return;
  await self.registration.showNotification(s.title, {
    body: s.body, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', tag: 'daily', data: { url: './' }
  });
  try { if (self.navigator && self.navigator.setAppBadge) await self.navigator.setAppBadge(1); } catch (e) {}
  s.lastNotified = t; await putState(s);
}
self.addEventListener('periodicsync', e => { if (e.tag === 'daily-nut') e.waitUntil(checkDaily()); });
self.addEventListener('message', e => { if (e.data === 'check-daily') e.waitUntil(checkDaily()); });
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if (c.url.includes('/nott') && 'focus' in c) return c.focus(); }
    return self.clients.openWindow('./');
  }));
});
