import { useMemo, useRef } from 'react'

export function useLongPress(onLongPress, { ms = 350 } = {}) {
  const timerRef = useRef(null)
  const movedRef = useRef(false)

  return useMemo(() => {
    const clear = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    const start = (e) => {
      movedRef.current = false
      clear()
      timerRef.current = setTimeout(() => {
        if (!movedRef.current) onLongPress?.(e)
      }, ms)
    }

    const move = () => {
      movedRef.current = true
      clear()
    }

    const end = () => clear()

    return {
      onPointerDown: start,
      onPointerMove: move,
      onPointerUp: end,
      onPointerCancel: end,
      onContextMenu: (e) => { e.preventDefault(); e.stopPropagation() },
    }
  }, [ms, onLongPress])
}


