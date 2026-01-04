export function SelectionBar({ selectedCount, onShare, onDownload, onCancel }) {
  return (
    <div className="mobile-selection-bar" role="region" aria-label="Selection actions">
      <div style={{ padding: '8px 12px 0', color: '#0f172a', fontWeight: 800 }}>
        {selectedCount} selected
      </div>
      <div className="mobile-selection-inner">
        <button type="button" onClick={onShare} disabled={selectedCount === 0}>Share All</button>
        <button type="button" onClick={onDownload} disabled={selectedCount === 0}>Download All</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}


