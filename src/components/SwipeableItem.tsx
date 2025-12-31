import { ReactNode, useRef, useState, useCallback } from 'react'
import { useDrag } from '@use-gesture/react'
import { Trash2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeableItemProps {
  children: ReactNode
  onDelete?: () => void
  onComplete?: () => void
  disabled?: boolean
  className?: string
}

const SWIPE_THRESHOLD = 100
const MAX_DRAG = 200

export function SwipeableItem({
  children,
  onDelete,
  onComplete,
  disabled = false,
  className
}: SwipeableItemProps) {
  const [position, setPosition] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [showAction, setShowAction] = useState<'delete' | 'complete' | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete()
    }
  }, [onDelete])

  const handleComplete = useCallback(() => {
    if (onComplete) {
      onComplete()
    }
  }, [onComplete])

  const bind = useDrag(
    ({ offset: [x], movement: [mx], down, first, cancel }) => {
      if (disabled) {
        cancel()
        return
      }

      setIsDragging(down)

      // Clamp the movement to prevent excessive dragging
      const clampedX = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, x))
      setPosition(clampedX)

      // Show action preview
      if (clampedX < -SWIPE_THRESHOLD / 2) {
        setShowAction('delete')
      } else if (clampedX > SWIPE_THRESHOLD / 2) {
        setShowAction('complete')
      } else {
        setShowAction(null)
      }

      // Trigger action on release
      if (!down) {
        if (mx < -SWIPE_THRESHOLD) {
          handleDelete()
        } else if (mx > SWIPE_THRESHOLD) {
          handleComplete()
        }

        // Reset position
        setPosition(0)
        setShowAction(null)
      }
    },
    {
      from: () => [position, 0],
      filterTaps: true,
      rubberband: 0.2,
      axis: 'x',
      bounds: { left: -MAX_DRAG, right: MAX_DRAG }
    }
  )

  // Calculate opacity for backgrounds
  const deleteOpacity = Math.min(1, Math.max(0, Math.abs(position) / SWIPE_THRESHOLD))
  const completeOpacity = Math.min(1, Math.max(0, position / SWIPE_THRESHOLD))

  return (
    <div className={cn('relative overflow-hidden rounded-xl', className)}>
      {/* Delete background (swipe left) */}
      <div
        className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6 pointer-events-none transition-opacity duration-150"
        style={{
          opacity: position < 0 ? deleteOpacity : 0,
          zIndex: 0
        }}
      >
        <Trash2 className="h-6 w-6 text-white" />
      </div>

      {/* Complete background (swipe right) */}
      <div
        className="absolute inset-0 bg-green-500 flex items-center justify-start pl-6 pointer-events-none transition-opacity duration-150"
        style={{
          opacity: position > 0 ? completeOpacity : 0,
          zIndex: 0
        }}
      >
        <Check className="h-6 w-6 text-white" />
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        {...bind()}
        className="relative glass-card touch-none transition-transform duration-200 ease-out"
        style={{
          transform: `translateX(${position}px)`,
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: 1
        }}
      >
        {children}
      </div>
    </div>
  )
}
