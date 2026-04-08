'use client'

import { useEffect, useMemo, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  createRevisionMaster,
  listCollegesActive,
  listCoursesByUniversity,
  listRevisionMastersByCourse,
  listRevisionTypes,
  updateRevisionMaster,
} from '@/services/revision-master'

export default function RevisionMasterPage() {
  const [colleges, setColleges] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [revisionTypes, setRevisionTypes] = useState<any[]>([])

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [q, setQ] = useState('')

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [examRevisionTypeId, setExamRevisionTypeId] = useState<number | null>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [amount, setAmount] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [reason, setReason] = useState('active')

  useEffect(() => {
    async function loadBase() {
      const [clgs, revTypes] = await Promise.all([
        listCollegesActive().catch(() => []),
        listRevisionTypes().catch(() => []),
      ])
      setColleges(Array.isArray(clgs) ? clgs : [])
      setRevisionTypes(Array.isArray(revTypes) ? revTypes : [])
      const firstCollege = (clgs as any[])[0]
      if (firstCollege?.collegeId) setCollegeId(Number(firstCollege.collegeId))
    }
    loadBase()
  }, [])

  useEffect(() => {
    async function loadCourses() {
      setCourses([])
      setCourseId(null)
      setRows([])
      if (!collegeId) return
      const college = colleges.find((c) => Number(c.collegeId) === Number(collegeId))
      const universityId = Number(college?.universityId ?? college?.fk_university_id ?? 0)
      let arr: any[] = []
      if (universityId) {
        const list = await listCoursesByUniversity(universityId).catch(() => [])
        arr = Array.isArray(list) ? list : []
      }
      // Fallback: if university-scoped list is empty, pull active courses and show all.
      if (arr.length === 0) {
        const { domainList, buildQuery } = await import('@/services/crud')
        const all = await domainList<any>('Course', buildQuery({ isActive: true })).catch(() => [])
        arr = Array.isArray(all) ? all : []
      }
      setCourses(arr)
      if (arr[0]?.courseId) setCourseId(Number(arr[0].courseId))
    }
    loadCourses()
  }, [collegeId, colleges])

  useEffect(() => {
    async function loadRows() {
      setRows([])
      if (!courseId) return
      const list = await listRevisionMastersByCourse(courseId).catch(() => [])
      setRows(Array.isArray(list) ? list : [])
    }
    loadRows()
  }, [courseId])

  const filteredRows = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) =>
      `${r.examRevisionTypeName ?? ''} ${r.amount ?? ''}`.toLowerCase().includes(s),
    )
  }, [rows, q])

  function openAdd() {
    setEditing(null)
    setExamRevisionTypeId(revisionTypes[0]?.generalDetailId ?? null)
    const today = new Date().toISOString().slice(0, 10)
    setFromDate(today)
    setToDate(today)
    setAmount('0')
    setIsActive(true)
    setReason('active')
    setOpen(true)
  }

  function openEdit(row: any) {
    setEditing(row)
    setExamRevisionTypeId(Number(row.examRevisionTypeId ?? null))
    setFromDate(String(row.fromDate ?? '').slice(0, 10))
    setToDate(String(row.toDate ?? '').slice(0, 10))
    setAmount(String(row.amount ?? 0))
    setIsActive(Boolean(row.isActive))
    setReason(String(row.reason ?? ''))
    setOpen(true)
  }

  async function save() {
    if (!collegeId || !courseId || !examRevisionTypeId || !fromDate || !toDate) return
    if (fromDate > toDate) {
      alert('From Date should be <= To Date')
      return
    }
    const payload = {
      college: { collegeId },
      course: { courseId },
      examRevisionTypeId,
      fromDate,
      toDate,
      amount: Number(amount || 0),
      isActive,
      reason,
    }
    if (editing?.revisionMasterId) {
      const updatePayload = { ...payload, createdDt: editing.createdDt }
      await updateRevisionMaster(Number(editing.revisionMasterId), updatePayload).catch(() => null)
    } else {
      await createRevisionMaster(payload).catch(() => null)
    }
    setOpen(false)
    const list = await listRevisionMastersByCourse(courseId).catch(() => [])
    setRows(Array.isArray(list) ? list : [])
  }

  return (
    <div className="p-6 space-y-3">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Exam Revision Master</h2>
        </div>
        <div className="px-3 py-3 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="space-y-1 md:col-span-2">
            <Label>College</Label>
            <Select value={collegeId ? String(collegeId) : undefined} onValueChange={(v) => setCollegeId(Number(v))}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="College" /></SelectTrigger>
              <SelectContent>
                {colleges.map((c: any, i: number) => (
                  <SelectItem key={`c-${c.collegeId ?? i}`} value={String(c.collegeId)}>
                    {c.collegeCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Course</Label>
            <Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => setCourseId(Number(v))}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c: any, i: number) => (
                  <SelectItem key={`co-${c.courseId ?? i}`} value={String(c.courseId)}>
                    {c.courseCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {courseId && (
        <div className="app-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Input className="h-8 text-[12px] max-w-sm" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="ml-auto">
              <Button className="h-8 text-[12px]" onClick={openAdd}>+ Add Revision Master</Button>
            </div>
          </div>
          <div className="rounded-md border overflow-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-1 text-left">SI.No</th>
                  <th className="px-2 py-1 text-left">Exam Revision Type</th>
                  <th className="px-2 py-1 text-left">From Date</th>
                  <th className="px-2 py-1 text-left">To Date</th>
                  <th className="px-2 py-1 text-left">Amount</th>
                  <th className="px-2 py-1 text-left">Status</th>
                  <th className="px-2 py-1 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r: any, i: number) => (
                  <tr key={`r-${r.revisionMasterId ?? i}`}>
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">{r.examRevisionTypeName}</td>
                    <td className="px-2 py-1">{String(r.fromDate ?? '').slice(0, 10)}</td>
                    <td className="px-2 py-1">{String(r.toDate ?? '').slice(0, 10)}</td>
                    <td className="px-2 py-1">{r.amount}</td>
                    <td className="px-2 py-1">{r.isActive ? 'Active' : 'InActive'}</td>
                    <td className="px-2 py-1"><Button variant="ghost" size="sm" onClick={() => openEdit(r)}>Edit</Button></td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td className="px-2 py-2 text-muted-foreground" colSpan={7}>No records</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[hsl(var(--primary))]">
              {editing ? 'Edit Exam Revision Master' : 'Add Exam Revision Master'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1 md:col-span-2">
              <Label>Exam Revision Type</Label>
              <Select value={examRevisionTypeId ? String(examRevisionTypeId) : undefined} onValueChange={(v) => setExamRevisionTypeId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Revision Type" /></SelectTrigger>
                <SelectContent>
                  {revisionTypes.map((t: any, i: number) => (
                    <SelectItem key={`t-${t.generalDetailId ?? i}`} value={String(t.generalDetailId)}>
                      {t.generalDetailDisplayName ?? t.generalDetailCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input className="h-8 text-[12px]" type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>From Date</Label>
              <Input className="h-8 text-[12px]" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>To Date</Label>
              <Input className="h-8 text-[12px]" type="date" min={fromDate || undefined} value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={isActive ? '1' : '0'} onValueChange={(v) => setIsActive(v === '1')}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Active</SelectItem>
                  <SelectItem value="0">InActive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!isActive && (
              <div className="space-y-1 md:col-span-2">
                <Label>Reason</Label>
                <Input className="h-8 text-[12px]" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

