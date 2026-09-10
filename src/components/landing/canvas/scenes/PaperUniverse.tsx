'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Edges } from '@react-three/drei'
import { useKit } from '../vocabulary'
import { ease, range } from '../../scroll/ScrollDirector'
import type { ScrollState } from '../../scroll/ScrollDirector'
import type { PointerState } from '../LandingCanvas'

/**
 * Evidence — "a blueprint becomes a person".
 *
 * One subject, one continuous causal sequence, no decorative fragments:
 *
 *   1. A blueprint sheet unfolds and a customer silhouette rises out of it.
 *   2. A single value-flow line draws from that person through pain, then
 *      solution, then payment — a pulse travels it so direction is legible.
 *   3. The load-bearing assumption under "payment" turns to glass, then cracks
 *      into a few controlled fragments.
 *
 * Every object belongs to one of those three beats. Nothing else is here.
 */

const NODE_COUNT = 3

function silhouette() {
  const head = new THREE.Shape()
  head.absarc(0, 0.6, 0.16, 0, Math.PI * 2, false)
  const body = new THREE.Shape()
  body.moveTo(-0.25, 0.36)
  body.quadraticCurveTo(-0.3, -0.08, -0.21, -0.5)
  body.lineTo(0.21, -0.5)
  body.quadraticCurveTo(0.3, -0.08, 0.25, 0.36)
  body.quadraticCurveTo(0, 0.48, -0.25, 0.36)
  return [new THREE.ShapeGeometry(head), new THREE.ShapeGeometry(body)] as const
}

