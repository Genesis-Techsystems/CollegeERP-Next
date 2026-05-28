'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/common/components/select'
import { DatePicker } from '@/common/components/date-picker'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toastError, toastSuccess } from '@/lib/toast'
import { toast } from 'sonner'
import { NEXT_API } from '@/config/constants/api'
import {
  getExamMasterDetailsByGroup,
  getStudentAcademicBatches,
  getStudentExamFeeStructure,
  getStudentSubjectsForRegularExam,
  getStudentSubjectsForSupplyExam,
  listExamFeeReceipts,
  listExamFeeTypes,
  listExamMastersByCourse,
  listPaymentModes,
  listStudents,
  payExamFeeReceipts,
} from '@/services/pre-examination'
import { PageContainer } from '@/components/layout'

type AnyRow = Record<string, any>

/** State + always-current ref (Angular `this.x` parity for async chains). */
function useStateRef<T>(initial: T) {
  const [state, setState] = useState<T>(initial)
  const ref = useRef<T>(state)
  ref.current = state
  return [state, setState, ref] as const
}

const isEmptyObject = (o: AnyRow | null | undefined) => !o || Object.keys(o).length === 0

/** YYYY-MM-DD from a Date (local). */
function ymd(d: Date | null): string {
  if (!d) return ''
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
const dateOnly = (v: unknown): string => (v ? String(v).slice(0, 10) : '')

/** Display date "MMM d, y" (Angular date pipe). */
function fmtDate(v: unknown): string {
  const s = dateOnly(v)
  if (!s) return '-'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_CLASS: Record<string, string> = {
  DTND: 'text-red-600 font-bold',
  INCOLLEGE: 'text-green-700 font-bold',
  PASSEDOUT: 'text-[#461eb6] font-bold',
  DETAINRECOMMENDED: 'text-orange-600 font-bold',
  DISCONTINUED: 'text-red-600 font-bold',
}

export default function StudentExamFeeRegistrationPage() {
  // --- selection / lookups ---
  const [students, setStudents] = useState<AnyRow[]>([])
  const studentsRef = useRef<AnyRow[]>([])
  studentsRef.current = students
  const [studentId, setStudentId] = useState<number | null>(null)
  const [student, setStudent, studentRef] = useStateRef<AnyRow>({})
  const [examsList, setExamsList] = useState<AnyRow[]>([])
  const [examId, setExamId, examIdRef] = useStateRef<number | null>(null)
  const [flag, setFlag] = useState(false)
  const [photoError, setPhotoError] = useState(false)

  const [paymentModes, setPaymentModes] = useState<AnyRow[]>([])
  const [, setExamFeeTypes, examFeeTypesRef] = useStateRef<AnyRow[]>([])

  // --- course-year / subject flow ---
  const [, setAllCourseYears, allCourseYearsRef] = useStateRef<AnyRow[]>([])
  const [, setCourseYearsList, courseYearsListRef] = useStateRef<AnyRow[]>([])
  const [, setExamDetailsList, examDetailsListRef] = useStateRef<AnyRow[]>([])
  const [courseYears, setCourseYears] = useState<AnyRow[]>([])
  const [courseYearId, setCourseYearId, courseYearIdRef] = useStateRef<number | null>(null)
  const [checkExam, setCheckExam, checkExamRef] = useStateRef<1 | 2>(1)
  const studentCurrentCourseYearIdRef = useRef<number | null>(null)

  const [studentSubjects, setStudentSubjects, studentSubjectsRef] = useStateRef<AnyRow[]>([])
  const [checksubject, setChecksubject] = useState(true)
  const [searchText, setSearchText] = useState('')

  // --- fee structure + computed payment ---
  const [examFeeStructure, setExamFeeStructure, examFeeStructureRef] = useStateRef<AnyRow[]>([])
  const [courseYearFee, setCourseYearFee, courseYearFeeRef] = useStateRef<AnyRow[]>([])

  // --- payment form ---
  const [paymentModeCatId, setPaymentModeCatId] = useState<number | null>(131)
  const [chequeNo, setChequeNo] = useState('')
  const [ddno, setDdno] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [transactionNo, setTransactionNo] = useState('')
  const [otherPaymentNumber] = useState('')
  const [receiptDate, setReceiptDate] = useState<Date | null>(new Date())
  const [feeComments, setFeeComments] = useState('')
  const [paying, setPaying] = useState(false)

  // --- receipts ---
  const [feeReceipts, setFeeReceipts] = useState<AnyRow[]>([])
  const [coursesYearList, setCoursesYearList] = useState<AnyRow[]>([])

  // --- modals ---
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const payReceiptsRef = useRef<AnyRow[]>([])
  const [viewSubjOpen, setViewSubjOpen] = useState(false)
  const [viewSubjRows, setViewSubjRows] = useState<AnyRow[]>([])

  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  // Derived: selected subjects + count
  const selectedSubjects = useMemo(() => studentSubjects.filter((s) => s.isSelected), [studentSubjects])
  const selectedCount = selectedSubjects.length

  const filteredSubjects = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return studentSubjects
    return studentSubjects.filter((s) =>
      `${s.shortName ?? ''} ${s.subjectName ?? ''} ${s.subjectCode ?? ''}`.toLowerCase().includes(q),
    )
  }, [studentSubjects, searchText])

  const totalReceiptAmt = useMemo(
    () =>
      courseYearFee.reduce(
        (sum, cy) => sum + Number(cy.examFeeAmount || 0) + Number(cy.examFineAmount || 0) + Number(cy.examAddFee || 0),
        0,
      ),
    [courseYearFee],
  )

  const additionalStructures: AnyRow[] = examFeeStructure[0]?.examFeeAdditionalStructureDTOs ?? []

  // ============== INIT (Angular getGeneralDetails → paymentMode + examFeeType) ==============
  useEffect(() => {
    void (async () => {
      const [modes, types] = await Promise.all([listPaymentModes().catch(() => []), listExamFeeTypes().catch(() => [])])
      setPaymentModes(Array.isArray(modes) ? modes : [])
      setExamFeeTypes(Array.isArray(types) ? types : [])
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ============== STUDENT SEARCH ==============
  async function enteredStudent(term: string) {
    const q = (term ?? '').trim()
    if (q.length <= 4) return // Angular: event.length > 4
    const list = await listStudents(q).catch(() => [])
    setStudents(Array.isArray(list) ? list : [])
  }

  // ============== SELECT STUDENT ==============
  async function selectedStudent(sid: number) {
    setPhotoError(false)
    setCourseYearsList([])
    setAllCourseYears([])
    setFeeReceipts([])
    setCoursesYearList([])
    setSearchText('')
    setCourseYearFee([])
    setExamsList([])
    setExamId(null)
    setCourseYears([])
    setStudentSubjects([])
    setExamDetailsList([])
    setCourseYearId(null)
    setFlag(false)
    setExamFeeStructure([])

    const found = studentsRef.current.find((x) => Number(x.studentId) === sid)
    if (!found) return
    studentRef.current = found // fresh for the async chain below
    setStudent(found)
    studentCurrentCourseYearIdRef.current = Number(found.courseYearId)

    // Course years (StudentAcademicbatch by studentDetail.studentId), dedupe by fromCourseYearId
    const batches = await getStudentAcademicBatches(sid).catch(() => [])
    setAllCourseYears(Array.isArray(batches) ? batches : [])
    const byFrom = new Map<number, AnyRow>()
    for (const b of Array.isArray(batches) ? batches : []) byFrom.set(Number(b.fromCourseYearId), b)
    const cyList = [...byFrom.values()]
    courseYearsListRef.current = cyList // fresh for supplyCourseYears
    setCourseYearsList(cyList)

    // Exams for this student's course
    const exams = await listExamMastersByCourse(Number(found.courseId)).catch(() => [])
    setExamsList((Array.isArray(exams) ? exams : []).filter((e) => !e.isInternalExam))
  }

  // ============== SELECT EXAM ==============
  async function selectedExternalExam(eid: number) {
    setFlag(true)
    setFeeReceipts([])
    setCoursesYearList([])
    setSearchText('')
    setExamDetailsList([])
    setCourseYears([])
    setStudentSubjects([])
    const stu = studentRef.current
    await loadFeeStructure(Number(stu.courseYearId))
    await getExamDetails(1, eid)
    // Receipts for already-paid history
    await getExamFeeReceipts(Number(stu.studentId), eid)
  }

  // ============== EXAM DETAILS → COURSE YEARS ==============
  async function getExamDetails(type: 1 | 2, eid: number) {
    const stu = studentRef.current
    const list = await getExamMasterDetailsByGroup({
      examId: eid,
      courseGroupId: Number(stu.courseGroupId),
      regulationId: Number(stu.regulationId),
    }).catch(() => [])
    const details = Array.isArray(list) ? list : []
    examDetailsListRef.current = details
    setExamDetailsList(details)
    supplyCourseYears(type, details, stu, eid)
  }

  function supplyCourseYears(type: 1 | 2, examDetails: AnyRow[], stu: AnyRow, eid: number) {
    setStudentSubjects([])
    const cyList = courseYearsListRef.current
    if (!examDetails || examDetails.length === 0) {
      setCourseYears([])
      return
    }
    if (type === 1) {
      const reg = examDetails.filter((x) => x.examTypeCatCode === 'Regular')
      examDetailsListRef.current = reg
      setExamDetailsList(reg)
      let cys = cyList.filter((x) => Number(x.fromCourseYearId) === Number(stu.courseYearId))
      cys = cys.filter((cy) => reg.some((ed) => Number(ed.courseYearId) === Number(cy.courseYearId)))
      setCourseYears(cys)
      if (cys.length > 0) {
        setCourseYearId(Number(cys[0].fromCourseYearId))
        void getStudentSubjects(Number(stu.courseYearId), 1, eid)
      } else {
        toast.info('No Course Years in Exam Details')
      }
    } else {
      const sup = examDetails.filter((x) => x.examTypeCatCode === 'Supple')
      examDetailsListRef.current = sup
      setExamDetailsList(sup)
      let cys = cyList.filter((x) => Number(x.fromCourseYearId) !== Number(stu.courseYearId))
      cys = cys.filter((cy) => sup.some((ed) => Number(ed.courseYearId) === Number(cy.courseYearId)))
      setCourseYears(cys)
      setCourseYearId(null)
      if (cys.length === 0) toast.info('No Course Years in Exam Details')
    }
  }

  function onChangeCheckExam(value: 1 | 2) {
    checkExamRef.current = value // keep ref fresh for loadFeeStructure's exam-type filter
    setCheckExam(value)
    clearOnExamTypeChange()
    void getExamDetails(value, Number(examIdRef.current))
  }

  function clearOnExamTypeChange() {
    setCourseYearFee([])
    setStudentSubjects([])
    setExamFeeStructure([])
    setCourseYearId(null)
  }

  // ============== FEE STRUCTURE ==============
  async function loadFeeStructure(cyId: number) {
    const stu = studentRef.current
    if (!stu?.collegeId || !examIdRef.current || !cyId) {
      setExamFeeStructure([])
      return
    }
    const s = await getStudentExamFeeStructure({
      collegeId: Number(stu.collegeId),
      examId: Number(examIdRef.current),
      courseGroupId: Number(stu.courseGroupId),
      courseYearId: cyId,
    }).catch(() => null)
    if (!s) {
      setExamFeeStructure([])
      return
    }
    // Angular: split additional structures, re-filter by exam type code, set ids + isDisable.
    const code = checkExamRef.current === 1 ? 'Regular' : 'Supple'
    const all: AnyRow[] = Array.isArray(s.examFeeAdditionalStructureDTOs) ? s.examFeeAdditionalStructureDTOs : []
    const filtered = all
      .filter((a) => a.examTypeCatDisplayCode === code)
      .map((a) => ({ ...a, examFeeStructureId: s.examFeeStructureId, isDisable: Number(a.fee) > 0 }))
    setExamFeeStructure([{ ...s, examFeeAdditionalStructures: all, examFeeAdditionalStructureDTOs: filtered }])
  }

  // ============== SUBJECTS ==============
  function getRelevantExamSubjects(cyId: number) {
    if (cyId == null) return
    if (cyId === Number(studentRef.current.courseYearId)) void getStudentSubjects(cyId, checkExamRef.current, Number(examIdRef.current))
    else void getExamCourseYearSubjects(cyId, Number(examIdRef.current))
  }

  function normalizeRegular(rows: AnyRow[], cyId: number): AnyRow[] {
    return rows.map((r) => ({
      ...r,
      subjectId: Number(r.subjectId ?? r.fk_subject_id ?? 0),
      courseYearId: cyId,
      examType: 'Regular',
      isSelected: true,
      checked: true,
      shortName: r.shortName && String(r.shortName).trim() !== '' ? r.shortName : r.subjectCode,
      Subject_name: r.subjectName,
      Subject_code: r.subjectCode,
      credits: r.subCredits,
    }))
  }
  function normalizeSupply(rows: AnyRow[], cyId: number): AnyRow[] {
    return rows.map((r) => ({
      ...r,
      subjectId: Number(r.subjectId ?? r.fk_subject_id ?? 0),
      courseYearId: cyId,
      examType: 'Supple',
      isSelected: true,
      checked: true,
      shortName: r.shortName && String(r.shortName).trim() !== '' ? r.shortName : r.subjectCode,
      Subject_name: r.subjectName,
      Subject_code: r.subjectCode,
      subjectTypeCode: r.subjecttypeName,
      credits: r.subjectCredits,
    }))
  }

  function applyBridgeFilterAndSort(rows: AnyRow[], cyId: number): AnyRow[] {
    let list = rows
    const match = examDetailsListRef.current.find((e) => Number(e.courseYearId) === Number(cyId))
    if (match && match.isBridgeCourse !== undefined) {
      list = list.filter((s) => s.isBridgeCourse === match.isBridgeCourse)
    }
    return [...list].sort((a, b) =>
      a.subjAlreadyRegistered === b.subjAlreadyRegistered ? 0 : a.subjAlreadyRegistered ? 1 : -1,
    )
  }

  async function getStudentSubjects(cyId: number, checkExamVal: 1 | 2, eid: number) {
    setExamFeeStructure([])
    const stu = studentRef.current
    if (eid != null) await loadFeeStructure(cyId)
    let rows: AnyRow[] = []
    if (Number(stu.courseYearId) === Number(cyId)) {
      const stdAcademicYearId = stu.academicYearId
      rows = await getStudentSubjectsForRegularExam({
        collegeId: Number(stu.collegeId),
        academicYearId: Number(stdAcademicYearId),
        studentId: Number(stu.studentId),
        courseYearId: cyId,
        examId: eid,
      })
      rows = normalizeRegular(rows, cyId)
    } else {
      rows = await getStudentSubjectsForSupplyExam({
        collegeId: Number(stu.collegeId),
        courseYearId: cyId,
        studentId: Number(stu.studentId),
        examId: eid,
      })
      rows = normalizeSupply(rows, cyId)
    }
    setStudentSubjects(applyBridgeFilterAndSort(rows, cyId))
    markAll(true)
  }

  // Supple quick-link: only FAIL/ABSENT supply subjects.
  async function getExamCourseYearSubjects(cyId: number, eid: number) {
    const stu = studentRef.current
    await loadFeeStructure(cyId)
    let rows = await getStudentSubjectsForSupplyExam({
      collegeId: Number(stu.collegeId),
      courseYearId: cyId,
      studentId: Number(stu.studentId),
      examId: eid,
    })
    rows = rows.filter((r) => r.examresultCatCode === 'FAIL' || r.examresultCatCode === 'ABSENT')
    rows = normalizeSupply(rows, cyId).map((r) => ({ ...r, credits: r.creditPoints ?? r.credits }))
    setStudentSubjects(applyBridgeFilterAndSort(rows, cyId))
    markAll(true)
  }

  // ============== CHECK / MARK ALL ==============
  function markAll(checkAllValue?: boolean) {
    const all = checkAllValue ?? checksubject
    setStudentSubjects((prev) =>
      prev.map((s) => {
        if (!all) return { ...s, checked: false, isSelected: false }
        if (!s.subjAlreadyRegistered) return { ...s, checked: true, isSelected: true }
        return { ...s, checked: false, isSelected: false }
      }),
    )
    // keep courseYearFee in sync if already built
    if (courseYearFeeRef.current.length > 0) setTimeout(() => rebuildCourseYearFee(), 0)
  }

  function checkedSubjects(check: boolean, item: AnyRow) {
    setStudentSubjects((prev) =>
      prev.map((s) => (s.subjectId === item.subjectId && s.courseYearId === item.courseYearId ? { ...s, checked: check, isSelected: check } : s)),
    )
    if (!check && courseYearFeeRef.current.length > 0) setTimeout(() => rebuildCourseYearFee(), 0)
  }

  function onToggleSelectAll(v: boolean) {
    setChecksubject(v)
    markAll(v)
  }

  // ============== FEE CALC ==============
  function fineCheck(fineList: AnyRow[]): AnyRow {
    const today = ymd(new Date())
    for (const f of fineList || []) {
      const from = dateOnly(f.fineFromDate)
      const to = dateOnly(f.fineToDate)
      if (from && to && today >= from && today <= to) return f
    }
    return {}
  }
  function getSupplyFeeAmount(count: number, s: AnyRow): number {
    if (count === 1) return Number(s.subject1Fee || 0)
    if (count === 2) return Number(s.subject2Fee || 0)
    if (count === 3) return Number(s.subject3Fee || 0)
    if (count === 4) return Number(s.subject4Fee || 0)
    if (count === 5) return Number(s.subject5Fee || s.supplyFee || 0)
    if (count === 6) return Number(s.subject6Fee || s.supplyFee || 0)
    if (count >= 7) return Number(s.supplyFee || 0)
    return 0
  }

  // Angular addExamSubjects(): build courseYearFee grouped by courseYearId.
  function buildCourseYearFee(): AnyRow[] {
    const s = examFeeStructureRef.current[0]
    if (!s) return []
    const checked = studentSubjectsRef.current.filter((x) => x.checked)
    if (checked.length === 0) return []

    let addF = 0
    for (const a of s.examFeeAdditionalStructureDTOs ?? []) if (a.applyToAll) addF += Number(a.fee || 0)

    const fineObj = (s.examFeeFineDTOs?.length ?? 0) > 0 ? fineCheck(s.examFeeFineDTOs) : {}
    const noFine = isEmptyObject(fineObj)
    const result: AnyRow[] = []
    const currentCY = studentCurrentCourseYearIdRef.current

    for (const sub of checked) {
      const cyId = Number(sub.courseYearId)
      let existing = result.find((x) => x.courseYearId === cyId)
      const isRegular = Number(currentCY) === cyId
      const examFeeAmount = isRegular ? Number(s.regFee || 0) : getSupplyFeeAmount(checked.length, s)
      const fineAmount = noFine ? 0 : Number((isRegular ? fineObj.regFeeFine : fineObj.supplyFeeFine) || 0)
      if (!existing) {
        result.push({
          collegeCode: sub.collegeCode ?? studentRef.current.collegeCode,
          courseYearId: cyId,
          courseName: sub.courseName ?? studentRef.current.courseName,
          courseYearName: sub.courseYearName ?? studentRef.current.courseYearName,
          examType: sub.examType,
          examFeeAmount,
          examFineAmount: fineAmount,
          examAddFee: addF,
          academicYear: sub.academicYear ?? studentRef.current.academicYear,
          examFeeStructureId: s.examFeeStructureId,
          examAdditionalFeeReceiptDTOs: s.examFeeAdditionalStructureDTOs ?? [],
          subjects: [sub],
        })
      } else if (!existing.subjects.some((x: AnyRow) => x.subjectId === sub.subjectId)) {
        existing.subjects.push(sub)
      }
    }
    return result
  }

  function addExamSubjects() {
    if (examFeeStructureRef.current.length === 0) {
      toast.info('No Exam Fee Structure for this branch and Year.')
      return
    }
    setCourseYearFee(buildCourseYearFee())
  }
  function rebuildCourseYearFee() {
    setCourseYearFee(buildCourseYearFee())
  }

  function updateAdditionalFee(idx: number, val: number) {
    setExamFeeStructure((prev) => {
      if (prev.length === 0) return prev
      const structure = { ...prev[0] }
      const list = [...(structure.examFeeAdditionalStructureDTOs ?? [])]
      list[idx] = { ...list[idx], fee: val }
      structure.examFeeAdditionalStructureDTOs = list
      return [structure]
    })
  }
  function updateLateFee(idx: number, val: number) {
    setCourseYearFee((prev) => prev.map((cy, i) => (i === idx ? { ...cy, examFineAmount: val } : cy)))
  }

  // ============== RECEIPTS ==============
  async function getExamFeeReceipts(sid: number, eid: number) {
    const list = await listExamFeeReceipts({ studentId: sid, examId: eid }).catch(() => [])
    const receipts = Array.isArray(list) ? list : []
    setFeeReceipts(receipts)
    // dedupe by courseYearId (one receipts-block per course-year)
    const byCY = new Map<number, AnyRow>()
    for (const r of receipts) if (!byCY.has(Number(r.courseYearId))) byCY.set(Number(r.courseYearId), r)
    setCoursesYearList([...byCY.values()])
  }

  // ============== PAY ==============
  function payExamFees() {
    if (courseYearFeeRef.current.length === 0) return
    if (!paymentModeCatId) {
      toastError('Select a payment mode.')
      return
    }
    if (!receiptDate) {
      toastError('Select the payment date.')
      return
    }
    const stu = studentRef.current
    const rdate = ymd(receiptDate)
    const examRow = examsList.find((e) => Number(e.examId) === Number(examIdRef.current))
    const examName = examRow?.examName ?? ''
    const examFromDate = dateOnly(examRow?.fromDate)
    const examToDate = dateOnly(examRow?.toDate)

    const receipts = courseYearFeeRef.current.map((cy) => {
      const ft = examFeeTypesRef.current.find((x) => String(x.generalDetailCode) === String(cy.examType))
      const examtypeCatId = ft ? Number(ft.generalDetailId) : null
      let addFeeAmt = 0
      const addTFee: AnyRow[] = []
      for (const a of cy.examAdditionalFeeReceiptDTOs || []) {
        if (Number(a.fee) > 0) {
          if (a.applyToAll === true) addFeeAmt += Number(a.fee)
          else addFeeAmt = 0
          addTFee.push({
            ...a,
            collegeId: Number(stu.collegeId),
            addtFeeAmount: a.fee,
            isActive: true,
            addtExamFeeTypeCatId: a.adtExamfeetypeCatId,
            collectedEmpId: employeeId,
            addtReceiptDate: rdate,
          })
        }
      }
      const examFeeAmount = Number(cy.examFeeAmount || 0)
      const examFineAmount = Number(cy.examFineAmount || 0)
      return {
        chequeNo,
        ddno,
        examFeeAmount,
        examFineAmount,
        examAddtFee: addFeeAmt,
        examTotalAmount: examFeeAmount + examFineAmount + addFeeAmt,
        collegeCode: cy.collegeCode,
        examName,
        courseName: cy.courseName,
        courseYearName: cy.courseYearName,
        examType: cy.examType,
        examFromDate,
        examToDate,
        courseGroupName: stu.groupCode,
        academicYear: cy.academicYear,
        studentName: stu.firstName,
        rollno: stu.hallticketNumber,
        feeComments,
        employeeId,
        collegeId: Number(stu.collegeId),
        courseYearId: cy.courseYearId,
        examFeeFineId: null,
        examFeeStructureId: cy.examFeeStructureId,
        examId: Number(examIdRef.current),
        examtypeCatId,
        paymentModeCatId,
        studentId: Number(stu.studentId),
        isActive: true,
        otherPaymentNumber,
        receiptDate: rdate,
        referenceNumber,
        transactionNo,
        examAdditionalFeeReceiptDTOs: addTFee,
        examStudentDTOs: [
          {
            feeComments,
            collegeId: Number(stu.collegeId),
            courseYearId: cy.courseYearId,
            examFeeAmount,
            examtypeCatId,
            regulationId: Number(stu.regulationId),
            studentId: Number(stu.studentId),
            isActive: true,
            isFeePaid: true,
            registrationDate: rdate,
            examId: Number(examIdRef.current),
            examStudentDetailDTOs: cy.subjects,
          },
        ],
      }
    })
    payReceiptsRef.current = receipts
    setPayDialogOpen(true)
  }

  async function confirmPay() {
    setPaying(true)
    try {
      await payExamFeeReceipts(payReceiptsRef.current)
      toastSuccess('Exam fee paid successfully.')
      setPayDialogOpen(false)
      clearAfterPay()
      await getExamFeeReceipts(Number(studentRef.current.studentId), Number(examIdRef.current))
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to pay exam fees.')
    } finally {
      setPaying(false)
    }
  }

  function clearAfterPay() {
    setCourseYearFee([])
    setStudentSubjects([])
    setExamFeeStructure([])
    setCourseYearId(null)
    setChequeNo('')
    setReferenceNumber('')
    setTransactionNo('')
    setDdno('')
    setFeeComments('')
  }

  // ============== VIEW SUBJECTS MODAL ==============
  function viewCourseYearSubjects(row: AnyRow, mode: 'receipt' | 'noReceipt') {
    const subs = mode === 'receipt' ? row.examStudentDTOs?.[0]?.examStudentDetailDTOs ?? [] : row.subjects ?? []
    setViewSubjRows(Array.isArray(subs) ? subs : [])
    setViewSubjOpen(true)
  }

  // ============== PRINT ==============
  function printReceipt(row: AnyRow) {
    const id = row?.examFeeReceiptId
    if (!id) return
    window.open(NEXT_API.PROXY(`studentExamFeeReceiptDownload?examFeeReceiptId=${id}`), '_blank')
  }

  return (
    <PageContainer className="space-y-3">
      {/* breadcrumb */}
      <div className="text-[13px] text-muted-foreground">
        Examination Management <span className="mx-1">›</span> Pre Examination <span className="mx-1">›</span>
        <span className="text-foreground"> Examination Fee Collection</span>
      </div>

      <div className="rounded border bg-white shadow-sm">
        {/* sub-header */}
        <div className="flex items-center gap-2 border-b bg-[#eaf2ff] px-4 py-2">
          <span className="material-icons text-[18px]">💰</span>
          <span className="text-[14px] font-semibold">Exam Fee Collection</span>
        </div>

        <div className="p-4 space-y-3">
          {/* Student + Exam */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5">
              <Select
                value={studentId ? String(studentId) : null}
                onChange={(v) => {
                  const sid = v ? Number(v) : 0
                  setStudentId(sid)
                  void selectedStudent(sid)
                }}
                options={students.map((s) => ({
                  value: String(s.studentId),
                  label: `${s.hallticketNumber ?? '-'} - ${s.firstName ?? '-'}${s.studentStatusDisplayName ? ` (${s.studentStatusDisplayName})` : ''}`,
                }))}
                placeholder="Student"
                label="Student"
                searchable
                onSearch={enteredStudent}
              />
            </div>
            <div className="md:col-span-7">
              <Select
                value={examId ? String(examId) : null}
                onChange={(v) => {
                  const eid = v ? Number(v) : 0
                  examIdRef.current = eid // keep ref fresh for the async chain (state updates next render)
                  setExamId(eid)
                  if (eid) void selectedExternalExam(eid)
                }}
                options={examsList.map((e) => ({
                  value: String(e.examId),
                  label: `${e.examName} (${fmtDate(e.fromDate)} - ${fmtDate(e.toDate)})${e.isRegularExam ? ' (Regular)' : ''}${e.isSupplyExam ? ' (Supple)' : ''}`,
                }))}
                placeholder="Exam"
                label="Exam"
                searchable
              />
            </div>
          </div>

          {/* Student banner */}
          {!isEmptyObject(student) && flag && (
            <div className="rounded border-4 border-[#c3d9ff] p-3">
              <div className="flex gap-4">
                <div className="w-[120px] shrink-0">
                  {student.studentPhotoPath && !photoError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={student.studentPhotoPath}
                      alt="student"
                      className="w-full bg-[#c3d9ff] p-1.5"
                      style={{ maxHeight: 110 }}
                      onError={() => setPhotoError(true)}
                    />
                  ) : (
                    <div
                      className="flex w-full items-center justify-center bg-[#c3d9ff] p-1.5 text-[28px] font-semibold text-white"
                      style={{ height: 110 }}
                    >
                      {String(student.firstName ?? '?').trim().charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-[13px] leading-5">
                  <p className="font-medium">
                    {student.firstName} (<span className="text-blue-600">{student.isLateral ? 'LATERAL' : 'REGULAR'}</span>)
                  </p>
                  <p className="text-[#8c8c8c]">{student.hallticketNumber}</p>
                  <p className="text-[#8c8c8c]">
                    {student.collegeCode} / {student.academicYear} / {student.courseCode} / {student.groupCode} /{' '}
                    {student.courseYearName} / Section {student.section}
                  </p>
                  <p className="text-[#8c8c8c]">{student.mobile}</p>
                </div>
                <div className="text-[14px]">
                  <div className="py-1">
                    Quota : <span className="text-blue-600">{student.quotaDisplayName}</span>
                  </div>
                  <div className="py-1">
                    Student Status :{' '}
                    <span className={STATUS_CLASS[String(student.studentStatusCode)] ?? 'text-green-700 font-medium'}>
                      {student.studentStatusDisplayName}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Select Exam Fee Courses */}
          {studentId && flag && (
            <div className="rounded border-2 border-[#89c5ff] p-2.5">
              <h2 className="mb-2 rounded bg-[#c3d9ff] px-3 py-1.5 text-[15px] font-medium">Select Exam Fee Courses</h2>

              <div className="bg-white px-2 py-2">
                <div className="flex items-center gap-8 text-[13px]">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="checkExam" checked={checkExam === 1} onChange={() => onChangeCheckExam(1)} />
                    Regular
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="checkExam" checked={checkExam === 2} onChange={() => onChangeCheckExam(2)} />
                    Supplementary
                  </label>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-1 md:grid-cols-12 gap-2">
                {/* Semester */}
                {courseYears.length > 0 && (
                  <div className="md:col-span-2 bg-white p-2">
                    <Select
                      value={courseYearId ? String(courseYearId) : null}
                      onChange={(v) => {
                        const id = v ? Number(v) : null
                        setCourseYearId(id)
                        if (id) getRelevantExamSubjects(id)
                      }}
                      options={courseYears.map((o) => ({
                        value: String(o.fromCourseYearId),
                        label: o.fromCourseYearName ?? `Sem ${o.fromCourseYearId}`,
                      }))}
                      placeholder="Semester"
                      label="Semester"
                    />
                    {courseYearId && checkExam === 2 && (
                      <div className="mt-2 flex gap-4">
                        <span
                          className="cursor-pointer text-[13px] text-blue-600 underline"
                          onClick={() => void getStudentSubjects(Number(courseYearId), 2, Number(examIdRef.current))}
                        >
                          All
                        </span>
                        <span
                          className="cursor-pointer text-[13px] text-blue-600 underline"
                          onClick={() => getRelevantExamSubjects(Number(courseYearId))}
                        >
                          Supple
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Subjects table */}
                {studentSubjects.length > 0 && (
                  <div className="md:col-span-3 border border-[#dedede] bg-white">
                    <div className="flex items-center justify-between gap-2 p-1.5">
                      <div className="relative flex-1">
                        <Input
                          className="h-7 pl-7 text-[12px]"
                          placeholder="Search..."
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                        />
                        <span className="material-icons absolute left-2 top-1.5 text-[14px] text-muted-foreground">🔍</span>
                      </div>
                      <span className="text-[13px] font-medium text-blue-600">Courses: {selectedCount}</span>
                    </div>
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="bg-[#C3D9FF]">
                          <th className="w-[40px] px-1 py-1 text-left">
                            <input
                              type="checkbox"
                              checked={checksubject}
                              onChange={(e) => onToggleSelectAll(e.target.checked)}
                            />
                            <span className="ml-1">All</span>
                          </th>
                          <th className="px-1 py-1 text-left">Subjects</th>
                        </tr>
                      </thead>
                      <tbody className="block max-h-[150px] overflow-y-auto">
                        {filteredSubjects.map((obj, i) => (
                          <tr
                            key={`sub-${obj.subjectId || i}`}
                            className={`flex w-full ${obj.subjAlreadyRegistered ? 'bg-[#f2f0f0]' : ''}`}
                          >
                            <td className="w-[40px] px-1 py-1 text-center">
                              <input
                                type="checkbox"
                                disabled={obj.subjAlreadyRegistered}
                                checked={!!obj.checked}
                                onChange={() => !obj.subjAlreadyRegistered && checkedSubjects(!obj.checked, obj)}
                              />
                            </td>
                            <td className="flex-1 px-1 py-1">
                              {obj.shortName}
                              {obj.subjectCode != null && (
                                <>
                                  {' '}- <span className="text-blue-600">{obj.subjectCode}</span>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Selected Courses */}
                {selectedSubjects.length > 0 && (
                  <div className="md:col-span-3 border border-[#dedede] bg-white">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="bg-[#C3D9FF]">
                          <th className="px-1 py-1 text-left text-blue-700">Selected Courses : {selectedCount}</th>
                        </tr>
                      </thead>
                      <tbody className="block max-h-[150px] overflow-y-auto">
                        {selectedSubjects.map((sub, i) => (
                          <tr key={`sel-${i}`} className="flex w-full">
                            <td className="flex-1 px-1 py-1">
                              {sub.shortName}
                              {sub.subjectCode != null && (
                                <>
                                  {' '}- <span className="text-blue-600">{sub.subjectCode}</span>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Additional Fee */}
                {examFeeStructure.length > 0 && additionalStructures.length > 0 && (
                  <div className="md:col-span-3 border border-[#dedede] bg-white">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="bg-[#C3D9FF]">
                          <th className="px-1 py-1 text-left">Additional Fee</th>
                        </tr>
                      </thead>
                      <tbody className="block max-h-[150px] overflow-y-auto">
                        {additionalStructures.map((addFeeStr, i) =>
                          addFeeStr.applyToAll === true ? (
                            <tr key={`addl-${i}`} className="flex w-full items-center">
                              <td className="flex flex-1 items-center justify-between gap-2 px-1 py-1">
                                <span>{addFeeStr.adtExamfeetypeCatDisplayName}</span>
                                <Input
                                  type="number"
                                  className="h-7 w-20 border-2 border-[#c4c4c4] text-right text-[12px]"
                                  value={String(addFeeStr.fee ?? 0)}
                                  onChange={(e) => updateAdditionalFee(i, Number(e.target.value || 0))}
                                />
                              </td>
                            </tr>
                          ) : null,
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Add Fee */}
                {studentSubjects.length > 0 && (
                  <div className="md:col-span-1 flex items-end">
                    <Button className="h-8 w-full text-[12px]" onClick={addExamSubjects}>
                      Add Fee
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Exam Fee Payment summary */}
          {studentId && courseYearFee.length > 0 && (
            <div className="mx-1">
              <h2 className="mb-1 rounded bg-[#c3d9ff] px-3 py-1.5 text-[15px] font-medium">Exam Fee Payment</h2>
              <div className="rounded bg-[#C3D9FF] p-1">
                <table className="w-full bg-white text-[13px]">
                  <thead>
                    <tr className="bg-white">
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-left">SI No</th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-left">Semester</th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-right">Exam Type</th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-right">No of Subjects</th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-right">LateFee</th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-right">Add. Fee Amt(₹)</th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-right">Fee Amt (₹)</th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseYearFee.map((cy, i) => (
                      <tr key={`cy-${i}`} className={i % 2 ? 'bg-[#f1f6ff]' : 'bg-white'}>
                        <td className="px-2 py-1">{i + 1}</td>
                        <td className="px-2 py-1">{cy.courseYearName}</td>
                        <td className="px-2 py-1 text-right">{cy.examType}</td>
                        <td className="px-2 py-1 text-right">{cy.subjects.length}</td>
                        <td className="px-2 py-1 text-right">
                          <Input
                            type="number"
                            className="ml-auto h-7 w-24 text-right text-[12px]"
                            value={String(cy.examFineAmount ?? 0)}
                            onChange={(e) => updateLateFee(i, Number(e.target.value || 0))}
                          />
                        </td>
                        <td className="px-2 py-1 text-right">{cy.examAddFee}</td>
                        <td className="px-2 py-1 text-right">{cy.examFeeAmount}</td>
                        <td className="px-2 py-1 text-center">
                          <button
                            className="text-[#9E9E9E]"
                            title="View Courses"
                            onClick={() => viewCourseYearSubjects(cy, 'noReceipt')}
                          >
                            👁
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-transparent">
                      <td />
                      <td colSpan={7} className="px-2 py-1 text-[15px] font-bold text-blue-700">
                        Summary
                      </td>
                    </tr>
                    <tr>
                      <td />
                      <td colSpan={6} className="px-2 py-1 font-bold">
                        Total Fees
                      </td>
                      <td className="px-2 py-1 text-right font-bold">{totalReceiptAmt}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payment section */}
          {courseYearFee.length > 0 && (
            <div className="mx-1 rounded border-[10px] border-[#c3d9ff] bg-[#f1f6ff] p-2">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-full sm:w-56">
                  <Select
                    value={paymentModeCatId ? String(paymentModeCatId) : null}
                    onChange={(v) => setPaymentModeCatId(v ? Number(v) : null)}
                    options={paymentModes.map((m) => ({
                      value: String(m.generalDetailId),
                      label: m.generalDetailDisplayName ?? m.generalDetailName ?? '-',
                    }))}
                    placeholder="Pay Mode"
                    label="Pay Mode"
                  />
                </div>
                {paymentModeCatId === 133 && (
                  <div className="w-full sm:w-56">
                    <label className="text-[12px] text-muted-foreground">Cheque Number</label>
                    <Input className="h-8 text-[12px]" value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} />
                  </div>
                )}
                {paymentModeCatId === 134 && (
                  <div className="w-full sm:w-56">
                    <label className="text-[12px] text-muted-foreground">DD Number</label>
                    <Input className="h-8 text-[12px]" value={ddno} onChange={(e) => setDdno(e.target.value)} />
                  </div>
                )}
                {paymentModeCatId === 131 && (
                  <div className="w-full sm:w-56">
                    <label className="text-[12px] text-muted-foreground">Reference Number</label>
                    <Input className="h-8 text-[12px]" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
                  </div>
                )}
                {(paymentModeCatId === 135 || paymentModeCatId === 132) && (
                  <div className="w-full sm:w-56">
                    <label className="text-[12px] text-muted-foreground">Transaction Number</label>
                    <Input className="h-8 text-[12px]" value={transactionNo} onChange={(e) => setTransactionNo(e.target.value)} />
                  </div>
                )}
                <div className="ml-auto text-right">
                  <label className="block text-[14px] font-medium">Payment Amount</label>
                  <Input
                    type="number"
                    disabled
                    readOnly
                    className="h-9 w-40 text-right text-[18px] font-bold"
                    value={String(totalReceiptAmt)}
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="w-full sm:w-56">
                  <label className="text-[12px] text-muted-foreground">Payment Date *</label>
                  <DatePicker value={receiptDate} onChange={setReceiptDate} placeholder="Payment Date" />
                </div>
                <div className="min-w-[200px] flex-1">
                  <label className="text-[12px] text-muted-foreground">Fee Comments</label>
                  <Input className="h-8 text-[12px]" value={feeComments} onChange={(e) => setFeeComments(e.target.value)} />
                </div>
                <div className="w-full sm:w-40">
                  <Button className="h-9 w-full text-[12px]" onClick={payExamFees} disabled={paying}>
                    Pay fees
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Exam Fee Receipts (one block per course-year) */}
          {coursesYearList.map((cyl, idx) => (
            <div key={`cyl-${idx}`} className="mx-1">
              <h2 className="mb-1 flex items-center justify-between rounded bg-[#c3d9ff] px-3 py-1.5 text-[15px] font-medium">
                <span>Exam Fee Receipts</span>
                <button
                  className="rounded bg-[#ffcf46] px-2 py-1 text-[12px]"
                  onClick={() => printReceipt(cyl)}
                  title="Print Exam Form"
                >
                  🖨 Exam Form
                </button>
              </h2>
              <div className="rounded bg-[#C3D9FF] p-1">
                <table className="w-full bg-white text-[12px]">
                  <thead>
                    <tr className="bg-white">
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-left">SI No.</th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-left">Semester</th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-left">Receipt No.</th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-left">Payment Date</th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-left">Payment Mode</th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-left">Exam Type</th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-right">Exam Fee (₹)</th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-right">Add. Fee (₹)</th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-right">LateFee(₹)</th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-right">Amount (₹)</th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-left">Subjects</th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeReceipts
                      .filter((r) => Number(r.courseYearId) === Number(cyl.courseYearId))
                      .map((r, i) => (
                        <tr key={`rcpt-${i}`} className={i % 2 ? 'bg-[#f1f6ff]' : 'bg-white'}>
                          <td className="px-2 py-1">{i + 1}</td>
                          <td className="px-2 py-1">{r.courseYearName}</td>
                          <td className="px-2 py-1">{r.feeReceiptNo}</td>
                          <td className="px-2 py-1">{fmtDate(r.receiptDate)}</td>
                          <td className="px-2 py-1">{r.paymentModeCatDisplayName}</td>
                          <td className="px-2 py-1">{r.examtypeCatDisplayName}</td>
                          <td className="px-2 py-1 text-right">{r.examFeeAmount ?? '-'}</td>
                          <td className="px-2 py-1 text-right">{r.examAddtFee ?? '-'}</td>
                          <td className="px-2 py-1 text-right">{r.examFineAmount ?? '-'}</td>
                          <td className="px-2 py-1 text-right">{r.examTotalAmount}</td>
                          <td className="px-2 py-1">
                            <button
                              className="rounded bg-[#ffcf46] px-2 py-1"
                              onClick={() => viewCourseYearSubjects(r, 'receipt')}
                            >
                              Courses
                            </button>
                          </td>
                          <td className="px-2 py-1 text-center">
                            <button title="Print Receipt" onClick={() => printReceipt(r)}>
                              🖨
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pay confirmation modal (ExamFeePayDialog) */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Exam Fee Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-[13px]">
            <div>
              <span className="text-muted-foreground">Student: </span>
              {student.firstName} ({student.hallticketNumber})
            </div>
            <div className="overflow-auto rounded border">
              <table className="w-full text-[12px]">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-2 py-1 text-left">Semester</th>
                    <th className="px-2 py-1 text-left">Exam Type</th>
                    <th className="px-2 py-1 text-right">Exam Fee</th>
                    <th className="px-2 py-1 text-right">Add. Fee</th>
                    <th className="px-2 py-1 text-right">LateFee</th>
                    <th className="px-2 py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {payReceiptsRef.current.map((r, i) => (
                    <tr key={`pr-${i}`} className="border-t">
                      <td className="px-2 py-1">{r.courseYearName}</td>
                      <td className="px-2 py-1">{r.examType}</td>
                      <td className="px-2 py-1 text-right">{r.examFeeAmount}</td>
                      <td className="px-2 py-1 text-right">{r.examAddtFee}</td>
                      <td className="px-2 py-1 text-right">{r.examFineAmount}</td>
                      <td className="px-2 py-1 text-right font-semibold">{r.examTotalAmount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-right text-[15px] font-bold">Total: ₹ {totalReceiptAmt}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)} disabled={paying}>
              Cancel
            </Button>
            <Button onClick={confirmPay} disabled={paying}>
              {paying ? 'Paying…' : 'Pay'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View subjects modal (ViewSubjectsComponent) */}
      <Dialog open={viewSubjOpen} onOpenChange={setViewSubjOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subjects</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1 text-left">SI.No</th>
                  <th className="px-2 py-1 text-left">Subject Code</th>
                  <th className="px-2 py-1 text-left">Subject Name</th>
                </tr>
              </thead>
              <tbody>
                {viewSubjRows.map((s, i) => (
                  <tr key={`vs-${i}`} className="border-t">
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">{s.subjectCode ?? '-'}</td>
                    <td className="px-2 py-1">{s.subjectName ?? s.shortName ?? '-'}</td>
                  </tr>
                ))}
                {viewSubjRows.length === 0 && (
                  <tr className="border-t">
                    <td colSpan={3} className="px-2 py-6 text-center text-muted-foreground">
                      No subjects found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
