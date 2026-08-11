export const num = (v: unknown): number => {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

export const txt = (v: unknown): string => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

export const dedupeBy = <T,>(rows: T[], keyFn: (row: T) => number | string): T[] => {
  const seen = new Set<number | string>()
  return rows.filter((row) => {
    const key = keyFn(row)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const subjectRowId = (row: Record<string, unknown>): number =>
  num(row.fk_subject_id ?? row.subjectId)

const subjectGroupLabel = (row: Record<string, unknown>): string =>
  txt(row.group_name ?? row.groupName ?? row.group_code ?? row.groupCode)

/**
 * Angular multi-evaluator-assign / profile-details-subject-roles:
 * distinct subjects by fk_subject_id, with unique course group_name values
 * joined as `groupNames` (shown as SelectOption.description).
 */
export function withSubjectGroupNames<T extends Record<string, unknown>>(
  subjectsList: T[],
): Array<T & { groupNames: string }> {
  if (!Array.isArray(subjectsList) || subjectsList.length === 0) return []

  const ids = subjectsList.map(subjectRowId)
  const distinct = subjectsList.filter((s, index) => {
    const id = subjectRowId(s)
    return id > 0 && !ids.includes(id, index + 1)
  })

  return distinct.map((subject) => {
    const sid = subjectRowId(subject)
    const groupNames = [
      ...new Set(
        subjectsList
          .filter((x) => subjectRowId(x) === sid)
          .map(subjectGroupLabel)
          .filter(Boolean),
      ),
    ].join(', ')
    return { ...subject, groupNames }
  })
}

/** Subject dropdown label: `name - code (regulation)` when regulation is present. */
export function subjectSelectLabel(row: Record<string, unknown>): string {
  const name = txt(row.subject_name ?? row.subjectName)
  const code = txt(row.subject_code ?? row.subjectCode)
  const reg = txt(row.regulation_code ?? row.regulationCode)
  const base = code ? `${name} - ${code}` : name
  return reg ? `${base} (${reg})` : base
}

