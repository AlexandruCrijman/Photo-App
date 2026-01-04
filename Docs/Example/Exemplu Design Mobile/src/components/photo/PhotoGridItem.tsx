import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface PhotoGridItemProps {
  thumbnailUrl: string;
  isSelected: boolean;
  isSelectionMode: boolean;
  onTap: () => void;
  onLongPress: () => void;
}

export function PhotoGridItem({
  thumbnailUrl,
  isSelected,
  isSelectionMode,
  onTap,
  onLongPress,
}: PhotoGridItemProps) {
  let longPressTimer: NodeJS.Timeout | null = null;
  let isLongPress = false;

  const handleTouchStart = () => {
    isLongPress = false;
    longPressTimer = setTimeout(() => {
      isLongPress = true;
      onLongPress();
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
    if (!isLongPress) {
      onTap();
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
  };

  return (
    <div
      className="photo-grid-item"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchMove}
    >
      <img
        src={thumbnailUrl}
        alt=""
        loading="lazy"
        className={cn(
          'transition-transform duration-200',
          isSelected && 'scale-95 rounded-lg'
        )}
        draggable={false}
      />
      
      {/* Selection indicator */}
      {isSelectionMode && (
        <div
          className={cn(
            'selection-checkmark',
            isSelected && 'selected'
          )}
        >
          {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
        </div>
      )}
      
      {/* Selection overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
      )}
    </div>
  );
}
