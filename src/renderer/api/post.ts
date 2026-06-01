import { apiGet, apiPost, apiPut, apiDelete, type ApiResponse } from './http'
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

export interface ResumePostListVO {
  id: string
  userId: string
  resumeName: string
  authorName: string
  authorAvatar: string
  authorAvatarUrl: string | null
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

export interface ResumePostDetail {
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

// ===== 简历帖 API =====

export function getResumePostList(page = 1, size = 10, keyword?: string) {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (keyword) params.append('keyword', keyword)
  return apiGet<ApiResponse<PageResponse<ResumePostListVO>>>(`/api/posts/resumes?${params}`, getToken())
}

export function getResumePostDetail(id: string) {
  return apiGet<ApiResponse<ResumePostDetail>>(`/api/posts/resumes/${id}`, getToken())
}

export function getMyResumePost() {
  return apiGet<ApiResponse<ResumePostDetail>>('/api/posts/resumes/me', getToken())
}

export function createResumePost(resumeName: string, content: string) {
  return apiPost<ApiResponse<{ resumeId: string }>>('/api/posts/resumes', { resumeName, content }, getToken())
}

export function updateResumePost(id: string, resumeName: string, content: string) {
  return apiPut<ApiResponse<ResumePostDetail>>(`/api/posts/resumes/${id}`, { resumeName, content }, getToken())
}

export function deleteResumePost(id: string) {
  return apiDelete<ApiResponse<void>>(`/api/posts/resumes/${id}`, getToken())
}

// ===== 常规帖 API =====

export function getPostList(page = 1, size = 10, keyword?: string, sort = 'latest') {
  const params = new URLSearchParams({ page: String(page), size: String(size), sort })
  if (keyword) params.append('keyword', keyword)
  return apiGet<ApiResponse<PageResponse<PostListVO>>>(`/api/posts?${params}`, getToken())
}

export function getPostDetail(id: string) {
  return apiGet<ApiResponse<PostDetail>>(`/api/posts/${id}`, getToken())
}

export function createPost(title: string, content: string, isAnonymous: boolean) {
  return apiPost<ApiResponse<{ postId: string }>>('/api/posts', { title, content, isAnonymous }, getToken())
}

export function updatePost(id: string, title: string, content: string) {
  return apiPut<ApiResponse<PostDetail>>(`/api/posts/${id}`, { title, content }, getToken())
}

export function likePost(id: string) {
  return apiPost<ApiResponse<void>>(`/api/posts/${id}/like`, {}, getToken())
}

export function unlikePost(id: string) {
  return apiPost<ApiResponse<void>>(`/api/posts/${id}/unlike`, {}, getToken())
}

export function deletePost(id: string) {
  return apiDelete<ApiResponse<void>>(`/api/posts/${id}`, getToken())
}

// ===== 评论 API =====

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
