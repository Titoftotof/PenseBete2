import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { LogOut, Sun, Moon, Monitor, ClipboardList, WifiOff, RotateCw } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSyncStore } from '@/stores/syncStore'

export function Header() {
  const [logoutLoading, setLogoutLoading] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const isOnline = useOnlineStatus()
  const { pendingOperations, isSyncing, setOnlineStatus } = useSyncStore()

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
