// Quadlume – forsiden sender videre til /nott/. Denne erstatter den gamle app-lagringen på forsiden og fjerner seg selv.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(k => k.startsWith('quadlume-') || k === 'qnott-v1' || k === 'qnott-v2').map(k => caches.delete(k)));
  await self.registration.unregister();
  const list = await self.clients.matchAll({ type: 'window' });
  list.forEach(c => { try { c.navigate('/nott/'); } catch (err) {} });
})()));
