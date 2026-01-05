import { PhotoGridItem } from './PhotoGridItem'

export function PhotoGrid({
  gridRef,
  photos,
  isSelectionMode,
  isSelected,
  onPhotoTap,
  onPhotoLongPress,
  onPhotoSelect,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  isDragSelecting,
  isLoading,
}) {
  return (
    <div
      className={isDragSelecting ? 'mobile-grid drag-selecting' : 'mobile-grid'}
      ref={gridRef}
      role="grid"
      aria-busy={isLoading ? 'true' : 'false'}
      style={{ touchAction: isSelectionMode ? 'pan-y' : 'auto' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
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
        />
      ))}
    </div>
  )
}
