'use client'

import { useEffect, useMemo, useState } from 'react'
import { LayoutGrid, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select } from '@/common/components/select'

export type SeatAllotmentResult = {
	examseatstatusCatId: number
	studentId: number | null
	subjectId: number | null
	examSeatStatusCode: string
	examDisplaySeatStatusCode: string
	hallticketNumber: string
	subjectCode: string
	stdName: string
	stdRollNumber: string
}

export type SeatAllotmentModalProps = {
	open: boolean
	onClose: () => void
	onSave: (result: SeatAllotmentResult) => void | Promise<void>
	isSaving?: boolean
	seat: {
		examseatstatusCatId?: number | null
		studentId?: number | null
		stdName?: string
		stdRollNumber?: string
		hallticketNumber?: string
		subjectCode?: string
		shortName?: string
	} | null
	context: {
		collegeCode?: string
		academicYear?: string
		courseCode?: string
		examName?: string
		examSession?: string
		examType?: string
		examDate?: string
		roomName?: string
		collegeId: number
		courseId: number
		examId: number
	}
	examSeatStatuses: any[]
	/** Loaded by parent on seat click — Angular dialog open → getExamStudents(). */
	students?: any[]
	loadingStudents?: boolean
}

function statusCodeOf(statuses: any[], id: number): string {
	const row = statuses.find((s) => Number(s.generalDetailId) === id)
	return String(row?.generalDetailCode ?? '')
}

function statusLabelOf(statuses: any[], id: number): string {
	const row = statuses.find((s) => Number(s.generalDetailId) === id)
	return String(row?.generalDetailDisplayName ?? row?.generalDetailName ?? '')
}

function bookedStatusOf(statuses: any[]) {
	return statuses.find((s) => String(s.generalDetailCode ?? '') === 'Booked')
}

function availableStatusOf(statuses: any[]) {
	return (
		statuses.find((s) => String(s.generalDetailCode ?? '').toLowerCase() === 'available') ??
		statuses[0]
	)
}

function resolveStudentId(row: any): number {
	return Number(row?.studentId ?? row?.student_id ?? row?.pk_student_id ?? 0)
}

