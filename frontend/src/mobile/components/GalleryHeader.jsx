export function GalleryHeader({
  eventName,
  photoCount,
}) {
  return (
    <div style={{ padding: '12px 14px 6px' }}>
      <div style={{ fontWeight: 900, fontSize: 18, lineHeight: 1.1, textAlign: 'center' }}>{eventName}</div>
      <div style={{ marginTop: 4, color: '#64748b', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>
        {photoCount} photos
      </div>
    </div>
  )
}


