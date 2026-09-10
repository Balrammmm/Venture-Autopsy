'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { HeroScene } from '@/components/landing/StaticStage'
import type { SeedProfile } from './IdeaSeed'

const IdeaSeed = dynamic(() => import('./IdeaSeed').then((m) => m.IdeaSeed), {
  ssr: false,
  loading: () => <HeroScene />,
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
 * The seed, or the drawing of it. Reduced motion, missing WebGL and a lost
 * context all land on the finished static scene rather than an empty box.
 */
export function SeedStage({
  step,
  charge,
  profile,
}: {
  step: number
  charge: React.MutableRefObject<number>
  profile: SeedProfile
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
    <div className="aspect-square w-full overflow-hidden rounded-[3px]">
      {useStatic ? <HeroScene /> : <IdeaSeed step={step} charge={charge} profile={profile} />}
    </div>
  )
}
