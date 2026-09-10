'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useScenePalette } from '../theme/ThemeProvider'
import { useScrollDirector } from '../scroll/ScrollDirector'
import { cameraXForFraction, getZone } from '../layout/zones'
import { HeroEngine } from './scenes/HeroEngine'
import { PaperUniverse } from './scenes/PaperUniverse'
import { Workbench } from './scenes/Workbench'
import { Atlas } from './scenes/Atlas'
import { Resolution } from './scenes/Resolution'
import { Handoffs } from './Handoff'

export interface PointerState {
  x: number
  y: number
  active: boolean
}

export interface CanvasHandlers {
  onWorkbenchHover: (id: string | null) => void
  onAtlasHover: (id: string | null) => void
  /** Selecting a resting instrument makes it the active one. */
  onAtlasSelect: (index: number) => void
}

/**
 * Moves the camera between acts. One camera for the whole page means the
 * scenes genuinely share a space rather than being separate canvases stacked.
 */
function CameraRig({ scroll }: { scroll: React.MutableRefObject<ReturnType<typeof useScrollDirector>['state']['current']> }) {
  const { camera } = useThree()
  const focus = useMemo(() => new THREE.Vector3(), [])
  const want = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    const s = scroll.current
    const k = Math.min(delta * 2.2, 1)
    const cam = camera as THREE.PerspectiveCamera

    // Distance and height are per-act; the sideways framing always comes from
    // the measured scene column, so the subject cannot drift under the copy.
    let dist = 8.6
    let y = 0.6

    switch (s.active) {
      case 'hero': {
        const t = s.act.hero
        dist = 8.6 + t * 2.6
        y = 2.3 - t * 1.5
        break
      }
      case 'evidence': {
        dist = 6.4
        y = 0.35
        break
      }
      case 'fieldwork': {
        const t = s.act.fieldwork
        dist = 7.6 - t * 0.9
        y = 1.0 - t * 0.4
        break
      }
      case 'atlas': {
        dist = 7.4
        y = 0.3
        break
      }
      case 'resolution': {
        const t = s.act.resolution
        // The camera arrives close on the foundation and pulls steadily back as
        // the system assembles, so the reader sees fragments become one object.
        // It never pushes in again — the ending opens out.
        dist = 4.6 + t * 3.1
        y = 0.1 + t * 0.34
        break
      }
    }

    const zone = getZone(s.active)
    const x = cameraXForFraction(zone.cx, dist, cam.fov, cam.aspect)

    want.set(x, y, dist)
    focus.set(x, y - (s.active === 'hero' ? y : 0), 0)

    camera.position.lerp(want, k)
    camera.lookAt(focus)
  })

  return null
}

/** Lighting follows the theme: warm key on obsidian, softer and fuller on bone. */
function Lights() {
  const p = useScenePalette()
  return (
    <>
      <ambientLight intensity={p.ambient} />
      <directionalLight position={[5, 7, 6]} intensity={p.keyIntensity} color={p.keyLight} />
      <directionalLight position={[-6, 1, -3]} intensity={0.8} color={p.fillLight} />
      <pointLight position={[-3.5, -1.5, 3.5]} intensity={13} distance={14} color={p.signal} />
      <pointLight position={[3.5, 2.5, -3.5]} intensity={7} distance={12} color={p.risk} />
      <pointLight position={[0, 3, 4]} intensity={6} distance={12} color={p.intel} />
    </>
  )
}

/** Pauses rendering when the page is hidden or the canvas is offscreen. */
function PerformanceGuard() {
  const { invalidate, gl } = useThree()
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') invalidate()
    }
    document.addEventListener('visibilitychange', onVisibility)
    // A lost context must not leave a black hole; let the wrapper fall back.
    const canvas = gl.domElement
    const onLost = (e: Event) => {
      e.preventDefault()
      window.dispatchEvent(new Event('webglcontextlost'))
    }
    canvas.addEventListener('webglcontextlost', onLost)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('webglcontextlost', onLost)
    }
  }, [invalidate, gl])
  return null
}

function Scenes({
  scroll,
  pointer,
  handlers,
  atlasActive,
}: {
  scroll: React.MutableRefObject<ReturnType<typeof useScrollDirector>['state']['current']>
  pointer: React.MutableRefObject<PointerState>
  handlers: CanvasHandlers
  atlasActive: number
}) {
  const p = useScenePalette()
  const { scene } = useThree()

  useEffect(() => {
    scene.fog = new THREE.Fog(p.bg, 11, 26)
    return () => {
      scene.fog = null
    }
  }, [scene, p.bg])

  return (
    <>
      <color attach="background" args={[p.bg]} />
      <Lights />
      <CameraRig scroll={scroll} />
      <PerformanceGuard />

      <HeroEngine scroll={scroll} pointer={pointer} />
      <PaperUniverse scroll={scroll} pointer={pointer} />
      <Workbench scroll={scroll} pointer={pointer} onHover={handlers.onWorkbenchHover} />
      <Atlas
        scroll={scroll}
        pointer={pointer}
        active={atlasActive}
        onHover={handlers.onAtlasHover}
        onSelect={handlers.onAtlasSelect}
      />
      <Resolution scroll={scroll} pointer={pointer} />

      {/* Objects that carry the story across each section boundary. */}
      <Handoffs scroll={scroll} />
    </>
  )
}

export default function LandingCanvas({
  pointer,
  handlers,
  interactive,
  atlasActive,
}: {
  pointer: React.MutableRefObject<PointerState>
  handlers: CanvasHandlers
  /** Only the acts with clickable objects capture pointer events. */
  interactive: boolean
  /** The instrument the page currently has in focus. */
  atlasActive: number
}) {
  const { state } = useScrollDirector()

  return (
    <Canvas
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      camera={{ position: [0, 2.3, 8.6], fov: 40 }}
      style={{ pointerEvents: interactive ? 'auto' : 'none' }}
      // Objects are moved imperatively; React never re-renders on scroll.
      frameloop="always"
    >
      <Scenes scroll={state} pointer={pointer} handlers={handlers} atlasActive={atlasActive} />
    </Canvas>
  )
}
