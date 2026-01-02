import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format, isToday, isPast } from 'date-fns'
import { fr } from 'date-fns/locale'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { CalendarView } from '@/components/CalendarView'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, X, CheckCircle, Clock, AlertCircle, ArrowLeft } from 'lucide-react'
import { useListStore } from '@/stores/listStore'
import { useReminderStore } from '@/stores/reminderStore'
import type { ListItem } from '@/types'

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const { items, toggleItemComplete, fetchAllItems } = useListStore()
  const { fetchReminders } = useReminderStore()

  // Fetch reminders and items on mount
  useEffect(() => {
    fetchReminders()
    fetchAllItems()
  }, [fetchReminders, fetchAllItems])

  // Get all items with due dates
  const itemsWithDueDates = useMemo(() => {
    return items.filter(item => item.due_date !== undefined)
  }, [items])

  // Get items for selected date
  const selectedDateItems = useMemo(() => {
    if (!selectedDate) return []

    return itemsWithDueDates.filter(item => {
      const dueDate = new Date(item.due_date!)
      return dueDate.toDateString() === selectedDate.toDateString()
    })
  }, [selectedDate, itemsWithDueDates])

  // Get upcoming items (sorted by date)
  const upcomingItems = useMemo(() => {
    return itemsWithDueDates
      .filter(item => !item.is_completed && new Date(item.due_date!) >= new Date())
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 5)
  }, [itemsWithDueDates])

  // Get overdue items
  const overdueItems = useMemo(() => {
    const now = new Date()
    return itemsWithDueDates
      .filter(item => !item.is_completed && new Date(item.due_date!) < now)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
  }, [itemsWithDueDates])

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
  }

  const getItemStatus = (item: ListItem) => {
    if (item.is_completed) return 'completed'
    if (item.due_date && isPast(new Date(item.due_date))) return 'overdue'
    return 'upcoming'
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="glass" size="icon" className="rounded-xl">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <CalendarIcon className="h-6 w-6 text-purple-500" />
            <h1 className="text-2xl font-bold">Calendrier</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 space-y-4">
        {/* Calendar */}
        <CalendarView
          items={itemsWithDueDates}
          onDateSelect={handleDateSelect}
          selectedDate={selectedDate}
        />

        {/* Selected date items */}
        {selectedDate && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {isToday(selectedDate) && "Aujourd'hui - "}
                {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(null)}
                className="rounded-xl"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {selectedDateItems.length === 0 ? (
              <GlassCard hover={false}>
                <GlassCardContent className="p-6 text-center text-muted-foreground">
                  Aucune tâche prévue pour ce jour
                </GlassCardContent>
              </GlassCard>
            ) : (
              <div className="space-y-2">
                {selectedDateItems.map((item) => (
                  <GlassCard key={item.id} hover={false} className={`
                    ${getItemStatus(item) === 'overdue' ? 'border-red-500/50 bg-red-500/10' : ''}
                    ${getItemStatus(item) === 'completed' ? 'opacity-50' : ''}
                  `}>
                    <GlassCardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleItemComplete(item.id)}
                          className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all ${item.is_completed
                              ? 'border-green-500 bg-green-500'
                              : 'border-border hover:border-green-500'
                            }`}
                        >
                          {item.is_completed && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                            {item.content}
                          </p>
                          {item.due_date && (
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(item.due_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                    </GlassCardContent>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Overdue items */}
        {overdueItems.length > 0 && !selectedDate && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              En retard ({overdueItems.length})
            </h2>
            <div className="space-y-2">
              {overdueItems.map((item) => (
                <GlassCard key={item.id} hover={false} className="border-red-500/50 bg-red-500/10">
                  <GlassCardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleItemComplete(item.id)}
                        className="h-6 w-6 rounded-lg border-2 border-red-500 flex items-center justify-center hover:bg-red-500 transition-all"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-red-500" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.content}</p>
                        <p className="text-xs text-red-500 mt-0.5">
                          {format(new Date(item.due_date!), 'PPp', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  </GlassCardContent>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming items */}
        {upcomingItems.length > 0 && !selectedDate && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
              <Clock className="h-5 w-5" />
              À venir ({upcomingItems.length})
            </h2>
            <div className="space-y-2">
              {upcomingItems.map((item) => (
                <GlassCard key={item.id} hover={false}>
                  <GlassCardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleItemComplete(item.id)}
                        className="h-6 w-6 rounded-lg border-2 border-border flex items-center justify-center hover:border-green-500 transition-all"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{item.content}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(item.due_date!), 'PPp', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  </GlassCardContent>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {itemsWithDueDates.length === 0 && (
          <GlassCard hover={false} className="border-dashed border-2">
            <GlassCardContent className="p-8 text-center">
              <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Aucune échéance planifiée</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ajoutez des dates de rappel à vos éléments pour les voir ici
              </p>
            </GlassCardContent>
          </GlassCard>
        )}
      </div>
    </div>
  )
}
