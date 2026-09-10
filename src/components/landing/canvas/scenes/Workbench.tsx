'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Edges } from '@react-three/drei'
import { rng, useKit, type Kit } from '../vocabulary'
import { ease, range } from '../../scroll/ScrollDirector'
import type { ScrollState } from '../../scroll/ScrollDirector'
import type { PointerState } from '../LandingCanvas'

export interface WorkbenchProps {
  scroll: React.MutableRefObject<ScrollState>
  pointer: React.MutableRefObject<PointerState>
  onHover: (id: string | null) => void
}

/**
 * Fieldwork — a research notebook feeding an evidence wall.
 *
 *   1. The notebook lies open and its pages turn as interviews come in.
 *   2. Each page lifts off as a note and flies to the wall behind it.
 *   3. The wall sorts itself: repeats lock into a clean highlighted cluster,
 *      contradictions peel away into their own stack, and the one insight the
 *      repeats add up to lifts forward and lights.
 *
 * Notes are thin solids with real edges and a contact shadow, and they carry a
 * slight curl, so paper reads as paper rather than as a flat quad.
 */

type Kind = 'signal' | 'contradiction' | 'insight'

interface Note {
  kind: Kind
  /** Lifting off the open notebook page. */
  from: THREE.Vector3
  /** Where it first lands on the wall. */
  wall: THREE.Vector3
  /** Where it ends once the wall is sorted. */
  sorted: THREE.Vector3
  tilt: number
  curl: number
  delay: number
}

function buildNotes(): Note[] {
  const r = rng(5150)
  const notes: Note[] = []
  const lift = () => new THREE.Vector3(-2.05 + (r() - 0.5) * 0.5, -0.92 + r() * 0.12, 0.92 + r() * 0.15)

  // Eight repeated signals, gathering into a tidy locked column.
  for (let i = 0; i < 8; i++) {
    const col = i % 2
    const row = Math.floor(i / 2)
    notes.push({
      kind: 'signal',
      from: lift(),
      wall: new THREE.Vector3(-0.85 + r() * 1.85, 0.72 - r() * 1.55, 0.03),
      sorted: new THREE.Vector3(-0.92 + col * 0.54, 0.7 - row * 0.53, 0.03),
      tilt: (r() - 0.5) * 0.3,
      curl: 0.06 + r() * 0.07,
      delay: i * 0.035,
    })
  }

  // Three contradictions, peeling away into their own stack.
  for (let i = 0; i < 3; i++) {
    notes.push({
      kind: 'contradiction',
      from: lift(),
      wall: new THREE.Vector3(-0.35 + r() * 1.5, 0.45 - r() * 1.25, 0.03),
      sorted: new THREE.Vector3(1.52 + i * 0.055, 0.42 - i * 0.14, -0.02 + i * 0.05),
      tilt: (r() - 0.5) * 0.5,
      curl: 0.08 + r() * 0.08,
      delay: 0.3 + i * 0.04,
    })
  }

  // The single insight the repeats add up to.
  notes.push({
    kind: 'insight',
    from: lift(),
    wall: new THREE.Vector3(0.32, -0.12, 0.04),
    sorted: new THREE.Vector3(0.44, 0.02, 0.66),
    tilt: 0,
    curl: 0.04,
    delay: 0.42,
  })

  return notes
}

