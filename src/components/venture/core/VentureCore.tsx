'use client'

import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import * as THREE from 'three'
import { useScenePalette } from '@/components/landing/theme/ThemeProvider'

/**
 * The Venture Core.
 *
 * A working model of the idea, not an illustration of one. Every part is a
 * real row from the analysis:
 *
 *   - Each genome node is a module on the value chain, laid left to right in
 *     the order value actually travels: customer → pain → solution →
 *     advantage → distribution → revenue.
 *   - A module's height is its `strength`. A weak part is visibly short.
 *   - A module unsupported by evidence stays translucent — you can see
 *     straight through the parts you have only assumed.
 *   - A module carrying an unresolved high-impact assumption fractures: it
 *     splits open and pulses on the risk colour, and keeps doing it until the
 *     assumption is resolved.
 *   - Links between modules carry value beads. A link into a fractured module
 *     stalls, so you can see where the flow actually breaks.
 *   - The spine at the centre is the venture: it lights in proportion to how
 *     much of the chain is holding.
 */

export interface CoreNode {
  id: string
  kind: string
  label: string
  strength: number
  unknowns: number
  /** True when at least one sourced or user-provided source backs it. */
  evidenced: boolean
  /** Highest impact of any unresolved assumption attached to this part. */
  risk: number
}

export interface CoreLink {
  from: string
  to: string
}

/** The order value moves through a venture. Anything unrecognised goes last. */
const CHAIN = ['customer', 'pain', 'solution', 'advantage', 'distribution', 'revenue']

function chainIndex(kind: string) {
  const i = CHAIN.indexOf(kind.toLowerCase())
  return i === -1 ? CHAIN.length : i
}

/** Modules sit on a shallow horseshoe so the whole chain stays readable. */
function seat(i: number, n: number) {
  const t = n <= 1 ? 0.5 : i / (n - 1)
  const a = -Math.PI * 0.62 + t * Math.PI * 1.24
  const R = 2.5
  return new THREE.Vector3(Math.sin(a) * R, 0, -Math.cos(a) * R * 0.52)
}

function Module({
  node,
  position,
  selected,
  hovered,
  onSelect,
  onHover,
}: {
  node: CoreNode
  position: THREE.Vector3
  selected: boolean
  hovered: boolean
  onSelect: () => void
  onHover: (on: boolean) => void
}) {
  const p = useScenePalette()
  const group = useRef<THREE.Group>(null)
  const upper = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Mesh>(null)

  const height = 0.4 + (node.strength / 5) * 1.15
  const fractured = node.risk >= 4
  const tone = fractured ? p.risk : node.evidenced ? p.signal : p.unknown

  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: tone,
        emissive: tone,
        emissiveIntensity: node.evidenced ? 0.28 : 0.12,
        roughness: node.evidenced ? 0.36 : 0.08,
        metalness: node.evidenced ? 0.6 : 0.15,
        transparent: true,
        // Assumed parts are see-through. That is the point.
        opacity: node.evidenced ? 0.96 : 0.34,
      }),
    [tone, node.evidenced],
  )

  useFrame((st) => {
    const g = group.current
    if (!g) return
    const t = st.clock.elapsedTime
    const lift = selected ? 0.34 : hovered ? 0.16 : 0
    g.position.y += (lift - g.position.y) * 0.12
    g.rotation.y = Math.sin(t * 0.3 + position.x) * 0.05

    // A fractured module splits along its seam and keeps pulsing.
    if (upper.current) {
      const split = fractured ? 0.09 + Math.sin(t * 2.1) * 0.05 : 0
      upper.current.position.y = height / 2 + split
    }
    if (halo.current) {
      halo.current.visible = fractured || selected
      const m = halo.current.material as THREE.MeshBasicMaterial
      m.opacity = fractured ? 0.2 + Math.sin(t * 2.6) * 0.12 : selected ? 0.22 : 0
      halo.current.scale.setScalar(1 + (fractured ? Math.sin(t * 2.6) * 0.07 : 0))
    }
  })

  return (
    <group position={position}>
      <group
        ref={group}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          onSelect()
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          onHover(true)
        }}
        onPointerOut={() => onHover(false)}
      >
        {/* Lower body */}
        <mesh material={mat} position={[0, height / 4, 0]}>
          <cylinderGeometry args={[0.44, 0.5, height / 2, 6]} />
          <Edges threshold={15} color={tone} />
        </mesh>
        {/* Upper body — lifts away when the part is fractured. */}
        <mesh ref={upper} material={mat} position={[0, height / 2, 0]}>
          <cylinderGeometry args={[0.38, 0.44, height / 2, 6]} />
          <Edges threshold={15} color={tone} />
        </mesh>

        {/* Unknowns stack as small unanswered markers on the cap. */}
        {Array.from({ length: Math.min(4, node.unknowns) }, (_, i) => (
          <mesh key={i} position={[(i - 1.5) * 0.14, height + 0.12, 0]}>
            <boxGeometry args={[0.07, 0.07, 0.07]} />
            <meshBasicMaterial color={p.unknown} transparent opacity={0.75} />
          </mesh>
        ))}

        <mesh ref={halo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.62, 0.82, 32]} />
          <meshBasicMaterial color={fractured ? p.risk : p.action} transparent opacity={0} />
        </mesh>
      </group>
    </group>
  )
}

