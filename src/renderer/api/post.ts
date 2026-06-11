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
  isPinned: boolean
  pinExpiresAt: string | null
  isLiked: boolean
  authorName: string
  authorAvatar: string
  authorAvatarUrl: string | null
  createdAt: string
  updatedAt: string
  postType?: string
  bountyBeans?: number
  bountyRemaining?: number
  bountyStatus?: string
  bountyExpiresAt?: string
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
  isLiked: boolean
  createdAt: string
  updatedAt: string
  postType?: string
  bountyBeans?: number
  bountyDuration?: number
  bountyRemaining?: number
  bountyStatus?: string
  bountyExpiresAt?: string
  bountyStartedAt?: string
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
  isAnonymous: boolean
  isPostAuthor: boolean
  isLiked: boolean
  createdAt: string
  bountyBeans?: number
  isAdopted?: boolean
  children: CommentVO[]
}

export interface CommentCreateData {
  targetId: string
  targetType: string
  content: string
  parentId?: string
  isAnonymous?: boolean
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

export function getPostList(page = 1, size = 10, keyword?: string, sort = 'latest', postType?: string, bountyStatus?: string) {
  const params = new URLSearchParams({ page: String(page), size: String(size), sort })
  if (keyword) params.append('keyword', keyword)
  if (postType) params.append('postType', postType)
  if (bountyStatus) params.append('bountyStatus', bountyStatus)
  return apiGet<ApiResponse<PageResponse<PostListVO>>>(`/api/posts?${params}`, getToken())
}

export function getPostDetail(id: string) {
  return apiGet<ApiResponse<PostDetail>>(`/api/posts/${id}`, getToken())
}

export function createPost(title: string, content: string, isAnonymous: boolean, postType = 'normal', bountyBeans = 0, bountyDuration = 0) {
  return apiPost<ApiResponse<{ postId: string }>>('/api/posts', {
    title, content, isAnonymous, postType, bountyBeans, bountyDuration
  }, getToken())
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
  return apiDelete<ApiResponse<{ refund?: number }>>(`/api/posts/${id}`, getToken())
}

// ===== 评论 API =====

export function getComments(targetType: string, targetId: string, bountyFilter?: string) {
  let url = `/api/comments?targetType=${targetType}&targetId=${targetId}`
  if (bountyFilter) url += `&bountyFilter=${bountyFilter}`
  return apiGet<ApiResponse<CommentVO[]>>(url, getToken())
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

export function deleteComment(id: string) {
  return apiDelete<ApiResponse<void>>(`/api/comments/${id}`, getToken())
}

// ===== CDKEY API =====

export interface RedeemResponse {
  amount: number
  balance: number
}

export function redeemCdkey(code: string) {
  return apiPost<ApiResponse<RedeemResponse>>('/api/cdkeys/redeem', { code }, getToken())
}

// ===== Admin CDKEY API =====

export interface GenerateCdkeyData {
  amount: number
  count: number
}

export interface GenerateCdkeyResponse {
  codes: string[]
  amount: number
  count: number
}

export function generateCdkeys(data: GenerateCdkeyData) {
  return apiPost<ApiResponse<GenerateCdkeyResponse>>('/api/admin/cdkeys/generate', data, getToken())
}

// ===== Pin API =====

export interface PinPostResponse {
  beansSpent: number
  balance: number
}

export function pinPost(postId: string, hours: number) {
  return apiPost<ApiResponse<PinPostResponse>>(`/api/posts/${postId}/pin`, { hours }, getToken())
}

export interface UnpinResponse {
  refund: number
  balance: number
}

export function unpinPost(postId: string) {
  return apiDelete<ApiResponse<UnpinResponse>>(`/api/posts/${postId}/pin`, getToken())
}

// ===== Bounty API =====

export interface BountyRewardVO {
  id: string
  commentId: string
  fromUserId: string
  fromUserName: string
  toUserId: string
  toUserName: string
  beans: number
  type: string
  isAuto: boolean
  createdAt: string
}

export function adoptComment(postId: string, commentId: string, beans: number) {
  return apiPost<ApiResponse<{ fromBounty: number; fromAccount: number; bountyRemaining: number }>>(
    `/api/posts/${postId}/bounty/adopt`, { commentId, beans }, getToken()
  )
}

export function rewardComment(postId: string, commentId: string, beans: number) {
  return apiPost<ApiResponse<{ fromBounty: number; fromAccount: number }>>(
    `/api/posts/${postId}/bounty/reward`, { commentId, beans }, getToken()
  )
}

export function getBountyRewards(postId: string) {
  return apiGet<ApiResponse<BountyRewardVO[]>>(`/api/posts/${postId}/bounty/rewards`, getToken())
}
