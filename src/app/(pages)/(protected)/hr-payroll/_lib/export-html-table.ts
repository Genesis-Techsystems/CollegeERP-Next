/** Angular `exportAsExcel()` — HTML table → .xls download. */
export function exportHtmlTableAsExcel(
  tableEl: HTMLElement | null,
  fileName: string,
  options?: { stripActionClass?: string },
): void {
  if (!tableEl || typeof document === 'undefined') return

  const stripClass = options?.stripActionClass ?? 'action'
  const clone = tableEl.cloneNode(true) as HTMLElement
  clone.querySelectorAll(`.${stripClass}`).forEach((node) => node.remove())

  const uri = 'data:application/vnd.ms-excel;base64,'
  const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>`

  const base64 = (s: string) => {
    if (typeof window === 'undefined') return ''
    return window.btoa(unescape(encodeURIComponent(s)))
  }
  const format = (s: string, c: Record<string, string>) =>
    s.replace(/{(\w+)}/g, (_, p: string) => c[p] ?? '')

  const ctx = { worksheet: 'Worksheet', table: clone.innerHTML }
  const link = document.createElement('a')
  link.download = fileName.endsWith('.xls') ? fileName : `${fileName}.xls`
  link.href = uri + base64(format(template, ctx))
  link.click()
}
