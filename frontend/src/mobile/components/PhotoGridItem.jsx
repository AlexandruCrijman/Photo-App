import { useLongPress } from '../hooks/useLongPress'
import { useRef } from 'react'

export function PhotoGridItem({ photo, isSelectionMode, isSelected, onTap, onLongPress, onSelect, onPointerDown }) {
  const bind = useLongPress(onLongPress, { ms: 350 })
  const lastPointerTypeRef = useRef('')

  return (
    <div
      className={isSelected ? 'mobile-grid-item selected' : 'mobile-grid-item'}
      role="gridcell"
      tabIndex={0}
      data-photo-id={photo.id}
      onPointerDown={(e) => {
        lastPointerTypeRef.current = String(e?.pointerType || '')
        bind?.onPointerDown?.(e)
        onPointerDown?.(e)
      }}
      onPointerMove={(e) => bind?.onPointerMove?.(e)}
      onPointerUp={(e) => bind?.onPointerUp?.(e)}
      onPointerCancel={(e) => bind?.onPointerCancel?.(e)}
      onTouchStart={(e) => {
        bind?.onTouchStart?.(e)
        // Some Android browsers still emit touch events even with pointer handlers.
        // We handle drag-select at grid level, but this keeps long-press reliable.
      }}
      onTouchMove={(e) => bind?.onTouchMove?.(e)}
      onTouchEnd={(e) => bind?.onTouchEnd?.(e)}
      onClickCapture={bind?.onClickCapture}
      onContextMenu={bind?.onContextMenu}
      onClick={() => {
        // In selection mode, touch interaction is handled on pointerdown for drag-to-select.
        // Avoid double-toggling due to synthetic click on mobile browsers.
        if (isSelectionMode && lastPointerTypeRef.current === 'touch') return
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


