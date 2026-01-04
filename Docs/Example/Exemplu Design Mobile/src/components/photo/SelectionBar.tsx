import { X, Share2, Download, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectionBarProps {
  selectedCount: number;
  totalCount: number;
  onCancel: () => void;
  onSelectAll: () => void;
  onShare: () => void;
  onDownload: () => void;
}

export function SelectionBar({
  selectedCount,
  totalCount,
  onCancel,
  onSelectAll,
  onShare,
  onDownload,
}: SelectionBarProps) {
  const allSelected = selectedCount === totalCount;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 animate-slide-up"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-4 mb-2 rounded-2xl bg-card border border-border shadow-lg overflow-hidden">
        {/* Top row - selection info */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button
            onClick={onCancel}
            className="p-1 text-primary font-medium"
          >
            Cancel
          </button>
          <span className="text-sm font-semibold text-foreground">
            {selectedCount} selected
          </span>
          <button
            onClick={onSelectAll}
            className="p-1 text-primary font-medium"
          >
            {allSelected ? 'Deselect' : 'Select All'}
          </button>
        </div>
        
        {/* Bottom row - actions */}
        <div className="flex items-center justify-around py-3 px-4">
          <button
            onClick={onShare}
            disabled={selectedCount === 0}
            className={cn(
              'action-button',
              selectedCount === 0 ? 'text-muted-foreground' : 'text-foreground'
            )}
          >
            <Share2 className="action-button-icon" />
            <span className="action-button-label">Share</span>
          </button>
          
          <button
            onClick={onDownload}
            disabled={selectedCount === 0}
            className={cn(
              'action-button',
              selectedCount === 0 ? 'text-muted-foreground' : 'text-foreground'
            )}
          >
            <Download className="action-button-icon" />
            <span className="action-button-label">Download</span>
          </button>
        </div>
      </div>
    </div>
  );
}
