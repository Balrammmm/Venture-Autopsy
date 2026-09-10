'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Edges } from '@react-three/drei'
import { rng, useKit, type Kit } from './vocabulary'
import { ease } from '../scroll/ScrollDirector'
import type { ActId, ScrollState } from '../scroll/ScrollDirector'
import { ACTS } from '../scroll/ScrollDirector'

/**
 * Scene handoffs.
 *
 * The page is one story, so nothing is allowed to fade out and be replaced by
 * something unrelated. At each seam a set of objects leaves the outgoing scene
 * and arrives as the material of the next one, keeping its identity:
 *
 *   hero → evidence     a blueprint sheet flies out of the engine
 *   evidence → fieldwork the glass shards become interview notes
 *   fieldwork → atlas    the clustered notes fold into instrument tokens
 *   atlas → resolution   the tokens travel in to build the monument
 *
 * A seam spans the end of one act and the start of the next, so the carry is
 * continuous across the section boundary rather than restarting at it.
 */

const TAIL = 0.18 // how much of the outgoing act the carry occupies
const HEAD = 0.18 // how much of the incoming act it occupies

/** 0 before the seam, 0→1 across it, 1 after. Continuous over the boundary. */
export function seamProgress(s: ScrollState, from: ActId, to: ActId): number {
  const fi = ACTS.indexOf(from)
  const ai = ACTS.indexOf(s.active)

  if (ai < fi) return 0
  if (ai > fi + 1) return 1

  if (s.active === from) {
    const t = s.act[from]
    if (t < 1 - TAIL) return 0
    return ((t - (1 - TAIL)) / TAIL) * 0.5
  }
  if (s.active === to) {
    const t = s.act[to]
    if (t > HEAD) return 1
    return 0.5 + (t / HEAD) * 0.5
  }
  return 0
}

type CarrierKind = 'sheet' | 'shard' | 'note' | 'token'

interface CarrySpec {
  from: ActId
  to: ActId
  kind: CarrierKind
  count: number
  /** Where the objects leave from, in the outgoing scene's space. */
  origin: (i: number, r: () => number) => THREE.Vector3
  /** Where they arrive, in the incoming scene's space. */
  target: (i: number, r: () => number) => THREE.Vector3
}

const SEAMS: CarrySpec[] = [
  {
    from: 'hero',
    to: 'evidence',
    kind: 'sheet',
    count: 1,
    origin: () => new THREE.Vector3(0.6, 0.4, 1.2),
    target: () => new THREE.Vector3(-1.45, -0.12, 0),
  },
  {
    from: 'evidence',
    to: 'fieldwork',
    kind: 'shard',
    count: 6,
    // The shards end where the assumption broke, on the right of the flow.
    origin: (i, r) =>
      new THREE.Vector3(1.5 + (r() - 0.5) * 0.9, (r() - 0.5) * 0.9, (i % 2 ? 0.3 : -0.2)),
    // They arrive where the handset feeds notes onto the wall.
    target: (i, r) => new THREE.Vector3(-2.3 + (r() - 0.5) * 0.4, -0.4 + i * 0.16, 0.5 + r() * 0.2),
  },
  {
    from: 'fieldwork',
    to: 'atlas',
    kind: 'note',
    count: 5,
    // Leaving the sorted cluster on the wall.
    origin: (i, r) => new THREE.Vector3(-0.95 + (i % 2) * 0.56, 0.7 - Math.floor(i / 2) * 0.55, r() * 0.1),
    // Arriving on the atlas orbit.
    target: (i) => {
      const a = (i / 5) * Math.PI * 2
      return new THREE.Vector3(Math.cos(a) * 2.9, Math.sin(a * 2) * 0.5, Math.sin(a) * 2.9 * 0.55)
    },
  },
  {
    from: 'atlas',
    to: 'resolution',
    kind: 'token',
    // One carrier per Atlas instrument, so every module the reader stepped
    // through is visibly the one that arrives.
    count: 9,
    origin: (i) => {
      const a = (i / 9) * Math.PI * 2 + 0.4
      return new THREE.Vector3(Math.cos(a) * 2.9, Math.sin(a * 2) * 0.5, Math.sin(a) * 2.9 * 0.55)
    },
    // They land exactly on the venture architecture's module ring — same
    // radius and deck height Resolution seats them at, so the handoff has no
    // seam: the carrier stops where the real module starts.
    target: (i) => {
      const a = (i / 9) * Math.PI * 2
      return new THREE.Vector3(Math.cos(a) * 1.32, 0.42, Math.sin(a) * 1.32)
    },
  },
]

