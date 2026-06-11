import { apiDelete, apiGet, apiPost, apiPut, type ApiResponse } from './http'
import { useAuthStore } from '@/stores/auth'

function getToken(): string | undefined {
  const authStore = useAuthStore()
  return authStore.token || undefined
}

export interface PersonalResume {
  id: string
  userId: string
  resumeName: string
  content: string | null
  createdAt: string
  updatedAt: string
}

export interface PersonalResumePayload {
  resumeName: string
  content: string
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
