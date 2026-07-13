'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select as CommonSelect, type SelectOption } from '@/common/components/select'
import { StatusBadge } from '@/common/components/data-display'
import { toDateStr, toDateOnlyISO } from '@/common/generic-functions'
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
	listCoursesForRevisionFilters,
	listRevisionMastersByCourse,
	listRevisionTypes,
	updateRevisionMaster,
} from '@/services/revision-master'
import { Building2, GraduationCap, PencilIcon, PlusIcon } from 'lucide-react'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { FilteredListPage } from '@/components/layout'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'

type RevisionRow = Record<string, unknown> & {
	revisionMasterId?: number
	examRevisionTypeName?: string
	fromDate?: string
	toDate?: string
	amount?: number
	isActive?: boolean
	reason?: string
	__collegeCode?: string
	__courseCode?: string
}

const COL_DEFS = {
	siNo: {
		colId: 'siNo',
		headerName: 'SI.No',
		valueGetter: (p: { node?: { rowIndex?: number } }) => (p.node?.rowIndex ?? 0) + 1,
		width: 72,
		flex: 0,
	} as ColDef<RevisionRow>,
	id: {
		colId: 'revisionMasterId',
		field: 'revisionMasterId',
		headerName: 'Revision ID',
		minWidth: 100,
	} as ColDef<RevisionRow>,
	college: { field: '__collegeCode', headerName: 'College', minWidth: 110 } as ColDef<RevisionRow>,
	course: { field: '__courseCode', headerName: 'Course', minWidth: 110 } as ColDef<RevisionRow>,
	type: { field: 'examRevisionTypeName', headerName: 'Exam Revision Type', minWidth: 180 } as ColDef<RevisionRow>,
	fromDate: {
		field: 'fromDate',
		headerName: 'From Date',
		minWidth: 120,
		valueFormatter: (p: { value?: unknown }) => toDateStr(String(p.value ?? '')),
	} as ColDef<RevisionRow>,
	toDate: {
		field: 'toDate',
		headerName: 'To Date',
		minWidth: 120,
		valueFormatter: (p: { value?: unknown }) => toDateStr(String(p.value ?? '')),
	} as ColDef<RevisionRow>,
	amount: { field: 'amount', headerName: 'Amount', width: 100, flex: 0 } as ColDef<RevisionRow>,
	reason: {
		field: 'reason',
		headerName: 'Reason',
		minWidth: 120,
		valueFormatter: (p: { value?: unknown }) => {
			const s = String(p.value ?? '').trim()
			return s || '—'
		},
	} as ColDef<RevisionRow>,
	isActive: { field: 'isActive', headerName: 'Status', width: 110, flex: 0 } as ColDef<RevisionRow>,
	actions: { colId: 'actions', headerName: 'Actions', width: 100, flex: 0, sortable: false } as ColDef<RevisionRow>,
}

function statusRenderer(p: ICellRendererParams<RevisionRow>) {
	return <StatusBadge status={Boolean(p.data?.isActive)} />
}

function makeActionsRenderer(onEdit: (row: RevisionRow) => void) {
	return (p: ICellRendererParams<RevisionRow>) => (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			className="h-8 w-8 p-0"
			aria-label="Edit revision master"
			onClick={() => p.data && onEdit(p.data)}
		>
			<PencilIcon className="h-3.5 w-3.5" />
		</Button>
	)
}