function formatExamDate(value: string): string {
	const slash = String(value ?? '').match(/^(\d{4})\/(\d{2})\/(\d{2})/)
	if (slash) {
		const d = new Date(Number(slash[1]), Number(slash[2]) - 1, Number(slash[3]))
		return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
	}
	const m = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
	if (!m) return value || '—'
	const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
	return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function SeatAllotmentModal({
	open,
	onClose,
	onSave,
	isSaving = false,
	seat,
	context,
	examSeatStatuses,
	students = [],
	loadingStudents = false,
}: Readonly<SeatAllotmentModalProps>) {
	const [studentId, setStudentId] = useState('')
	const [examSeatStatusId, setExamSeatStatusId] = useState('')
	const [submitted, setSubmitted] = useState(false)

	useEffect(() => {
		if (!open) return
		setStudentId(seat?.studentId ? String(seat.studentId) : '')
		setExamSeatStatusId(seat?.examseatstatusCatId ? String(seat.examseatstatusCatId) : '')
		setSubmitted(false)
	}, [open, seat])

	const studentOptions = useMemo(() => {
		const opts = students
			.map((s) => {
				const sid = resolveStudentId(s)
				if (!sid) return null
				const roll = String(s.rollNumber ?? s.roll_number ?? s.hallticketNumber ?? s.hallticket_number ?? '')
				const name = String(s.firstName ?? s.first_name ?? s.stdName ?? s.student_name ?? '')
				const group = s.groupCode ?? s.group_code
				const year = s.courseYearCode ?? s.course_year_code
				const short = s.shortName ?? s.subjectCode ?? s.subject_code
				const examType = s.examTypeCode ?? s.exam_type_code
				const extras = [group, year, short, examType].filter(Boolean).join(' / ')
				const label = extras
					? `${roll}${name ? ` (${name})` : ''} / ${extras}`
					: `${roll}${name ? ` (${name})` : ''}`
				return { value: String(sid), label }
			})
			.filter((o): o is { value: string; label: string } => o != null && Boolean(o.value && o.label))
		if (seat?.studentId && !opts.some((o) => o.value === String(seat.studentId))) {
			const roll = seat.stdRollNumber || seat.hallticketNumber || String(seat.studentId)
			const name = seat.stdName ? ` (${seat.stdName})` : ''
			const short = seat.subjectCode || seat.shortName
			opts.unshift({
				value: String(seat.studentId),
				label: short ? `${roll}${name} / ${short}` : `${roll}${name}`,
			})
		}
		return opts
	}, [students, seat])

	const statusOptions = useMemo(
		() =>
			examSeatStatuses.map((s) => ({
				value: String(s.generalDetailId),
				label: String(s.generalDetailDisplayName ?? s.generalDetailName ?? s.generalDetailCode ?? ''),
			})),
		[examSeatStatuses],
	)

	function handleStudentChange(value: string | null) {
		const next = value ?? ''
		setStudentId(next)
		if (next) {
			const booked = bookedStatusOf(examSeatStatuses)
			if (booked) setExamSeatStatusId(String(booked.generalDetailId))
			return
		}
		const available = availableStatusOf(examSeatStatuses)
		if (available && !seat?.studentId) {
			setExamSeatStatusId(String(available.generalDetailId))
		}
	}

	async function handleSave() {
		setSubmitted(true)
		let statusId = Number(examSeatStatusId)
		if (!statusId) return

		let statusCode = statusCodeOf(examSeatStatuses, statusId)
		let statusLabel = statusLabelOf(examSeatStatuses, statusId)
		let sid: number | null = studentId ? Number(studentId) : null
		let subjectId: number | null = null
		let hallticketNumber = ''
		let subjectCode = ''
		let stdName = ''
		let stdRollNumber = ''

		// Angular: student is only persisted when status is Booked.
		if (sid) {
			const booked = bookedStatusOf(examSeatStatuses)
			if (booked) {
				statusId = Number(booked.generalDetailId)
				statusCode = String(booked.generalDetailCode ?? 'Booked')
				statusLabel = String(
					booked.generalDetailDisplayName ?? booked.generalDetailName ?? 'Booked',
				)
				setExamSeatStatusId(String(booked.generalDetailId))
			}
		}

		if (sid) {
			const student = students.find((s) => resolveStudentId(s) === sid)
			if (student) {
				sid = resolveStudentId(student) || sid
				subjectId = Number(student.subjectId ?? student.subject_id ?? 0) || null
				stdRollNumber = String(student.rollNumber ?? student.roll_number ?? '')
				hallticketNumber = stdRollNumber
				stdName = String(student.firstName ?? student.first_name ?? '')
				const short = student.shortName ?? student.subjectCode ?? student.subject_code
				subjectCode = String(short ?? '')
			} else if (seat?.studentId === sid) {
				stdRollNumber = seat.stdRollNumber || seat.hallticketNumber || ''
				hallticketNumber = seat.hallticketNumber || stdRollNumber
				stdName = seat.stdName || ''
				subjectCode = seat.subjectCode || seat.shortName || ''
			} else {
				setSubmitted(true)
				return
			}
		}

		if (statusCode !== 'Booked') {
			sid = null
			subjectId = null
			hallticketNumber = ''
			subjectCode = ''
			stdName = ''
			stdRollNumber = ''
		}

		await onSave({
			examseatstatusCatId: statusId,
			studentId: sid,
			subjectId,
			examSeatStatusCode: statusCode,
			examDisplaySeatStatusCode: statusLabel,
			hallticketNumber,
			subjectCode,
			stdName,
			stdRollNumber,
		})
	}

	const collegeLine = [context.collegeCode, context.academicYear, context.courseCode].filter(Boolean).join(' / ')
	const timetableLine = [
		context.collegeCode,
		context.examSession,
		context.examType,
		context.examDate ? `(${formatExamDate(context.examDate)})` : '',
	]
		.filter(Boolean)
		.join(' / ')

	return (
		<Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
			<DialogContent
				className="flex max-h-[92vh] flex-col overflow-hidden sm:max-w-[900px] p-0 gap-0"
				closeOnOutsideClick={false}
				onEscapeKeyDown={(e) => e.preventDefault()}
			>
				<DialogHeader className="px-4 py-3 space-y-0">
					<DialogTitle className="flex items-center gap-2 text-base font-semibold">
						<LayoutGrid className="h-5 w-5" />
						Seat Allotment
					</DialogTitle>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
					<div className="rounded border border-blue-200 bg-blue-50/40 p-3 text-[12px] space-y-2">
						<div className="grid grid-cols-[7rem_1fr] gap-x-2 gap-y-1">
							<span className="text-slate-600">College :</span>
							<span className="font-medium text-blue-700">{collegeLine || '—'}</span>
							<span className="text-slate-600">Exam :</span>
							<span className="font-medium text-blue-700">{context.examName || '—'}</span>
							<span className="text-slate-600">Exam Timetable :</span>
							<span className="font-medium text-blue-700">{timetableLine || '—'}</span>
							{context.roomName ? (
								<>
									<span className="text-slate-600">Room Details :</span>
									<span className="font-medium text-blue-700">{context.roomName}</span>
								</>
							) : null}
						</div>
					</div>

					<div className="space-y-3">
						<Select
							label="Student"
							value={studentId}
							onChange={handleStudentChange}
							options={studentOptions}
							placeholder="Search by Student Name or No."
							searchable
							clearable
							isLoading={loadingStudents}
						/>
						<Select
							label="Exam Seat Status"
							value={examSeatStatusId}
							onChange={(v) => setExamSeatStatusId(v ?? '')}
							options={statusOptions}
							placeholder="Select seat status"
						/>
						{submitted && studentId && !students.some((s) => resolveStudentId(s) === Number(studentId)) && seat?.studentId !== Number(studentId) ? (
							<p className="text-[11px] text-red-600">Selected student could not be resolved.</p>
						) : null}
						{submitted && !examSeatStatusId ? (
							<p className="text-[11px] text-red-600">Exam Seat Status is required.</p>
						) : null}
					</div>
				</div>

				<DialogFooter className="border-t px-4 py-3 sm:justify-end gap-2">
					<Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
						Cancel
					</Button>
					<Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
						{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
