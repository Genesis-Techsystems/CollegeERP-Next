'use client'

import { printExamBundleStickersInIframe } from './printExamBundleStickers'

type StickerRow = Record<string, unknown>

const txt = (v: unknown): string => {
	if (typeof v === 'string') return v
	if (typeof v === 'number' || typeof v === 'boolean') return String(v)
	return ''
}

function groupByBundleId(rows: StickerRow[]): StickerRow[][] {
	const grouped = new Map<string, StickerRow[]>()
	for (const r of rows) {
		const key = String(r.fk_univ_exam_scan_bundle_id ?? r.fk_univ_exam_bundle_id ?? '0')
		if (!grouped.has(key)) grouped.set(key, [])
		grouped.get(key)!.push(r)
	}
	return Array.from(grouped.values())
}

function StickerToolbar({ onBack, onPrint }: { onBack: () => void; onPrint: () => void }) {
	return (
		<div data-print-hide className="flex justify-end gap-0 m-2.5">
			<button
				type="button"
				onClick={onBack}
				className="ml-4 rounded border border-border bg-white px-4 py-1.5 text-sm font-medium text-black"
			>
				Back
			</button>
			<button
				type="button"
				onClick={onPrint}
				className="ml-4 rounded px-4 py-1.5 text-sm font-medium text-white"
				style={{ background: '#1a237e' }}
			>
				Print
			</button>
		</div>
	)
}

function StickerCell({ data }: { data: StickerRow }) {
	const barcode = txt(data.omr_barcode)
	return (
		<div
			style={{
				width: '25%',
				boxSizing: 'border-box',
				padding: '27px 0 9px',
				textAlign: 'center',
				float: 'left',
				pageBreakInside: 'avoid',
				breakInside: 'avoid',
			}}
		>
			<div
				style={{
					display: 'flex',
					justifyContent: 'center',
					marginBottom: '-3px',
					fontSize: '12px',
				}}
			>
				<span>
					<b>{txt(data.ec_seatno)}</b>({txt(data.hallticket_number)})
				</span>
			</div>
			{barcode ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img src={`data:image/jpg;base64,${barcode}`} alt="" style={{ height: 30, width: 180 }} />
			) : null}
			<div
				style={{
					display: 'flex',
					justifyContent: 'center',
					fontSize: '6.5px',
					marginTop: '1px',
				}}
			>
				{txt(data.exam_date)}({txt(data.subject_code)})
			</div>
		</div>
	)
}

function StickerHeader({
	examGroupCode,
	head,
}: {
	examGroupCode: string
	head: StickerRow
}) {
	return (
		<div
			style={{
				border: '1px solid #000',
				padding: '25px 0 9px',
				textAlign: 'center',
				fontSize: '10px',
				fontWeight: 'bold',
				marginBottom: '8px',
				pageBreakAfter: 'avoid',
				breakAfter: 'avoid',
			}}
		>
			<div style={{ fontSize: '10px', fontWeight: 'bold' }}>{examGroupCode}</div>
			<div>
				{txt(head.ec_code)}&nbsp;|&nbsp;{txt(head.bundle_number ?? head.bundleNumber)}
			</div>
			<div>{txt(head.exam_date)}</div>
			<div>
				{txt(head.subject_name)}-{txt(head.subject_code)}
			</div>
		</div>
	)
}

export type StickerVariant = 'stickers' | 'stickers-gu'

export interface ExamBundlePrintStickersViewProps {
	stickerRows: StickerRow[]
	examGroupCode: string
	variant: StickerVariant
	onBack: () => void
}

/** Angular exam-bundle-print-stickers / exam-bundle-print-stickers-gu preview. */
export function ExamBundlePrintStickersView({
	stickerRows,
	examGroupCode,
	variant,
	onBack,
}: ExamBundlePrintStickersViewProps) {
	const groups = groupByBundleId(stickerRows)
	const isGu = variant === 'stickers-gu'

	function handlePrint() {
		printExamBundleStickersInIframe(stickerRows, examGroupCode, variant)
	}

	return (
		<div
			data-print-root
			className="text-black"
			style={{
				fontFamily: 'Arial, sans-serif',
				padding: '8px 20px 20px',
				maxWidth: '990px',
				margin: '0 auto',
				backgroundColor: '#fff',
			}}
		>
			<StickerToolbar onBack={onBack} onPrint={handlePrint} />

			{groups.map((rows, gi) => {
				const head = rows[0] ?? {}
				return (
					<div key={gi} className={gi > 0 ? 'page-break' : undefined} style={{ marginBottom: '20px' }}>
						<StickerHeader examGroupCode={examGroupCode} head={head} />
						<div style={{ overflow: 'auto', margin: isGu ? '0 35px' : '0 4px' }}>
							{rows.map((data, i) => (
								<StickerCell key={i} data={data} />
							))}
						</div>
					</div>
				)
			})}

			<StickerToolbar onBack={onBack} onPrint={handlePrint} />
		</div>
	)
}