function CarrierMesh({ kind, kit }: { kind: CarrierKind; kit: Kit }) {
  switch (kind) {
    case 'sheet':
      return (
        <mesh material={kit.paper}>
          <boxGeometry args={[1.5, 1.05, 0.016]} />
          <Edges threshold={15} color={kit.p.paperEdge} />
        </mesh>
      )
    case 'shard':
      return (
        <mesh>
          <boxGeometry args={[0.4, 0.4, 0.09]} />
          <meshStandardMaterial
            color={kit.p.risk}
            transparent
            opacity={0.55}
            roughness={0.12}
            metalness={0.2}
            side={THREE.DoubleSide}
          />
          <Edges threshold={15} color={kit.p.risk} />
        </mesh>
      )
    case 'note':
      return (
        <mesh>
          <boxGeometry args={[0.44, 0.44, 0.014]} />
          <meshStandardMaterial color={kit.p.signal} roughness={0.92} side={THREE.DoubleSide} />
          <Edges threshold={15} color={kit.p.signal} />
        </mesh>
      )
    case 'token':
      return (
        <mesh material={kit.dark}>
          <cylinderGeometry args={[0.24, 0.24, 0.07, 6]} />
          <Edges threshold={15} color={kit.p.action} />
        </mesh>
      )
  }
}

function Seam({ spec, scroll }: { spec: CarrySpec; scroll: React.MutableRefObject<ScrollState> }) {
  const kit = useKit()
  const group = useRef<THREE.Group>(null)
  const refs = useRef<(THREE.Group | null)[]>([])

  const items = useMemo(() => {
    const r = rng(spec.from.length * 977 + spec.count * 31)
    return Array.from({ length: spec.count }, (_, i) => ({
      origin: spec.origin(i, r),
      target: spec.target(i, r),
      // A bowed path that passes near the camera, so the carry is legible.
      bow: new THREE.Vector3((r() - 0.5) * 1.6, (r() - 0.5) * 1.2 + 0.3, 2.6 + r() * 1.6),
      spin: new THREE.Euler(r() * 4, r() * 4, r() * 3),
      delay: (i / Math.max(1, spec.count)) * 0.28,
      scale: 0.7 + r() * 0.4,
    }))
  }, [spec])

  const a = useMemo(() => new THREE.Vector3(), [])
  const b = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const g = group.current
    if (!g) return
    const s = seamProgress(scroll.current, spec.from, spec.to)

    // Only alive during the carry itself.
    const live = s > 0.001 && s < 0.999
    g.visible = live
    if (!live) return

    items.forEach((it, i) => {
      const el = refs.current[i]
      if (!el) return
      const local = ease(Math.min(1, Math.max(0, (s - it.delay) / (1 - it.delay || 1))))

      // Quadratic bezier through the bow point: out toward the camera, then
      // back into the next scene.
      const inv = 1 - local
      a.copy(it.origin).multiplyScalar(inv * inv)
      b.copy(it.bow).multiplyScalar(2 * inv * local)
      a.add(b)
      b.copy(it.target).multiplyScalar(local * local)
      a.add(b)
      el.position.copy(a)

      el.rotation.set(it.spin.x * local, it.spin.y * local, it.spin.z * local)
      // Larger as it passes the camera, settling to scene scale on arrival.
      const swell = Math.sin(local * Math.PI) * 0.5
      el.scale.setScalar(it.scale * (1 + swell))
    })
  })

  return (
    <group ref={group}>
      {items.map((_, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
        >
          <CarrierMesh kind={spec.kind} kit={kit} />
        </group>
      ))}
    </group>
  )
}

export function Handoffs({ scroll }: { scroll: React.MutableRefObject<ScrollState> }) {
  return (
    <>
      {SEAMS.map((spec) => (
        <Seam key={`${spec.from}-${spec.to}`} spec={spec} scroll={scroll} />
      ))}
    </>
  )
}