function Links({
  links,
  seats,
  nodes,
}: {
  links: CoreLink[]
  seats: Map<string, THREE.Vector3>
  nodes: Map<string, CoreNode>
}) {
  const p = useScenePalette()
  const beadRefs = useRef<(THREE.Mesh | null)[]>([])

  const curves = useMemo(
    () =>
      links
        .map((l) => {
          const a = seats.get(l.from)
          const b = seats.get(l.to)
          if (!a || !b) return null
          const mid = a.clone().add(b).multiplyScalar(0.5)
          mid.y += 0.62
          // A link is only healthy if both ends are.
          const stalled = (nodes.get(l.to)?.risk ?? 0) >= 4
          return { curve: new THREE.QuadraticBezierCurve3(a, mid, b), stalled }
        })
        .filter(Boolean) as { curve: THREE.QuadraticBezierCurve3; stalled: boolean }[],
    [links, seats, nodes],
  )

  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame((st) => {
    const t = st.clock.elapsedTime
    curves.forEach((c, i) => {
      const el = beadRefs.current[i]
      if (!el) return
      // A stalled link's bead crawls to the break and stops there.
      const u = c.stalled ? Math.min(0.62, ((t * 0.22) % 1.6)) : (t * 0.22 + i * 0.3) % 1
      c.curve.getPointAt(u, tmp)
      el.position.copy(tmp)
      const m = el.material as THREE.MeshBasicMaterial
      m.color.set(c.stalled ? p.risk : p.signal)
    })
  })

  return (
    <group>
      {curves.map((c, i) => (
        <group key={i}>
          <mesh geometry={new THREE.TubeGeometry(c.curve, 24, 0.012, 5, false)}>
            <meshBasicMaterial color={c.stalled ? p.risk : p.rule} transparent opacity={c.stalled ? 0.5 : 0.35} />
          </mesh>
          <mesh
            ref={(el) => {
              beadRefs.current[i] = el
            }}
          >
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshBasicMaterial color={p.signal} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Spine({ health }: { health: number }) {
  const p = useScenePalette()
  const ref = useRef<THREE.Mesh>(null)
  const glow = useRef<THREE.Mesh>(null)

  useFrame((st) => {
    const t = st.clock.elapsedTime
    if (ref.current) {
      const m = ref.current.material as THREE.MeshStandardMaterial
      m.emissiveIntensity = 0.25 + health * 0.85 + Math.sin(t * 1.4) * 0.05
      ref.current.rotation.y = t * 0.16
    }
    if (glow.current) {
      const m = glow.current.material as THREE.MeshBasicMaterial
      m.opacity = 0.05 + health * 0.14 + Math.sin(t * 1.4) * 0.02
      glow.current.scale.setScalar(1 + health * 0.3)
    }
  })

  return (
    <group position={[0, 0.9, -0.4]}>
      <mesh ref={ref}>
        <octahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial
          color={p.action}
          emissive={p.action}
          emissiveIntensity={0.3}
          roughness={0.22}
          metalness={0.55}
        />
        <Edges threshold={12} color={p.paper} />
      </mesh>
      <mesh ref={glow}>
        <sphereGeometry args={[1.1, 20, 20]} />
        <meshBasicMaterial color={p.action} transparent opacity={0} />
      </mesh>
    </group>
  )
}

function Scene({
  nodes,
  links,
  selected,
  onSelect,
}: {
  nodes: CoreNode[]
  links: CoreLink[]
  selected: string | null
  onSelect: (id: string | null) => void
}) {
  const p = useScenePalette()
  const [hover, setHover] = useState<string | null>(null)
  const rig = useRef<THREE.Group>(null)

  const ordered = useMemo(
    () => [...nodes].sort((a, b) => chainIndex(a.kind) - chainIndex(b.kind)),
    [nodes],
  )
  const seats = useMemo(() => {
    const m = new Map<string, THREE.Vector3>()
    ordered.forEach((n, i) => m.set(n.id, seat(i, ordered.length)))
    return m
  }, [ordered])
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  // How much of the chain is actually holding: evidenced and unfractured.
  const health = useMemo(() => {
    if (!nodes.length) return 0
    const good = nodes.filter((n) => n.evidenced && n.risk < 4).length
    return good / nodes.length
  }, [nodes])

  useFrame((st) => {
    if (!rig.current) return
    // A slow drift, and a gentle lean toward the pointer. Never a spin.
    const { x, y } = st.pointer
    rig.current.rotation.y += (x * 0.22 - rig.current.rotation.y) * 0.05
    rig.current.rotation.x += (0.14 - y * 0.08 - rig.current.rotation.x) * 0.05
  })

  return (
    <>
      <color attach="background" args={[p.bg]} />
      <ambientLight intensity={p.ambient} />
      <directionalLight position={[4, 6, 5]} intensity={p.keyIntensity} color={p.keyLight} />
      <directionalLight position={[-5, -1, -4]} intensity={p.fillIntensity} color={p.fillLight} />
      <pointLight position={[0, 2.4, 0]} intensity={9} distance={11} color={p.action} />

      {/* Clicking the empty stage clears the selection. */}
      <mesh position={[0, 0, -6]} onClick={() => onSelect(null)} visible={false}>
        <planeGeometry args={[40, 40]} />
      </mesh>

      <group ref={rig} position={[0, -0.7, 0]}>
        {/* The bench everything stands on. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -0.6]}>
          <ringGeometry args={[2.1, 3.0, 48, 1, Math.PI * 0.86, Math.PI * 1.28]} />
          <meshBasicMaterial color={p.rule} transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>

        <Spine health={health} />
        <Links links={links} seats={seats} nodes={byId} />

        {ordered.map((n, i) => (
          <Module
            key={n.id}
            node={n}
            position={seat(i, ordered.length)}
            selected={selected === n.id}
            hovered={hover === n.id}
            onSelect={() => onSelect(selected === n.id ? null : n.id)}
            onHover={(on) => setHover(on ? n.id : null)}
          />
        ))}
      </group>
    </>
  )
}

export function VentureCore({
  nodes,
  links,
  selected,
  onSelect,
}: {
  nodes: CoreNode[]
  links: CoreLink[]
  selected: string | null
  onSelect: (id: string | null) => void
}) {
  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ position: [0, 1.6, 6.4], fov: 42 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <Scene nodes={nodes} links={links} selected={selected} onSelect={onSelect} />
      </Suspense>
    </Canvas>
  )
}
