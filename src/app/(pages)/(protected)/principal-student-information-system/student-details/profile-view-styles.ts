/** Angular student-profile view tokens (principal student-details). */
export const PROFILE_VIEW = {
  navy: '#003366',
  darkBlue: '#00008b',
  linkBlue: '#007bff',
  gold: '#ffc107',
  border: '#dee2e6',
  sectionBg: '#eef6ff',
  photoBoxBg: '#e8f4fc',
  photoBoxBorder: '#b3d4fc',
  muted: '#666666',
  statusGreen: '#008000',
  pink: '#e91e63',
} as const

export function formatAdmissionDate(value: unknown): string {
  if (!value) return '—'
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`
}

export function principalStatusClass(code: string): string {
  switch (code.toUpperCase().replace(/\s+/g, '')) {
    case 'INCOLLEGE':
      return 'font-bold text-[#008000]'
    case 'DTND':
      return 'font-semibold text-red-600'
    case 'PASSEDOUT':
      return 'font-semibold text-[#007bff]'
    case 'DISCONTINUED':
      return 'font-semibold text-slate-500'
    default:
      return 'font-medium text-[#333333]'
  }
}
