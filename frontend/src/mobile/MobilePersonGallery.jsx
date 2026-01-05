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

  const {
    isSelectionMode,
    selectedIds,
    selectedCount,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelection,
    isSelected,
    selectAllVisible,
    clearSelection,
  } = usePhotoSelection()

  const eventName = eventNameFallback

  const photos = useMemo(() => items.map((p) => mapPhoto(apiBase, p)), [items, apiBase])

  const loadFirstPage = useCallback(async () => {
    try {
      setIsLoading(true)
      setNextCursor(null)
      const { items: list, nextCursor: cursor } = await fetchPhotos({ apiBase, view: filter, limit: 60 })
      setItems(list)
      setNextCursor(cursor)
      clearSelection()
    } finally {
      setIsLoading(false)
    }
  }, [apiBase, filter, clearSelection])

  useEffect(() => {
    loadFirstPage()
    // scroll to top when switching filter
    try { listRef.current?.scrollTo?.({ top: 0 }) } catch {}
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
          photos={photos}
          isSelectionMode={isSelectionMode}
          isSelected={isSelected}
          onPhotoTap={(index) => {
            if (isSelectionMode) toggleSelection(photos[index]?.id)
            else openViewer(index)
          }}
          onPhotoLongPress={(id) => enterSelectionMode(id)}
          onPhotoSelect={(id) => toggleSelection(id)}
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


