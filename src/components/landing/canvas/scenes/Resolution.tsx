'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Edges } from '@react-three/drei'
import { rng, useKit, type Kit } from '../vocabulary'
import { ease, range } from '../../scroll/ScrollDirector'
import type { ScrollState } from '../../scroll/ScrollDirector'
import type { PointerState } from '../LandingCanvas'

/**
 * The venture, assembled.
 *
 * Not an abstract sculpture: an architecture. Everything the page has handled
 * returns and locks into a standing structure — a plinth of evidence, tiers of
 * blueprint plates held apart by metal joints, a glass core where the
 * load-bearing assumption used to break, and illuminated nodes at each
 * junction. It settles once, with a slight overshoot, and then holds still.
 */

interface Tier {
  y: number
  w: number
  d: number
  /** Where the plate comes in from before it locks. */
  from: THREE.Vector3
  fromRot: THREE.Euler
  delay: number
  tone: 'paper' | 'glass' | 'metal'
}

function buildTiers(): Tier[] {
  const r = rng(24601)
  const COUNT = 7
  return Array.from({ length: COUNT }, (_, i) => {
    const k = i / (COUNT - 1)
    // Tapering upward, so it reads as a built thing rather than a stack.
    const w = 1.9 - k * 0.95
    return {
      y: -1.0 + i * 0.32,
      w,
      d: w * 0.62,
      from: new THREE.Vector3((r() - 0.5) * 11, (r() - 0.5) * 7 + 1.5, -6 - r() * 7),
      fromRot: new THREE.Euler(r() * 5, r() * 5, r() * 4),
      delay: 0.06 * i,
      tone: i === 3 ? 'glass' : i % 3 === 1 ? 'metal' : 'paper',
    }
  })
}

/** The fine posts that hold the tiers apart. */
function Joints({
  kit,
  tiers,
  reveal,
}: {
  kit: Kit
  tiers: Tier[]
  reveal: React.MutableRefObject<number>
}) {
  const groups = useRef<(THREE.Group | null)[]>([])

  // Driven per frame, not per render: the page never re-renders while scrolling.
  useFrame(() => {
    groups.current.forEach((g, i) => {
      if (!g) return
      const on = Math.min(1, Math.max(0, reveal.current * tiers.length - (i + 1)))
      g.scale.set(1, on, 1)
      g.visible = on > 0.01
    })
  })

  return (
    <group>
      {tiers.slice(0, -1).map((t, i) => {
        const next = tiers[i + 1]
        const h = next.y - t.y
        const inset = Math.min(t.w, next.w) * 0.36
        return (
          <group
            key={i}
            ref={(el) => {
              groups.current[i] = el
            }}
            position={[0, t.y + h / 2, 0]}
            scale={[1, 0.001, 1]}
          >
            {[
              [-inset, -inset * 0.62],
              [inset, -inset * 0.62],
              [-inset, inset * 0.62],
              [inset, inset * 0.62],
            ].map(([x, z], j) => (
              <mesh key={j} position={[x, 0, z]}>
                <cylinderGeometry args={[0.018, 0.018, h, 8]} />
                <meshStandardMaterial color={kit.p.metal} roughness={0.35} metalness={0.85} />
              </mesh>
            ))}
          </group>
        )
      })}
    </group>
  )
}

