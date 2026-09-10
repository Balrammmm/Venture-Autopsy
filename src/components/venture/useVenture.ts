'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, api, del, patch, post, put } from '@/lib/client'
import type { SectionKey } from '@/lib/atlas-types'
import type {
  BusinessModel,
  FailureExhibit,
  Genome,
  LaunchPlan,
  MarketTerrain,
  Pivot,
  Scenarios,
  Verdict,
} from '@/lib/atlas-types'

export interface VentureRow {
  id: string
  title: string
  rawIdea: string
  stage: string
  status: string
  verdict: string | null
  confidence: string | null
  healthScore: number
  accent: string
  createdAt: string
  updatedAt: string
}

export interface AssumptionRow {
  id: string
  claim: string
  category: string
  impact: number
  uncertainty: number
  breaksIfFalse: string
  proofNeeded: string
  cheapestTest: string
  testCost: string | null
  testDuration: string | null
  status: string
  notes: string | null
  x: number
  y: number
}

export interface ExperimentRow {
  id: string
  assumptionId: string | null
  name: string
  kind: string
  hypothesis: string
  method: string
  script: string[]
  successThreshold: string
  failThreshold: string
  sampleSize: string | null
  duration: string | null
  cost: string | null
  status: string
  result: string | null
  evidenceUrl: string | null
}

export interface SourceRow {
  id: string
  kind: string
  title: string
  url: string | null
  snippet: string
  evidence: string
  retrievedAt: string
  createdAt: string
}

export interface Sections {
  genome?: Genome
  market?: MarketTerrain
  failures?: FailureExhibit[]
  pivots?: Pivot[]
  model?: BusinessModel
  scenarios?: Scenarios
  launch?: LaunchPlan
  verdict?: Verdict
}

export interface VentureBundle {
  venture: VentureRow
  sections: Sections
  sectionMeta: Record<string, { version: number; evidence: string; updatedAt: string }>
  assumptions: AssumptionRow[]
  experiments: ExperimentRow[]
  sources: SourceRow[]
  inputs: { id: string; kind: string; content: string; createdAt: string }[]
}

/**
 * One hook owns the venture bundle and every mutation against it, so each
 * module can save without re-implementing fetch, error handling or refresh.
 */
