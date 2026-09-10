'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Edges } from '@react-three/drei'
import { rng, useKit, type Kit } from '../vocabulary'
import { ease, range } from '../../scroll/ScrollDirector'
import type { ScrollState } from '../../scroll/ScrollDirector'
import type { PointerState } from '../LandingCanvas'

export interface AtlasModule {
  id: string
  name: string
  purpose: string
  href: string
}

export const ATLAS_MODULES: AtlasModule[] = [
  { id: 'genome', name: 'Idea Genome', purpose: 'The six parts of the idea, and how strongly each one holds.', href: '/onboarding' },
  { id: 'minefield', name: 'Assumption Minefield', purpose: 'Risk weighted by what breaks if it turns out to be false.', href: '/onboarding' },
  { id: 'museum', name: 'Failure Museum', purpose: 'How this dies, written as a post-mortem, with the early tell.', href: '/onboarding' },
  { id: 'terrain', name: 'Market Terrain', purpose: 'Who is already there, and the questions you have not asked.', href: '/onboarding' },
  { id: 'prism', name: 'Pivot Prism', purpose: 'Safer, sharper, bolder — and what each one costs you.', href: '/onboarding' },
  { id: 'model', name: 'Business Model', purpose: 'Where value moves, and where money actually follows it.', href: '/onboarding' },
  { id: 'scope', name: 'Future Scope', purpose: 'Three conditional routes. Not forecasts — dependencies.', href: '/onboarding' },
  { id: 'lab', name: 'Validation Lab', purpose: 'Experiments with a pass line agreed before you start.', href: '/onboarding' },
  { id: 'flight', name: 'Flight Plan', purpose: 'Milestones, owners, and the route through the next weeks.', href: '/onboarding' },
]

/* ================================================================== *
 * The instruments. Each animates its own idea; `life` is seconds since
 * it became the active one, so the animation reads as a demonstration
 * rather than idle spinning.
 * ================================================================== */

/** Idea Genome — six components wire themselves into one system. */
function Genome({ kit, life }: { kit: Kit; life: number }) {
  const nodes = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2
      return new THREE.Vector3(Math.cos(a) * 0.86, Math.sin(a) * 0.86, Math.sin(a * 2) * 0.16)
    })
  }, [])
  const links = useMemo(
    () => [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 0],
      [0, 3],
      [1, 4],
    ],
    [],
  )
  const grow = ease(Math.min(1, life / 1.8))

  return (
    <group>
      {nodes.map((n, i) => {
        const on = grow * 6 > i
        return (
          <mesh key={i} position={n} scale={on ? 1 : 0.001}>
            <sphereGeometry args={[0.088, 16, 16]} />
            <meshStandardMaterial
              color={kit.p.intel}
              emissive={kit.p.intel}
              emissiveIntensity={0.5}
              roughness={0.3}
            />
          </mesh>
        )
      })}
      {links.map(([a, b], i) => {
        const p = nodes[a]
        const q = nodes[b]
        const mid = p.clone().add(q).multiplyScalar(0.5)
        const dir = q.clone().sub(p)
        const len = dir.length()
        const drawn = Math.min(1, Math.max(0, grow * links.length - i))
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
        return (
          <mesh key={`l${i}`} position={mid} quaternion={quat} scale={[1, drawn, 1]}>
            <cylinderGeometry args={[0.011, 0.011, len, 6]} />
            <meshBasicMaterial color={kit.p.signal} transparent opacity={0.75} />
          </mesh>
        )
      })}
      <mesh>
        <icosahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color={kit.p.action} emissive={kit.p.action} emissiveIntensity={0.35} roughness={0.35} />
      </mesh>
    </group>
  )
}

