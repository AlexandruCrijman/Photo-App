import { Photo } from '@/types/photo';
import { PhotoGridItem } from './PhotoGridItem';

interface PhotoGridProps {
  photos: Photo[];
  isSelectionMode: boolean;
  isSelected: (id: string) => boolean;
  onPhotoTap: (index: number) => void;
  onPhotoLongPress: (id: string) => void;
  onPhotoSelect: (id: string) => void;
}

export function PhotoGrid({
  photos,
  isSelectionMode,
  isSelected,
  onPhotoTap,
  onPhotoLongPress,
  onPhotoSelect,
}: PhotoGridProps) {
  return (
    <div className="grid grid-cols-3 gap-0.5 bg-border">
      {photos.map((photo, index) => (
        <PhotoGridItem
          key={photo.id}
          thumbnailUrl={photo.thumbnailUrl}
          isSelected={isSelected(photo.id)}
          isSelectionMode={isSelectionMode}
          onTap={() => {
            if (isSelectionMode) {
              onPhotoSelect(photo.id);
            } else {
              onPhotoTap(index);
            }
          }}
          onLongPress={() => onPhotoLongPress(photo.id)}
        />
      ))}
    </div>
  );
}
