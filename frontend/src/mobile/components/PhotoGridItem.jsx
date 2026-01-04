import { useLongPress } from '../hooks/useLongPress'

export function PhotoGridItem({ photo, isSelectionMode, isSelected, onTap, onLongPress, onSelect }) {
  const bind = useLongPress(onLongPress, { ms: 350 })

  return (
    <div
      className="mobile-grid-item"
      role="gridcell"
      tabIndex={0}
      onClick={() => (isSelectionMode ? onSelect() : onTap())}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          isSelectionMode ? onSelect() : onTap()
        }
      }}
      {...bind}
    >
      <img src={photo.thumbUrl} alt="" loading="lazy" />
      {isSelectionMode && (
        <div className="mobile-check" aria-hidden="true">
          {isSelected ? <div className="mobile-check-inner" /> : null}
        </div>
      )}
    </div>
  )
}


