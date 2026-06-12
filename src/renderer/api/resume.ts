import { API_BASE_URL, apiDelete, apiGet, apiPost, apiPut, apiUpload, type ApiResponse } from './http'
import { useAuthStore } from '@/stores/auth'

function getToken(): string | undefined {
  const authStore = useAuthStore()
  return authStore.token || undefined
}

export interface PageResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
}

export interface PersonalResume {
  id: string
  userId: string
  resumeName: string
  content: string | null
  sourceType?: 'TEXT' | 'FILE' | string
  originalFileName?: string | null
  fileContentType?: string | null
  fileSize?: number | null
  isDefault?: boolean | null
  extractedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface PersonalResumePayload {
  resumeName: string
  content: string
  isDefault?: boolean
}

export interface ResumeScoreDimension {
  key: string
  name: string
  score: number
  maxScore: number
}

export interface ResumeScoreRecord {
  id: string
  resumeId: string
  userId: string
  targetRole: string
  targetRoleName: string
  totalScore: number
  dimensions: ResumeScoreDimension[]
  summary: string
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  createdAt: string
}

export function listPersonalResumes(page = 1, size = 20, resumeName = '') {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size)
  })
  if (resumeName.trim()) {
    params.set('resumeName', resumeName.trim())
  }
  return apiGet<ApiResponse<PageResponse<PersonalResume>>>(`/api/resumes?${params}`, getToken())
}

export function getMyPersonalResume() {
  return apiGet<ApiResponse<PersonalResume>>('/api/resumes/me', getToken())
}

export function getPersonalResumeDetail(id: string) {
  return apiGet<ApiResponse<PersonalResume>>(`/api/resumes/${id}`, getToken())
}

export function createPersonalResume(payload: PersonalResumePayload) {
  return apiPost<ApiResponse<{ resumeId: string }>>('/api/resumes', payload, getToken())
}

export function updatePersonalResume(id: string, payload: PersonalResumePayload) {
  return apiPut<ApiResponse<PersonalResume>>(`/api/resumes/${id}`, payload, getToken())
}

export function deletePersonalResume(id: string) {
  return apiDelete<ApiResponse<void>>(`/api/resumes/${id}`, getToken())
}

export function setDefaultPersonalResume(id: string) {
  return apiPost<ApiResponse<PersonalResume>>(`/api/resumes/${id}/default`, {}, getToken())
}

export function importPersonalResume(file: File, resumeName = '', isDefault = false) {
  const formData = new FormData()
  formData.append('file', file)
  if (resumeName.trim()) {
    formData.append('resumeName', resumeName.trim())
  }
  formData.append('isDefault', String(isDefault))
  return apiUpload<ApiResponse<PersonalResume>>('/api/resumes/import', formData, getToken())
}

export function replacePersonalResumeFile(id: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return apiUpload<ApiResponse<PersonalResume>>(`/api/resumes/${id}/file`, formData, getToken())
}

export function scorePersonalResume(id: string, targetRole: string) {
  return apiPost<ApiResponse<ResumeScoreRecord>>(`/api/resumes/${id}/scores`, { targetRole }, getToken())
}

export function getLatestPersonalResumeScore(id: string) {
  return apiGet<ApiResponse<ResumeScoreRecord>>(`/api/resumes/${id}/scores/latest`, getToken())
}

export function getPersonalResumeScoreHistory(id: string, page = 1, size = 8) {
  return apiGet<ApiResponse<PageResponse<ResumeScoreRecord>>>(`/api/resumes/${id}/scores?page=${page}&size=${size}`, getToken())
}

export async function downloadPersonalResumeFile(id: string): Promise<Blob> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const response = await fetch(`${API_BASE_URL}/api/resumes/${id}/file`, { headers })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const body = await response.json()
    throw new Error(body.message || '下载失败')
  }
  return response.blob()
}
