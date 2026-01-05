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

  // Drag-to-select (Google Photos style)
  const [isDragSelecting, setIsDragSelecting] = useState(false)
  const dragActiveRef = useRef(false)
  const dragModeRef = useRef('select') // 'select' | 'deselect'
  const lastDragIdRef = useRef(null)
  const dragStartIndexRef = useRef(null)
  const dragSnapshotRef = useRef(new Set())

  const idToIndex = useMemo(() => {
    const m = new Map()
    for (let i = 0; i < photos.length; i += 1) m.set(String(photos[i]?.id), i)
    return m
  }, [photos])

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

    // Range apply: select everything from drag start to current index (diagonal-friendly).
    const startIdx = dragStartIndexRef.current
    const curIdx = idToIndex.get(String(id))
    if (typeof startIdx !== 'number' || typeof curIdx !== 'number') return
    const a = Math.min(startIdx, curIdx)
    const b = Math.max(startIdx, curIdx)
    const next = new Set(dragSnapshotRef.current)
    const shouldSelect = dragModeRef.current === 'select'
    for (let i = a; i <= b; i += 1) {
      const pid = photos[i]?.id
      if (pid == null) continue
      const key = String(pid)
      if (shouldSelect) next.add(key)
      else next.delete(key)
    }
    setSelectionSet(next)
  }, [pickIdFromPoint, idToIndex, photos, setSelectionSet])

  const startDragSelect = useCallback((id, pointerId, forceMode) => {
    if (!id) return
    const alreadySelected = isSelected(id)
    const mode = forceMode || (alreadySelected ? 'deselect' : 'select')
    dragModeRef.current = mode
    dragActiveRef.current = true
    lastDragIdRef.current = null
    setIsDragSelecting(true)

    // Snapshot selection for stable "range until current" behavior
    dragSnapshotRef.current = new Set(Array.from(selectedIds).map((x) => String(x)))
    const startIdx = idToIndex.get(String(id))
    dragStartIndexRef.current = (typeof startIdx === 'number') ? startIdx : null

    // Apply for the initial tile immediately (via snapshot-based range apply)
    lastDragIdRef.current = null
    try {
      const key = String(id)
      const next = new Set(dragSnapshotRef.current)
      if (mode === 'select') next.add(key)
      else next.delete(key)
      setSelectionSet(next)
    } catch {}
    lastDragIdRef.current = String(id)

    // Capture pointer so moves keep firing even if finger leaves the element.
    try {
      if (pointerId != null) {
        gridRef.current?.setPointerCapture?.(pointerId)
      }
    } catch {}
  }, [idToIndex, isSelected, selectedIds, setSelectionSet])

  const endDragSelect = useCallback(() => {
    dragActiveRef.current = false
    lastDragIdRef.current = null
    dragStartIndexRef.current = null
    setIsDragSelecting(false)
  }, [])

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
            if (isSelectionMode) toggleSelection(photos[index]?.id)
            else openViewer(index)
          }}
          onPhotoLongPress={(id, e) => {
            // Long-press enters selection mode and immediately allows dragging across tiles.
            if (!isSelectionMode) enterSelectionMode(id)
            const pe = e?.nativeEvent || e
            const pid = pe?.pointerId ?? null
            startDragSelect(id, pid, 'select')
          }}
          onPhotoSelect={(id) => toggleSelection(id)}
          onHoldDragStart={(id, pointerId) => {
            if (!isSelectionMode) return
            startDragSelect(id, pointerId ?? null, undefined)
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


