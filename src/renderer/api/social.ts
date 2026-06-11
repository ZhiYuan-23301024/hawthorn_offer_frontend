import { apiGet, apiPost, apiPut, apiDelete, apiUpload, type ApiResponse } from './http'
import { useAuthStore } from '@/stores/auth'

function getToken(): string | undefined {
  const authStore = useAuthStore()
  return authStore.token || undefined
}

// ============================================================
// TypeScript 接口（对齐后端 DTO）
// ============================================================

export interface UserBriefVO {
  id: string
  nickname: string
  avatar: string
  email: string
  isContact?: boolean
}

export interface MemberVO {
  userId: string
  nickname: string
  avatar: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  joinedAt: string
}

export interface ConversationVO {
  id: string
  type: 'PRIVATE' | 'GROUP' | 'SYSTEM_NOTIFY' | 'BEAN_NOTIFY'
  name: string
  avatar: string
  groupCode: string
  lastMessageText: string
  lastMessageSenderId: string
  lastMessageSenderNickname: string
  lastMessageAt: string
  unreadCount: number
  isMuted: boolean
  isHidden: boolean
  role: string
  members?: MemberVO[]
  memberCount?: number
}

export interface MessageAttachmentVO {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  storagePath: string
}

export interface MessageVO {
  id: string
  conversationId: string
  senderId: string
  senderNickname: string
  senderAvatar: string
  content: string
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM'
  attachments?: MessageAttachmentVO[]
  createdAt: string
  notificationType?: string  // 'LIKE' | 'REPLY' | 'BEAN_EARN' | 'BEAN_SPEND'
  targetType?: string        // 'POST' | 'COMMENT' | 'OFFER'
  targetId?: string          // target entity UUID for jump navigation
}

export interface PageResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
}

export interface FriendListVO {
  friends: UserBriefVO[]
  groups: ConversationVO[]
}

export interface FriendRequestVO {
  id: string
  fromUserId: string
  fromNickname: string
  fromAvatar: string
  toUserId: string
  toNickname: string
  toAvatar: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REMOVED'
  message: string
  createdAt: string
  updatedAt?: string
}

export interface GroupJoinRequestVO {
  id: string
  conversationId: string
  groupName: string
  userId: string
  userNickname: string
  userAvatar: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  message: string
  createdAt: string
}

export interface CreateGroupRequest {
  name: string
  memberIds: string[]
}

export interface SendFriendRequestDto {
  toUserId: string
  message?: string
}

export interface SendMessageRequest {
  content: string
  messageType?: string
}

export interface JoinGroupRequestDto {
  message?: string
}

// ============================================================
// Phase 1 — 核心聊天 API
// ============================================================

/** 获取当前用户的所有会话 */
export function getConversations() {
  return apiGet<ApiResponse<ConversationVO[]>>('/api/social/conversations', getToken())
}

/** 获取会话详情（含成员列表） */
export function getConversationDetail(id: string) {
  return apiGet<ApiResponse<ConversationVO>>(`/api/social/conversations/${id}`, getToken())
}

/** 分页获取消息历史（正序：旧→新） */
export function getMessages(id: string, page = 1, size = 30) {
  return apiGet<ApiResponse<PageResponse<MessageVO>>>(
    `/api/social/conversations/${id}/messages?page=${page}&size=${size}`,
    getToken()
  )
}

/** 发送消息 */
export function sendMessage(id: string, body: SendMessageRequest) {
  return apiPost<ApiResponse<MessageVO>>(`/api/social/conversations/${id}/messages`, body, getToken())
}

/** 退出/删除会话 */
export function leaveConversation(id: string) {
  return apiDelete<ApiResponse<void>>(`/api/social/conversations/${id}`, getToken())
}

/** 搜索用户 */
export function searchUsers(q: string) {
  return apiGet<ApiResponse<UserBriefVO[]>>(`/api/social/users/search?q=${encodeURIComponent(q)}`, getToken())
}

/** 搜索会话（按名称、成员昵称、最后消息，含已隐藏） */
export function searchConversations(q: string) {
  return apiGet<ApiResponse<ConversationVO[]>>(`/api/social/conversations/search?q=${encodeURIComponent(q)}`, getToken())
}

/** 获取好友列表（含好友和群聊，供通讯录使用） */
export function getFriends() {
  return apiGet<ApiResponse<FriendListVO>>('/api/social/friends', getToken())
}

