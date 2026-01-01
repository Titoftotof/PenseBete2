// Service Worker Push Notification Handler
// This file will be imported by the main service worker

self.addEventListener('push', function (event) {
  console.log('[SW] Push notification received:', event)

  let data = {
    title: '🔔 Rappel Pense-Bête',
    body: 'Vous avez un rappel !',
    icon: '/icon.svg',
    badge: '/icon.svg'
  }

  // Try to parse the push data
  if (event.data) {
    try {
      const pushData = event.data.json()
      data = {
        title: pushData.title || data.title,
        body: pushData.body || data.body,
        icon: pushData.icon || data.icon,
        badge: pushData.badge || data.badge,
        data: pushData.data || {}
      }
    } catch (e) {
      console.error('[SW] Error parsing push data:', e)
      // Try as text
      const text = event.data.text()
      if (text) {
        data.body = text
      }
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [200, 100, 200],
    tag: 'pensebete-reminder',
    renotify: true,
    requireInteraction: true,
    data: data.data
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Handle notification click
self.addEventListener('notificationclick', function (event) {
  console.log('[SW] Notification clicked:', event)

  event.notification.close()

  // Focus or open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        // Try to focus an existing window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus()
          }
        }
        // Open a new window if none exists
        if (clients.openWindow) {
          return clients.openWindow('/')
        }
      })
  )
})
