'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { Edges } from '@react-three/drei'
import { useScenePalette, type ScenePalette } from '../theme/ThemeProvider'

/* ------------------------------------------------------------------ *
 * Deterministic randomness — the same layout on every load, and the same
 * on server and client.
 * ------------------------------------------------------------------ */

export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/* ------------------------------------------------------------------ *
 * Materials. Built once per theme and shared by every scene, so the whole
 * page is lit by one consistent system.
 * ------------------------------------------------------------------ */

export interface Kit {
  paper: THREE.MeshStandardMaterial
  paperBack: THREE.MeshStandardMaterial
  glass: THREE.MeshStandardMaterial
  metal: THREE.MeshStandardMaterial
  dark: THREE.MeshStandardMaterial
  risk: THREE.MeshStandardMaterial
  intel: THREE.MeshStandardMaterial
  signalLine: THREE.LineBasicMaterial
  p: ScenePalette
}

export function useKit(): Kit {
  const p = useScenePalette()

  return useMemo(() => {
    // Night-lab materials are slightly glossy and lit warm; studio materials
    // are matte, flatter and darker so they read against parchment.
    const paper = new THREE.MeshStandardMaterial({
      color: p.paper,
      roughness: p.paperRoughness,
      metalness: p.metalness,
      side: THREE.DoubleSide,
    })
    const paperBack = new THREE.MeshStandardMaterial({
      color: p.paper,
      roughness: Math.min(1, p.paperRoughness + 0.06),
      metalness: 0,
      side: THREE.DoubleSide,
    })
    const glass = new THREE.MeshStandardMaterial({
      color: p.intel,
      roughness: 0.12,
      metalness: 0.1,
      transparent: true,
      opacity: p.glassOpacity,
      side: THREE.DoubleSide,
    })
    const metal = new THREE.MeshStandardMaterial({
      color: p.action,
      roughness: 0.3,
      metalness: 0.8,
    })
    const dark = new THREE.MeshStandardMaterial({ color: p.metal, roughness: 0.72, metalness: 0.18 })
    const risk = new THREE.MeshStandardMaterial({ color: p.risk, roughness: 0.42, metalness: 0.22 })
    const intel = new THREE.MeshStandardMaterial({ color: p.intel, roughness: 0.36, metalness: 0.28 })
    const signalLine = new THREE.LineBasicMaterial({
      color: p.signal,
      transparent: true,
      opacity: p.lineOpacity,
    })

    return { paper, paperBack, glass, metal, dark, risk, intel, signalLine, p }
  }, [p])
}

/* ------------------------------------------------------------------ *
 * The object vocabulary. Every scene is built from these, so a blueprint
 * sheet in the hero is recognisably the same sheet in act two.
 * ------------------------------------------------------------------ */

export function BlueprintSheet({ kit, scale = 1 }: { kit: Kit; scale?: number }) {
  return (
    <mesh material={kit.paper} scale={scale}>
      <boxGeometry args={[1.5, 1.05, 0.012]} />
      <Edges threshold={15} color={kit.p.paperEdge} />
    </mesh>
  )
}

export function ChartFragment({ kit }: { kit: Kit }) {
  return (
    <group>
      {[0.34, 0.6, 0.42, 0.82].map((h, i) => (
        <mesh key={i} position={[(i - 1.5) * 0.19, h / 2 - 0.28, 0]} material={kit.dark}>
          <boxGeometry args={[0.12, h, 0.12]} />
          <Edges threshold={15} color={kit.p.signal} />
        </mesh>
      ))}
    </group>
  )
}

export function Block({ kit }: { kit: Kit }) {
  return (
    <mesh material={kit.dark}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <Edges threshold={15} color={kit.p.paper} />
    </mesh>
  )
}

/** A torn receipt: a long strip with a ragged lower edge. */
export function Receipt({ kit }: { kit: Kit }) {
  const geo = useMemo(() => {
    const shape = new THREE.Shape()
    const w = 0.34
    const h = 1.05
    shape.moveTo(-w, h)
    shape.lineTo(w, h)
    shape.lineTo(w, -h * 0.6)
    // Ragged tear along the bottom.
    const teeth = 7
    for (let i = teeth; i >= 0; i--) {
      const x = -w + (i / teeth) * w * 2
      shape.lineTo(x, -h * 0.6 - (i % 2 === 0 ? 0.07 : 0))
    }
    shape.lineTo(-w, h)
    return new THREE.ShapeGeometry(shape)
  }, [])

  return (
    <group>
      <mesh geometry={geo} material={kit.paper} />
      {[0.7, 0.5, 0.3, 0.1].map((y, i) => (
        <mesh key={i} position={[0, y, 0.004]}>
          <planeGeometry args={[0.42 - i * 0.05, 0.02]} />
          <meshBasicMaterial color={kit.p.rule} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  )
}

export function GlassPlate({ kit, scale = 1 }: { kit: Kit; scale?: number }) {
  return (
    <mesh material={kit.glass} scale={scale}>
      <boxGeometry args={[1.15, 0.78, 0.03]} />
      <Edges threshold={15} color={kit.p.signal} />
    </mesh>
  )
}

export function Coin({ kit }: { kit: Kit }) {
  return (
    <mesh material={kit.metal} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.26, 0.26, 0.045, 28]} />
    </mesh>
  )
}

export function Compass({ kit }: { kit: Kit }) {
  return (
    <group>
      <mesh material={kit.risk} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.09, 0.5, 4]} />
      </mesh>
      <mesh material={kit.paper} position={[0, -0.25, 0]}>
        <coneGeometry args={[0.09, 0.5, 4]} />
      </mesh>
      <mesh material={kit.dark} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.018, 8, 40]} />
      </mesh>
    </group>
  )
}

