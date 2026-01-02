import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { LogOut, Sun, Moon, Monitor, ClipboardList, WifiOff, RotateCw, Calendar, Bell, BellOff, X, AlertCircle } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSyncStore } from '@/stores/syncStore'
import { useNotifications } from '@/hooks/useNotifications'
import { useReminderStore } from '@/stores/reminderStore'
import { useListStore } from '@/stores/listStore'
import { useLocation } from 'react-router-dom'

export function Header() {
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [showRemindersMenu, setShowRemindersMenu] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const isOnline = useOnlineStatus()
  const { pendingOperations, isSyncing, setOnlineStatus } = useSyncStore()
  const { isEnabled: notificationsEnabled, toggleNotifications, errorMessage, clearError, status } = useNotifications()
  const { fetchReminders, getUpcomingReminders, deleteReminder } = useReminderStore()
  const { items, fetchAllItems } = useListStore()
  const location = useLocation()

  // Fetch reminders and items on mount
  useEffect(() => {
    fetchReminders()
    fetchAllItems()
  }, [fetchReminders, fetchAllItems])

  // Get upcoming reminders (not sent)
  const upcomingReminders = getUpcomingReminders()
  const reminderCount = upcomingReminders.length

  // Get item content by ID
  const getItemContent = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    return item?.content || 'Élément inconnu'
  }

  // Format reminder date/time
  const formatReminderDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const dateFormatted = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    const timeFormatted = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    return `${dateFormatted} à ${timeFormatted}`
  }

  // Check if reminder is overdue
  const isOverdue = (dateStr: string) => new Date(dateStr) < new Date()

  // Sync online status with store
  useEffect(() => {
    setOnlineStatus(isOnline)
  }, [isOnline, setOnlineStatus])

  const handleLogout = async () => {
    setLogoutLoading(true)
    await supabase.auth.signOut()
    setLogoutLoading(false)
  }

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-5 w-5" />
      case 'dark':
        return <Moon className="h-5 w-5" />
      default:
        return <Monitor className="h-5 w-5" />
    }
  }

  const pendingCount = pendingOperations.length

  return (
    <header className="glass sticky top-0 z-50 border-b border-white/20">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Pense-Bête
            </h1>
            {/* Offline indicator */}
            {!isOnline && (
              <div className="flex items-center gap-1 text-xs text-orange-500">
                <WifiOff className="h-3 w-3" />
                <span>Hors ligne</span>
              </div>
            )}
            {isOnline && pendingCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-blue-500">
                <RotateCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{pendingCount} en attente</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {location.pathname === '/' && (
            <Link to="/calendar">
              <Button
                variant="glass"
                size="icon"
                title="Calendrier"
                className="rounded-xl"
              >
                <Calendar className="h-5 w-5" />
              </Button>
            </Link>
          )}
          <div className="relative">
            <Button
              variant="glass"
              size="icon"
              onClick={() => setShowRemindersMenu(!showRemindersMenu)}
              title={notificationsEnabled ? `${reminderCount} rappel(s) actif(s)` : 'Activer les notifications'}
              className="rounded-xl"
            >
              {notificationsEnabled ? (
                <Bell className="h-5 w-5 text-green-500" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
            {/* Badge with reminder count */}
            {notificationsEnabled && reminderCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center font-medium">
                {reminderCount > 9 ? '9+' : reminderCount}
              </span>
            )}
            {/* Reminders dropdown menu */}
            {showRemindersMenu && (
              <>
                {/* Backdrop to close menu */}
                <div
                  className="fixed inset-0 z-[60]"
                  onClick={() => setShowRemindersMenu(false)}
                />
                <div className="fixed left-1/2 top-20 -translate-x-1/2 w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)] bg-background border border-border rounded-xl shadow-2xl z-[70] overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-border bg-purple-500/10">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-base flex items-center gap-2">
                        <Bell className="h-4 w-4 text-purple-500" />
                        Rappels à venir
                      </h3>
                      <button
                        onClick={() => setShowRemindersMenu(false)}
                        className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {upcomingReminders.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        Aucun rappel programmé
                      </div>
                    ) : (
                      upcomingReminders.map((reminder) => (
                        <div
                          key={reminder.id}
                          className={`p-4 border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors ${isOverdue(reminder.reminder_time) ? 'bg-red-500/10' : ''
                            }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {getItemContent(reminder.item_id)}
                              </p>
                              <p className={`text-xs mt-1 flex items-center gap-1 ${isOverdue(reminder.reminder_time) ? 'text-red-500 font-medium' : 'text-purple-500'
                                }`}>
                                <Bell className="h-3 w-3" />
                                {formatReminderDateTime(reminder.reminder_time)}
                                {isOverdue(reminder.reminder_time) && ' (en retard)'}
                              </p>
                            </div>
                            <button
                              onClick={() => deleteReminder(reminder.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-500 transition-colors"
                              title="Supprimer le rappel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 border-t border-border bg-muted/30 space-y-2">
                    {/* Error message */}
                    {errorMessage && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs leading-relaxed">{errorMessage}</p>
                          <button
                            onClick={clearError}
                            className="text-xs underline mt-1 opacity-70 hover:opacity-100"
                          >
                            Fermer
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Safari iOS hint */}
                    {status?.isSafariIOS && !status?.isPWA && !notificationsEnabled && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <p className="text-xs leading-relaxed">
                          Sur Safari iOS, ajoutez l'app à l'écran d'accueil pour recevoir les notifications.
                        </p>
                      </div>
                    )}
                    {/* Test button - show if browser permission is granted */}
                    {status?.permission === 'granted' && (
                      <button
                        onClick={() => {
                          // Force send notification even if app notifications are disabled
                          try {
                            new Notification('🔔 Test de notification', {
                              body: 'Les notifications fonctionnent correctement !',
                              icon: '/icon.svg'
                            })
                          } catch (e) {
                            console.error('Erreur notification:', e)
                            alert('Erreur lors de l\'envoi de la notification')
                          }
                        }}
                        className="text-sm w-full text-center py-2.5 px-4 rounded-lg font-medium transition-colors bg-purple-500/15 text-purple-500 hover:bg-purple-500/25"
                      >
                        Tester les notifications
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        const result = await toggleNotifications()
                        if (result.success && notificationsEnabled) {
                          setShowRemindersMenu(false)
                        }
                      }}
                      className={`text-sm w-full text-center py-2.5 px-4 rounded-lg font-medium transition-colors ${notificationsEnabled
                          ? 'bg-red-500/15 text-red-500 hover:bg-red-500/25'
                          : 'bg-green-500/15 text-green-500 hover:bg-green-500/25'
                        }`}
                    >
                      {notificationsEnabled ? 'Désactiver les notifications' : 'Activer les notifications'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          <Button
            variant="glass"
            size="icon"
            onClick={toggleTheme}
            title={`Thème: ${theme}`}
            className="rounded-xl"
          >
            {getThemeIcon()}
          </Button>
          <Button
            variant="glass"
            size="icon"
            onClick={handleLogout}
            disabled={logoutLoading}
            title="Déconnexion"
            className="rounded-xl"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
