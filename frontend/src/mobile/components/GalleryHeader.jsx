export function GalleryHeader({
  eventName,
  photoCount,
  isSelectionMode,
  selectedCount,
  onSelectAll,
  onCancelSelection,
}) {
  return (
    <div style={{ padding: '12px 14px 6px' }}>
      {!isSelectionMode ? (
        <>
          <div style={{ fontWeight: 900, fontSize: 18, lineHeight: 1.1 }}>Photos</div>
          <div style={{ marginTop: 4, color: '#475569', fontWeight: 700, fontSize: 13 }}>
            {eventName} • {photoCount}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{selectedCount} selected</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="suggestion-btn" onClick={onSelectAll} style={{ padding: '8px 10px' }}>Select all</button>
            <button className="suggestion-btn" onClick={onCancelSelection} style={{ padding: '8px 10px' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}


