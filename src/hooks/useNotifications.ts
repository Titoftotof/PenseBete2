import { useState, useEffect } from 'react'
import { notificationService, type Reminder } from '@/lib/notifications'

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isEnabled, setIsEnabled] = useState(false)

  useEffect(() => {
    const init = async () => {
      const enabled = await notificationService.init()
      setIsEnabled(enabled)
      setPermission(enabled ? 'granted' : 'default')
    }

    init()

    // Check reminders every minute
    const interval = setInterval(() => {
      notificationService.checkReminders()
    }, 60000)

    // Cleanup old reminders daily
    const cleanupInterval = setInterval(() => {
      notificationService.cleanupReminders()
    }, 86400000)

    return () => {
      clearInterval(interval)
      clearInterval(cleanupInterval)
    }
  }, [])

  const requestPermission = async () => {
    const granted = await notificationService.requestPermission()
    setPermission(granted ? 'granted' : 'denied')
    setIsEnabled(granted)
    return granted
  }

  const sendNotification = (title: string, body: string, data?: any) => {
    notificationService.sendNotification(title, body, data)
  }

  const saveReminder = (reminder: Reminder) => {
    notificationService.saveReminder(reminder)
  }

  const removeReminder = (itemId: string) => {
    notificationService.removeReminder(itemId)
  }

  const getReminders = () => {
    return notificationService.getReminders()
  }

  return {
    permission,
    isEnabled,
    requestPermission,
    sendNotification,
    saveReminder,
    removeReminder,
    getReminders
  }
}
