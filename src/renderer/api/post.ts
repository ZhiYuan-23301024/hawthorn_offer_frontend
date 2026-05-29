import { apiGet, apiPost, type ApiResponse } from './http'
import { useAuthStore } from '@/stores/auth'

function getToken(): string | undefined {
  const authStore = useAuthStore()
  return authStore.token || undefined
}

export interface PostListVO {
  id: string
  userId: string
  title: string
  excerpt: string
  isAnonymous: boolean
  commentCount: number
  likeCount: number
  authorName: string
  authorAvatar: string
  authorAvatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface ResumeListVO {
  id: string
  userId: string
  resumeName: string
  authorName: string
  authorAvatar: string
  authorAvatarUrl: string | null
  likeCount: number
  commentCount: number
  createdAt: string
  updatedAt: string
}

export interface PageResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
}

export interface ResumeDetail {
  id: string
  userId: string
  resumeName: string
  content: string
  authorName: string
  authorAvatar: string
  authorAvatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface PostDetail {
  id: string
  userId: string
  title: string
  content: string
  isAnonymous: boolean
  commentCount: number
  likeCount: number
  createdAt: string
  updatedAt: string
}

export interface CommentVO {
  id: string
  userId: string
  nickname: string
  avatarUrl: string | null
  content: string
  targetId: string
  parentId: string | null
  likeCount: number
  createdAt: string
  children: CommentVO[]
}

export interface CommentCreateData {
  targetId: string
  targetType: string
  content: string
  parentId?: string
}

export function getResumeList(page = 1, size = 10, keyword?: string) {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (keyword) params.append('keyword', keyword)
  return apiGet<ApiResponse<PageResponse<ResumeListVO>>>(`/api/resumes?${params}`, getToken())
}

export function getPostList(page = 1, size = 10, keyword?: string, sort = 'latest') {
  const params = new URLSearchParams({ page: String(page), size: String(size), sort })
  if (keyword) params.append('keyword', keyword)
  return apiGet<ApiResponse<PageResponse<PostListVO>>>(`/api/posts?${params}`, getToken())
}

export function getResumeDetail(id: string) {
  return apiGet<ApiResponse<ResumeDetail>>(`/api/resumes/${id}`, getToken())
}

export function getMyResume() {
  return apiGet<ApiResponse<ResumeDetail>>('/api/resumes/me', getToken())
}

export function getPostDetail(id: string) {
  return apiGet<ApiResponse<PostDetail>>(`/api/posts/${id}`, getToken())
}

export function createResume(resumeName: string, content: string) {
  return apiPost<ApiResponse<{ resumeId: string }>>('/api/resumes', { resumeName, content }, getToken())
}

export function updateResume(id: string, resumeName: string, content: string) {
  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/resumes/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ resumeName, content })
  }).then(r => r.json()) as Promise<ApiResponse<ResumeDetail>>
}

export function createPost(title: string, content: string, isAnonymous: boolean) {
  return apiPost<ApiResponse<{ postId: string }>>('/api/posts', { title, content, isAnonymous }, getToken())
}

export function updatePost(id: string, title: string, content: string) {
  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/posts/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ title, content })
  }).then(r => r.json()) as Promise<ApiResponse<PostDetail>>
}

export function likeResume(id: string) {
  return apiPost<ApiResponse<void>>(`/api/resumes/${id}/like`, {}, getToken())
}

export function unlikeResume(id: string) {
  return apiPost<ApiResponse<void>>(`/api/resumes/${id}/unlike`, {}, getToken())
}

export function likePost(id: string) {
  return apiPost<ApiResponse<void>>(`/api/posts/${id}/like`, {}, getToken())
}

export function unlikePost(id: string) {
  return apiPost<ApiResponse<void>>(`/api/posts/${id}/unlike`, {}, getToken())
}

export function getComments(targetType: string, targetId: string) {
  return apiGet<ApiResponse<CommentVO[]>>(
    `/api/comments?targetType=${targetType}&targetId=${targetId}`,
    getToken()
  )
}

export function createComment(data: CommentCreateData) {
  return apiPost<ApiResponse<{ commentId: string }>>('/api/comments', data, getToken())
}

export function likeComment(id: string) {
  return apiPost<ApiResponse<void>>(`/api/comments/${id}/like`, {}, getToken())
}

export function unlikeComment(id: string) {
  return apiPost<ApiResponse<void>>(`/api/comments/${id}/unlike`, {}, getToken())
}

export function deleteResume(id: string) {
  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/resumes/${id}`, {
    method: 'DELETE',
    headers
  }).then(r => r.json()) as Promise<ApiResponse<void>>
}

export function deletePost(id: string) {
  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/posts/${id}`, {
    method: 'DELETE',
    headers
  }).then(r => r.json()) as Promise<ApiResponse<void>>
}
