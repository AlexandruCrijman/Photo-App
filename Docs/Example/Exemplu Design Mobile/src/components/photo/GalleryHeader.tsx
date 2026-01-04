interface GalleryHeaderProps {
  eventName: string;
  photoCount: number;
}

export function GalleryHeader({ eventName, photoCount }: GalleryHeaderProps) {
  return (
    <div className="text-center py-4">
      <h1 className="text-xl font-semibold text-foreground">{eventName}</h1>
      <p className="text-sm text-muted-foreground mt-1">
        {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
      </p>
    </div>
  );
}