/** Assumption Minefield — nodes sized by impact, pulsing by uncertainty. */
function Minefield({ kit, life }: { kit: Kit; life: number }) {
  const nodes = useMemo(() => {
    const r = rng(31)
    return Array.from({ length: 9 }, () => {
      const impact = 0.3 + r() * 0.7
      const uncertainty = r()
      return {
        x: (r() - 0.5) * 1.85,
        z: (r() - 0.5) * 1.5,
        impact,
        uncertainty,
        phase: r() * 6,
      }
    })
  }, [])
  const grow = ease(Math.min(1, life / 1.4))

  return (
    <group rotation={[0.42, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.42, 0]}>
        <planeGeometry args={[2.2, 1.9, 10, 8]} />
        <meshBasicMaterial color={kit.p.rule} wireframe transparent opacity={0.18} />
      </mesh>
      {nodes.map((n, i) => {
        // Height carries impact; the pulse rate carries uncertainty.
        const pulse = 1 + Math.sin(life * (1 + n.uncertainty * 3) + n.phase) * n.uncertainty * 0.3
        const h = n.impact * 0.75 * grow * pulse
        const danger = n.impact * n.uncertainty > 0.42
        return (
          <mesh key={i} position={[n.x, -0.42 + h / 2, n.z]}>
            <cylinderGeometry args={[0.062, 0.082, Math.max(0.02, h), 12]} />
            <meshStandardMaterial
              color={danger ? kit.p.risk : kit.p.signal}
              emissive={danger ? kit.p.risk : kit.p.signal}
              emissiveIntensity={danger ? 0.55 * pulse : 0.2}
              roughness={0.45}
            />
          </mesh>
        )
      })}
    </group>
  )
}

/** Failure Museum — cracked exhibits on a rail. Static by design: an exhibit
 *  should sit still and be read, not animate. */
function Museum({ kit }: { kit: Kit }) {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: kit.p.risk,
        transparent: true,
        opacity: 0.26,
        roughness: 0.08,
        metalness: 0.15,
        side: THREE.DoubleSide,
      }),
    [kit],
  )
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[(i - 1) * 0.68, 0, (i - 1) * -0.24]} rotation={[0, (i - 1) * 0.42, 0]}>
          <mesh material={mat}>
            <planeGeometry args={[0.6, 0.84]} />
            <Edges threshold={15} color={kit.p.risk} />
          </mesh>
          {/* The break line. */}
          <mesh position={[0.02, 0, 0.006]} rotation={[0, 0, 0.16]}>
            <planeGeometry args={[0.011, 0.7]} />
            <meshBasicMaterial color={kit.p.bg} />
          </mesh>
          <mesh position={[0.09, 0.12, 0.006]} rotation={[0, 0, 0.85]}>
            <planeGeometry args={[0.009, 0.3]} />
            <meshBasicMaterial color={kit.p.bg} />
          </mesh>
          {/* Exhibit plate. */}
          <mesh position={[0, -0.5, 0.01]}>
            <planeGeometry args={[0.36, 0.05]} />
            <meshBasicMaterial color={kit.p.paper} transparent opacity={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Market Terrain — a contour map that keeps shifting under you. */
function Terrain({ kit, life }: { kit: Kit; life: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const geo = useMemo(() => new THREE.PlaneGeometry(2.1, 2.1, 30, 30), [])
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo])

  useFrame(() => {
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3]
      const y = base[i * 3 + 1]
      pos.setZ(i, Math.sin(x * 2.1 + life * 0.5) * 0.17 + Math.cos(y * 1.7 - life * 0.34) * 0.13)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
  })

  return (
    <group rotation={[-0.92, 0, 0.2]}>
      <mesh ref={ref} geometry={geo}>
        <meshBasicMaterial color={kit.p.intel} wireframe transparent opacity={0.42} />
      </mesh>
      {/* Where you actually stand on it. */}
      <mesh position={[0.2, -0.1, 0.3]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color={kit.p.action} />
      </mesh>
    </group>
  )
}

/** Pivot Prism — three routes rotate into view, one at a time. */
function Prism({ kit, life }: { kit: Kit; life: number }) {
  const g = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!g.current) return
    // Settles on each face rather than spinning continuously.
    const step = Math.floor(life / 2.2)
    const target = (step * Math.PI * 2) / 3
    g.current.rotation.y += (target - g.current.rotation.y) * 0.045
  })

  const faceTone = [kit.p.signal, kit.p.action, kit.p.risk]

  return (
    <group ref={g}>
      <mesh>
        <cylinderGeometry args={[0.78, 0.78, 1.15, 3]} />
        <meshStandardMaterial
          color={kit.p.intel}
          transparent
          opacity={kit.p.glassOpacity + 0.12}
          roughness={0.06}
          metalness={0.3}
          side={THREE.DoubleSide}
        />
        <Edges threshold={1} color={kit.p.intel} />
      </mesh>
      {/* One marker per route, so the three options are countable. */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5]}>
            <sphereGeometry args={[0.07, 12, 12]} />
            <meshStandardMaterial color={faceTone[i]} emissive={faceTone[i]} emissiveIntensity={0.5} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Business Model — value and money circulating a loop. */
