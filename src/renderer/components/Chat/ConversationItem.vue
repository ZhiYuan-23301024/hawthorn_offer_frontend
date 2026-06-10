<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ConversationVO } from '@/api/social'
import { Bell, BellOff, EyeOff } from 'lucide-vue-next'
import { useSocialStore } from '@/stores/social'
import { API_BASE_URL } from '@/api/http'

const props = defineProps<{
  conversation: ConversationVO
  isActive: boolean
  searchQuery?: string
}>()

defineEmits<{
  click: [event: MouseEvent]
}>()

const store = useSocialStore()

function getAvatarUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return API_BASE_URL + path
}

interface HighlightSegment {
  text: string
  highlight: boolean
}

function highlightText(text: string, query: string): HighlightSegment[] {
  if (!query || !text) return [{ text: text || '', highlight: false }]
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return parts.filter(p => p.length > 0).map(p => ({
    text: p,
    highlight: p.toLowerCase() === query.toLowerCase()
  }))
}

const highlightedName = computed(() => highlightText(props.conversation.name || '', props.searchQuery || ''))
const highlightedPreview = computed(() => highlightText(props.conversation.lastMessageText || '', props.searchQuery || ''))

function handleToggleMute(e: Event) {
  e.stopPropagation()
  store.toggleMute(props.conversation.id)
}

function handleToggleHide(e: Event) {
  e.stopPropagation()
  store.toggleHide(props.conversation.id)
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return '昨天'
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function getPreview(text: string): string {
  if (!text) return ''
  return text.length > 30 ? text.substring(0, 30) + '...' : text
}

// 右键上下文菜单
const contextMenu = ref<{ show: boolean; x: number; y: number }>({ show: false, x: 0, y: 0 })

function handleContextMenu(e: MouseEvent) {
  e.preventDefault()
  contextMenu.value = { show: true, x: e.clientX, y: e.clientY }
}

function closeContextMenu() {
  contextMenu.value.show = false
}

function onMuteClick(e: Event) {
  e.stopPropagation()
  handleToggleMute(e)
  closeContextMenu()
}

function onHideClick(e: Event) {
  e.stopPropagation()
  handleToggleHide(e)
  closeContextMenu()
}
</script>

<template>
  <div
    class="flex items-center px-3 py-2.5 cursor-pointer transition-colors group border-l-2"
    :class="isActive
      ? 'bg-vscode-active border-l-vscode-info'
      : 'border-l-transparent hover:bg-vscode-selected/40'"
    @contextmenu.prevent="handleContextMenu"
    @click="$emit('click', $event)"
  >
    <!-- Avatar -->
    <div class="flex-shrink-0 mr-3 relative">
      <div class="w-10 h-10 rounded-full bg-vscode-active flex items-center justify-center text-sm text-vscode-text overflow-hidden">
        <img
          v-if="conversation.avatar"
          :src="getAvatarUrl(conversation.avatar)"
          :alt="conversation.name"
          class="w-full h-full object-cover"
        />
        <span v-else>{{ (conversation.name || '?')[0] }}</span>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-vscode-text truncate">
          <template v-if="searchQuery">
            <span v-for="(seg, i) in highlightedName" :key="i"
              :class="seg.highlight ? 'bg-yellow-500/30 text-yellow-300' : ''"
            >{{ seg.text }}</span>
          </template>
          <template v-else>{{ conversation.name || (conversation.type === 'GROUP' ? '未命名群聊' : '未知用户') }}</template>
        </span>
        <span class="text-xs text-vscode-text-secondary flex-shrink-0 ml-2">
          {{ formatTime(conversation.lastMessageAt) }}
        </span>
      </div>
      <div class="flex items-center justify-between mt-0.5">
        <span class="text-xs text-vscode-text-secondary truncate">
          <span v-if="conversation.type === 'GROUP' && conversation.lastMessageSenderNickname" class="text-vscode-text-secondary">
            {{ conversation.lastMessageSenderNickname }}:
          </span>
          <template v-if="searchQuery && conversation.lastMessageText">
            <span v-for="(seg, i) in highlightedPreview" :key="i"
              :class="seg.highlight ? 'bg-yellow-500/30 text-yellow-300' : ''"
            >{{ seg.text }}</span>
          </template>
          <template v-else>{{ getPreview(conversation.lastMessageText) || '暂无消息' }}</template>
        </span>

        <div class="flex items-center gap-1 ml-1 flex-shrink-0">
          <!-- Hover 操作按钮 -->
          <button
            class="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-vscode-active transition-all"
            :class="conversation.isMuted ? 'text-vscode-warning opacity-100' : 'text-vscode-text-secondary'"
            title="切换免打扰"
            @click="handleToggleMute"
          >
            <BellOff v-if="conversation.isMuted" class="w-3 h-3" />
            <Bell v-else class="w-3 h-3" />
          </button>

          <!-- 未读计数 / 隐藏标记 -->
          <span
            v-if="conversation.unreadCount > 0 && !conversation.isMuted"
            class="px-1.5 py-0.5 text-xs font-medium rounded-full bg-vscode-info/30 text-vscode-info min-w-[18px] text-center"
          >
            {{ conversation.unreadCount > 99 ? '99+' : conversation.unreadCount }}
          </span>
          <span
            v-else-if="conversation.unreadCount > 0 && conversation.isMuted"
            class="w-2 h-2 rounded-full bg-vscode-warning"
          ></span>
          <EyeOff
            v-if="conversation.isHidden"
            class="w-3 h-3 text-vscode-text-secondary opacity-60"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- 右键上下文菜单 -->
  <Teleport to="body">
    <div
      v-if="contextMenu.show"
      class="fixed z-50 bg-vscode-sidebar border border-vscode-border rounded-md shadow-lg py-1 min-w-[150px]"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <button
        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-vscode-text hover:bg-vscode-active transition-colors"
        @click="onMuteClick"
      >
        <BellOff v-if="conversation.isMuted" class="w-4 h-4" />
        <Bell v-else class="w-4 h-4" />
        {{ conversation.isMuted ? '取消免打扰' : '免打扰' }}
      </button>
      <button
        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-vscode-text hover:bg-vscode-active transition-colors"
        @click="onHideClick"
      >
        <EyeOff class="w-4 h-4" />
        {{ conversation.isHidden ? '取消隐藏' : '隐藏会话' }}
      </button>
    </div>
    <!-- 点击遮罩关闭 -->
    <div
      v-if="contextMenu.show"
      class="fixed inset-0 z-40"
      @click="closeContextMenu"
      @contextmenu.prevent="closeContextMenu"
    ></div>
  </Teleport>
</template>
