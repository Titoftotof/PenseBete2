import { useEffect, useState, useRef, useCallback } from 'react'
import { addDays, endOfDay, setHours, setMinutes } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { SwipeableItem } from '@/components/SwipeableItem'
import { FrequentItemsSuggestions } from '@/components/FrequentItemsSuggestions'
import { VoiceInputButton } from '@/components/VoiceInputButton'
import { DateTimePicker } from '@/components/DateTimePicker'
import { ArrowLeft, Plus, Trash2, Check, GripVertical, Flag, Archive, Undo, Layers, List as ListIcon, Bell, BellOff, Calendar, Users } from 'lucide-react'
import { useListStore } from '@/stores/listStore'
import { useShareStore } from '@/stores/shareStore'
import { useFrequentItemsStore } from '@/stores/frequentItemsStore'
import { useReminderStore } from '@/stores/reminderStore'
import { useSettingsStore, type DefaultDeadlineRule } from '@/stores/settingsStore'
import { parseVoiceInputWithPriorities } from '@/lib/voiceParser'
import { categorizeItem, getCategoryColor } from '@/lib/categorizer'
import { supabase } from '@/lib/supabase'
import type { List, ListItem, Priority, Reminder } from '@/types'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ListDetailProps {
  list: List
  onBack: () => void
}

interface SortableItemProps {
  item: ListItem
  reminder: Reminder | null
  onToggle: () => void
  onDelete: () => void
  onUpdatePriority: (priority: Priority) => void
  onSetReminder: () => void
  onUpdateContent: (content: string) => void
}

const PRIORITY_CONFIG: Record<Priority, { color: string; label: string }> = {
  low: { color: 'text-gray-400', label: 'Basse' },
  normal: { color: 'text-blue-500', label: 'Normale' },
  high: { color: 'text-orange-500', label: 'Haute' },
  urgent: { color: 'text-red-500', label: 'Urgente' },
}

const PRIORITIES: Priority[] = ['low', 'normal', 'high', 'urgent']

