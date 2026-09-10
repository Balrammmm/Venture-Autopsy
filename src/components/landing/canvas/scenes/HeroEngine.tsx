'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Part, rng, useKit, type PartKind } from '../vocabulary'
import type { ScrollState } from '../../scroll/ScrollDirector'
import type { PointerState } from '../LandingCanvas'

interface Piece {
  id: number
  kind: PartKind
  home: THREE.Vector3
  away: THREE.Vector3
  radius: number
  orbit: number
  tilt: number
  scale: number
  /** Later pieces leave later, so the machine comes apart in layers. */
  delay: number
  spin: THREE.Euler
}

/**
 * The machine. Rings around a lit spine so the silhouette reads as something
 * engineered, not a scatter — and every piece is a part the later acts reuse.
 */
function buildEngine(): Piece[] {
  const r = rng(20260910)
  const pieces: Piece[] = []
  let id = 0

  const add = (kind: PartKind, home: THREE.Vector3, scale: number, delay: number, orbit = 0, tilt = 0) => {
    pieces.push({
      id: id++,
      kind,
      home,
      away: home
        .clone()
        .multiplyScalar(3.2)
        .add(new THREE.Vector3((r() - 0.5) * 6, (r() - 0.5) * 4 - 1, 3.5 + r() * 5)),
      radius: Math.hypot(home.x, home.z),
      orbit,
      tilt,
      scale,
      delay,
      spin: new THREE.Euler(r() * Math.PI * 2.2, r() * Math.PI * 2.2, r() * Math.PI * 1.4),
    })
  }

  // Core: stacked glass plates, the thing being assayed.
  for (let i = 0; i < 3; i++) {
    add('glass', new THREE.Vector3(0, (i - 1) * 0.42, 0), 0.92 - i * 0.08, 0.34 + i * 0.03)
  }

  // Carousel of blueprint sheets, like pages in a press.
  const sheets = 6
  for (let i = 0; i < sheets; i++) {
    const a = (i / sheets) * Math.PI * 2
    add(
      'blueprint',
      new THREE.Vector3(Math.cos(a) * 1.42, Math.sin(a * 2) * 0.3, Math.sin(a) * 1.42),
      0.62,
      0.16 + (i / sheets) * 0.12,
      0.085,
      0.16,
    )
  }

  // Mid ring: the instruments of measurement.
  const mid: PartKind[] = ['chart', 'receipt', 'block', 'fold', 'chart', 'sticky', 'block', 'receipt']
  for (let i = 0; i < mid.length; i++) {
    const a = (i / mid.length) * Math.PI * 2 + 0.4
    add(
      mid[i],
      new THREE.Vector3(Math.cos(a) * 2.18, Math.sin(a * 3) * 0.54 - 0.08, Math.sin(a) * 2.18),
      mid[i] === 'receipt' ? 0.72 : 0.6 + r() * 0.14,
      0.06 + (i / mid.length) * 0.1,
      -0.052,
    )
  }

  // Outer ring: currency, bearing and the first prototype. First to leave.
  const outer: PartKind[] = ['coin', 'prototype', 'compass', 'coin', 'sticky', 'compass', 'coin']
  for (let i = 0; i < outer.length; i++) {
    const a = (i / outer.length) * Math.PI * 2 + 1.1
    add(
      outer[i],
      new THREE.Vector3(Math.cos(a) * 2.62, Math.sin(a * 2) * 0.72 + 0.1, Math.sin(a) * 2.62),
      outer[i] === 'compass' ? 0.62 : outer[i] === 'prototype' ? 0.7 : 0.78,
      (i / outer.length) * 0.08,
      0.034,
    )
  }

  return pieces
}

