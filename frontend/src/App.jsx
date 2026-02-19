import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { MobilePersonGallery } from './mobile/MobilePersonGallery'
import { AuthScreen } from './components/AuthScreen'

function useMobileDetect() {
  const get = () => {
    if (typeof window === 'undefined') return false
    // Width-based is good for phones, but can fail on mobile landscape or tablets.
    // Pointer coarse is a strong signal for touch-first devices.
    try {
      return (
        window.matchMedia('(max-width: 768px)').matches ||
        window.matchMedia('(pointer: coarse)').matches
      )
    } catch {
      return window.innerWidth <= 768
    }
  }
  const [isMobile, setIsMobile] = useState(get)
  useEffect(() => {
    const m = window.matchMedia('(max-width: 768px)')
    const p = window.matchMedia?.('(pointer: coarse)')
    const onChange = () => setIsMobile(m.matches)
    const onAnyChange = () => setIsMobile(m.matches || !!p?.matches)
    onAnyChange()
    m.addEventListener?.('change', onAnyChange)
    p?.addEventListener?.('change', onAnyChange)
    return () => {
      m.removeEventListener?.('change', onAnyChange)
      p?.removeEventListener?.('change', onAnyChange)
    }
  }, [])
  return isMobile
}

function App() {
  // When accessed via Cloudflare Tunnel (photo.crijman.com), the browser cannot reach
  // http://localhost:4000 (that would be the *client's* machine). Use same-origin /api
  // and let Vite proxy it to the backend container.
  const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  const API_BASE = isLocalHost
    ? (import.meta.env.VITE_API_URL || 'http://localhost:4000')
    : '/api'
  const [isAppAuthed, setIsAppAuthed] = useState(false)
  const [isCheckingAppAuth, setIsCheckingAppAuth] = useState(true)
  const [showAppLogin, setShowAppLogin] = useState(false)
  const [appPassword, setAppPassword] = useState('')
  const [appLoginError, setAppLoginError] = useState('')
  const [isSubmittingAppLogin, setIsSubmittingAppLogin] = useState(false)
  const [loginEventName, setLoginEventName] = useState('')
  const [loginAvatarUrl, setLoginAvatarUrl] = useState('')
  const [appPasswordMinLength, setAppPasswordMinLength] = useState(1)
  const [personPasswordMinLength, setPersonPasswordMinLength] = useState(1)

  const isSharePath = typeof window !== 'undefined' && (window.location.pathname || '').startsWith('/share/')

  const [photos, setPhotos] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [isLoadingPage, setIsLoadingPage] = useState(false)
  // Desktop Share View gallery switch: 'my' (tag-scoped) vs 'all' (entire event)
  const [shareGalleryView, setShareGalleryView] = useState('my')

  // Tags state per photo id (must be declared before usage)
  const [tagsById, setTagsById] = useState({})
  const [tagInput, setTagInput] = useState('')
  const [allTags, setAllTags] = useState([])
  const [renamingTag, setRenamingTag] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [tagMenu, setTagMenu] = useState({ open: false, x: 0, y: 0, tag: null })
  const [confirmDeleteTag, setConfirmDeleteTag] = useState(null) // string | string[]

  // Copy/paste tags helper (admin view). Hidden in Share View via existing UI conditions.
  const isDevTagCopy = true
  const [tagClipboard, setTagClipboard] = useState(null) // { photoId: number|string, tags: string[], at: number }
  const [tagClipboardConsumed, setTagClipboardConsumed] = useState(false) // hide "Copied N" pill after paste
  const [tagClipboardMsg, setTagClipboardMsg] = useState('')
  const [isApplyingClipboardTags, setIsApplyingClipboardTags] = useState(false)

  const [activeTags, setActiveTags] = useState([])
  const [tagAnchorIndex, setTagAnchorIndex] = useState(null)
  const tagRailRef = useRef(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectedIndices, setSelectedIndices] = useState(() => new Set())
  const [anchorIndex, setAnchorIndex] = useState(0)
  const gridRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isBulkUploading, setIsBulkUploading] = useState(false)
  const [bulkTotal, setBulkTotal] = useState(0)
  const [bulkDone, setBulkDone] = useState(0)
  // Virtualization removed for stability; keeping simple grid

  const [stats, setStats] = useState({ total: 0, completed: 0 })
  const [events, setEvents] = useState([])
  const [currentEventId, setCurrentEventId] = useState(null)
  const [currentEventName, setCurrentEventName] = useState('Default')
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [newEventName, setNewEventName] = useState('')
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [reopenSettingsOnEventCancel, setReopenSettingsOnEventCancel] = useState(false)
  const [showDeleteEvent, setShowDeleteEvent] = useState(false)
  const [isDeletingEvent, setIsDeletingEvent] = useState(false)
  const [reopenSettingsOnDeleteCancel, setReopenSettingsOnDeleteCancel] = useState(false)
  // Person view (share link) state
  const [isPersonView, setIsPersonView] = useState(false)
  const [shareToken, setShareToken] = useState('')
  const [showPersonLogin, setShowPersonLogin] = useState(false)
  const [personPassword, setPersonPassword] = useState('')
  const [personTagName, setPersonTagName] = useState('')
  const [personEventName, setPersonEventName] = useState('')
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false)
  const [personLoginError, setPersonLoginError] = useState('')
  const personLoginDoneRef = useRef(false)
  const shareInitRef = useRef(false)

  const [faces, setFaces] = useState([])
  const previewImgRef = useRef(null)
  const [previewSize, setPreviewSize] = useState({ w: 0, h: 0 })

  const isMobile = useMobileDetect()

  const checkAppAuth = useCallback(async () => {
    try {
      setIsCheckingAppAuth(true)
      const r = await fetch(`${API_BASE}/auth/status`, { credentials: 'include' })
      if (r.ok) {
        setIsAppAuthed(true)
        setShowAppLogin(false)
      } else {
        setIsAppAuthed(false)
        setShowAppLogin(true)
      }
    } catch {
      setIsAppAuthed(false)
      setShowAppLogin(true)
    } finally {
      setIsCheckingAppAuth(false)
    }
  }, [API_BASE])

  useEffect(() => {
    if (isSharePath) {
      // Share links: do NOT require the general app password gate.
      setIsAppAuthed(true)
      setIsCheckingAppAuth(false)
      setShowAppLogin(false)
      return
    }
    checkAppAuth()
  }, [checkAppAuth, isSharePath])

  const refreshLoginConfig = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/public/login-config`, { credentials: 'include' })
      if (!r.ok) return
      const j = await r.json()
      if (j?.current_event_name) setLoginEventName(String(j.current_event_name))
      if (typeof j?.app_password_min_length === 'number' && isFinite(j.app_password_min_length) && j.app_password_min_length > 0) {
        setAppPasswordMinLength(j.app_password_min_length)
      } else {
        setAppPasswordMinLength(1)
      }
      if (j?.avatar_url) {
        const v = j?.avatar_version ? `?v=${encodeURIComponent(j.avatar_version)}` : `?v=${Date.now()}`
        setLoginAvatarUrl(`${API_BASE}${String(j.avatar_url)}${v}`)
      } else {
        setLoginAvatarUrl('')
      }
    } catch {}
  }, [API_BASE])

  // Fetch public login config (event name + avatar) for the redesigned auth screen
  useEffect(() => { refreshLoginConfig() }, [refreshLoginConfig])

  // DEV: In admin view, tags must show the full DB-backed set, not just what's already loaded.
  // We achieve that by fetching `/photos?tags=...` from the backend; so `photos` is already filtered.
  const filteredPhotos = useMemo(() => photos, [photos])

  const completedCount = useMemo(() => {
    return stats.completed ?? filteredPhotos.filter((p) => p.completed).length
  }, [filteredPhotos, stats])

  const refreshStats = useCallback(async () => {
    try {
      const qs = activeTags && activeTags.length > 0 ? `?tags=${encodeURIComponent(activeTags.join(','))}` : ''
      const resp = await fetch(`${API_BASE}/stats${qs}`, { credentials: 'include' })
      if (resp.ok) {
        const json = await resp.json()
        setStats({ total: json.total || 0, completed: json.completed || 0 })
      }
    } catch (e) { console.error(e) }
  }, [API_BASE, activeTags])

  useEffect(() => {
    if (selectedIndex >= filteredPhotos.length) {
      setSelectedIndex(0)
    }
    // Clamp selection to available items when filter changes.
    // Note: selectedIndices stores selected photo IDs (as strings), not indices.
    setSelectedIndices((prev) => {
      const valid = new Set((filteredPhotos || []).map((p) => String(p?.id)))
      const next = new Set()
      for (const id of prev || []) {
        const key = String(id)
        if (valid.has(key)) next.add(key)
      }
      // Ensure we always have a focused selection when there are photos.
      if (next.size === 0 && filteredPhotos.length > 0) {
        const pick = filteredPhotos[Math.min(selectedIndex, filteredPhotos.length - 1)]?.id ?? filteredPhotos[0]?.id
        if (pick != null) next.add(String(pick))
      }
      return next
    })
  }, [filteredPhotos.length, selectedIndex])

  const selected = filteredPhotos[selectedIndex]

  const selectedTags = useMemo(() => tagsById[selected?.id] || [], [tagsById, selected])

  const [debouncedTagInput, setDebouncedTagInput] = useState('')
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTagInput(tagInput), 150)
    return () => clearTimeout(t)
  }, [tagInput])

  const suggestions = useMemo(() => {
    const q = debouncedTagInput.trim().toLowerCase()
    if (!q) return []
    return allTags
      .filter((t) => t.toLowerCase().includes(q))
      .filter((t) => !selectedTags.map((s) => s.toLowerCase()).includes(t.toLowerCase()))
      .slice(0, 8)
  }, [allTags, selectedTags, debouncedTagInput])

  useEffect(() => {
    if (suggestions.length > 0) setHighlightedSuggestion(0); else setHighlightedSuggestion(-1)
  }, [suggestions])

  const addTag = useCallback(
    async (newTag) => {
      const tag = newTag.trim()
      if (!selected?.id || !tag) return
      // normalize to existing casing if tag exists in global list
      const existing = allTags.find((t) => t.toLowerCase() === tag.toLowerCase())
      const normalizedTag = existing || tag
      const photoId = selected.id
      const prev = tagsById[photoId] || []
      // optimistic
      setTagsById((p) => ({
        ...p,
        [photoId]: prev.some((t) => t.toLowerCase() === normalizedTag.toLowerCase()) ? prev : [...prev, normalizedTag],
      }))
      setAllTags((prevAll) => (prevAll.some((t) => t.toLowerCase() === normalizedTag.toLowerCase()) ? prevAll : [...prevAll, normalizedTag]))
      setTagInput('')
      try {
        const resp = await fetch(`${API_BASE}/photos/${photoId}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag: normalizedTag }),
          credentials: 'include',
        })
        if (!resp.ok) throw new Error('Failed to add tag')
        const updated = await resp.json()
        setTagsById((p) => ({ ...p, [updated.id]: updated.tags || [] }))
      } catch (e) {
        console.error(e)
        // rollback
        setTagsById((p) => ({ ...p, [photoId]: prev }))
      }
    },
    [API_BASE, selected, tagsById, allTags]
  )

  const removeTag = useCallback(
    async (tagToRemove) => {
      if (!selected?.id) return
      const photoId = selected.id
      const prev = tagsById[photoId] || []
      const canonical = (prev.find((t) => t.toLowerCase() === tagToRemove.toLowerCase())) || tagToRemove
      // optimistic
      setTagsById((p) => ({ ...p, [photoId]: prev.filter((t) => t.toLowerCase() !== canonical.toLowerCase()) }))
      try {
        // Avoid DELETE bodies (some proxies/clients drop them). Use query param.
        const url = `${API_BASE}/photos/${photoId}/tags?tag=${encodeURIComponent(canonical)}`
        const resp = await fetch(url, {
          method: 'DELETE',
          credentials: 'include',
        })
        if (!resp.ok) throw new Error('Failed to remove tag')
        const updated = await resp.json()
        setTagsById((p) => ({ ...p, [updated.id]: updated.tags || [] }))
      } catch (e) {
        console.error(e)
        // rollback
        setTagsById((p) => ({ ...p, [photoId]: prev }))
      }
    },
    [API_BASE, selected, tagsById]
  )

  useEffect(() => {
    if (!tagClipboardMsg) return
    const t = setTimeout(() => setTagClipboardMsg(''), 4000)
    return () => clearTimeout(t)
  }, [tagClipboardMsg])

  const applyTagsToPhoto = useCallback(
    async (photoIdRaw, desiredTagsRaw) => {
      const photoId = photoIdRaw
      if (photoId == null) return
      const desiredInput = Array.isArray(desiredTagsRaw) ? desiredTagsRaw : []

      // Normalize + de-dupe (case-insensitive). Prefer existing global casing if present.
      const byLower = new Map()
      for (const raw of desiredInput) {
        const t0 = String(raw || '').trim()
        if (!t0) continue
        const existing = allTags.find((t) => t.toLowerCase() === t0.toLowerCase())
        const canonical = existing || t0
        const key = canonical.toLowerCase()
        if (!byLower.has(key)) byLower.set(key, canonical)
      }
      const desired = Array.from(byLower.values())

      const prev = tagsById[photoId] || []
      const prevLower = new Set(prev.map((t) => String(t).toLowerCase()))
      const desiredLower = new Set(desired.map((t) => String(t).toLowerCase()))
      const toRemove = prev.filter((t) => !desiredLower.has(String(t).toLowerCase()))
      const toAdd = desired.filter((t) => !prevLower.has(String(t).toLowerCase()))

      // No-op
      if (toRemove.length === 0 && toAdd.length === 0) return

      // Optimistic: set tags and ensure global list includes them.
      setTagsById((p) => ({ ...p, [photoId]: desired }))
      setAllTags((prevAll) => {
        const next = [...prevAll]
        for (const t of desired) {
          if (!next.some((x) => x.toLowerCase() === String(t).toLowerCase())) next.push(t)
        }
        return next
      })

      try {
        for (const t of toRemove) {
          const url = `${API_BASE}/photos/${photoId}/tags?tag=${encodeURIComponent(t)}`
          const resp = await fetch(url, {
            method: 'DELETE',
            credentials: 'include',
          })
          if (!resp.ok) throw new Error('Failed to remove tag')
        }
        for (const t of toAdd) {
          const resp = await fetch(`${API_BASE}/photos/${photoId}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tag: t }),
            credentials: 'include',
          })
          if (!resp.ok) throw new Error('Failed to add tag')
        }
      } catch (e) {
        console.error(e)
        // rollback
        setTagsById((p) => ({ ...p, [photoId]: prev }))
        throw e
      }
    },
    [API_BASE, allTags, tagsById]
  )

  const copySelectedTagsToClipboard = useCallback(() => {
    if (!selected?.id) return
    const list = (tagsById[selected.id] || []).slice()
    // UX: when copying again, briefly clear the pill so it doesn't look "stuck" on old value.
    setTagClipboard(null)
    setTagClipboardConsumed(false)
    requestAnimationFrame(() => {
      setTagClipboard({ photoId: selected.id, tags: list, at: Date.now() })
    })
    setTagClipboardMsg(`Copied ${list.length} tag${list.length === 1 ? '' : 's'}`)
  }, [selected, tagsById])

  const pasteClipboardTagsToSelected = useCallback(async () => {
    if (!selected?.id) return
    if (!tagClipboard) return
    const targetId = selected.id
    const sourceId = tagClipboard.photoId
    if (String(targetId) === String(sourceId)) return

    const desired = Array.isArray(tagClipboard.tags) ? tagClipboard.tags : []
    const current = tagsById[targetId] || []
    if (desired.length === 0 && current.length > 0) {
      // minimal safety: avoid accidentally wiping tags without intent
      const ok = window.confirm('Paste will remove all tags from this photo. Continue?')
      if (!ok) return
    }

    setIsApplyingClipboardTags(true)
    try {
      await applyTagsToPhoto(targetId, desired)
      setTagClipboardMsg(`Pasted ${desired.length} tag${desired.length === 1 ? '' : 's'}`)
      // Hide the "Copied N" pill after paste (keeps clipboard available for additional pastes).
      setTagClipboardConsumed(true)
    } finally {
      setIsApplyingClipboardTags(false)
    }
  }, [applyTagsToPhoto, selected, tagClipboard, tagsById])

  const renameTag = useCallback(
    async (oldName, newNameRaw) => {
      const newName = (newNameRaw || '').trim()
      if (!oldName || !newName) { setRenamingTag(null); setRenameValue(''); return }
      const oldLower = String(oldName).toLowerCase()
      const newLower = newName.toLowerCase()
      if (oldLower === newLower) { setRenamingTag(null); setRenameValue(''); return }
      try {
        const resp = await fetch(`${API_BASE}/tags/${encodeURIComponent(oldName)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newName }),
          credentials: 'include'
        })
        if (!resp.ok) throw new Error('Rename failed')
        const json = await resp.json()
        const serverTags = (json && Array.isArray(json.tags)) ? json.tags.map((t) => t.name) : allTags
        setAllTags(serverTags)
        // determine final casing of target
        const finalName = serverTags.find((n) => n.toLowerCase() === newLower) || newName
        // update active filters
        setActiveTags((prev) => {
          const mapped = prev.map((n) => (n.toLowerCase() === oldLower ? finalName : n))
          // dedupe (case-insensitive)
          const out = []
          const seen = new Set()
          for (const n of mapped) {
            const key = n.toLowerCase()
            if (!seen.has(key)) { seen.add(key); out.push(n) }
          }
          return out
        })
        // update per-photo tags map
        setTagsById((prev) => {
          const next = { ...prev }
          for (const pid of Object.keys(next)) {
            const list = next[pid] || []
            const replaced = []
            const seen = new Set()
            for (const tag of list) {
              const val = tag.toLowerCase() === oldLower ? finalName : tag
              const key = String(val).toLowerCase()
              if (!seen.has(key)) { seen.add(key); replaced.push(val) }
            }
            next[pid] = replaced
          }
          return next
        })
      } catch (e) {
        console.error(e)
      } finally {
        setRenamingTag(null)
        setRenameValue('')
      }
    },
    [API_BASE, allTags]
  )

  const deleteTag = useCallback(
    async (name) => {
      const tag = (name || '').trim()
      if (!tag) { setTagMenu({ open: false, x: 0, y: 0, tag: null }); return }
      try {
        const resp = await fetch(`${API_BASE}/tags/${encodeURIComponent(tag)}`, { method: 'DELETE', credentials: 'include' })
        if (!resp.ok) throw new Error('Delete tag failed')
        const json = await resp.json()
        const serverTags = (json && Array.isArray(json.tags)) ? json.tags.map((t) => t.name) : (allTags.filter((t) => t.toLowerCase() !== tag.toLowerCase()))
        setAllTags(serverTags)
        // remove from active filters
        setActiveTags((prev) => prev.filter((n) => n.toLowerCase() !== tag.toLowerCase()))
        // remove from per-photo tags
        setTagsById((prev) => {
          const next = { ...prev }
          for (const pid of Object.keys(next)) {
            const list = next[pid] || []
            next[pid] = list.filter((t) => t.toLowerCase() !== tag.toLowerCase())
          }
          return next
        })
      } catch (e) {
        console.error(e)
      } finally {
        setTagMenu({ open: false, x: 0, y: 0, tag: null })
        setConfirmDeleteTag(null)
      }
    },
    [API_BASE, allTags]
  )

  const deleteTags = useCallback(
    async (names) => {
      const list = Array.isArray(names) ? names : [names]
      const toDelete = Array.from(new Map(list.map((n) => [String(n).toLowerCase(), n])).values())
      try {
        for (const n of toDelete) {
          const tag = (n || '').trim()
          if (!tag) continue
          const resp = await fetch(`${API_BASE}/tags/${encodeURIComponent(tag)}`, { method: 'DELETE', credentials: 'include' })
          if (!resp.ok) throw new Error('Delete tag failed')
        }
        // Refresh tags list from server once
        const tagsResp = await fetch(`${API_BASE}/tags`, { credentials: 'include' })
        if (tagsResp.ok) {
          const tagsJson = await tagsResp.json()
          setAllTags((tagsJson || []).map((t) => t.name))
        } else {
          // Fallback local removal
          setAllTags((prev) => prev.filter((t) => !toDelete.some((d) => d.toLowerCase() === t.toLowerCase())))
        }
        // remove from active filters
        setActiveTags((prev) => prev.filter((n) => !toDelete.some((d) => d.toLowerCase() === n.toLowerCase())))
        // remove from per-photo tags
        setTagsById((prev) => {
          const next = { ...prev }
          for (const pid of Object.keys(next)) {
            const list = next[pid] || []
            next[pid] = list.filter((t) => !toDelete.some((d) => d.toLowerCase() === t.toLowerCase()))
          }
          return next
        })
      } catch (e) {
        console.error(e)
      } finally {
        setTagMenu({ open: false, x: 0, y: 0, tag: null })
        setConfirmDeleteTag(null)
      }
    },
    [API_BASE]
  )

  const onTagInputKeyDown = useCallback(
    (e) => {
      // Shift+Space to accept autocomplete (not Ctrl+Space)
      if ((e.key === ' ' || e.key === 'Spacebar' || e.key === 'Space') && e.shiftKey && !e.ctrlKey) {
        if (suggestions.length > 0) {
          e.preventDefault()
          const pick = highlightedSuggestion >= 0 ? suggestions[highlightedSuggestion] : suggestions[0]
          if (pick) addTag(pick)
        }
        return
      }
      if (e.key === 'ArrowDown') {
        if (suggestions.length > 0) {
          e.preventDefault()
          setHighlightedSuggestion((i) => (i + 1) % suggestions.length)
        }
        return
      }
      if (e.key === 'ArrowUp') {
        if (suggestions.length > 0) {
          e.preventDefault()
          setHighlightedSuggestion((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
        }
        return
      }
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        if (suggestions.length > 0 && highlightedSuggestion >= 0) {
          const pick = suggestions[highlightedSuggestion]
          if (pick) { addTag(pick); return }
        }
        if (tagInput.trim()) addTag(tagInput)
      } else if (e.key === 'Backspace' && !tagInput) {
        const last = selectedTags[selectedTags.length - 1]
        if (last) removeTag(last)
      }
    },
    [addTag, removeTag, selectedTags, tagInput, suggestions, highlightedSuggestion]
  )

  const markCompleted = useCallback(async () => {
    const current = filteredPhotos[selectedIndex]
    if (!current) return
    const nextIndex = Math.min(selectedIndex + 1, filteredPhotos.length - 1)
    try {
      if (!current.completed) {
        setPhotos((prev) => prev.map((p) => (p.id === current.id ? { ...p, completed: true } : p)))
        const resp = await fetch(`${API_BASE}/photos/${current.id}/complete`, { method: 'POST', credentials: 'include' })
        if (resp.ok) {
          const updated = await resp.json()
          setPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
        }
      } else {
        setPhotos((prev) => prev.map((p) => (p.id === current.id ? { ...p, completed: false } : p)))
        const resp = await fetch(`${API_BASE}/photos/${current.id}/incomplete`, { method: 'POST', credentials: 'include' })
        if (resp.ok) {
          const updated = await resp.json()
          setPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      // Only advance on marking complete, stay on same when unmarking
      if (!current.completed) {
        setSelectedIndex(nextIndex)
        const pid = filteredPhotos[nextIndex]?.id
        setSelectedIndices(pid != null ? new Set([String(pid)]) : new Set())
        setAnchorIndex(nextIndex)
      }
      try { await refreshStats() } catch {}
    }
  }, [API_BASE, filteredPhotos, selectedIndex, refreshStats])

  const handleArrowNavigation = useCallback(
    (event) => {
      if (event.key === 'Enter' && event.metaKey) {
        event.preventDefault()
        markCompleted()
        return
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && event.metaKey) {
        if (selectedIndices.size > 0) {
          setShowDelete(true)
        }
        return
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const hasShift = event.shiftKey
        setSelectedIndex((currentIndex) => {
          let delta = 0
          if (event.key === 'ArrowRight') delta = 1
          else if (event.key === 'ArrowLeft') delta = -1
          else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            // Compute columns from grid container
            const container = gridRef.current
            const style = container ? getComputedStyle(container) : null
            const gapPx = style ? parseInt(style.gap || style.gridColumnGap || '12', 10) : 12
            const paddingLeft = style ? parseInt(style.paddingLeft || '0', 10) : 0
            const paddingRight = style ? parseInt(style.paddingRight || '0', 10) : 0
            const innerWidth = container ? (container.clientWidth - paddingLeft - paddingRight) : 0
            const colWidth = 120
            const cols = Math.max(1, Math.floor((innerWidth + gapPx) / (colWidth + gapPx)))
            delta = (event.key === 'ArrowDown') ? cols : -cols
          }

          const nextIndex = Math.max(0, Math.min(currentIndex + delta, filteredPhotos.length - 1))
          if (hasShift) {
            const start = Math.min(anchorIndex ?? currentIndex, nextIndex)
            const end = Math.max(anchorIndex ?? currentIndex, nextIndex)
            const nextSet = new Set(selectedIndices)
            for (let i = start; i <= end; i++) {
              const pid = filteredPhotos[i]?.id
              if (pid != null) nextSet.add(String(pid))
            }
            setSelectedIndices(nextSet)
          } else {
            const pid = filteredPhotos[nextIndex]?.id
            setSelectedIndices(pid != null ? new Set([String(pid)]) : new Set())
            setAnchorIndex(nextIndex)
          }
          return nextIndex
        })
      }
    },
    [anchorIndex, filteredPhotos.length, selectedIndices, markCompleted, selectedIndex]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleArrowNavigation)
    return () => window.removeEventListener('keydown', handleArrowNavigation)
  }, [handleArrowNavigation])

  useEffect(() => {
    const selectedElement = document.querySelector(`.thumb-btn[data-index="${selectedIndex}"]`)
    if (selectedElement && 'scrollIntoView' in selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
  }, [selectedIndex])

  // Preload next/previous preview images for smoother nav
  useEffect(() => {
    if (!selected) return
    const preload = (p) => {
      if (!p) return
      const img = new Image()
      img.src = p.url || `${API_BASE}/uploads/${p.filename}`
    }
    preload(filteredPhotos[selectedIndex + 1])
    preload(filteredPhotos[selectedIndex - 1])
  }, [API_BASE, filteredPhotos, selected, selectedIndex])

  // No virtualization sizing listeners needed

  // Initial load: fetch first page and tags
  const loadCoreData = useCallback(async ({ view } = {}) => {
    try {
      // In Share View, "All Photos" must always fetch with view=all, even for background refreshes.
      const effectiveView = view ?? (isPersonView && shareGalleryView === 'all' ? 'all' : undefined)
      const viewQs = effectiveView === 'all' ? '&view=all' : ''
      // DEV: admin tag filtering should be DB-backed, not client-side.
      const tagsQs =
        (!isPersonView && Array.isArray(activeTags) && activeTags.length > 0)
          ? `&tags=${encodeURIComponent(activeTags.join(','))}`
          : ''
      const photosUrl = `${API_BASE}/photos?limit=50${viewQs}${tagsQs}`
      const [photosResp, tagsResp] = await Promise.all([
        fetch(photosUrl, { credentials: 'include' }),
        fetch(`${API_BASE}/tags`, { credentials: 'include' })
      ])
      if (photosResp.status === 401 || tagsResp.status === 401) {
        setIsAppAuthed(false)
        setShowAppLogin(true)
        return
      }
      const photosJson = photosResp.ok ? await photosResp.json() : { items: [] }
      const tagsJson = tagsResp.ok ? await tagsResp.json() : []
      const firstItems = Array.isArray(photosJson) ? photosJson : photosJson.items || []
      setPhotos(firstItems)
      setNextCursor(photosJson.nextCursor || null)
      const initialMap = {}
      for (const p of firstItems || []) {
        initialMap[p.id] = Array.isArray(p.tags) ? p.tags : []
      }
      setTagsById(initialMap)
      setAllTags((tagsJson || []).map((t) => t.name))
    } catch (e) {
      console.error('Failed to load data', e)
    }
  }, [API_BASE, activeTags, isPersonView, shareGalleryView])

  const loadEvents = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE}/events`, { credentials: 'include' })
      if (!resp.ok) return
      const json = await resp.json()
      setEvents(json || [])
    } catch (e) { console.error(e) }
  }, [API_BASE])

  const loadSettingsAndEvents = useCallback(async () => {
    try {
      const [settingsResp, eventsResp] = await Promise.all([
        fetch(`${API_BASE}/settings`, { credentials: 'include' }),
        fetch(`${API_BASE}/events`, { credentials: 'include' })
      ])
      if (settingsResp.status === 401 || eventsResp.status === 401) {
        setIsAppAuthed(false)
        setShowAppLogin(true)
        return
      }
      if (eventsResp.ok) setEvents(await eventsResp.json())
      if (settingsResp.ok) {
        const s = await settingsResp.json()
        setSettingsPrompt(s.system_prompt || '')
        setSettingsModel(s.model || 'gpt-4o-mini')
        if (s.current_event_id) setCurrentEventId(s.current_event_id)
        if (s.current_event_name) setCurrentEventName(s.current_event_name)
      }
    } catch (e) { console.error(e) }
  }, [API_BASE])

  useEffect(() => {
    if (!isAppAuthed) return
    loadSettingsAndEvents()
  }, [isAppAuthed, loadSettingsAndEvents])

  useEffect(() => {
    if (!isAppAuthed) return
    loadCoreData()
    refreshStats()
  }, [API_BASE, currentEventId, isAppAuthed, loadCoreData, refreshStats])

  // Reload photos when activeTags changes (admin view only)
  // Use stringified version to ensure React detects changes properly
  const activeTagsKey = Array.isArray(activeTags) ? [...activeTags].sort().join(',') : ''
  useEffect(() => {
    if (!isAppAuthed) return
    if (isPersonView) return // Don't reload in person view, it has its own logic
    // Reset cursor when tags change to start fresh pagination
    setNextCursor(null)
    setSelectedIndex(0)
    setSelectedIndices(new Set())
    // Force reload by calling loadCoreData with current activeTags
    loadCoreData()
  }, [activeTagsKey, isAppAuthed, isPersonView, loadCoreData])

  // Detect /share/:token and initialize person view flow
  useEffect(() => {
    try {
      if (!isAppAuthed) return
      const path = window.location.pathname || ''
      const parts = path.split('/').filter(Boolean)
      if (parts[0] === 'share' && parts[1]) {
        const token = parts[1]
        setShareToken(token)
        ;(async () => {
          try {
            if (shareInitRef.current) return
            shareInitRef.current = true
            // Prefetch public info for nicer UX
            try {
              const info = await fetch(`${API_BASE}/share/${token}/info`, { credentials: 'include' })
              if (info.ok) {
                const ij = await info.json()
                setPersonTagName(ij.tag_name || '')
                setPersonEventName(ij.event_name || '')
                if (typeof ij?.person_password_min_length === 'number' && isFinite(ij.person_password_min_length) && ij.person_password_min_length > 0) {
                  setPersonPasswordMinLength(ij.person_password_min_length)
                } else {
                  setPersonPasswordMinLength(1)
                }
              }
            } catch {}
            const me = await fetch(`${API_BASE}/me`, { credentials: 'include' })
            const mj = me.ok ? await me.json() : { personScope: null }
            if (mj.personScope) {
              setIsPersonView(true)
              // Load the single tag name
              const tr = await fetch(`${API_BASE}/tags`, { credentials: 'include' })
              if (tr.ok) {
                const list = await tr.json()
                if (Array.isArray(list) && list[0]) {
                  const tname = list[0].name || ''
                  setPersonTagName(tname)
                  setActiveTags([tname])
                  setShareGalleryView('my')
                }
              }
              await loadCoreData({ view: 'my' })
              await refreshStats()
            } else {
              if (!personLoginDoneRef.current) setShowPersonLogin(true)
            }
          } catch {}
        })()
      } else {
        setIsPersonView(false)
      }
    } catch {}
  }, [API_BASE, isAppAuthed, loadCoreData, refreshStats])

  const submitAppLogin = useCallback(async () => {
    const pwd = String(appPassword || '')
    if (!pwd.trim()) return
    try {
      setIsSubmittingAppLogin(true)
      setAppLoginError('')
      const r = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
        credentials: 'include',
      })
      if (r.ok) {
        setIsAppAuthed(true)
        setShowAppLogin(false)
        setAppPassword('')
        await loadSettingsAndEvents()
        await loadCoreData()
        await refreshStats()
      } else {
        setIsAppAuthed(false)
        setShowAppLogin(true)
        setAppLoginError('Invalid password')
      }
    } catch {
      setAppLoginError('Network error. Please try again.')
    } finally {
      setIsSubmittingAppLogin(false)
    }
  }, [API_BASE, appPassword, loadCoreData, loadSettingsAndEvents, refreshStats])

  // Infinite scroll loader
  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingPage) return
    try {
      setIsLoadingPage(true)
      const viewQs = (isPersonView && shareGalleryView === 'all') ? '&view=all' : ''
      const tagsQs =
        (!isPersonView && Array.isArray(activeTags) && activeTags.length > 0)
          ? `&tags=${encodeURIComponent(activeTags.join(','))}`
          : ''
      const resp = await fetch(`${API_BASE}/photos?limit=50&cursor=${encodeURIComponent(nextCursor)}${viewQs}${tagsQs}`, { credentials: 'include' })
      if (!resp.ok) return
      const json = await resp.json()
      const items = Array.isArray(json) ? json : json.items || []
      setPhotos((prev) => [...prev, ...items])
      setNextCursor(json.nextCursor || null)
      setTagsById((prev) => {
        const map = { ...prev }
        for (const p of items) map[p.id] = Array.isArray(p.tags) ? p.tags : []
        return map
      })
    } finally {
      setIsLoadingPage(false)
    }
  }, [API_BASE, activeTags, isLoadingPage, isPersonView, nextCursor, shareGalleryView])

  useEffect(() => {
    refreshStats()
  }, [refreshStats, filteredPhotos.length])

  useEffect(() => {
    refreshStats()
  }, [activeTags, refreshStats])

  // Delete modal state
  const [showDelete, setShowDelete] = useState(false)
  const deleteCount = selectedIndices.size
  const [showSettings, setShowSettings] = useState(false)
  const [settingsPrompt, setSettingsPrompt] = useState('')
  const [settingsModel, setSettingsModel] = useState('gpt-4o-mini')
  const [loginAvatarPhotoId, setLoginAvatarPhotoId] = useState(null)
  const loginAvatarPreviewUrl = useMemo(() => {
    if (!loginAvatarPhotoId) return ''
    const pid = String(loginAvatarPhotoId)
    const p = (photos || []).find((x) => String(x?.id) === pid)
    if (!p) return `${API_BASE}/public/login-avatar?v=${encodeURIComponent(pid)}`
    return p.thumb_filename
      ? `${API_BASE}/uploads/${p.thumb_filename}`
      : (p.preview_filename ? `${API_BASE}/uploads/${p.preview_filename}` : (p.url || `${API_BASE}/uploads/${p.filename}`))
  }, [API_BASE, loginAvatarPhotoId, photos])
  const [personPasswordInput, setPersonPasswordInput] = useState('')
  const [isSavingPersonPassword, setIsSavingPersonPassword] = useState(false)
  const [shareLinks, setShareLinks] = useState([])
  const [isLoadingShareLinks, setIsLoadingShareLinks] = useState(false)
  const [linkTagToCreate, setLinkTagToCreate] = useState('')
  const [isCreatingLink, setIsCreatingLink] = useState(false)
  const [showShareManager, setShowShareManager] = useState(false)

  const loadSettings = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE}/settings`, { credentials: 'include' })
      if (!resp.ok) return
      const json = await resp.json()
      setSettingsPrompt(json.system_prompt || '')
      setSettingsModel(json.model || 'gpt-4o-mini')
      setLoginAvatarPhotoId(json.login_avatar_photo_id ?? null)
      if (json.current_event_id) setCurrentEventId(json.current_event_id)
      if (json.current_event_name) setCurrentEventName(json.current_event_name)
      await loadEvents()
      // load share links
      try {
        setIsLoadingShareLinks(true)
        const rl = await fetch(`${API_BASE}/share-links`, { credentials: 'include' })
        if (rl.ok) setShareLinks(await rl.json())
      } catch (e) { console.error(e) } finally { setIsLoadingShareLinks(false) }
    } catch (e) { console.error(e) }
  }, [API_BASE, loadEvents])

  const saveSettings = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE}/settings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_prompt: settingsPrompt, model: settingsModel, login_avatar_photo_id: loginAvatarPhotoId }),
        credentials: 'include'
      })
      if (resp.ok) {
        setShowSettings(false)
        // Ensure the login screen updates immediately.
        await refreshLoginConfig()
      }
    } catch (e) { console.error(e) }
  }, [API_BASE, settingsPrompt, settingsModel, loginAvatarPhotoId, refreshLoginConfig])

  const savePersonPassword = useCallback(async () => {
    try {
      setIsSavingPersonPassword(true)
      const resp = await fetch(`${API_BASE}/settings/person-view-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: personPasswordInput || null }),
        credentials: 'include'
      })
      if (resp.ok) setPersonPasswordInput('')
    } catch (e) { console.error(e) }
    finally { setIsSavingPersonPassword(false) }
  }, [API_BASE, personPasswordInput])

  const refreshShareLinks = useCallback(async () => {
    try {
      setIsLoadingShareLinks(true)
      const rl = await fetch(`${API_BASE}/share-links`, { credentials: 'include' })
      if (rl.ok) setShareLinks(await rl.json())
    } catch (e) { console.error(e) } finally { setIsLoadingShareLinks(false) }
  }, [API_BASE])

  const createShareLink = useCallback(async () => {
    const tagName = (linkTagToCreate || '').trim()
    if (!tagName) return
    try {
      setIsCreatingLink(true)
      const resp = await fetch(`${API_BASE}/share-links`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tag_name: tagName }), credentials: 'include' })
      if (!resp.ok) throw new Error('Failed to create link')
      await refreshShareLinks()
    } catch (e) { console.error(e) } finally { setIsCreatingLink(false) }
  }, [API_BASE, linkTagToCreate, refreshShareLinks])

  const revokeShareLink = useCallback(async (id) => {
    try {
      const resp = await fetch(`${API_BASE}/share-links/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!resp.ok) throw new Error('Failed to revoke')
      await refreshShareLinks()
    } catch (e) { console.error(e) }
  }, [API_BASE, refreshShareLinks])

  const setCurrentEvent = useCallback(async (eventId, fallbackName) => {
    try {
      const resp = await fetch(`${API_BASE}/settings/event`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId }),
        credentials: 'include'
      })
      if (resp.ok) {
        setCurrentEventId(eventId)
        const found = events.find((e) => e.id === eventId)
        setCurrentEventName(found?.name || fallbackName || currentEventName)
        await loadCoreData()
        await refreshStats()
      }
    } catch (e) { console.error(e) }
  }, [API_BASE, events, loadCoreData, refreshStats, currentEventName])

  const createEventSubmit = useCallback(async () => {
    const name = (newEventName || '').trim()
    if (!name) return
    try {
      setIsCreatingEvent(true)
      const resp = await fetch(`${API_BASE}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }), credentials: 'include' })
      if (!resp.ok) throw new Error('Failed to create event')
      const ev = await resp.json()
      setEvents((prev) => (Array.isArray(prev) ? [...prev, ev] : [ev]))
      await setCurrentEvent(ev.id, ev.name)
      setShowNewEvent(false)
      setShowSettings(false)
      setReopenSettingsOnEventCancel(false)
    } catch (e) { console.error(e) }
    finally { setIsCreatingEvent(false) }
  }, [API_BASE, newEventName, setCurrentEvent])

  const cancelNewEventModal = useCallback(() => {
    setShowNewEvent(false)
    if (reopenSettingsOnEventCancel) setShowSettings(true)
    setReopenSettingsOnEventCancel(false)
  }, [reopenSettingsOnEventCancel])

  const openDeleteEventModal = useCallback(() => {
    if (!currentEventId) return
    if (String(currentEventName).toLowerCase() === 'default') return
    setReopenSettingsOnDeleteCancel(true)
    setShowSettings(false)
    setShowDeleteEvent(true)
  }, [currentEventId, currentEventName])

  const cancelDeleteEventModal = useCallback(() => {
    setShowDeleteEvent(false)
    if (reopenSettingsOnDeleteCancel) setShowSettings(true)
    setReopenSettingsOnDeleteCancel(false)
  }, [reopenSettingsOnDeleteCancel])

  const deleteEventSubmit = useCallback(async () => {
    if (!currentEventId) return
    if (String(currentEventName).toLowerCase() === 'default') return
    try {
      setIsDeletingEvent(true)
      const resp = await fetch(`${API_BASE}/events/${currentEventId}`, { method: 'DELETE', credentials: 'include' })
      if (!resp.ok) throw new Error('Failed to delete event')
      await loadSettingsAndEvents()
      await loadCoreData()
      await refreshStats()
      setShowDeleteEvent(false)
      setShowSettings(false)
      setReopenSettingsOnDeleteCancel(false)
    } catch (e) { console.error(e) }
    finally { setIsDeletingEvent(false) }
  }, [API_BASE, currentEventId, currentEventName, loadCoreData, loadSettingsAndEvents, refreshStats])

  const [isDescribing, setIsDescribing] = useState(false)
  const [isIdentifying, setIsIdentifying] = useState(false)
  const [showPeopleModal, setShowPeopleModal] = useState(false)
  const [detectedPeople, setDetectedPeople] = useState({ boxes: [], imageWidth: 0, imageHeight: 0 })
  const [showAnnotated, setShowAnnotated] = useState(false)
  const [annotatedUrl, setAnnotatedUrl] = useState('')
  const generateDescription = useCallback(async () => {
    if (!selected?.id) return
    setIsDescribing(true)
    try {
      const resp = await fetch(`${API_BASE}/photos/${selected.id}/describe`, { method: 'POST', credentials: 'include' })
      if (!resp.ok) throw new Error('Describe failed')
      const updated = await resp.json()
      setPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    } catch (e) {
      console.error(e)
    } finally {
      setIsDescribing(false)
    }
  }, [API_BASE, selected])

  const identifyPeople = useCallback(async () => {
    if (!selected?.id) return
    try {
      setIsIdentifying(true)
      // Persist faces and request annotated image
      const resp = await fetch(`${API_BASE}/photos/${selected.id}/faces:detect`, { method: 'POST', credentials: 'include' })
      const js = resp.ok ? await resp.json() : { count: 0, items: [] }
      // Update overlay immediately from persisted response
      const overlayFaces = (js.items || []).map((it) => ({ id: it.id, bbox: it.bbox, score: it.score }))
      if (overlayFaces.length > 0) setFaces(overlayFaces)
      // Show annotated image if returned
      if (js.annotated_url) {
        const full = js.annotated_url.startsWith('http') ? js.annotated_url : `${API_BASE}${js.annotated_url}`
        setAnnotatedUrl(full)
        setShowAnnotated(true)
      }
      // Then refresh from server to ensure in-sync
      const r = await fetch(`${API_BASE}/photos/${selected.id}/faces`, { credentials: 'include' })
      if (r.ok) {
        const list = await r.json()
        setFaces(Array.isArray(list) ? list : [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsIdentifying(false)
    }
  }, [API_BASE, selected])
  const confirmDelete = useCallback(async () => {
    try {
      const ids = Array.from(selectedIndices || [])
        .map((x) => parseInt(String(x), 10))
        .filter((x) => Number.isInteger(x))
      if (ids.length === 0) return
      const resp = await fetch(`${API_BASE}/photos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
        credentials: 'include'
      })
      if (!resp.ok) throw new Error('Delete failed')
      setPhotos((prev) => prev.filter((p) => !ids.includes(p.id)))
      setSelectedIndices(new Set())
      setSelectedIndex(0)
    } catch (e) {
      console.error(e)
    } finally {
      setShowDelete(false)
      try { await refreshStats() } catch {}
    }
  }, [API_BASE, filteredPhotos, selectedIndices, refreshStats])

  useEffect(() => {
    const onResize = () => {
      const img = previewImgRef.current
      if (!img) return
      setPreviewSize({ w: img.clientWidth || 0, h: img.clientHeight || 0 })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    // Load stored faces for selected photo
    (async () => {
      try {
        if (!selected?.id) { setFaces([]); return }
        const r = await fetch(`${API_BASE}/photos/${selected.id}/faces`, { credentials: 'include' })
        if (r.ok) {
          const js = await r.json()
          setFaces(Array.isArray(js) ? js : [])
        }
        // update size
        const img = previewImgRef.current
        if (img) setPreviewSize({ w: img.clientWidth || 0, h: img.clientHeight || 0 })
      } catch (e) { console.error(e) }
    })()
  }, [API_BASE, selected])

  // Security UX: until authenticated, render *only* the password gate (no app chrome/structure).
  if (!isAppAuthed && !isSharePath) {
    return (
      <AuthScreen
        title={loginEventName || currentEventName || 'Wedding'}
        subtitle={isCheckingAppAuth ? 'Checking access…' : 'Enter the password to access the application.'}
        avatarUrl={loginAvatarUrl || ''}
        inputValue={appPassword}
        onInputChange={setAppPassword}
        inputPlaceholder="Enter password"
        buttonLabel="View Photos"
        minLength={appPasswordMinLength || 1}
        onSubmit={isCheckingAppAuth ? undefined : submitAppLogin}
        error={appLoginError}
        isSubmitting={isSubmittingAppLogin}
        autoFocus
      />
    )
  }

  // Share links: never render the admin chrome while we are still checking session / prompting password.
  // This prevents the top header (gear/upload/download) from appearing on mobile.
  if (isSharePath) {
    const isShareGatePending = !isPersonView && !showPersonLogin

    if (isShareGatePending) {
      return (
        <AuthScreen
          title={personEventName || loginEventName || currentEventName || 'Wedding'}
          subtitle="Checking access…"
          avatarUrl={loginAvatarUrl || ''}
          inputValue=""
          onInputChange={() => {}}
          inputPlaceholder="Enter password"
          buttonLabel="Checking…"
          minLength={personPasswordMinLength || 1}
          onSubmit={undefined}
          error=""
          isSubmitting
          autoFocus={false}
        />
      )
    }

    if (showPersonLogin) {
      return (
        <AuthScreen
          title={personEventName || loginEventName || currentEventName || 'Wedding'}
          subtitle="Enter the password to view photos"
          avatarUrl={loginAvatarUrl || ''}
          inputValue={personPassword}
          onInputChange={setPersonPassword}
          inputPlaceholder="Enter password"
          buttonLabel="View Photos"
          minLength={personPasswordMinLength || 1}
          onSubmit={async () => {
            try {
              setIsSubmittingLogin(true)
              setPersonLoginError('')
              const r = await fetch(`${API_BASE}/share/${shareToken}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: personPassword }),
                credentials: 'include',
              })
              if (r.ok) {
                setShowPersonLogin(false)
                setIsPersonView(true)
                setPersonPassword('')
                personLoginDoneRef.current = true
                const tr = await fetch(`${API_BASE}/tags`, { credentials: 'include' })
                if (tr.ok) {
                  const list = await tr.json()
                  if (Array.isArray(list) && list[0]) {
                    const tname = list[0].name || ''
                    setPersonTagName(tname)
                    setActiveTags([tname])
                  }
                }
                await loadCoreData()
                await refreshStats()
              } else {
                let msg = 'Login failed'
                try {
                  const ej = await r.json()
                  if (ej?.code === 'INVALID_PASSWORD') msg = `Invalid password${(typeof ej.remaining_attempts === 'number') ? ` — attempts left: ${ej.remaining_attempts}` : ''}`
                  else if (ej?.code === 'RATE_LIMIT') msg = `Too many attempts. Try again later${(typeof ej.retry_after === 'number') ? ` (~${ej.retry_after}s)` : ''}.`
                  else if (ej?.code === 'INVALID_LINK') msg = 'This link is invalid or revoked.'
                  else if (ej?.code === 'LINK_EXPIRED') msg = 'This link has expired.'
                  else if (ej?.code === 'PASSWORD_NOT_SET') msg = 'Access not configured. Please contact the owner.'
                  else if (ej?.error) msg = String(ej.error)
                } catch {}
                setPersonLoginError(msg)
              }
            } catch (e) {
              setPersonLoginError('Network error. Please try again.')
            } finally {
              setIsSubmittingLogin(false)
            }
          }}
          error={personLoginError}
          isSubmitting={isSubmittingLogin}
          autoFocus
        />
      )
    }

    // Mobile Apple-Photos-style UI: for Share links after login.
    if (isMobile && isPersonView) {
      return (
        <MobilePersonGallery
          apiBase={API_BASE}
          eventNameFallback={personEventName || currentEventName || 'Wedding'}
          personTagName={personTagName}
        />
      )
    }
  }

  return (
    <>
      <header className={isPersonView ? 'topbar topbar--share' : 'topbar'}>
        {!isPersonView && <div className="brand">Photo Classification App</div>}
        {!isPersonView && (
          <div className="event-chip" title="Current event">{currentEventName}</div>
        )}
        {isPersonView && (
          <div className="event-chip" title="Greeting">{personTagName ? `Buna ${personTagName}` : 'Buna'}</div>
        )}
        {isPersonView && (
          <div className="topbar-center" title={personEventName || currentEventName || 'Album'}>
            {personEventName || currentEventName || 'Album'}
          </div>
        )}
        <div className="topbar-actions">
          {!isPersonView ? (
            <span className="counter" title="Completed / Total in gallery">{completedCount}/{stats.total}</span>
          ) : null}
          {!isPersonView && (
            <button className="gear-btn" onClick={() => { setShowSettings(true); loadSettings() }} title="Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M9.5 3h5l.6 2.4a6.9 6.9 0 0 1 1.9 1.1L19.4 6l3 5.2-1.8 1.3c.1.8.1 1.7 0 2.5l1.8 1.3-3 5.2-2.4-.5a6.9 6.9 0 0 1-1.9 1.1L14.5 23h-5l-.6-2.4a6.9 6.9 0 0 1-1.9-1.1L4.6 21l-3-5.2 1.8-1.3a8.9 8.9 0 0 1 0-2.5L1.6 11 4.6 5.8l2.4.5c.6-.5 1.2-.8 1.9-1.1L9.5 3Zm2.5 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
            </button>
          )}
          {/* Share View: Sign out button intentionally hidden */}
          <button
            className="download-btn"
            onClick={async () => {
              try {
                const selectedIds = Array.from(selectedIndices || [])
                  .map((x) => parseInt(String(x), 10))
                  .filter((x) => Number.isInteger(x))

                // Share View: if nothing is selected, download the whole current list.
                // - My Photos: tag zip
                // - All Photos: event zip
                if (isPersonView && selectedIds.length === 0) {
                  if (shareGalleryView === 'all') {
                    const resp = await fetch(`${API_BASE}/download/event`, { credentials: 'include' })
                    if (!resp.ok) throw new Error('Download failed')
                    const blob = await resp.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `event_photos.zip`
                    document.body.appendChild(a)
                    a.click()
                    a.remove()
                    URL.revokeObjectURL(url)
                    return
                  }
                  const tagName = personTagName || (activeTags && activeTags.length === 1 ? activeTags[0] : '')
                  if (!tagName) return
                  const resp = await fetch(`${API_BASE}/download?tag=${encodeURIComponent(tagName)}`, { credentials: 'include' })
                  if (!resp.ok) throw new Error('Download failed')
                  const blob = await resp.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `photos_${tagName}.zip`
                  document.body.appendChild(a)
                  a.click()
                  a.remove()
                  URL.revokeObjectURL(url)
                  return
                }

                // Selected photos: download only those (admin + share view).
                if (selectedIds.length > 0) {
                  const resp = await fetch(`${API_BASE}/download/selected`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ ids: selectedIds }),
                  })
                  if (!resp.ok) throw new Error('Download failed')
                  const blob = await resp.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `selected_photos_${selectedIds.length}.zip`
                  document.body.appendChild(a)
                  a.click()
                  a.remove()
                  URL.revokeObjectURL(url)
                  return
                }

                // Backwards compatible: tag download (admin workflow only).
                // In Share View, never "download all" when selection can't be resolved.
                if (isPersonView) return
                if (!activeTags || activeTags.length !== 1) return
                const onlyTag = activeTags[0]
                const resp = await fetch(`${API_BASE}/download?tag=${encodeURIComponent(onlyTag)}`, { credentials: 'include' })
                if (!resp.ok) throw new Error('Download failed')
                const blob = await resp.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `photos_${onlyTag}.zip`
                document.body.appendChild(a)
                a.click()
                a.remove()
                URL.revokeObjectURL(url)
              } catch (err) {
                console.error(err)
              }
            }}
            disabled={isPersonView ? false : (!selected && selectedIndices.size === 0 && (!activeTags || activeTags.length !== 1))}
            title={
              (selectedIndices.size > 0 || selected)
                ? `Download ${selectedIndices.size > 0 ? selectedIndices.size : 1} selected photo${(selectedIndices.size > 0 ? selectedIndices.size : 1) === 1 ? '' : 's'}`
                : (activeTags && activeTags.length === 1 ? `Download all photos tagged '${activeTags[0]}'` : 'Select photos or exactly one tag to enable download')
            }
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 4v10m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20 20H4a2 2 0 0 1-2-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="upload-text">Download</span>
            {selectedIndices.size > 1 && (
              <span className="download-badge" aria-label="Selected count">
                {selectedIndices.size}
              </span>
            )}
          </button>
          <input
            id="file-input"
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={async (e) => {
              const files = Array.from(e.target.files || [])
              if (!files.length) return
              const capped = files.slice(0, 2000)
              setIsBulkUploading(true)
              setBulkTotal(capped.length)
              setBulkDone(0)
              setIsUploading(true)
              try {
                const concurrency = Math.min(6, capped.length)
                let index = 0
                const uploadOne = async (file) => {
                  const fd = new FormData()
                  fd.append('photo', file)
                  const resp = await fetch(`${API_BASE}/photos`, { method: 'POST', body: fd, credentials: 'include' })
                  if (!resp.ok) throw new Error('Upload failed')
                  const created = await resp.json()
                  setPhotos((prev) => [created, ...prev])
                  setTagsById((prev) => ({ ...prev, [created.id]: created.tags || [] }))
                  setBulkDone((d) => d + 1)
                }
                const worker = async () => {
                  while (true) {
                    const i = index
                    if (i >= capped.length) break
                    index = i + 1
                    const file = capped[i]
                    try { await uploadOne(file) } catch (err) { console.error(err) }
                  }
                }
                await Promise.all(Array.from({ length: concurrency }, worker))
                setSelectedIndex(0)
              } catch (err) {
                console.error(err)
              } finally {
                setIsUploading(false)
                setIsBulkUploading(false)
                e.target.value = ''
              }
            }}
          />
          {!isPersonView && (
          <button
            className="upload-btn"
            onClick={() => document.getElementById('file-input')?.click()}
            disabled={isUploading}
            title={isUploading ? 'Uploading…' : 'Upload photo'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 16V4m0 0l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="upload-text">{isUploading ? 'Uploading…' : 'Upload'}</span>
          </button>
          )}
      </div>
      </header>
      <div className="app-container">
      {!isPersonView && (
      <nav
        className="tag-rail"
        ref={tagRailRef}
        tabIndex={0}
        onKeyDown={(e) => {
          // Handle Up/Down navigation inside tag rail with multi-select
          const { key, shiftKey } = e
          if (key !== 'ArrowUp' && key !== 'ArrowDown') return
          if (!Array.isArray(allTags) || allTags.length === 0) return
          e.preventDefault()
          e.stopPropagation()
          const currentIndex = (() => {
            // prefer last anchor, else use first selected, else 0
            if (tagAnchorIndex !== null && tagAnchorIndex >= 0 && tagAnchorIndex < allTags.length) return tagAnchorIndex
            if (activeTags.length > 0) {
              const idx = allTags.findIndex((t) => t.toLowerCase() === String(activeTags[activeTags.length - 1]).toLowerCase())
              return idx >= 0 ? idx : 0
            }
            return 0
          })()
          const delta = key === 'ArrowDown' ? 1 : -1
          const nextIndex = Math.max(0, Math.min(currentIndex + delta, allTags.length - 1))
          const nextTag = allTags[nextIndex]
          if (shiftKey) {
            const start = Math.min(tagAnchorIndex ?? currentIndex, nextIndex)
            const end = Math.max(tagAnchorIndex ?? currentIndex, nextIndex)
            const range = new Set(activeTags.map((t) => t))
            for (let i = start; i <= end; i++) range.add(allTags[i])
            setActiveTags(Array.from(range))
            setTagAnchorIndex(start)
          } else {
            setActiveTags([nextTag])
            setTagAnchorIndex(nextIndex)
          }
        }}
      >
        <div className="tag-rail-header">Tags</div>
        <button
          className={`tag-rail-item ${!activeTags || activeTags.length === 0 ? 'active' : ''}`}
          onClick={() => { 
            setActiveTags([]); 
            setTagAnchorIndex(null);
            setSelectedIndex(0);
          }}
        >
          All
        </button>
        {allTags.map((t) => (
          <div key={t} style={{ display: 'contents' }}>
          {renamingTag && renamingTag.toLowerCase() === t.toLowerCase() ? (
            <input
              className="tag-rail-item"
              style={{ width: '100%' }}
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); renameTag(t, renameValue) }
                if (e.key === 'Escape') { e.preventDefault(); setRenamingTag(null); setRenameValue('') }
              }}
              title={`Rename ${t}`}
            />
          ) : (
          <button
            className={`tag-rail-item ${activeTags.some((s) => s.toLowerCase() === t.toLowerCase()) ? 'active' : ''}`}
            onContextMenu={(e) => {
              e.preventDefault()
              // If multiple selected and right-clicked tag not in selection, select only this one
              const inSelection = activeTags.some((s) => s.toLowerCase() === t.toLowerCase())
              if (!inSelection && activeTags.length > 1) {
                setActiveTags([t])
                setTagAnchorIndex(allTags.findIndex((x) => x === t))
              }
              setTagMenu({ open: true, x: e.clientX, y: e.clientY, tag: t })
            }}
            onClick={(e) => {
              // Click, Shift+Click, Ctrl/Cmd+Click behavior
              const idx = allTags.findIndex((x) => x === t)
              if (e.shiftKey) {
                const base = tagAnchorIndex ?? idx
                const start = Math.min(base, idx)
                const end = Math.max(base, idx)
                const next = new Set(activeTags)
                for (let i = start; i <= end; i++) next.add(allTags[i])
                setActiveTags(Array.from(next))
                setTagAnchorIndex(base)
              } else if (e.ctrlKey || e.metaKey) {
                const exists = activeTags.some((s) => s.toLowerCase() === t.toLowerCase())
                if (exists) {
                  const next = activeTags.filter((s) => s.toLowerCase() !== t.toLowerCase())
                  setActiveTags(next)
                } else {
                  setActiveTags([...activeTags, t])
                }
                setTagAnchorIndex(idx)
              } else {
                setActiveTags([t])
                setTagAnchorIndex(idx)
              }
              setSelectedIndex(0)
              // ensure tag rail can receive keyboard events
              setTimeout(() => tagRailRef.current && tagRailRef.current.focus(), 0)
            }}
            title={t}
          >
            {t}
          </button>
          )}
          </div>
        ))}
      </nav>
      )}
      <aside className="sidebar">
        {isPersonView && (
          <div className="share-switch-header" aria-label="Share view filter and count">
            <div aria-hidden="true" />
            <div className="share-switch-row" role="tablist" aria-label="Share gallery view">
              <button
                type="button"
                className={shareGalleryView === 'my' ? 'share-switch-btn active' : 'share-switch-btn'}
                onClick={async () => {
                  setShareGalleryView('my')
                  if (personTagName) setActiveTags([personTagName])
                  setSelectedIndex(0)
                  setSelectedIndices(new Set())
                  await loadCoreData({ view: 'my' })
                }}
                role="tab"
                aria-selected={shareGalleryView === 'my'}
              >
                <span>My Photos</span>
                {shareGalleryView === 'my' && (
                  <span className="share-switch-badge" aria-label={`${filteredPhotos.length} photos`}>
                    {filteredPhotos.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                className={shareGalleryView === 'all' ? 'share-switch-btn active' : 'share-switch-btn'}
                onClick={async () => {
                  setShareGalleryView('all')
                  setActiveTags([])
                  setSelectedIndex(0)
                  setSelectedIndices(new Set())
                  await loadCoreData({ view: 'all' })
                }}
                role="tab"
                aria-selected={shareGalleryView === 'all'}
              >
                <span>All Photos</span>
                {shareGalleryView === 'all' && (
                  <span className="share-switch-badge" aria-label={`${filteredPhotos.length} photos`}>
                    {filteredPhotos.length}
                  </span>
                )}
              </button>
            </div>
            <div aria-hidden="true" />
          </div>
        )}
        <div
          className={isPersonView && shareGalleryView === 'all' ? 'thumb-grid share-all-grid' : 'thumb-grid'}
          ref={gridRef}
          onScroll={(e) => {
          const el = e.currentTarget
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
            loadMore()
          }
        }}
        >
          {filteredPhotos.map((p, idx) => {
            const pidKey = String(p?.id)
            const isSelected = selectedIndices.has(pidKey) || idx === selectedIndex
            return (
              <button
                key={p.id}
                data-index={idx}
                className={`thumb-btn ${isSelected ? 'selected' : ''}`}
                onClick={(e) => {
                  if (e.shiftKey) {
                    // If the clicked photo is already selected, Shift+Click deselects it.
                    if (selectedIndices.has(pidKey)) {
                      const next = new Set(selectedIndices)
                      next.delete(pidKey)
                      setSelectedIndices(next)
                      setSelectedIndex(idx)
                      setAnchorIndex(idx)
                      return
                    }
                    const start = Math.max(0, Math.min(anchorIndex ?? 0, idx))
                    const end = Math.max(anchorIndex ?? 0, idx)
                    // Shift selection should create a contiguous range (not accumulate forever),
                    // otherwise users can accidentally "select everything" and download all.
                    const next = new Set()
                    for (let i = start; i <= end; i++) {
                      const pid = filteredPhotos[i]?.id
                      if (pid != null) next.add(String(pid))
                    }
                    setSelectedIndices(next)
                    setSelectedIndex(idx)
                  } else {
                    setSelectedIndices(new Set([pidKey]))
                    setSelectedIndex(idx)
                    setAnchorIndex(idx)
                  }
                }}
                title={p.title}
              >
                <img
                  className="thumb-img"
                  src={p.thumb_filename ? `${API_BASE}/uploads/${p.thumb_filename}` : (p.url || `${API_BASE}/uploads/${p.filename}`)}
                  alt={p.title || p.original_name || `Photo ${p.id}`}
                  loading="lazy"
                />
                {p.completed && (
                  <span className="thumb-check" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 12.5l2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
                    </svg>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </aside>

      <main className="preview-pane">
        {!isPersonView && (
          <div className="actions">
            <button
              className={`icon-btn ${selected?.completed ? 'completed' : 'mark-btn'}`}
              onClick={() => markCompleted()}
              title={selected?.completed ? 'Completed (click to unmark)' : 'Mark as completed (Cmd+Enter)'}
              disabled={!selected}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M9 12.5l2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
              {selected?.completed && <span className="btn-label">Completed</span>}
            </button>
            <button className="describe-btn" onClick={generateDescription} disabled={!selected || isDescribing} title="Generate Description">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M4 19h6l5 3v-3h5V2H4v17Z" stroke="currentColor" strokeWidth="1.6"/>
              </svg>
              <span>{isDescribing ? 'Describing…' : 'Describe'}</span>
            </button>
            <button
              className="describe-btn"
              onClick={identifyPeople}
              disabled={!selected || isIdentifying}
              title="Identify People"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6"/>
              </svg>
              <span>{isIdentifying ? 'Identifying…' : 'Identify'}</span>
            </button>
            <button
              className="icon-btn"
              onClick={() => setShowDelete(true)}
              title="Delete (Cmd+Delete)"
              disabled={selectedIndices.size === 0}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {selectedIndices.size > 1 && (
                <span className="trash-badge">{selectedIndices.size}</span>
              )}
            </button>
          </div>
        )}
        <div className="preview-area">
          {selected && (
            <div className="preview-stage">
              <div className="preview-wrap">
                <img
                  className="preview-img"
                  ref={previewImgRef}
                  src={selected.preview_filename ? `${API_BASE}/uploads/${selected.preview_filename}` : (selected.url || `${API_BASE}/uploads/${selected.filename}`)}
                  alt={selected.title || selected.original_name || `Photo ${selected.id}`}
                  onLoad={() => {
                    const img = previewImgRef.current
                    if (img) setPreviewSize({ w: img.clientWidth || 0, h: img.clientHeight || 0 })
                  }}
                />
                {faces && faces.length > 0 && (
                  <div className="face-overlay">
                    {faces.map((f) => {
                      const b = f?.bbox || {}
                      // We assume bbox is in original image pixels; scale to preview
                      const img = previewImgRef.current
                      const natW = Math.max(1, img?.naturalWidth || 1)
                      const natH = Math.max(1, img?.naturalHeight || 1)
                      const scaleX = Math.max(0, (img?.clientWidth || 0) / natW)
                      const scaleY = Math.max(0, (img?.clientHeight || 0) / natH)
                      const left = Math.max(0, Math.round((b.left || 0) * (isFinite(scaleX) ? scaleX : 1)))
                      const top = Math.max(0, Math.round((b.top || 0) * (isFinite(scaleY) ? scaleY : 1)))
                      const width = Math.max(0, Math.round((b.width || 0) * (isFinite(scaleX) ? scaleX : 1)))
                      const height = Math.max(0, Math.round((b.height || 0) * (isFinite(scaleY) ? scaleY : 1)))
                      return (
                        <div key={f.id} className="face-box" style={{ left, top, width, height }} />
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {!isPersonView && (
          <section className="details">
            {selected ? (
              <div className="details-grid">
                {selected.title && (
                  <div className="detail"><span className="label">Title</span><span className="value">{selected.title}</span></div>
                )}
                {selected.date && (
                  <div className="detail"><span className="label">Date</span><span className="value">{selected.date}</span></div>
                )}
                {selected.size && (
                  <div className="detail"><span className="label">Dimensions</span><span className="value">{selected.size}</span></div>
                )}
                <div className="detail"><span className="label">ID</span><span className="value">{selected.id}</span></div>
                <div className="detail tags-row">
                  <span className="label">Persons</span>
                  <div className="value">
                    {isDevTagCopy && (
                      <div className="tags-toolbar" aria-label="Tag clipboard">
                        <button
                          type="button"
                          className="tags-tool-btn"
                          onClick={copySelectedTagsToClipboard}
                          disabled={!selected?.id || isApplyingClipboardTags}
                          title="Copy all tags from this photo"
                        >
                          Copy tags
                        </button>
                        <button
                          type="button"
                          className="tags-tool-btn tags-tool-btn--primary"
                          onClick={pasteClipboardTagsToSelected}
                          disabled={
                            !tagClipboard ||
                            !selected?.id ||
                            String(selected.id) === String(tagClipboard.photoId) ||
                            isApplyingClipboardTags
                          }
                          title="Paste copied tags onto this photo"
                        >
                          Paste tags
                        </button>
                        {tagClipboard && !tagClipboardConsumed && (
                          <span
                            className="tags-tool-pill"
                            title={`Copied ${tagClipboard.tags?.length || 0} tag(s) from photo ${tagClipboard.photoId}`}
                          >
                            Copied&nbsp;{tagClipboard.tags?.length || 0}
                          </span>
                        )}
                        {tagClipboardMsg && <span className="tags-tool-msg">{tagClipboardMsg}</span>}
                      </div>
                    )}
                    <div className="tags-input" onClick={() => document.getElementById('tag-input')?.focus()}>
                      {selectedTags.map((t) => (
                        <span key={t} className="tag-chip">
                          {t}
                          <button className="tag-remove" onClick={() => removeTag(t)} aria-label={`Remove ${t}`}>x</button>
                        </span>
                      ))}
                      <input
                        id="tag-input"
                        className="tag-text"
                        type="text"
                        placeholder="Add person..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={onTagInputKeyDown}
                      />
                    </div>
                    {suggestions.length > 0 && (
                      <ul className="suggestions">
                        {suggestions.map((s, idx) => (
                          <li key={s}>
                            <button
                              type="button"
                              className={`suggestion-btn ${idx === highlightedSuggestion ? 'active' : ''}`}
                              onMouseEnter={() => setHighlightedSuggestion(idx)}
                              onClick={() => addTag(s)}
                            >{s}</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="detail"><span className="label">Description</span><span className="value">{selected.description || ''}</span></div>
              </div>
            ) : (
              <div className="details-empty">Select a photo to see details</div>
            )}
          </section>
        )}
      </main>
    </div>
    {isBulkUploading && (
      <div className="modal-overlay" role="alert" aria-live="assertive">
        <div className="modal-card">
          <div className="modal-title">Uploading Photos</div>
          <div className="modal-subtitle">Photos: {bulkDone}/{bulkTotal}</div>
          <div className="progress-outer"><div className="progress-inner" style={{ width: `${Math.min(100, Math.round((bulkDone / Math.max(1, bulkTotal)) * 100))}%` }} /></div>
        </div>
      </div>
    )}
    {showAnnotated && (
      <div className="modal-overlay" role="dialog" aria-modal="true" onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setShowAnnotated(false) } }}>
        <div className="modal-card" style={{ width: 'min(90vw, 1200px)' }}>
          <div className="modal-title">Identified Faces</div>
          <div className="modal-subtitle">Annotated preview</div>
          <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
            <img src={annotatedUrl} alt="Annotated faces" style={{ maxWidth: '100%', height: 'auto', display: 'block', borderRadius: 8 }} />
          </div>
          <div className="settings-actions" style={{ justifyContent: 'flex-end' }}>
            <button className="suggestion-btn" onClick={() => setShowAnnotated(false)}>Close</button>
            <a className="suggestion-btn" href={annotatedUrl} download target="_blank" rel="noreferrer">Download</a>
          </div>
        </div>
      </div>
    )}
    {showDelete && (
      <div className="modal-overlay" role="dialog" aria-modal="true" onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); confirmDelete(); }
        if (e.key === 'Escape') { e.preventDefault(); setShowDelete(false); }
      }}>
        <div className="modal-card">
          <div className="modal-title">Delete photos</div>
          <div className="modal-subtitle">You are about to delete {deleteCount} {deleteCount === 1 ? 'photo' : 'photos'}. This action cannot be undone.</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="suggestion-btn" onClick={() => setShowDelete(false)}>Cancel (Esc)</button>
            <button className="suggestion-btn" onClick={confirmDelete} autoFocus>Delete (Enter)</button>
          </div>
        </div>
      </div>
    )}
    {showSettings && (
      <div className="modal-overlay settings-modal" role="dialog" aria-modal="true">
        <div className="modal-card">
          <div className="modal-title">Settings</div>
          <div className="settings-row">
            <label>Event</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="settings-select" value={currentEventId || ''} onChange={(e) => setCurrentEvent(parseInt(e.target.value))}>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
              <button className="describe-btn" onClick={() => { setNewEventName(''); setReopenSettingsOnEventCancel(true); setShowSettings(false); setShowNewEvent(true) }}>New</button>
            </div>
          </div>
          <div className="settings-row">
            <label>Model</label>
            <select className="settings-select" value={settingsModel} onChange={(e) => setSettingsModel(e.target.value)}>
              <option value="gpt-4o-mini">gpt-4o-mini (recommended)</option>
              <option value="gpt-4o">gpt-4o</option>
              <option value="gpt-4o-mini-high">gpt-4o-mini-high</option>
            </select>
          </div>
          <div className="settings-row">
            <label>Person View Password</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
              <input className="settings-input" type="password" placeholder="Set or change password" value={personPasswordInput} onChange={(e) => setPersonPasswordInput(e.target.value)} />
              <button className="describe-btn" onClick={savePersonPassword} disabled={isSavingPersonPassword}>{isSavingPersonPassword ? 'Saving…' : 'Save'}</button>
              <button className="describe-btn" onClick={async () => { setPersonPasswordInput(''); await savePersonPassword() }}>Clear</button>
            </div>
          </div>
          <div className="settings-row">
            <label>Login Avatar</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
              <button
                className="describe-btn"
                onClick={() => setLoginAvatarPhotoId(selected?.id ?? null)}
                disabled={!selected?.id}
                title={selected?.id ? 'Use currently selected photo as login avatar' : 'Select a photo first'}
              >
                Use selected photo
              </button>
              <button className="describe-btn" onClick={() => setLoginAvatarPhotoId(null)}>Clear</button>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#64748b', fontWeight: 700, fontSize: 13 }}>Preview</span>
                <span style={{ width: 36, height: 36, borderRadius: 999, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.12)', background: 'rgba(0,0,0,0.04)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {loginAvatarPhotoId ? (
                    <img
                      alt="Login avatar"
                      src={loginAvatarPreviewUrl || `${API_BASE}/public/login-avatar?v=${encodeURIComponent(String(loginAvatarPhotoId))}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <span style={{ color: '#94a3b8', fontWeight: 900 }}>—</span>
                  )}
                </span>
              </div>
              <div style={{ color: '#64748b', fontWeight: 600, fontSize: 12 }}>
                Pick a photo to show as the lock-screen avatar (applies to admin + share login screens).
              </div>
            </div>
          </div>
          <div className="settings-row">
            <label>System Prompt</label>
            <textarea className="settings-input" rows={6} value={settingsPrompt} onChange={(e) => setSettingsPrompt(e.target.value)} placeholder="You are a helpful photo captioning assistant..." />
          </div>
          <div className="settings-actions" style={{ justifyContent: 'space-between' }}>
            <button className="suggestion-btn" style={{ color: '#b91c1c', borderColor: '#fecaca' }} onClick={openDeleteEventModal} disabled={String(currentEventName).toLowerCase()==='default'}>Delete event</button>
            <div style={{ display:'flex', gap:8 }}>
              <button className="suggestion-btn" onClick={() => setShowSettings(false)}>Cancel</button>
              <button className="suggestion-btn" onClick={saveSettings}>Save</button>
            </div>
          </div>
          <div className="modal-title" style={{ marginTop: 12 }}>Share Links</div>
          <div className="settings-row">
            <label>Manage</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="describe-btn" onClick={() => { setShowSettings(false); setShowShareManager(true); refreshShareLinks() }}>Open Manager</button>
            </div>
          </div>
        </div>
      </div>
    )}
    {showNewEvent && (
      <div className="modal-overlay" role="dialog" aria-modal="true" onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); createEventSubmit() }
        if (e.key === 'Escape') { e.preventDefault(); cancelNewEventModal() }
      }}>
        <div className="modal-card">
          <div className="modal-title">Create new event</div>
          <div className="settings-row">
            <label>Name</label>
            <input className="settings-input" value={newEventName} onChange={(e) => setNewEventName(e.target.value)} placeholder="Event name" />
          </div>
          <div className="settings-actions">
            <button className="suggestion-btn" onClick={cancelNewEventModal}>Cancel</button>
            <button className="suggestion-btn" onClick={createEventSubmit} disabled={!newEventName.trim() || isCreatingEvent}>{isCreatingEvent ? 'Creating…' : 'Create'}</button>
          </div>
        </div>
      </div>
    )}
    {showDeleteEvent && (
      <div className="modal-overlay" role="dialog" aria-modal="true" onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); deleteEventSubmit() }
        if (e.key === 'Escape') { e.preventDefault(); cancelDeleteEventModal() }
      }}>
        <div className="modal-card">
          <div className="modal-title">Delete event</div>
          <div className="modal-subtitle">You are about to delete the event "{currentEventName}" and all of its photos and tags. This action cannot be undone.</div>
          <div className="settings-actions">
            <button className="suggestion-btn" onClick={cancelDeleteEventModal}>Cancel</button>
            <button className="suggestion-btn" onClick={deleteEventSubmit} disabled={isDeletingEvent}>{isDeletingEvent ? 'Deleting…' : 'Delete'}</button>
          </div>
        </div>
      </div>
    )}
    {showPeopleModal && (
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <div className="modal-card">
          <div className="modal-title">People detected</div>
          <div className="modal-subtitle">
            {Array.isArray(detectedPeople?.boxes) ? `${detectedPeople.boxes.length} person${detectedPeople.boxes.length===1?'':'s'} found` : 'No data'}
          </div>
          <div style={{ maxHeight: 240, overflow: 'auto', marginTop: 8 }}>
            <ul style={{ paddingLeft: 16 }}>
              {(detectedPeople?.boxes||[]).map((b, i) => (
                <li key={i}>#{i+1}: left={b.left}, top={b.top}, width={b.width}, height={b.height}, score={(b.score||0).toFixed?.(2) ?? b.score}</li>
              ))}
            </ul>
          </div>
          <div className="settings-actions">
            <button className="suggestion-btn" onClick={() => setShowPeopleModal(false)}>Ok</button>
          </div>
        </div>
      </div>
    )}
    {tagMenu.open && (
      <div
        className="context-overlay"
        role="menu"
        onClick={() => setTagMenu({ open: false, x: 0, y: 0, tag: null })}
        onContextMenu={(e) => { e.preventDefault(); setTagMenu({ open: false, x: 0, y: 0, tag: null }) }}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setTagMenu({ open: false, x: 0, y: 0, tag: null }) } }}
        style={{ position: 'fixed', inset: 0, zIndex: 1000 }}
      >
        <div
          className="context-menu"
          style={{ position: 'absolute', top: tagMenu.y, left: tagMenu.x, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 4, minWidth: 140 }}
          onClick={(e) => e.stopPropagation()}
        >
          { (activeTags && activeTags.length > 1 && activeTags.some((s) => s.toLowerCase() === String(tagMenu.tag||'').toLowerCase())) ? (
            <button
              className="suggestion-btn"
              style={{ width: '100%', justifyContent: 'flex-start' }}
              onClick={() => {
                const selected = activeTags.slice()
                setTagMenu({ open: false, x: 0, y: 0, tag: null })
                setConfirmDeleteTag(selected)
              }}
            >
              Delete
            </button>
          ) : (
            <>
              <button
                className="suggestion-btn"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={() => { setRenamingTag(tagMenu.tag); setRenameValue(tagMenu.tag || ''); setTagMenu({ open: false, x: 0, y: 0, tag: null }) }}
              >
                Rename
              </button>
              <button
                className="suggestion-btn"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={() => {
                  const name = tagMenu.tag
                  setTagMenu({ open: false, x: 0, y: 0, tag: null })
                  if (!name) return
                  setConfirmDeleteTag(name)
                }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    )}
    {confirmDeleteTag && (
      <div className="modal-overlay" role="dialog" aria-modal="true" onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); Array.isArray(confirmDeleteTag) ? deleteTags(confirmDeleteTag) : deleteTag(confirmDeleteTag) }
        if (e.key === 'Escape') { e.preventDefault(); setConfirmDeleteTag(null) }
      }}>
        <div className="modal-card">
          <div className="modal-title">{Array.isArray(confirmDeleteTag) ? 'Delete tags' : 'Delete tag'}</div>
          <div className="modal-subtitle">
            {Array.isArray(confirmDeleteTag)
              ? `You are about to delete ${confirmDeleteTag.length} selected tags from all photos. This action cannot be undone.`
              : <>You are about to delete the tag "{confirmDeleteTag}" from all photos. This action cannot be undone.</>}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="suggestion-btn" onClick={() => setConfirmDeleteTag(null)}>Cancel (Esc)</button>
            <button className="suggestion-btn" onClick={() => (Array.isArray(confirmDeleteTag) ? deleteTags(confirmDeleteTag) : deleteTag(confirmDeleteTag))} autoFocus>Delete (Enter)</button>
          </div>
        </div>
      </div>
    )}
    {showShareManager && (
      <div className="modal-overlay share-manager" role="dialog" aria-modal="true" onKeyDown={(e) => {
        if (e.key === 'Escape') { e.preventDefault(); setShowShareManager(false); }
      }}>
        <div className="modal-card">
          <div className="modal-title">Share Links Manager</div>
          <div className="settings-row">
            <label>Create</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="settings-input" placeholder="Tag name (case-insensitive)" value={linkTagToCreate} onChange={(e) => setLinkTagToCreate(e.target.value)} />
              <button className="describe-btn" onClick={createShareLink} disabled={!linkTagToCreate.trim() || isCreatingLink}>{isCreatingLink ? 'Creating…' : 'Generate'}</button>
              <button className="describe-btn" onClick={async () => { try { const r = await fetch(`${API_BASE}/share-links/bulk`, { method: 'POST', credentials: 'include' }); if (r.ok) { await refreshShareLinks(); } } catch (e) { console.error(e) } }}>Generate All</button>
            </div>
          </div>
          <div className="settings-row">
            <label>Active Links</label>
            <div style={{ width: '100%' }}>
              {isLoadingShareLinks ? <div>Loading…</div> : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
                  {shareLinks.map((l) => (
                    <li key={l.id} style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: 8 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', overflow: 'hidden' }}>
                        <span style={{ fontWeight: 700 }}>{l.tag_name}</span>
                        <span className="link-url" style={{ color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.url}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="describe-btn" onClick={() => { navigator.clipboard?.writeText(l.url).catch(()=>{}) }}>Copy</button>
                        <button className="describe-btn" onClick={() => revokeShareLink(l.id)}>Revoke</button>
                      </div>
                    </li>
                  ))}
                  {shareLinks.length === 0 && <li style={{ color: '#666' }}>No active links</li>}
                </ul>
              )}
            </div>
          </div>
          <div className="settings-actions" style={{ justifyContent: 'flex-end' }}>
            <button className="suggestion-btn" onClick={() => { setShowShareManager(false); }}>Close</button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

export default App
