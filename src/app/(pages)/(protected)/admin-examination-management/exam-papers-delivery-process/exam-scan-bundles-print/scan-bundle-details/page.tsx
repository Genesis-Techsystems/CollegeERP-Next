'use client'

/**
 * Scan Bundle Details (scan / assign answer papers).
 *
 * Faithful React port of Angular `scan-bundle-details-new`. Reached from the
 * Exam Scan Bundles Print page via "Bundle Details". Shows the OMRs already
 * scanned into the bundle, lets the operator scan more answer-paper barcodes
 * (resolved via searchByExamOmrSerialNo), and bulk-assigns them to the bundle.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageContainer, PageHeader } from '@/components/layout'
import { ScanLine, Search } from 'lucide-react'
import { toastError, toastSuccess } from '@/lib/toast'
import {
	getExamScanBundleStickers,
	searchExamOmrSerialNo,
	saveScanBundleDetails,
	updateExamScanBundleDetail,
	type AnyRow,
} from '@/services/exam-papers-delivery'

type Row = AnyRow

const PRINT_ROUTE = '/admin-examination-management/exam-papers-delivery-process/exam-scan-bundles-print'

const num = (v: unknown): number => {
	const n = Number(v)
	return Number.isFinite(n) ? n : 0
}
const txt = (v: unknown): string => {
	if (typeof v === 'string') return v
	if (typeof v === 'number' || typeof v === 'boolean') return String(v)
	return ''
}

interface SelectedOmr {
	omrSerialNo: string
	examStdDetId: number
	hallticketNumber: string
	ecSeatNo: string
}

export default function ScanBundleDetailsPage() {
	const router = useRouter()
	const searchParams = useSearchParams()

	const params = useMemo(
		() => ({
			academicYearId: Number(searchParams?.get('academicYearId') ?? 0),
			examGroupId: Number(searchParams?.get('examGroupId') ?? 0),
			examCenterId: Number(searchParams?.get('examCenterId') ?? 0),
			examDate: searchParams?.get('examDate') ?? '',
			questionPaperCode: searchParams?.get('questionPaperCode') ?? '',
			examGroupCode: searchParams?.get('examGroupCode') ?? '',
			examCenterCode: searchParams?.get('examCenterCode') ?? '',
			scanBundleId: Number(searchParams?.get('scanBundleId') ?? 0),
			scanBundleName: searchParams?.get('scanBundleName') ?? '',
			bundleNumber: Number(searchParams?.get('bundleNumber') ?? 0),
			scannerProfileDetailId: Number(searchParams?.get('scannerProfileDetailId') ?? 0),
		}),
		[searchParams],
	)

	const [scanned, setScanned] = useState<Row[]>([])
	const [selected, setSelected] = useState<SelectedOmr[]>([])
	const [barcode, setBarcode] = useState('')
	const [search, setSearch] = useState('')
	const [busy, setBusy] = useState(false)
	const [saving, setSaving] = useState(false)
	const barcodeRef = useRef<HTMLInputElement>(null)
	const lastQueryRef = useRef('')

	// Edit existing scanned row (Angular editDialog → updateDetails)
	const [editOpen, setEditOpen] = useState(false)
	const [editRow, setEditRow] = useState<Row | null>(null)
	const [editForm, setEditForm] = useState({ isActive: true, reason: '' })
	const [savingEdit, setSavingEdit] = useState(false)

	const dataDetails = useMemo(
		() =>
			[params.examGroupCode, params.examCenterCode, params.examDate, params.questionPaperCode, params.scanBundleName]
				.filter(Boolean)
				.join(' / '),
		[params],
	)

	const loadScanned = useCallback(async () => {
		if (!params.scanBundleId) return
		setBusy(true)
		try {
			const rows = await getExamScanBundleStickers({
				univExamcenterId: params.examCenterId,
				examGroupId: params.examGroupId,
				academicYearId: params.academicYearId,
				examDate: params.examDate,
				questionPaperCode: params.questionPaperCode,
				scanBundleId: params.scanBundleId,
			})
			setScanned(Array.isArray(rows) ? rows : [])
		} catch (e) {
			toastError(e, 'Failed to load scanned answer papers')
		} finally {
			setBusy(false)
		}
	}, [params])

	useEffect(() => {
		// No bundle context → bounce back (Angular ngOnInit guard).
		if (!params.scanBundleId) {
			router.replace(PRINT_ROUTE)
			return
		}
		void loadScanned()
	}, [params.scanBundleId, loadScanned, router])

	useEffect(() => {
		barcodeRef.current?.focus()
	}, [])

	// Angular enteredOmr: on input > 3 chars, search and add the exact match.
	async function handleBarcode(value: string) {
		setBarcode(value)
		if (value.length <= 3) return
		if (value === lastQueryRef.current) return
		lastQueryRef.current = value
		const rows = await searchExamOmrSerialNo(value).catch(() => [])
		const exact = rows.filter((r) => txt(r.omrSerialNo) === value)
		if (exact.length === 0) return
		for (const r of exact) {
			const omr = txt(r.omrSerialNo)
			const dupSelected = selected.some((s) => s.omrSerialNo === omr)
			const dupScanned = scanned.some((s) => txt(s.omr_serial_no) === omr)
			if (dupSelected || dupScanned) {
				toast.info(`OMR Serial No ${omr} already exists`)
				continue
			}
			setSelected((prev) => [
				...prev,
				{
					omrSerialNo: omr,
					examStdDetId: num(r.examStdDetId),
					hallticketNumber: txt(r.hallticketNumber),
					ecSeatNo: txt(r.ecSeatNo),
				},
			])
		}
		setBarcode('')
		lastQueryRef.current = ''
		barcodeRef.current?.focus()
	}

	function deleteSelected(idx: number) {
		setSelected((prev) => prev.filter((_, i) => i !== idx))
	}

	async function assignScanBundles() {
		if (selected.length === 0) {
			toast.info('No Answer Papers Scanned…!')
			return
		}
		const empId = Number(globalThis.localStorage?.getItem('employeeId') ?? 0)
		const rows = selected.map((s) => ({
			univExamScanbundleId: params.scanBundleId,
			examStdDetId: s.examStdDetId,
			omrSerialNo: s.omrSerialNo,
			ecSeatNo: s.ecSeatNo,
			scannerProfileDetailId: params.scannerProfileDetailId || null,
			isActive: true,
			createdUser: empId,
		}))
		setSaving(true)
		try {
			await saveScanBundleDetails(rows)
			toastSuccess('Answer papers assigned to bundle.')
			setSelected([])
			await loadScanned()
		} catch (e) {
			toastError(e, 'Failed to assign answer papers')
		} finally {
			setSaving(false)
		}
	}

	function openEdit(row: Row) {
		setEditRow(row)
		setEditForm({ isActive: row.isActive == null ? true : row.isActive === true, reason: txt(row.reason) })
		setEditOpen(true)
	}

	async function saveEdit() {
		if (!editRow) return
		const id = num(editRow.pk_univ_exam_scan_bundle_detail_id ?? editRow.univExamScanbundleDetId)
		if (!id) {
			toastError('Missing scan bundle detail id.')
			return
		}
		setSavingEdit(true)
		try {
			await updateExamScanBundleDetail(id, {
				univExamScanbundleDetId: id,
				isActive: editForm.isActive,
				reason: editForm.reason || null,
				omrSerialNo: txt(editRow.omr_serial_no),
				examStdDetId: num(editRow.fk_exam_std_det_id),
			})
			toastSuccess('Scan bundle detail updated.')
			setEditOpen(false)
			await loadScanned()
		} catch (e) {
			toastError(e, 'Failed to update scan bundle detail')
		} finally {
			setSavingEdit(false)
		}
	}

	function goBack() {
		const qp = new URLSearchParams({
			academicYearId: String(params.academicYearId),
			examGroupId: String(params.examGroupId),
			examCenterId: String(params.examCenterId),
			examDate: params.examDate,
			questionPaperCode: params.questionPaperCode,
		})
		router.push(`${PRINT_ROUTE}?${qp.toString()}`)
	}

	const filteredScanned = useMemo(() => {
		const q = search.trim().toLowerCase()
		if (!q) return scanned
		return scanned.filter((r) => `${txt(r.bundle_number)} ${txt(r.omr_serial_no)} ${txt(r.ec_seatno)}`.toLowerCase().includes(q))
	}, [scanned, search])

	const cell = 'border border-border px-2 py-1 text-[12px]'
	const head = 'border border-border px-2 py-1 text-[12px] text-left font-semibold bg-muted/40'

	return (
		<PageContainer className="space-y-4">
			<PageHeader title="Exam Scan Bundle Details" subtitle={dataDetails || 'Scan and assign answer papers'} />

			<div className="flex justify-end">
				<Button type="button" variant="outline" className="h-8 px-6" onClick={goBack}>
					Back
				</Button>
			</div>

			{/* Barcode scan + to-assign list */}
			<div className="app-card p-4 space-y-3 border-2 border-[#80a7eb]">
				<div className="flex items-center gap-2">
					<ScanLine className="h-4 w-4 text-blue-700" aria-hidden />
					<div className="relative flex-1 max-w-xl">
						<Input
							ref={barcodeRef}
							autoFocus
							className="h-9 pl-3 text-[13px]"
							placeholder="Scan barcode here – input always focused"
							value={barcode}
							onChange={(e) => void handleBarcode(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') e.preventDefault()
							}}
						/>
					</div>
				</div>

				<div className="rounded-md border overflow-auto max-h-[420px]">
					<table className="w-full border-collapse">
						<thead>
							<tr>
								<th className={head} style={{ width: 70 }}>SL No.</th>
								<th className={head}>Ec Seat No.</th>
								<th className={head}>Omr Serial No.</th>
								<th className={head}>Hall Ticket No.</th>
								<th className={head} style={{ width: 80 }}>Actions</th>
							</tr>
						</thead>
						<tbody>
							{selected.length === 0 && (
								<tr>
									<td className={`${cell} text-center text-muted-foreground`} colSpan={5}>
										No records found
									</td>
								</tr>
							)}
							{selected.map((s, i) => (
								<tr key={`${s.omrSerialNo}-${i}`}>
									<td className={cell}>{i + 1}</td>
									<td className={cell}>{s.ecSeatNo}</td>
									<td className={cell}>{s.omrSerialNo}</td>
									<td className={cell}>{s.hallticketNumber}</td>
									<td className={cell}>
										<button type="button" className="text-red-600 hover:underline" onClick={() => deleteSelected(i)}>
											✕
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<div className="flex justify-end">
					<Button type="button" className="h-8 px-6" disabled={saving || selected.length === 0} onClick={() => void assignScanBundles()}>
						{saving ? 'Saving…' : 'Save'}
					</Button>
				</div>
			</div>

			{/* Already-scanned answer papers */}
			<div className="app-card overflow-hidden">
				<div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/40">
					<h3 className="text-[13px] font-semibold">
						Exam Scan Bundle Details {dataDetails && `— ${dataDetails}`}
					</h3>
					<div className="relative">
						<Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
						<Input className="h-7 pl-7 text-[12px] w-56" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
					</div>
				</div>
				<div className="p-2 overflow-auto">
					<table className="w-full border-collapse">
						<thead>
							<tr>
								<th className={head} style={{ width: 70 }}>SI.No</th>
								<th className={head}>Bundle No</th>
								<th className={head}>OMR Serial No</th>
								<th className={head}>Student</th>
								<th className={head} style={{ width: 90 }}>Actions</th>
							</tr>
						</thead>
						<tbody>
							{!busy && filteredScanned.length === 0 && (
								<tr>
									<td className={`${cell} text-center text-muted-foreground`} colSpan={5}>
										No records found
									</td>
								</tr>
							)}
							{filteredScanned.map((r, i) => (
								<tr key={`${txt(r.omr_serial_no)}-${i}`}>
									<td className={cell}>{i + 1}</td>
									<td className={cell}>{txt(r.bundle_number)}</td>
									<td className={cell}>{txt(r.omr_serial_no)}</td>
									<td className={cell}>{txt(r.ec_seatno)}</td>
									<td className={cell}>
										<button type="button" className="text-[hsl(var(--primary))] hover:underline" onClick={() => openEdit(r)}>
											Edit
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* Edit scanned detail */}
			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Edit Scan Bundle Detail</DialogTitle>
					</DialogHeader>
					<div className="space-y-3 text-[13px]">
						<div className="text-muted-foreground">
							OMR: {txt(editRow?.omr_serial_no)} · Seat: {txt(editRow?.ec_seatno)}
						</div>
						<label className="flex items-center gap-2">
							<Checkbox checked={editForm.isActive} onCheckedChange={(v) => setEditForm((s) => ({ ...s, isActive: v === true }))} />
							Active
						</label>
						{!editForm.isActive && (
							<div className="space-y-1">
								<Label>Reason</Label>
								<Input className="h-8 text-[12px]" value={editForm.reason} onChange={(e) => setEditForm((s) => ({ ...s, reason: e.target.value }))} />
							</div>
						)}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingEdit}>
							Cancel
						</Button>
						<Button onClick={() => void saveEdit()} disabled={savingEdit}>
							{savingEdit ? 'Saving…' : 'Save'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</PageContainer>
	)
}
