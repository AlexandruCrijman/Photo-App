import { PhotoGridItem } from './PhotoGridItem'

export function PhotoGrid({
  gridRef,
  photos,
  isSelectionMode,
  isSelected,
  onPhotoTap,
  onPhotoLongPress,
  onPhotoSelect,
  onHoldDragStart,
  onDragMove,
  onDragEnd,
  isDragSelecting,
  isLoading,
}) {
  return (
    <div
      className={isDragSelecting ? 'mobile-grid drag-selecting' : 'mobile-grid'}
      ref={gridRef}
      role="grid"
      aria-busy={isLoading ? 'true' : 'false'}
      onPointerMove={onDragMove}
      onPointerUp={onDragEnd}
      onPointerCancel={onDragEnd}
      onTouchMove={onDragMove}
      onTouchEnd={onDragEnd}
      onTouchCancel={onDragEnd}
    >
      {photos.map((p, idx) => (
        <PhotoGridItem
          key={p.id}
          photo={p}
          index={idx}
          isSelectionMode={isSelectionMode}
          isSelected={isSelected(p.id)}
          onTap={() => onPhotoTap(idx)}
          onLongPress={(e) => onPhotoLongPress(p.id, e)}
          onSelect={() => onPhotoSelect(p.id)}
          onHoldDragStart={(pointerId) => onHoldDragStart?.(p.id, pointerId)}
        />
      ))}
    </div>
  )
}