export function PaperUniverse({
  scroll,
  pointer,
}: {
  scroll: React.MutableRefObject<ScrollState>
  pointer: React.MutableRefObject<PointerState>
}) {
  const kit = useKit()
  const root = useRef<THREE.Group>(null)
  const sheetL = useRef<THREE.Mesh>(null)
  const sheetR = useRef<THREE.Mesh>(null)
  const person = useRef<THREE.Group>(null)
  const flow = useRef<THREE.Mesh>(null)
  const pulse = useRef<THREE.Mesh>(null)
  const nodeRefs = useRef<(THREE.Group | null)[]>([])
  const glass = useRef<THREE.Mesh>(null)
  const shardRefs = useRef<(THREE.Mesh | null)[]>([])

  const [headGeo, bodyGeo] = useMemo(silhouette, [])

  // The path value takes: out of the person, through the three stops.
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.45, -0.12, 0),
        new THREE.Vector3(-0.72, 0.3, 0.12),
        new THREE.Vector3(0.05, -0.06, 0),
        new THREE.Vector3(0.82, 0.28, -0.1),
        new THREE.Vector3(1.5, -0.04, 0),
      ]),
    [],
  )

  const nodePositions = useMemo(
    () => [curve.getPoint(0.3), curve.getPoint(0.6), curve.getPoint(0.93)],
    [curve],
  )

  const flowGeo = useMemo(() => new THREE.TubeGeometry(curve, 90, 0.022, 8, false), [curve])

  // A handful of controlled fragments — a break, not an explosion.
  const shards = useMemo(
    () =>
      (
        [
          [-1, 1],
          [1, 1],
          [-1, -1],
          [1, -1],
          [0, 0],
        ] as const
      ).map(([gx, gy], i) => ({
        pos: new THREE.Vector3(gx * 0.5, gy * 0.42, (i % 2 ? 0.3 : -0.22) + i * 0.04),
        rot: new THREE.Euler(gx * 0.5, gy * 0.6, (gx + gy) * 0.35),
        scale: i === 4 ? 0.5 : 0.62,
      })),
    [],
  )

  const glassMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: kit.p.risk,
        transparent: true,
        opacity: 0.34,
        roughness: 0.1,
        metalness: 0.2,
        side: THREE.DoubleSide,
      }),
    [kit],
  )
  const personMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: kit.p.intel,
        roughness: 0.45,
        metalness: 0.1,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    [kit],
  )
  const shardMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: kit.p.risk,
        transparent: true,
        opacity: 0.5,
        roughness: 0.12,
        metalness: 0.2,
        side: THREE.DoubleSide,
      }),
    [kit],
  )

  useFrame((st, delta) => {
    const g = root.current
    if (!g) return
    const t = scroll.current.act.evidence
    const time = st.clock.elapsedTime

    g.visible = t > 0.0001 && t < 0.9999
    if (!g.visible) return

    // Small damped parallax, never enough to move the subject out of its column.
    const px = pointer.current.active ? pointer.current.x : 0
    const py = pointer.current.active ? pointer.current.y : 0
    const k = Math.min(delta * 2.4, 1)
    g.rotation.y += (px * 0.12 - g.rotation.y) * k
    g.rotation.x += (py * 0.06 - g.rotation.x) * k

    /* Beat 1 — the sheet unfolds, the customer rises out of it. */
    const unfold = ease(range(t, 0.02, 0.24))
    const rise = ease(range(t, 0.14, 0.36))

    if (sheetL.current) sheetL.current.rotation.y = (1 - unfold) * 1.25
    if (sheetR.current) sheetR.current.rotation.y = -(1 - unfold) * 1.25

    if (person.current) {
      person.current.visible = rise > 0.01
      person.current.position.z = rise * 0.45
      person.current.scale.setScalar(0.4 + rise * 0.7)
      personMat.opacity = rise
    }

    /* Beat 2 — one bright line draws through pain, solution, payment. */
    const draw = ease(range(t, 0.34, 0.62))
    if (flow.current) {
      flow.current.visible = draw > 0.01
      const idx = flowGeo.index
      if (idx) flowGeo.setDrawRange(0, Math.max(3, Math.floor(idx.count * draw)))
      const m = flow.current.material as THREE.MeshBasicMaterial
      m.opacity = 0.4 + draw * 0.45
    }

    nodeRefs.current.forEach((n, i) => {
      if (!n) return
      const appear = ease(range(t, 0.38 + i * 0.07, 0.54 + i * 0.07))
      n.visible = appear > 0.01
      n.scale.setScalar(appear)
      n.position.copy(nodePositions[i])
      n.position.y += Math.sin(time * 0.8 + i) * 0.02 * appear
    })

    if (pulse.current) {
      pulse.current.visible = draw > 0.6 && t < 0.74
      if (pulse.current.visible) {
        pulse.current.position.copy(curve.getPoint((time * 0.22) % 1))
        pulse.current.scale.setScalar(0.9 + Math.sin(time * 4) * 0.12)
      }
    }

    /* Beat 3 — the load-bearing assumption vitrifies, then breaks. */
    const vitrify = ease(range(t, 0.62, 0.76))
    const crack = ease(range(t, 0.76, 0.96))

    if (glass.current) {
      glass.current.visible = vitrify > 0.01 && crack < 0.02
      glass.current.position.copy(nodePositions[2])
      glass.current.scale.setScalar(vitrify * 0.9)
      glassMat.opacity = 0.34 * vitrify
    }

    shardRefs.current.forEach((sh, i) => {
      if (!sh) return
      const s = shards[i]
      sh.visible = crack > 0.01
      if (!sh.visible) return
      const local = ease(Math.min(1, Math.max(0, crack * 1.1 - i * 0.04)))
      sh.position.copy(nodePositions[2]).addScaledVector(s.pos, local)
      sh.rotation.set(s.rot.x * local, s.rot.y * local, s.rot.z * local)
      sh.scale.setScalar(s.scale * (0.5 + local * 0.5))
    })
  })

  return (
    <group ref={root}>
      {/* The blueprint the customer comes out of. */}
      <group position={[-1.45, -0.12, 0]}>
        <mesh ref={sheetL} material={kit.paper} position={[-0.52, 0, 0]}>
          <planeGeometry args={[1.04, 1.5]} />
          <Edges threshold={15} color={kit.p.paperEdge} />
        </mesh>
        <mesh ref={sheetR} material={kit.paperBack} position={[0.52, 0, 0]}>
          <planeGeometry args={[1.04, 1.5]} />
          <Edges threshold={15} color={kit.p.paperEdge} />
        </mesh>

        <group ref={person}>
          <mesh geometry={bodyGeo} material={personMat} />
          <mesh geometry={headGeo} material={personMat} />
        </group>
      </group>

      {/* The single value-flow line, and the value moving along it. */}
      <mesh ref={flow} geometry={flowGeo}>
        <meshBasicMaterial color={kit.p.signal} transparent opacity={0.7} />
      </mesh>
      <mesh ref={pulse}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color={kit.p.action} />
      </mesh>

      {/* Three stops. The last one is the risk. */}
      {Array.from({ length: NODE_COUNT }, (_, i) => (
        <group
          key={i}
          ref={(el) => {
            nodeRefs.current[i] = el
          }}
        >
          <mesh material={kit.dark}>
            <boxGeometry args={[0.5, 0.2, 0.06]} />
            <Edges threshold={15} color={i === 2 ? kit.p.risk : kit.p.signal} />
          </mesh>
          <mesh position={[0, 0, 0.04]}>
            <planeGeometry args={[0.3, 0.03]} />
            <meshBasicMaterial color={i === 2 ? kit.p.risk : kit.p.signal} transparent opacity={0.85} />
          </mesh>
        </group>
      ))}

      {/* The assumption, vitrified. */}
      <mesh ref={glass} material={glassMat}>
        <boxGeometry args={[0.86, 0.86, 0.14]} />
        <Edges threshold={15} color={kit.p.risk} />
      </mesh>

      {/* Its controlled fragments. */}
      {shards.map((_, i) => (
        <mesh
          key={i}
          material={shardMat}
          ref={(el) => {
            shardRefs.current[i] = el
          }}
        >
          <boxGeometry args={[0.42, 0.42, 0.1]} />
          <Edges threshold={15} color={kit.p.risk} />
        </mesh>
      ))}
    </group>
  )
}
