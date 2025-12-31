import { useState, useEffect, useCallback } from 'react'
import { notificationService, type NotificationStatus } from '@/lib/notifications'

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isEnabled, setIsEnabled] = useState(false)
  const [status, setStatus] = useState<NotificationStatus | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Update status
  const updateStatus = useCallback(() => {
    const newStatus = notificationService.getStatus()
    setStatus(newStatus)
    return newStatus
  }, [])

  useEffect(() => {
    const init = async () => {
      const enabled = await notificationService.init()
      setIsEnabled(enabled)
      setPermission(enabled ? 'granted' : 'default')
      updateStatus()
    }

    init()

    return () => {
      // Cleanup on unmount
      notificationService.destroy()
    }
  }, [updateStatus])

  const requestPermission = async (): Promise<{ granted: boolean; message: string }> => {
    const result = await notificationService.requestPermission()
    setPermission(result.granted ? 'granted' : 'denied')
    setIsEnabled(result.granted)
    updateStatus()

    if (!result.granted) {
      setErrorMessage(result.message)
    } else {
      setErrorMessage(null)
    }

    return result
  }

  const disableNotifications = () => {
    notificationService.disable()
    setIsEnabled(false)
    setErrorMessage(null)
    updateStatus()
  }

  const enableNotifications = () => {
    notificationService.enable()
    setIsEnabled(notificationService.isEnabled())
    updateStatus()
  }

  const toggleNotifications = async (): Promise<{ success: boolean; message: string }> => {
    if (isEnabled) {
      disableNotifications()
      return { success: true, message: 'Notifications désactivées' }
    } else {
      // Check status first
      const currentStatus = updateStatus()

      if (!currentStatus.supported) {
        setErrorMessage(currentStatus.message)
        return { success: false, message: currentStatus.message }
      }

      if (currentStatus.blocked) {
        setErrorMessage(currentStatus.message)
        return { success: false, message: currentStatus.message }
      }

      // If browser permission is granted, just enable
      if (Notification.permission === 'granted') {
        enableNotifications()
        return { success: true, message: 'Notifications activées !' }
      } else {
        // Otherwise request permission
        const result = await requestPermission()
        return { success: result.granted, message: result.message }
      }
    }
  }

  const sendNotification = (title: string, body: string, data?: any) => {
    notificationService.sendNotification(title, body, data)
  }

  const clearError = () => {
    setErrorMessage(null)
  }

  return {
    permission,
    isEnabled,
    status,
    errorMessage,
    requestPermission,
    disableNotifications,
    enableNotifications,
    toggleNotifications,
    sendNotification,
    clearError
  }
}
