import { useState, useCallback } from 'react';
import { Photo } from '@/types/photo';

export function usePhotoViewer(photos: Photo[]) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const openViewer = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
    setShowControls(true);
  }, []);

  const closeViewer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % photos.length);
  }, [photos.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const goToIndex = useCallback((index: number) => {
    if (index >= 0 && index < photos.length) {
      setCurrentIndex(index);
    }
  }, [photos.length]);

  const toggleControls = useCallback(() => {
    setShowControls(prev => !prev);
  }, []);

  const currentPhoto = photos[currentIndex] || null;

  return {
    isOpen,
    currentIndex,
    currentPhoto,
    showControls,
    openViewer,
    closeViewer,
    goToNext,
    goToPrevious,
    goToIndex,
    toggleControls,
    totalPhotos: photos.length,
  };
}
