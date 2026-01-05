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
    selectAllVisible,
    clearSelection,
  } = usePhotoSelection()

  const eventName = eventNameFallback

  const photos = useMemo(() => items.map((p) => mapPhoto(apiBase, p)), [items, apiBase])

  // Drag-to-select (Google Photos style)
  const [isDragSelecting, setIsDragSelecting] = useState(false)
  const dragActiveRef = useRef(false)
  const dragModeRef = useRef('select') // 'select' | 'deselect'
  const lastDragIdRef = useRef(null)

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

  const applyDragAtEvent = useCallback((e) => {
    if (!dragActiveRef.current) return
    const ce = e?.nativeEvent || e
    const clientX = ce?.clientX ?? ce?.touches?.[0]?.clientX ?? ce?.changedTouches?.[0]?.clientX
    const clientY = ce?.clientY ?? ce?.touches?.[0]?.clientY ?? ce?.changedTouches?.[0]?.clientY
    if (typeof clientX !== 'number' || typeof clientY !== 'number') return
    const id = pickIdFromPoint(clientX, clientY)
    if (!id) return
    if (lastDragIdRef.current === id) return
    lastDragIdRef.current = id
    setSelected(id, dragModeRef.current === 'select')
  }, [pickIdFromPoint, setSelected])

  const startDragSelect = useCallback((id, e, forceMode) => {
    if (!id) return
    const alreadySelected = isSelected(id)
    const mode = forceMode || (alreadySelected ? 'deselect' : 'select')
    dragModeRef.current = mode
    dragActiveRef.current = true
    lastDragIdRef.current = null
    setIsDragSelecting(true)

    // Apply for the initial tile immediately
    setSelected(id, mode === 'select')
    lastDragIdRef.current = String(id)

    // Capture pointer so moves keep firing even if finger leaves the element.
    try {
      const pe = e?.nativeEvent || e
      const pid = pe?.pointerId
      if (pid != null) {
        gridRef.current?.setPointerCapture?.(pid)
      }
    } catch {}
  }, [isSelected, setSelected])

  const endDragSelect = useCallback(() => {
    dragActiveRef.current = false
    lastDragIdRef.current = null
    setIsDragSelecting(false)
  }, [])

  const scrollToTop = useCallback(() => {
    const el = listRef.current
    if (!el) return
    // iOS Safari can ignore scrollTo before layout is committed; force scrollTop and then try scrollTo.
    try { el.scrollTop = 0 } catch {}
    try { el.scrollTo?.({ top: 0, behavior: 'auto' }) } catch {}
    // one extra frame for iOS
    try {
      requestAnimationFrame(() => {
        try { el.scrollTop = 0 } catch {}
        try { el.scrollTo?.({ top: 0, behavior: 'auto' }) } catch {}
      })
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
            if (isSelectionMode) toggleSelection(photos[index]?.id)
            else openViewer(index)
          }}
          onPhotoLongPress={(id, e) => {
            // Long-press enters selection mode and immediately allows dragging across tiles.
            enterSelectionMode(id)
            startDragSelect(id, e, 'select')
          }}
          onPhotoSelect={(id) => toggleSelection(id)}
          onDragStart={(id, e) => {
            // When already in selection mode, allow finger drag across tiles to select/deselect.
            // Avoid starting drag select while not in selection mode (that would block normal scrolling).
            const pe = e?.nativeEvent || e
            if (!isSelectionMode) return
            if (pe?.pointerType === 'touch') {
              // prevent the synthetic click that would toggle twice on mobile
              try { e.preventDefault?.() } catch {}
              try { e.stopPropagation?.() } catch {}
            }
            startDragSelect(id, e, undefined)
          }}
          onDragMove={(e) => {
            if (!dragActiveRef.current) return
            try { e.preventDefault?.() } catch {}
            applyDragAtEvent(e)
          }}
          onDragEnd={() => endDragSelect()}
          isDragSelecting={isDragSelecting}
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


