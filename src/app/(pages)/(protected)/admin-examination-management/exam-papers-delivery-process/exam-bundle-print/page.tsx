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
 * sticker sub-components (English + Gujarati) open a preview with Back/Print
 * before the browser print dialog.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Printer } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { GlobalFilterBar, GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { getSecuredValue, setSecuredValue } from '@/common/generic-functions'
import { rowIndexGetter } from '@/lib/utils'
import { toast } from 'sonner'
import { toastError } from '@/lib/toast'
import { ExamBundlePrintStickersView } from './ExamBundlePrintStickersView'
import {
	getExamCenterBundleByCode,
	getExamCenterFilterGroups,
	listExamBundlesByCode,
	type AnyRow,
} from '@/services/exam-papers-delivery'

type Row = AnyRow

/** Angular mat-option `[value]="0"` — All exam centers / dates / subjects. */
const ALL = '0'

/** Mirrors Angular `ParametersService.examScanBundlesFiltersData`. */
const FILTERS_STORAGE_KEY = 'examScanBundlesFiltersData'

interface SavedFilterRow {
	academicYearId?: string | number
	examGroupId?: string | number
	examCenterId?: string | number
	examDate?: string | number
	questionPaperCode?: string | number
}

function loadSavedFilters(): SavedFilterRow | null {
	const saved = getSecuredValue<SavedFilterRow[]>(FILTERS_STORAGE_KEY)
	if (Array.isArray(saved) && saved[0]) return saved[0]
	return null
}

function saveFiltersToSession(form: FormState): void {
	setSecuredValue(FILTERS_STORAGE_KEY, [form])
}

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

function makePrintActionsRenderer(onPrint: (bundleId: number) => void) {
	return (p: ICellRendererParams<Row>) => {
		if (!p.data) return null
		const id = num(p.data.pk_univ_exam_bundle_id)
		return (
			<div className="flex items-center justify-center">
				<Button
					type="button"
					size="sm"
					variant="ghost"
					className="h-7 w-7 p-0"
					title="Print Stickers"
					onClick={() => onPrint(id)}
				>
					<Printer className="h-3.5 w-3.5" />
				</Button>
			</div>
		)
	}
}

export default function ExamBundlePrintPage() {
	const [form, setForm] = useState<FormState>(EMPTY_FORM)
	const [egFilterRows, setEgFilterRows] = useState<Row[]>([])
	const [ecGroupRows, setEcGroupRows] = useState<Row[]>([])
	const [questionPaperRows, setQuestionPaperRows] = useState<Row[]>([])
	const [bundles, setBundles] = useState<Row[]>([])
	const [loadingFilters, setLoadingFilters] = useState(false)
	const [loadingList, setLoadingList] = useState(false)
	const [hasFetched, setHasFetched] = useState(false)

	const [stickerRows, setStickerRows] = useState<Row[]>([])
	const [stickerView, setStickerView] = useState<PrintMode | null>(null)
	const pendingSaved = useRef<SavedFilterRow | null>(loadSavedFilters())

	const clearListState = useCallback(() => {
		setBundles([])
		setHasFetched(false)
	}, [])

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
		const saved = pendingSaved.current
		const id =
			saved?.academicYearId != null
				? String(saved.academicYearId)
				: String(num(academicYears[0].fk_academic_year_id))
		setForm((f) => ({ ...f, academicYearId: id }))
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
		if (!examGroups.length || !form.academicYearId || form.examGroupId) return
		const saved = pendingSaved.current
		const id =
			saved?.examGroupId != null
				? String(saved.examGroupId)
				: String(num(examGroups[0].fk_univ_exam_group_id))
		setForm((f) => ({ ...f, examGroupId: id }))
	}, [examGroups, form.academicYearId, form.examGroupId])

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
		if (!examCenters.length || !form.examGroupId || form.examCenterId !== '') return
		const saved = pendingSaved.current
		const id = saved?.examCenterId != null ? String(saved.examCenterId) : ALL
		setForm((f) => ({ ...f, examCenterId: id }))
	}, [examCenters, form.examGroupId, form.examCenterId])

	// Angular selectedExamCenter: when center is 0 (All), dates come from the full list.
	const examDates = useMemo(() => {
		const source =
			Number(form.examCenterId) === 0
				? ecGroupRows
				: ecGroupRows.filter((r) => num(r.fk_univ_ec_id) === Number(form.examCenterId))
		return dedupeBy(source, (r) => txt(r.exam_date))
	}, [ecGroupRows, form.examCenterId])

	useEffect(() => {
		if (form.examCenterId === '' || form.examDate !== '') return
		const saved = pendingSaved.current
		const id = saved?.examDate != null ? String(saved.examDate) : ALL
		setForm((f) => ({ ...f, examDate: id }))
	}, [form.examCenterId, form.examDate])

	// ── eg_ec_qc_filters → question papers (Angular loadSubjectDropdown) ───────────
	useEffect(() => {
		let cancelled = false
		async function load() {
			if (!form.academicYearId || !form.examGroupId || form.examCenterId === '' || form.examDate === '') {
				setQuestionPaperRows([])
				return
			}
			try {
				const groups = await getExamCenterFilterGroups({
					flag: 'eg_ec_qc_filters',
					academicYearId: Number(form.academicYearId),
					examGroupId: Number(form.examGroupId),
					univExamcenterId: Number(form.examCenterId) || 0,
					examDate: form.examDate === ALL ? '1900-01-01' : form.examDate,
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
		if (form.examCenterId === '' || form.examDate === '' || form.questionPaperCode !== '') return
		const saved = pendingSaved.current
		setForm((f) => ({
			...f,
			questionPaperCode: saved?.questionPaperCode != null ? String(saved.questionPaperCode) : ALL,
		}))
		if (saved) pendingSaved.current = null
	}, [form.examCenterId, form.examDate, form.questionPaperCode, questionPaperRows])

	const academicYearOptions: SelectOption[] = useMemo(
		() => academicYears.map((r) => ({ value: String(num(r.fk_academic_year_id)), label: txt(r.academic_year) })),
		[academicYears],
	)
	const examGroupOptions: SelectOption[] = useMemo(
		() => examGroups.map((r) => ({ value: String(num(r.fk_univ_exam_group_id)), label: txt(r.exam_group_code) })),
		[examGroups],
	)
	const examCenterOptions: SelectOption[] = useMemo(
		() => [
			{ value: ALL, label: 'All' },
			...examCenters.map((r) => ({
				value: String(num(r.fk_univ_ec_id)),
				label: `${txt(r.ec_code)} - ${txt(r.ec_name)}`,
			})),
		],
		[examCenters],
	)
	const examDateOptions: SelectOption[] = useMemo(
		() => [{ value: ALL, label: 'All' }, ...examDates.map((r) => ({ value: txt(r.exam_date), label: txt(r.exam_date) }))],
		[examDates],
	)
	const questionPaperOptions: SelectOption[] = useMemo(
		() => [
			{ value: ALL, label: 'All' },
			...questionPaperRows.map((r) => {
				const c = txt(r.questionpaper_code ?? r.questionPaperCode)
				return { value: c, label: txt(r.Questionpaper_name ?? r.questionpaper_name) || c }
			}),
		],
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

	const tableSummaryText = useMemo(() => {
		const centerLabel =
			form.examCenterId === ALL
				? 'All'
				: examCenterOptions.find((o) => o.value === form.examCenterId)?.label || header.examCenterCode || 'All'
		const dateLabel = form.examDate === ALL ? 'All' : header.examDate
		const qp = questionPaperOptions.find((o) => o.value === form.questionPaperCode)?.label
		const subjectLabel = form.questionPaperCode === ALL ? 'All' : qp || header.questionPaperCode
		return `${header.examGroupCode || '-'} / ${centerLabel} / ${dateLabel} / ${subjectLabel}`
	}, [header, form.examCenterId, form.examDate, form.questionPaperCode, examCenterOptions, questionPaperOptions])

	function onAcademicYearChange(v: string | null) {
		clearListState()
		pendingSaved.current = null
		setForm({
			academicYearId: v ?? '',
			examGroupId: '',
			examCenterId: '',
			examDate: '',
			questionPaperCode: '',
		})
	}

	function onExamGroupChange(v: string | null) {
		clearListState()
		pendingSaved.current = null
		setForm((f) => ({
			...f,
			examGroupId: v ?? '',
			examCenterId: '',
			examDate: '',
			questionPaperCode: '',
		}))
	}

	function onExamCenterChange(v: string | null) {
		clearListState()
		pendingSaved.current = null
		setForm((f) => ({
			...f,
			examCenterId: v ?? '',
			examDate: '',
			questionPaperCode: '',
		}))
	}

	function onExamDateChange(v: string | null) {
		clearListState()
		pendingSaved.current = null
		setForm((f) => ({ ...f, examDate: v ?? '', questionPaperCode: '' }))
	}

	function onQuestionPaperChange(v: string | null) {
		clearListState()
		pendingSaved.current = null
		setForm((f) => ({ ...f, questionPaperCode: v ?? '' }))
	}

	async function onGetList() {
		if (
			!form.academicYearId ||
			!form.examGroupId ||
			form.examCenterId === '' ||
			form.examDate === '' ||
			form.questionPaperCode === ''
		) {
			toast.info('Please Select Required Filters')
			return
		}
		setHasFetched(true)
		setLoadingList(true)
		try {
			const rows = await listExamBundlesByCode({
				univExamcenterId: Number(form.examCenterId),
				examGroupId: Number(form.examGroupId),
				academicYearId: Number(form.academicYearId),
				questionPaperCode: form.questionPaperCode,
			})
			setBundles(rows)
			if (rows.length === 0) toast.info('No Record(s) found.')
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
			// Angular getPrintStickersData / getPrintStickersDataNew — form values as-is (0 = All).
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
			// Angular printStickers / printStickersNew: persist filters for printBack().
			saveFiltersToSession(form)
			setStickerRows(rows)
			setStickerView(mode)
		} catch (e) {
			toastError(e, 'Failed to load stickers')
		} finally {
			setLoadingList(false)
		}
	}

	const printActionsRef = useRef<(bundleId: number) => void>(() => {})
	printActionsRef.current = (bundleId) => {
		void loadAndPrintStickers(bundleId, 'stickers-gu')
	}

	const columnDefs = useMemo<ColDef<Row>[]>(
		() => [
			{ headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
			{ headerName: 'Bundle Name', minWidth: 180, valueGetter: (p) => txt(p.data?.exam_bundle_name) || '-' },
			{ headerName: 'Total Answer Books', minWidth: 160, valueGetter: (p) => txt(p.data?.total_answer_books) || '-' },
			{ headerName: 'Start Seat No', minWidth: 130, valueGetter: (p) => txt(p.data?.start_ec_seatno) || '-' },
			{ headerName: 'End Seat No', minWidth: 130, valueGetter: (p) => txt(p.data?.end_ec_seatno) || '-' },
			{
				headerName: 'Actions',
				minWidth: 70,
				flex: 0,
				cellRenderer: makePrintActionsRenderer((id) => printActionsRef.current(id)),
			},
		],
		[],
	)

	// ── Sticker preview (Angular exam-bundle-print-stickers / -gu) ─────────────
	if (stickerView === 'stickers' || stickerView === 'stickers-gu') {
		return (
			<ExamBundlePrintStickersView
				stickerRows={stickerRows}
				examGroupCode={header.examGroupCode}
				variant={stickerView}
				onBack={() => setStickerView(null)}
			/>
		)
	}

	return (
		<PageContainer className="space-y-4">
			<h2 className="px-1 text-lg font-semibold tracking-tight text-foreground">Exam Bundle Print</h2>

			<GlobalFilterBar title="Exam Bundles" defaultOpen={false}>
				<GlobalFilterBarRow>
					<GlobalFilterField label="Academic Year">
						<Select
							options={academicYearOptions}
							value={form.academicYearId}
							onChange={onAcademicYearChange}
							placeholder="Academic Year"
							disabled={loadingFilters}
						/>
					</GlobalFilterField>
					<GlobalFilterField label="Exam Group">
						<Select
							options={examGroupOptions}
							value={form.examGroupId}
							onChange={onExamGroupChange}
							placeholder="Exam Group"
						/>
					</GlobalFilterField>
					<GlobalFilterField label="Exam Center">
						<Select
							options={examCenterOptions}
							value={form.examCenterId}
							onChange={onExamCenterChange}
							placeholder="Exam Center"
							searchable
						/>
					</GlobalFilterField>
					<GlobalFilterField label="Exam Date">
						<Select
							options={examDateOptions}
							value={form.examDate}
							onChange={onExamDateChange}
							placeholder="Exam Date"
							searchable
						/>
					</GlobalFilterField>
					<GlobalFilterField label="Subject">
						<Select
							options={questionPaperOptions}
							value={form.questionPaperCode}
							onChange={onQuestionPaperChange}
							placeholder="Subject"
							searchable
						/>
					</GlobalFilterField>
					<GlobalFilterField label=" " className="global-filter-field--action global-filter-field--shrink">
						<Button
							size="sm"
							onClick={() => void onGetList()}
							disabled={loadingList}
							className="h-8 shrink-0 px-3 text-[12px]"
						>
							Get List
						</Button>
					</GlobalFilterField>
				</GlobalFilterBarRow>
			</GlobalFilterBar>

			{hasFetched && (
				<div className="app-card overflow-hidden">
					<div className="px-3 pb-3 pt-2">
						<div className="overflow-hidden rounded-lg border border-border bg-card">
							<DataTable
								rowData={bundles}
								columnDefs={columnDefs}
								loading={loadingList}
								pagination
								title={
									<p
										className="truncate text-[12px] font-medium text-[hsl(var(--primary))]"
										title={tableSummaryText}
									>
										{tableSummaryText}
									</p>
								}
								toolbar={{
									search: true,
									searchPlaceholder: 'Search…',
									pdfDocumentTitle: 'Exam Bundles',
								}}
								toolbarTrailing={
									bundles.length > 0 ? (
										<Button
											type="button"
											size="sm"
											variant="outline"
											className="app-data-table-toolbar-btn h-9 gap-1.5 px-3 text-[12px]"
											onClick={() => void loadAndPrintStickers(0, 'stickers-gu')}
										>
											<Printer className="h-3.5 w-3.5" />
											Bulk Print Stickers
										</Button>
									) : null
								}
							/>
						</div>
					</div>
				</div>
			)}
		</PageContainer>
	)
}
