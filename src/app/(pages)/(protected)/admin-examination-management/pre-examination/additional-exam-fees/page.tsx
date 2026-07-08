'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { ChevronDown, Eye, Filter, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import defaultStudent from '@/assets/images/avatars/default_Student.png'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, type SelectOption } from '@/common/components/select'
import { StudentSearchSelect } from '@/common/components/student-search'
import { toDateStr, toDateOnlyISO } from '@/common/generic-functions'
import {
  addExamAdditionalFeeReceipt,
  getUnivExamFiltersRegSup,
  listAdditionalExamFeeTypes,
  listExamFeeReceipts,
  listStudents,
  getStudentExamFeeStructure,
  listExamFeeAdditionalStructureByExamType,
} from '@/services/pre-examination'
import { PageContainer, PageHeader } from '@/components/layout'

type AnyRow = Record<string, any>
type AddedFeeRow = {
  courseYearId: number
  courseYearName: string
  examType: 'Regular' | 'Supplementary'
  feeTypeId: number
  feeTypeName: string
  amount: number
  examFeeReceiptId: number | null
}

const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>()
  return rows.filter((r) => {
    const key = keyFn(r)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const pickNum = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return 0
  for (const key of keys) {
    const v = Number(row[key])
    if (v > 0) return v
  }
  return 0
}

const pickText = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return ''
  for (const key of keys) {
    const v = row[key]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

const getFeeTypeLabel = (row: AnyRow | null | undefined) => {
  if (!row) return 'Additional Fee'
  const code = pickText(row, [
    'adtExamfeetypeCatCode',
    'addtExamFeeTypeCatCode',
    'generalDetailCode',
    'addtFeeTypeCode',
  ])
  const name = pickText(row, [
    'addtExamFeeTypeName',
    'addtFeeTypeName',
    'generalDetailDisplayName',
    'generalDetailName',
    'name',
  ])
  const raw = code || name || 'Additional Fee'
  const text = String(raw).trim()
  // Some legacy payloads return duplicated text like "DUPHALLTICKETDUPHALLTICKETD".
  if (text.length % 2 === 0) {
    const half = text.length / 2
    const left = text.slice(0, half)
    const right = text.slice(half)
    if (left === right) return left
  }
  return text
}

const dedupeFeeTypes = (rows: AnyRow[]) => {
  const seen = new Set<string>()
  const out: AnyRow[] = []
  for (const row of rows) {
    const label = getFeeTypeLabel(row).toUpperCase()
    if (!label || seen.has(label)) continue
    seen.add(label)
    out.push(row)
  }
  return out
}

export default function AdditionalExamFeesPage() {
  const [filterOpen, setFilterOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [students, setStudents] = useState<AnyRow[]>([])
  const [studentId, setStudentId] = useState<number | null>(null)
  const [student, setStudent] = useState<AnyRow | null>(null)
  const [selectedStudentCache, setSelectedStudentCache] = useState<AnyRow | null>(null)

  const [filterRows, setFilterRows] = useState<AnyRow[]>([])
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [examSearch, setExamSearch] = useState('')

  const [rows, setRows] = useState<AnyRow[]>([])
  const [hasFetched, setHasFetched] = useState(false)

  const [feeTypes, setFeeTypes] = useState<AnyRow[]>([])
  const [structure, setStructure] = useState<AnyRow | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addForRow, setAddForRow] = useState<AnyRow | null>(null)
  const [feeTypeId, setFeeTypeId] = useState<number | null>(null)
  const [feeAmount, setFeeAmount] = useState<number>(0)
  const [feePreviewAmount, setFeePreviewAmount] = useState<number>(0)

  const [subjectsOpen, setSubjectsOpen] = useState(false)
  const [subjectsRows, setSubjectsRows] = useState<AnyRow[]>([])
  const [examType, setExamType] = useState<'Regular' | 'Supplementary'>('Regular')
  const [semesterId, setSemesterId] = useState<number | null>(null)
  const [addedFees, setAddedFees] = useState<AddedFeeRow[]>([])
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [paymentDate, setPaymentDate] = useState(toDateOnlyISO(new Date()))
  const [feeComments, setFeeComments] = useState('')
  const [inlineNotice, setInlineNotice] = useState<string | null>(null)
  const [payConfirmOpen, setPayConfirmOpen] = useState(false)
  const [paying, setPaying] = useState(false)

  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  async function onSearchStudents(term: string) {
    const q = term.trim()
    if (!q) {
      setStudents([])
      return
    }
    if (q.length < 5) return
    setStudentsLoading(true)
    try {
      const list = await listStudents(q).catch(() => [])
      setStudents(Array.isArray(list) ? list : [])
    } finally {
      setStudentsLoading(false)
    }
  }

  function onStudentChange(id: number | null, row: AnyRow | null) {
    setStudentId(id)
    if (!id || !row) {
      setStudent(null)
      setSelectedStudentCache(null)
      setAddedFees([])
      setInlineNotice(null)
      setAcademicYearId(null)
      setExamId(null)
      setRows([])
      setHasFetched(false)
      return
    }
    setStudents((prev) => {
      const sid = pickNum(row, ['studentId', 'fk_student_id', 'student_id', 'std_id'])
      return prev.some((s) => pickNum(s, ['studentId', 'fk_student_id', 'student_id', 'std_id']) === sid)
        ? prev
        : [...prev, row]
    })
    setSelectedStudentCache(row)
    setStudent(row)
    const sidAy = pickNum(row, ['academicYearId', 'fk_academic_year_id', 'fk_academicYearId'])
    setAcademicYearId(sidAy > 0 ? sidAy : null)
    setExamId(null)
    setRows([])
    setHasFetched(false)
    setAddedFees([])
    setInlineNotice(null)
  }

  useEffect(() => {
    async function init() {
      const [filters, types] = await Promise.all([
        getUnivExamFiltersRegSup(employeeId).catch(() => []),
        listAdditionalExamFeeTypes().catch(() => []),
      ])
      setFilterRows(Array.isArray(filters) ? filters : [])
      setFeeTypes(dedupeFeeTypes(Array.isArray(types) ? types : []))
    }
    void init()
  }, [employeeId])

  // Load fee structure for selected semester (courseYear) and exam
  useEffect(() => {
    async function loadStructure() {
      if (!student || !examId || !semesterId) {
        setStructure(null)
        return
      }
      const s = await getStudentExamFeeStructure({
        collegeId: Number(student.collegeId ?? 0),
        examId: Number(examId),
        courseGroupId: Number(student.courseGroupId ?? student.fk_course_group_id ?? 0),
        courseYearId: Number(semesterId),
      }).catch(() => null)
      setStructure(s)
    }
    void loadStructure()
  }, [student, examId, semesterId])

  // Build fee types using exact Angular source API (ExamFeeAdditionalStructure by exam type).
  // If fee-structure DTO exists, only use it to override fee amounts for matching types.
  useEffect(() => {
    const isRegular = examType === 'Regular'
    ;(async () => {
      const sourceList: AnyRow[] = await listExamFeeAdditionalStructureByExamType(isRegular ? 405 : 406)

      if (!Array.isArray(sourceList) || sourceList.length === 0) {
        setFeeTypes([])
        return
      }

      const structureRows = Array.isArray(structure?.examFeeAdditionalStructureDTOs)
        ? (structure?.examFeeAdditionalStructureDTOs as AnyRow[])
        : []

      const structureFeeByTypeId = new Map<number, number>()
      for (const sr of structureRows) {
        const typeId = Number(
          sr.adtExamfeetypeCatId ??
            sr.addtExamFeeTypeCatId ??
            sr.addtFeeTypeCatId ??
            sr?.adtExamfeetypeCat?.generalDetailId ??
            sr?.addtExamFeeTypeCat?.generalDetailId ??
            0,
        )
        if (typeId > 0) {
          structureFeeByTypeId.set(typeId, Number(sr.fee ?? sr.addtFeeAmount ?? sr.amount ?? 0))
        }
      }

      const getName = (row: AnyRow) =>
        row.addtExamFeeTypeName ??
        row.addtFeeTypeName ??
        row.generalDetailName ??
        row.generalDetailDisplayName ??
        row?.adtExamfeetypeCat?.generalDetailName ??
        row?.adtExamfeetypeCat?.generalDetailDisplayName ??
        row?.addtExamFeeTypeCat?.generalDetailName ??
        row?.addtExamFeeTypeCat?.generalDetailDisplayName ??
        'Additional Fee'

      const filtered: AnyRow[] = []
      for (const row of sourceList) {
        const includeInReg = Boolean(row.includeInReg)
        const includeInRev = Boolean(row.includeInRev)
        const code = String(row.examTypeCatDisplayCode ?? row.examType ?? row.examtypeCatCode ?? '').toLowerCase()
        const fee = Number(row.fee ?? 0)
        const catId = Number(
          row.adtExamfeetypeCatId ??
            row.addtExamFeeTypeCatId ??
            row.addtFeeTypeCatId ??
            row?.adtExamfeetypeCat?.generalDetailId ??
            row?.addtExamFeeTypeCat?.generalDetailId ??
            0,
        )
        const name = getName(row)

        const matchesType =
          (isRegular && (code.includes('regular') || code === 'reg' || code === 'regular')) ||
          (!isRegular && (code.includes('supple') || code.includes('supp') || code === 'supple'))
        if (!matchesType) continue

        filtered.push({
          ...row,
          generalDetailId: catId,
          generalDetailName: name,
          fee:
            structureFeeByTypeId.get(catId) ??
            (includeInReg === false && includeInRev === false ? fee : 0),
        })
      }

      if (filtered.length > 0) {
        setFeeTypes(dedupeFeeTypes(filtered))
        if (feeTypeId) {
          const picked = filtered.find((t) => Number(t.generalDetailId) === Number(feeTypeId))
          setFeePreviewAmount(
            Number(
              picked?.fee ??
                picked?.amount ??
                picked?.defaultAmount ??
                picked?.addtFeeAmount ??
                0,
            ) || 0,
          )
        }
      } else {
        // Same data as `sourceList` — broader mapping when exam-type filter yields no rows (single API call).
        const mapped = sourceList.map((row) => {
          const name =
            row.addtExamFeeTypeName ??
            row.addtFeeTypeName ??
            row.generalDetailName ??
            row.generalDetailDisplayName ??
            row?.adtExamfeetypeCat?.generalDetailName ??
            row?.adtExamfeetypeCat?.generalDetailDisplayName ??
            row?.addtExamFeeTypeCat?.generalDetailName ??
            row?.addtExamFeeTypeCat?.generalDetailDisplayName ??
            'Additional Fee'
          return {
            ...row,
            generalDetailId: Number(
              row.adtExamfeetypeCatId ??
                row.addtExamFeeTypeCatId ??
                row.addtFeeTypeCatId ??
                row?.adtExamfeetypeCat?.generalDetailId ??
                row?.addtExamFeeTypeCat?.generalDetailId ??
                0,
            ),
            generalDetailName: name,
            fee: Boolean(row.includeInReg) === false && Boolean(row.includeInRev) === false ? Number(row.fee ?? 0) : 0,
          }
        })
        setFeeTypes(dedupeFeeTypes(mapped))
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structure, examType, examId])

  // Keep the side-box amount in sync with the selected fee type default
  useEffect(() => {
    if (!feeTypeId) {
      setFeePreviewAmount(0)
      return
    }
    const picked =
      feeTypes.find((t) => Number(t.generalDetailId ?? t.addtExamFeeTypeCatId ?? 0) === Number(feeTypeId)) ?? null
    const defAmt =
      Number(
        picked?.fee ??
          picked?.amount ??
          picked?.defaultAmount ??
          picked?.addtFeeAmount ??
          0,
      ) || 0
    setFeePreviewAmount(defAmt)
  }, [feeTypeId, feeTypes])

  // When fee types load or change, auto-select the first sensible option
  useEffect(() => {
    if (!Array.isArray(feeTypes) || feeTypes.length === 0) return
    const exists = feeTypes.find((t) => Number(t.generalDetailId ?? t.addtExamFeeTypeCatId ?? 0) === Number(feeTypeId))
    if (!exists) {
      const preferred =
        feeTypes.find((t) => Number(t.fee ?? t.amount ?? t.defaultAmount ?? t.addtFeeAmount ?? 0) > 0) ?? feeTypes[0]
      const id = Number(preferred.generalDetailId ?? preferred.addtExamFeeTypeCatId ?? 0)
      if (id > 0) setFeeTypeId(id)
    }
  }, [feeTypes])

  const academicYears = useMemo(() => {
    if (!student) return []
    return dedupeBy(
      filterRows.filter(
        (r) =>
          pickNum(r, ['fk_course_id', 'courseId', 'fk_courseId']) ===
            pickNum(student, ['courseId', 'fk_course_id', 'fk_courseId']) &&
          pickNum(r, ['fk_college_id', 'collegeId', 'fk_collegeId']) ===
            pickNum(student, ['collegeId', 'fk_college_id', 'fk_collegeId']),
      ),
      (r) => pickNum(r, ['fk_academic_year_id', 'academicYearId', 'fk_academicYearId']),
    ).filter((r) => pickNum(r, ['fk_academic_year_id', 'academicYearId', 'fk_academicYearId']) > 0)
  }, [filterRows, student])

  const exams = useMemo(() => {
    if (!student) return []
    const studentCourseId = pickNum(student, ['courseId', 'fk_course_id', 'fk_courseId'])
    const studentCollegeId = pickNum(student, ['collegeId', 'fk_college_id', 'fk_collegeId'])

    // Legacy behavior is course-first. Some rows carry college/AY as 0 (ALL),
    // so strict equality can hide valid exams.
    const byCourse = filterRows.filter(
      (r) =>
        pickNum(r, ['fk_course_id', 'courseId', 'fk_courseId']) === studentCourseId &&
        !Boolean(r.is_internal_exam ?? r.isInternalExam),
    )

    const strictScoped = byCourse.filter((r) => {
      const rowCollegeId = pickNum(r, ['fk_college_id', 'collegeId', 'fk_collegeId'])
      const rowAyId = pickNum(r, ['fk_academic_year_id', 'academicYearId', 'fk_academicYearId'])
      const collegeOk = rowCollegeId === 0 || rowCollegeId === studentCollegeId
      const ayOk = !academicYearId || rowAyId === 0 || rowAyId === Number(academicYearId)
      return collegeOk && ayOk
    })

    const source = strictScoped.length > 0 ? strictScoped : byCourse
    const all = dedupeBy(source, (r) => pickNum(r, ['fk_exam_id', 'examId', 'fk_examId'])).filter(
      (r) => pickNum(r, ['fk_exam_id', 'examId', 'fk_examId']) > 0,
    )
    const q = examSearch.trim().toLowerCase()
    if (!q) return all
    return all.filter((r) => `${r.exam_name ?? r.examName ?? ''}`.toLowerCase().includes(q))
  }, [filterRows, student, academicYearId, examSearch])

  const examOptions = useMemo<SelectOption[]>(
    () =>
      exams.map((e, i) => ({
        value: String(pickNum(e, ['fk_exam_id', 'examId', 'fk_examId']) || i),
        label: (() => {
          const name =
            pickText(e, ['exam_name', 'examName']) ||
            `Exam ${pickNum(e, ['fk_exam_id', 'examId', 'fk_examId'])}`
          const fromDate = toDateStr(pickText(e, ['fromDate', 'from_date']))
          const toDate = toDateStr(pickText(e, ['toDate', 'to_date']))
          const tags = [
            e?.isInternalExam ? '(Internal)' : '',
            e?.isRegularExam ? '(Regular)' : '',
            e?.isSupplyExam ? '(Supple)' : '',
          ]
            .filter(Boolean)
            .join(' ')
          const datePart = fromDate && toDate ? ` (${fromDate} - ${toDate})` : ''
          return `${name}${datePart}${tags ? ` ${tags}` : ''}`.trim()
        })(),
      })),
    [exams],
  )

  async function onLoadReceipts() {
    if (!studentId || !examId) return
    setLoading(true)
    try {
      const list = await listExamFeeReceipts({ studentId, examId }).catch(() => [])
      setRows(Array.isArray(list) ? list : [])
      const firstSem = pickNum((Array.isArray(list) ? list : [])[0], [
        'courseYearId',
        'course_year_id',
        'fk_course_year_id',
        'fk_course_yearId',
        'fromCourseYearId',
      ])
      if (firstSem > 0) setSemesterId(firstSem)
      setHasFetched(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!studentId || !examId) return
    void onLoadReceipts()
  }, [studentId, examId])

  useEffect(() => {
    if (!studentId) return
    if (examId) return
    const first = exams[0]
    if (!first) return
    const id = pickNum(first, ['fk_exam_id', 'examId', 'fk_examId'])
    if (id > 0) setExamId(id)
  }, [studentId, exams, examId])

  function openAddFee(row: AnyRow, presetFeeTypeId?: number | null) {
    setAddForRow(row)
    const nextFeeTypeId = presetFeeTypeId ?? feeTypeId ?? null
    setFeeTypeId(nextFeeTypeId)
    const pickedType =
      feeTypes.find((t) => Number(t.generalDetailId ?? t.addtExamFeeTypeCatId ?? 0) === Number(nextFeeTypeId ?? 0)) ??
      null
    const defaultAmt =
      Number(
        pickedType?.fee ??
          pickedType?.amount ??
          pickedType?.defaultAmount ??
          pickedType?.addtFeeAmount ??
          0,
      ) || 0
    setFeeAmount(defaultAmt)
    setAddOpen(true)
  }

  const semesters = useMemo(() => {
    const fromReceipts = dedupeBy(
      rows,
      (r) =>
        pickNum(r, ['courseYearId', 'course_year_id', 'fk_course_year_id', 'fk_course_yearId', 'fromCourseYearId']),
    ).filter(
      (r) =>
        pickNum(r, ['courseYearId', 'course_year_id', 'fk_course_year_id', 'fk_course_yearId', 'fromCourseYearId']) >
        0,
    )
    if (fromReceipts.length > 0) return fromReceipts

    if (!student) return []
    const studentCourseId = pickNum(student, ['courseId', 'fk_course_id', 'fk_courseId'])
    const studentCollegeId = pickNum(student, ['collegeId', 'fk_college_id', 'fk_collegeId'])

    const fromFilters = dedupeBy(
      filterRows.filter((r) => {
        const rowCourseId = pickNum(r, ['fk_course_id', 'courseId', 'fk_courseId'])
        const rowCollegeId = pickNum(r, ['fk_college_id', 'collegeId', 'fk_collegeId'])
        const rowExamId = pickNum(r, ['fk_exam_id', 'examId', 'fk_examId'])
        const rowCourseYearId = pickNum(r, ['fk_course_year_id', 'courseYearId', 'fk_course_yearId'])
        if (rowCourseYearId <= 0) return false
        if (rowCourseId !== studentCourseId) return false
        if (rowCollegeId !== 0 && rowCollegeId !== studentCollegeId) return false
        if (examId && rowExamId !== 0 && rowExamId !== Number(examId)) return false
        return true
      }),
      (r) => pickNum(r, ['fk_course_year_id', 'courseYearId', 'fk_course_yearId']),
    )

    if (fromFilters.length > 0) return fromFilters

    const sidCy = pickNum(student, ['courseYearId', 'fk_course_year_id', 'fk_courseYearId'])
    if (sidCy > 0) {
      return [
        {
          courseYearId: sidCy,
          courseYearName:
            pickText(student, ['courseYearName', 'course_year_name']) ||
            pickText(student, ['courseYearCode', 'course_year_code']) ||
            `Course Year ${sidCy}`,
        },
      ]
    }
    return []
  }, [rows, filterRows, student, examId])

  const semesterNameById = useMemo(() => {
    const map = new Map<number, string>()
    for (const s of semesters) {
      const id = pickNum(s, ['courseYearId', 'course_year_id', 'fk_course_year_id', 'fk_courseYearId'])
      if (id <= 0) continue
      const name =
        pickText(s, ['courseYearName', 'course_year_name', 'fromCourseYearName']) ||
        pickText(s, ['courseYearCode', 'course_year_code']) ||
        `Semester ${id}`
      map.set(id, name)
    }
    return map
  }, [semesters])

  useEffect(() => {
    if (semesterId) return
    const first = semesters[0]
    if (!first) return
    const sid = pickNum(first, ['courseYearId', 'course_year_id', 'fk_course_year_id', 'fk_courseYearId'])
    if (sid > 0) setSemesterId(sid)
  }, [semesters, semesterId])

  function onAddFeeFromSelection() {
    if (!semesterId) {
      setInlineNotice('Please select Semester before adding a fee.')
      return
    }
    if (!feeTypeId) {
      setInlineNotice('Please select an Additional Fee type before adding.')
      return
    }
    const scoped = rows.filter((r) => {
      if (
        semesterId &&
        pickNum(r, ['courseYearId', 'course_year_id', 'fk_course_year_id', 'fk_course_yearId', 'fromCourseYearId']) !==
          Number(semesterId)
      ) return false
      const t = String(r.examtypeCatDisplayName ?? r.examType ?? '').toLowerCase()
      if (examType === 'Regular' && t && !t.includes('regular')) return false
      if (examType === 'Supplementary' && t && !t.includes('supp')) return false
      return true
    })
    const row = scoped[0] ?? rows[0] ?? null
    // Legacy Angular behavior allows staging fee rows even when no prior receipt exists.
    // Receipt can be created during pay flow.
    setInlineNotice(null)
    const type = feeTypes.find(
      (t) => Number(t.generalDetailId ?? t.addtExamFeeTypeCatId ?? 0) === Number(feeTypeId),
    )
    const feeName =
      type?.generalDetailName ??
      type?.generalDetailDisplayName ??
      type?.addtExamFeeTypeName ??
      type?.addtFeeTypeName ??
      type?.adtExamfeetypeCatCode ??
      'Fee'
    const amount = Number(
      type?.fee ?? type?.amount ?? type?.defaultAmount ?? type?.addtFeeAmount ?? feeAmount ?? 0,
    )
    const cyId = Number(
      semesterId ??
        pickNum(row, ['courseYearId', 'course_year_id', 'fk_course_year_id', 'fk_course_yearId', 'fromCourseYearId']),
    )
    const cyName =
      semesterNameById.get(cyId) ||
      pickText(row, ['courseYearName', 'course_year_name', 'fromCourseYearName']) ||
      pickText(row, ['courseYearCode', 'course_year_code']) ||
      `Semester ${cyId}`
    const receiptId = row ? Number(row.examFeeReceiptId ?? row.exam_fee_receipt_id ?? 0) : 0
    if (!cyId) {
      alert('Invalid semester context for adding fee')
      return
    }

    setAddedFees((prev) => {
      const idx = prev.findIndex(
        (x) =>
          x.courseYearId === cyId &&
          x.feeTypeId === Number(feeTypeId) &&
          x.examType === examType,
      )
      const nextAmount = (feePreviewAmount && feePreviewAmount > 0)
        ? feePreviewAmount
        : amount > 0
          ? amount
          : Number(feeAmount || 0)
      if (idx >= 0) {
        const list = [...prev]
        list[idx] = {
          ...list[idx],
          amount: nextAmount,
          courseYearName:
            list[idx].courseYearName || semesterNameById.get(cyId) || `Semester ${cyId}`,
        }
        return list
      }
      return [
        ...prev,
        {
          courseYearId: cyId,
          courseYearName: cyName,
          examType,
          feeTypeId: Number(feeTypeId),
          feeTypeName: feeName,
          amount: nextAmount,
          examFeeReceiptId: receiptId > 0 ? receiptId : null,
        },
      ]
    })
  }

  const totalFees = useMemo(
    () => addedFees.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [addedFees],
  )

  function updateAmountAt(index: number, next: number) {
    setAddedFees((prev) => {
      const list = [...prev]
      if (list[index]) list[index] = { ...list[index], amount: isFinite(next) ? next : 0 }
      return list
    })
  }

  function removeRowAt(index: number) {
    setAddedFees((prev) => prev.filter((_, i) => i !== index))
  }

  async function onPayFees() {
    if (addedFees.length === 0) return
    const payloads = addedFees.map((f) => ({
      collegeId: Number(student?.collegeId ?? 0),
      ...(f.examFeeReceiptId ? { examFeeReceiptId: f.examFeeReceiptId } : {}),
      addtExamFeeTypeCatId: f.feeTypeId,
      addtExamFeeTypeName: f.feeTypeName,
      addtFeeAmount: Number(f.amount || 0),
      collectedEmpId: employeeId,
      addtReceiptDate: paymentDate,
      feeComments,
      paymentModeCatDisplayName: paymentMode,
      referenceNumber,
      isActive: true,
    }))
    for (const p of payloads) {
      await addExamAdditionalFeeReceipt(p).catch(() => null)
    }
    await onLoadReceipts()
    setAddedFees([])
    setReferenceNumber('')
    setFeeComments('')
    setInlineNotice('Additional fee payment saved successfully.')
  }

  const selectedExamRow = useMemo(
    () => exams.find((e) => pickNum(e, ['fk_exam_id', 'examId', 'fk_examId']) === Number(examId ?? 0)) ?? null,
    [exams, examId],
  )

  async function onConfirmPayFees() {
    if (paying) return
    setPaying(true)
    try {
      await onPayFees()
      setPayConfirmOpen(false)
    } finally {
      setPaying(false)
    }
  }

  async function saveAdditionalFee() {
    if (!addForRow || !feeTypeId || !feeAmount) return
    const type = feeTypes.find(
      (t) => Number(t.generalDetailId ?? t.addtExamFeeTypeCatId) === Number(feeTypeId),
    )
    const payload = {
      collegeId: Number(addForRow.collegeId ?? student?.collegeId ?? 0),
      examFeeReceiptId: Number(addForRow.examFeeReceiptId ?? addForRow.exam_fee_receipt_id ?? 0),
      addtExamFeeTypeCatId: Number(feeTypeId),
      addtExamFeeTypeName: type?.generalDetailName ?? type?.generalDetailDisplayName ?? 'Additional Fee',
      addtFeeAmount: Number(feeAmount),
      collectedEmpId: employeeId,
      addtReceiptDate: toDateOnlyISO(new Date()),
      isActive: true,
    }
    await addExamAdditionalFeeReceipt(payload).catch(() => null)
    setAddOpen(false)
    await onLoadReceipts()
  }

  function onViewSubjects(row: AnyRow) {
    const first = row.examStudentDTOs?.[0]
    const list = first?.examStudentDetailDTOs ?? row.subjects ?? []
    setSubjectsRows(Array.isArray(list) ? list : [])
    setSubjectsOpen(true)
  }

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Additional Fee Collection" subtitle="Manage additional exam fee receipts" />
      <div className="app-card overflow-hidden bg-card">
        <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between gap-2">
          <h2 className="app-card-title">Additional Fee Collection</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2.5 text-[12px]"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>
        {(
          <div className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <div className="md:col-span-4 space-y-1">
              <StudentSearchSelect
                label="Student *"
                value={studentId}
                students={students}
                selectedStudent={student ?? selectedStudentCache}
                isLoading={studentsLoading}
                onSearch={(term) => void onSearchStudents(term)}
                onChange={onStudentChange}
              />
            </div>

            <div className="md:col-span-7 space-y-1">
              <Label>Exam *</Label>
              <Select
                value={examId ? String(examId) : null}
                onChange={(v) => {
                  const next = v ? Number(v) : null
                  setExamId(next)
                  setExamSearch('')
                }}
                options={examOptions}
                placeholder="Search exam…"
                searchable
                onSearch={(term) => setExamSearch(term)}
              />
            </div>

              <div className="md:col-span-1">
              <Button type="button" variant="outline" className="h-8 text-[12px] w-full" onClick={onLoadReceipts} disabled={loading || !studentId || !examId}>
                Refresh
              </Button>
            </div>
          </div>
          </div>
        )}
      </div>

      {student && examId && (
  <div className="rounded border border-blue-200 bg-blue-50/40 p-3">
    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">

      {/* Student Image */}
      <div className="md:col-span-2 flex justify-center">
      <img
  src={student?.studentPhotoPath || defaultStudent.src}
  alt="Student"
  className="h-24 w-24 rounded object-cover border"
  onError={(e) => {
    e.currentTarget.src = defaultStudent.src
  }}
/>
      </div>

      {/* Student Details */}
      <div className="md:col-span-7 text-[12px] leading-6">
        <div className="font-semibold text-[16px]">
          {student.firstName ?? student.studentName ?? '-'} (
          <span className="text-blue-700">
            {student.isLateral ? 'LATERAL' : 'REGULAR'}
          </span>
          )
        </div>

        <div className="text-muted-foreground">
          {student.hallticketNumber ?? student.rollNumber ?? '-'}
        </div>

        <div className="text-muted-foreground">
          {student.collegeCode ?? '-'} / {student.academicYear ?? '-'} /{' '}
          {student.courseCode ?? '-'} / {student.groupCode ?? '-'} /{' '}
          {student.courseYearName ?? '-'}
          {student.section ? ` / Section ${student.section}` : ''}
        </div>

        <div className="text-muted-foreground">
          {student.mobile ?? '-'}
        </div>
      </div>

      {/* Right Side */}
      <div className="md:col-span-3 text-[12px] leading-7 pl-4">
        <div>
          Quota :
          <span className="text-blue-700 ml-2">
            {student.quotaDisplayName ?? '-'}
          </span>
        </div>

        <div>
          Student Status :
          <span className="text-green-700 font-medium ml-2">
            {student.studentStatusDisplayName ?? '-'}
          </span>
        </div>
      </div>

    </div>
  </div>
)}

      {student && examId && (
        <div className="app-card overflow-hidden border border-border bg-card">
          <div className="px-4 py-3 border-b border-border bg-card">
            <h3 className="app-card-title">Select Exam Fee Subjects</h3>
          </div>
          <div className="p-3">
          <div className="mt-2.5 flex items-center gap-5 text-[12px]">
            <label className="flex items-center gap-2">
              <input type="radio" checked={examType === 'Regular'} onChange={() => setExamType('Regular')} />
              Regular
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={examType === 'Supplementary'} onChange={() => setExamType('Supplementary')} />
              Supplementary
            </label>
          </div>
          <div className="mt-2.5 grid grid-cols-1 md:grid-cols-12 gap-2 items-end border p-3">
            <div className="md:col-span-4 space-y-1">
              <Label>Semester *</Label>
              <Select
                value={semesterId ? String(semesterId) : null}
                onChange={(v) => setSemesterId(v ? Number(v) : null)}
                options={semesters.map((s) => ({
                  value: String(pickNum(s, ['courseYearId', 'course_year_id', 'fk_course_year_id', 'fk_course_yearId', 'fromCourseYearId'])),
                  label: pickText(s, ['courseYearName', 'course_year_name']) || '-',
                }))}
                placeholder="Semester"
              />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Additional Fee *</Label>
              <Select
                value={feeTypeId ? String(feeTypeId) : null}
                onChange={(v) => setFeeTypeId(v ? Number(v) : null)}
                options={feeTypes.map((t) => ({
                  value: String(t.generalDetailId ?? t.addtExamFeeTypeCatId),
                  label: getFeeTypeLabel(t),
                }))}
                placeholder="Additional Fee"
              />
            </div>
            <div className="md:col-span-2">
              <Button
                type="button"
                className="h-8 text-[12px] w-full bg-[#0d376d] hover:bg-[#0b2f5d]"
                onClick={onAddFeeFromSelection}
                disabled={!feeTypeId}
              >
                Add Fee
              </Button>
            </div>
            <div className="md:col-span-3 border border-border">
              <div className="border-b border-border bg-card px-2 py-1 text-[12px] font-semibold text-[hsl(var(--primary))]">Additional Fee</div>
              <div className="flex items-center gap-3 px-2 py-2 text-[13px]">
                <span className="flex-1">
                  {getFeeTypeLabel(
                    feeTypes.find((t) => Number(t.generalDetailId ?? t.addtExamFeeTypeCatId) === Number(feeTypeId)),
                  )}
                </span>
                <Input
                  type="number"
                  className="h-8 text-[12px] w-24 text-right"
                  value={String(feePreviewAmount || 0)}
                  onChange={(e) => setFeePreviewAmount(Number(e.target.value || 0))}
                />
              </div>
            </div>
          </div>
          {inlineNotice && (
            <div className="mt-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
              {inlineNotice}
            </div>
          )}
          </div>
        </div>
      )}

      {addedFees.length > 0 && (
        <div className="app-card overflow-hidden border border-border bg-card">
          <div className="px-4 py-3 border-b border-border bg-card">
            <h3 className="app-card-title">Exam Fee Payment</h3>
          </div>
          <div className="overflow-auto p-2">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-1 text-left">SI No</th>
                  <th className="px-2 py-1 text-left">Semester</th>
                  <th className="px-2 py-1 text-left">Exam Type</th>
                  <th className="px-2 py-1 text-left">Additional Fee</th>
                  <th className="px-2 py-1 text-right">Add. Fee Amt(₹)</th>
                  <th className="px-2 py-1 text-right">Fee Amt (₹)</th>
                  <th className="px-2 py-1 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {addedFees.map((f, i) => (
                  <tr key={`afee-${i}`} className="border-b">
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">{f.courseYearName || semesterNameById.get(f.courseYearId) || `Semester ${f.courseYearId}`}</td>
                    <td className="px-2 py-1">{f.examType}</td>
                    <td className="px-2 py-1">{f.feeTypeName}</td>
                    <td className="px-2 py-1 text-right">
                      <input
                        className="h-8 w-20 rounded border px-2 text-right"
                        value={String(f.amount ?? 0)}
                        onChange={(e) => updateAmountAt(i, Number(e.target.value || 0))}
                      />
                    </td>
                    <td className="px-2 py-1 text-right">{f.amount}</td>
                    <td className="px-2 py-1 text-right">
                      <Button type="button" variant="ghost" className="h-7 px-2" onClick={() => removeRowAt(i)}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-card">
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2 app-card-title" colSpan={6}>Summary</td>
                </tr>
                <tr>
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2 font-semibold" colSpan={5}>Total Fees</td>
                  <td className="px-2 py-2 text-right font-semibold">{totalFees}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-2.5 border border-border bg-card p-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-3 space-y-1">
                <Label>Pay Mode *</Label>
                <Select
                  value={paymentMode ?? null}
                  onChange={(v) => setPaymentMode(v ?? '')}
                  options={[
                    { value: 'Cash', label: 'Cash' },
                    { value: 'Online', label: 'Online' },
                    { value: 'Cheque', label: 'Cheque' },
                    { value: 'DD', label: 'DD' },
                  ]}
                  placeholder="Pay Mode"
                />
              </div>
              <div className="md:col-span-3 space-y-1">
                <Label>Reference Number</Label>
                <Input className="h-8 text-[12px]" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Payment Date *</Label>
                <Input type="date" className="h-8 text-[12px]" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Fee Comments</Label>
                <Input className="h-8 text-[12px]" value={feeComments} onChange={(e) => setFeeComments(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <div className="text-right text-[11px] mb-1">Payment Amount</div>
                <div className="h-8 rounded border bg-card px-2 py-1 text-right text-[18px] font-semibold">{totalFees}</div>
              </div>
              <div className="md:col-span-12 flex justify-end">
                <Button
                  type="button"
                  className="h-8 text-[12px] bg-[#0d376d] hover:bg-[#0b2f5d]"
                  onClick={() => setPayConfirmOpen(true)}
                >
                  Pay fees
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="app-card overflow-auto bg-card border border-border">
          <h3 className="m-0 rounded border border-border bg-card px-3 py-2 app-card-title">
            Exam Fee Receipts
          </h3>
          <table className="w-full text-[12px]">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-2 py-1 text-left">SI.No</th>
                <th className="px-2 py-1 text-left">Course Year</th>
                <th className="px-2 py-1 text-left">Receipt No.</th>
                <th className="px-2 py-1 text-left">Payment Date</th>
                <th className="px-2 py-1 text-left">Payment Mode</th>
                <th className="px-2 py-1 text-left">Exam Type</th>
                <th className="px-2 py-1 text-right">Amount</th>
                <th className="px-2 py-1 text-right">Late Fee</th>
                <th className="px-2 py-1 text-right">Add. Fee Amt</th>
                <th className="px-2 py-1 text-right">Total Amt</th>
                <th className="px-2 py-1 text-left">Subjects</th>
                <th className="px-2 py-1 text-left">Additional Fees</th>
                <th className="px-2 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`fr-${i}`} className="border-t">
                  <td className="px-2 py-1">{i + 1}</td>
                  <td className="px-2 py-1">{r.courseYearName ?? r.course_year_name ?? r.courseYearCode ?? '-'}</td>
                  <td className="px-2 py-1">{r.feeReceiptNo ?? r.fee_receipt_no ?? '-'}</td>
                  <td className="px-2 py-1">{(r.receiptDate ?? r.receipt_date) ? new Date(r.receiptDate ?? r.receipt_date).toLocaleDateString() : '-'}</td>
                  <td className="px-2 py-1">{r.paymentModeCatDisplayName ?? r.payment_mode_cat_display_name ?? '-'}</td>
                  <td className="px-2 py-1">{r.examtypeCatDisplayName ?? r.examtype_cat_display_name ?? r.examType ?? '-'}</td>
                  <td className="px-2 py-1 text-right">{r.examFeeAmount ?? '-'}</td>
                  <td className="px-2 py-1 text-right">{r.examFineAmount ?? '-'}</td>
                  <td className="px-2 py-1 text-right">{r.examAddtFee ?? '-'}</td>
                  <td className="px-2 py-1 text-right">{r.examTotalAmount ?? '-'}</td>
                  <td className="px-2 py-1">
                    <button type="button" onClick={() => onViewSubjects(r)} className="text-slate-700 hover:text-blue-700">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                  <td className="px-2 py-1">
                    {(r.examAdditionalFeeReceiptDTOs ?? []).length > 0
                      ? (r.examAdditionalFeeReceiptDTOs ?? []).map((x: AnyRow, idx: number) => (
                          <div key={`af-${idx}`} className="text-blue-700">
                            {(x.addtExamFeeTypeName ?? x.addtFeeTypeName ?? 'Fee') + ' - ' + (x.addtFeeAmount ?? '-')}
                          </div>
                        ))
                      : '-'}
                  </td>
                  <td className="px-2 py-1">
                    <button type="button" onClick={() => openAddFee(r)} className="text-slate-700 hover:text-blue-700">
                      <PlusCircle className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={subjectsOpen} onOpenChange={setSubjectsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Subjects</DialogTitle></DialogHeader>
          <div className="overflow-auto border rounded">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1 text-left">SI.No</th>
                  <th className="px-2 py-1 text-left">Subject</th>
                  <th className="px-2 py-1 text-left">Type</th>
                  <th className="px-2 py-1 text-left">Credits</th>
                </tr>
              </thead>
              <tbody>
                {subjectsRows.map((s, i) => (
                  <tr key={`sub-${i}`} className="border-t">
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">{s.shortName ?? s.subjectName ?? '-'}</td>
                    <td className="px-2 py-1">{s.subjecttypeCode ?? s.subjectTypeCode ?? '-'}</td>
                    <td className="px-2 py-1">{s.credits ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Additional Exam Fee</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Additional Fee Type *</Label>
              <Select
                value={feeTypeId ? String(feeTypeId) : null}
                onChange={(v) => setFeeTypeId(v ? Number(v) : null)}
                options={feeTypes.map((t) => ({ value: String(t.generalDetailId ?? t.addtExamFeeTypeCatId), label: getFeeTypeLabel(t) }))}
                placeholder="Fee Type"
              />
            </div>
            <div className="space-y-1">
              <Label>Amount *</Label>
              <Input type="number" className="h-9 text-[12px]" value={feeAmount} onChange={(e) => setFeeAmount(Number(e.target.value || 0))} />
            </div>
            <div className="flex justify-end">
              <Button type="button" className="h-8 text-[12px]" onClick={saveAdditionalFee} disabled={!feeTypeId || !feeAmount}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={payConfirmOpen} onOpenChange={setPayConfirmOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Exam Fee Payment</DialogTitle>
          </DialogHeader>

          <div className="rounded border border-cyan-200 p-3 text-[12px] space-y-1">
            <div><span className="font-medium">Student :</span> {student?.firstName ?? student?.studentName ?? '-'} ({student?.rollNumber ?? student?.hallticketNumber ?? '-'})</div>
            <div><span className="font-medium">College :</span> {student?.collegeCode ?? '-'} / {student?.academicYear ?? '-'}</div>
            <div><span className="font-medium">Course :</span> {student?.courseName ?? '-'} / ({student?.groupCode ?? '-'})</div>
            <div>
              <span className="font-medium">Exam :</span>{' '}
              {pickText(selectedExamRow, ['exam_name', 'examName']) || '-'}
              {' '}
              ({toDateStr(pickText(selectedExamRow, ['fromDate', 'from_date']))} - {toDateStr(pickText(selectedExamRow, ['toDate', 'to_date']))})
            </div>
          </div>

          <div className="overflow-auto border rounded mt-2">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1 text-left">Sl.No.</th>
                  <th className="px-2 py-1 text-left">Course Year</th>
                  <th className="px-2 py-1 text-left">Exam Type</th>
                  <th className="px-2 py-1 text-right">Additional Amount</th>
                </tr>
              </thead>
              <tbody>
                {addedFees.map((f, i) => (
                  <tr key={`confirm-${i}`} className="border-t">
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">{f.courseYearName || semesterNameById.get(f.courseYearId) || `Semester ${f.courseYearId}`}</td>
                    <td className="px-2 py-1">{f.examType}</td>
                    <td className="px-2 py-1 text-right">{Number(f.amount || 0)}</td>
                  </tr>
                ))}
                <tr className="border-t font-semibold">
                  <td colSpan={3} className="px-2 py-1 text-right">Total Amount</td>
                  <td className="px-2 py-1 text-right">{totalFees}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="outline" onClick={() => setPayConfirmOpen(false)}>Close</Button>
            <Button type="button" onClick={onConfirmPayFees} disabled={paying}>
              {paying ? 'Paying...' : 'Pay'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
