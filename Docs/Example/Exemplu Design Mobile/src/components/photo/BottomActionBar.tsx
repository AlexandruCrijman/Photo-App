import { Share2, Download, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomActionBarProps {
  isVisible: boolean;
  isFavorite: boolean;
  onShare: () => void;
  onDownload: () => void;
  onFavorite: () => void;
}

export function BottomActionBar({
  isVisible,
  isFavorite,
  onShare,
  onDownload,
  onFavorite,
}: BottomActionBarProps) {
  return (
    <div
      className={cn(
        'absolute bottom-0 left-0 right-0 z-20 transition-all duration-300',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      )}
      style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around px-8 py-4 bg-black/60 backdrop-blur-xl">
        <button
          onClick={onShare}
          className="action-button text-white hover:bg-white/10"
        >
          <Share2 className="action-button-icon" />
          <span className="action-button-label">Share</span>
        </button>
        
        <button
          onClick={onDownload}
          className="action-button text-white hover:bg-white/10"
        >
          <Download className="action-button-icon" />
          <span className="action-button-label">Download</span>
        </button>
        
        <button
          onClick={onFavorite}
          className="action-button text-white hover:bg-white/10"
        >
          <Heart
            className={cn(
              'action-button-icon transition-colors',
              isFavorite && 'fill-favorite text-favorite'
            )}
          />
          <span className="action-button-label">Favorite</span>
        </button>
      </div>
    </div>
  );
}
