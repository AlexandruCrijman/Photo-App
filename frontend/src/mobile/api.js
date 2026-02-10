export function buildPhotoUrls(apiBase, p) {
  const thumbUrl = p.thumb_filename ? `${apiBase}/uploads/${p.thumb_filename}` : (p.url || `${apiBase}/uploads/${p.filename}`)
  const fullUrl = p.preview_filename ? `${apiBase}/uploads/${p.preview_filename}` : (p.url || `${apiBase}/uploads/${p.filename}`)
  return { thumbUrl, fullUrl }
}

export function mapPhoto(apiBase, p) {
  const { thumbUrl, fullUrl } = buildPhotoUrls(apiBase, p)
  return {
    id: String(p.id),
    thumbUrl,
    fullUrl,
    isFavorite: Boolean(p.is_favorite),
    raw: p,
  }
}

export async function fetchPhotos({ apiBase, view = 'my', limit = 60, cursor = null }) {
  const qp = new URLSearchParams()
  qp.set('limit', String(limit))
  if (cursor) qp.set('cursor', String(cursor))
  if (view === 'all') qp.set('view', 'all')
  const r = await fetch(`${apiBase}/photos?${qp.toString()}`, { credentials: 'include' })
  if (!r.ok) {
    const err = new Error('FETCH_PHOTOS_FAILED')
    err.status = r.status
    throw err
  }
  const js = await r.json()
  const items = Array.isArray(js) ? js : js.items || []
  const nextCursor = Array.isArray(js) ? null : (js.nextCursor || null)
  return { items, nextCursor }
}

export async function setFavorite({ apiBase, photoId, value }) {
  const r = await fetch(`${apiBase}/photos/${encodeURIComponent(photoId)}/favorite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: Boolean(value) }),
    credentials: 'include',
  })
  if (!r.ok) {
    const err = new Error('SET_FAVORITE_FAILED')
    err.status = r.status
    throw err
  }
  return await r.json().catch(() => ({}))
}
