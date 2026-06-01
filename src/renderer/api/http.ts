export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const buildHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: buildHeaders(token),
    ...options
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return response.json()
}

export const apiGet = <T>(path: string, token?: string): Promise<T> =>
  request<T>(path, { method: 'GET' }, token)

export const apiPost = <T>(path: string, body?: unknown, token?: string): Promise<T> =>
  request<T>(
    path,
    {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    },
    token
  )

export const apiPut = <T>(path: string, body?: unknown, token?: string): Promise<T> =>
  request<T>(
    path,
    {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    },
    token
  )

export const apiDelete = <T>(path: string, token?: string): Promise<T> =>
  request<T>(path, { method: 'DELETE' }, token)

export const apiUpload = <T>(path: string, body: FormData, token?: string): Promise<T> => {
  const headers: Record<string, string> = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return response.json() as Promise<T>
  })
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}
