import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { X, Bell } from 'lucide-react'

interface Toast {
  id: string
  title: string
  body: string
  type?: 'info' | 'success' | 'warning' | 'reminder'
}

interface ToastContextType {
  showToast: (title: string, body: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Global toast function for use outside React components
let globalShowToast: ((title: string, body: string, type?: Toast['type']) => void) | null = null

export function showGlobalToast(title: string, body: string, type?: Toast['type']) {
  if (globalShowToast) {
    globalShowToast(title, body, type)
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((title: string, body: string, type: Toast['type'] = 'info') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, title, body, type }])

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 8000)
  }, [])

  // Register global toast function
  useEffect(() => {
    globalShowToast = showToast
    return () => {
      globalShowToast = null
    }
  }, [showToast])

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 w-full max-w-md px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto
              rounded-2xl p-4
              animate-in slide-in-from-top-4 fade-in duration-300
              ${toast.type === 'reminder'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_8px_32px_rgba(168,85,247,0.4)]'
                : 'bg-background border border-border shadow-2xl'}
            `}
          >
            <div className="flex items-start gap-3">
              {toast.type === 'reminder' && (
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0 animate-pulse">
                  <Bell className="h-6 w-6 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-base ${toast.type === 'reminder' ? 'text-white' : ''}`}>
                  {toast.title}
                </p>
                <p className={`text-sm mt-1 ${toast.type === 'reminder' ? 'text-white/90' : 'text-muted-foreground'}`}>
                  {toast.body}
                </p>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className={`p-2 rounded-xl transition-colors flex-shrink-0 ${
                  toast.type === 'reminder'
                    ? 'hover:bg-white/20 text-white'
                    : 'hover:bg-accent'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
