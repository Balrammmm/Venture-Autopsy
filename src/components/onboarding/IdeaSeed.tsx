'use client'

import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import * as THREE from 'three'
import { useScenePalette } from '@/components/landing/theme/ThemeProvider'

/**
 * The idea seed.
 *
 * One object with a real lifecycle, driven by how far the founder has got:
 *
 *   step 0 — dormant.   A closed specimen capsule, turning slowly, core dark.
 *   step 1 — waking.    The six shell panels part; the core lights; rings appear.
 *   step 2 — opening.   The shell swings wide and a blueprint sheet rises out
 *                       of it. Typing feeds the core, which brightens.
 *
 * The same hexagonal form as the brand monogram and the Atlas tokens, so the
 * thing being created here is recognisably the thing the landing page promised.
 */

function Seed({ step, charge }: { step: number; charge: React.MutableRefObject<number> }) {
  const p = useScenePalette()
  const root = useRef<THREE.Group>(null)
  const panels = useRef<(THREE.Group | null)[]>([])
  const core = useRef<THREE.Mesh>(null)
  const sheet = useRef<THREE.Group>(null)
  const rings = useRef<THREE.Group>(null)
  // Eased, so a step change glides rather than snapping.
  const open = useRef(0)

  const shell = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.paper,
        roughness: p.paperRoughness,
        metalness: p.metalness,
        side: THREE.DoubleSide,
        transparent: true,
      }),
    [p],
  )

  useFrame((st, delta) => {
    const g = root.current
    if (!g) return
    const t = st.clock.elapsedTime
    const dt = Math.min(delta, 0.05)

    // Target opening: 0 dormant, 0.45 waking, 1 open.
    const target = step >= 2 ? 1 : step === 1 ? 0.45 : 0
    open.current += (target - open.current) * Math.min(dt * 3.2, 1)
    const o = open.current

    g.rotation.y += dt * (0.16 - o * 0.1)
    g.rotation.x = Math.sin(t * 0.4) * 0.05 * (1 - o * 0.6)

    panels.current.forEach((el, i) => {
      if (!el) return
      const a = (i / 6) * Math.PI * 2
      // Panels hinge outward and drift out along their own normal.
      const push = 0.52 + o * 0.66
      el.position.set(Math.cos(a) * push, 0, Math.sin(a) * push)
      el.rotation.set(0, -a + Math.PI / 2, o * 0.66)
      const m = el.children[0] as THREE.Mesh
      if (m) (m.material as THREE.Material & { opacity: number }).opacity = 1 - o * 0.45
    })

    if (core.current) {
      // The core answers the founder: it swells while they type.
      charge.current *= 0.94
      const lit = 0.2 + o * 0.6 + Math.min(0.5, charge.current)
      const s = 0.3 + o * 0.16 + Math.sin(t * 1.7) * 0.012 + Math.min(0.09, charge.current * 0.3)
      core.current.scale.setScalar(s)
      const m = core.current.material as THREE.MeshStandardMaterial
      m.emissiveIntensity = lit
      m.opacity = 0.55 + o * 0.4
    }

    if (sheet.current) {
      const rise = Math.max(0, (o - 0.55) / 0.45)
      sheet.current.visible = rise > 0.01
      sheet.current.position.y = -0.3 + rise * 0.92
      sheet.current.rotation.y = (1 - rise) * 1.6 + Math.sin(t * 0.5) * 0.06
      sheet.current.scale.setScalar(0.4 + rise * 0.6)
    }

    if (rings.current) {
      rings.current.visible = o > 0.06
      rings.current.rotation.z = t * 0.1
      rings.current.scale.setScalar(0.8 + o * 0.5)
    }
  })

  return (
    <group ref={root}>
      {/* Calibration rings — the lab instruments coming online. */}
      <group ref={rings} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <torusGeometry args={[1.5, 0.004, 6, 72]} />
          <meshBasicMaterial color={p.rule} transparent opacity={0.75} />
        </mesh>
        <mesh scale={0.72}>
          <torusGeometry args={[1.5, 0.003, 6, 60]} />
          <meshBasicMaterial color={p.intel} transparent opacity={0.4} />
        </mesh>
      </group>

      {/* Six shell panels. */}
      {Array.from({ length: 6 }, (_, i) => (
        <group
          key={i}
          ref={(el) => {
            panels.current[i] = el
          }}
        >
          <mesh material={shell}>
            <boxGeometry args={[0.56, 1.02, 0.035]} />
            <Edges threshold={15} color={p.paperEdge} />
          </mesh>
        </group>
      ))}

      {/* The core. */}
      <mesh ref={core}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color={p.action}
          emissive={p.action}
          emissiveIntensity={0.2}
          roughness={0.3}
          transparent
          opacity={0.55}
        />
      </mesh>

      {/* The blueprint that rises once the idea itself is being written. */}
      <group ref={sheet} visible={false}>
        <mesh material={shell}>
          <boxGeometry args={[1.36, 0.94, 0.012]} />
          <Edges threshold={15} color={p.intel} />
        </mesh>
        {[0.26, 0.1, -0.06, -0.22].map((y, i) => (
          <mesh key={i} position={[-0.16 + i * 0.04, y, 0.009]}>
            <planeGeometry args={[0.8 - i * 0.13, 0.012]} />
            <meshBasicMaterial color={p.intel} transparent opacity={0.55} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export function IdeaSeed({ step, charge }: { step: number; charge: React.MutableRefObject<number> }) {
  const p = useScenePalette()
  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ position: [0, 0.3, 4.4], fov: 42 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      // Nothing else on this page needs the GPU; keep it modest.
      frameloop="always"
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={[p.bg]} />
      <ambientLight intensity={p.ambient} />
      <directionalLight position={[3, 4, 5]} intensity={p.keyIntensity} color={p.keyLight} />
      <directionalLight position={[-4, -1, -3]} intensity={p.fillIntensity} color={p.fillLight} />
      <pointLight position={[0, 0, 1.6]} intensity={6} distance={7} color={p.action} />
      <Suspense fallback={null}>
        <Seed step={step} charge={charge} />
      </Suspense>
    </Canvas>
  )
}