function SortableItem({ item, reminder, onToggle, onDelete, onUpdatePriority, onSetReminder, onUpdateContent }: SortableItemProps) {
  const [showPriorityMenu, setShowPriorityMenu] = useState(false)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [item.content])

  const priority = item.priority || 'normal'
  const priorityConfig = PRIORITY_CONFIG[priority]

  // Use reminder time if available, otherwise fall back to due_date
  const reminderTime = reminder?.reminder_time || item.due_date
  const isOverdue = reminderTime && new Date(reminderTime) < new Date() && !item.is_completed

  // Format date and time
  const formatReminderDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const dateFormatted = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    const timeFormatted = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    return `${dateFormatted} à ${timeFormatted}`
  }

  const itemContent = (
    <GlassCard className={`group overflow-visible ${isOverdue ? 'border-red-500/50 bg-red-500/10' : ''}`} hover={false}>
      <GlassCardContent className="flex items-center gap-3 p-3">
        <button
          {...attributes}
          {...listeners}
          data-no-swipe="true"
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={onToggle}
          data-no-swipe="true"
          className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${item.is_completed
            ? 'border-primary bg-primary'
            : 'border-border hover:border-primary hover:bg-primary/10'
            }`}
        >
          {item.is_completed && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
        </button>
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={item.content}
            onChange={(e) => onUpdateContent(e.target.value)}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${target.scrollHeight}px`;
            }}
            rows={1}
            className={`block w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none overflow-hidden whitespace-pre-wrap break-words p-0 ${item.is_completed ? 'line-through opacity-60' : ''}`}
            data-no-swipe={isFocused ? "true" : undefined}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {reminderTime && (
            <span className={`text-xs flex items-center gap-1 mt-0.5 ${isOverdue ? 'text-red-500' : reminder?.reminder_time ? 'text-purple-500' : 'text-blue-500'}`}>
              {reminder?.reminder_time ? <Bell className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
              {formatReminderDateTime(reminderTime)}
            </span>
          )}
        </div>

        {/* Priority indicator */}
        <div className="relative" data-no-swipe="true">
          <button
            onClick={() => setShowPriorityMenu(!showPriorityMenu)}
            className={`p-2 rounded-xl hover:bg-accent transition-colors ${priorityConfig.color}`}
            title={`Priorité: ${priorityConfig.label}`}
          >
            <Flag className="h-4 w-4" fill={priority !== 'low' ? 'currentColor' : 'none'} />
          </button>
          {showPriorityMenu && (
            <div className="absolute right-0 top-full mt-1 glass border border-white/20 rounded-xl shadow-lg z-50 py-1 min-w-[140px] overflow-hidden">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    onUpdatePriority(p)
                    setShowPriorityMenu(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-white/20 dark:hover:bg-slate-800/50 flex items-center gap-2 transition-colors ${p === priority ? 'bg-accent' : ''
                    }`}
                >
                  <Flag className={`h-3.5 w-3.5 ${PRIORITY_CONFIG[p].color}`} fill={p !== 'low' ? 'currentColor' : 'none'} />
                  {PRIORITY_CONFIG[p].label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reminder button */}
        <div data-no-swipe="true">
          {reminderTime ? (
            <button
              onClick={onSetReminder}
              className={`p-2 rounded-xl hover:bg-accent transition-colors ${reminder?.reminder_time ? 'text-purple-500' : 'text-blue-500'}`}
              title={reminder?.reminder_time ? `Modifier le rappel (${formatReminderDateTime(reminderTime)})` : `Modifier l'échéance (${formatReminderDateTime(reminderTime)})`}
            >
              {reminder?.reminder_time ? <Bell className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
            </button>
          ) : (
            <button
              onClick={onSetReminder}
              className="p-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground"
              title="Ajouter une échéance ou un rappel"
            >
              <BellOff className="h-4 w-4" />
            </button>
          )}
        </div>
      </GlassCardContent>
    </GlassCard>
  )

  return (
    <div ref={setNodeRef} style={style} className={showPriorityMenu ? 'relative z-50' : ''}>
      <SwipeableItem
        onDelete={onDelete}
        onComplete={onToggle}
        disabled={isDragging}
        allowOverflow={true}
      >
        {itemContent}
      </SwipeableItem>
    </div>
  )
}

export function ListDetail({ list, onBack }: ListDetailProps) {
  const [newItemContent, setNewItemContent] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [groupedByCategory, setGroupedByCategory] = useState(false)
  const [parsedVoiceItems, setParsedVoiceItems] = useState<Array<{ content: string; priority: Priority }> | null>(null)
  const [reminderPickerItem, setReminderPickerItem] = useState<ListItem | null>(null)
  const [listName, setListName] = useState(list.name)
  const [sharedInfo, setSharedInfo] = useState<{ owner_name?: string; permission?: string } | null>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const { items, fetchItems, createItem, toggleItemComplete, deleteItem, updateItem, reorderItems, archiveItem, unarchiveItem, loading } = useListStore()
  const { sharedWithMe } = useShareStore()
  const { trackItem } = useFrequentItemsStore()
  const { createReminder, getReminderByItemId, deleteReminder, updateReminder, fetchReminders } = useReminderStore()
  const { defaultDeadlineRule } = useSettingsStore()

  const calculateDefaultDeadline = useCallback((rule: DefaultDeadlineRule): string | null => {
    const now = new Date()
    switch (rule) {
      case 'tomorrow_9am':
        return setMinutes(setHours(addDays(now, 1), 9), 0).toISOString()
      case 'end_of_day':
        return endOfDay(now).toISOString()
      case 'plus_7_days':
        return addDays(now, 7).toISOString()
      case 'none':
      default:
        return null
    }
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchItems(list.id)
    fetchReminders()
  }, [list.id, fetchItems, fetchReminders])

  // Sync local state when list prop changes (e.g., navigating to a different list)
  useEffect(() => {
    setListName(list.name)
  }, [list.id, list.name])

  // Check if list is shared and get sharing info
  useEffect(() => {
    const checkIfShared = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // If list.user_id is different from current user, it's a shared list
      if (list.user_id && list.user_id !== user.id) {
        // Find in sharedWithMe
        const share = sharedWithMe.find(s => s.list_id === list.id)
        if (share) {
          setSharedInfo({
            owner_name: share.owner_name,
            permission: share.permission
          })
        }
      } else {
        setSharedInfo(null)
      }
    }

    checkIfShared()
  }, [list.id, list.user_id, sharedWithMe])

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto'
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`
    }
  }, [list.name])

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemContent.trim()) return

    const content = newItemContent.trim()
    const dueDate = calculateDefaultDeadline(defaultDeadlineRule)
    await createItem(list.id, content, dueDate)
    await trackItem(content)
    setNewItemContent('')
  }

  const handleSelectFrequentItem = (content: string) => {
    setNewItemContent(content)
  }

  const handleVoiceResult = (text: string) => {
    const parsed = parseVoiceInputWithPriorities(text)
    if (parsed.length > 0) {
      setParsedVoiceItems(parsed)
    } else {
      // Single item, add directly
      setNewItemContent(text)
    }
  }

  const handleConfirmVoiceItems = async () => {
    if (!parsedVoiceItems) return

    for (const item of parsedVoiceItems) {
      const dueDate = calculateDefaultDeadline(defaultDeadlineRule)
      await createItem(list.id, item.content, dueDate)
      await trackItem(item.content)

      // Set priority if not normal
      if (item.priority !== 'normal') {
        // Need to get the created item first - this is a simplified approach
        // In production, you'd want to return the created item from createItem
      }
    }

    setParsedVoiceItems(null)
  }

  const handleCancelVoiceItems = () => {
    setParsedVoiceItems(null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)
      const newItems = arrayMove(items, oldIndex, newIndex)
      reorderItems(newItems)
    }
  }

  const handleUpdatePriority = (itemId: string, priority: Priority) => {
    updateItem(itemId, { priority })
  }

  // Reminder handlers
  const handleSetReminder = (item: ListItem) => {
    setReminderPickerItem(item)
  }

  const handleReminderConfirm = async (date: Date, recurrence?: { type: 'daily' | 'weekly' | 'monthly' | 'yearly', interval: number }, isReminderEnabled?: boolean) => {
    if (!reminderPickerItem) return

    const existingReminder = getReminderByItemId(reminderPickerItem.id)

    if (isReminderEnabled) {
      if (existingReminder) {
        // Update existing reminder
        await updateReminder(existingReminder.id, date, recurrence)
      } else {
        // Create new reminder
        await createReminder(reminderPickerItem.id, date, recurrence)
      }
    } else if (existingReminder) {
      // Delete reminder if it was disabled
      await deleteReminder(existingReminder.id)
    }

    // Always update the item's due_date
    await updateItem(reminderPickerItem.id, { due_date: date.toISOString() })
    setReminderPickerItem(null)
  }

  const handleRemoveReminder = async (item: ListItem) => {
    const existingReminder = getReminderByItemId(item.id)
    if (existingReminder) {
      await deleteReminder(existingReminder.id)
    }
    await updateItem(item.id, { due_date: null })
  }

  // Auto-categorize items without category (local only, not saved to DB)
  // Note: grocery_category column needs to be added to Supabase before enabling DB persistence
  const categorizedItems = items.map((item) => {
    if (!item.is_completed && !item.is_archived && !item.grocery_category) {
      const categorized = categorizeItem(item.content)
      if (categorized.category !== 'Autres') {
        return { ...item, grocery_category: categorized.category as any }
      }
    }
    return item
  })

  // Sort items: urgent first, then by priority, then by position
  const sortedPendingItems = categorizedItems
    .filter((item) => !item.is_completed && !item.is_archived)
    .sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 }
      const aPriority = priorityOrder[a.priority || 'normal']
      const bPriority = priorityOrder[b.priority || 'normal']
      if (aPriority !== bPriority) return aPriority - bPriority
      return a.position - b.position
    })

  // Group items by category when category view is enabled
  const itemsByCategory = sortedPendingItems.reduce((acc, item) => {
    const category = item.grocery_category || 'Autres'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, typeof sortedPendingItems>)

  const completedItems = categorizedItems.filter((item) => item.is_completed && !item.is_archived)
  const archivedItems = categorizedItems.filter((item) => item.is_archived)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-1">
        <Button variant="glass" size="icon" onClick={onBack} className="rounded-xl shrink-0 h-8 w-8 mt-0.5">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <textarea
          ref={titleRef}
          value={listName}
          onChange={(e) => setListName(e.target.value)}
          onBlur={() => {
            if (listName.trim() && listName !== list.name) {
              useListStore.getState().updateList(list.id, { name: listName.trim() })
            }
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${target.scrollHeight}px`;
          }}
          rows={1}
          className="flex-1 text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded-lg px-1 py-1 resize-none overflow-hidden text-left"
        />
        <Button
          variant="glass"
          size="icon"
          onClick={() => setGroupedByCategory(!groupedByCategory)}
          className={`rounded-xl shrink-0 h-8 w-8 mt-0.5 transition-colors ${groupedByCategory ? 'bg-purple-500/20 text-purple-500' : ''}`}
          title={groupedByCategory ? 'Vue liste' : 'Vue par catégorie'}
        >
          {groupedByCategory ? <ListIcon className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
        </Button>
      </div>

      {/* Shared list indicator */}
      {sharedInfo && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4 text-blue-500" />
          <span>Partagé par {sharedInfo.owner_name || 'quelqu\'un'}</span>
          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-xs font-medium">
            {sharedInfo.permission === 'write' ? 'Édition' : 'Lecture seule'}
          </span>
        </div>
      )}

      {/* Add item form */}
      <form onSubmit={handleAddItem} className="flex gap-2">
        <Input
          placeholder="Ajouter un élément..."
          value={newItemContent}
          onChange={(e) => setNewItemContent(e.target.value)}
          disabled={loading}
          className="glass-input rounded-xl h-12"
        />
        <VoiceInputButton onResult={handleVoiceResult} disabled={loading} />
        <Button
          type="submit"
          disabled={loading || !newItemContent.trim()}
          className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </form>

      {/* Frequent items suggestions */}
      <FrequentItemsSuggestions onSelectItem={handleSelectFrequentItem} />

      {/* Priority legend */}
      <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
        {PRIORITIES.map((p) => (
          <span key={p} className="flex items-center gap-1 px-2 py-1 rounded-lg glass">
            <Flag className={`h-3 w-3 ${PRIORITY_CONFIG[p].color}`} fill={p !== 'low' ? 'currentColor' : 'none'} />
            {PRIORITY_CONFIG[p].label}
          </span>
        ))}
      </div>

      {/* Pending items - with category grouping or drag and drop */}
      {
        groupedByCategory ? (
          // Category view
          <div className="space-y-4">
            {Object.entries(itemsByCategory)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([category, categoryItems]) => (
                <div key={category} className="space-y-2">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${getCategoryColor(category as any)}`}>
                    {category}
                    <span className="opacity-70">({categoryItems.length})</span>
                  </div>
                  <div className="space-y-2">
                    {categoryItems.map((item) => (
                      <SortableItem
                        key={item.id}
                        item={item}
                        reminder={getReminderByItemId(item.id)}
                        onToggle={() => toggleItemComplete(item.id)}
                        onDelete={() => deleteItem(item.id)}
                        onUpdatePriority={(priority) => handleUpdatePriority(item.id, priority)}
                        onSetReminder={() => handleSetReminder(item)}
                        onUpdateContent={(content) => updateItem(item.id, { content })}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          // List view with drag and drop
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortedPendingItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sortedPendingItems.map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    reminder={getReminderByItemId(item.id)}
                    onToggle={() => toggleItemComplete(item.id)}
                    onDelete={() => deleteItem(item.id)}
                    onUpdatePriority={(priority) => handleUpdatePriority(item.id, priority)}
                    onSetReminder={() => handleSetReminder(item)}
                    onUpdateContent={(content) => updateItem(item.id, { content })}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )
      }

      {/* Completed items */}
      {
        completedItems.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="text-sm font-medium text-muted-foreground flex items-center gap-2 hover:text-foreground transition-colors w-full"
            >
              <Check className="h-4 w-4 text-green-500" />
              Complétés ({completedItems.length})
              <span className={`transition-transform ml-auto ${showCompleted ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {showCompleted && (
              <div className="space-y-2">
                {completedItems.map((item) => (
                  <SwipeableItem
                    key={item.id}
                    onDelete={() => deleteItem(item.id)}
                    onComplete={() => toggleItemComplete(item.id)}
                  >
                    <GlassCard className="opacity-70" hover={false}>
                      <GlassCardContent className="flex items-center gap-3 p-3">
                        <button
                          onClick={() => toggleItemComplete(item.id)}
                          className="h-6 w-6 rounded-lg border-2 border-green-500 bg-green-500 flex items-center justify-center shrink-0"
                          data-no-swipe="true"
                        >
                          <Check className="h-3.5 w-3.5 text-white" />
                        </button>
                        <textarea
                          readOnly
                          value={item.content}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${target.scrollHeight}px`;
                          }}
                          rows={1}
                          className="flex-1 line-through text-muted-foreground bg-transparent border-none focus:outline-none resize-none overflow-hidden whitespace-pre-wrap break-words p-0"
                          style={{ height: 'auto' }}
                        />
                        <div className="flex gap-1 shrink-0" data-no-swipe="true">
                          <Button
                            variant="glass"
                            size="icon"
                            className="rounded-xl text-blue-500 h-8 w-8"
                            onClick={() => archiveItem(item.id)}
                            title="Archiver"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="glass"
                            size="icon"
                            className="rounded-xl text-red-500 h-8 w-8"
                            onClick={() => deleteItem(item.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </GlassCardContent>
                    </GlassCard>
                  </SwipeableItem>
                ))}
              </div>
            )}
          </div>
        )
      }

      {/* Archived items section */}
      {
        archivedItems.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="text-sm font-medium text-muted-foreground flex items-center gap-2 hover:text-foreground transition-colors"
            >
              <Archive className="h-4 w-4" />
              Archivés ({archivedItems.length})
              <span className={`transition-transform ${showArchived ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {showArchived && (
              <div className="space-y-2">
                {archivedItems.map((item) => (
                  <SwipeableItem
                    key={item.id}
                    onDelete={() => deleteItem(item.id)}
                    onComplete={() => unarchiveItem(item.id)}
                  >
                    <GlassCard className="opacity-50" hover={false}>
                      <GlassCardContent className="flex items-center gap-3 p-3">
                        <Archive className="h-4 w-4 text-muted-foreground shrink-0" />
                        <textarea
                          readOnly
                          value={item.content}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${target.scrollHeight}px`;
                          }}
                          rows={1}
                          className="flex-1 line-through text-sm text-muted-foreground bg-transparent border-none focus:outline-none resize-none overflow-hidden whitespace-pre-wrap break-words p-0"
                          style={{ height: 'auto' }}
                        />
                        <div className="flex gap-1 shrink-0" data-no-swipe="true">
                          <Button
                            variant="glass"
                            size="icon"
                            className="rounded-xl text-blue-500 h-8 w-8"
                            onClick={() => unarchiveItem(item.id)}
                            title="Désarchiver"
                          >
                            <Undo className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="glass"
                            size="icon"
                            className="rounded-xl text-red-500 h-8 w-8"
                            onClick={() => deleteItem(item.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </GlassCardContent>
                    </GlassCard>
                  </SwipeableItem>
                ))}
              </div>
            )}
          </div>
        )
      }

      {/* Empty state */}
      {
        items.length === 0 && !loading && (
          <GlassCard className="border-dashed border-2" hover={false}>
            <GlassCardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                <Plus className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-muted-foreground">Aucun élément dans cette liste</p>
              <p className="text-sm text-muted-foreground mt-1">Ajoutez votre premier élément ci-dessus</p>
            </GlassCardContent>
          </GlassCard>
        )
      }

      {/* Voice input confirmation modal */}
      {
        parsedVoiceItems && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <GlassCard className="max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
              <GlassCardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">
                  {parsedVoiceItems.length === 1
                    ? 'Ajouter cet élément ?'
                    : `Ajouter ${parsedVoiceItems.length} éléments ?`}
                </h3>

                <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                  {parsedVoiceItems.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-xl bg-muted/50 border border-border"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">#{index + 1}</span>
                        <span className="flex-1">{item.content}</span>
                        {item.priority !== 'normal' && (
                          <Flag
                            className={`h-4 w-4 ${item.priority === 'urgent'
                              ? 'text-red-500'
                              : item.priority === 'high'
                                ? 'text-orange-500'
                                : 'text-gray-400'
                              }`}
                            fill="currentColor"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCancelVoiceItems}
                    className="flex-1 rounded-xl"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleConfirmVoiceItems}
                    className="flex-1 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    Ajouter
                  </Button>
                </div>
              </GlassCardContent>
            </GlassCard>
          </div>
        )
      }

      {/* DateTimePicker modal */}
      <DateTimePicker
        isOpen={reminderPickerItem !== null}
        onClose={() => setReminderPickerItem(null)}
        onConfirm={handleReminderConfirm}
        onDelete={reminderPickerItem ? async () => {
          await handleRemoveReminder(reminderPickerItem)
          setReminderPickerItem(null)
        } : undefined}
        initialDate={
          reminderPickerItem
            ? (getReminderByItemId(reminderPickerItem.id)?.reminder_time
              ? new Date(getReminderByItemId(reminderPickerItem.id)!.reminder_time)
              : reminderPickerItem.due_date
                ? new Date(reminderPickerItem.due_date)
                : undefined)
            : undefined
        }
        initialRecurrence={
          reminderPickerItem && getReminderByItemId(reminderPickerItem.id)
            ? {
              type: getReminderByItemId(reminderPickerItem.id)!.recurrence_type || 'none',
              interval: getReminderByItemId(reminderPickerItem.id)!.recurrence_interval || 1
            } as any
            : null
        }
      />
    </div >
  )
}
