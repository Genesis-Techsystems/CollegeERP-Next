/**
 * Query string builder for server-side filtering and ordering.
 *
 * @example
 *   buildQuery({ 'Course.courseId': 5, isActive: true })
 *   // → "Course.courseId==5.and.isActive==true"
 *
 *   buildQuery({ examId: 1 }, { field: 'sortOrder', direction: 'ASC' })
 *   // → "examId==1.order(sortOrder=ASC)"
 *
 *   buildQuery({ name: 'foo' }, [{ field: 'a', direction: 'ASC' }, { field: 'b', direction: 'DESC' }])
 *   // → "name==foo.order(a=ASC).order(b=DESC)"
 */

export type OrderBy = { field: string; direction: 'ASC' | 'DESC' }

/**
 * Build a filter + sort query string.
 *
 * All conditions are ANDed. Pass `orderBy` (single or array) to sort results.
 */
export function buildQuery(
  conditions: Record<string, string | number | boolean>,
  orderBy?: OrderBy | OrderBy[],
): string {
  const parts = Object.entries(conditions)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([key, value]) => `${key}==${value}`)

  let query = parts.join('.and.')

  if (orderBy) {
    const orders = Array.isArray(orderBy) ? orderBy : [orderBy]
    for (const o of orders) {
      query += (query ? '.' : '') + `order(${o.field}=${o.direction})`
    }
  }

  return query
}
