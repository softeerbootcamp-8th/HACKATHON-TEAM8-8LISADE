import type { ApiPayload, ApiResponse, Example } from '../types/example'

const EXAMPLES_PATH = '/api/examples'

export async function listExamples(): Promise<Example[]> {
  return request<Example[]>(EXAMPLES_PATH)
}

export async function createExample(name: string): Promise<Example> {
  return request<Example>(EXAMPLES_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(path, init)
  } catch {
    throw new Error('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해 주세요.')
  }

  const payload = await readPayload<T>(response)

  if (!response.ok) {
    throw new Error(formatError(response.status, payload))
  }

  if (!isSuccessResponse(payload)) {
    throw new Error('서버가 예상하지 못한 응답을 반환했습니다.')
  }

  return payload.data
}

async function readPayload<T>(response: Response): Promise<ApiPayload<T> | undefined> {
  const text = await response.text()

  if (!text) {
    return undefined
  }

  try {
    return JSON.parse(text) as ApiPayload<T>
  } catch {
    return undefined
  }
}

function isSuccessResponse<T>(payload: ApiPayload<T> | undefined): payload is ApiResponse<T> {
  return payload?.success === true && 'data' in payload
}

function formatError(status: number, payload: ApiPayload<unknown> | undefined): string {
  if (payload && payload.success === false) {
    const detail = [payload.code, payload.message].filter(Boolean).join(': ')
    if (detail) {
      return `요청에 실패했습니다 (${status}) — ${detail}`
    }
  }

  return `요청에 실패했습니다 (${status}).`
}
