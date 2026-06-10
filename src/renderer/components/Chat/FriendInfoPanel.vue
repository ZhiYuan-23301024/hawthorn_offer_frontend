<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { X, MessageSquare, FileText, Image, Loader, BellOff, Bell, UserX, Link, Search } from 'lucide-vue-next'
import type { ConversationVO, MemberVO, MessageVO } from '@/api/social'
import { getConversationDetail, getMessages, searchMessages } from '@/api/social'
import { useSocialStore } from '@/stores/social'
import { useEditorStore } from '@/stores/editor'
import { useAuthStore } from '@/stores/auth'
import { API_BASE_URL } from '@/api/http'

const props = defineProps<{
  show: boolean
  conversationId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useSocialStore()
const editorStore = useEditorStore()
const authStore = useAuthStore()

type PanelTab = 'profile' | 'history'
type HistoryFilter = 'all' | 'image' | 'file' | 'link'

const activeTab = ref<PanelTab>('profile')
const historyFilter = ref<HistoryFilter>('all')
const historySearchQuery = ref('')
const historySearching = ref(false)
const historySearchResults = ref<MessageVO[]>([])
const historySearchPage = ref(1)
const historySearchTotal = ref(0)

// 会话详情
const detail = ref<ConversationVO | null>(null)
const loadingDetail = ref(false)

// 历史消息
const historyMessages = ref<MessageVO[]>([])
const loadingHistory = ref(false)
const historyPage = ref(1)
const historyTotal = ref(0)

// 对方用户信息（从 members 中提取）
const friendInfo = computed(() => {
  if (!detail.value?.members) return null
  const currentUserId = (authStore.user as any)?.id
  return detail.value.members.find(m => m.userId !== currentUserId) || detail.value.members[0] || null
})

watch(() => props.show, async (val) => {
  if (val && props.conversationId) {
    activeTab.value = 'profile'
    historyFilter.value = 'all'
    await fetchDetail()
  } else {
    detail.value = null
    historyMessages.value = []
    historyPage.value = 1
    historyTotal.value = 0
    historySearchQuery.value = ''
    historySearchResults.value = []
    if (searchTimer) { clearTimeout(searchTimer); searchTimer = null }
  }
})

async function fetchDetail() {
  loadingDetail.value = true
  try {
    const res = await getConversationDetail(props.conversationId)
    if (res.code === 200) {
      detail.value = res.data
    }
  } catch {
    // silent
  } finally {
    loadingDetail.value = false
  }
}

async function fetchHistory(page: number) {
  loadingHistory.value = true
  try {
    const res = await getMessages(props.conversationId, page, 20)
    if (res.code === 200) {
      historyTotal.value = res.data.total
      historyPage.value = page
      if (page === 1) {
        historyMessages.value = res.data.items || []
      } else {
        historyMessages.value = [...(res.data.items || []), ...historyMessages.value]
      }
    }
  } catch {
    // silent
  } finally {
    loadingHistory.value = false
  }
}

async function switchToHistory() {
  activeTab.value = 'history'
  if (historyMessages.value.length === 0) {
    await fetchHistory(1)
  }
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) +
    ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function getAttachmentUrl(storagePath: string): string {
  if (storagePath.startsWith('http')) return storagePath
  return `${API_BASE_URL}${storagePath}`
}

const urlRegex = /https?:\/\/[^\s]+/g

const filteredHistory = computed(() => {
  if (historySearchQuery.value.trim()) return historySearchResults.value
  if (historyFilter.value === 'all') return historyMessages.value
  if (historyFilter.value === 'link') return historyMessages.value.filter(m => m.messageType === 'TEXT' && urlRegex.test(m.content))
  const type = historyFilter.value === 'image' ? 'IMAGE' : 'FILE'
  return historyMessages.value.filter(m => m.messageType === type)
})

const hasMoreHistory = computed(() => {
  if (historySearchQuery.value.trim()) return historySearchResults.value.length < historySearchTotal.value
  return historyMessages.value.length < historyTotal.value
})

// 防抖自动搜索
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(historySearchQuery, (q) => {
  if (searchTimer) clearTimeout(searchTimer)
  if (!q.trim()) { historySearchResults.value = []; return }
  searchTimer = setTimeout(async () => {
    historySearching.value = true
    try {
      const res = await searchMessages(props.conversationId, q.trim(), 1, 20)
      if (res.code === 200) {
        historySearchResults.value = res.data.items || []
        historySearchPage.value = 1
        historySearchTotal.value = res.data.total
      }
    } catch { /* silent */ } finally { historySearching.value = false }
  }, 300)
})

async function loadMoreSearchResults() {
  if (historySearching.value) return
  const np = historySearchPage.value + 1
  historySearching.value = true
  try {
    const res = await searchMessages(props.conversationId, historySearchQuery.value.trim(), np, 20)
    if (res.code === 200) {
      historySearchResults.value = [...historySearchResults.value, ...(res.data.items || [])]
      historySearchPage.value = np
      historySearchTotal.value = res.data.total
    }
  } catch { /* silent */ } finally { historySearching.value = false }
}

function clearHistorySearch() {
  historySearchQuery.value = ''
  historySearchResults.value = []
}

function handleDeleteFriend() {
  const name = friendInfo.value?.nickname || detail.value?.name || '此好友'
  if (confirm(`确定要删除好友 ${name} 吗？`)) {
    store.leaveConversation(props.conversationId).then(() => {
      editorStore.closeTab(`chat:conv:${props.conversationId}`)
      emit('close')
    }).catch(e => {
      alert(e.message || '操作失败')
    })
  }
}

function handleToggleMute() {
  if (detail.value) {
    store.toggleMute(props.conversationId)
    detail.value.isMuted = !detail.value.isMuted
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 bg-black/50"
      @click.self="emit('close')"
    >
      <div class="absolute right-0 top-0 h-full w-[360px] bg-vscode-sidebar border-l border-vscode-border shadow-2xl flex flex-col">
        <!-- 头部 -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-vscode-border">
          <h3 class="text-sm font-semibold text-vscode-text">好友信息</h3>
          <button
            class="p-1 rounded hover:bg-vscode-active transition-colors text-vscode-icon"
            @click="emit('close')"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- 加载中 -->
        <div v-if="loadingDetail" class="flex-1 flex items-center justify-center">
          <Loader class="w-5 h-5 animate-spin text-vscode-text-secondary" />
        </div>

        <!-- 内容 -->
        <template v-else-if="detail && friendInfo">
          <!-- 好友头像 + 基本信息 -->
          <div class="px-4 py-4 border-b border-vscode-border">
            <div class="flex items-center gap-4 mb-3">
              <div class="w-14 h-14 rounded-full bg-vscode-active flex items-center justify-center text-xl text-vscode-text overflow-hidden flex-shrink-0">
                <img
                  v-if="friendInfo.avatar"
                  :src="friendInfo.avatar"
                  :alt="friendInfo.nickname"
                  class="w-full h-full object-cover"
                />
                <span v-else>{{ (friendInfo.nickname || '?')[0] }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-vscode-text truncate">{{ friendInfo.nickname }}</div>
                <div class="text-xs text-vscode-text-secondary mt-0.5">
                  私聊
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex gap-2">
              <button
                class="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded hover:bg-vscode-active transition-colors text-vscode-text"
                @click="handleToggleMute"
              >
                <BellOff v-if="detail.isMuted" class="w-3.5 h-3.5" />
                <Bell v-else class="w-3.5 h-3.5" />
                {{ detail.isMuted ? '已免打扰' : '免打扰' }}
              </button>
              <button
                class="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded hover:bg-red-400/10 transition-colors text-red-400"
                @click="handleDeleteFriend"
              >
                <UserX class="w-3.5 h-3.5" />
                删除好友
              </button>
            </div>
          </div>

          <!-- 标签栏 -->
          <div class="flex border-b border-vscode-border">
            <button
              class="flex-1 py-2 text-xs font-medium transition-colors border-b-2 flex items-center justify-center gap-1.5"
              :class="activeTab === 'profile'
                ? 'text-vscode-text border-vscode-info'
                : 'text-vscode-text-secondary border-transparent hover:text-vscode-text'"
              @click="activeTab = 'profile'"
            >
              资料
            </button>
            <button
              class="flex-1 py-2 text-xs font-medium transition-colors border-b-2 flex items-center justify-center gap-1.5"
              :class="activeTab === 'history'
                ? 'text-vscode-text border-vscode-info'
                : 'text-vscode-text-secondary border-transparent hover:text-vscode-text'"
              @click="switchToHistory"
            >
              <MessageSquare class="w-3.5 h-3.5" />
              记录
            </button>
          </div>

          <!-- 资料 -->
          <div v-if="activeTab === 'profile'" class="flex-1 overflow-y-auto">
            <div class="px-4 py-3 space-y-3">
              <div class="flex items-center gap-3">
                <span class="text-xs text-vscode-text-secondary w-16 flex-shrink-0">昵称</span>
                <span class="text-sm text-vscode-text">{{ friendInfo.nickname }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs text-vscode-text-secondary w-16 flex-shrink-0">加入时间</span>
                <span class="text-sm text-vscode-text">{{ friendInfo.joinedAt ? formatTime(friendInfo.joinedAt) : '-' }}</span>
              </div>
            </div>
          </div>

          <!-- 历史记录 -->
          <div v-else class="flex-1 flex flex-col overflow-hidden">
            <!-- 类型筛选 -->
            <div class="flex gap-1 px-4 py-2 border-b border-vscode-border">
              <button
                v-for="f in ([
                  { key: 'all', label: '全部' },
                  { key: 'image', label: '图片', icon: Image },
                  { key: 'file', label: '文件', icon: FileText },
                  { key: 'link', label: '链接', icon: Link },
                ] as const)"
                :key="f.key"
                class="px-3 py-1 text-xs rounded transition-colors"
                :class="historyFilter === f.key
                  ? 'bg-vscode-info/20 text-vscode-info'
                  : 'text-vscode-text-secondary hover:text-vscode-text hover:bg-vscode-active'"
                @click="historyFilter = f.key"
              >
                {{ f.label }}
              </button>
            </div>

            <!-- 搜索框 -->
            <div class="px-4 py-2 border-b border-vscode-border">
              <div class="relative">
                <Search class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vscode-text-secondary" />
                <input
                  v-model="historySearchQuery"
                  type="text"
                  class="w-full bg-vscode-bg border border-vscode-border rounded pl-7 pr-7 py-1 text-xs text-vscode-text focus:outline-none focus:border-vscode-info/50 placeholder-vscode-text-secondary"
                  placeholder="搜索消息关键词..."
                />
                <button
                  v-if="historySearchQuery"
                  class="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-vscode-active transition-colors text-vscode-text-secondary"
                  @click="clearHistorySearch"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>
            </div>

            <div class="flex-1 overflow-y-auto">
              <div v-if="(historySearching || loadingHistory) && historyPage === 1 && !historySearchQuery" class="flex items-center justify-center py-8">
                <Loader class="w-5 h-5 animate-spin text-vscode-text-secondary" />
              </div>
              <div v-else-if="filteredHistory.length === 0" class="flex flex-col items-center justify-center py-12 text-vscode-text-secondary">
                <Search v-if="historySearchQuery" class="w-8 h-8 mb-3 opacity-30" />
                <FileText v-else class="w-8 h-8 mb-3 opacity-30" />
                <div class="text-sm">{{ historySearchQuery ? '未找到匹配的消息' : '暂无消息记录' }}</div>
              </div>
              <div v-else>
                <div
                  v-for="msg in filteredHistory"
                  :key="msg.id"
                  class="px-4 py-2 border-b border-vscode-border/50 hover:bg-vscode-active/30 transition-colors"
                >
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-medium text-vscode-text">{{ msg.senderNickname || '未知用户' }}</span>
                    <span class="text-xs text-vscode-text-secondary">{{ formatTime(msg.createdAt) }}</span>
                  </div>
                  <!-- 文本消息 -->
                  <div v-if="msg.messageType === 'TEXT'" class="text-sm text-vscode-text-secondary line-clamp-2">
                    {{ msg.content }}
                  </div>
                  <!-- 图片消息 -->
                  <div v-else-if="msg.messageType === 'IMAGE' && msg.attachments?.length">
                    <a :href="getAttachmentUrl(msg.attachments[0].storagePath)" target="_blank">
                      <img
                        :src="getAttachmentUrl(msg.attachments[0].storagePath)"
                        class="max-w-[120px] max-h-[80px] rounded object-cover hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    </a>
                  </div>
                  <!-- 文件消息 -->
                  <a
                    v-else-if="msg.messageType === 'FILE' && msg.attachments?.length"
                    :href="getAttachmentUrl(msg.attachments[0].storagePath)"
                    :download="msg.attachments[0].fileName"
                    target="_blank"
                    class="text-sm text-vscode-info hover:underline flex items-center gap-1"
                  >
                    <FileText class="w-3.5 h-3.5" />
                    {{ msg.attachments[0].fileName }}
                    <span class="text-xs text-vscode-text-secondary">({{ (msg.attachments[0].fileSize / 1024).toFixed(1) }} KB)</span>
                  </a>
                </div>
              </div>
            </div>

            <!-- 加载更多 -->
            <div v-if="hasMoreHistory && !loadingHistory && !historySearching" class="text-center py-2">
              <button
                class="text-xs text-vscode-info hover:underline"
                @click="historySearchQuery ? loadMoreSearchResults() : fetchHistory(historyPage + 1)"
              >
                加载更多
              </button>
            </div>
            <div v-if="(loadingHistory || historySearching) && (historyPage > 1 || historySearchPage > 1)" class="text-center py-2 text-xs text-vscode-text-secondary">
              加载中...
            </div>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>
