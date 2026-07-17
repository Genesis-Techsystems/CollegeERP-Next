/** Angular exam-form / print-receipt helpers. */

export function numToWords(num: unknown): string {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
    'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ',
    'Seventeen ', 'Eighteen ', 'Nineteen ',
  ]
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const raw = String(num ?? '')
  if (raw.length > 9) return 'overflow'
  const n = (`000000000${raw}`).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/)
  if (!n) return ''
  let str = ''
  str += Number(n[1]) !== 0 ? `${a[Number(n[1])] || `${b[Number(n[1][0])]} ${a[Number(n[1][1])]}`}Crore ` : ''
  str += Number(n[2]) !== 0 ? `${a[Number(n[2])] || `${b[Number(n[2][0])]} ${a[Number(n[2][1])]}`}Lakh ` : ''
  str += Number(n[3]) !== 0 ? `${a[Number(n[3])] || `${b[Number(n[3][0])]} ${a[Number(n[3][1])]}`}Thousand ` : ''
  str += Number(n[4]) !== 0 ? `${a[Number(n[4])] || `${b[Number(n[4][0])]} ${a[Number(n[4][1])]}`}Hundred ` : ''
  str += Number(n[5]) !== 0 ? `${str !== '' ? 'and ' : ''}${a[Number(n[5])] || `${b[Number(n[5][0])]} ${a[Number(n[5][1])]}`}` : ''
  return str.trim()
}

export function currencySymbol(input: unknown): string {
  if (Number.isNaN(Number(input))) return String(input ?? '')
  const result = String(input).split('.')
  let lastThree = result[0].substring(result[0].length - 3)
  const otherNumbers = result[0].substring(0, result[0].length - 3)
  if (otherNumbers !== '') lastThree = `,${lastThree}`
  let output = `${otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',')}${lastThree}`
  if (result.length > 1) output += `.${result[1]}`
  return output
}

export const SEMESTER_LABELS: { id: string; value: string }[] = [
  { id: 'ISEM', value: 'I' },
  { id: 'IISEM', value: 'II' },
  { id: 'IIISEM', value: 'III' },
  { id: 'IVSEM', value: 'IV' },
  { id: 'VSEM', value: 'V' },
  { id: 'VISEM', value: 'VI' },
  { id: 'VIISEM', value: 'VII' },
  { id: 'VIIISEM', value: 'VIII' },
]

export function semesterLabel(courseYearCode: unknown): string {
  const code = String(courseYearCode ?? '').trim()
  return SEMESTER_LABELS.find((x) => x.id === code)?.value ?? code
}

export function fmtDate(v: unknown, withTime = false): string {
  if (!v) return ''
  const d = new Date(String(v))
  if (Number.isNaN(d.getTime())) return String(v)
  if (withTime) {
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}-${month}-${d.getFullYear()}`
}
