type AnyRow = Record<string, unknown>

function num(value: unknown): number {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

/** Build allocation page query string from a Timetable list row (handles API field variants). */
export function buildTimetableAllocationQuery(row: AnyRow): string {
  const q = new URLSearchParams({
    collegeId: String(num(row.collegeId ?? row.fk_college_id ?? row.CollegeId)),
    collegeName: String(row.collegeCode ?? row.college_code ?? row.CollegeCode ?? ''),
    academicYearId: String(
      num(row.academicYearId ?? row.fk_academic_year_id ?? row.academic_year_id),
    ),
    academicYear: String(row.academicYear ?? row.academic_year ?? row.AcademicYear ?? ''),
    timetableId: String(num(row.timetableId ?? row.timetable_id ?? row.pk_timetable_id)),
    timetableName: String(row.timetableName ?? row.timetable_name ?? ''),
    startDate: String(row.startDate ?? row.start_date ?? ''),
    endDate: String(row.endDate ?? row.end_date ?? ''),
  })
  return q.toString()
}

export function parseTimetablePageParams(searchParams: URLSearchParams) {
  return {
    collegeId: num(searchParams.get('collegeId')),
    collegeName: searchParams.get('collegeName') ?? '',
    academicYearId: num(searchParams.get('academicYearId')),
    academicYear: searchParams.get('academicYear') ?? '',
    timetableId: num(searchParams.get('timetableId')),
    timetableName: searchParams.get('timetableName') ?? '',
    startDate: searchParams.get('startDate') ?? '',
    endDate: searchParams.get('endDate') ?? '',
  }
}

export function hasTimetableAllocationContext(params: ReturnType<typeof parseTimetablePageParams>): boolean {
  return params.collegeId > 0 && params.timetableId > 0
}
