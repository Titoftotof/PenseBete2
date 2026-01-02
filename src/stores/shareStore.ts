import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export type SharePermission = 'read' | 'write'

export interface SharedList {
  id: string
  list_id: string
  shared_with_email: string
  shared_with_user_id?: string
  permission: SharePermission
  created_at: string
  list?: {
    name: string
    category: string
    folder_id?: string
  }
}

interface ShareStore {
  shares: SharedList[]
  loading: boolean
  error: string | null

  fetchShares: (listId: string) => Promise<void>
  shareList: (listId: string, email: string, permission: SharePermission) => Promise<SharedList | null>
  updateSharePermission: (shareId: string, permission: SharePermission) => Promise<void>
  removeShare: (shareId: string) => Promise<void>
  fetchSharedWithMe: () => Promise<void>
  sharedWithMe: SharedList[]
}

export const useShareStore = create<ShareStore>((set) => ({
  shares: [],
  sharedWithMe: [],
  loading: false,
  error: null,

  // Fetch shares for a specific list
  fetchShares: async (listId: string) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('shared_lists')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: false })

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ shares: data || [], loading: false })
    }
  },

  // Share a list with someone
  shareList: async (listId: string, email: string, permission: SharePermission) => {
    set({ loading: true, error: null })

    const { data, error } = await supabase
      .from('shared_lists')
      .insert({
        list_id: listId,
        shared_with_email: email.toLowerCase(),
        permission,
      })
      .select()
      .single()

    if (error) {
      set({ error: error.message, loading: false })
      return null
    }

    set((state) => ({
      shares: [data, ...state.shares],
      loading: false,
    }))
    return data
  },

  // Update share permission
  updateSharePermission: async (shareId: string, permission: SharePermission) => {
    set({ error: null })
    const { error } = await supabase
      .from('shared_lists')
      .update({ permission })
      .eq('id', shareId)

    if (error) {
      set({ error: error.message })
    } else {
      set((state) => ({
        shares: state.shares.map((share) =>
          share.id === shareId ? { ...share, permission } : share
        ),
      }))
    }
  },

  // Remove a share
  removeShare: async (shareId: string) => {
    set({ error: null })
    const { error } = await supabase
      .from('shared_lists')
      .delete()
      .eq('id', shareId)

    if (error) {
      set({ error: error.message })
    } else {
      set((state) => ({
        shares: state.shares.filter((share) => share.id !== shareId),
      }))
    }
  },

  // Fetch lists shared with me
  fetchSharedWithMe: async () => {
    set({ loading: true, error: null })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      set({ loading: false })
      return
    }

    const { data, error } = await supabase
      .from('shared_lists')
      .select('*, list:lists(name, category, folder_id)')
      .eq('shared_with_email', user.email.toLowerCase())
      .order('created_at', { ascending: false })

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ sharedWithMe: data || [], loading: false })
    }
  },
}))
