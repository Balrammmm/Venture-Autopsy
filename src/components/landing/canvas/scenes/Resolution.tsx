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
 * The venture architecture.
 *
 * Everything the page has handled arrives here and becomes a working part of
 * one machine. Nothing in this scene is decoration — each element is the thing
 * an earlier act was about:
 *
 *   foundation   the customer evidence from Fieldwork, laid as a bed of plates
 *                with one lit node per piece of evidence.
 *   struts       the assumption shards from Evidence, now load-bearing. The
 *                validated ones are solid metal; the unverified ones are still
 *                glass, and you can see through them.
 *   modules      the nine Atlas instruments, arrived and seated in a ring,
 *                each still doing its small job.
 *   paths        the research signals, running between modules as value flow.
 *   crown        the venture itself, which only lights once the flows reach it.
 *
 * It assembles bottom-up while the camera pulls back, then holds a living idle:
 * beads of value keep moving through the paths so the ending breathes rather
 * than stopping dead.
 */

const MODULES = 9

interface Strut {
  angle: number
  /** Unverified struts stay glass; verified ones become metal. */
  verified: boolean
  lean: number
  delay: number
}

function buildStruts(): Strut[] {
  const r = rng(9931)
  return Array.from({ length: 12 }, (_, i) => ({
    angle: (i / 12) * Math.PI * 2 + r() * 0.1,
    // Two thirds hold; a third are still assumptions you have not tested.
    verified: r() > 0.34,
    lean: (r() - 0.5) * 0.16,
    delay: i * 0.022,
  }))
}

/** One piece of customer evidence in the foundation bed. */
interface Plate {
  x: number
  z: number
  rot: number
  w: number
  d: number
  delay: number
}

function buildPlates(): Plate[] {
  const r = rng(4477)
  const out: Plate[] = []
  for (let ring = 0; ring < 3; ring++) {
    const count = 6 + ring * 5
    const radius = 0.5 + ring * 0.62
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + ring * 0.4
      out.push({
        x: Math.cos(a) * radius,
        z: Math.sin(a) * radius,
        rot: a + Math.PI / 2 + (r() - 0.5) * 0.3,
        w: 0.3 + r() * 0.16,
        d: 0.2 + r() * 0.12,
        delay: ring * 0.05 + i * 0.008,
      })
    }
  }
  return out
}

/* ------------------------------------------------------------------ *
 * Value flow — beads that travel the paths between modules and up into
 * the crown. This is the idle life of the finished object.
 * ------------------------------------------------------------------ */

function usePaths() {
  return useMemo(() => {
    const paths: THREE.CatmullRomCurve3[] = []
    const R = 1.32
    const deckY = 0.42
    for (let i = 0; i < MODULES; i++) {
      const a = (i / MODULES) * Math.PI * 2
      const b = ((i + 1) / MODULES) * Math.PI * 2
      const from = new THREE.Vector3(Math.cos(a) * R, deckY, Math.sin(a) * R)
      const to = new THREE.Vector3(Math.cos(b) * R, deckY, Math.sin(b) * R)
      const mid = from.clone().add(to).multiplyScalar(0.5)
      mid.multiplyScalar(0.72)
      mid.y = deckY + 0.1
      paths.push(new THREE.CatmullRomCurve3([from, mid, to]))
    }
    // Every third module also feeds the crown, so value visibly rises.
    for (let i = 0; i < MODULES; i += 3) {
      const a = (i / MODULES) * Math.PI * 2
      const from = new THREE.Vector3(Math.cos(a) * R, deckY, Math.sin(a) * R)
      const mid = new THREE.Vector3(Math.cos(a) * R * 0.5, deckY + 0.6, Math.sin(a) * R * 0.5)
      const to = new THREE.Vector3(0, 1.24, 0)
      paths.push(new THREE.CatmullRomCurve3([from, mid, to]))
    }
    return paths
  }, [])
}

