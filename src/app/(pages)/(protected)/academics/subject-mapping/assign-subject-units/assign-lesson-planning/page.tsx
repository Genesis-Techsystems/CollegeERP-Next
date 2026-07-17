'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toastError, toastInfo, toastSuccess } from '@/lib/toast'
import { listSubjectUnits, updateSubjectUnitTopics } from '@/services'

type AnyRow = Record<string, any>
type TopicRow = AnyRow & {
  subjectUnitTopicId?: number
  unitCode?: string
  topicName?: string
  fromPeriod?: number | null
  toPeriod?: number | null
  _modified?: boolean
}
type UnitRow = AnyRow & {
  subjectUnitTopicsDTOs?: TopicRow[]
  subjectCreditHours?: number
}

const n = (v: unknown) => Number(v) || 0
const s = (v: unknown) => {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return ''
}

export default function AssignLessonPlanningPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const collegeId = n(searchParams.get('collegeId'))
  const courseId = n(searchParams.get('courseId'))
  const courseGroupId = n(searchParams.get('courseGroupId'))
  const courseYearId = n(searchParams.get('courseYearId'))
  const regulationId = n(searchParams.get('regulationId'))
  const subjectId = n(searchParams.get('subjectId'))

  const collegeName = s(searchParams.get('collegeName'))
  const courseCode = s(searchParams.get('courseCode'))
  const courseGroupName = s(searchParams.get('courseGroupName') || searchParams.get('groupName'))
  const courseYearName = s(searchParams.get('courseYearName'))
  const subjectName = s(searchParams.get('subjectName'))
  const regulationCode = s(searchParams.get('regulationCode'))

  const contextTitle = useMemo(() => {
    const parts = [collegeName, courseCode, courseGroupName, courseYearName, subjectName, regulationCode].filter(Boolean)
    return parts.join(' / ')
  }, [collegeName, courseCode, courseGroupName, courseYearName, subjectName, regulationCode])

  const backHref = useMemo(() => {
    const qs = new URLSearchParams()
    if (collegeId) qs.set('collegeId', String(collegeId))
    if (courseId) qs.set('courseId', String(courseId))
    if (courseGroupId) qs.set('courseGroupId', String(courseGroupId))
    if (courseYearId) qs.set('courseYearId', String(courseYearId))
    if (regulationId) qs.set('regulationId', String(regulationId))
    const q = qs.toString()
    return q ? `/academics/subject-unit-topics?${q}` : '/academics/subject-unit-topics'
  }, [collegeId, courseId, courseGroupId, courseYearId, regulationId])

  const canLoad = !!(courseYearId && regulationId && subjectId)

  const [units, setUnits] = useState<UnitRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [subjectCreditHours, setSubjectCreditHours] = useState(0)

  const loadUnits = useCallback(async () => {
    if (!canLoad) {
      setUnits([])
      return
    }
    setLoading(true)
    try {
      const list = await listSubjectUnits({ courseYearId, regulationId, subjectId })
      const normalized = list.map((u) => ({
        ...u,
        subjectUnitTopicsDTOs: (Array.isArray(u.subjectUnitTopicsDTOs)
          ? u.subjectUnitTopicsDTOs
          : Array.isArray(u.subjectUnitTopics)
            ? u.subjectUnitTopics
            : []
        ).map((t: TopicRow) => ({
          ...t,
          unitCode: s(t.unitCode ?? u.unitCode),
          fromPeriod: t.fromPeriod ?? null,
          toPeriod: t.toPeriod ?? null,
          _modified: false,
        })),
      }))
      setUnits(normalized)
      setSubjectCreditHours(n(normalized[0]?.subjectCreditHours))
    } catch {
      setUnits([])
      toastError('Failed to load units for lesson planning')
    } finally {
      setLoading(false)
    }
  }, [canLoad, courseYearId, regulationId, subjectId])

  useEffect(() => {
    void loadUnits()
  }, [loadUnits])

  const flatTopics = useMemo(() => {
    const rows: Array<{ unitKey: number; topicIndex: number; topic: TopicRow }> = []
    units.forEach((unit, unitKey) => {
      ;(unit.subjectUnitTopicsDTOs ?? []).forEach((topic, topicIndex) => {
        rows.push({ unitKey, topicIndex, topic })
      })
    })
    return rows
  }, [units])

  function updateTopic(unitKey: number, topicIndex: number, patch: Partial<TopicRow>) {
    setUnits((prev) =>
      prev.map((u, ui) => {
        if (ui !== unitKey) return u
        const topics = [...(u.subjectUnitTopicsDTOs ?? [])]
        const current = topics[topicIndex]
        if (!current) return u
        topics[topicIndex] = { ...current, ...patch, _modified: true }
        return { ...u, subjectUnitTopicsDTOs: topics }
      }),
    )
  }

  async function addLessonPlanning() {
    const payload: Array<{ subjectUnitTopicId: number; fromPeriod: number; toPeriod: number }> = []
    for (const unit of units) {
      for (const topic of unit.subjectUnitTopicsDTOs ?? []) {
        if (
          topic._modified
          && topic.fromPeriod != null
          && topic.toPeriod != null
          && n(topic.subjectUnitTopicId)
        ) {
          payload.push({
            subjectUnitTopicId: n(topic.subjectUnitTopicId),
            fromPeriod: Number(topic.fromPeriod),
            toPeriod: Number(topic.toPeriod),
          })
        }
      }
    }
    if (payload.length === 0) {
      toastInfo('No session numbers entered.')
      return
    }
    setSaving(true)
    try {
      await updateSubjectUnitTopics(payload)
      toastSuccess('Lesson planning saved successfully')
      router.push(backHref)
    } catch (err) {
      toastError(err, 'Failed to save lesson planning')
    } finally {
      setSaving(false)
    }
  }

  if (!canLoad) {
    return (
      <PageContainer className="space-y-4">
        <div className="app-card p-6 text-sm text-muted-foreground">
          <p className="mb-4">
            Open this page from <strong>Subject Unit Topics</strong> via <strong>Assign Lesson Planning</strong>.
          </p>
          <Button variant="secondary" asChild>
            <Link href="/academics/subject-unit-topics">Back to Subject Unit Topics</Link>
          </Button>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden" data-no-page-name>
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-primary">
            {contextTitle || 'Assign Lesson Planning'}
            {subjectCreditHours > 0 ? (
              <span className="text-foreground">
                {' '}
                - Subject Hours : {subjectCreditHours}
              </span>
            ) : null}
          </h2>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
          ) : flatTopics.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No unit topics found. Assign units and topics first.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-sm border">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-amber-300 text-foreground">
                    <th className="border px-3 py-2 text-left font-semibold w-[20%]">Unit</th>
                    <th className="border px-3 py-2 text-left font-semibold w-[60%]">Topic Name</th>
                    <th className="border px-3 py-2 text-left font-semibold w-[10%]">Start Period</th>
                    <th className="border px-3 py-2 text-left font-semibold w-[10%]">End Period</th>
                  </tr>
                </thead>
                <tbody>
                  {flatTopics.map(({ unitKey, topicIndex, topic }) => (
                    <tr key={`${unitKey}-${topic.subjectUnitTopicId ?? topicIndex}-${topic.topicName}`}>
                      <td className="border px-3 py-2">{s(topic.unitCode)}</td>
                      <td className="border px-3 py-2">{s(topic.topicName)}</td>
                      <td className="border px-2 py-1">
                        <Input
                          type="number"
                          min={1}
                          className="h-8"
                          value={topic.fromPeriod ?? ''}
                          onChange={(e) => {
                            const v = e.target.value
                            updateTopic(unitKey, topicIndex, {
                              fromPeriod: v === '' ? null : Number(v),
                            })
                          }}
                        />
                      </td>
                      <td className="border px-2 py-1">
                        <Input
                          type="number"
                          min={1}
                          className="h-8"
                          value={topic.toPeriod ?? ''}
                          onChange={(e) => {
                            const v = e.target.value
                            updateTopic(unitKey, topicIndex, {
                              toPeriod: v === '' ? null : Number(v),
                            })
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => router.push(backHref)}>
              Back
            </Button>
            <Button type="button" disabled={saving || flatTopics.length === 0} onClick={() => { void addLessonPlanning() }}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
