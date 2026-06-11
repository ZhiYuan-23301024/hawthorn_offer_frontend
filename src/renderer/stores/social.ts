import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ConversationVO, MessageVO, UserBriefVO,
  FriendRequestVO, GroupJoinRequestVO, FriendListVO
} from '@/api/social'
import * as socialApi from '@/api/social'
import { useAuthStore } from '@/stores/auth'

export const useSocialStore = defineStore('social', () => {
  // ============================================================
  // 会话状态
  // ============================================================
  const conversations = ref<ConversationVO[]>([])
  const activeConversationId = ref<string | null>(null)
  const loadingConversations = ref(false)

  // ============================================================
  // 消息状态
  // ============================================================
  const messages = ref<MessageVO[]>([])
  const messagePage = ref(1)
  const messageTotal = ref(0)
  const loadingMessages = ref(false)
  const sendingMessage = ref(false)
  const hasMoreMessages = computed(() => messages.value.length < messageTotal.value)

  // ============================================================
  // 用户搜索状态
  // ============================================================
  const searchResults = ref<UserBriefVO[]>([])
  const searchingUsers = ref(false)

  // ============================================================
  // 会话搜索状态
  // ============================================================
  const searchedConversations = ref<ConversationVO[]>([])
  const searchingConversations = ref(false)

  // ============================================================
  // 通讯录状态
  // ============================================================
  const contacts = ref<FriendListVO | null>(null)
  const loadingContacts = ref(false)

  // ============================================================
  // 好友请求状态
  // ============================================================
  const pendingFriendRequests = ref<FriendRequestVO[]>([])
  const allReceivedRequests = ref<FriendRequestVO[]>([])
  const sentFriendRequests = ref<FriendRequestVO[]>([])
  const loadingFriendRequests = ref(false)

  // ============================================================
  // 群搜索 / 入群申请状态
  // ============================================================
  const groupSearchResult = ref<ConversationVO | null>(null)
  const searchingGroup = ref(false)
  const groupJoinRequests = ref<GroupJoinRequestVO[]>([])
  const loadingJoinRequests = ref(false)

  // 全局入群申请（所有 OWNER 群的待审批申请聚合）
  const allGroupJoinRequests = ref<GroupJoinRequestVO[]>([])
  const loadingAllGroupJoinRequests = ref(false)

  // ============================================================
  // 计算属性
  // ============================================================
  const activeConversation = computed(() =>
    conversations.value.find(c => c.id === activeConversationId.value) || null
  )

  const totalUnread = computed(() =>
    conversations.value.reduce((sum, c) => sum + (c.isMuted ? 0 : (c.unreadCount || 0)), 0)
  )

  const pendingRequestCount = computed(() =>
    pendingFriendRequests.value.length
  )

  /** Whether the active conversation is a system notification conversation */
  const isSystemNotifyConversation = computed(() => {
    const conv = conversations.value.find(c => c.id === activeConversationId.value)
    return conv?.type === 'SYSTEM_NOTIFY'
  })

  /** Whether the active conversation is a bean notification conversation */
  const isBeanNotifyConversation = computed(() => {
    const conv = conversations.value.find(c => c.id === activeConversationId.value)
    return conv?.type === 'BEAN_NOTIFY'
  })

  /** Whether the active conversation is any notification type */
  const isNotificationConversation = computed(() => {
    return isSystemNotifyConversation.value || isBeanNotifyConversation.value
  })

  /** Notification conversations (for pin-to-top display) */
  const notificationConversations = computed(() => {
    return conversations.value.filter(
      c => c.type === 'SYSTEM_NOTIFY' || c.type === 'BEAN_NOTIFY'
    )
  })

  // ============================================================
  // Phase 1 — 核心聊天动作
  // ============================================================

  /** 获取会话列表 */
  async function fetchConversations() {
    loadingConversations.value = true
    try {
      const res = await socialApi.getConversations()
      if (res.code === 200) {
        conversations.value = res.data || []
        fetchAllGroupJoinRequests()
      } else {
        console.error('fetchConversations: unexpected response code', res.code, res.message)
      }
    } catch (e) {
      console.error('fetchConversations: request failed', e)
    } finally {
      loadingConversations.value = false
    }
  }

  /** 选择会话并加载消息 */
  async function selectConversation(id: string) {
    activeConversationId.value = id
    messages.value = []
    messagePage.value = 1
    messageTotal.value = 0

    // 加载第一页消息（显式传 ID 避免竞态）
    await fetchMessages(id, 1)

    // 乐观标记已读
    const conv = conversations.value.find(c => c.id === id)
    if (conv) {
      conv.unreadCount = 0
    }
    // 后端同步已读状态
    socialApi.markConversationAsRead(id).catch(() => {})
  }

  /** 获取消息（分页），conversationId 显式传入以防异步竞态 */
  async function fetchMessages(conversationId: string, page = 1) {
    loadingMessages.value = true
    try {
      const res = await socialApi.getMessages(conversationId, page, 30)
      // 竞态守卫：只有当前仍在同一会话时才应用结果
      if (activeConversationId.value !== conversationId) return
      if (res.code === 200) {
        messageTotal.value = res.data.total
        messagePage.value = page
        if (page === 1) {
          messages.value = res.data.items || []
        } else {
          // 通知会话（新→旧）：旧消息追加到底部；普通聊天（旧→新）：旧消息插入到顶部
          const conv = conversations.value.find(c => c.id === conversationId)
          if (conv?.type === 'SYSTEM_NOTIFY' || conv?.type === 'BEAN_NOTIFY') {
            messages.value = [...messages.value, ...(res.data.items || [])]
          } else {
            messages.value = [...(res.data.items || []), ...messages.value]
          }
        }
      }
    } finally {
      loadingMessages.value = false
    }
  }

  /** 加载更早的消息（上拉加载） */
  async function loadMoreMessages() {
    if (!hasMoreMessages.value || loadingMessages.value) return
    const convId = activeConversationId.value
    if (!convId) return
    await fetchMessages(convId, messagePage.value + 1)
  }

  /** 轮询新消息（对方发来的实时消息） */
  async function pollNewMessages() {
    const convId = activeConversationId.value
    if (!convId || loadingMessages.value) return
    try {
      const res = await socialApi.getMessages(convId, 1, 30)
      // 竞态守卫：轮询期间用户可能切换了会话
      if (activeConversationId.value !== convId) return
      if (res.code === 200) {
        const serverMessages = res.data.items || []
        const existingIds = new Set(messages.value.map(m => m.id))
        const newMsgs = serverMessages.filter(m => !existingIds.has(m.id))
        if (newMsgs.length > 0) {
          // 通知会话：新消息插入到顶部；普通聊天：追加到底部
          const conv = conversations.value.find(c => c.id === convId)
          if (conv?.type === 'SYSTEM_NOTIFY' || conv?.type === 'BEAN_NOTIFY') {
            messages.value = [...newMsgs, ...messages.value]
          } else {
            messages.value = [...messages.value, ...newMsgs]
          }
          await fetchConversations()
          if (activeConversationId.value === convId) {
            socialApi.markConversationAsRead(convId).catch(() => {})
          }
        }
      }
    } catch {
      // 静默忽略轮询错误
    }
  }

  /** 发送消息（乐观更新） */
  async function sendMessage(content: string) {
    // Notification conversations cannot send messages
    const conv = conversations.value.find(c => c.id === activeConversationId.value)
    if (conv?.type === 'SYSTEM_NOTIFY' || conv?.type === 'BEAN_NOTIFY') {
      return
    }
    if (!activeConversationId.value || !content.trim()) return
    sendingMessage.value = true

    const tempId = `temp-${Date.now()}`
    const authStore = useAuthStore()
    const optimistic: MessageVO = {
      id: tempId,
      conversationId: activeConversationId.value,
      senderId: (authStore.user?.id as string) || '',
      senderNickname: (authStore.user?.nickname as string) || '我',
      senderAvatar: (authStore.user?.avatar as string) || '',
      content: content.trim(),
      messageType: 'TEXT',
      attachments: [],
      createdAt: new Date().toISOString()
    }

    // 乐观插入
    messages.value = [...messages.value, optimistic]

    try {
      const res = await socialApi.sendMessage(activeConversationId.value, {
        content: content.trim(),
        messageType: 'TEXT'
      })
      if (res.code === 200 && res.data) {
        // 替换临时消息
        const idx = messages.value.findIndex(m => m.id === tempId)
        if (idx >= 0) {
          messages.value[idx] = res.data
        }
        bumpConversationInList(activeConversationId.value, res.data.content, res.data.createdAt)
      } else {
        // 失败则移除临时消息
        messages.value = messages.value.filter(m => m.id !== tempId)
      }
    } catch {
      messages.value = messages.value.filter(m => m.id !== tempId)
    } finally {
      sendingMessage.value = false
    }
  }

  /** 清除当前会话状态 */
  function clearActiveConversation() {
    activeConversationId.value = null
    messages.value = []
    messagePage.value = 1
    messageTotal.value = 0
  }

  /** 本地更新会话列表排序（不发网络请求） */
  function bumpConversationInList(convId: string, lastMessageText: string, lastMessageAt: string) {
    const conv = conversations.value.find(c => c.id === convId)
    if (conv) {
      conv.lastMessageText = lastMessageText
      conv.lastMessageAt = lastMessageAt
      conv.unreadCount = 0
      conversations.value.sort((a, b) =>
        new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
      )
    }
  }

  // ============================================================
  // Phase 1 — 用户搜索 & 创建群聊动作
  // ============================================================

  /** 搜索用户 */
  async function searchUsers(q: string) {
    if (!q.trim()) {
      searchResults.value = []
      return
    }
    searchingUsers.value = true
    try {
      const res = await socialApi.searchUsers(q.trim())
      if (res.code === 200) {
        searchResults.value = res.data || []
      }
    } finally {
      searchingUsers.value = false
    }
  }

  /** 搜索会话（后端接口，含已隐藏会话） */
  async function searchConversations(q: string) {
    if (!q.trim()) {
      searchedConversations.value = []
      return
    }
    searchingConversations.value = true
    try {
      const res = await socialApi.searchConversations(q.trim())
      if (res.code === 200) {
        searchedConversations.value = res.data || []
      }
    } finally {
      searchingConversations.value = false
    }
  }

  /** 获取通讯录（好友列表 + 群聊列表） */
  async function fetchContacts() {
    loadingContacts.value = true
    try {
      const res = await socialApi.getFriends()
      if (res.code === 200) {
        contacts.value = res.data
      }
    } catch {
      // silent
    } finally {
      loadingContacts.value = false
    }
  }

  /** 创建群聊 */
  async function createGroup(name: string, memberIds: string[]) {
    const res = await socialApi.createGroup({ name, memberIds })
    if (res.code === 200 && res.data) {
      await fetchConversations()
      return res.data
    }
    return null
  }

  // ============================================================
  // Phase 2 — 好友请求动作
  // ============================================================

  /** 获取待处理、已发送和所有收到的的好友申请 */
  async function fetchFriendRequests() {
    loadingFriendRequests.value = true
    try {
      const [pendingRes, sentRes, receivedRes] = await Promise.all([
        socialApi.getPendingFriendRequests(),
        socialApi.getSentFriendRequests(),
        socialApi.getReceivedRequests()
      ])
      if (pendingRes.code === 200) {
        pendingFriendRequests.value = pendingRes.data || []
      }
      if (sentRes.code === 200) {
        sentFriendRequests.value = sentRes.data || []
      }
      if (receivedRes.code === 200) {
        allReceivedRequests.value = receivedRes.data || []
      }
    } finally {
      loadingFriendRequests.value = false
    }
  }

  /** 发送好友申请 */
  async function sendFriendRequest(toUserId: string, message?: string) {
    const res = await socialApi.sendFriendRequest({ toUserId, message })
    if (res.code === 200) {
      await fetchFriendRequests()
      return res.data
    }
    throw new Error(res.message || '发送失败')
  }

  /** 接受好友申请 */
  async function acceptFriendRequest(id: string) {
    const res = await socialApi.acceptFriendRequest(id)
    if (res.code === 200) {
      await fetchFriendRequests()
      await fetchConversations()
      return res.data
    }
    throw new Error(res.message || '操作失败')
  }

  /** 拒绝好友申请 */
  async function rejectFriendRequest(id: string) {
    const res = await socialApi.rejectFriendRequest(id)
    if (res.code === 200) {
      await fetchFriendRequests()
      return
    }
    throw new Error(res.message || '操作失败')
  }

  // ============================================================
  // Phase 2 — 群搜索 / 入群申请动作
  // ============================================================

  /** 通过群号搜索群聊 */
  async function searchGroupByCode(code: string) {
    searchingGroup.value = true
    groupSearchResult.value = null
    try {
      const res = await socialApi.searchGroupByCode(code)
      if (res.code === 200) {
        groupSearchResult.value = res.data
        return res.data
      }
      return null
    } finally {
      searchingGroup.value = false
    }
  }

  /** 申请加入群聊 */
  async function requestJoinGroup(conversationId: string, message?: string) {
    const res = await socialApi.requestJoinGroup(conversationId, message ? { message } : undefined)
    if (res.code === 200) {
      return res.data
    }
    throw new Error(res.message || '申请失败')
  }

  /** 获取待审批入群申请（群主） */
  async function fetchGroupJoinRequests(conversationId: string) {
    loadingJoinRequests.value = true
    try {
      const res = await socialApi.getGroupJoinRequests(conversationId)
      if (res.code === 200) {
        groupJoinRequests.value = res.data || []
      }
    } finally {
      loadingJoinRequests.value = false
    }
  }

  /** 获取所有 OWNER 群的待审批入群申请（聚合） */
  async function fetchAllGroupJoinRequests() {
    const ownedGroups = conversations.value.filter(
      c => c.type === 'GROUP' && c.role === 'OWNER'
    )
    if (ownedGroups.length === 0) {
      allGroupJoinRequests.value = []
      return
    }
    loadingAllGroupJoinRequests.value = true
    try {
      const results = await Promise.all(
        ownedGroups.map(g => socialApi.getGroupJoinRequests(g.id))
      )
      allGroupJoinRequests.value = results
        .filter(r => r.code === 200 && r.data)
        .flatMap(r => r.data!)
    } finally {
      loadingAllGroupJoinRequests.value = false
    }
  }

  /** 同意入群申请 */
  async function acceptJoinRequest(conversationId: string, requestId: string, applicantName: string) {
    const res = await socialApi.acceptJoinRequest(conversationId, requestId)
    if (res.code === 200) {
      // 乐观更新：从两个待审列表移除
      groupJoinRequests.value = groupJoinRequests.value.filter(r => r.id !== requestId)
      allGroupJoinRequests.value = allGroupJoinRequests.value.filter(r => r.id !== requestId)
      // 添加系统消息到当前消息列表
      if (activeConversationId.value === conversationId) {
        messages.value = [...messages.value, {
          id: `sys-${Date.now()}`,
          conversationId,
          senderId: '',
          senderNickname: '',
          senderAvatar: '',
          content: `${applicantName} 加入了群聊`,
          messageType: 'SYSTEM',
          attachments: [],
          createdAt: new Date().toISOString()
        }]
      }
      return
    }
    throw new Error(res.message || '操作失败')
  }

  /** 拒绝入群申请 */
  async function rejectJoinRequest(conversationId: string, requestId: string) {
    const res = await socialApi.rejectJoinRequest(conversationId, requestId)
    if (res.code === 200) {
      groupJoinRequests.value = groupJoinRequests.value.filter(r => r.id !== requestId)
      allGroupJoinRequests.value = allGroupJoinRequests.value.filter(r => r.id !== requestId)
      return
    }
    throw new Error(res.message || '操作失败')
  }

  // ============================================================
  // Phase 3 — 拓展功能动作
  // ============================================================

  /** 切换免打扰（乐观更新） */
  async function toggleMute(conversationId: string) {
    const conv = conversations.value.find(c => c.id === conversationId)
    if (conv) {
      conv.isMuted = !conv.isMuted
    }
    try {
      const res = await socialApi.toggleMute(conversationId)
      if (res.code === 200 && conv) {
        conv.isMuted = res.data as unknown as boolean
      }
    } catch {
      if (conv) conv.isMuted = !conv.isMuted // 回滚
    }
  }

  /** 切换隐藏（乐观更新） */
  async function toggleHide(conversationId: string) {
    const conv = conversations.value.find(c => c.id === conversationId)
    if (conv) {
      conv.isHidden = !conv.isHidden
    }
    try {
      const res = await socialApi.toggleHide(conversationId)
      if (res.code === 200 && conv) {
        conv.isHidden = res.data as unknown as boolean
      }
    } catch {
      if (conv) conv.isHidden = !conv.isHidden // 回滚
    }
  }

  /** 退出/删除会话 */
  async function leaveConversation(conversationId: string) {
    const res = await socialApi.leaveConversation(conversationId)
    if (res.code === 200) {
      conversations.value = conversations.value.filter(c => c.id !== conversationId)
      if (activeConversationId.value === conversationId) {
        clearActiveConversation()
      }
      return
    }
    throw new Error(res.message || '操作失败')
  }

  /** 上传文件 */
  async function uploadFile(conversationId: string, file: File) {
    const res = await socialApi.uploadAttachment(conversationId, file)
    if (res.code === 200) {
      bumpConversationInList(conversationId, `[文件] ${file.name}`, new Date().toISOString())
      return res.data
    }
    throw new Error(res.message || '上传失败')
  }

  // ============================================================
  // 导出
  // ============================================================

  return {
    // 会话
    conversations, activeConversationId, loadingConversations,
    activeConversation, totalUnread,
    isSystemNotifyConversation, isBeanNotifyConversation,
    isNotificationConversation, notificationConversations,
    fetchConversations, selectConversation, clearActiveConversation,
    // 消息
    messages, messagePage, messageTotal, loadingMessages, sendingMessage, hasMoreMessages,
    fetchMessages, loadMoreMessages, pollNewMessages, sendMessage,
    // 搜索
    searchResults, searchingUsers,
    searchedConversations, searchingConversations,
    searchUsers, searchConversations, createGroup,
    // 通讯录
    contacts, loadingContacts, fetchContacts,
    // 好友请求
    pendingFriendRequests, sentFriendRequests, allReceivedRequests, loadingFriendRequests, pendingRequestCount,
    fetchFriendRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest,
    // 群搜索/入群
    groupSearchResult, searchingGroup, groupJoinRequests, loadingJoinRequests,
    allGroupJoinRequests, loadingAllGroupJoinRequests,
    searchGroupByCode, requestJoinGroup, fetchGroupJoinRequests, fetchAllGroupJoinRequests,
    acceptJoinRequest, rejectJoinRequest,
    // 拓展功能
    toggleMute, toggleHide, leaveConversation, uploadFile
  }
})