/** 创建群聊 */
export function createGroup(body: CreateGroupRequest) {
  return apiPost<ApiResponse<ConversationVO>>('/api/social/conversations', body, getToken())
}

// ============================================================
// Phase 2 — 好友请求 + 群搜索入群 API
// ============================================================

/** 发送好友申请 */
export function sendFriendRequest(body: SendFriendRequestDto) {
  return apiPost<ApiResponse<FriendRequestVO>>('/api/social/friend-requests', body, getToken())
}

/** 查看收到的待处理好友申请 */
export function getPendingFriendRequests() {
  return apiGet<ApiResponse<FriendRequestVO[]>>('/api/social/friend-requests/pending', getToken())
}

/** 查看收到的所有好友申请（含已处理） */
export function getReceivedRequests() {
  return apiGet<ApiResponse<FriendRequestVO[]>>('/api/social/friend-requests/received', getToken())
}

/** 查看发出的好友申请 */
export function getSentFriendRequests() {
  return apiGet<ApiResponse<FriendRequestVO[]>>('/api/social/friend-requests/sent', getToken())
}

/** 接受好友申请 → 返回新私聊会话 */
export function acceptFriendRequest(id: string) {
  return apiPut<ApiResponse<ConversationVO>>(`/api/social/friend-requests/${id}/accept`, undefined, getToken())
}

/** 拒绝好友申请 */
export function rejectFriendRequest(id: string) {
  return apiPut<ApiResponse<void>>(`/api/social/friend-requests/${id}/reject`, undefined, getToken())
}

/** 通过群号搜索群聊 */
export function searchGroupByCode(code: string) {
  return apiGet<ApiResponse<ConversationVO>>(`/api/social/conversations/search-by-code?code=${encodeURIComponent(code)}`, getToken())
}

/** 申请加入群聊 */
export function requestJoinGroup(id: string, body?: JoinGroupRequestDto) {
  return apiPost<ApiResponse<GroupJoinRequestVO>>(`/api/social/conversations/${id}/join`, body, getToken())
}

/** 查看待审批入群申请（仅群主） */
export function getGroupJoinRequests(id: string) {
  return apiGet<ApiResponse<GroupJoinRequestVO[]>>(`/api/social/conversations/${id}/join-requests`, getToken())
}

/** 同意入群申请（仅群主） */
export function acceptJoinRequest(conversationId: string, requestId: string) {
  return apiPut<ApiResponse<void>>(
    `/api/social/conversations/${conversationId}/join-requests/${requestId}/accept`,
    undefined,
    getToken()
  )
}

/** 拒绝入群申请（仅群主） */
export function rejectJoinRequest(conversationId: string, requestId: string) {
  return apiPut<ApiResponse<void>>(
    `/api/social/conversations/${conversationId}/join-requests/${requestId}/reject`,
    undefined,
    getToken()
  )
}

// ============================================================
// Phase 3 — 拓展功能 API
// ============================================================

/** 切换免打扰状态 */
export function toggleMute(id: string) {
  return apiPut<ApiResponse<boolean>>(`/api/social/conversations/${id}/mute`, undefined, getToken())
}

/** 切换隐藏状态 */
export function toggleHide(id: string) {
  return apiPut<ApiResponse<boolean>>(`/api/social/conversations/${id}/hide`, undefined, getToken())
}

/** 上传文件附件 */
export function uploadAttachment(id: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return apiUpload<ApiResponse<MessageAttachmentVO>>(
    `/api/social/conversations/${id}/upload`,
    formData,
    getToken()
  )
}

/** 获取未读消息数 */
export function getUnreadCount(id: string) {
  return apiGet<ApiResponse<number>>(`/api/social/conversations/${id}/unread`, getToken())
}

/** 标记会话已读 */
export function markConversationAsRead(id: string) {
  return apiPut<ApiResponse<void>>(`/api/social/conversations/${id}/read`, undefined, getToken())
}

/** 在会话内搜索消息 */
export function searchMessages(convId: string, q: string, page = 1, size = 20) {
  return apiGet<ApiResponse<PageResponse<MessageVO>>>(
    `/api/social/conversations/${convId}/messages/search?q=${encodeURIComponent(q)}&page=${page}&size=${size}`,
    getToken()
  )
}

/** 更换群头像 */
export function updateGroupAvatar(convId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return apiUpload<ApiResponse<string>>(`/api/social/conversations/${convId}/avatar`, formData, getToken())
}
