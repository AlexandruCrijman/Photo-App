import { useState, useRef, useEffect } from 'react';
import { Photo } from '@/types/photo';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BottomActionBar } from './BottomActionBar';

interface PhotoViewerProps {
  photos: Photo[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onToggleFavorite: (id: string) => void;
  onDownload: (id: string) => void;
  onShare: (id: string) => void;
}

export function PhotoViewer({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onIndexChange,
  onToggleFavorite,
  onDownload,
  onShare,
}: PhotoViewerProps) {
  const [showControls, setShowControls] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPhoto = photos[currentIndex];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !currentPhoto) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setTouchDelta(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const delta = e.touches[0].clientX - touchStart;
    setTouchDelta(delta);
  };

  const handleTouchEnd = () => {
    if (Math.abs(touchDelta) > 80) {
      setIsTransitioning(true);
      if (touchDelta > 0 && currentIndex > 0) {
        onIndexChange(currentIndex - 1);
      } else if (touchDelta < 0 && currentIndex < photos.length - 1) {
        onIndexChange(currentIndex + 1);
      }
      setTimeout(() => setIsTransitioning(false), 300);
    }
    setTouchStart(null);
    setTouchDelta(0);
  };

  const handleTapZone = (zone: 'left' | 'center' | 'right') => {
    if (zone === 'left' && currentIndex > 0) {
      setIsTransitioning(true);
      onIndexChange(currentIndex - 1);
      setTimeout(() => setIsTransitioning(false), 300);
    } else if (zone === 'right' && currentIndex < photos.length - 1) {
      setIsTransitioning(true);
      onIndexChange(currentIndex + 1);
      setTimeout(() => setIsTransitioning(false), 300);
    } else if (zone === 'center') {
      setShowControls(!showControls);
    }
  };

  const getTransformStyle = () => {
    if (isTransitioning) {
      return { transform: 'translateX(0)', transition: 'transform 0.3s ease-out' };
    }
    return { transform: `translateX(${touchDelta}px)`, transition: 'none' };
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black"
    >
      {/* Progress indicators - Stories style */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 z-20 flex gap-1 px-2 pt-2 transition-opacity duration-200',
          showControls ? 'opacity-100' : 'opacity-0'
        )}
        style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}
      >
        {photos.map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-0.5 flex-1 rounded-full transition-all duration-300',
              i === currentIndex ? 'bg-white' : 'bg-white/30'
            )}
          />
        ))}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className={cn(
          'absolute top-12 left-4 z-20 p-2 rounded-full bg-black/40 text-white transition-opacity duration-200',
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        <X className="w-6 h-6" />
      </button>

      {/* Photo counter */}
      <div
        className={cn(
          'absolute top-12 right-4 z-20 px-3 py-1.5 rounded-full bg-black/40 text-white text-sm font-medium transition-opacity duration-200',
          showControls ? 'opacity-100' : 'opacity-0'
        )}
      >
        {currentIndex + 1} / {photos.length}
      </div>

      {/* Main photo area */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Tap zones */}
        <div
          className="viewer-nav-zone left-0 cursor-pointer"
          onClick={() => handleTapZone('left')}
        />
        <div
          className="absolute top-0 bottom-0 left-1/3 right-1/3 z-10 cursor-pointer"
          onClick={() => handleTapZone('center')}
        />
        <div
          className="viewer-nav-zone right-0 cursor-pointer"
          onClick={() => handleTapZone('right')}
        />

        {/* Photo */}
        <img
          src={currentPhoto.url}
          alt=""
          className="max-w-full max-h-full object-contain select-none"
          style={getTransformStyle()}
          draggable={false}
        />

        {/* Navigation arrows (desktop) */}
        {currentIndex > 0 && (
          <button
            onClick={() => handleTapZone('left')}
            className={cn(
              'hidden md:flex absolute left-4 p-2 rounded-full bg-black/40 text-white transition-opacity duration-200',
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {currentIndex < photos.length - 1 && (
          <button
            onClick={() => handleTapZone('right')}
            className={cn(
              'hidden md:flex absolute right-4 p-2 rounded-full bg-black/40 text-white transition-opacity duration-200',
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom action bar */}
      <BottomActionBar
        isVisible={showControls}
        isFavorite={currentPhoto.isFavorite}
        onShare={() => onShare(currentPhoto.id)}
        onDownload={() => onDownload(currentPhoto.id)}
        onFavorite={() => onToggleFavorite(currentPhoto.id)}
      />
    </div>
  );
}
