'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { SearchInput } from '@/common/components/search'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function CreateEvaluatorsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')

  const links = [
    {
      href: '/admin-examination-management/evaluation-process/create-evaluators/evaluator-subject-roles',
      label: 'Evaluator Subject Roles',
    },
    {
      href: '/admin-examination-management/evaluation-process/assign-subjects-evaluator',
      label: 'Assign Subjects Evaluator',
    },
    {
      href: '/admin-examination-management/evaluation-process/assign-evaluator-exam',
      label: 'Assign Evaluator Exam',
    },
  ]

  const rows = useMemo(
    () => [
      {
        evaluatorId: 101,
        name: 'Dr. S. Reddy',
        employeeCode: 'EMP-101',
        department: 'CSE',
        mobile: '9876543210',
        status: 'Active',
      },
      {
        evaluatorId: 102,
        name: 'Prof. K. Devi',
        employeeCode: 'EMP-102',
        department: 'ECE',
        mobile: '9876543201',
        status: 'Inactive',
      },
      {
        evaluatorId: 103,
        name: 'Dr. A. Kumar',
        employeeCode: 'EMP-103',
        department: 'EEE',
        mobile: '9876543299',
        status: 'Active',
      },
    ],
    [],
  )

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter((r) => {
      const statusOk =
        status === 'all' ? true : status === 'active' ? r.status === 'Active' : r.status === 'Inactive'
      if (!statusOk) return false
      if (!term) return true
      return Object.values(r).some((v) => String(v).toLowerCase().includes(term))
    })
  }, [rows, search, status])

  const cols = useMemo<ColDef[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 80 },
      { field: 'name', headerName: 'Evaluator Name', minWidth: 180 },
      { field: 'employeeCode', headerName: 'Employee Code', minWidth: 130 },
      { field: 'department', headerName: 'Department', minWidth: 120 },
      { field: 'mobile', headerName: 'Mobile', minWidth: 130 },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 110,
        cellRenderer: (p: { value?: string }) =>
          p.value === 'Active' ? (
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
              Inactive
            </Badge>
          ),
      },
      {
        headerName: 'Action',
        minWidth: 120,
        cellRenderer: () => <Button size="sm" variant="outline">Edit</Button>,
      },
    ],
    [],
  )

  return (
    <div className="p-6 space-y-3">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Create Evaluators</h2>
        </div>
        <div className="p-4 space-y-3 text-[13px]">
          <p>Create and manage evaluator profiles for the selected exam cycle.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`h-6 rounded-md border px-2 text-[11px] ${status === 'all' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
              onClick={() => setStatus('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`h-6 rounded-md border px-2 text-[11px] ${status === 'active' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'}`}
              onClick={() => setStatus('active')}
            >
              Active
            </button>
            <button
              type="button"
              className={`h-6 rounded-md border px-2 text-[11px] ${status === 'inactive' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-600'}`}
              onClick={() => setStatus('inactive')}
            >
              Inactive
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SearchInput
              className="w-full max-w-sm"
              placeholder="Search evaluator..."
              value={search}
              onChange={setSearch}
            />
            <Button size="sm">Add Evaluator</Button>
          </div>
          <DataTable rowData={filteredRows} columnDefs={cols} pagination />
        </div>
      </div>

      <div className="app-card overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-200 bg-slate-50/60">
          <h3 className="text-[14px] font-semibold text-[hsl(var(--primary))]">Related Actions</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {links.map((item) => (
              <Link key={item.href} href={item.href} className="text-blue-700 hover:underline">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
