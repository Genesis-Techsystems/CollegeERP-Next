/** Generic select option for dropdowns */
export interface SelectOption {
  value: string | number
  label: string
}

/** Date range for date pickers */
export interface DateRange {
  from: Date | null
  to: Date | null
}

/** Filter state for list pages */
export interface FilterState {
  [key: string]: string | number | boolean | null | undefined
}

/** Pagination state */
export interface PaginationState {
  page: number
  pageSize: number
  total: number
}