function ModelPipes({ kit, life }: { kit: Kit; life: number }) {
  const curves = useMemo(() => {
    const mk = (a: number) =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(a) * 0.8, 0.62, Math.sin(a) * 0.8),
        new THREE.Vector3(Math.cos(a + 1) * 0.32, 0, Math.sin(a + 1) * 0.32),
        new THREE.Vector3(Math.cos(a + 2) * 0.8, -0.62, Math.sin(a + 2) * 0.8),
      ])
    return [0, 2.1, 4.2].map(mk)
  }, [])

  const beads = useRef<(THREE.Mesh | null)[]>([])
  useFrame(() => {
    beads.current.forEach((b, i) => {
      if (!b) return
      const c = curves[i % curves.length]
      b.position.copy(c.getPoint((life * 0.16 + i / 6) % 1))
    })
  })

  return (
    <group>
      {curves.map((c, i) => (
        <mesh key={i}>
          <tubeGeometry args={[c, 34, 0.03, 8, false]} />
          <meshStandardMaterial
            color={i === 1 ? kit.p.action : kit.p.paper}
            transparent
            opacity={0.55}
            roughness={0.4}
            metalness={0.3}
          />
        </mesh>
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            beads.current[i] = el
          }}
        >
          <sphereGeometry args={[0.056, 12, 12]} />
          <meshStandardMaterial color={kit.p.action} emissive={kit.p.action} emissiveIntensity={0.6} />
        </mesh>
      ))}
    </group>
  )
}

