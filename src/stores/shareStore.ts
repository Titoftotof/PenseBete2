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
  list_name?: string
  list_category?: string
  owner_name?: string
  position?: number
}

interface ShareStore {
  shares: SharedList[]
  loading: boolean
  error: string | null

  fetchShares: (listId: string) => Promise<void>
  shareList: (listId: string, email: string, permission: SharePermission, listName: string, listCategory: string) => Promise<SharedList | null>
  updateSharePermission: (shareId: string, permission: SharePermission) => Promise<void>
  removeShare: (shareId: string) => Promise<void>
  fetchSharedWithMe: () => Promise<void>
  sharedWithMe: SharedList[]
  reorderSharedLists: (newLists: SharedList[]) => Promise<void>
  removeSharedList: (shareId: string) => Promise<void>
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
  shareList: async (listId: string, email: string, permission: SharePermission, listName: string, listCategory: string) => {
    set({ loading: true, error: null })

    // Get current user info
    const { data: { user } } = await supabase.auth.getUser()
    const ownerId = user?.id

    // Get display name from user metadata (username or first_name)
    const userMetadata = user?.user_metadata as { first_name?: string; last_name?: string; username?: string } | undefined
    const displayName = userMetadata?.username || userMetadata?.first_name || 'Utilisateur'

    const { data, error } = await supabase
      .from('shared_lists')
      .insert({
        list_id: listId,
        shared_with_email: email.toLowerCase(),
        permission,
        list_name: listName,
        list_category: listCategory,
        owner_id: ownerId,
        owner_name: displayName,
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
      .select('*')
      .eq('shared_with_email', user.email.toLowerCase())
      .order('created_at', { ascending: false })

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ sharedWithMe: data || [], loading: false })
    }
  },

  // Reorder shared lists (for drag and drop)
  reorderSharedLists: async (newLists: SharedList[]) => {
    set({ sharedWithMe: newLists })

    // Update positions in database
    const updates = newLists.map((list, index) => ({
      id: list.id,
      position: index,
    }))

    for (const update of updates) {
      await supabase
        .from('shared_lists')
        .update({ position: update.position })
        .eq('id', update.id)
    }
  },

  // Remove a shared list from the user's view (for the recipient)
  removeSharedList: async (shareId: string) => {
    set({ loading: true, error: null })
    const { error } = await supabase
      .from('shared_lists')
      .delete()
      .eq('id', shareId)

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set((state) => ({
        sharedWithMe: state.sharedWithMe.filter((share) => share.id !== shareId),
        shares: state.shares.filter((share) => share.id !== shareId),
        loading: false,
      }))
    }
  },
}))
