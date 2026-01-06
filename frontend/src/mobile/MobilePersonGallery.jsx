import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './mobile.css'
import { GalleryHeader } from './components/GalleryHeader'
import { FilterTabs } from './components/FilterTabs'
import { PhotoGrid } from './components/PhotoGrid'
import { PhotoViewer } from './components/PhotoViewer'
import { SelectionBar } from './components/SelectionBar'
import { usePhotoSelection } from './hooks/usePhotoSelection'
import { fetchPhotos, mapPhoto, setFavorite } from './api'

export function MobilePersonGallery({ apiBase, eventNameFallback = 'Wedding', personTagName = '' }) {
  const [filter, setFilter] = useState('my') // 'my' | 'all'
  const [items, setItems] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)

  const listRef = useRef(null)
  const gridRef = useRef(null)

  const {
    isSelectionMode,
    selectedIds,
    selectedCount,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelection,
    isSelected,
    setSelected,
    setSelectionSet,
    selectAllVisible,
    clearSelection,
  } = usePhotoSelection()

  const eventName = eventNameFallback

  const photos = useMemo(() => items.map((p) => mapPhoto(apiBase, p)), [items, apiBase])

  // iOS Photos-style drag-to-select with direction lock
  const [isDragSelecting, setIsDragSelecting] = useState(false)
  
  // Drag gesture state
  const dragGestureRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    mode: 'select', // 'select' | 'deselect'
    visited: new Set(), // ids visited this gesture
    locked: false, // true once direction is determined
    isSelection: false, // true if horizontal-ish (selection), false if vertical (scroll)
    clickSuppressed: false, // suppress click after drag
  })
  
  // Auto-scroll state
  const autoScrollRef = useRef({ active: false, frameId: null })
  
  // Tuning constants
  const DRAG_THRESHOLD_PX = 8
  const DIRECTION_LOCK_RATIO = 1.2
  const EDGE_SCROLL_ZONE_PX = 80
  const EDGE_SCROLL_MAX_SPEED = 12

  const pickIdFromPoint = useCallback((clientX, clientY) => {
    try {
      const el = document.elementFromPoint(clientX, clientY)
      const node = el?.closest?.('[data-photo-id]')
      const id = node?.getAttribute?.('data-photo-id')
      return id ? String(id) : null
    } catch {
      return null
    }
  }, [])

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current.frameId) {
      cancelAnimationFrame(autoScrollRef.current.frameId)
      autoScrollRef.current.frameId = null
    }
    autoScrollRef.current.active = false
  }, [])

  const startAutoScroll = useCallback((direction, speed) => {
    if (!listRef.current) return
    autoScrollRef.current.active = true
    
    const scroll = () => {
      if (!autoScrollRef.current.active) return
      const el = listRef.current
      if (!el) return
      
      if (direction === 'up') el.scrollTop -= speed
      else if (direction === 'down') el.scrollTop += speed
      
      // Continue hit-testing during auto-scroll
      if (dragGestureRef.current.active) {
        const g = dragGestureRef.current
        const id = pickIdFromPoint(g.lastX, g.lastY)
        if (id && !g.visited.has(id)) {
          g.visited.add(id)
          if (g.mode === 'select') setSelected(id, true)
          else setSelected(id, false)
        }
      }
      
      autoScrollRef.current.frameId = requestAnimationFrame(scroll)
    }
    
    scroll()
  }, [pickIdFromPoint, setSelected])

  const handleDragMove = useCallback((clientX, clientY) => {
    const g = dragGestureRef.current
    if (!g.active) return
    
    g.lastX = clientX
    g.lastY = clientY
    
    const deltaX = Math.abs(clientX - g.startX)
    const deltaY = Math.abs(clientY - g.startY)
    
    // Direction lock: decide if this is selection or scroll
    if (!g.locked) {
      if (deltaX < DRAG_THRESHOLD_PX && deltaY < DRAG_THRESHOLD_PX) return
      
      // Horizontal-ish => selection, Vertical-ish => scroll (allow native)
      if (deltaX > deltaY * DIRECTION_LOCK_RATIO) {
        g.isSelection = true
        g.locked = true
        setIsDragSelecting(true)
      } else if (deltaY >= deltaX * DIRECTION_LOCK_RATIO) {
        g.isSelection = false
        g.locked = true
        // Allow native scroll, stop drag-select
        g.active = false
        return
      }
    }
    
    // If locked as scroll, do nothing
    if (g.locked && !g.isSelection) return
    
    // Hit-test and apply mode
    const id = pickIdFromPoint(clientX, clientY)
    if (id && !g.visited.has(id)) {
      g.visited.add(id)
      g.clickSuppressed = true
      if (g.mode === 'select') setSelected(id, true)
      else setSelected(id, false)
    }
    
    // Auto-scroll if near edges
    const scrollContainer = listRef.current
    if (!scrollContainer) return
    
    const rect = scrollContainer.getBoundingClientRect()
    const relY = clientY - rect.top
    
    if (relY < EDGE_SCROLL_ZONE_PX) {
      const proximity = 1 - (relY / EDGE_SCROLL_ZONE_PX)
      const speed = Math.max(1, proximity * EDGE_SCROLL_MAX_SPEED)
      startAutoScroll('up', speed)
    } else if (relY > rect.height - EDGE_SCROLL_ZONE_PX) {
      const proximity = (relY - (rect.height - EDGE_SCROLL_ZONE_PX)) / EDGE_SCROLL_ZONE_PX
      const speed = Math.max(1, proximity * EDGE_SCROLL_MAX_SPEED)
      startAutoScroll('down', speed)
    } else {
      stopAutoScroll()
    }
  }, [pickIdFromPoint, setSelected, startAutoScroll, stopAutoScroll])

  const onGridPointerDown = useCallback((e) => {
    if (!isSelectionMode) return
    if (e.pointerType !== 'touch') return
    
    const id = pickIdFromPoint(e.clientX, e.clientY)
    if (!id) return
    
    e.preventDefault()
    
    const g = dragGestureRef.current
    g.active = true
    g.pointerId = e.pointerId
    g.startX = e.clientX
    g.startY = e.clientY
    g.lastX = e.clientX
    g.lastY = e.clientY
    g.mode = isSelected(id) ? 'deselect' : 'select'
    g.visited = new Set([id])
    g.locked = false
    g.isSelection = false
    g.clickSuppressed = false
    
    // Apply mode to starting item
    if (g.mode === 'select') setSelected(id, true)
    else setSelected(id, false)
    
    // Capture pointer
    try {
      gridRef.current?.setPointerCapture?.(e.pointerId)
    } catch {}
  }, [isSelectionMode, pickIdFromPoint, isSelected, setSelected])

  const onGridPointerMove = useCallback((e) => {
    const g = dragGestureRef.current
    if (!g.active) return
    if (e.pointerId !== g.pointerId) return
    
    e.preventDefault()
    handleDragMove(e.clientX, e.clientY)
  }, [handleDragMove])

  const onGridPointerEnd = useCallback(() => {
    const g = dragGestureRef.current
    if (!g.active) return
    
    g.active = false
    stopAutoScroll()
    setIsDragSelecting(false)
    
    // Suppress next click if we actually dragged
    if (g.clickSuppressed) {
      setTimeout(() => { g.clickSuppressed = false }, 100)
    }
  }, [stopAutoScroll])

  useEffect(() => {
    // iOS can restore scroll position between "screens" in an SPA; disable restoration for this route.
    try {
      if (typeof window !== 'undefined' && window.history && 'scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual'
      }
    } catch {}
  }, [])

  const scrollToTop = useCallback(() => {
    const el = listRef.current
    // iOS sometimes scrolls the page instead of the inner container; reset both defensively.
    try { window.scrollTo?.(0, 0) } catch {}
    try { document.documentElement.scrollTop = 0 } catch {}
    try { document.body.scrollTop = 0 } catch {}
    if (!el) return
    // iOS Safari can ignore scrollTo before layout is committed; force scrollTop and then try scrollTo.
    try { el.scrollTop = 0 } catch {}
    try { el.scrollTo?.({ top: 0, behavior: 'auto' }) } catch {}
    // extra frames for iOS (it can reapply scroll after paint / toolbar resize)
    try {
      requestAnimationFrame(() => {
        try { el.scrollTop = 0 } catch {}
        try { el.scrollTo?.({ top: 0, behavior: 'auto' }) } catch {}
        try { window.scrollTo?.(0, 0) } catch {}
        try { document.documentElement.scrollTop = 0 } catch {}
        try { document.body.scrollTop = 0 } catch {}
        try {
          requestAnimationFrame(() => {
            try { el.scrollTop = 0 } catch {}
            try { el.scrollTo?.({ top: 0, behavior: 'auto' }) } catch {}
          })
        } catch {}
      })
    } catch {}
    // one delayed retry (keyboard / safe-area changes can happen slightly later)
    try {
      setTimeout(() => {
        try { el.scrollTop = 0 } catch {}
        try { el.scrollTo?.({ top: 0, behavior: 'auto' }) } catch {}
        try { window.scrollTo?.(0, 0) } catch {}
      }, 80)
    } catch {}
  }, [])

  const loadFirstPage = useCallback(async () => {
    try {
      setIsLoading(true)
      setNextCursor(null)
      const { items: list, nextCursor: cursor } = await fetchPhotos({ apiBase, view: filter, limit: 60 })
      setItems(list)
      setNextCursor(cursor)
      clearSelection()
      scrollToTop()
    } finally {
      setIsLoading(false)
    }
  }, [apiBase, filter, clearSelection, scrollToTop])

  useEffect(() => {
    loadFirstPage()
    scrollToTop()
  }, [loadFirstPage])

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoading) return
    try {
      setIsLoading(true)
      const { items: more, nextCursor: cursor } = await fetchPhotos({ apiBase, view: filter, limit: 60, cursor: nextCursor })
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        const next = [...prev]
        for (const p of more) {
          if (!seen.has(p.id)) next.push(p)
        }
        return next
      })
      setNextCursor(cursor)
    } finally {
      setIsLoading(false)
    }
  }, [apiBase, filter, nextCursor, isLoading])

  const onScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight
    if (remaining < 800) loadMore()
  }, [loadMore])

  const openViewer = useCallback((index) => {
    setViewerIndex(index)
    setViewerOpen(true)
  }, [])

  const toggleFavorite = useCallback(
    async (photoId, nextValue) => {
      // optimistic update
      setItems((prev) => prev.map((p) => (String(p.id) === String(photoId) ? { ...p, is_favorite: nextValue } : p)))
      try {
        await setFavorite({ apiBase, photoId, value: nextValue })
      } catch {
        // rollback on failure
        setItems((prev) => prev.map((p) => (String(p.id) === String(photoId) ? { ...p, is_favorite: !nextValue } : p)))
      }
    },
    [apiBase]
  )

  const downloadOne = useCallback(async (photoId) => {
    const p = photos.find((x) => x.id === String(photoId))
    if (!p) return
    const resp = await fetch(p.fullUrl, { credentials: 'include' })
    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `photo-${photoId}.jpg`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [photos])

  const shareOne = useCallback(async (photoId) => {
    const p = photos.find((x) => x.id === String(photoId))
    if (!p) return
    if (!navigator.share) throw new Error('SHARE_NOT_SUPPORTED')
    const resp = await fetch(p.fullUrl, { credentials: 'include' })
    const blob = await resp.blob()
    const file = new File([blob], `photo-${photoId}.jpg`, { type: blob.type || 'image/jpeg' })
    await navigator.share({ files: [file], title: 'Share Photo' })
  }, [photos])

  const shareSelected = useCallback(async () => {
    if (!navigator.share) return
    const ids = Array.from(selectedIds)
    const files = []
    for (const id of ids.slice(0, 10)) { // safety cap
      const p = photos.find((x) => x.id === String(id))
      if (!p) continue
      const resp = await fetch(p.fullUrl, { credentials: 'include' })
      const blob = await resp.blob()
      files.push(new File([blob], `photo-${id}.jpg`, { type: blob.type || 'image/jpeg' }))
    }
    if (files.length > 0) await navigator.share({ files, title: 'Share Photos' })
    exitSelectionMode()
  }, [photos, selectedIds, exitSelectionMode])

  const downloadSelected = useCallback(async () => {
    const ids = Array.from(selectedIds)
    for (const id of ids) {
      try { await downloadOne(id) } catch {}
    }
    exitSelectionMode()
  }, [selectedIds, downloadOne, exitSelectionMode])

  return (
    <div className="mobile-root">
      <header className="mobile-header">
        <GalleryHeader
          eventName={eventName}
          photoCount={photos.length}
        />
        <FilterTabs
          value={filter}
          myLabel={personTagName ? `My Photos` : 'My Photos'}
          allLabel="All Photos"
          onChange={(v) => setFilter(v)}
        />
      </header>

      <main className={isSelectionMode ? 'mobile-main mobile-main--selection' : 'mobile-main'} ref={listRef} onScroll={onScroll}>
        <PhotoGrid
          gridRef={gridRef}
          photos={photos}
          isSelectionMode={isSelectionMode}
          isSelected={isSelected}
          onPhotoTap={(index) => {
            // Suppress tap if drag just happened
            if (dragGestureRef.current.clickSuppressed) {
              dragGestureRef.current.clickSuppressed = false
              return
            }
            if (isSelectionMode) toggleSelection(photos[index]?.id)
            else openViewer(index)
          }}
          onPhotoLongPress={(id) => {
            // Long-press only enters selection mode (not in selection mode yet)
            if (!isSelectionMode) {
              enterSelectionMode(id)
              try { navigator?.vibrate?.(10) } catch {}
            }
          }}
          onPhotoSelect={(id) => toggleSelection(id)}
          {/* Drag-to-select temporarily disabled */}
          onPointerDown={undefined}
          onPointerMove={undefined}
          onPointerUp={undefined}
          onPointerCancel={undefined}
          isDragSelecting={false}
          isLoading={isLoading}
        />
      </main>

      {isSelectionMode && (
        <SelectionBar
          selectedCount={selectedCount}
          onCancel={exitSelectionMode}
          onSelectAll={() => selectAllVisible(photos.map((p) => p.id))}
          onShare={shareSelected}
          onDownload={downloadSelected}
        />
      )}

      <PhotoViewer
        photos={photos}
        isOpen={viewerOpen}
        currentIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
        onIndexChange={setViewerIndex}
        onShare={(id) => shareOne(id).catch(() => {})}
        onDownload={(id) => downloadOne(id).catch(() => {})}
        onToggleFavorite={(id, next) => toggleFavorite(id, next)}
      />
    </div>
  )
}


