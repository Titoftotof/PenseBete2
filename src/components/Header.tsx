import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { LogOut, Sun, Moon, Monitor, ClipboardList, WifiOff, RotateCw, Calendar, Bell, BellOff, X } from 'lucide-react'
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
  const { isEnabled: notificationsEnabled, requestPermission } = useNotifications()
  const { fetchReminders, getUpcomingReminders, deleteReminder } = useReminderStore()
  const { items } = useListStore()
  const location = useLocation()

  // Fetch reminders on mount
  useEffect(() => {
    fetchReminders()
  }, [fetchReminders])

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
              onClick={() => {
                if (!notificationsEnabled) {
                  requestPermission()
                } else {
                  setShowRemindersMenu(!showRemindersMenu)
                }
              }}
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
              <div className="absolute right-0 top-full mt-2 w-72 glass border border-white/20 rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="p-3 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Rappels à venir</h3>
                    <button
                      onClick={() => setShowRemindersMenu(false)}
                      className="p-1 rounded-lg hover:bg-accent transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {upcomingReminders.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Aucun rappel programmé
                    </div>
                  ) : (
                    upcomingReminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className={`p-3 border-b border-white/10 last:border-b-0 ${
                          isOverdue(reminder.reminder_time) ? 'bg-red-500/10' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {getItemContent(reminder.item_id)}
                            </p>
                            <p className={`text-xs mt-0.5 ${
                              isOverdue(reminder.reminder_time) ? 'text-red-500' : 'text-purple-500'
                            }`}>
                              <Bell className="h-3 w-3 inline mr-1" />
                              {formatReminderDateTime(reminder.reminder_time)}
                              {isOverdue(reminder.reminder_time) && ' (en retard)'}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteReminder(reminder.id)}
                            className="p-1 rounded-lg hover:bg-red-500/20 text-red-500 transition-colors"
                            title="Supprimer le rappel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {!notificationsEnabled && (
                  <div className="p-3 border-t border-white/10 bg-orange-500/10">
                    <button
                      onClick={requestPermission}
                      className="text-xs text-orange-500 hover:underline w-full text-center"
                    >
                      Activer les notifications du navigateur
                    </button>
                  </div>
                )}
              </div>
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
