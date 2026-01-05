import { useLongPress } from '../hooks/useLongPress'
import { useRef } from 'react'

export function PhotoGridItem({ photo, isSelectionMode, isSelected, onTap, onLongPress, onSelect, onHoldDragStart }) {
  const bind = useLongPress(onLongPress, { ms: 350 })
  const lastPointerTypeRef = useRef('')
  const holdTimerRef = useRef(null)
  const holdStartRef = useRef({ x: 0, y: 0 })
  const pointerIdRef = useRef(null)
  const didStartHoldDragRef = useRef(false)

  const clearHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }

  const startHold = (e) => {
    didStartHoldDragRef.current = false
    clearHold()
    const x = e?.clientX ?? 0
    const y = e?.clientY ?? 0
    holdStartRef.current = { x, y }
    // Small intentional pause to enter drag-to-select in selection mode.
    // Quick swipes remain scroll gestures.
    holdTimerRef.current = setTimeout(() => {
      didStartHoldDragRef.current = true
      onHoldDragStart?.(pointerIdRef.current)
    }, 140)
  }

  const maybeCancelHoldOnMove = (e) => {
    if (!holdTimerRef.current) return
    const x = e?.clientX ?? 0
    const y = e?.clientY ?? 0
    const dx = Math.abs(x - holdStartRef.current.x)
    const dy = Math.abs(y - holdStartRef.current.y)
    if (dx > 10 || dy > 10) clearHold()
  }

  return (
    <div
      className={isSelected ? 'mobile-grid-item selected' : 'mobile-grid-item'}
      role="gridcell"
      tabIndex={0}
      data-photo-id={photo.id}
      onPointerDown={(e) => {
        lastPointerTypeRef.current = String(e?.pointerType || '')
        pointerIdRef.current = (typeof e?.pointerId === 'number') ? e.pointerId : null
        bind?.onPointerDown?.(e)
        // Important: do NOT start drag-select immediately; it causes accidental selects while scrolling.
        if (isSelectionMode && e?.pointerType === 'touch') startHold(e)
      }}
      onPointerMove={(e) => { bind?.onPointerMove?.(e); maybeCancelHoldOnMove(e) }}
      onPointerUp={(e) => { clearHold(); bind?.onPointerUp?.(e) }}
      onPointerCancel={(e) => { clearHold(); bind?.onPointerCancel?.(e) }}
      onTouchStart={(e) => {
        bind?.onTouchStart?.(e)
        // Some Android browsers still emit touch events even with pointer handlers.
        // We handle drag-select at grid level, but this keeps long-press reliable.
      }}
      onTouchMove={(e) => bind?.onTouchMove?.(e)}
      onTouchEnd={(e) => { clearHold(); bind?.onTouchEnd?.(e) }}
      onClickCapture={(e) => {
        // Prevent click after we entered drag-select via hold.
        if (didStartHoldDragRef.current) {
          e.preventDefault()
          e.stopPropagation()
          didStartHoldDragRef.current = false
        }
        bind?.onClickCapture?.(e)
      }}
      onContextMenu={bind?.onContextMenu}
      onClick={() => {
        // Allow tap-to-toggle selection on touch. Drag-select has click suppression above.
        return isSelectionMode ? onSelect() : onTap()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          isSelectionMode ? onSelect() : onTap()
        }
      }}
    >
      <img src={photo.thumbUrl} alt="" loading="lazy" />
      {isSelectionMode && (
        <div className={isSelected ? 'mobile-check selected' : 'mobile-check'} aria-hidden="true">
          {isSelected ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </div>
      )}
    </div>
  )
}