export default function RevisionMasterPage() {
	const [colleges, setColleges] = useState<any[]>([])
	const [courses, setCourses] = useState<any[]>([])
	const [rows, setRows] = useState<RevisionRow[]>([])
	const [revisionTypes, setRevisionTypes] = useState<any[]>([])

	const [collegeId, setCollegeId] = useState<number | null>(null)
	const [courseId, setCourseId] = useState<number | null>(null)
	const [loadingRows, setLoadingRows] = useState(false)

	const [open, setOpen] = useState(false)
	const [editing, setEditing] = useState<RevisionRow | null>(null)
	const [examRevisionTypeId, setExamRevisionTypeId] = useState<number | null>(null)
	const [fromDate, setFromDate] = useState('')
	const [toDate, setToDate] = useState('')
	const [amount, setAmount] = useState('0')
	const [isActive, setIsActive] = useState(true)
	const [reason, setReason] = useState('active')
	const [saveError, setSaveError] = useState('')
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
	const [isSaving, setIsSaving] = useState(false)

	function closeModal() {
		setOpen(false)
		setEditing(null)
		setSaveError('')
		setFieldErrors({})
	}

	const collegeOptions = useMemo<SelectOption[]>(
		() =>
			colleges.map((c: any, i: number) => ({
				value: String(c.collegeId ?? c.fk_college_id ?? i),
				label: String(c.collegeCode ?? c.collegeName ?? c.college_id ?? '-'),
			})),
		[colleges],
	)

	const courseOptions = useMemo<SelectOption[]>(
		() =>
			courses.map((c: any, i: number) => ({
				value: String(c.courseId ?? c.fk_course_id ?? c.id ?? i),
				label: String(c.courseCode ?? c.courseName ?? c.course_code ?? '-'),
			})),
		[courses],
	)

	const revisionTypeModalOptions = useMemo<SelectOption[]>(
		() =>
			revisionTypes.map((t: any, i: number) => ({
				value: String(t.generalDetailId ?? i),
				label: String(t.generalDetailDisplayName ?? t.generalDetailCode ?? '-'),
			})),
		[revisionTypes],
	)

	const statusModalOptions = useMemo<SelectOption[]>(
		() => [
			{ value: '1', label: 'Active' },
			{ value: '0', label: 'InActive' },
		],
		[],
	)

	const gridRows = useMemo<RevisionRow[]>(() => {
		const coll = colleges.find((c) => Number(c.collegeId ?? c.fk_college_id) === Number(collegeId))
		const cou = courses.find((c) => Number(c.courseId ?? c.fk_course_id ?? c.id) === Number(courseId))
		const __collegeCode = String(coll?.collegeCode ?? coll?.collegeName ?? '')
		const __courseCode = String(cou?.courseCode ?? cou?.courseName ?? '')
		return rows.map((r) => ({ ...r, __collegeCode, __courseCode }))
	}, [rows, colleges, courses, collegeId, courseId])

	const openEdit = useCallback((row: RevisionRow) => {
		setSaveError('')
		setFieldErrors({})
		setEditing(row)
		setExamRevisionTypeId(Number(row.examRevisionTypeId ?? 0) || null)
		setFromDate(toDateStr(String(row.fromDate ?? '')))
		setToDate(toDateStr(String(row.toDate ?? '')))
		setAmount(String(row.amount ?? 0))
		setIsActive(Boolean(row.isActive))
		setReason(String(row.reason ?? ''))
		setOpen(true)
	}, [])

	const columnDefs = useMemo<ColDef<RevisionRow>[]>(
		() => [
			COL_DEFS.siNo,
			COL_DEFS.id,
			COL_DEFS.college,
			COL_DEFS.course,
			COL_DEFS.type,
			COL_DEFS.fromDate,
			COL_DEFS.toDate,
			COL_DEFS.amount,
			COL_DEFS.reason,
			{ ...COL_DEFS.isActive, cellRenderer: statusRenderer },
			{ ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(openEdit) },
		],
		[openEdit],
	)

	useEffect(() => {
		async function loadBase() {
			const [clgs, revTypes] = await Promise.all([
				listCollegesActive().catch(() => []),
				listRevisionTypes().catch(() => []),
			])
			setColleges(Array.isArray(clgs) ? clgs : [])
			setRevisionTypes(Array.isArray(revTypes) ? revTypes : [])
			const firstCollege = (clgs as any[])[0]
			const firstCollegeId = Number(firstCollege?.collegeId ?? firstCollege?.fk_college_id ?? 0)
			if (firstCollegeId > 0) setCollegeId(firstCollegeId)
		}
		void loadBase()
	}, [])

	useEffect(() => {
		async function loadCourses() {
			setCourses([])
			setCourseId(null)
			setRows([])
			if (!collegeId) return
			const college = colleges.find((c) => Number(c.collegeId ?? c.fk_college_id) === Number(collegeId))
			const universityId = Number(
				college?.universityId ??
					college?.fk_university_id ??
					college?.fkUniversityId ??
					college?.university_id ??
					college?.univId ??
					college?.['University.universityId'] ??
					0,
			)
			const list = await listCoursesForRevisionFilters({ collegeId, universityId }).catch(() => [])
			const arr = Array.isArray(list) ? list : []
			setCourses(arr)
		}
		void loadCourses()
	}, [collegeId, colleges])

	useEffect(() => {
		async function loadRows() {
			setLoadingRows(true)
			setRows([])
			try {
				if (!courseId) return
				const list = await listRevisionMastersByCourse(courseId).catch(() => [])
				setRows(Array.isArray(list) ? (list as RevisionRow[]) : [])
			} finally {
				setLoadingRows(false)
			}
		}
		void loadRows()
	}, [courseId])

	function openAdd() {
		setEditing(null)
		setSaveError('')
		setFieldErrors({})
		setExamRevisionTypeId(revisionTypes[0]?.generalDetailId ?? null)
		const today = toDateOnlyISO(new Date())
		setFromDate(today)
		setToDate(today)
		setAmount('')
		setIsActive(true)
		setReason('active')
		setOpen(true)
	}

	async function save() {
		setSaveError('')
		const cleanAmount = amount.trim()
		const nextErrors: Record<string, string> = {}
		if (!examRevisionTypeId) nextErrors.examRevisionTypeId = 'Exam Revision Type is required.'
		if (!cleanAmount) nextErrors.amount = 'Amount is required.'
		setFieldErrors(nextErrors)
		if (Object.keys(nextErrors).length > 0) return
		if (!collegeId || !courseId || !fromDate || !toDate) {
			setSaveError('Please select College and Course filters before saving.')
			return
		}
		if (fromDate > toDate) {
			setSaveError('From Date should be less than or equal to To Date.')
			return
		}
		setIsSaving(true)
		const payload = {
			collegeId,
			courseId,
			examRevisionTypeId,
			fromDate,
			toDate,
			amount: Number(cleanAmount || 0),
			isActive,
			reason,
		}
		try {
			if (editing?.revisionMasterId) {
				const updatePayload = { ...payload, createdDt: editing.createdDt }
				await updateRevisionMaster(Number(editing.revisionMasterId), updatePayload)
			} else {
				await createRevisionMaster(payload)
			}
			closeModal()
			const list = await listRevisionMastersByCourse(courseId).catch(() => [])
			setRows(Array.isArray(list) ? (list as RevisionRow[]) : [])
		} catch (err: any) {
			setSaveError(err?.message || 'Unable to process your request at this time, please try again!')
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<FilteredListPage
			title="Exam Revision Master"
			filters={(
				<GlobalFilterBarRow>
					<GlobalFilterField label="College" icon={Building2}>
						<CommonSelect
							placeholder="Select college"
							value={collegeId != null ? String(collegeId) : null}
							onChange={(v) => setCollegeId(v ? Number(v) : null)}
							options={collegeOptions}
							disabled={collegeOptions.length === 0}
						/>
					</GlobalFilterField>
					<GlobalFilterField label="Course" icon={GraduationCap}>
						<CommonSelect
							placeholder="Select course"
							value={courseId != null ? String(courseId) : null}
							onChange={(v) => setCourseId(v ? Number(v) : null)}
							options={courseOptions}
						/>
					</GlobalFilterField>
				</GlobalFilterBarRow>
			)}
			rowData={courseId != null ? gridRows : []}
			columnDefs={columnDefs}
			loading={loadingRows}
			pagination
			getRowId={(p) =>
				String(
					p.data.revisionMasterId ??
						`row-${String(p.data.examRevisionTypeId)}-${String(p.data.fromDate)}-${String(p.data.toDate)}`,
				)
			}
			toolbar={{
				search: true,
				searchPlaceholder: 'Search revision masters…',
				columnPicker: true,
				exportPdf: true,
				pdfDocumentTitle: 'Exam Revision Master',
				lockColumnIds: ['siNo', 'actions'],
			}}
			toolbarTrailing={(
				<Button type="button" size="sm" className="h-[30px] px-3 text-[12px]" onClick={openAdd} disabled={!courseId}>
					<PlusIcon className="mr-1 h-3.5 w-3.5" />
					Add Revision Master
				</Button>
			)}
		>
			<Dialog
				open={open}
				onOpenChange={(v) => {
					if (!v) closeModal()
				}}
			>
				<DialogContent
					className="max-w-2xl"
					closeOnOutsideClick={false}
					onEscapeKeyDown={(e) => e.preventDefault()}
				>
					<DialogHeader className="pr-12">
						<DialogTitle className="text-[hsl(var(--primary))]">
							{editing ? 'Edit Exam Revision Master' : 'Add Exam Revision Master'}
						</DialogTitle>
					</DialogHeader>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						<div className="space-y-1 md:col-span-2">
							<CommonSelect
								label="Exam Revision Type"
								required
								placeholder="Select revision type"
								value={examRevisionTypeId != null ? String(examRevisionTypeId) : null}
								onChange={(v) => {
									setExamRevisionTypeId(v ? Number(v) : null)
									if (fieldErrors.examRevisionTypeId) {
										setFieldErrors((prev) => {
											const next = { ...prev }
											delete next.examRevisionTypeId
											return next
										})
									}
								}}
								options={revisionTypeModalOptions}
								error={fieldErrors.examRevisionTypeId}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-[12px]">
								Amount <span className="text-red-500">*</span>
							</Label>
							<Input
								className="h-8 text-[12px]"
								type="number"
								step="any"
								placeholder="Enter amount"
								value={amount}
								aria-invalid={Boolean(fieldErrors.amount)}
								onChange={(e) => {
									setAmount(e.target.value)
									if (fieldErrors.amount) {
										setFieldErrors((prev) => {
											const next = { ...prev }
											delete next.amount
											return next
										})
									}
								}}
							/>
							{fieldErrors.amount ? (
								<p className="text-[11px] text-destructive">{fieldErrors.amount}</p>
							) : null}
						</div>
						<div className="space-y-1">
							<Label className="text-[12px]">From Date</Label>
							<Input className="h-8 text-[12px]" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
						</div>
						<div className="space-y-1">
							<Label className="text-[12px]">To Date</Label>
							<Input
								className="h-8 text-[12px]"
								type="date"
								min={fromDate || undefined}
								value={toDate}
								onChange={(e) => setToDate(e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<CommonSelect
								label="Status"
								placeholder="Select status"
								value={isActive ? '1' : '0'}
								onChange={(v) => setIsActive(v === '1')}
								options={statusModalOptions}
							/>
						</div>
						{!isActive && (
							<div className="space-y-1 md:col-span-2">
								<Label className="text-[12px]">Reason</Label>
								<Input
									className="h-8 text-[12px]"
									placeholder="Reason for deactivation"
									value={reason}
									onChange={(e) => setReason(e.target.value)}
								/>
							</div>
						)}
					</div>
					<DialogFooter>
						{saveError ? <p className="mr-auto text-[12px] text-red-600">{saveError}</p> : null}
						<Button type="button" variant="outline" onClick={closeModal}>
							Cancel
						</Button>
						<Button type="button" onClick={save} disabled={isSaving}>
							{isSaving ? 'Saving...' : 'Save'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</FilteredListPage>
	)
}
