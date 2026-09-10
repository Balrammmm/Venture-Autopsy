'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { StaticStage } from './StaticStage'
import type { CanvasHandlers, PointerState } from './canvas/LandingCanvas'

const LandingCanvas = dynamic(() => import('./canvas/LandingCanvas'), {
  ssr: false,
  // The static stage is the real fallback, so the first paint is never empty.
  loading: () => <StaticStage />,
})

function webglAvailable() {
  if (typeof window === 'undefined') return false
  try {
    const c = document.createElement('canvas')
    return Boolean(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch {
    return false
  }
}

/**
 * Chooses between the live scene and the drawn one. Reduced motion, missing
 * WebGL and a lost context all land on a finished piece of art direction
 * rather than a blank frame.
 */
export function LandingStage({
  pointer,
  handlers,
  interactive,
  atlasActive,
}: {
  pointer: React.MutableRefObject<PointerState>
  handlers: CanvasHandlers
  interactive: boolean
  atlasActive: number
}) {
  const reduce = useReducedMotion()
  const [canRender, setCanRender] = useState<boolean | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setCanRender(webglAvailable())
    const onLost = () => setFailed(true)
    window.addEventListener('webglcontextlost', onLost)
    return () => window.removeEventListener('webglcontextlost', onLost)
  }, [])

  const useStatic = canRender === null || reduce || !canRender || failed

  return (
    <div className="fixed inset-0 z-0" aria-hidden={!useStatic}>
      {useStatic ? (
        <StaticStage />
      ) : (
        <LandingCanvas pointer={pointer} handlers={handlers} interactive={interactive} atlasActive={atlasActive} />
      )}
    </div>
  )
}
