import type { ReactNode } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DraggableListProps<T extends { id: string }> {
  items: T[]
  onReorder: (items: T[]) => void
  renderItem: (item: T, dragHandle: ReactNode) => ReactNode
  disabled?: boolean
}

interface SortableItemProps<T extends { id: string }> {
  item: T
  disabled: boolean
  renderItem: (item: T, dragHandle: ReactNode) => ReactNode
}

function DragHandleButton({ listeners, attributes }: { listeners?: any; attributes?: any }) {
  return (
    <button
      className={cn(
        "p-1.5 rounded-lg touch-none shrink-0",
        "opacity-50 hover:opacity-100",
        "transition-all duration-200",
        "backdrop-blur-sm bg-white/10 border border-white/20",
        "cursor-grab active:cursor-grabbing",
        "hover:bg-white/20 active:scale-110",
        "shadow-sm"
      )}
      {...attributes}
      {...listeners}
      data-no-swipe="true"
    >
      <GripVertical className="h-5 w-5 text-muted-foreground" />
    </button>
  )
}

function SortableItem<T extends { id: string }>({ item, disabled, renderItem }: SortableItemProps<T>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  }

  const dragHandle = disabled ? null : (
    <DragHandleButton listeners={listeners} attributes={attributes} />
  )

  return (
    <div ref={setNodeRef} style={style} className="group">
      {renderItem(item, dragHandle)}
    </div>
  )
}

export function DraggableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  disabled = false,
}: DraggableListProps<T>) {
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)

      const newItems = arrayMove(items, oldIndex, newIndex)
      onReorder(newItems)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="grid gap-3">
          {items.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              disabled={disabled}
              renderItem={renderItem}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
