import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BottomActionBar } from './BottomActionBar'

export function PhotoViewer({
  photos,
  isOpen,
  currentIndex,
  onIndexChange,
  onClose,
  onShare,
  onDownload,
  onToggleFavorite,
}) {
  const IconClose = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
  const [showControls, setShowControls] = useState(true)
  const [touchStart, setTouchStart] = useState(null)
  const [touchDelta, setTouchDelta] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [zoom, setZoom] = useState(1) // 1 or 2
  const lastTapRef = useRef(0)

  const current = useMemo(() => photos[currentIndex] || null, [photos, currentIndex])

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    // reset zoom when changing photo
    setZoom(1)
  }, [currentIndex])

  const go = useCallback((dir) => {
    if (dir === 'prev' && currentIndex > 0) {
      setIsTransitioning(true)
      onIndexChange(currentIndex - 1)
      setTimeout(() => setIsTransitioning(false), 220)
    }
    if (dir === 'next' && currentIndex < photos.length - 1) {
      setIsTransitioning(true)
      onIndexChange(currentIndex + 1)
      setTimeout(() => setIsTransitioning(false), 220)
    }
  }, [currentIndex, photos.length, onIndexChange])

  const onTouchStart = (e) => {
    setTouchStart(e.touches?.[0]?.clientX ?? null)
    setTouchDelta(0)
  }

  const onTouchMove = (e) => {
    if (touchStart === null) return
    const x = e.touches?.[0]?.clientX ?? 0
    setTouchDelta(x - touchStart)
  }

  const onTouchEnd = () => {
    if (Math.abs(touchDelta) > 80) {
      if (touchDelta > 0) go('prev')
      else go('next')
    }
    setTouchStart(null)
    setTouchDelta(0)
  }

  const tap = (zone) => {
    if (zone === 'left') return go('prev')
    if (zone === 'right') return go('next')
    if (zone === 'center') setShowControls((s) => !s)
  }

  const onImgTap = () => {
    const now = Date.now()
    const last = lastTapRef.current
    lastTapRef.current = now
    if (now - last < 280) {
      // double tap zoom
      setZoom((z) => (z === 1 ? 2 : 1))
    }
  }

  const imgStyle = useMemo(() => {
    const base = {
      transform: `translateX(${touchDelta}px) scale(${zoom})`,
      transition: isTransitioning ? 'transform 220ms ease' : 'none',
    }
    return base
  }, [touchDelta, isTransitioning, zoom])

  if (!isOpen || !current) return null
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < photos.length - 1

  return (
    <div className="mobile-viewer" role="dialog" aria-modal="true">
      <div className="mobile-viewer-top" style={{ opacity: showControls ? 1 : 0, transition: 'opacity 200ms ease' }}>
        <button className="pill" onClick={onClose} aria-label="Close viewer">
          <IconClose />
        </button>
        <div className="pill">{currentIndex + 1} / {photos.length}</div>
      </div>

      <div
        className={showControls ? 'mobile-viewer-arrows' : 'mobile-viewer-arrows hidden'}
        aria-hidden={showControls ? 'false' : 'true'}
      >
        {hasPrev && (
          <button
            type="button"
            className="mobile-viewer-arrow left"
            onClick={() => go('prev')}
            aria-label="Previous photo"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {hasNext && (
          <button
            type="button"
            className="mobile-viewer-arrow right"
            onClick={() => go('next')}
            aria-label="Next photo"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      <div
        style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="mobile-viewer-tapzone left" onClick={() => tap('left')} />
        <div className="mobile-viewer-tapzone center" onClick={() => tap('center')} />
        <div className="mobile-viewer-tapzone right" onClick={() => tap('right')} />

        <img
          src={current.fullUrl}
          alt=""
          className="mobile-viewer-img"
          style={imgStyle}
          draggable={false}
          onClick={onImgTap}
        />
      </div>

      <BottomActionBar
        isVisible={showControls}
        isFavorite={Boolean(current.isFavorite)}
        onShare={() => onShare(current.id)}
        onDownload={() => onDownload(current.id)}
        onFavorite={() => onToggleFavorite(current.id, !current.isFavorite)}
      />
    </div>
  )
}


