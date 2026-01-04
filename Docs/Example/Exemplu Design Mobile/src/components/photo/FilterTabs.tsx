import { cn } from '@/lib/utils';

interface FilterTabsProps {
  activeFilter: 'all' | 'my';
  onFilterChange: (filter: 'all' | 'my') => void;
  myPhotoCount: number;
  allPhotoCount: number;
}

export function FilterTabs({
  activeFilter,
  onFilterChange,
  myPhotoCount,
  allPhotoCount,
}: FilterTabsProps) {
  return (
    <div className="flex gap-2 p-1 bg-secondary rounded-full">
      <button
        onClick={() => onFilterChange('my')}
        className={cn(
          'px-4 py-2 rounded-full text-sm font-medium transition-all',
          activeFilter === 'my'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground'
        )}
      >
        My Photos ({myPhotoCount})
      </button>
      <button
        onClick={() => onFilterChange('all')}
        className={cn(
          'px-4 py-2 rounded-full text-sm font-medium transition-all',
          activeFilter === 'all'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground'
        )}
      >
        All Photos ({allPhotoCount})
      </button>
    </div>
  );
}