function Paths({ kit, paths }: { kit: Kit; paths: THREE.CatmullRomCurve3[] }) {
  const geos = useMemo(
    () => paths.map((c) => new THREE.TubeGeometry(c, 30, 0.006, 5, false)),
    [paths],
  )
  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial color={i >= MODULES ? kit.p.action : kit.p.signal} transparent opacity={0.34} />
        </mesh>
      ))}
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
  const struts = useMemo(buildStruts, [])
  const plates = useMemo(buildPlates, [])
  const paths = usePaths()

  const root = useRef<THREE.Group>(null)
  const system = useRef<THREE.Group>(null)
  const plateRefs = useRef<(THREE.Mesh | null)[]>([])
  const evidenceNodes = useRef<THREE.InstancedMesh>(null)
  const strutRefs = useRef<(THREE.Group | null)[]>([])
  const moduleRefs = useRef<(THREE.Group | null)[]>([])
  const beadRefs = useRef<(THREE.Mesh | null)[]>([])
  const crown = useRef<THREE.Group>(null)
  const crownGlow = useRef<THREE.Mesh>(null)
  const pool = useRef<THREE.Mesh>(null)

  const tmpObj = useMemo(() => new THREE.Object3D(), [])
  const tmpVec = useMemo(() => new THREE.Vector3(), [])

  const mats = useMemo(
    () => ({
      paper: new THREE.MeshStandardMaterial({
        color: kit.p.paper,
        roughness: kit.p.paperRoughness,
        metalness: kit.p.metalness,
        transparent: true,
      }),
      metal: new THREE.MeshStandardMaterial({ color: kit.p.metal, roughness: 0.34, metalness: 0.86 }),
      glass: new THREE.MeshStandardMaterial({
        color: kit.p.intel,
        transparent: true,
        opacity: 0.3,
        roughness: 0.05,
        metalness: 0.2,
      }),
      deck: new THREE.MeshStandardMaterial({
        color: kit.p.metal,
        roughness: 0.42,
        metalness: 0.7,
        transparent: true,
      }),
    }),
    [kit],
  )

  // Beads: 3 per path, evenly offset, travelling continuously.
  const beads = useMemo(
    () =>
      paths.flatMap((_, pathIndex) =>
        [0, 0.33, 0.66].map((offset) => ({ pathIndex, offset, speed: 0.13 + (pathIndex % 4) * 0.017 })),
      ),
    [paths],
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

    // Assembly runs bottom-up, each layer handing to the next.
    const found = ease(range(t, 0.02, 0.3))
    const strut = ease(range(t, 0.22, 0.55))
    const module = ease(range(t, 0.46, 0.76))
    const flow = ease(range(t, 0.68, 0.92))
    const settle = ease(range(t, 0.82, 1))

    if (system.current) {
      const k = Math.min(delta * 2, 1)
      // A slow quarter turn while it builds, then it holds and only the
      // pointer moves it.
      const spin = (1 - settle) * 0.42 + px * 0.22
      system.current.rotation.y += (spin - system.current.rotation.y) * k
      system.current.rotation.x += (0.06 + py * 0.06 - system.current.rotation.x) * k
      // Grows into the frame; the camera pulls back to meet it.
      system.current.scale.setScalar(0.78 + found * 0.22)
      system.current.position.y = -0.5 + found * 0.2
    }

    /* Foundation — customer evidence. */
    plateRefs.current.forEach((el, i) => {
      if (!el) return
      const p = plates[i]
      const local = ease(Math.min(1, Math.max(0, (found - p.delay) / (1 - p.delay || 1))))
      el.position.set(p.x, -0.62 + (1 - local) * 1.6, p.z)
      el.scale.setScalar(local)
      const m = el.material as THREE.Material & { opacity: number }
      m.opacity = local
    })

    // One lit node per piece of evidence, sitting on its plate.
    if (evidenceNodes.current) {
      for (let i = 0; i < plates.length; i++) {
        const p = plates[i]
        const local = Math.min(1, Math.max(0, (found - p.delay) / (1 - p.delay || 1)))
        const pulse = 0.7 + Math.sin(time * 1.3 + i * 0.9) * 0.3
        tmpObj.position.set(p.x, -0.585, p.z)
        tmpObj.scale.setScalar(local * 0.02 * pulse)
        tmpObj.updateMatrix()
        evidenceNodes.current.setMatrixAt(i, tmpObj.matrix)
      }
      evidenceNodes.current.instanceMatrix.needsUpdate = true
    }

    /* Struts — assumptions, load-bearing now. */
    strutRefs.current.forEach((el, i) => {
      if (!el) return
      const s = struts[i]
      const local = ease(Math.min(1, Math.max(0, (strut - s.delay) / (1 - s.delay || 1))))
      const R = 1.05
      el.position.set(Math.cos(s.angle) * R, -0.56 + local * 0.5, Math.sin(s.angle) * R)
      el.rotation.set(s.lean * local, -s.angle, s.lean * local)
      el.scale.set(1, local, 1)
      // Unverified struts keep breathing — they have not settled.
      if (!s.verified) {
        const m = (el.children[0] as THREE.Mesh)?.material as THREE.Material & { opacity: number }
        if (m) m.opacity = (0.22 + Math.sin(time * 1.6 + i) * 0.09) * local
      }
    })

    /* Modules — the Atlas instruments, seated. */
    moduleRefs.current.forEach((el, i) => {
      if (!el) return
      const a = (i / MODULES) * Math.PI * 2
      const delay = i * 0.045
      const local = ease(Math.min(1, Math.max(0, (module - delay) / (1 - delay || 1))))
      const R = 1.32
      // They fly in from where the Atlas bench held them: out and behind.
      tmpVec.set(Math.cos(a) * R, 0.42, Math.sin(a) * R)
      el.position.set(
        THREE.MathUtils.lerp(Math.cos(a) * 4.4, tmpVec.x, local),
        THREE.MathUtils.lerp(-1.4, tmpVec.y, local),
        THREE.MathUtils.lerp(Math.sin(a) * 4.4 - 2, tmpVec.z, local),
      )
      el.rotation.y = -a + (1 - local) * 3
      el.scale.setScalar(local * 0.98)
      // Each module keeps working: a slow individual bob.
      el.position.y += Math.sin(time * 0.8 + i * 0.7) * 0.012 * local
    })

    /* Value flow — the idle life. Beads never stop once the paths open. */
    beadRefs.current.forEach((el, i) => {
      if (!el) return
      const b = beads[i]
      el.visible = flow > 0.04
      if (!el.visible) return
      const u = (time * b.speed + b.offset) % 1
      paths[b.pathIndex].getPointAt(u, tmpVec)
      el.position.copy(tmpVec)
      // Fade in at both ends of the run so nothing pops.
      const edge = Math.min(1, Math.min(u, 1 - u) * 8)
      el.scale.setScalar(flow * edge * 0.03)
    })

    /* Crown — the venture. Only lights once value actually reaches it. */
    if (crown.current) {
      crown.current.visible = flow > 0.02
      crown.current.scale.setScalar(flow * (1 + Math.sin(time * 1.1) * 0.02))
      crown.current.rotation.y = time * 0.14
      crown.current.position.y = 1.24 + Math.sin(time * 0.7) * 0.014
    }
    if (crownGlow.current) {
      const m = crownGlow.current.material as THREE.MeshBasicMaterial
      m.opacity = flow * (0.16 + Math.sin(time * 1.4) * 0.05)
      crownGlow.current.scale.setScalar(flow * (1 + Math.sin(time * 1.4) * 0.06))
    }

    if (pool.current) {
      const lit = ease(range(t, 0.1, 0.6))
      pool.current.visible = lit > 0.02
      pool.current.scale.setScalar(0.8 + lit * 0.5)
      const m = pool.current.material as THREE.MeshBasicMaterial
      m.opacity = lit * 0.09
    }
  })

  return (
    <group ref={root}>
      {/* A pool of light under the system, never a disc behind it. */}
      <mesh ref={pool} position={[0, -0.78, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.1, 48]} />
        <meshBasicMaterial color={kit.p.action} transparent opacity={0} />
      </mesh>

      <group ref={system}>
        {/* ---------- Foundation: customer evidence ---------- */}
        {plates.map((p, i) => (
          <mesh
            key={`p${i}`}
            ref={(el) => {
              plateRefs.current[i] = el
            }}
            rotation={[0, p.rot, 0]}
            material={mats.paper}
          >
            <boxGeometry args={[p.w, 0.035, p.d]} />
            <Edges threshold={15} color={kit.p.paperEdge} />
          </mesh>
        ))}

        <instancedMesh
          ref={evidenceNodes}
          args={[undefined, undefined, plates.length]}
          frustumCulled={false}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color={kit.p.signal} transparent opacity={0.9} />
        </instancedMesh>

        {/* ---------- Struts: assumptions carrying load ---------- */}
        {struts.map((s, i) => (
          <group
            key={`s${i}`}
            ref={(el) => {
              strutRefs.current[i] = el
            }}
          >
            <mesh material={s.verified ? mats.metal : mats.glass} position={[0, 0.5, 0]}>
              <boxGeometry args={[0.035, 1, 0.035]} />
              {!s.verified && <Edges threshold={15} color={kit.p.risk} />}
            </mesh>
          </group>
        ))}

        {/* ---------- Deck the modules sit on ---------- */}
        <mesh position={[0, 0.36, 0]} material={mats.deck}>
          <cylinderGeometry args={[1.62, 1.58, 0.05, 9]} />
          <Edges threshold={15} color={kit.p.intel} />
        </mesh>

        {/* ---------- Modules: the Atlas instruments ---------- */}
        {Array.from({ length: MODULES }, (_, i) => {
          const tone = i % 3 === 0 ? kit.p.action : i % 3 === 1 ? kit.p.intel : kit.p.signal
          return (
            <group
              key={`m${i}`}
              ref={(el) => {
                moduleRefs.current[i] = el
              }}
              scale={0.001}
            >
              {/* The hexagonal token the Atlas bench used. */}
              <mesh>
                <cylinderGeometry args={[0.17, 0.17, 0.1, 6]} />
                <meshStandardMaterial color={tone} emissive={tone} emissiveIntensity={0.3} roughness={0.42} metalness={0.4} />
                <Edges threshold={15} color={tone} />
              </mesh>
              {/* A small readout plate — the module is doing something. */}
              <mesh position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.13, 0.13]} />
                <meshBasicMaterial color={kit.p.bg} transparent opacity={0.5} />
              </mesh>
            </group>
          )
        })}

        {/* ---------- Value flow ---------- */}
        <Paths kit={kit} paths={paths} />
        {beads.map((b, i) => (
          <mesh
            key={`b${i}`}
            ref={(el) => {
              beadRefs.current[i] = el
            }}
            visible={false}
          >
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial color={b.pathIndex >= MODULES ? kit.p.action : kit.p.signal} />
          </mesh>
        ))}

        {/* ---------- Crown: the venture ---------- */}
        <group ref={crown} position={[0, 1.24, 0]} visible={false}>
          <mesh>
            <octahedronGeometry args={[0.26, 0]} />
            <meshStandardMaterial
              color={kit.p.action}
              emissive={kit.p.action}
              emissiveIntensity={0.7}
              roughness={0.24}
              metalness={0.5}
            />
            <Edges threshold={12} color={kit.p.paper} />
          </mesh>
          <mesh ref={crownGlow}>
            <sphereGeometry args={[0.62, 20, 20]} />
            <meshBasicMaterial color={kit.p.action} transparent opacity={0} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
