// Minimal placeholder for FCM background messages
// You can enhance this later to show notifications.
self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : null;
    // eslint-disable-next-line no-console
    console.log('[firebase-messaging-sw] Push payload:', data || event.data?.text());
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('[firebase-messaging-sw] Push received');
  }
});

