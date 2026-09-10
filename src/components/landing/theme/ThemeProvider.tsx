'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

import { THEME_KEY as KEY } from './theme-script'

interface ThemeCtx {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
  /** True once the client has read the stored preference. */
  ready: boolean
}

const Ctx = createContext<ThemeCtx>({ theme: 'dark', setTheme: () => {}, toggle: () => {}, ready: false })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const attr = document.documentElement.getAttribute('data-theme')
    setThemeState(attr === 'light' ? 'light' : 'dark')
    setReady(true)
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    document.documentElement.setAttribute('data-theme', t)
    try {
      localStorage.setItem(KEY, t)
    } catch {
      /* private mode — the choice simply will not persist */
    }
  }, [])

  const toggle = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme])

  return <Ctx.Provider value={{ theme, setTheme, toggle, ready }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)

/**
 * The 3D scenes need real colour values, not CSS variables. Kept here so the
 * canvas and the DOM never drift apart.
 */
export interface ScenePalette {
  bg: string
  /** Stock the paper objects are cut from. */
  paper: string
  paperEdge: string
  /** Semantic roles, matched to the CSS tokens. */
  action: string
  signal: string
  risk: string
  intel: string
  unknown: string
  metal: string
  rule: string
  keyLight: string
  fillLight: string
  rimLight: string
  keyIntensity: number
  fillIntensity: number
  ambient: number
  glassOpacity: number
  /** Paper is matte on both, but studio light makes it brighter and flatter. */
  paperRoughness: number
  metalness: number
  /** Line weight reads heavier on parchment than on petrol. */
  lineOpacity: number
}

export const PALETTES: Record<Theme, ScenePalette> = {
  // Midnight Venture Atelier: petrol and navy, lit warm, colour used sparingly.
  dark: {
    bg: '#0B1319',
    paper: '#E4DED2',
    paperEdge: '#74A8D6',
    action: '#C8E85A',
    signal: '#7ECE96',
    risk: '#E8622C',
    intel: '#74A8D6',
    unknown: '#9692BE',
    metal: '#1E2E3A',
    rule: '#3A5062',
    keyLight: '#FFF4E2',
    fillLight: '#74A8D6',
    rimLight: '#C8E85A',
    keyIntensity: 2.4,
    fillIntensity: 1.1,
    ambient: 0.7,
    glassOpacity: 0.26,
    paperRoughness: 0.88,
    metalness: 0.08,
    lineOpacity: 0.55,
  },
  // Architect's Field Notebook: parchment stock under flat studio light. The
  // objects must darken against the page, not glow, or they disappear.
  light: {
    bg: '#F2EBDD',
    paper: '#FBF6EA',
    paperEdge: '#1D3FA8',
    action: '#7E9420',
    signal: '#21644E',
    risk: '#983A20',
    intel: '#1D3FA8',
    unknown: '#5C547C',
    metal: '#B9AC92',
    rule: '#8A7A5E',
    keyLight: '#FFFFFF',
    fillLight: '#C3D0E8',
    rimLight: '#1D3FA8',
    keyIntensity: 1.9,
    fillIntensity: 0.9,
    ambient: 1.65,
    glassOpacity: 0.4,
    paperRoughness: 0.96,
    metalness: 0.02,
    lineOpacity: 0.85,
  },
}

export function useScenePalette() {
  const { theme } = useTheme()
  return PALETTES[theme]
}
