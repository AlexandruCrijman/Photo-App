import { useMemo, useRef } from 'react'

export function useLongPress(onLongPress, { ms = 350 } = {}) {
  const timerRef = useRef(null)
  const movedRef = useRef(false)
  const startPosRef = useRef({ x: 0, y: 0 })
  const didLongPressRef = useRef(false)

  return useMemo(() => {
    const clear = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    const getXY = (e) => {
      // PointerEvent
      if (typeof e?.clientX === 'number' && typeof e?.clientY === 'number') {
        return { x: e.clientX, y: e.clientY }
      }
      // TouchEvent fallback
      const t = e?.touches?.[0] || e?.changedTouches?.[0]
      if (t && typeof t.clientX === 'number' && typeof t.clientY === 'number') {
        return { x: t.clientX, y: t.clientY }
      }
      return { x: 0, y: 0 }
    }

    const start = (e) => {
      movedRef.current = false
      didLongPressRef.current = false
      startPosRef.current = getXY(e)
      clear()
      timerRef.current = setTimeout(() => {
        if (!movedRef.current) {
          didLongPressRef.current = true
          try { navigator?.vibrate?.(10) } catch {}
          onLongPress?.(e)
        }
      }, ms)
    }

    const move = (e) => {
      // Android often reports tiny pointer jitter while pressing; only cancel if user actually drags.
      const { x, y } = getXY(e)
      const dx = Math.abs(x - startPosRef.current.x)
      const dy = Math.abs(y - startPosRef.current.y)
      if (dx > 8 || dy > 8) {
        movedRef.current = true
        clear()
      }
    }

    const end = () => clear()

    return {
      onPointerDown: start,
      onPointerMove: move,
      onPointerUp: end,
      onPointerCancel: end,
      onTouchStart: start,
      onTouchMove: move,
      onTouchEnd: end,
      onClickCapture: (e) => {
        if (didLongPressRef.current) {
          // prevent "click" that fires after long press on some browsers (esp. Android)
          e.preventDefault()
          e.stopPropagation()
          didLongPressRef.current = false
        }
      },
      onContextMenu: (e) => { e.preventDefault(); e.stopPropagation() },
    }
  }, [ms, onLongPress])
}