/** A sticky note: square, slightly curled, always signal-coloured. */
export function StickyNote({ kit, tint }: { kit: Kit; tint?: string }) {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: tint ?? kit.p.signal,
        roughness: 0.92,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    [kit, tint],
  )
  return (
    <group>
      <mesh material={mat}>
        <planeGeometry args={[0.46, 0.46, 3, 3]} />
      </mesh>
      {[0.1, 0, -0.1].map((y, i) => (
        <mesh key={i} position={[-0.02, y, 0.003]}>
          <planeGeometry args={[0.28 - i * 0.05, 0.014]} />
          <meshBasicMaterial color={kit.p.bg} transparent opacity={0.45} />
        </mesh>
      ))}
    </group>
  )
}

/** A folded sheet: two planes hinged along one edge. */
export function FoldedSheet({ kit, fold = 0.42 }: { kit: Kit; fold?: number }) {
  return (
    <group>
      <mesh material={kit.paper} position={[0.36, 0, 0]} rotation={[0, -fold, 0]}>
        <planeGeometry args={[0.72, 0.92]} />
      </mesh>
      <mesh material={kit.paperBack} position={[-0.36, 0, 0]} rotation={[0, fold, 0]}>
        <planeGeometry args={[0.72, 0.92]} />
      </mesh>
    </group>
  )
}

/** A prototype: a small object that can read as wireframe or solid. */
export function Prototype({ kit, solidity = 0.26 }: { kit: Kit; solidity?: number }) {
  const wire = useMemo(
    () => new THREE.MeshBasicMaterial({ color: kit.p.signal, wireframe: true, transparent: true }),
    [kit],
  )
  const solid = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        // Reads as a machined object, not a void, in both themes.
        color: kit.p.paper,
        roughness: 0.34,
        metalness: 0.35,
        transparent: true,
      }),
    [kit],
  )

  solid.opacity = solidity
  wire.opacity = 1 - solidity * 0.85

  return (
    <group>
      <mesh material={solid}>
        <icosahedronGeometry args={[0.42, 1]} />
      </mesh>
      <mesh material={wire} scale={1.002}>
        <icosahedronGeometry args={[0.42, 1]} />
      </mesh>
    </group>
  )
}

/** A cracked glass shard, used for risk exhibits. */
export function Shard({ kit, seed = 1 }: { kit: Kit; seed?: number }) {
  const geo = useMemo(() => {
    const r = rng(seed)
    const shape = new THREE.Shape()
    const pts = 5
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2
      const rad = 0.28 + r() * 0.34
      const x = Math.cos(a) * rad
      const y = Math.sin(a) * rad
      if (i === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    }
    shape.closePath()
    return new THREE.ShapeGeometry(shape)
  }, [seed])

  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: kit.p.risk,
        roughness: 0.1,
        metalness: 0.2,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
      }),
    [kit],
  )

  return (
    <mesh geometry={geo} material={mat}>
      <Edges threshold={1} color={kit.p.risk} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ *
 * Reusable helpers
 * ------------------------------------------------------------------ */

/** A tube along a curve — used for value flows and trajectories. */
export function FlowTube({
  points,
  color,
  radius = 0.02,
  opacity = 0.5,
}: {
  points: THREE.Vector3[]
  color: string
  radius?: number
  opacity?: number
}) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points)
    return new THREE.TubeGeometry(curve, 48, radius, 6, false)
  }, [points, radius])

  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  )
}

export const PART_KINDS = [
  'blueprint',
  'chart',
  'block',
  'fold',
  'glass',
  'coin',
  'compass',
  'receipt',
  'sticky',
  'prototype',
] as const

export type PartKind = (typeof PART_KINDS)[number]

export function Part({ kind, kit }: { kind: PartKind; kit: Kit }) {
  switch (kind) {
    case 'blueprint':
      return <BlueprintSheet kit={kit} />
    case 'chart':
      return <ChartFragment kit={kit} />
    case 'block':
      return <Block kit={kit} />
    case 'fold':
      return <FoldedSheet kit={kit} />
    case 'glass':
      return <GlassPlate kit={kit} />
    case 'coin':
      return <Coin kit={kit} />
    case 'compass':
      return <Compass kit={kit} />
    case 'receipt':
      return <Receipt kit={kit} />
    case 'sticky':
      return <StickyNote kit={kit} />
    case 'prototype':
      return <Prototype kit={kit} />
    default:
      return null
  }
}
