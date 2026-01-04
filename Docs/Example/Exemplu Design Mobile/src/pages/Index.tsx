import { useState, useMemo, useCallback } from 'react';
import { mockPhotos, currentUserTag } from '@/data/mockPhotos';
import { Photo } from '@/types/photo';
import { GalleryHeader } from '@/components/photo/GalleryHeader';
import { FilterTabs } from '@/components/photo/FilterTabs';
import { PhotoGrid } from '@/components/photo/PhotoGrid';
import { PhotoViewer } from '@/components/photo/PhotoViewer';
import { SelectionBar } from '@/components/photo/SelectionBar';
import { usePhotoSelection } from '@/hooks/usePhotoSelection';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [photos, setPhotos] = useState<Photo[]>(mockPhotos);
  const [filter, setFilter] = useState<'all' | 'my'>('my');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const { toast } = useToast();

  const {
    selectedIds,
    selectedCount,
    isSelectionMode,
    toggleSelection,
    startSelection,
    clearSelection,
    selectAll,
    isSelected,
  } = usePhotoSelection();

  // Filter photos based on current filter
  const filteredPhotos = useMemo(() => {
    if (filter === 'my') {
      return photos.filter(p => p.tags.includes(currentUserTag));
    }
    return photos;
  }, [photos, filter]);

  const myPhotoCount = useMemo(
    () => photos.filter(p => p.tags.includes(currentUserTag)).length,
    [photos]
  );

  // Handlers
  const handlePhotoTap = useCallback((index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  }, []);

  const handleToggleFavorite = useCallback((id: string) => {
    setPhotos(prev =>
      prev.map(p => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p))
    );
    const photo = photos.find(p => p.id === id);
    toast({
      title: photo?.isFavorite ? 'Removed from favorites' : 'Added to favorites',
      duration: 1500,
    });
  }, [photos, toast]);

  const handleDownload = useCallback(async (id: string) => {
    const photo = photos.find(p => p.id === id);
    if (!photo) return;

    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photo-${id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Photo downloaded', duration: 1500 });
    } catch {
      toast({ title: 'Download failed', variant: 'destructive', duration: 1500 });
    }
  }, [photos, toast]);

  const handleShare = useCallback(async (id: string) => {
    const photo = photos.find(p => p.id === id);
    if (!photo) return;

    if (navigator.share) {
      try {
        const response = await fetch(photo.url);
        const blob = await response.blob();
        const file = new File([blob], `photo-${id}.jpg`, { type: 'image/jpeg' });
        
        await navigator.share({
          files: [file],
          title: 'Share Photo',
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          toast({ title: 'Share failed', variant: 'destructive', duration: 1500 });
        }
      }
    } else {
      toast({ title: 'Sharing not supported on this device', duration: 2000 });
    }
  }, [photos, toast]);

  const handleMultiDownload = useCallback(async () => {
    toast({ title: `Downloading ${selectedCount} photos...`, duration: 2000 });
    for (const id of selectedIds) {
      await handleDownload(id);
    }
    clearSelection();
  }, [selectedIds, selectedCount, handleDownload, clearSelection, toast]);

  const handleMultiShare = useCallback(async () => {
    if (!navigator.share) {
      toast({ title: 'Sharing not supported on this device', duration: 2000 });
      return;
    }

    try {
      const files = await Promise.all(
        selectedIds.map(async (id) => {
          const photo = photos.find(p => p.id === id);
          if (!photo) throw new Error('Photo not found');
          const response = await fetch(photo.url);
          const blob = await response.blob();
          return new File([blob], `photo-${id}.jpg`, { type: 'image/jpeg' });
        })
      );

      await navigator.share({
        files,
        title: 'Share Photos',
      });
      clearSelection();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast({ title: 'Share failed', variant: 'destructive', duration: 1500 });
      }
    }
  }, [selectedIds, photos, clearSelection, toast]);

  const handleSelectAll = useCallback(() => {
    if (selectedCount === filteredPhotos.length) {
      clearSelection();
    } else {
      selectAll(filteredPhotos.map(p => p.id));
    }
  }, [selectedCount, filteredPhotos, clearSelection, selectAll]);

  const eventName = photos[0]?.eventName || 'Photo Gallery';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border safe-area-top">
        <GalleryHeader
          eventName={eventName}
          photoCount={filteredPhotos.length}
        />
        <div className="flex justify-center pb-4">
          <FilterTabs
            activeFilter={filter}
            onFilterChange={setFilter}
            myPhotoCount={myPhotoCount}
            allPhotoCount={photos.length}
          />
        </div>
      </header>

      {/* Main content */}
      <main className={isSelectionMode ? 'pb-32' : ''}>
        <PhotoGrid
          photos={filteredPhotos}
          isSelectionMode={isSelectionMode}
          isSelected={isSelected}
          onPhotoTap={handlePhotoTap}
          onPhotoLongPress={startSelection}
          onPhotoSelect={toggleSelection}
        />
      </main>

      {/* Selection bar */}
      {isSelectionMode && (
        <SelectionBar
          selectedCount={selectedCount}
          totalCount={filteredPhotos.length}
          onCancel={clearSelection}
          onSelectAll={handleSelectAll}
          onShare={handleMultiShare}
          onDownload={handleMultiDownload}
        />
      )}

      {/* Photo viewer */}
      <PhotoViewer
        photos={filteredPhotos}
        currentIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onIndexChange={setViewerIndex}
        onToggleFavorite={handleToggleFavorite}
        onDownload={handleDownload}
        onShare={handleShare}
      />
    </div>
  );
};

export default Index;
