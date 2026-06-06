/**
 * Typed application error for consistent error handling across the app.
 *
 * @example
 * throw new AppError('UNAUTHORIZED', 'Your session has expired. Please log in again.')
 * throw new AppError('FETCH_FAILED', 'Failed to load exam data', originalError)
 */
export class AppError extends Error {
  constructor(
    /** Machine-readable error code */
    public readonly code: string,
    /** User-facing safe message */
    message: string,
    /** Original cause -- never sent to client */
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
    // Fix prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

/**
 * Type guard: check if an unknown value is an AppError.
 */
export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError
}

/**
 * Parse a fetch Response and body into an AppError.
 * Handles Spring Boot's { statusCode, success, message, data } envelope.
 *
 * @param res - The Response object from fetch
 * @param body - The parsed response body (already JSON.parsed)
 * @returns AppError with appropriate code and message
 */
export function parseApiError(res: Response, body: unknown): AppError {
  // Handle Spring Boot response envelope
  if (body && typeof body === 'object' && 'message' in body) {
    const springBody = body as { message?: string; statusCode?: number }

    if (res.status === 401) {
      return new AppError('UNAUTHORIZED', 'Your session has expired. Please log in again.', body)
    }
    if (res.status === 404) {
      return new AppError('NOT_FOUND', springBody.message ?? 'The requested resource was not found.', body)
    }
    if (res.status === 400) {
      return new AppError('VALIDATION_ERROR', springBody.message ?? 'Invalid request data.', body)
    }
    if (res.status === 502 || res.status === 503) {
      return new AppError(
        'SERVICE_UNAVAILABLE',
        springBody.message ?? 'Backend service is not reachable. Ensure the API server is running and SPRING_API_URL is correct.',
        body,
      )
    }

    return new AppError(
      `HTTP_${res.status}`,
      springBody.message ?? `Request failed with status ${res.status}`,
      body,
    )
  }

  return new AppError('FETCH_FAILED', `Request failed with status ${res.status}`, body)
}

/**
 * Get a user-facing message from any error type.
 * Safe to display in UI -- never exposes internal details.
 */
export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) return error.message
  if (error instanceof Error) return error.message
  // Many call sites pass an already-built message string (e.g. validation
  // errors) — show it instead of collapsing to the generic fallback.
  if (typeof error === 'string' && error.trim()) return error
  return 'An unexpected error occurred. Please try again.'
}
