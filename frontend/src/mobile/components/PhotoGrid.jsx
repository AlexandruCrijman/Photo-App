import { PhotoGridItem } from './PhotoGridItem'

export function PhotoGrid({
  photos,
  isSelectionMode,
  isSelected,
  onPhotoTap,
  onPhotoLongPress,
  onPhotoSelect,
  isLoading,
}) {
  return (
    <div className="mobile-grid" role="grid" aria-busy={isLoading ? 'true' : 'false'}>
      {photos.map((p, idx) => (
        <PhotoGridItem
          key={p.id}
          photo={p}
          index={idx}
          isSelectionMode={isSelectionMode}
          isSelected={isSelected(p.id)}
          onTap={() => onPhotoTap(idx)}
          onLongPress={() => onPhotoLongPress(p.id)}
          onSelect={() => onPhotoSelect(p.id)}
        />
      ))}
    </div>
  )
}


