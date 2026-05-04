'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { LayoutTemplate } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { Select } from '@/common/components/select'
import type { SelectOption } from '@/common/components/select'
import { useSessionContext } from '@/context/SessionContext'
import {
  getCollegeFilters,
  getEvalTemplates,
  type EvalTemplate,
} from '@/services/evaluation'
import { rowIndexGetter } from '@/lib/utils'

// ─── Column shape (pure data — no renderers) ──────────────────────────────────

const COL_DEFS = {
  siNo:        { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<EvalTemplate>,
  title:       { field: 'templateTitle', headerName: 'Template Title', minWidth: 220 } as ColDef<EvalTemplate>,
  totalMarks:  { field: 'totalmarks', headerName: 'Total Marks', minWidth: 120 } as ColDef<EvalTemplate>,
  description: { field: 'templateDescription', headerName: 'Description', minWidth: 220 } as ColDef<EvalTemplate>,
  isActive:    { field: 'isActive', headerName: 'Status', minWidth: 110 } as ColDef<EvalTemplate>,
}

// ─── Pure renderers ───────────────────────────────────────────────────────────

function statusRenderer(p: ICellRendererParams<EvalTemplate>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

// ─── Helper: parse university rows from college filter result sets ─────────────
// getCollegeFilters returns unknown[][]. We look for rows that carry a
// university identifier (fk_university_id or university_id) and a display name.

interface UniversityFilterRow {
  fk_university_id?: number
  university_id?: number
  university_name?: string
  university_code?: string
  org_name?: string
}

function parseUniversityOptions(resultSets: unknown[][]): SelectOption[] {
  const flat = resultSets.flat() as UniversityFilterRow[]
  const seen = new Set<string>()
  const opts: SelectOption[] = []

  for (const row of flat) {
    const id = row.fk_university_id ?? row.university_id
    const label =
      row.university_name ??
      row.university_code ??
      row.org_name
    if (id == null || label == null) continue
    const val = String(id)
    if (seen.has(val)) continue
    seen.add(val)
    opts.push({ value: val, label: String(label) })
  }

  return opts.sort((a, b) => a.label.localeCompare(b.label))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EvaluationTemplatesPage() {
  const { user } = useSessionContext()

  // Filter state
  const [filterLoading, setFilterLoading] = useState(true)
  const [universityOptions, setUniversityOptions] = useState<SelectOption[]>([])
  const [selectedUniversityId, setSelectedUniversityId] = useState<string | null>(null)

  // Table state
  const [templates, setTemplates] = useState<EvalTemplate[]>([])
  const [tableLoading, setTableLoading] = useState(false)
  const [tableVisible, setTableVisible] = useState(false)

  // ── Load university filter options on mount ───────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      setFilterLoading(true)
      try {
        const resultSets = await getCollegeFilters({
          orgId: user?.organizationId,
          employeeId: user?.employeeId,
        })
        if (cancelled) return
        const opts = parseUniversityOptions(resultSets)
        setUniversityOptions(opts)

        // Auto-select if only one university is returned
        if (opts.length === 1) {
          setSelectedUniversityId(opts[0].value)
        }
      } catch {
        // Filter load failed — user can still use fallback if needed
      } finally {
        if (!cancelled) setFilterLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.organizationId, user?.employeeId])

  // ── Fetch templates ───────────────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    if (!selectedUniversityId) return
    setTableLoading(true)
    setTableVisible(true)
    setTemplates([])
    try {
      const result = await getEvalTemplates(Number(selectedUniversityId))
      setTemplates(result)
    } catch {
      setTemplates([])
    } finally {
      setTableLoading(false)
    }
  }, [selectedUniversityId])

  // ── Column definitions ────────────────────────────────────────────────────
  const columnDefs = useMemo<ColDef<EvalTemplate>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.title,
      COL_DEFS.totalMarks,
      COL_DEFS.description,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
    ],
    [],
  )

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <PageContainer className="space-y-5">
      <PageHeader
        title="Evaluation Templates"
        subtitle="View evaluation question paper templates by university"
      />

      {/* Filter panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px] flex-1 max-w-sm">
            <Select
              label="University"
              options={universityOptions}
              value={selectedUniversityId}
              onChange={(v) => { setSelectedUniversityId(v); setTableVisible(false) }}
              placeholder="Select University"
              isLoading={filterLoading}
              searchable={universityOptions.length > 6}
              clearable
            />
          </div>

          <Button
            onClick={fetchTemplates}
            disabled={!selectedUniversityId || tableLoading}
            className="shrink-0"
          >
            {tableLoading ? 'Loading…' : 'Get Templates'}
          </Button>
        </div>
      </div>

      {/* Table section */}
      {tableVisible && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
          {!tableLoading && templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <LayoutTemplate className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">No evaluation templates found</p>
              <p className="text-xs mt-1">
                No active templates exist for the selected university
              </p>
            </div>
          ) : (
            <div className="p-4">
              <DataTable
                rowData={templates}
                columnDefs={columnDefs}
                loading={tableLoading}
                pagination
                toolbar={{
                  search: true,
                  searchPlaceholder: 'Search title or description…',
                  pdfDocumentTitle: 'Evaluation Templates',
                }}
                toolbarLeading={
                  <span className="text-[13px] text-muted-foreground whitespace-nowrap">
                    {templates.length} template{templates.length !== 1 ? 's' : ''}
                  </span>
                }
              />
            </div>
          )}
        </div>
      )}
    </PageContainer>
  )
}
