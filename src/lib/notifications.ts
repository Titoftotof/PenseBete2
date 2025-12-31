import { supabase } from './supabase'

const NOTIFICATIONS_ENABLED_KEY = 'pensebete-notifications-enabled'

export type NotificationStatus = {
  supported: boolean
  isPWA: boolean
  isSafariIOS: boolean
  permission: NotificationPermission
  blocked: boolean
  message: string
}

class NotificationService {
  private permission: NotificationPermission = 'default'
  private checkInterval: number | null = null

  /**
   * Check if we're running as a PWA (installed on home screen)
   */
  isPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true
  }

  /**
   * Check if we're on Safari iOS
   */
  isSafariIOS(): boolean {
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua)
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|Chrome/.test(ua)
    return isIOS && isSafari
  }

  /**
   * Get current notification status with helpful message
   */
  getStatus(): NotificationStatus {
    const supported = 'Notification' in window
    const isPWA = this.isPWA()
    const isSafariIOS = this.isSafariIOS()
    const permission = supported ? Notification.permission : 'denied'
    const blocked = permission === 'denied'

    let message = ''

    if (!supported) {
      if (isSafariIOS && !isPWA) {
        message = "Pour recevoir des notifications sur Safari iOS, ajoutez l'application à votre écran d'accueil puis ouvrez-la depuis là."
      } else {
        message = "Votre navigateur ne supporte pas les notifications."
      }
    } else if (blocked) {
      message = "Les notifications sont bloquées. Réinitialisez les permissions dans les paramètres du site."
    } else if (permission === 'granted') {
      message = "Les notifications sont activées."
    } else {
      message = "Cliquez pour activer les notifications."
    }

    return { supported, isPWA, isSafariIOS, permission, blocked, message }
  }

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

    // Also sync with browser permission
    if (Notification.permission === 'granted') {
      this.permission = 'granted'
    }

    // Start checking for reminders periodically
    this.startReminderCheck()

    return this.permission === 'granted'
  }

  async requestPermission(): Promise<{ granted: boolean; message: string }> {
    const status = this.getStatus()

    if (!status.supported) {
      return { granted: false, message: status.message }
    }

    if (status.blocked) {
      return { granted: false, message: status.message }
    }

    if (this.permission === 'granted') {
      return { granted: true, message: 'Notifications activées !' }
    }

    try {
      const result = await Notification.requestPermission()
      this.permission = result

      if (result === 'granted') {
        localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'granted')
        this.startReminderCheck()
        return { granted: true, message: 'Notifications activées !' }
      } else if (result === 'denied') {
        localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, result)
        return { granted: false, message: 'Les notifications ont été refusées. Vous pouvez les réactiver dans les paramètres du site.' }
      } else {
        return { granted: false, message: 'Demande de permission ignorée.' }
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error)
      return { granted: false, message: 'Erreur lors de la demande de permission.' }
    }
  }

  isEnabled(): boolean {
    const saved = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY)
    if (saved === 'disabled') return false
    return this.permission === 'granted' || saved === 'granted'
  }

  disable(): void {
    this.permission = 'default'
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'disabled')
    this.stopReminderCheck()
  }

  enable(): void {
    if (Notification.permission === 'granted') {
      this.permission = 'granted'
      localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'granted')
      this.startReminderCheck()
    }
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
        data
      } as NotificationOptions)
    }
  }

  /**
   * Start periodic check for reminders (every minute)
   */
  private startReminderCheck() {
    if (this.checkInterval) return

    this.checkReminders() // Initial check
    this.checkInterval = window.setInterval(() => {
      this.checkReminders()
    }, 60000) // Check every minute
  }

  /**
   * Stop periodic check for reminders
   */
  private stopReminderCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  /**
   * Check for due reminders from Supabase
   */
  async checkReminders() {
    if (!this.isEnabled()) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date().toISOString()
    const oneHourFromNow = new Date(Date.now() + 3600000).toISOString()

    // Fetch reminders that are due within the next hour and not yet sent
    const { data: reminders } = await supabase
      .from('reminders')
      .select(`
        *,
        list_items (
          content,
          lists (
            name
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('is_sent', false)
      .gte('reminder_time', now)
      .lte('reminder_time', oneHourFromNow)

    if (!reminders) return

    // Get notified reminder IDs from localStorage
    const notifiedKey = 'pensebete-notified-reminders'
    const notified = JSON.parse(localStorage.getItem(notifiedKey) || '[]')

    for (const reminder of reminders as any[]) {
      const reminderId = reminder.id
      const itemName = reminder.list_items?.content || 'Élément'
      const listName = reminder.list_items?.lists?.name || 'Liste'

      // Check if already notified
      if (notified.includes(reminderId)) continue

      // Calculate time until reminder
      const reminderTime = new Date(reminder.reminder_time)
      const timeDiff = reminderTime.getTime() - Date.now()

      // Send notification
      if (timeDiff <= 60000) {
        // Due within 1 minute - send now
        this.sendNotification(
          `Rappel: ${itemName}`,
          `Élément "${itemName}" de la liste "${listName}" est à échéance maintenant !`,
          { itemId: reminder.item_id }
        )
      } else {
        // Due within the hour
        this.sendNotification(
          `Rappel: ${itemName}`,
          `Élément "${itemName}" de la liste "${listName}" à échéance dans ${Math.ceil(timeDiff / 60000)} minutes`,
          { itemId: reminder.item_id }
        )
      }

      // Mark as notified locally
      notified.push(reminderId)
      localStorage.setItem(notifiedKey, JSON.stringify(notified))

      // Mark as sent in database
      await supabase
        .from('reminders')
        .update({ is_sent: true })
        .eq('id', reminderId)
    }

    // Also check for overdue reminders
    const { data: overdueReminders } = await supabase
      .from('reminders')
      .select(`
        *,
        list_items (
          content,
          lists (
            name
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('is_sent', false)
      .lt('reminder_time', now)

    if (overdueReminders) {
      for (const reminder of overdueReminders as any[]) {
        const overdueKey = `${reminder.id}-overdue`
        if (notified.includes(overdueKey)) continue

        const itemName = reminder.list_items?.content || 'Élément'
        const listName = reminder.list_items?.lists?.name || 'Liste'

        this.sendNotification(
          `Échéance dépassée: ${itemName}`,
          `L'élément "${itemName}" de la liste "${listName}" est en retard !`,
          { itemId: reminder.item_id }
        )

        notified.push(overdueKey)
        localStorage.setItem(notifiedKey, JSON.stringify(notified))
      }
    }
  }

  /**
   * Clean up old notified reminders from localStorage
   */
  cleanupNotifiedReminders() {
    const notifiedKey = 'pensebete-notified-reminders'
    const notified = JSON.parse(localStorage.getItem(notifiedKey) || '[]')

    // Note: We can't easily filter by time without storing timestamps
    // For now, just limit the array size
    if (notified.length > 100) {
      localStorage.setItem(notifiedKey, JSON.stringify(notified.slice(-50)))
    }
  }

  /**
   * Destroy the notification service
   */
  destroy() {
    this.stopReminderCheck()
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