export function HeroEngine({
  scroll,
  pointer,
}: {
  scroll: React.MutableRefObject<ScrollState>
  pointer: React.MutableRefObject<PointerState>
}) {
  const kit = useKit()
  const pieces = useMemo(buildEngine, [])
  const group = useRef<THREE.Group>(null)
  const spine = useRef<THREE.Mesh>(null)
  const armature = useRef<THREE.Group>(null)
  const refs = useRef<(THREE.Group | null)[]>([])

  const target = useMemo(() => new THREE.Vector3(), [])
  const orbited = useMemo(() => new THREE.Vector3(), [])
  const cursor = useMemo(() => new THREE.Vector3(), [])
  const offset = useMemo(() => new THREE.Vector3(), [])

  useFrame((st, delta) => {
    const g = group.current
    if (!g) return

    const p = scroll.current.act.hero
    const dt = Math.min(delta, 0.05)
    const t = st.clock.elapsedTime

    // Once fully dismantled the engine stops drawing; act two takes over.
    const gone = p > 0.99
    g.visible = !gone
    if (gone) return

    // Breathing at rest: a slow swell that stops as the machine comes apart.
    const breath = 1 + Math.sin(t * 0.5) * 0.012 * (1 - p)
    g.scale.setScalar(breath)

    g.rotation.y += dt * 0.075
    const tiltX = pointer.current.active ? pointer.current.y * 0.17 : 0
    const tiltZ = pointer.current.active ? -pointer.current.x * 0.09 : 0
    g.rotation.x += (tiltX - g.rotation.x) * dt * 2.4
    g.rotation.z += (tiltZ - g.rotation.z) * dt * 2.4
    g.position.y += (0.15 - g.position.y) * dt * 2

    // Magnetic depth only — the camera handles the sideways framing.
    const depth = pointer.current.active ? pointer.current.x * 0.45 : 0
    g.position.x += (depth - g.position.x) * dt * 1.8

    cursor.set(pointer.current.x * 4.4, pointer.current.y * 3.2, 1.4)

    if (armature.current) {
      const fade = 1 - Math.min(1, p * 2.1)
      armature.current.visible = fade > 0.02
      armature.current.rotation.y += dt * 0.05
      armature.current.children.forEach((c) => {
        const m = (c as THREE.Mesh).material as THREE.Material & { opacity: number }
        if (m && 'opacity' in m) m.opacity = (c === spine.current ? 0.5 : 0.3) * fade
      })
      if (spine.current) {
        const m = spine.current.material as THREE.MeshBasicMaterial
        m.opacity = 0.5 * fade * (0.82 + Math.sin(t * 1.4) * 0.18)
      }
    }

    for (let i = 0; i < pieces.length; i++) {
      const el = refs.current[i]
      if (!el) continue
      const piece = pieces[i]

      const local = Math.min(1, Math.max(0, (p - piece.delay) / (1 - piece.delay || 1)))
      const eased = local * local * (3 - 2 * local)

      if (piece.orbit !== 0 && eased < 0.98) {
        const a = Math.atan2(piece.home.z, piece.home.x) + t * piece.orbit
        orbited.set(Math.cos(a) * piece.radius, piece.home.y, Math.sin(a) * piece.radius)
        target.lerpVectors(orbited, piece.away, eased)
      } else {
        target.lerpVectors(piece.home, piece.away, eased)
      }

      // Idle drift so the assembled machine is never static.
      target.y += Math.sin(t * 0.55 + piece.id * 1.3) * 0.055 * (1 - eased)
      target.x += Math.cos(t * 0.42 + piece.id) * 0.04 * (1 - eased)

      if (pointer.current.active && eased < 0.95) {
        offset.copy(el.position).sub(cursor)
        const dist = offset.length()
        if (dist < 3.4) {
          const push = (1 - dist / 3.4) ** 2
          offset.normalize().multiplyScalar(push * 0.9 * (1 - eased))
          target.add(offset)
        }
      }

      el.position.lerp(target, 1 - Math.pow(0.0016, dt))

      const faceOut = Math.atan2(piece.home.x, piece.home.z) + Math.PI / 2
      el.rotation.x += (piece.tilt + (piece.spin.x - piece.tilt) * eased - el.rotation.x) * dt * 3
      el.rotation.y += (faceOut + (piece.spin.y - faceOut) * eased - el.rotation.y) * dt * 3
      el.rotation.z += (piece.spin.z * eased - el.rotation.z) * dt * 3

      el.scale.setScalar(piece.scale * (1 - eased * 0.45))
    }
  })

  return (
    <group ref={group}>
      {/* Armature: the frame the machine is mounted on. */}
      <group ref={armature}>
        <mesh ref={spine}>
          <cylinderGeometry args={[0.028, 0.028, 4.6, 10]} />
          <meshBasicMaterial color={kit.p.intel} transparent opacity={0.5} />
        </mesh>
        <mesh position={[0, -1.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.5, 0.012, 6, 90]} />
          <meshBasicMaterial color={kit.p.paper} transparent opacity={0.3} />
        </mesh>
        <mesh position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.72, 0.01, 6, 80]} />
          <meshBasicMaterial color={kit.p.paper} transparent opacity={0.3} />
        </mesh>
        <mesh position={[0, -1.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.42, 0.02, 6, 40]} />
          <meshBasicMaterial color={kit.p.action} transparent opacity={0.34} />
        </mesh>
      </group>

      {pieces.map((piece, i) => (
        <group
          key={piece.id}
          ref={(el) => {
            refs.current[i] = el
          }}
          position={piece.home}
          scale={piece.scale}
        >
          <Part kind={piece.kind} kit={kit} />
        </group>
      ))}
    </group>
  )
}
