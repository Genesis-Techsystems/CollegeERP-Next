/**
 * Standard API response envelope returned by every Spring Boot endpoint.
 * Matches: { statusCode, success, message, data, resultList? }
 */
export interface ApiResponse<T> {
  statusCode: number
  success: boolean
  message: string
  data: T
  resultList?: T[]
}

/**
 * Paginated variant — resultList is always present and totalCount is populated.
 */
export interface PaginatedResponse<T> extends ApiResponse<T> {
  resultList: T[]
  totalCount?: number
}

/**
 * Error shape used for client-side error handling (not from the API directly).
 */
export interface ApiError {
  message: string
  statusCode: number
  errors?: Record<string, string[]>
}