export function useVenture(id: string) {
  const [data, setData] = useState<VentureBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [busySection, setBusySection] = useState<SectionKey | null>(null)
  const [analysing, setAnalysing] = useState(false)
  const [actionError, setActionError] = useState<ApiError | null>(null)
  const alive = useRef(true)

  const load = useCallback(async () => {
    setError(null)
    try {
      const bundle = await api<VentureBundle>(`/api/ventures/${id}`)
      if (alive.current) setData(bundle)
    } catch (err) {
      if (alive.current) setError(err as ApiError)
    } finally {
      if (alive.current) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    alive.current = true
    setLoading(true)
    load()
    return () => {
      alive.current = false
    }
  }, [load])

  const analyse = useCallback(
    async (research = false) => {
      setAnalysing(true)
      setActionError(null)
      try {
        await post(`/api/ventures/${id}/analyze`, { research })
        await load()
        return true
      } catch (err) {
        setActionError(err as ApiError)
        return false
      } finally {
        setAnalysing(false)
      }
    },
    [id, load],
  )

  const regenerate = useCallback(
    async (section: SectionKey, instruction?: string) => {
      setBusySection(section)
      setActionError(null)
      try {
        await post(`/api/ventures/${id}/sections/${section}`, { instruction })
        await load()
        return true
      } catch (err) {
        setActionError(err as ApiError)
        return false
      } finally {
        setBusySection(null)
      }
    },
    [id, load],
  )

  const saveSection = useCallback(
    async (section: SectionKey, sectionData: unknown) => {
      setBusySection(section)
      setActionError(null)
      try {
        await put(`/api/ventures/${id}/sections/${section}`, { data: sectionData })
        await load()
        return true
      } catch (err) {
        setActionError(err as ApiError)
        return false
      } finally {
        setBusySection(null)
      }
    },
    [id, load],
  )

  const updateAssumption = useCallback(
    async (assumptionId: string, body: Partial<AssumptionRow>) => {
      setActionError(null)
      // Optimistic: the minefield should move the instant you change a score.
      setData((prev) =>
        prev
          ? {
              ...prev,
              assumptions: prev.assumptions.map((a) => (a.id === assumptionId ? { ...a, ...body } : a)),
            }
          : prev,
      )
      try {
        await patch(`/api/ventures/${id}/assumptions/${assumptionId}`, body)
        await load()
        return true
      } catch (err) {
        setActionError(err as ApiError)
        await load()
        return false
      }
    },
    [id, load],
  )

  const createAssumption = useCallback(
    async (body: Partial<AssumptionRow>) => {
      setActionError(null)
      try {
        await post(`/api/ventures/${id}/assumptions`, body)
        await load()
        return true
      } catch (err) {
        setActionError(err as ApiError)
        return false
      }
    },
    [id, load],
  )

  const deleteAssumption = useCallback(
    async (assumptionId: string) => {
      setActionError(null)
      try {
        await del(`/api/ventures/${id}/assumptions/${assumptionId}`)
        await load()
        return true
      } catch (err) {
        setActionError(err as ApiError)
        return false
      }
    },
    [id, load],
  )

  const updateExperiment = useCallback(
    async (experimentId: string, body: Partial<ExperimentRow>) => {
      setActionError(null)
      try {
        await patch(`/api/ventures/${id}/experiments/${experimentId}`, body)
        await load()
        return true
      } catch (err) {
        setActionError(err as ApiError)
        return false
      }
    },
    [id, load],
  )

  const createExperiment = useCallback(
    async (body: Partial<ExperimentRow>) => {
      setActionError(null)
      try {
        await post(`/api/ventures/${id}/experiments`, body)
        await load()
        return true
      } catch (err) {
        setActionError(err as ApiError)
        return false
      }
    },
    [id, load],
  )

  const deleteExperiment = useCallback(
    async (experimentId: string) => {
      setActionError(null)
      try {
        await del(`/api/ventures/${id}/experiments/${experimentId}`)
        await load()
        return true
      } catch (err) {
        setActionError(err as ApiError)
        return false
      }
    },
    [id, load],
  )

  const addSource = useCallback(
    async (body: { kind: string; title: string; url?: string; snippet: string }) => {
      setActionError(null)
      try {
        await post(`/api/ventures/${id}/sources`, body)
        await load()
        return true
      } catch (err) {
        setActionError(err as ApiError)
        return false
      }
    },
    [id, load],
  )

  const deleteSource = useCallback(
    async (sourceId: string) => {
      setActionError(null)
      try {
        await del(`/api/ventures/${id}/sources/${sourceId}`)
        await load()
        return true
      } catch (err) {
        setActionError(err as ApiError)
        return false
      }
    },
    [id, load],
  )

  const runResearch = useCallback(async () => {
    setActionError(null)
    try {
      const res = await post<{ added: number; grounded: boolean }>(`/api/ventures/${id}/research`)
      await load()
      return res
    } catch (err) {
      setActionError(err as ApiError)
      return null
    }
  }, [id, load])

  const updateVenture = useCallback(
    async (body: Partial<VentureRow>) => {
      setActionError(null)
      try {
        await patch(`/api/ventures/${id}`, body)
        await load()
        return true
      } catch (err) {
        setActionError(err as ApiError)
        return false
      }
    },
    [id, load],
  )

  return {
    data,
    loading,
    error,
    analysing,
    busySection,
    actionError,
    clearActionError: () => setActionError(null),
    reload: load,
    analyse,
    regenerate,
    saveSection,
    createAssumption,
    updateAssumption,
    deleteAssumption,
    createExperiment,
    updateExperiment,
    deleteExperiment,
    addSource,
    deleteSource,
    runResearch,
    updateVenture,
  }
}

export type VentureApi = ReturnType<typeof useVenture>
