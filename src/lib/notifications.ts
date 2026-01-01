import { supabase } from './supabase'
import { showGlobalToast } from '@/components/ui/toast'

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

  sendNotification(title: string, body: string) {
    console.log('[Notifications] sendNotification called:', { title, body, isEnabled: this.isEnabled() })

    if (!this.isEnabled()) {
      console.log('[Notifications] Notifications not enabled, not sending')
      return
    }

    // Check if we're in a browser context
    if (typeof window === 'undefined') {
      console.log('[Notifications] Not in browser context')
      return
    }

    // Show in-app toast notification (no system notification to avoid duplicates)
    showGlobalToast(title, body, 'reminder')
    console.log('[Notifications] Toast shown')

    // Also play a sound
    try {
      const audio = new Audio('/notification.mp3')
      audio.volume = 0.5
      audio.play().catch(() => {
        // Ignore audio errors (file might not exist)
      })
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Start periodic check for reminders (every 30 seconds)
   */
  private startReminderCheck() {
    if (this.checkInterval) {
      console.log('[Notifications] Reminder check already running')
      return
    }

    console.log('[Notifications] Starting reminder check interval')
    this.checkReminders() // Initial check
    this.checkInterval = window.setInterval(() => {
      this.checkReminders()
    }, 30000) // Check every 30 seconds for better responsiveness
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
    console.log('[Notifications] Checking reminders...', { isEnabled: this.isEnabled() })

    if (!this.isEnabled()) {
      console.log('[Notifications] Notifications not enabled, skipping check')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('[Notifications] No user logged in, skipping check')
      return
    }

    // Check for reminders that are due now or in the past (not yet sent)
    // We look for reminders from 1 hour ago to 5 minutes in the future
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
    const fiveMinutesFromNow = new Date(Date.now() + 300000).toISOString()

    console.log('[Notifications] Fetching reminders between', oneHourAgo, 'and', fiveMinutesFromNow)

    // Fetch reminders that are due (past or within 5 minutes) and not yet sent
    const { data: reminders, error } = await supabase
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
      .gte('reminder_time', oneHourAgo)
      .lte('reminder_time', fiveMinutesFromNow)

    if (error) {
      console.error('[Notifications] Error fetching reminders:', error)
      return
    }

    console.log('[Notifications] Found reminders:', reminders?.length || 0, reminders)

    if (!reminders || reminders.length === 0) return

    // Get notified reminder IDs from localStorage
    const notifiedKey = 'pensebete-notified-reminders'
    const notified = JSON.parse(localStorage.getItem(notifiedKey) || '[]')

    for (const reminder of reminders as any[]) {
      const reminderId = reminder.id
      const itemName = reminder.list_items?.content || 'Élément'

      // Check if already notified
      if (notified.includes(reminderId)) {
        console.log('[Notifications] Reminder already notified:', reminderId)
        continue
      }

      // Calculate time until/since reminder
      const reminderTime = new Date(reminder.reminder_time)
      const timeDiff = reminderTime.getTime() - Date.now()

      console.log('[Notifications] Processing reminder:', {
        id: reminderId,
        itemName,
        reminderTime: reminder.reminder_time,
        timeDiff,
        isOverdue: timeDiff < 0
      })

      // Send notification for due or overdue reminders
      if (timeDiff <= 60000) { // Due within 1 minute or overdue
        const message = timeDiff < -60000
          ? `Rappel en retard pour "${itemName}" !`
          : `Rappel: "${itemName}" - c'est maintenant !`

        console.log('[Notifications] Sending notification:', message)

        this.sendNotification(
          `🔔 ${itemName}`,
          message
        )

        // Mark as notified locally
        notified.push(reminderId)
        localStorage.setItem(notifiedKey, JSON.stringify(notified))

        // Mark as sent in database
        await supabase
          .from('reminders')
          .update({ is_sent: true })
          .eq('id', reminderId)

        console.log('[Notifications] Marked reminder as sent:', reminderId)
      }
    }

    console.log('[Notifications] Check complete')
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

export function sendNotification(title: string, body: string) {
  return notificationService.sendNotification(title, body)
}
