type StickerRow = Record<string, unknown>

const txt = (v: unknown): string => {
	if (typeof v === 'string') return v
	if (typeof v === 'number' || typeof v === 'boolean') return String(v)
	return ''
}

const escapeHtml = (value: string) =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')

/** Angular exam-bundle-print-stickers.component.scss */
const STICKER_PRINT_STYLES = `
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    font-family: Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .layout {
    margin: 0 auto;
    width: 990px;
    max-width: 100%;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-family: Arial, sans-serif;
  }
  .header-cell {
    width: 100%;
    border: 1px solid #000;
    padding: 25px 0 9px;
    text-align: center;
    vertical-align: middle;
    font-size: 10px;
    font-weight: bold;
  }
  .span-1 {
    font-size: 10px;
    font-weight: bold;
  }
  .sticker-td {
    float: left;
    width: 25%;
    border: none;
    vertical-align: middle;
    padding: 27px 0 9px;
    text-align: center;
  }
  .sticker-row {
    display: block;
  }
  .sticker-row-gu {
    display: block;
    margin: 0 35px;
  }
  .sticker-row::after,
  .sticker-row-gu::after {
    content: '';
    display: table;
    clear: both;
  }
  .page-break {
    page-break-before: always;
  }
  @page {
    size: A4;
    margin: 10mm;
  }
  @media print {
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    .page-break { page-break-before: always; }
  }
`

function groupByBundleId(rows: StickerRow[]): StickerRow[][] {
	const grouped = new Map<string, StickerRow[]>()
	for (const r of rows) {
		const key = String(
			r.fk_univ_exam_scan_bundle_id ?? r.fk_univ_exam_bundle_id ?? '0',
		)
		if (!grouped.has(key)) grouped.set(key, [])
		grouped.get(key)!.push(r)
	}
	return Array.from(grouped.values())
}

function stickerCellHtml(data: StickerRow): string {
	const barcode = txt(data.omr_barcode)
	const img = barcode
		? `<img src="data:image/jpg;base64,${barcode}" style="height:30px;width:180px;" alt="" />`
		: ''
	return `
    <td class="sticker-td">
      <span style="display:flex;justify-content:center;margin-bottom:-3px;font-size:12px;">
        <span><b>${escapeHtml(txt(data.ec_seatno))}</b>(${escapeHtml(txt(data.hallticket_number))})</span>
      </span>
      ${img}
      <span style="display:flex;justify-content:center;font-size:6.5px;margin-top:1px;">
        ${escapeHtml(txt(data.exam_date))}(${escapeHtml(txt(data.subject_code))})
      </span>
    </td>`
}

function buildStickersHtml(
	stickerRows: StickerRow[],
	examGroupCode: string,
	variant: 'stickers' | 'stickers-gu',
): string {
	const groups = groupByBundleId(stickerRows)
	const rowClass = variant === 'stickers-gu' ? 'sticker-row-gu' : 'sticker-row'

	const sections = groups
		.map((rows, gi) => {
			const head = rows[0] ?? {}
			const cells = rows.map(stickerCellHtml).join('')
			return `
      <div class="room-section${gi > 0 ? ' page-break' : ''}">
        <table id="table-print">
          <thead>
            <tr>
              <td class="header-cell">
                <span class="span-1">${escapeHtml(examGroupCode)}</span><br>
                <span>${escapeHtml(txt(head.ec_code))}&nbsp;|&nbsp;${escapeHtml(txt(head.bundle_number))}</span><br>
                <span>${escapeHtml(txt(head.exam_date))}</span><br>
                <span>${escapeHtml(txt(head.subject_name))}-${escapeHtml(txt(head.subject_code))}</span>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr class="${rowClass}">${cells}</tr>
          </tbody>
        </table>
      </div>`
		})
		.join('')

	return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Exam Bundle Stickers</title>
  <style>${STICKER_PRINT_STYLES}</style>
</head>
<body>
  <div class="layout">${sections}</div>
</body>
</html>`
}

function printHtmlInIframe(html: string): void {
	const frame = document.createElement('iframe')
	frame.setAttribute('aria-hidden', 'true')
	frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
	document.body.appendChild(frame)

	const fdoc = frame.contentDocument
	const win = frame.contentWindow
	if (!fdoc || !win) {
		frame.remove()
		return
	}

	fdoc.open()
	fdoc.write(html)
	fdoc.close()

	const cleanup = () => frame.remove()
	win.addEventListener('afterprint', cleanup)

	const images = fdoc.images
	if (images.length === 0) {
		setTimeout(() => {
			win.focus()
			win.print()
			setTimeout(cleanup, 1500)
		}, 50)
		return
	}

	let loaded = 0
	const tryPrint = () => {
		loaded += 1
		if (loaded >= images.length) {
			setTimeout(() => {
				win.focus()
				win.print()
				setTimeout(cleanup, 1500)
			}, 50)
		}
	}
	for (let i = 0; i < images.length; i++) {
		const img = images[i]
		if (img.complete) tryPrint()
		else {
			img.addEventListener('load', tryPrint)
			img.addEventListener('error', tryPrint)
		}
	}
}

/** Isolated iframe print — avoids AppShell blank-sheet issues. */
export function printExamBundleStickersInIframe(
	stickerRows: StickerRow[],
	examGroupCode: string,
	variant: 'stickers' | 'stickers-gu',
): void {
	if (!stickerRows.length) return
	const html = buildStickersHtml(stickerRows, examGroupCode, variant)
	printHtmlInIframe(html)
}
