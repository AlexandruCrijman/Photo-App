import { useLongPress } from '../hooks/useLongPress'

export function PhotoGridItem({ photo, isSelectionMode, isSelected, onTap, onLongPress, onSelect }) {
  const bind = useLongPress(onLongPress, { ms: 350 })

  return (
    <div
      className={isSelected ? 'mobile-grid-item selected' : 'mobile-grid-item'}
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


