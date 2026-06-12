<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick, defineAsyncComponent } from 'vue'
import { MoreVertical, Bell, BellOff, EyeOff, LogOut, Users, UserPlus, Info, Bean } from 'lucide-vue-next'
import { useSocialStore } from '@/stores/social'
import { useEditorStore } from '@/stores/editor'
import { useAuthStore } from '@/stores/auth'
import { usePostStore } from '@/stores/post'
import { API_BASE_URL } from '@/api/http'
import { avatarColor } from '@/utils/format'
import MessageBubble from './MessageBubble.vue'
import ChatInput from './ChatInput.vue'
import GroupJoinRequestsPanel from './GroupJoinRequestsPanel.vue'
import GroupInfoPanel from './GroupInfoPanel.vue'
import FriendInfoPanel from './FriendInfoPanel.vue'
import NotificationBar from './NotificationBar.vue'
import BeanDetailCard from './BeanDetailCard.vue'

const props = defineProps<{
  conversationId: string
}>()

const store = useSocialStore()
const editorStore = useEditorStore()
const authStore = useAuthStore()
const messageListRef = ref<HTMLDivElement | null>(null)
const showMenu = ref(false)
const showJoinRequests = ref(false)
const showGroupInfo = ref(false)
const showFriendInfo = ref(false)
const avatarImgError = ref(false)

const postStore = usePostStore()

const isNotificationConversation = computed(() => {
  return store.activeConversation?.type === 'SYSTEM_NOTIFY' ||
         store.activeConversation?.type === 'BEAN_NOTIFY'
})

const isBeanNotify = computed(() => {
  return store.activeConversation?.type === 'BEAN_NOTIFY'
})

const beanDetail = ref<{ show: boolean; message: any }>({ show: false, message: null })

function handleNotificationClick(msg: any) {
  if (isBeanNotify.value) {
    beanDetail.value = { show: true, message: msg }
    return
  }
  if (msg.targetType && msg.targetId) {
    jumpToTarget(msg.targetType, msg.targetId)
  }
}

function jumpToTarget(targetType: string, targetId: string) {
  if (targetType === 'POST') {
    postStore.selectPost(targetId, 'regular')
    editorStore.openComponentTab(
      `post:detail:${targetId}`,
      '帖子详情',
      defineAsyncComponent(() => import('@/components/Editor/PostDetail.vue')),
      { postId: targetId, postType: 'regular' }
    )
  }
  // OFFER type: no dedicated detail component yet, skip navigation
}

function handleBeanNavigate(targetType: string, targetId: string) {
  beanDetail.value.show = false
  jumpToTarget(targetType, targetId)
}

function closeBeanDetail() {
  beanDetail.value.show = false
}

const currentUser = computed(() => authStore.user as Record<string, unknown> | null)

function isOwnMessage(senderId: string): boolean {
  return senderId === (currentUser.value?.id as string)
}

function shouldShowSender(msg: any, index: number): boolean {
  if (msg.messageType === 'SYSTEM') return false
  if (index === 0) return true
  const prev = store.messages[index - 1]
  if (!prev || prev.messageType === 'SYSTEM') return true
  return prev.senderId !== msg.senderId
}

function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

function handleScroll() {
  if (!messageListRef.value) return
  // 滚动到顶部时加载更多
  if (messageListRef.value.scrollTop < 50 && store.hasMoreMessages && !store.loadingMessages) {
    const prevScrollHeight = messageListRef.value.scrollHeight
    store.loadMoreMessages().then(() => {
      nextTick(() => {
        if (messageListRef.value) {
          messageListRef.value.scrollTop = messageListRef.value.scrollHeight - prevScrollHeight
        }
      })
    })
  }
}

// 监听消息变化自动滚动
watch(() => store.messages.length, () => {
  // 仅在消息数量增加时滚动（发送新消息或加载历史）
  scrollToBottom()
})

let pollTimer: ReturnType<typeof setInterval> | null = null

watch(() => props.conversationId, (newId) => {
  if (newId) {
    store.selectConversation(newId)
    if (pollTimer) { clearInterval(pollTimer) }
    pollTimer = setInterval(() => store.pollNewMessages(), 5000)
  }
}, { immediate: true })

