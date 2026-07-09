import type { ColDef, ValueGetterParams } from 'ag-grid-community'

type AnyRow = Record<string, unknown>

function text(row: AnyRow | undefined, ...keys: string[]): string {
  if (!row) return ''
  for (const key of keys) {
    const v = row[key]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

export const AFFILIATED_STUDENT_STAGING_COLS: ColDef<AnyRow>[] = [
  { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
  {
    headerName: 'Hall Ticket',
    minWidth: 120,
    valueGetter: (p) => text(p.data, 'hallTicketNumber', 'hallticket_number'),
  },
  { headerName: 'Student', minWidth: 140, valueGetter: (p) => text(p.data, 'firstName', 'first_name') },
  {
    headerName: 'Program',
    minWidth: 260,
    flex: 1.8,
    valueGetter: (p) =>
      [
        text(p.data, 'college'),
        text(p.data, 'academicYear', 'academic_year'),
        text(p.data, 'course'),
        text(p.data, 'group', 's_group'),
        text(p.data, 'courseYear', 'course_year'),
      ]
        .filter(Boolean)
        .join(' / '),
  },
  { headerName: 'Batch', minWidth: 90, valueGetter: (p) => text(p.data, 'batch') },
  {
    headerName: 'D.O.B',
    minWidth: 110,
    valueGetter: (p) => text(p.data, 'dateOfBirth', 'date_of_birth'),
  },
  {
    headerName: 'Student Email',
    minWidth: 170,
    valueGetter: (p) => text(p.data, 'studentEmailID', 'student_emailid'),
  },
  { headerName: 'Mobile', minWidth: 110, valueGetter: (p) => text(p.data, 'mobile') },
  {
    headerName: 'Father Name',
    minWidth: 150,
    valueGetter: (p) => text(p.data, 'fatherName', 'father_name'),
  },
  {
    headerName: 'Father Mobile',
    minWidth: 130,
    valueGetter: (p) => text(p.data, 'fatherMobile', 'father_mobile'),
  },
]

export const AFFILIATED_STUDENT_LOADED_COLS: ColDef<AnyRow>[] = [
  { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
  {
    headerName: 'Hall Ticket',
    minWidth: 120,
    valueGetter: (p) => text(p.data, 'hall_ticket_number', 'hallTicketNumber'),
  },
  { headerName: 'Student', minWidth: 140, valueGetter: (p) => text(p.data, 'first_name', 'firstName') },
  {
    headerName: 'Program',
    minWidth: 260,
    flex: 1.8,
    valueGetter: (p) =>
      [
        text(p.data, 'college'),
        text(p.data, 'academic_year', 'academicYear'),
        text(p.data, 'course'),
        text(p.data, 's_group', 'group'),
        text(p.data, 'course_year', 'courseYear'),
      ]
        .filter(Boolean)
        .join(' / '),
  },
  { headerName: 'Batch', minWidth: 90, valueGetter: (p) => text(p.data, 'batch') },
  {
    headerName: 'D.O.B',
    minWidth: 110,
    valueGetter: (p) => text(p.data, 'date_of_birth', 'dateOfBirth'),
  },
  {
    headerName: 'Student Email',
    minWidth: 170,
    valueGetter: (p) => text(p.data, 'student_emailid', 'studentEmailID'),
  },
  { headerName: 'Mobile', minWidth: 110, valueGetter: (p) => text(p.data, 'mobile') },
  {
    headerName: 'Father Name',
    minWidth: 150,
    valueGetter: (p) => text(p.data, 'father_name', 'fatherName'),
  },
  {
    headerName: 'Father Mobile',
    minWidth: 130,
    valueGetter: (p) => text(p.data, 'father_mobile', 'fatherMobile'),
  },
]

export const AFFILIATED_STUDENT_VERIFY_COLS: ColDef<AnyRow>[] = [
  { headerName: 'SI.No', valueGetter: (p: ValueGetterParams<AnyRow>) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
  {
    headerName: 'Hall Ticket No.',
    minWidth: 140,
    valueGetter: (p) => text(p.data, 'hallticket_number', 'hallTicketNumber'),
  },
  { headerName: 'Problem', minWidth: 280, flex: 1, valueGetter: (p) => text(p.data, 'problem', 'Problem') },
]
