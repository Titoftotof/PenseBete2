import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { addDays, addWeeks, addMonths, addYears } from 'date-fns'
import type { Reminder } from '@/types'

// Helper to calculate next future occurrence for recurring reminders
function getNextFutureOccurrence(
  reminderTime: Date,
  recurrenceType: 'daily' | 'weekly' | 'monthly' | 'yearly',
  recurrenceInterval: number
): Date {
  const now = new Date()
  let nextTime = reminderTime

  // Keep adding intervals until we're in the future
  while (nextTime <= now) {
    switch (recurrenceType) {
      case 'daily':
        nextTime = addDays(nextTime, recurrenceInterval)
        break
      case 'weekly':
        nextTime = addWeeks(nextTime, recurrenceInterval)
        break
      case 'monthly':
        nextTime = addMonths(nextTime, recurrenceInterval)
        break
      case 'yearly':
        nextTime = addYears(nextTime, recurrenceInterval)
        break
    }
  }

  return nextTime
}

interface ReminderStore {
  reminders: Reminder[]
  loading: boolean
  error: string | null

  fetchReminders: () => Promise<void>
  createReminder: (itemId: string, date: Date, recurrence?: { type: 'daily' | 'weekly' | 'monthly' | 'yearly', interval: number }) => Promise<Reminder | null>
  updateReminder: (reminderId: string, date: Date, recurrence?: { type: 'daily' | 'weekly' | 'monthly' | 'yearly', interval: number } | null) => Promise<void>
  deleteReminder: (reminderId: string) => Promise<void>
  markAsSent: (reminderId: string) => Promise<void>
  getUpcomingReminders: () => Reminder[]
  getReminderByItemId: (itemId: string) => Reminder | null
}

export const useReminderStore = create<ReminderStore>((set, get) => ({
  reminders: [],
  loading: false,
  error: null,

  // Fetch all reminders for current user
  fetchReminders: async () => {
    set({ loading: true, error: null })

    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .order('reminder_time', { ascending: true })

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ reminders: data || [], loading: false })
    }
  },

  // Create a new reminder for an item
  createReminder: async (itemId: string, reminderTime: Date, recurrence) => {
    set({ loading: true, error: null })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      set({ error: 'Non authentifié', loading: false })
      return null
    }

    const { data, error } = await supabase
      .from('reminders')
      .insert({
        user_id: user.id,
        item_id: itemId,
        reminder_time: reminderTime.toISOString(),
        recurrence_type: recurrence?.type || null,
        recurrence_interval: recurrence?.interval || null,
        is_sent: false
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur création rappel:', error)
      set({ error: error.message, loading: false })
      return null
    }

    console.log('Rappel créé:', data)

    set((state) => ({
      reminders: [...state.reminders, data],
      loading: false
    }))
    return data
  },

  // Update reminder time
  updateReminder: async (reminderId: string, reminderTime: Date, recurrence) => {
    set({ loading: true, error: null })

    let finalReminderTime = reminderTime

    // If adding/updating recurrence and the time is in the past, calculate next future occurrence
    if (recurrence?.type && recurrence.type !== 'none') {
      const now = new Date()
      if (reminderTime <= now) {
        finalReminderTime = getNextFutureOccurrence(
          reminderTime,
          recurrence.type as 'daily' | 'weekly' | 'monthly' | 'yearly',
          recurrence.interval || 1
        )
        console.log('[Reminder] Time was in the past, calculated next occurrence:', finalReminderTime.toISOString())
      }
    }

    const updates: any = {
      reminder_time: finalReminderTime.toISOString(),
      is_sent: false,
      sent_at: null
    }

    if (recurrence !== undefined) {
      updates.recurrence_type = recurrence?.type || null
      updates.recurrence_interval = recurrence?.interval || null
    }

    const { error } = await supabase
      .from('reminders')
      .update(updates)
      .eq('id', reminderId)

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set((state) => ({
        reminders: state.reminders.map((reminder) =>
          reminder.id === reminderId
            ? {
              ...reminder,
              ...updates
            }
            : reminder
        ),
        loading: false,
      }))
    }
  },

  // Delete a reminder
  deleteReminder: async (reminderId: string) => {
    set({ loading: true, error: null })

    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', reminderId)

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set((state) => ({
        reminders: state.reminders.filter((reminder) => reminder.id !== reminderId),
        loading: false,
      }))
    }
  },

  // Mark reminder as sent
  markAsSent: async (reminderId: string) => {
    const { error } = await supabase
      .from('reminders')
      .update({ is_sent: true })
      .eq('id', reminderId)

    if (error) {
      set({ error: error.message })
    } else {
      set((state) => ({
        reminders: state.reminders.map((reminder) =>
          reminder.id === reminderId
            ? { ...reminder, is_sent: true }
            : reminder
        ),
      }))
    }
  },

  // Get upcoming reminders (not sent and in the future)
  getUpcomingReminders: () => {
    const { reminders } = get()
    const now = new Date().toISOString()

    return reminders.filter(
      (reminder) => !reminder.is_sent && reminder.reminder_time > now
    )
  },

  // Get reminder by item ID (prioritize unsent)
  getReminderByItemId: (itemId: string) => {
    const { reminders } = get()
    return reminders.find((r) => r.item_id === itemId && !r.is_sent) ||
      reminders.find((r) => r.item_id === itemId) ||
      null
  },
}))

// Real-time subscription for reminders
export function subscribeToReminders() {
  const channel = supabase
    .channel('reminders_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reminders',
      },
      (payload) => {
        const { reminders } = useReminderStore.getState()

        if (payload.eventType === 'INSERT') {
          useReminderStore.setState({ reminders: [...reminders, payload.new as Reminder] })
        } else if (payload.eventType === 'UPDATE') {
          useReminderStore.setState({
            reminders: reminders.map((reminder) =>
              reminder.id === payload.new.id ? (payload.new as Reminder) : reminder
            ),
          })
        } else if (payload.eventType === 'DELETE') {
          useReminderStore.setState({
            reminders: reminders.filter((reminder) => reminder.id !== payload.old.id),
          })
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