/** An open notebook whose pages turn as the interviews arrive. */
function Notebook({ kit, turn }: { kit: Kit; turn: React.MutableRefObject<number> }) {
  const pages = useRef<(THREE.Mesh | null)[]>([])
  const COUNT = 6

  useFrame(() => {
    pages.current.forEach((p, i) => {
      if (!p) return
      const local = Math.min(1, Math.max(0, turn.current * COUNT - i))
      p.rotation.y = -local * Math.PI
      p.position.z = Math.sin(local * Math.PI) * 0.045
    })
  })

  return (
    <group position={[-2.05, -1.05, 0.75]} rotation={[-1.15, 0.26, 0.06]}>
      {/* Board */}
      <mesh material={kit.dark} position={[0, 0, -0.035]}>
        <boxGeometry args={[1.72, 1.2, 0.05]} />
        <Edges threshold={15} color={kit.p.rule} />
      </mesh>
      {/* Spine */}
      <mesh position={[0, 0, 0.01]} material={kit.dark}>
        <boxGeometry args={[0.05, 1.2, 0.05]} />
      </mesh>

      {Array.from({ length: COUNT }, (_, i) => (
        <group key={i} position={[-0.84, 0, i * 0.005]}>
          <mesh
            ref={(el) => {
              pages.current[i] = el
            }}
            position={[0.84, 0, 0]}
          >
            <planeGeometry args={[1.68, 1.16]} />
            <meshStandardMaterial
              color={kit.p.paper}
              roughness={kit.p.paperRoughness}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}

      {/* Ruled lines and a margin on the visible page. */}
      <group position={[0.42, 0, COUNT * 0.005 + 0.004]}>
        {[0.36, 0.18, 0, -0.18, -0.36].map((y, i) => (
          <mesh key={i} position={[0, y, 0]}>
            <planeGeometry args={[0.78 - (i % 2) * 0.22, 0.011]} />
            <meshBasicMaterial color={kit.p.rule} transparent opacity={0.8} />
          </mesh>
        ))}
        <mesh position={[-0.46, 0, 0]}>
          <planeGeometry args={[0.008, 1.0]} />
          <meshBasicMaterial color={kit.p.risk} transparent opacity={0.5} />
        </mesh>
      </group>
    </group>
  )
}

export function Workbench({ scroll, pointer, onHover }: WorkbenchProps) {
  const kit = useKit()
  const root = useRef<THREE.Group>(null)
  const noteRefs = useRef<(THREE.Group | null)[]>([])
  const shadowRefs = useRef<(THREE.Mesh | null)[]>([])
  const clusterFrame = useRef<THREE.Mesh>(null)
  const insightGlow = useRef<THREE.Mesh>(null)
  const turnRef = useRef(0)

  const notes = useMemo(buildNotes, [])
  const tmp = useMemo(() => new THREE.Vector3(), [])

  // A gently curled page: a plane with a slight bend baked in.
  const curled = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.46, 0.46, 6, 6)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      pos.setZ(i, Math.pow(Math.abs(x) / 0.23, 2) * 0.018)
    }
    g.computeVertexNormals()
    return g
  }, [])

  const mats = useMemo(
    () => ({
      signal: new THREE.MeshStandardMaterial({
        color: kit.p.signal,
        roughness: 0.9,
        transparent: true,
        side: THREE.DoubleSide,
      }),
      contradiction: new THREE.MeshStandardMaterial({
        color: kit.p.unknown,
        roughness: 0.9,
        transparent: true,
        side: THREE.DoubleSide,
      }),
      insight: new THREE.MeshStandardMaterial({
        color: kit.p.action,
        roughness: 0.66,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    }),
    [kit],
  )

  const shadowMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.18 }),
    [],
  )

  useFrame((st, delta) => {
    const g = root.current
    if (!g) return
    const t = scroll.current.act.fieldwork
    const time = st.clock.elapsedTime

    g.visible = t > 0.0001 && t < 0.9999
    if (!g.visible) return

    const px = pointer.current.active ? pointer.current.x : 0
    const py = pointer.current.active ? pointer.current.y : 0
    const k = Math.min(delta * 2.4, 1)
    g.rotation.y += (px * 0.13 - g.rotation.y) * k
    g.rotation.x += (py * 0.055 - g.rotation.x) * k

    // Step one: pages turn as the interviews land.
    turnRef.current = ease(range(t, 0.02, 0.4))

    // Steps two and three.
    const fly = ease(range(t, 0.2, 0.56))
    const sort = ease(range(t, 0.58, 0.88))

    notes.forEach((n, i) => {
      const el = noteRefs.current[i]
      if (!el) return
      const local = Math.min(1, Math.max(0, (fly - n.delay) / (1 - n.delay || 1)))
      tmp.lerpVectors(n.from, n.wall, local)
      tmp.lerp(n.sorted, sort)

      if (n.kind === 'insight' && sort > 0.4) tmp.z += Math.sin(time * 1.4) * 0.03
      el.position.copy(tmp)
      el.rotation.z = n.tilt * (1 - sort * 0.88)
      // Notes lie flat on the notebook and stand up on the wall.
      el.rotation.x = (1 - local) * -1.1
      el.scale.setScalar(
        local * (n.kind === 'insight' ? 1 + sort * 0.34 : n.kind === 'contradiction' ? 1 - sort * 0.16 : 1),
      )

      const m = (el.children[0] as THREE.Mesh)?.material as THREE.Material & { opacity: number }
      if (m) m.opacity = n.kind === 'contradiction' ? 1 - sort * 0.5 : 1

      // Contact shadow: offset behind the note, softer the further it floats.
      const sh = shadowRefs.current[i]
      if (sh) {
        sh.position.set(tmp.x + 0.035, tmp.y - 0.04, tmp.z - 0.022)
        sh.scale.setScalar(local * 1.04)
        const sm = sh.material as THREE.MeshBasicMaterial
        sm.opacity = 0.2 * local * (n.kind === 'contradiction' ? 1 - sort * 0.6 : 1)
      }
    })

    // The cluster locks: a frame drawn around the repeated signals.
    if (clusterFrame.current) {
      const lock = ease(range(t, 0.68, 0.86))
      clusterFrame.current.visible = lock > 0.02
      clusterFrame.current.scale.set(lock, lock, 1)
      const m = clusterFrame.current.material as THREE.MeshBasicMaterial
      m.opacity = lock * 0.5
    }

    if (insightGlow.current) {
      const lit = ease(range(t, 0.72, 0.92))
      insightGlow.current.visible = lit > 0.02
      const insight = notes[notes.length - 1]
      insightGlow.current.position.copy(insight.sorted).setZ(insight.sorted.z - 0.05)
      insightGlow.current.scale.setScalar(lit * (1 + Math.sin(time * 1.6) * 0.04))
      const m = insightGlow.current.material as THREE.MeshBasicMaterial
      m.opacity = lit * 0.2
    }
  })

  return (
    <group ref={root}>
      {/* The wall the notes land on. */}
      <mesh position={[0.15, -0.05, -0.3]}>
        <planeGeometry args={[4.7, 3.2]} />
        <meshStandardMaterial color={kit.p.metal} roughness={0.98} transparent opacity={0.32} />
      </mesh>
      <mesh position={[0.15, -0.05, -0.29]}>
        <planeGeometry args={[4.7, 3.2, 14, 10]} />
        <meshBasicMaterial color={kit.p.rule} wireframe transparent opacity={0.12} />
      </mesh>

      <Notebook kit={kit} turn={turnRef} />

      {/* The frame that locks around the repeated signals. */}
      <mesh ref={clusterFrame} position={[-0.65, -0.07, 0.015]}>
        <planeGeometry args={[1.42, 2.36]} />
        <meshBasicMaterial color={kit.p.signal} transparent opacity={0} wireframe />
      </mesh>

      <mesh ref={insightGlow}>
        <circleGeometry args={[0.6, 40]} />
        <meshBasicMaterial color={kit.p.action} transparent opacity={0} />
      </mesh>

      {/* Contact shadows, drawn behind their notes. */}
      {notes.map((_, i) => (
        <mesh
          key={`s${i}`}
          ref={(el) => {
            shadowRefs.current[i] = el
          }}
          material={shadowMat}
        >
          <planeGeometry args={[0.46, 0.46]} />
        </mesh>
      ))}

      {/* The notes themselves. */}
      {notes.map((n, i) => (
        <group
          key={i}
          ref={(el) => {
            noteRefs.current[i] = el
          }}
          position={n.from}
          onPointerOver={(e) => {
            e.stopPropagation()
            onHover(n.kind)
          }}
          onPointerOut={() => onHover(null)}
        >
          <mesh geometry={curled} material={mats[n.kind]} />
          {/* A thick edge, so the paper has a body. */}
          <mesh position={[0, 0, -0.006]}>
            <boxGeometry args={[0.455, 0.455, 0.012]} />
            <meshStandardMaterial color={kit.p.paper} roughness={0.95} />
          </mesh>
          {[0.1, 0, -0.1].map((y, j) => (
            <mesh key={j} position={[-0.02, y, 0.014]}>
              <planeGeometry args={[0.27 - j * 0.05, 0.013]} />
              <meshBasicMaterial color={kit.p.bg} transparent opacity={0.42} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}
