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

