'use client'

import type { ActId } from '../scroll/ScrollDirector'

/**
 * The bridge between CSS layout and the 3D camera.
 *
 * Each act's scene column publishes its real measured rect here. The camera
 * rig reads it and frames its subject inside that column, so the 3D can never
 * drift under the copy — whatever the breakpoint, zoom level or font size.
 * Nothing is hard-coded in pixels on either side.
 */

export interface Zone {
  /** Centre of the scene column as a fraction of viewport width, 0–1. */
  cx: number
  /** Centre as a fraction of viewport height. */
  cy: number
  /** Width of the column as a fraction of the viewport. */
  w: number
}

const DEFAULT: Zone = { cx: 0.5, cy: 0.5, w: 1 }

const zones = new Map<ActId, Zone>()

export function publishZone(id: ActId, el: HTMLElement | null) {
  if (!el) {
    zones.delete(id)
    return
  }
  const r = el.getBoundingClientRect()
  const vw = window.innerWidth || 1
  const vh = window.innerHeight || 1
  if (r.width < 8 || r.height < 8) {
    // Collapsed (single-column layout): the scene owns the whole viewport.
    zones.set(id, DEFAULT)
    return
  }
  zones.set(id, {
    cx: (r.left + r.width / 2) / vw,
    cy: (r.top + r.height / 2) / vh,
    w: r.width / vw,
  })
}

export function getZone(id: ActId): Zone {
  return zones.get(id) ?? DEFAULT
}

/**
 * The world-space camera x that places world origin at a given screen
 * fraction, for a camera looking straight down -Z at the given distance.
 */
export function cameraXForFraction(fraction: number, distance: number, fovDeg: number, aspect: number) {
  const h = 2 * distance * Math.tan((fovDeg * Math.PI) / 180 / 2)
  const w = h * aspect
  return -(fraction - 0.5) * w
}

export function cameraYForFraction(fraction: number, distance: number, fovDeg: number) {
  const h = 2 * distance * Math.tan((fovDeg * Math.PI) / 180 / 2)
  // Screen y grows downward; world y grows upward.
  return (fraction - 0.5) * h
}
