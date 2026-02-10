import { useCallback, useMemo, useState } from 'react'

export function usePhotoSelection() {
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const isSelectionMode = selectedIds.size > 0
  const selectedCount = selectedIds.size

  const isSelected = useCallback((id) => selectedIds.has(String(id)), [selectedIds])

  const setSelectionSet = useCallback((nextIds) => {
    if (nextIds instanceof Set) {
      setSelectedIds(new Set(Array.from(nextIds).map((x) => String(x))))
      return
    }
    if (Array.isArray(nextIds)) {
      setSelectedIds(new Set(nextIds.map((x) => String(x))))
      return
    }
    // fallback
    setSelectedIds(new Set())
  }, [])

  const setSelected = useCallback((id, value) => {
    const key = String(id)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (value) next.add(key)
      else next.delete(key)
      return next
    })
  }, [])

  const enterSelectionMode = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.add(String(id))
      return next
    })
  }, [])

  const exitSelectionMode = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const clearSelection = exitSelectionMode

  const toggleSelection = useCallback((id) => {
    setSelectedIds((prev) => {
      const key = String(id)
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const selectAllVisible = useCallback((ids) => {
    setSelectedIds(new Set((ids || []).map((x) => String(x))))
  }, [])

  return useMemo(() => ({
    isSelectionMode,
    selectedIds,
    selectedCount,
    isSelected,
    setSelectionSet,
    setSelected,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelection,
    selectAllVisible,
    clearSelection,
  }), [
    isSelectionMode,
    selectedIds,
    selectedCount,
    isSelected,
    setSelectionSet,
    setSelected,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelection,
    selectAllVisible,
    clearSelection,
  ])
}
