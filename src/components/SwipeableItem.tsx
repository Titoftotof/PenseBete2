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
const SWIPE_ACTIVATION_THRESHOLD = 10 // Minimum horizontal movement to activate swipe
const SCROLL_LOCK_RATIO = 1.5 // Horizontal movement must be 1.5x vertical to activate swipe

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
  const startY = useRef(0)
  const currentX = useRef(0)
  const isSwipeActive = useRef(false)
  const isScrolling = useRef(false)
  const directionDetermined = useRef(false)

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (disabled) return
    startX.current = clientX
    startY.current = clientY
    currentX.current = clientX
    setIsDragging(true)
    isSwipeActive.current = false
    isScrolling.current = false
    directionDetermined.current = false
  }, [disabled])

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || disabled) return

    const diffX = clientX - startX.current
    const diffY = clientY - startY.current
    currentX.current = clientX

    // Determine direction on first significant movement
    if (!directionDetermined.current && (Math.abs(diffX) > SWIPE_ACTIVATION_THRESHOLD || Math.abs(diffY) > SWIPE_ACTIVATION_THRESHOLD)) {
      directionDetermined.current = true
      // If horizontal movement is significantly greater than vertical, it's a swipe
      if (Math.abs(diffX) > Math.abs(diffY) * SCROLL_LOCK_RATIO) {
        isSwipeActive.current = true
      } else {
        // It's a scroll, don't interfere
        isScrolling.current = true
      }
    }

    // Only update UI if swipe is active (not scrolling)
    if (isSwipeActive.current && !isScrolling.current) {
      setTranslateX(diffX)

      // Show backgrounds based on direction
      if (diffX < -20) {
        setShowDelete(true)
        setShowComplete(false)
      } else if (diffX > 20) {
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
    isScrolling.current = false
    directionDetermined.current = false
  }, [isDragging, disabled, onDelete, onComplete])

  // Touch handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Don't start swipe if touching drag handle or other no-swipe elements
    if ((e.target as HTMLElement).closest('[data-no-swipe]')) {
      return
    }
    const touch = e.touches[0]
    handleStart(touch.clientX, touch.clientY)
  }, [handleStart])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    handleMove(touch.clientX, touch.clientY)

    // Prevent default only if we're swiping (not scrolling)
    if (isSwipeActive.current && !isScrolling.current) {
      e.preventDefault()
    }
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
    handleStart(e.clientX, e.clientY)
  }, [handleStart])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX, e.clientY)
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
        className="relative transition-transform duration-200 ease-out"
        style={{
          transform: `translateX(${translateX}px)`,
          zIndex: 1
        }}
      >
        {children}
      </div>
    </div>
  )
}
