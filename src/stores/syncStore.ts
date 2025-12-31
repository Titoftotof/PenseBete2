import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PendingOperationType = 'create' | 'update' | 'delete'

export type PendingTable = 'lists' | 'list_items' | 'folders' | 'shared_lists'

export interface PendingOperation {
  id: string
  type: PendingOperationType
  table: PendingTable
  data: any
  recordId?: string
  timestamp: number
}

interface SyncStore {
  isOnline: boolean
  pendingOperations: PendingOperation[]
  lastSyncAt: number | null
  isSyncing: boolean

  // Actions
  setOnlineStatus: (status: boolean) => void
  addPendingOperation: (operation: Omit<PendingOperation, 'id' | 'timestamp'>) => void
  removePendingOperation: (id: string) => void
  clearPendingOperations: () => void
  setSyncing: (syncing: boolean) => void
  updateLastSync: () => void
  getPendingOperationsCount: () => number
}

export const useSyncStore = create<SyncStore>()(
  persist(
    (set, get) => ({
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      pendingOperations: [],
      lastSyncAt: null,
      isSyncing: false,

      setOnlineStatus: (status) => set({ isOnline: status }),

      addPendingOperation: (operation) => {
        const newOp: PendingOperation = {
          ...operation,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        }
        set((state) => ({
          pendingOperations: [...state.pendingOperations, newOp],
        }))
      },

      removePendingOperation: (id) =>
        set((state) => ({
          pendingOperations: state.pendingOperations.filter((op) => op.id !== id),
        })),

      clearPendingOperations: () => set({ pendingOperations: [] }),

      setSyncing: (syncing) => set({ isSyncing: syncing }),

      updateLastSync: () => set({ lastSyncAt: Date.now() }),

      getPendingOperationsCount: () => get().pendingOperations.length,
    }),
    {
      name: 'pensebete-sync-storage',
    }
  )
)
