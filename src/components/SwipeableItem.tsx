import { useRef, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { TouchEvent, MouseEvent } from 'react'
import { Trash2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeableItemProps {
  children: ReactNode
  onDelete?: () => void
  onComplete?: () => void
  disabled?: boolean
  className?: string
  allowOverflow?: boolean
}

const SWIPE_THRESHOLD = 80

export function SwipeableItem({
  children,
  onDelete,
  onComplete,
  disabled = false,
  className,
  allowOverflow = false
}: SwipeableItemProps) {
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showComplete, setShowComplete] = useState(false)

  const startX = useRef(0)
  const currentX = useRef(0)
  const isSwipeActive = useRef(false)

  const handleStart = useCallback((clientX: number) => {
    if (disabled) return
    startX.current = clientX
    currentX.current = clientX
    setIsDragging(true)
    isSwipeActive.current = false // Don't activate swipe immediately
  }, [disabled])

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging || disabled) return

    const diff = clientX - startX.current
    currentX.current = clientX

    // Only activate swipe if movement is significant (> 20px)
    if (Math.abs(diff) > 20 && !isSwipeActive.current) {
      isSwipeActive.current = true
    }

    // Only update UI if swipe is active
    if (isSwipeActive.current) {
      setTranslateX(diff)

      // Show backgrounds based on direction
      if (diff < -20) {
        setShowDelete(true)
        setShowComplete(false)
      } else if (diff > 20) {
        setShowComplete(true)
        setShowDelete(false)
      } else {
        setShowDelete(false)
        setShowComplete(false)
      }
    }
  }, [isDragging, disabled])

  const handleEnd = useCallback(() => {
    if (!isDragging || disabled) return

    const diff = currentX.current - startX.current

    // Only trigger actions if swipe was actually activated (movement > 20px)
    if (isSwipeActive.current) {
      if (diff < -SWIPE_THRESHOLD && onDelete) {
        onDelete()
      } else if (diff > SWIPE_THRESHOLD && onComplete) {
        onComplete()
      }
    }

    // Reset
    setTranslateX(0)
    setShowDelete(false)
    setShowComplete(false)
    setIsDragging(false)
    isSwipeActive.current = false
  }, [isDragging, disabled, onDelete, onComplete])

  // Touch handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Don't start swipe if touching drag handle or other no-swipe elements
    if ((e.target as HTMLElement).closest('[data-no-swipe]')) {
      return
    }
    const touch = e.touches[0]
    handleStart(touch.clientX)
  }, [handleStart])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    handleMove(touch.clientX)
  }, [handleMove])

  const handleTouchEnd = useCallback(() => {
    handleEnd()
  }, [handleEnd])

  // Mouse handlers
  const handleMouseDown = useCallback((e: MouseEvent) => {
    // Only start swipe on the item content, not on drag handle
    if ((e.target as HTMLElement).closest('[data-no-swipe]')) {
      return
    }
    handleStart(e.clientX)
  }, [handleStart])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX)
  }, [handleMove])

  const handleMouseUp = useCallback(() => {
    handleEnd()
  }, [handleEnd])

  return (
    <div
      className={cn('relative rounded-xl', !allowOverflow && 'overflow-hidden', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleEnd}
    >
      {/* Delete background (swipe left) */}
      <div
        className={cn(
          'absolute inset-0 bg-red-500 flex items-center justify-end pr-6 pointer-events-none transition-all duration-200 rounded-xl overflow-hidden',
          !showDelete && 'opacity-0'
        )}
        style={{ zIndex: 0 }}
      >
        <Trash2 className="h-6 w-6 text-white" />
      </div>

      {/* Complete background (swipe right) */}
      <div
        className={cn(
          'absolute inset-0 bg-green-500 flex items-center justify-start pl-6 pointer-events-none transition-all duration-200 rounded-xl overflow-hidden',
          !showComplete && 'opacity-0'
        )}
        style={{ zIndex: 0 }}
      >
        <Check className="h-6 w-6 text-white" />
      </div>

      {/* Content */}
      <div
        className="relative touch-none transition-transform duration-200 ease-out"
        style={{
          transform: `translateX(${translateX}px)`,
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: 1
        }}
      >
        {children}
      </div>
    </div>
  )
}
