/**
 * Standard API response envelope returned by every Spring Boot endpoint.
 * Matches: { statusCode, success, message, data, resultList? }
 */
export interface ApiResponse<T> {
  statusCode: number
  success: boolean
  message: string
  data: T | null
  resultList?: T[]
}

/**
 * Paginated list response returned by Spring Boot domain/list endpoints.
 * crud.service.ts detects this shape via 'resultList' duck-typing.
 */
export interface PageResponse<T> {
  resultList: T[] | T | null
  totalCount: number
  totalPage: number
  currentPage: number
  pageSize: number
}
