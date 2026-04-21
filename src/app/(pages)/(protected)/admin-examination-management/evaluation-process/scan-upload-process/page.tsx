'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Eye, Filter } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { runEvaluationProc, uploadExamOmr } from '@/services/evaluation-process-admin'
import { MINIO_URL } from '@/config/constants/api'
import { dedupeBy, num, txt } from '@/common/utils/data-helpers'

type AnyRow = Record<string, any>

type UploadedFileRow = {
  fileName: string
  folder: string
  status: 'Pending' | 'Progress' | 'Success' | 'File not found'
  view: string
  file: File
}

const text = txt

async function getProcResult(params: Record<string, string | number>): Promise<AnyRow[][]> {
  const procCandidates = [
    's_get_collegeexamdetails_bycode',
    's_get_collegewisedetails_bycode',
    's_get_exam_assignments',
    's_get_exam_filters_bycode',
  ]
  for (const proc of procCandidates) {
    try {
      const data = await runEvaluationProc<{ result?: AnyRow[][]; data?: { result?: AnyRow[][] } }>(proc, params)
      const result = data?.result ?? data?.data?.result ?? []
      if (Array.isArray(result) && result.length > 0) return result
    } catch {
      // try next proc candidate
    }
  }

  const directCandidates = [
    'getAllRecords/s_get_collegeexamdetails_bycode',
    'getAllRecords/s_get_collegewisedetails_bycode',
    'getAllRecords/s_get_exam_assignments',
    'getCollegeExamDetails',
    'getAnswerPaperUpload',
  ]
  const search = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  )
  for (const path of directCandidates) {
    try {
      const res = await fetch(`/api/proxy/${path}?${search.toString()}`)
      if (!res.ok) continue
      const body = await res.json().catch(() => null)
      const result =
        body?.data?.result ??
        body?.result ??
        body?.data?.data?.result ??
        []
      if (Array.isArray(result) && result.length > 0) return result
    } catch {
      // try next direct path candidate
    }
  }
  return []
}

function pickFlagGroup(groups: AnyRow[][], flag: string): AnyRow[] {
  const direct = groups.find((g) => (g?.[0]?.flag ?? '') === flag)
  if (direct) return direct
  const flat = groups.flatMap((g) => (Array.isArray(g) ? g : []))
  if (flat.some((r) => String(r?.flag ?? '') === flag)) {
    return flat.filter((r) => String(r?.flag ?? '') === flag)
  }
  return flat
}

async function uploadExamOmrWithPath(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file, file.name)
  const body = await uploadExamOmr(form).catch(() => null) as { success?: boolean; message?: string; data?: unknown } | null
  if (body?.success === false) {
    throw new Error(body?.message ?? 'Upload failed')
  }

  const data = body?.data
  if (typeof data === 'string') return data
  if (Array.isArray(data) && typeof data[0] === 'string') return data[0]
  if (Array.isArray(data?.result) && typeof data.result[0] === 'string') return data.result[0]
  if (typeof data?.path === 'string') return data.path
  return ''
}