/** Future Scope — three conditional routes branch from one origin. */
function Scope({ kit, life }: { kit: Kit; life: number }) {
  const branches = useMemo(() => {
    const tones = [0, 1, 2]
    return tones.map((i) => {
      const lift = (i - 1) * 0.52
      return new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.0, -0.42, 0),
        new THREE.Vector3(-0.3, -0.3 + lift * 0.4, 0.09 * i),
        new THREE.Vector3(0.45, lift, -0.09 * i),
        new THREE.Vector3(1.0, lift * 1.35, 0),
      ])
    })
  }, [])
  const tone = [kit.p.paper, kit.p.action, kit.p.risk]
  const grow = ease(Math.min(1, life / 1.6))

  return (
    <group>
      {branches.map((c, i) => (
        <mesh key={i} scale={[grow, 1, 1]} position={[-(1 - grow) * 0.5, 0, 0]}>
          <tubeGeometry args={[c, 28, 0.024, 8, false]} />
          <meshStandardMaterial color={tone[i]} transparent opacity={0.85} roughness={0.5} />
        </mesh>
      ))}
      {branches.map((c, i) => (
        <mesh key={`e${i}`} position={c.getPoint(1)} scale={grow}>
          <sphereGeometry args={[0.072, 12, 12]} />
          <meshStandardMaterial color={tone[i]} emissive={tone[i]} emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  )
}

/** Validation Lab — indicators fill toward a pass line agreed in advance. */
function Lab({ kit, life }: { kit: Kit; life: number }) {
  const targets = [0.78, 0.52, 0.3]
  const passLine = 0.62

  return (
    <group>
      {targets.map((target, i) => {
        const x = (i - 1) * 0.56
        const fill = Math.min(target, ease(Math.min(1, life / 2)) * target)
        const passed = target >= passLine
        const H = 1.0
        return (
          <group key={i} position={[x, 0, 0]}>
            {/* Tube */}
            <mesh>
              <cylinderGeometry args={[0.16, 0.16, H, 18, 1, true]} />
              <meshStandardMaterial
                color={kit.p.paper}
                transparent
                opacity={0.2}
                roughness={0.08}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[0, -H / 2, 0]}>
              <sphereGeometry args={[0.16, 18, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
              <meshStandardMaterial
                color={kit.p.paper}
                transparent
                opacity={0.2}
                roughness={0.08}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Contents */}
            <mesh position={[0, -H / 2 + (H * fill) / 2, 0]}>
              <cylinderGeometry args={[0.147, 0.147, H * fill, 18]} />
              <meshStandardMaterial
                color={passed ? kit.p.signal : kit.p.risk}
                transparent
                opacity={0.8}
                emissive={passed ? kit.p.signal : kit.p.risk}
                emissiveIntensity={0.3}
              />
            </mesh>
            {/* The pass line, drawn across every tube. */}
            <mesh position={[0, -H / 2 + H * passLine, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.168, 0.006, 6, 24]} />
              <meshBasicMaterial color={kit.p.action} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/** Flight Plan — a route draws forward through its milestones. */
function Flight({ kit, life }: { kit: Kit; life: number }) {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.05, -0.6, 0),
        new THREE.Vector3(-0.25, -0.34, 0.2),
        new THREE.Vector3(0.45, 0.16, -0.1),
        new THREE.Vector3(1.05, 0.76, 0),
      ]),
    [],
  )
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 60, 0.017, 8, false), [curve])
  const craft = useRef<THREE.Mesh>(null)
  const drawn = ease(Math.min(1, life / 2.4))

  useFrame(() => {
    if (!craft.current) return
    const u = Math.min(0.999, drawn)
    craft.current.position.copy(curve.getPoint(u))
    const tan = curve.getTangent(u)
    craft.current.lookAt(craft.current.position.clone().add(tan))
  })

  const idx = geo.index
  if (idx) geo.setDrawRange(0, Math.max(3, Math.floor(idx.count * drawn)))

  return (
    <group>
      <mesh geometry={geo}>
        <meshBasicMaterial color={kit.p.action} transparent opacity={0.8} />
      </mesh>
      {[0.28, 0.58, 0.86].map((u, i) => (
        <mesh key={u} position={curve.getPoint(u)} scale={drawn > u ? 1 : 0.001}>
          <boxGeometry args={[0.09, 0.09, 0.09]} />
          <meshStandardMaterial color={kit.p.paper} roughness={0.5} />
          <Edges threshold={15} color={kit.p.intel} />
        </mesh>
      ))}
      <mesh ref={craft}>
        <coneGeometry args={[0.075, 0.24, 10]} />
        <meshStandardMaterial color={kit.p.action} emissive={kit.p.action} emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

function Instrument({ id, kit, life }: { id: string; kit: Kit; life: number }) {
  switch (id) {
    case 'genome':
      return <Genome kit={kit} life={life} />
    case 'minefield':
      return <Minefield kit={kit} life={life} />
    case 'museum':
      return <Museum kit={kit} />
    case 'terrain':
      return <Terrain kit={kit} life={life} />
    case 'prism':
      return <Prism kit={kit} life={life} />
    case 'model':
      return <ModelPipes kit={kit} life={life} />
    case 'scope':
      return <Scope kit={kit} life={life} />
    case 'lab':
      return <Lab kit={kit} life={life} />
    case 'flight':
      return <Flight kit={kit} life={life} />
    default:
      return null
  }
}

/** A calm resting token for the instruments that are not active. */
function Token({ kit, tone }: { kit: Kit; tone: string }) {
  return (
    <group>
      <mesh material={kit.dark}>
        <cylinderGeometry args={[0.2, 0.2, 0.06, 6]} />
        <Edges threshold={15} color={tone} />
      </mesh>
      <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.075, 12]} />
        <meshBasicMaterial color={tone} transparent opacity={0.75} />
      </mesh>
    </group>
  )
}

/* ================================================================== */

export interface AtlasProps {
  scroll: React.MutableRefObject<ScrollState>
  pointer: React.MutableRefObject<PointerState>
  /** Owned by the page, so buttons and keys can drive it too. */
  active: number
  onHover: (id: string | null) => void
  onSelect: (index: number) => void
}

export function Atlas({ scroll, pointer, active, onHover, onSelect }: AtlasProps) {
  const kit = useKit()
  const root = useRef<THREE.Group>(null)
  const core = useRef<THREE.Group>(null)
  const focusRef = useRef<THREE.Group>(null)
  const restRefs = useRef<(THREE.Group | null)[]>([])

  // Seconds since the active instrument changed, so each one demonstrates
  // itself from the beginning rather than mid-animation.
  const life = useRef(0)
  const lastActive = useRef(active)

  const N = ATLAS_MODULES.length
  const tone = (i: number) =>
    i === 1 || i === 2 ? kit.p.risk : i === 3 || i === 6 ? kit.p.intel : kit.p.signal

  useFrame((st, delta) => {
    const g = root.current
    if (!g) return
    const t = scroll.current.act.atlas
    g.visible = t > 0.0001 && t < 0.9999
    if (!g.visible) return

    if (lastActive.current !== active) {
      lastActive.current = active
      life.current = 0
    }
    life.current += Math.min(delta, 0.05)

    const enter = ease(range(t, 0, 0.08))
    const leave = ease(range(t, 0.95, 1))
    g.position.z = -2 + enter * 2 + leave * 5
    g.scale.setScalar(0.7 + enter * 0.3)

    const px = pointer.current.active ? pointer.current.x : 0
    const py = pointer.current.active ? pointer.current.y : 0
    const k = Math.min(delta * 2.6, 1)
    g.rotation.y += (px * 0.16 - g.rotation.y) * k
    g.rotation.x += (py * 0.07 - g.rotation.x) * k

    // The focus object breathes very slightly; it never spins on its own.
    if (focusRef.current) {
      const s = 1 + Math.sin(st.clock.elapsedTime * 0.7) * 0.012
      focusRef.current.scale.setScalar(s)
      focusRef.current.position.y = Math.sin(st.clock.elapsedTime * 0.5) * 0.02
    }

    // The bench of resting tokens: a shallow arc well behind the focus, calm
    // and evenly spaced. The active one is lifted out of the row.
    restRefs.current.forEach((el, i) => {
      if (!el) return
      const spread = (i - (N - 1) / 2) / (N - 1)
      const x = spread * 3.6
      const y = -1.52 + Math.abs(spread) * 0.2
      // Further back than before, and the outer tokens fall away hardest, so
      // the row reads as depth rather than as a second row of subjects.
      const z = -3.4 - Math.abs(spread) * 1.1
      const isActive = i === active
      el.position.set(x, isActive ? y + 0.16 : y, z)
      el.scale.setScalar(isActive ? 0.001 : 0.46)
      // A slow, shared drift rather than nine independent spins.
      el.rotation.y = 0.3 + Math.sin(st.clock.elapsedTime * 0.18 + i * 0.7) * 0.16
    })

    // The floor rules stay put. Nothing in this scene rotates for decoration.
  })

  return (
    <group ref={root}>
      {/*
        The bench needs a floor, not a backdrop. Two hairlines far behind give
        the row somewhere to stand and stop the instrument floating in a void.
        They do not move, do not rotate, and never read as an object.
      */}
      <group ref={core} position={[0, -1.62, -2.6]}>
        <mesh>
          <planeGeometry args={[7.4, 0.006]} />
          <meshBasicMaterial color={kit.p.rule} transparent opacity={0.5} />
        </mesh>
        <mesh position={[0, -0.28, 0.5]}>
          <planeGeometry args={[5.2, 0.005]} />
          <meshBasicMaterial color={kit.p.rule} transparent opacity={0.28} />
        </mesh>
      </group>

      {/* One dominant instrument, front and centre in the focus zone. */}
      <group ref={focusRef} position={[0, 0, 0.6]}>
        <Instrument id={ATLAS_MODULES[active]?.id ?? 'genome'} kit={kit} life={life.current} />
      </group>

      {/* The bench: everything else, small and quiet. */}
      {ATLAS_MODULES.map((m, i) => (
        <group
          key={m.id}
          ref={(el) => {
            restRefs.current[i] = el
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            onHover(m.id)
          }}
          onPointerOut={() => onHover(null)}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(i)
          }}
        >
          <mesh visible={false}>
            <sphereGeometry args={[0.42, 8, 8]} />
          </mesh>
          <Token kit={kit} tone={tone(i)} />
        </group>
      ))}
    </group>
  )
}
