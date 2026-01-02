import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, isBefore } from 'date-fns'
import { fr } from 'date-fns/locale'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'

interface DateTimePickerProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (date: Date) => void
  onDelete?: () => void
  initialDate?: Date
}

const QUICK_OPTIONS = [
  { label: 'Dans 5 min', minutes: 5 },
  { label: 'Dans 1h', hours: 1 },
  { label: 'Dans 2h', hours: 2 },
  { label: 'Dans 4h', hours: 4 },
  { label: 'Demain 9h', hours: 24, hourOfDay: 9 },
  { label: 'Demain 18h', hours: 24, hourOfDay: 18 },
  { label: 'Semaine prochaine 9h', days: 7, hourOfDay: 9 },
]

const WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export function DateTimePicker({ isOpen, onClose, onConfirm, onDelete, initialDate }: DateTimePickerProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (initialDate) return new Date(initialDate)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    return tomorrow
  })

  const [selectedTime, setSelectedTime] = useState<string>(() => {
    if (initialDate) {
      const d = new Date(initialDate)
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    }
    return '09:00'
  })

  useEffect(() => {
    if (isOpen && initialDate) {
      setSelectedDate(new Date(initialDate))
      setCurrentMonth(new Date(initialDate))
      const d = new Date(initialDate)
      setSelectedTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`)
    } else if (isOpen) {
      setCurrentMonth(new Date())
    }
  }, [isOpen, initialDate])

  if (!isOpen) return null

  const handleQuickOption = (option: typeof QUICK_OPTIONS[0]) => {
    const now = new Date()
    const result = new Date()

    if (option.days) {
      result.setDate(now.getDate() + option.days)
    } else if (option.hours) {
      result.setTime(now.getTime() + option.hours * 60 * 60 * 1000)
    } else if ((option as any).minutes) {
      result.setTime(now.getTime() + (option as any).minutes * 60 * 1000)
    }

    if (option.hourOfDay !== undefined) {
      result.setHours(option.hourOfDay, 0, 0, 0)
    }

    setSelectedDate(result)
    setCurrentMonth(result)
    setSelectedTime(`${result.getHours().toString().padStart(2, '0')}:${result.getMinutes().toString().padStart(2, '0')}`)
  }

  const handleConfirm = () => {
    const [hours, minutes] = selectedTime.split(':').map(Number)
    const result = new Date(selectedDate)
    result.setHours(hours, minutes, 0, 0)
    onConfirm(result)
  }

  const formatDateLong = (date: Date): string => {
    return format(date, 'EEEE d MMMM yyyy', { locale: fr })
  }

  // Calendar logic
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  const handleDateSelect = (date: Date) => {
    if (!isBefore(date, today)) {
      setSelectedDate(date)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[55] flex items-center justify-center p-4 pb-24 pb-safe md:pb-4">
      <GlassCard className="max-w-md w-full max-h-[90vh] overflow-y-auto">
        <GlassCardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              Définir un rappel
            </h3>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Quick options */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Options rapides</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_OPTIONS.map((option) => (
                <Button
                  key={option.label}
                  variant="glass"
                  size="sm"
                  onClick={() => handleQuickOption(option)}
                  className="rounded-xl text-sm"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Mini Calendar */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Choisir la date</p>
            <div className="glass rounded-xl p-3 border border-white/10">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-3">
                <Button variant="ghost" size="icon" onClick={previousMonth} className="rounded-lg h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                </span>
                <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-lg h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Week day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEK_DAYS.map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date) => {
                  const isCurrentMonth = isSameMonth(date, currentMonth)
                  const isSelected = isSameDay(date, selectedDate)
                  const isTodayDate = isToday(date)
                  const isPast = isBefore(date, today)

                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => handleDateSelect(date)}
                      disabled={isPast}
                      className={`
                        aspect-square rounded-lg text-sm transition-all duration-200 flex items-center justify-center
                        ${!isCurrentMonth ? 'opacity-30' : ''}
                        ${isPast ? 'opacity-30 cursor-not-allowed' : 'hover:bg-accent'}
                        ${isSelected ? 'bg-purple-500 text-white hover:bg-purple-600' : ''}
                        ${isTodayDate && !isSelected ? 'border-2 border-purple-500' : ''}
                      `}
                    >
                      {format(date, 'd')}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Time selection */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Choisir l'heure
            </p>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full px-4 py-2 rounded-xl glass-input border border-border bg-background"
            />
          </div>

          {/* Preview */}
          <div className="mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
            <p className="text-sm text-center text-muted-foreground">
              Rappel prévu pour :
            </p>
            <p className="text-base font-semibold text-center mt-1 capitalize">
              {formatDateLong(selectedDate)} à {selectedTime}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {initialDate && onDelete && (
              <Button
                variant="outline"
                onClick={onDelete}
                className="rounded-xl text-red-500 border-red-500/30 hover:bg-red-500/10"
                title="Supprimer le rappel"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl"
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              Confirmer
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
