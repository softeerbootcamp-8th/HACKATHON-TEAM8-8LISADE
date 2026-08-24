export interface Example {
  id: number
  name: string
  createdAt: string
}

export interface ApiResponse<T> {
  success: true
  data: T
}

interface ApiErrorResponse {
  success: false
  code?: string
  message?: string
}

export type ApiPayload<T> = ApiResponse<T> | ApiErrorResponse
