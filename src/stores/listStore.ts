import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { List, ListItem, ListCategory } from '@/types'

interface ListStore {
  lists: List[]
  currentList: List | null
  items: ListItem[]        // Items for the current list (used by ListDetail)
  allItems: ListItem[]     // All items across all lists (used by Dashboard for counters)
  loading: boolean
  error: string | null

  // Lists
  fetchLists: () => Promise<void>
  fetchListsByCategory: (category: ListCategory) => Promise<void>
  createList: (name: string, category: ListCategory) => Promise<List | null>
  updateList: (id: string, updates: Partial<Pick<List, 'name' | 'category' | 'folder_id' | 'position'>>) => Promise<void>
  deleteList: (id: string) => Promise<void>
  reorderLists: (lists: List[]) => Promise<void>
  setCurrentList: (list: List | null) => void

  // Items
  fetchItems: (listId: string) => Promise<void>
  fetchAllItems: () => Promise<void>
  createItem: (listId: string, content: string, dueDate?: string | null) => Promise<ListItem | null>
  updateItem: (id: string, updates: Partial<Pick<ListItem, 'content' | 'is_completed' | 'is_archived' | 'position' | 'priority' | 'due_date' | 'grocery_category'>>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  toggleItemComplete: (id: string) => Promise<void>
  archiveItem: (id: string) => Promise<void>
  unarchiveItem: (id: string) => Promise<void>
  reorderItems: (items: ListItem[]) => Promise<void>
}

export const useListStore = create<ListStore>((set, get) => ({
  lists: [],
  currentList: null,
  items: [],      // Current list items (for ListDetail)
  allItems: [],   // All items (for Dashboard counters)
  loading: false,
  error: null,

  // Fetch all lists for current user
  fetchLists: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('lists')
      .select('*')
      .order('position', { ascending: true })

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ lists: data || [], loading: false })
    }
  },

  // Fetch lists by category
  fetchListsByCategory: async (category: ListCategory) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('lists')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false })

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ lists: data || [], loading: false })
    }
  },

  // Create a new list
  createList: async (name: string, category: ListCategory) => {
    set({ loading: true, error: null })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      set({ error: 'Non authentifié', loading: false })
      return null
    }

    // Get the max position
    const { lists } = get()
    const maxPosition = lists.length > 0 ? Math.max(...lists.map(l => l.position)) + 1 : 0

    const { data, error } = await supabase
      .from('lists')
      .insert({ name, category, user_id: user.id, position: maxPosition })
      .select()
      .single()

    if (error) {
      set({ error: error.message, loading: false })
      return null
    }

    set((state) => ({
      lists: [...state.lists, data],
      loading: false
    }))
    return data
  },

  // Update a list
  updateList: async (id: string, updates) => {
    set({ loading: true, error: null })
    const { error } = await supabase
      .from('lists')
      .update(updates)
      .eq('id', id)

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set((state) => ({
        lists: state.lists.map((list) =>
          list.id === id ? { ...list, ...updates } : list
        ),
        currentList: state.currentList?.id === id
          ? { ...state.currentList, ...updates }
          : state.currentList,
        loading: false,
      }))
    }
  },

  // Delete a list
  deleteList: async (id: string) => {
    set({ loading: true, error: null })
    const { error } = await supabase
      .from('lists')
      .delete()
      .eq('id', id)

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set((state) => ({
        lists: state.lists.filter((list) => list.id !== id),
        currentList: state.currentList?.id === id ? null : state.currentList,
        loading: false,
      }))
    }
  },

  setCurrentList: (list) => set({ currentList: list }),

  // Reorder lists (for drag and drop)
  reorderLists: async (newLists: List[]) => {
    set({ lists: newLists })

    // Update positions in database
    const updates = newLists.map((list, index) => ({
      id: list.id,
      position: index,
    }))

    for (const update of updates) {
      await supabase
        .from('lists')
        .update({ position: update.position })
        .eq('id', update.id)
    }
  },

  // Fetch items for a list
  fetchItems: async (listId: string) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('list_items')
      .select('*')
      .eq('list_id', listId)
      .order('position', { ascending: true })

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ items: data || [], loading: false })
    }
  },

  // Fetch all items (for dashboard counters)
  fetchAllItems: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('list_items')
      .select('*')
      .order('position', { ascending: true })

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ allItems: data || [], loading: false })
    }
  },

  // Create a new item
  createItem: async (listId: string, content: string, dueDate?: string | null) => {
    set({ loading: true, error: null })

    // Get the max position from current list items
    const { items } = get()
    const maxPosition = items.length > 0
      ? Math.max(...items.map(i => i.position)) + 1
      : 0

    const { data, error } = await supabase
      .from('list_items')
      .insert({ list_id: listId, content, position: maxPosition, due_date: dueDate })
      .select()
      .single()

    if (error) {
      set({ error: error.message, loading: false })
      return null
    }

    set((state) => ({
      items: [...state.items, data],      // Add to current list items
      allItems: [...state.allItems, data], // Add to all items
      loading: false
    }))
    return data
  },

  // Update an item
  updateItem: async (id: string, updates) => {
    set({ error: null })
    const { error } = await supabase
      .from('list_items')
      .update(updates)
      .eq('id', id)

    if (error) {
      set({ error: error.message })
    } else {
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
        allItems: state.allItems.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      }))
    }
  },

  // Delete an item
  deleteItem: async (id: string) => {
    set({ error: null })
    const { error } = await supabase
      .from('list_items')
      .delete()
      .eq('id', id)

    if (error) {
      set({ error: error.message })
    } else {
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        allItems: state.allItems.filter((item) => item.id !== id),
      }))
    }
  },

  // Toggle item completion
  toggleItemComplete: async (id: string) => {
    const { items } = get()
    const item = items.find((i) => i.id === id)
    if (!item) return

    await get().updateItem(id, { is_completed: !item.is_completed })
  },

  // Archive an item
  archiveItem: async (id: string) => {
    await get().updateItem(id, { is_archived: true })
  },

  // Unarchive an item
  unarchiveItem: async (id: string) => {
    await get().updateItem(id, { is_archived: false })
  },

  // Reorder items (for drag and drop)
  reorderItems: async (newItems: ListItem[]) => {
    set({ items: newItems })

    // Update positions in database
    const updates = newItems.map((item, index) => ({
      id: item.id,
      position: index,
    }))

    for (const update of updates) {
      await supabase
        .from('list_items')
        .update({ position: update.position })
        .eq('id', update.id)
    }
  },
}))