function handleLeave() {
  if (!store.activeConversation) return
  const name = store.activeConversation.name || '此会话'
  const isPrivate = store.activeConversation.type === 'PRIVATE'
  const confirmMsg = isPrivate
    ? `确定要删除好友 ${name} 吗？`
    : `确定要退出 ${name} 吗？`
  if (confirm(confirmMsg)) {
    store.leaveConversation(store.activeConversation.id).then(() => {
      editorStore.closeTab(`chat:conv:${props.conversationId}`)
    }).catch(e => {
      alert(e.message || '操作失败')
    })
  }
}

function getAvatarUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return API_BASE_URL + path
}

function handleToggleMute() {
  if (store.activeConversation) {
    store.toggleMute(store.activeConversation.id)
  }
}

onUnmounted(() => {
  store.clearActiveConversation()
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
})
</script>

<template>
  <div class="h-full flex flex-col bg-vscode-bg">
    <!-- 头部栏 -->
    <div class="flex items-center justify-between px-4 py-2.5 border-b border-vscode-border bg-vscode-bg">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs overflow-hidden" :style="{ backgroundColor: avatarColor(store.activeConversation?.id || 'default') }">
          <img
            v-if="store.activeConversation?.avatar && !avatarImgError"
            :src="getAvatarUrl(store.activeConversation.avatar)"
            :alt="store.activeConversation.name"
            class="w-full h-full object-cover"
            @error="avatarImgError = true"
          />
          <span v-else>{{ (store.activeConversation?.name || '?')[0] }}</span>
        </div>
        <div>
          <div class="text-sm font-medium text-vscode-text flex items-center gap-1.5">
            {{ store.activeConversation?.name || (store.activeConversation?.type === 'GROUP' ? '未命名群聊' : '未知用户') }}
            <span v-if="store.activeConversation?.type === 'GROUP'" class="badge flex-shrink-0" style="background:var(--color-primary-subtle);color:var(--color-primary-dark);font-size:10px;padding:1px 6px;">群</span>
          </div>
          <div class="text-xs text-vscode-text-secondary">
            <template v-if="store.activeConversation?.type === 'GROUP'">
              {{ store.activeConversation?.memberCount ?? store.activeConversation?.members?.length ?? '?' }} 人
            </template>
            <template v-else>
              私聊
            </template>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-1 relative">
        <!-- 会话信息 -->
        <button
          class="p-1.5 rounded hover:bg-vscode-active transition-colors text-vscode-icon"
          :title="store.activeConversation?.type === 'GROUP' ? '群聊信息' : '好友信息'"
          @click="store.activeConversation?.type === 'GROUP' ? (showGroupInfo = !showGroupInfo) : (showFriendInfo = !showFriendInfo)"
        >
          <Info class="w-4 h-4" />
        </button>

        <!-- 免打扰 -->
        <button
          class="p-1.5 rounded hover:bg-vscode-active transition-colors"
          :class="store.activeConversation?.isMuted ? 'text-vscode-warning' : 'text-vscode-icon'"
          title="切换免打扰"
          @click="handleToggleMute"
        >
          <BellOff v-if="store.activeConversation?.isMuted" class="w-4 h-4" />
          <Bell v-else class="w-4 h-4" />
        </button>

        <!-- 群主查看入群申请 -->
        <button
          v-if="store.activeConversation?.type === 'GROUP' && store.activeConversation?.role === 'OWNER'"
          class="p-1.5 rounded hover:bg-vscode-active transition-colors text-vscode-icon"
          title="入群申请"
          @click="showJoinRequests = !showJoinRequests"
        >
          <UserPlus class="w-4 h-4" />
        </button>

        <!-- 更多菜单 -->
        <div class="relative">
          <button
            class="p-1.5 rounded hover:bg-vscode-active transition-colors text-vscode-icon"
            @click="showMenu = !showMenu"
          >
            <MoreVertical class="w-4 h-4" />
          </button>
          <div
            v-if="showMenu"
            class="absolute right-0 top-full mt-1 w-40 bg-vscode-sidebar border border-vscode-border rounded-md shadow-lg z-10 py-1"
          >
            <button
              class="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-vscode-text hover:bg-vscode-active transition-colors"
              @click="showMenu = false; showJoinRequests = !showJoinRequests"
              v-if="store.activeConversation?.type === 'GROUP' && store.activeConversation?.role === 'OWNER'"
            >
              <Users class="w-4 h-4" />
              查看入群申请
            </button>
            <button
              class="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-vscode-text hover:bg-vscode-active transition-colors"
              @click="showMenu = false; handleToggleMute"
            >
              <BellOff v-if="store.activeConversation?.isMuted" class="w-4 h-4" />
              <Bell v-else class="w-4 h-4" />
              {{ store.activeConversation?.isMuted ? '取消免打扰' : '免打扰' }}
            </button>
            <button
              class="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-vscode-text hover:bg-vscode-active transition-colors"
              @click="showMenu = false; store.activeConversation && store.toggleHide(store.activeConversation.id)"
            >
              <EyeOff class="w-4 h-4" />
              隐藏会话
            </button>
            <hr class="border-vscode-border my-1" />
            <button
              class="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-danger hover:bg-danger-subtle transition-colors"
              @click="showMenu = false; handleLeave()"
            >
              <LogOut class="w-4 h-4" />
              {{ store.activeConversation?.type === 'PRIVATE' ? '删除好友' : '退出会话' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 入群申请面板（群主） -->
    <GroupJoinRequestsPanel
      v-if="showJoinRequests && store.activeConversation"
      :conversation-id="store.activeConversation.id"
      @close="showJoinRequests = false"
    />

    <!-- 群聊信息面板 -->
    <GroupInfoPanel
      :show="showGroupInfo"
      :conversation-id="props.conversationId"
      @close="showGroupInfo = false"
    />

    <!-- 好友信息面板 -->
    <FriendInfoPanel
      :show="showFriendInfo"
      :conversation-id="props.conversationId"
      @close="showFriendInfo = false"
    />

    <!-- 消息/通知列表 -->
    <div
      ref="messageListRef"
      class="flex-1 overflow-y-auto"
      :class="{ 'py-2': !isNotificationConversation }"
      @scroll="handleScroll"
    >
      <!-- Notification list mode -->
      <template v-if="isNotificationConversation">
        <div
          v-if="store.loadingMessages && store.messagePage > 1"
          class="text-center py-3 text-xs text-vscode-text-secondary"
        >
          加载中...
        </div>

        <div
          v-if="!store.hasMoreMessages && store.messages.length > 0"
          class="text-center py-3 text-xs text-vscode-text-secondary"
        >
          — 没有更多通知了 —
        </div>

        <div
          v-if="!store.loadingMessages && store.messages.length === 0"
          class="h-full flex flex-col items-center justify-center text-vscode-text-secondary"
        >
          <div class="mb-3 opacity-30 flex items-center justify-center">
            <Bell v-if="!isBeanNotify" :size="36" />
            <Bean v-else :size="36" />
          </div>
          <div class="text-sm">暂无通知</div>
        </div>

        <NotificationBar
          v-for="msg in store.messages"
          :key="msg.id"
          :message="msg"
          @click="handleNotificationClick"
        />
      </template>

      <!-- Normal message list mode -->
      <template v-else>
        <!-- 加载提示 -->
        <div
          v-if="store.loadingMessages && store.messagePage > 1"
          class="text-center py-3 text-xs text-vscode-text-secondary"
        >
          加载中...
        </div>

        <!-- 无更多消息 -->
        <div
          v-if="!store.hasMoreMessages && store.messages.length > 0"
          class="text-center py-3 text-xs text-vscode-text-secondary"
        >
          — 没有更多消息了 —
        </div>

        <!-- 空态 -->
        <div
          v-if="!store.loadingMessages && store.messages.length === 0"
          class="h-full flex flex-col items-center justify-center text-vscode-text-secondary"
        >
          <div class="text-4xl mb-3 opacity-30"><MessageCircle :size="36" style="opacity:0.3;" /></div>
          <div class="text-sm">暂无消息，开始聊天吧</div>
        </div>

        <!-- 消息列表 -->
        <MessageBubble
          v-for="(msg, idx) in store.messages"
          :key="msg.id"
          :message="msg"
          :is-own="isOwnMessage(msg.senderId)"
          :show-sender="shouldShowSender(msg, idx)"
        />
      </template>
    </div>

    <!-- 输入区域 -->
    <ChatInput v-if="!isNotificationConversation" />

    <BeanDetailCard
      :show="beanDetail.show"
      :message="beanDetail.message"
      @close="closeBeanDetail"
      @navigate="handleBeanNavigate"
    />
  </div>
</template>
