/* Local notification previews only. Remote push requires the future backend. */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './', self.registration.scope);
  if (target.origin !== self.location.origin) return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = windows.find(item => new URL(item.url).origin === target.origin);
    if (client) { await client.navigate(target.href); await client.focus(); }
    else await self.clients.openWindow(target.href);
  })());
});
