'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { APP_CONFIG } from '@/config/constants/app'
import { QK } from '@/lib/query-keys'
import {
  listActiveCollegesByOrganizationForConfigAutoNumber,
  listActiveOrganizationsForConfigAutoNumber,
  listConfigAutoNumbers,
  saveConfigAutoNumberList,
} from '@/services'
import type { ConfigAutoNumber } from '@/types/config-auto-number'
import NewAttributeModal from './NewAttributeModal'

export default function ConfigureAutoNumbersPage() {
  const [organizationId, setOrganizationId] = useState<number | undefined>()
  const [collegeId, setCollegeId] = useState<number | undefined>()
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<ConfigAutoNumber[]>([])
  const [attributeOpen, setAttributeOpen] = useState(false)

  const orgQuery = useQuery({
    queryKey: QK.configAutoNumbers.organizations(),
    queryFn: listActiveOrganizationsForConfigAutoNumber,
    staleTime: APP_CONFIG.SESSION_STALE_TIME,
  })

  const collegesQuery = useQuery({
    queryKey: QK.configAutoNumbers.colleges(organizationId),
    queryFn: () => (
      organizationId
        ? listActiveCollegesByOrganizationForConfigAutoNumber(organizationId)
        : Promise.resolve([])
    ),
    enabled: Boolean(organizationId),
    staleTime: APP_CONFIG.SESSION_STALE_TIME,
  })

  const orgOptions = useMemo(
    () => (orgQuery.data ?? []).map((row) => ({ value: String(row.organizationId), label: row.orgCode ?? row.organizationName })),
    [orgQuery.data],
  )
  const collegeOptions = useMemo(
    () => (collegesQuery.data ?? []).map((row) => ({ value: String(row.collegeId), label: row.collegeCode ?? row.collegeName })),
    [collegesQuery.data],
  )

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) =>
      [row.collegeCode, row.courseCode, row.configAttributeName, row.configAtttributeCode, row.prefix, row.suffix, row.formula]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    )
  }, [rows, search])

  async function getList() {
    if (!organizationId || !collegeId) return
    const data = await listConfigAutoNumbers(organizationId, collegeId)
    setRows(data ?? [])
  }

  async function saveList() {
    if (!rows.length) return
    await saveConfigAutoNumberList(rows)
    await getList()
  }

  function updateRow(index: number, patch: Partial<ConfigAutoNumber>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[14px] font-semibold text-[hsl(var(--primary))]">Auto Number Configuration</h2>
        </div>
        <div className="px-3 pb-3 pt-2 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
            <Select
              label="Organization"
              value={organizationId ? String(organizationId) : null}
              onChange={(value) => {
                const next = value ? Number(value) : undefined
                setOrganizationId(next)
                setCollegeId(undefined)
                setRows([])
              }}
              options={orgOptions}
              searchable
            />
            <Select
              label="College"
              value={collegeId ? String(collegeId) : null}
              onChange={(value) => {
                setCollegeId(value ? Number(value) : undefined)
                setRows([])
              }}
              options={collegeOptions}
              searchable
              disabled={!organizationId}
            />
            <Button onClick={getList} disabled={!organizationId || !collegeId}>Get List</Button>
            <Button variant="outline" onClick={() => setAttributeOpen(true)}>New Attribute</Button>
          </div>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="app-card overflow-hidden">
          <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[hsl(var(--primary))]">Configured Attributes</h3>
            <div className="w-72">
              <Label htmlFor="attr-search" className="sr-only">Search</Label>
              <Input id="attr-search" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="px-3 pb-3 pt-2 overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 text-left">No.</th>
                  <th className="p-2 text-left">College</th>
                  <th className="p-2 text-left">Course</th>
                  <th className="p-2 text-left">Attribute Name</th>
                  <th className="p-2 text-left">Attribute Code</th>
                  <th className="p-2 text-left">Prefix</th>
                  <th className="p-2 text-left">Suffix</th>
                  <th className="p-2 text-left">Current Number</th>
                  <th className="p-2 text-left">Formula</th>
                  <th className="p-2 text-left">Auto Increment</th>
                  <th className="p-2 text-left">Active</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => (
                  <tr key={`${row.configAtttributeCode}-${idx}`} className="border-t border-slate-200">
                    <td className="p-2">{idx + 1}</td>
                    <td className="p-2">{row.collegeCode ?? '-'}</td>
                    <td className="p-2">{row.courseCode ?? '-'}</td>
                    <td className="p-2">{row.configAttributeName}</td>
                    <td className="p-2"><Input value={row.configAtttributeCode ?? ''} onChange={(e) => updateRow(idx, { configAtttributeCode: e.target.value })} /></td>
                    <td className="p-2"><Input value={row.prefix ?? ''} onChange={(e) => updateRow(idx, { prefix: e.target.value })} /></td>
                    <td className="p-2"><Input value={row.suffix ?? ''} onChange={(e) => updateRow(idx, { suffix: e.target.value })} /></td>
                    <td className="p-2"><Input type="number" value={row.currentNumber ?? ''} onChange={(e) => updateRow(idx, { currentNumber: e.target.value ? Number(e.target.value) : undefined })} /></td>
                    <td className="p-2"><Input value={row.formula ?? ''} onChange={(e) => updateRow(idx, { formula: e.target.value })} /></td>
                    <td className="p-2"><Checkbox checked={row.isAutoIncRequired ?? false} onCheckedChange={(checked) => updateRow(idx, { isAutoIncRequired: Boolean(checked) })} /></td>
                    <td className="p-2"><Checkbox checked={row.isActive ?? true} onCheckedChange={(checked) => updateRow(idx, { isActive: Boolean(checked) })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pt-3 flex justify-end">
              <Button onClick={saveList}>Save</Button>
            </div>
          </div>
        </div>
      )}

      <NewAttributeModal
        open={attributeOpen}
        onClose={() => setAttributeOpen(false)}
        onSaved={async () => {
          if (organizationId && collegeId) await getList()
        }}
      />
    </PageContainer>
  )
}

