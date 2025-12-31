import { supabase } from './supabase'

export interface Reminder {
  id: string
  itemId: string
  listId: string
  itemName: string
  listName: string
  dueDate: string
}

const NOTIFICATIONS_ENABLED_KEY = 'pensebete-notifications-enabled'
const REMINDERS_STORAGE_KEY = 'pensebete-reminders'

class NotificationService {
  private permission: NotificationPermission = 'default'

  async init() {
    if (!('Notification' in window)) {
      console.log('Ce navigateur ne supporte pas les notifications')
      return false
    }

    // Load saved preference
    const savedPermission = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY)
    if (savedPermission === 'granted') {
      this.permission = 'granted'
    }

    return this.permission === 'granted'
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false
    }

    if (this.permission === 'granted') {
      return true
    }

    if (this.permission !== 'denied') {
      const result = await Notification.requestPermission()
      this.permission = result

      if (result === 'granted') {
        localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'granted')
        return true
      } else {
        localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, result)
        return false
      }
    }

    return false
  }

  isEnabled(): boolean {
    return this.permission === 'granted' || localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === 'granted'
  }

  sendNotification(title: string, body: string, data?: any) {
    if (!this.isEnabled()) return

    // Check if we're in a browser context
    if (typeof window === 'undefined') return

    // Use Service Worker if available, otherwise fallback to regular Notification
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        data: { title, body, data }
      })
    } else {
      new Notification(title, {
        body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: data?.itemId || 'default',
        renotify: true,
        data
      })
    }
  }

  saveReminder(reminder: Reminder) {
    const reminders = this.getReminders()
    reminders.push(reminder)
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders))
  }

  removeReminder(itemId: string) {
    const reminders = this.getReminders()
    const filtered = reminders.filter(r => r.itemId !== itemId)
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(filtered))
  }

  getReminders(): Reminder[] {
    const stored = localStorage.getItem(REMINDERS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  }

  clearReminders() {
    localStorage.removeItem(REMINDERS_STORAGE_KEY)
  }

  // Check for due reminders (should be called periodically)
  checkReminders() {
    if (!this.isEnabled()) return

    const reminders = this.getReminders()
    const now = new Date()
    const notifiedKey = 'pensebete-notified-reminders'
    const notified = JSON.parse(localStorage.getItem(notifiedKey) || '[]')

    reminders.forEach(reminder => {
      const dueDate = new Date(reminder.dueDate)
      const timeDiff = dueDate.getTime() - now.getTime()

      // Notify if due date is within 1 hour and not already notified
      if (timeDiff <= 3600000 && timeDiff > 0 && !notified.includes(reminder.id)) {
        this.sendNotification(
          `Rappel: ${reminder.itemName}`,
          `Élément "${reminder.itemName}" de la liste "${reminder.listName}" à échéance dans ${Math.ceil(timeDiff / 60000)} minutes`,
          { itemId: reminder.itemId, listId: reminder.listId }
        )

        // Mark as notified
        notified.push(reminder.id)
        localStorage.setItem(notifiedKey, JSON.stringify(notified))
      }

      // Also notify if overdue
      if (timeDiff < 0 && Math.abs(timeDiff) < 86400000 && !notified.includes(`${reminder.id}-overdue`)) {
        this.sendNotification(
          `Échéance dépassée: ${reminder.itemName}`,
          `L'élément "${reminder.itemName}" de la liste "${reminder.listName}" est en retard !`,
          { itemId: reminder.itemId, listId: reminder.listListId }
        )

        notified.push(`${reminder.id}-overdue`)
        localStorage.setItem(notifiedKey, JSON.stringify(notified))
      }
    })
  }

  // Clean up old reminders
  cleanupReminders() {
    const reminders = this.getReminders()
    const now = new Date()
    const oneDayAgo = now.getTime() - 86400000

    const filtered = reminders.filter(r => {
      const dueDate = new Date(r.dueDate).getTime()
      return dueDate > oneDayAgo
    })

    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(filtered))
  }
}

export const notificationService = new NotificationService()

// Hook for using notifications in components
export function initNotifications() {
  return notificationService.init()
}

export function requestNotificationPermission() {
  return notificationService.requestPermission()
}

export function sendNotification(title: string, body: string, data?: any) {
  return notificationService.sendNotification(title, body, data)
}
