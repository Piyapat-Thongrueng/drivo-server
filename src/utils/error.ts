export type AppError = {
  message: string
  statusCode: number
  isAppError: true
}

export function createError(message: string, statusCode: number): AppError {
  return {
    message,
    statusCode,
    isAppError: true,
  }
}