export default function ScanUploadProcessPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [loading, setLoading] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)
  const [showResult, setShowResult] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [searchText, setSearchText] = useState('')

  const [allRows, setAllRows] = useState<AnyRow[]>([])
  const [summaryRow, setSummaryRow] = useState<AnyRow | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileRow[]>([])
  const [folderPath, setFolderPath] = useState('')

  const [collegeId, setCollegeId] = useState<number>(0)
  const [examMonthYear, setExamMonthYear] = useState<string>('')
  const [examId, setExamId] = useState<number>(0)
  const [subjectId, setSubjectId] = useState<number>(0)
  const [examDate, setExamDate] = useState<string>('')
  const [examTimetableId, setExamTimetableId] = useState<number>(0)

  const organizationId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)

  const colleges = useMemo(
    () => dedupeBy(allRows, (r) => num(r.fk_college_id)),
    [allRows],
  )

  const monthYears = useMemo(() => {
    const scoped = collegeId === 0 ? allRows : allRows.filter((r) => num(r.fk_college_id) === collegeId)
    return dedupeBy(scoped, (r) => text(r.exam_month_yr)).sort(
      (a, b) => new Date(String(b.exam_month_yr)).getTime() - new Date(String(a.exam_month_yr)).getTime(),
    )
  }, [allRows, collegeId])

  const exams = useMemo(() => {
    const scoped = allRows.filter((r) => {
      const collegeOk = collegeId === 0 || num(r.fk_college_id) === collegeId
      const monthOk = !examMonthYear || text(r.exam_month_yr) === examMonthYear
      return collegeOk && monthOk
    })
    return dedupeBy(scoped, (r) => num(r.fk_exam_id))
  }, [allRows, collegeId, examMonthYear])

  const subjects = useMemo(() => {
    const scoped = allRows.filter((r) => num(r.fk_exam_id) === examId)
    return dedupeBy(scoped, (r) => num(r.fk_subject_id))
  }, [allRows, examId])

  const selectedExam = useMemo(() => exams.find((e) => num(e.fk_exam_id) === examId) ?? null, [exams, examId])
  const selectedSubject = useMemo(() => subjects.find((s) => num(s.fk_subject_id) === subjectId) ?? null, [subjects, subjectId])

  const filteredUploadedFiles = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return uploadedFiles
    return uploadedFiles.filter((row) => `${row.fileName} ${row.folder} ${row.status}`.toLowerCase().includes(q))
  }, [uploadedFiles, searchText])

  useEffect(() => {
    async function loadFilters() {
      setLoading(true)
      try {
        const groups = await getProcResult({
          in_flag: 'exam_timetable_details',
          in_org_id: organizationId || 0,
          in_college_id: 0,
          in_academic_year_id: 0,
          in_isadmin: '',
          in_exam_id: 0,
          in_timetable_id: 0,
          in_exam_date: '1990-01-01',
          in_subject_id: 0,
          in_loginuser_empid: 0,
          in_loginuser_roleid: 0,
        })
        const source = pickFlagGroup(groups, 'exam_timetable_details')
        setAllRows(source)

        const firstCollege = num(source[0]?.fk_college_id)
        if (firstCollege > 0) setCollegeId(firstCollege)
      } finally {
        setLoading(false)
      }
    }
    void loadFilters()
  }, [organizationId])

  useEffect(() => {
    setExamMonthYear(text(monthYears[0]?.exam_month_yr))
  }, [monthYears])

  useEffect(() => {
    const firstExamId = num(exams[0]?.fk_exam_id)
    setExamId(firstExamId)
  }, [exams])

  useEffect(() => {
    const firstSubjectId = num(subjects[0]?.fk_subject_id)
    setSubjectId(firstSubjectId)
  }, [subjects])

  useEffect(() => {
    setExamDate(text(selectedSubject?.exam_date ?? selectedExam?.exam_date ?? ''))
    setExamTimetableId(num(selectedExam?.fk_exam_timetable_id))
  }, [selectedExam, selectedSubject])

  async function getList() {
    if (!subjectId) return
    setLoading(true)
    setShowResult(true)
    setSummaryRow(null)
    try {
      const examDateParam = examDate || 'undefined'
      const groups = await getProcResult({
        in_flag: 'exam_timetable_answerpaper_details',
        in_org_id: organizationId || 0,
        in_college_id: 0,
        in_academic_year_id: 0,
        in_isadmin: 0,
        in_exam_id: 0,
        in_timetable_id: examTimetableId || 0,
        in_exam_date: examDateParam,
        in_subject_id: subjectId,
        in_loginuser_empid: 0,
        in_loginuser_roleid: 0,
      })
      const summaryGroup = pickFlagGroup(groups, 'exam_timetable_answerpaper_details')
      const first = summaryGroup[0] ?? null
      setSummaryRow(first)
    } finally {
      setLoading(false)
    }
  }

  function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      setFolderPath('')
      setUploadedFiles([])
      return
    }

    const nextRows: UploadedFileRow[] = []
    for (const file of Array.from(files)) {
      const path = String((file as File & { webkitRelativePath?: string }).webkitRelativePath ?? '')
      const parts = path.split('/')
      const currentFolder = parts[1] || file.name
      parts.pop()
      nextRows.push({
        fileName: currentFolder,
        folder: parts[0] ?? '',
        status: 'Pending',
        view: '',
        file,
      })
    }
    setUploadedFiles(nextRows)
    setFolderPath(nextRows[0]?.folder ?? '')
  }

  async function submitUpload() {
    if (uploadedFiles.length === 0) return
    setUploading(true)
    try {
      const mutable = [...uploadedFiles]
      for (const [idx, row] of mutable.entries()) {
        mutable[idx] = { ...row, status: 'Progress' }
        setUploadedFiles([...mutable])

        try {
          const uploadedPath = await uploadExamOmrWithPath(row.file)
          mutable[idx] = { ...row, status: 'Success', view: uploadedPath }
        } catch {
          mutable[idx] = { ...row, status: 'File not found', view: '' }
        }
        setUploadedFiles([...mutable])
      }
      await getList()
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setUploading(false)
    }
  }

  const examLabel = text(selectedExam?.exam_name)
  const subjectCodeLabel = text(selectedSubject?.subject_code)
  const detailsLabel = examLabel + (subjectCodeLabel ? ` / ${subjectCodeLabel}` : '')
  const totalStudents = num(summaryRow?.total_students)
  const attendanceMarked = num(summaryRow?.attendance_marked)
  const uploadedCount = num(summaryRow?.no_oof_answerpaper_uploaded)
  const notUploaded = Math.max(totalStudents - uploadedCount, 0)

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Upload Scanned Answer Papers" subtitle="Evaluation process - scan upload process" />

      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Upload Scanned Answer Papers</h2>
          <Button type="button" variant="outline" size="sm" className="h-6 px-2.5 text-[12px]" onClick={() => setFilterOpen((v) => !v)}>
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
          </Button>
        </div>

        {filterOpen && (
          <div className="p-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-2 space-y-1">
                <Label>Faculty *</Label>
                <Select value={String(collegeId)} onValueChange={(v) => setCollegeId(num(v))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Faculty" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">All</SelectItem>
                    {colleges.map((c) => (
                      <SelectItem key={String(num(c.fk_college_id))} value={String(num(c.fk_college_id))}>
                        {text(c.college_code)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <Label>Exam Month Year</Label>
                <Select value={examMonthYear || undefined} onValueChange={setExamMonthYear}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Month Year" /></SelectTrigger>
                  <SelectContent>
                    {monthYears.map((m) => {
                      const val = text(m.exam_month_yr)
                      return <SelectItem key={val} value={val}>{val}</SelectItem>
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-5 space-y-1">
                <Label>Exam *</Label>
                <Select value={String(examId)} onValueChange={(v) => setExamId(num(v))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">All</SelectItem>
                    {exams.map((e) => (
                      <SelectItem key={String(num(e.fk_exam_id))} value={String(num(e.fk_exam_id))}>
                        {text(e.exam_name)} {text(e.exam_date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-3 space-y-1">
                <Label>Subjects</Label>
                <Select value={String(subjectId)} onValueChange={(v) => setSubjectId(num(v))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Subjects" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={String(num(s.fk_subject_id))} value={String(num(s.fk_subject_id))}>
                        {text(s.subject_name)} ({text(s.subject_code)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {subjectId > 0 && (
                <div className="md:col-span-2 space-y-1">
                  <Label>Exam Date *</Label>
                  <Input value={examDate} readOnly className="h-8 text-[12px]" />
                </div>
              )}

              <div className="md:col-span-2">
                <Button type="button" className="h-8 px-4 text-[12px]" disabled={!subjectId || loading} onClick={getList}>
                  Get List
                </Button>
              </div>
            </div>

            {showResult && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end pt-2">
                <div className="md:col-span-4 space-y-1">
                  <Label>Folder Path</Label>
                  <Input value={folderPath} readOnly placeholder="Folder Path" className="h-8 text-[12px]" />
                </div>
                <div className="md:col-span-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    webkitdirectory=""
                    multiple
                    onChange={(e) => onPickFiles(e.target.files)}
                  />
                  <Button type="button" className="h-8 px-4 text-[12px] w-full bg-sky-600 hover:bg-sky-700" onClick={() => fileInputRef.current?.click()}>
                    Browse
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showResult && (
        <div className="app-card p-3 space-y-3">
          <div className="px-1 text-[14px] font-semibold text-[hsl(var(--primary))]">
            Upload Scanned Answer Papers - ({detailsLabel || '-'})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
            <div className="md:col-span-3 rounded border bg-slate-50 p-2 text-[13px]">Total Students : <span className="text-blue-700">{totalStudents}</span></div>
            <div className="md:col-span-6 px-2"><div className="h-3 bg-sky-100 rounded"><div className="h-3 bg-sky-500 rounded w-3/5" /></div></div>
            <div className="md:col-span-3 rounded border bg-slate-50 p-2 text-[13px]">AnswerPapers Uploaded : <span className="text-blue-700">{uploadedCount}</span></div>
            <div className="md:col-span-3 rounded border bg-slate-50 p-2 text-[13px]">Attendance Marked : <span className="text-blue-700">{attendanceMarked}</span></div>
            <div className="md:col-span-6 text-center text-[13px] text-slate-600">Waiting for files to be scanning.....</div>
            <div className="md:col-span-3 rounded border bg-slate-50 p-2 text-[13px]">Answer Papers Not uploaded : <span className="text-blue-700">{notUploaded}</span></div>
          </div>
        </div>
      )}

      {showResult && (
        <div className="app-card p-3 space-y-3">
          <div className="px-1 text-[14px] font-semibold text-[hsl(var(--primary))]">Scanned Files - {detailsLabel || '-'}</div>
          <div className="w-full max-w-sm">
            <Input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search" className="h-8 text-[12px]" />
          </div>

          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-1 text-left">SI.No</th>
                  <th className="px-2 py-1 text-left">File Name</th>
                  <th className="px-2 py-1 text-left">Folder Name</th>
                  <th className="px-2 py-1 text-left">Status</th>
                  <th className="px-2 py-1 text-left">View</th>
                </tr>
              </thead>
              <tbody>
                {filteredUploadedFiles.map((row, i) => (
                  <tr key={`${row.folder}-${row.fileName}-${row.file.lastModified}-${row.file.size}`} className="border-t">
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">{row.fileName}</td>
                    <td className="px-2 py-1">{row.folder || '-'}</td>
                    <td className="px-2 py-1">{row.status}</td>
                    <td className="px-2 py-1">
                      {row.view ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                          onClick={() => {
                            const resolvedUrl = /^https?:\/\//i.test(row.view) ? row.view : MINIO_URL + row.view
                            window.open(resolvedUrl, '_blank')
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
                {filteredUploadedFiles.length === 0 && (
                  <tr className="border-t">
                    <td className="px-2 py-4 text-center text-slate-500" colSpan={5}>No files selected</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-8 px-4 text-[12px]"
              onClick={() => {
                setUploadedFiles([])
                setFolderPath('')
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
            >
              Back
            </Button>
            <Button type="button" className="h-8 px-4 text-[12px]" disabled={uploadedFiles.length === 0 || uploading} onClick={submitUpload}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

