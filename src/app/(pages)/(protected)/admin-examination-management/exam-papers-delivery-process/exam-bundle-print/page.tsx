'use client'

/**
 * Exam Bundle Print.
 *
 * Faithful React port of Angular
 * `exam-papers-delivery-process/exam-bundle-print`. Cascade filters
 * Academic Year → Exam Group → Exam Center → Exam Date → Subject (QP code)
 * via the `s_get_exam_center_bycode` proc (eg_filters / eg_ec_filters /
 * eg_ec_qc_filters), a bundle list (get_exam_bundle), and per-bundle barcode
 * stickers (bundle_omr_details) printed grouped by bundle. The Angular
 * sticker sub-components (English + Gujarati) are rendered inline via the
 * shared print-mode hook.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { ChevronDown, Filter, Layers, Printer } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { rowIndexGetter } from '@/lib/utils'
import { toast } from 'sonner'
import { toastError } from '@/lib/toast'
import { usePrintMode } from '@/lib/print'
import {
	getExamCenterBundleByCode,
	getExamCenterFilterGroups,
	listExamBundlesByCode,
	type AnyRow,
} from '@/services/exam-papers-delivery'

type Row = AnyRow

const num = (v: unknown): number => {
	const n = Number(v)
	return Number.isFinite(n) ? n : 0
}
const txt = (v: unknown): string => {
	if (typeof v === 'string') return v
	if (typeof v === 'number' || typeof v === 'boolean') return String(v)
	return ''
}

function dedupeBy<T>(rows: T[], keyFn: (r: T) => number | string): T[] {
	const seen = new Set<number | string>()
	const out: T[] = []
	for (const r of rows) {
		const k = keyFn(r)
		if (k == null || k === '' || k === 0 || seen.has(k)) continue
		seen.add(k)
		out.push(r)
	}
	return out
}

interface FormState {
	academicYearId: string
	examGroupId: string
	examCenterId: string
	examDate: string
	questionPaperCode: string
}

const EMPTY_FORM: FormState = {
	academicYearId: '',
	examGroupId: '',
	examCenterId: '',
	examDate: '',
	questionPaperCode: '',
}

// 'stickers' = English variant (exam-bundle-print-stickers),
// 'stickers-gu' = Gujarati variant (exam-bundle-print-stickers-gu) — identical
// data/structure, wider sticker-row margin.
type PrintMode = 'stickers' | 'stickers-gu'

export default function ExamBundlePrintPage() {
	const [filtersOpen, setFiltersOpen] = useState(true)
	const [form, setForm] = useState<FormState>(EMPTY_FORM)
	const [egFilterRows, setEgFilterRows] = useState<Row[]>([])
	const [ecGroupRows, setEcGroupRows] = useState<Row[]>([])
	const [questionPaperRows, setQuestionPaperRows] = useState<Row[]>([])
	const [bundles, setBundles] = useState<Row[]>([])
	const [loadingFilters, setLoadingFilters] = useState(false)
	const [loadingList, setLoadingList] = useState(false)
	const [flag, setFlag] = useState(false)

	const [stickerRows, setStickerRows] = useState<Row[]>([])
	const { mode: printMode, triggerPrint } = usePrintMode<PrintMode>()

	// ── eg_filters → academic years + exam groups (Angular getExamGroupDetails) ──
	const loadAcademicYearAndGroups = useCallback(async () => {
		setLoadingFilters(true)
		try {
			const groups = await getExamCenterFilterGroups({ flag: 'eg_filters' })
			const flat: Row[] = []
			for (const g of groups) {
				if (g.length > 0 && txt(g[0].flag) === 'eg_ay_filter') flat.push(...g)
			}
			setEgFilterRows(flat)
		} catch (e) {
			toastError(e, 'Failed to load filters')
		} finally {
			setLoadingFilters(false)
		}
	}, [])

	useEffect(() => {
		void loadAcademicYearAndGroups()
	}, [loadAcademicYearAndGroups])

	const academicYears = useMemo(() => dedupeBy(egFilterRows, (r) => num(r.fk_academic_year_id)), [egFilterRows])

	useEffect(() => {
		if (!academicYears.length || form.academicYearId) return
		setForm((f) => ({ ...f, academicYearId: String(num(academicYears[0].fk_academic_year_id)) }))
	}, [academicYears, form.academicYearId])

	const examGroups = useMemo(
		() =>
			dedupeBy(
				egFilterRows.filter((r) => num(r.fk_academic_year_id) === Number(form.academicYearId)),
				(r) => num(r.fk_univ_exam_group_id),
			),
		[egFilterRows, form.academicYearId],
	)

	useEffect(() => {
		if (!examGroups.length || !form.academicYearId) return
		setForm((f) => ({ ...f, examGroupId: String(num(examGroups[0].fk_univ_exam_group_id)) }))
	}, [examGroups, form.academicYearId])

	// ── eg_ec_filters → exam centers + dates ─────────────────────────────────────
	useEffect(() => {
		let cancelled = false
		async function load() {
			if (!form.academicYearId || !form.examGroupId) {
				setEcGroupRows([])
				return
			}
			try {
				const groups = await getExamCenterFilterGroups({
					flag: 'eg_ec_filters',
					academicYearId: Number(form.academicYearId),
					examGroupId: Number(form.examGroupId),
				})
				if (cancelled) return
				const flat: Row[] = []
				for (const g of groups) flat.push(...g)
				setEcGroupRows(flat)
			} catch (e) {
				if (!cancelled) toastError(e, 'Failed to load exam centers')
			}
		}
		void load()
		return () => {
			cancelled = true
		}
	}, [form.academicYearId, form.examGroupId])

	const examCenters = useMemo(() => dedupeBy(ecGroupRows, (r) => num(r.fk_univ_ec_id)), [ecGroupRows])

	useEffect(() => {
		if (!examCenters.length || !form.examGroupId) return
		setForm((f) => ({ ...f, examCenterId: String(num(examCenters[0].fk_univ_ec_id)) }))
	}, [examCenters, form.examGroupId])

	const examDates = useMemo(
		() =>
			dedupeBy(
				ecGroupRows.filter((r) => num(r.fk_univ_ec_id) === Number(form.examCenterId)),
				(r) => txt(r.exam_date),
			),
		[ecGroupRows, form.examCenterId],
	)

	useEffect(() => {
		if (!examDates.length || !form.examCenterId) return
		setForm((f) => ({ ...f, examDate: txt(examDates[0].exam_date) }))
	}, [examDates, form.examCenterId])

	// ── eg_ec_qc_filters → question papers ───────────────────────────────────────
	useEffect(() => {
		let cancelled = false
		async function load() {
			if (!form.academicYearId || !form.examGroupId || !form.examCenterId || !form.examDate) {
				setQuestionPaperRows([])
				return
			}
			try {
				const groups = await getExamCenterFilterGroups({
					flag: 'eg_ec_qc_filters',
					academicYearId: Number(form.academicYearId),
					examGroupId: Number(form.examGroupId),
					univExamcenterId: Number(form.examCenterId),
					examDate: form.examDate,
				})
				if (cancelled) return
				setQuestionPaperRows(groups[0] ?? [])
			} catch (e) {
				if (!cancelled) toastError(e, 'Failed to load question papers')
			}
		}
		void load()
		return () => {
			cancelled = true
		}
	}, [form.academicYearId, form.examGroupId, form.examCenterId, form.examDate])

	useEffect(() => {
		if (!questionPaperRows.length || !form.examDate) return
		setForm((f) => ({
			...f,
			questionPaperCode: txt(questionPaperRows[0].questionpaper_code ?? questionPaperRows[0].questionPaperCode),
		}))
	}, [questionPaperRows, form.examDate])

	const academicYearOptions: SelectOption[] = useMemo(
		() => academicYears.map((r) => ({ value: String(num(r.fk_academic_year_id)), label: txt(r.academic_year) })),
		[academicYears],
	)
	const examGroupOptions: SelectOption[] = useMemo(
		() => examGroups.map((r) => ({ value: String(num(r.fk_univ_exam_group_id)), label: txt(r.exam_group_code) })),
		[examGroups],
	)
	const examCenterOptions: SelectOption[] = useMemo(
		() => examCenters.map((r) => ({ value: String(num(r.fk_univ_ec_id)), label: `${txt(r.ec_code)} - ${txt(r.ec_name)}` })),
		[examCenters],
	)
	const examDateOptions: SelectOption[] = useMemo(
		() => examDates.map((r) => ({ value: txt(r.exam_date), label: txt(r.exam_date) })),
		[examDates],
	)
	const questionPaperOptions: SelectOption[] = useMemo(
		() =>
			questionPaperRows.map((r) => {
				const c = txt(r.questionpaper_code ?? r.questionPaperCode)
				return { value: c, label: txt(r.Questionpaper_name ?? r.questionpaper_name) || c }
			}),
		[questionPaperRows],
	)

	// Header line (Angular headerData()).
	const header = useMemo(() => {
		const eg = examGroups.find((x) => num(x.fk_univ_exam_group_id) === Number(form.examGroupId))
		const ec = examCenters.find((x) => num(x.fk_univ_ec_id) === Number(form.examCenterId))
		return {
			examGroupCode: txt(eg?.exam_group_code),
			examCenterCode: txt(ec?.ec_name),
			examDate: form.examDate,
			questionPaperCode: form.questionPaperCode,
		}
	}, [examGroups, examCenters, form])

	async function onGetList() {
		if (!form.academicYearId || !form.examGroupId || !form.examCenterId || !form.examDate || !form.questionPaperCode) {
			toast.info('Please Select Required Filters')
			return
		}
		setFlag(true)
		setLoadingList(true)
		try {
			const rows = await listExamBundlesByCode({
				univExamcenterId: Number(form.examCenterId),
				examGroupId: Number(form.examGroupId),
				academicYearId: Number(form.academicYearId),
				examDate: form.examDate,
				questionPaperCode: form.questionPaperCode,
			})
			setBundles(rows)
		} catch (e) {
			toastError(e, 'Failed to load bundles')
			setBundles([])
		} finally {
			setLoadingList(false)
		}
	}

	// Load OMR barcode rows for one bundle (id) or all (0), then print stickers.
	// mode 'stickers' = English layout, 'stickers-gu' = Gujarati layout (Angular
	// getPrintStickersData vs getPrintStickersDataNew — same proc, different sheet).
	async function loadAndPrintStickers(bundleId: number, mode: PrintMode = 'stickers') {
		setLoadingList(true)
		try {
			let rows = await getExamCenterBundleByCode({
				flag: 'bundle_omr_details',
				univExamcenterId: Number(form.examCenterId),
				examGroupId: Number(form.examGroupId),
				academicYearId: Number(form.academicYearId),
				examDate: form.examDate,
				questionPaperCode: form.questionPaperCode,
				bundleId,
			})
			// Angular flattens a nested first element when present.
			if (Array.isArray(rows[0])) rows = rows[0] as unknown as Row[]
			if (!rows.length) {
				toast.info('No stickers found for this bundle.')
				return
			}
			setStickerRows(rows)
			triggerPrint(mode)
		} catch (e) {
			toastError(e, 'Failed to load stickers')
		} finally {
			setLoadingList(false)
		}
	}

	const columnDefs = useMemo<ColDef<Row>[]>(
		() => [
			{ headerName: 'SL No.', valueGetter: rowIndexGetter, width: 80, flex: 0 },
			{ headerName: 'Bundle Name', minWidth: 160, valueGetter: (p) => txt(p.data?.exam_bundle_name) },
			{ headerName: 'Total Answer Books', minWidth: 150, valueGetter: (p) => txt(p.data?.total_answer_books) },
			{ headerName: 'Start Seat No', minWidth: 130, valueGetter: (p) => txt(p.data?.start_ec_seatno) },
			{ headerName: 'End Seat No', minWidth: 130, valueGetter: (p) => txt(p.data?.end_ec_seatno) },
			{
				headerName: 'Actions',
				minWidth: 170,
				flex: 0,
				cellRenderer: (p: ICellRendererParams<Row>) => {
					if (!p.data) return null
					const id = num(p.data.pk_univ_exam_bundle_id)
					return (
						<div className="flex items-center gap-3">
							<button
								type="button"
								title="Print Stickers"
								className="text-[hsl(var(--primary))] hover:underline text-[12px]"
								onClick={() => void loadAndPrintStickers(id)}
							>
								Stickers
							</button>
							<span className="text-muted-foreground">|</span>
							<button
								type="button"
								title="Print Stickers (Gujarati)"
								className="text-[hsl(var(--primary))] hover:underline text-[12px]"
								onClick={() => void loadAndPrintStickers(id, 'stickers-gu')}
							>
								Stickers New
							</button>
						</div>
					)
				},
			},
		],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[form],
	)

	// ── Sticker print layout (Angular exam-bundle-print-stickers / -gu) ──────────
	if (printMode === 'stickers' || printMode === 'stickers-gu') {
		// Group by fk_univ_exam_bundle_id (Angular groupByScanBundleId).
		const grouped = new Map<string, Row[]>()
		for (const r of stickerRows) {
			const key = String(r.fk_univ_exam_bundle_id ?? '0')
			if (!grouped.has(key)) grouped.set(key, [])
			grouped.get(key)!.push(r)
		}
		const groups = Array.from(grouped.values())
		// Gujarati variant uses a wider sticker-row margin; both render the row as
		// a block so cells wrap into a grid (Angular `display:block` tr).
		const isGu = printMode === 'stickers-gu'
		const rowStyle = { display: 'block', margin: isGu ? '0 35px' : '0' } as const
		const cellStyle = {
			border: '1px solid #000',
			padding: '4px',
			verticalAlign: 'top' as const,
			display: 'inline-block' as const,
		}
		return (
			<div className="text-black" style={{ fontFamily: 'Arial, sans-serif', padding: '8px' }}>
				{groups.map((rows, gi) => {
					const head = rows[0] ?? {}
					return (
						<div key={gi} style={{ pageBreakAfter: gi < groups.length - 1 ? 'always' : 'auto', marginBottom: '16px' }}>
							<table style={{ width: '100%', borderCollapse: 'collapse' }}>
								<thead>
									<tr>
										<td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>
											<span style={{ fontWeight: 'bold', fontSize: '14px' }}>{header.examGroupCode}</span>
											<br />
											<span>{txt(head.ec_code)}&nbsp;|&nbsp;{txt(head.bundle_number)}</span>
											<br />
											<span>{txt(head.exam_date)}</span>
											<br />
											<span>{txt(head.subject_name)}-{txt(head.subject_code)}</span>
										</td>
									</tr>
								</thead>
								<tbody>
									<tr style={rowStyle}>
										{rows.map((data, i) => (
											<td key={i} style={cellStyle}>
												<span style={{ display: 'flex', justifyContent: 'center', marginBottom: '-3px', fontSize: '12px' }}>
													<span>
														<b>{txt(data.ec_seatno)}</b>({txt(data.hallticket_number)})
													</span>
												</span>
												{data.omr_barcode ? (
													// eslint-disable-next-line @next/next/no-img-element
													<img
														src={`data:image/jpg;base64,${txt(data.omr_barcode)}`}
														alt=""
														style={{ height: 30, width: 180 }}
													/>
												) : null}
												<span style={{ display: 'flex', justifyContent: 'center', fontSize: '6.5px', marginTop: '1px' }}>
													{txt(data.exam_date)}({txt(data.subject_code)})
												</span>
											</td>
										))}
									</tr>
								</tbody>
							</table>
						</div>
					)
				})}
			</div>
		)
	}

	return (
		<PageContainer className="space-y-4">
			<PageHeader
				title="Exam Bundle Print"
				subtitle="Exam papers delivery · Exam bundles · Print barcode stickers"
			/>

			<div className="app-card p-3 border-t-[3px] border-t-amber-300">
				<div className="flex items-center justify-between gap-2 border-b border-border pb-3">
					<div className="flex items-center gap-2">
						<Layers className="h-4 w-4 text-blue-700" aria-hidden />
						<h2 className="app-card-title">Exam Bundles</h2>
					</div>
					<button
						type="button"
						className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
						onClick={() => setFiltersOpen((v) => !v)}
						aria-expanded={filtersOpen}
					>
						<span>Filter</span>
						<Filter className="h-4 w-4" aria-hidden />
						<ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
					</button>
				</div>
				{filtersOpen && (
					<div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
						<div className="space-y-1 md:col-span-2">
							<label className="text-[12px] text-muted-foreground">Academic Year *</label>
							<Select
								options={academicYearOptions}
								value={form.academicYearId}
								onChange={(v) => setForm((f) => ({ ...f, academicYearId: v ?? '' }))}
								disabled={loadingFilters}
							/>
						</div>
						<div className="space-y-1 md:col-span-2">
							<label className="text-[12px] text-muted-foreground">Exam Group *</label>
							<Select
								options={examGroupOptions}
								value={form.examGroupId}
								onChange={(v) => setForm((f) => ({ ...f, examGroupId: v ?? '' }))}
							/>
						</div>
						<div className="space-y-1 md:col-span-3">
							<label className="text-[12px] text-muted-foreground">Exam Center *</label>
							<Select
								options={examCenterOptions}
								value={form.examCenterId}
								onChange={(v) => setForm((f) => ({ ...f, examCenterId: v ?? '' }))}
								searchable
							/>
						</div>
						<div className="space-y-1 md:col-span-2">
							<label className="text-[12px] text-muted-foreground">Exam Date *</label>
							<Select
								options={examDateOptions}
								value={form.examDate}
								onChange={(v) => setForm((f) => ({ ...f, examDate: v ?? '' }))}
								searchable
							/>
						</div>
						<div className="space-y-1 md:col-span-2">
							<label className="text-[12px] text-muted-foreground">Subject (QP) *</label>
							<Select
								options={questionPaperOptions}
								value={form.questionPaperCode}
								onChange={(v) => setForm((f) => ({ ...f, questionPaperCode: v ?? '' }))}
							/>
						</div>
						<div className="md:col-span-1">
							<Button type="button" onClick={() => void onGetList()} disabled={loadingList}>
								Get List
							</Button>
						</div>
					</div>
				)}
			</div>

			{flag && (
				<div className="app-card overflow-hidden">
					<div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/40">
						<h3 className="text-[13px] font-semibold text-[hsl(var(--card-title))]">
							Scan Bundles — {header.examGroupCode} / {header.examCenterCode} / {header.examDate} / {header.questionPaperCode}
						</h3>
						{bundles.length > 0 && (
							<Button size="sm" variant="outline" className="h-8 gap-1.5 text-[11px]" onClick={() => void loadAndPrintStickers(0)}>
								<Printer className="h-3.5 w-3.5" /> Bulk Print Stickers
							</Button>
						)}
					</div>
					<div className="p-2">
						<DataTable
							rowData={bundles}
							columnDefs={columnDefs}
							loading={loadingList}
							pagination
							toolbar={{ search: true, searchPlaceholder: 'Search…', pdfDocumentTitle: 'Exam Bundles' }}
						/>
					</div>
				</div>
			)}
		</PageContainer>
	)
}