export function Resolution({
  scroll,
  pointer,
}: {
  scroll: React.MutableRefObject<ScrollState>
  pointer: React.MutableRefObject<PointerState>
}) {
  const kit = useKit()
  const tiers = useMemo(buildTiers, [])
  const root = useRef<THREE.Group>(null)
  const structure = useRef<THREE.Group>(null)
  const plateRefs = useRef<(THREE.Group | null)[]>([])
  const nodeRefs = useRef<(THREE.Mesh | null)[]>([])
  const pool = useRef<THREE.Mesh>(null)
  const ringRefs = useRef<(THREE.Group | null)[]>([])
  const revealRef = useRef(0)

  const tmp = useMemo(() => new THREE.Vector3(), [])

  const mats = useMemo(
    () => ({
      paper: new THREE.MeshStandardMaterial({
        color: kit.p.paper,
        roughness: kit.p.paperRoughness,
        metalness: kit.p.metalness,
      }),
      glass: new THREE.MeshStandardMaterial({
        color: kit.p.intel,
        transparent: true,
        opacity: kit.p.glassOpacity + 0.14,
        roughness: 0.06,
        metalness: 0.3,
      }),
      metal: new THREE.MeshStandardMaterial({ color: kit.p.metal, roughness: 0.4, metalness: 0.75 }),
    }),
    [kit],
  )

  useFrame((st, delta) => {
    const g = root.current
    if (!g) return
    const t = scroll.current.act.resolution
    const time = st.clock.elapsedTime

    g.visible = t > 0.0001
    if (!g.visible) return

    const px = pointer.current.active ? pointer.current.x : 0
    const py = pointer.current.active ? pointer.current.y : 0

    // Assemble, then a single settle with a small overshoot.
    const assemble = ease(range(t, 0.06, 0.66))
    const settle = ease(range(t, 0.66, 0.84))
    revealRef.current = assemble

    if (structure.current) {
      const k = Math.min(delta * 2, 1)
      // A slow quarter-turn as it builds, then it holds still and only the
      // pointer moves it.
      const spin = (1 - settle) * 0.5 + px * 0.28
      structure.current.rotation.y += (spin - structure.current.rotation.y) * k
      structure.current.rotation.x += (py * 0.09 + (1 - assemble) * 0.32 - structure.current.rotation.x) * k
      // Overshoot: rises slightly past its resting height, then drops back.
      const overshoot = Math.sin(settle * Math.PI) * 0.08
      structure.current.position.y = -0.25 + assemble * 0.25 + overshoot
      // Grows into the frame as it builds, so the finished thing has presence.
      structure.current.scale.setScalar(1.06 + assemble * 0.26)
    }

    // The nine instruments arrive from the Atlas and take their places around
    // the plinth — the tools that produced the thing, set down beside it.
    ringRefs.current.forEach((el, i) => {
      if (!el) return
      const a = (i / 9) * Math.PI * 2
      const land = ease(Math.min(1, Math.max(0, (assemble - 0.34) / 0.5 - i * 0.045)))
      const R = 1.58
      el.position.set(
        Math.cos(a) * R * (0.4 + land * 0.6),
        -1.3 + (1 - land) * 2.4,
        Math.sin(a) * R * (0.4 + land * 0.6),
      )
      el.scale.setScalar(land * 0.13)
      el.rotation.y = a + time * 0.06
      const m = (el.children[0] as THREE.Mesh)?.material as THREE.Material & { opacity: number }
      if (m) m.opacity = land * 0.85
    })

    tiers.forEach((tier, i) => {
      const el = plateRefs.current[i]
      if (!el) return
      const local = ease(Math.min(1, Math.max(0, (assemble - tier.delay) / (1 - tier.delay || 1))))
      tmp.set(0, tier.y, 0)
      el.position.lerpVectors(tier.from, tmp, local)
      el.rotation.set(
        tier.fromRot.x * (1 - local),
        tier.fromRot.y * (1 - local),
        tier.fromRot.z * (1 - local),
      )
      el.scale.setScalar(0.4 + local * 0.6)
    })

    // Junction lights come up as the joints lock.
    nodeRefs.current.forEach((n, i) => {
      if (!n) return
      const lit = ease(Math.min(1, Math.max(0, assemble * tiers.length - i)))
      n.scale.setScalar(lit * (1 + Math.sin(time * 1.6 + i) * 0.08))
      const m = n.material as THREE.MeshBasicMaterial
      m.opacity = lit * 0.9
    })

    // A soft pool of light on the floor, instead of a ring behind the object.
    if (pool.current) {
      const lit = ease(range(t, 0.2, 0.7))
      pool.current.visible = lit > 0.02
      pool.current.scale.setScalar(0.7 + lit * 0.6)
      const m = pool.current.material as THREE.MeshBasicMaterial
      m.opacity = lit * 0.1
    }
  })

  return (
    <group ref={root}>
      {/* Floor pool. Sits under the structure, never behind it as a disc. */}
      <mesh ref={pool} position={[0, -1.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.7, 48]} />
        <meshBasicMaterial color={kit.p.action} transparent opacity={0} />
      </mesh>

      <group ref={structure}>
        {/* Plinth: the evidence the whole thing stands on. */}
        <mesh position={[0, -1.18, 0]} material={mats.metal}>
          <boxGeometry args={[2.1, 0.12, 1.35]} />
          <Edges threshold={15} color={kit.p.intel} />
        </mesh>

        {tiers.map((tier, i) => (
          <group
            key={i}
            ref={(el) => {
              plateRefs.current[i] = el
            }}
            position={tier.from}
          >
            <mesh material={tier.tone === 'glass' ? mats.glass : tier.tone === 'metal' ? mats.metal : mats.paper}>
              <boxGeometry args={[tier.w, 0.075, tier.d]} />
              <Edges
                threshold={15}
                color={tier.tone === 'glass' ? kit.p.intel : tier.tone === 'metal' ? kit.p.action : kit.p.paperEdge}
              />
            </mesh>
            {/* Blueprint ink: a few ruled marks so a plate reads as drawn on. */}
            {tier.tone === 'paper' && (
              <group position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                {[0.18, 0, -0.18].map((y, j) => (
                  <mesh key={j} position={[0, y * tier.d, 0.001]}>
                    <planeGeometry args={[tier.w * (0.62 - j * 0.14), 0.012]} />
                    <meshBasicMaterial color={kit.p.paperEdge} transparent opacity={0.45} />
                  </mesh>
                ))}
              </group>
            )}
          </group>
        ))}

        <Joints kit={kit} tiers={tiers} reveal={revealRef} />

        {/*
          The nine Atlas instruments, arrived and set down around the plinth.
          Same hexagonal token the Atlas bench used, so the object the reader
          has been clicking through is recognisably the one that lands here.
        */}
        {Array.from({ length: 9 }, (_, i) => (
          <group
            key={`ring${i}`}
            ref={(el) => {
              ringRefs.current[i] = el
            }}
            scale={0.001}
          >
            <mesh>
              <cylinderGeometry args={[0.85, 0.85, 0.34, 6]} />
              <meshStandardMaterial
                color={i % 3 === 0 ? kit.p.action : i % 3 === 1 ? kit.p.intel : kit.p.signal}
                emissive={i % 3 === 0 ? kit.p.action : i % 3 === 1 ? kit.p.intel : kit.p.signal}
                emissiveIntensity={0.42}
                roughness={0.4}
                metalness={0.3}
                transparent
                opacity={0}
              />
            </mesh>
          </group>
        ))}

        {/* Illuminated junctions. */}
        {tiers.map((tier, i) => (
          <mesh
            key={`n${i}`}
            ref={(el) => {
              nodeRefs.current[i] = el
            }}
            position={[tier.w * 0.5 - 0.06, tier.y, tier.d * 0.5 - 0.06]}
          >
            <sphereGeometry args={[0.036, 12, 12]} />
            <meshBasicMaterial color={kit.p.action} transparent opacity={0} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
