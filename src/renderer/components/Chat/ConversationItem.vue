<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ConversationVO } from '@/api/social'
import { Bell, BellOff, EyeOff, Bean } from 'lucide-vue-next'
import { useSocialStore } from '@/stores/social'
import { API_BASE_URL } from '@/api/http'
import { avatarColor, cleanNotificationText } from '@/utils/format'

const props = defineProps<{ conversation: ConversationVO; isActive: boolean; searchQuery?: string }>()
defineEmits<{ click: [event: MouseEvent] }>()
const store = useSocialStore()
const imgError = ref(false)

function getAvatarUrl(path: string): string { if (!path) return ''; if (path.startsWith('http')) return path; return API_BASE_URL + path }

interface HighlightSegment { text: string; highlight: boolean }
function highlightText(text: string, query: string): HighlightSegment[] {
  if (!query || !text) return [{ text: text || '', highlight: false }]
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex); return parts.filter(p => p.length > 0).map(p => ({ text: p, highlight: p.toLowerCase() === query.toLowerCase() }))
}

const highlightedName = computed(() => highlightText(props.conversation.name || '', props.searchQuery || ''))
const highlightedPreview = computed(() => highlightText(props.conversation.lastMessageText || '', props.searchQuery || ''))
const isNotificationCard = computed(() => props.conversation.type === 'SYSTEM_NOTIFY' || props.conversation.type === 'BEAN_NOTIFY')
const isBeanNotify = computed(() => props.conversation.type === 'BEAN_NOTIFY')

const displayName = computed(() => isNotificationCard.value ? cleanNotificationText(props.conversation.name || '') : (props.conversation.name || ''))
const displayPreview = computed(() => isNotificationCard.value ? cleanNotificationText(getPreview(props.conversation.lastMessageText)) : getPreview(props.conversation.lastMessageText))

function handleToggleMute(e: Event) { e.stopPropagation(); store.toggleMute(props.conversation.id) }
function handleToggleHide(e: Event) { e.stopPropagation(); store.toggleHide(props.conversation.id) }

function formatTime(dateStr: string): string {
  if (!dateStr) return ''; const date = new Date(dateStr); const now = new Date(); const diff = now.getTime() - date.getTime()
  if (diff < 60000) return '刚刚'; if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return '昨天'
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function getPreview(text: string): string { if (!text) return ''; return text.length > 30 ? text.substring(0, 30) + '...' : text }

const contextMenu = ref<{ show: boolean; x: number; y: number }>({ show: false, x: 0, y: 0 })
function handleContextMenu(e: MouseEvent) { e.preventDefault(); contextMenu.value = { show: true, x: e.clientX, y: e.clientY } }
function closeContextMenu() { contextMenu.value.show = false }
function onMuteClick(e: Event) { e.stopPropagation(); handleToggleMute(e); closeContextMenu() }
function onHideClick(e: Event) { e.stopPropagation(); handleToggleHide(e); closeContextMenu() }
</script>

<template>
  <!-- Notification card -->
  <div v-if="isNotificationCard" class="flex items-center px-3 py-2.5 cursor-pointer transition-colors group border-l-2 animate-fade-in-up"
    :style="{ backgroundColor: isActive ? 'var(--color-primary-subtle)' : 'transparent', borderLeftColor: isActive ? 'var(--color-primary)' : 'transparent' }"
    @click="$emit('click', $event)" @mouseenter="(e: MouseEvent) => { if (!isActive) (e.target as HTMLElement).style.backgroundColor = 'var(--color-surface-hover)' }" @mouseleave="(e: MouseEvent) => { if (!isActive) (e.target as HTMLElement).style.backgroundColor = 'transparent' }">
    <div class="flex-shrink-0 mr-3 w-9 h-9 rounded-full flex items-center justify-center" :style="{ backgroundColor: isBeanNotify ? 'var(--color-cta-subtle)' : 'var(--color-primary-subtle)' }">
      <Bell v-if="conversation.type === 'SYSTEM_NOTIFY'" class="w-4 h-4" style="color: var(--color-primary-dark);" />
      <Bean v-else-if="isBeanNotify" class="w-4 h-4" style="color: var(--color-cta-dark);" />
      <Bell v-else class="w-4 h-4" style="color: var(--color-primary-dark);" />
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium truncate" :style="{ color: isBeanNotify ? 'var(--color-cta-dark)' : 'var(--color-text-primary)' }">{{ displayName }}</span>
        <span class="text-xs flex-shrink-0 ml-2" style="color: var(--color-text-tertiary);">{{ formatTime(conversation.lastMessageAt) }}</span>
      </div>
      <div class="flex items-center justify-between mt-0.5">
        <span class="text-sm truncate" style="color: var(--color-text-secondary);">{{ displayPreview || '暂无通知' }}</span>
        <span v-if="conversation.unreadCount > 0" class="px-1.5 py-0.5 text-xs font-medium rounded-full min-w-[18px] text-center"
          :style="isBeanNotify ? { backgroundColor: 'var(--color-cta-subtle)', color: 'var(--color-cta-dark)' } : { backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary-dark)' }">
          {{ conversation.unreadCount > 99 ? '99+' : conversation.unreadCount }}</span>
      </div>
    </div>
  </div>

  <!-- Normal conversation card -->
  <div v-else class="flex items-center px-3 py-2.5 cursor-pointer transition-colors group border-l-2 animate-fade-in-up"
    :style="{ backgroundColor: isActive ? 'var(--color-primary-subtle)' : 'transparent', borderLeftColor: isActive ? 'var(--color-primary)' : 'transparent' }"
    @contextmenu.prevent="handleContextMenu" @click="$emit('click', $event)"
    @mouseenter="(e: MouseEvent) => { if (!isActive) (e.target as HTMLElement).style.backgroundColor = 'var(--color-surface-hover)' }" @mouseleave="(e: MouseEvent) => { if (!isActive) (e.target as HTMLElement).style.backgroundColor = 'transparent' }">
    <div class="flex-shrink-0 mr-3 relative">
      <div class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm overflow-hidden" :style="{ backgroundColor: conversation.avatar && !imgError ? 'var(--color-surface-hover)' : avatarColor(conversation.id) }">
        <img v-if="conversation.avatar && !imgError" :src="getAvatarUrl(conversation.avatar)" :alt="conversation.name" class="w-full h-full object-cover" @error="imgError = true" />
        <span v-else>{{ (conversation.name || '?')[0] }}</span>
      </div>
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium truncate" style="color: var(--color-text-primary);">
          <template v-if="searchQuery"><span v-for="(seg, i) in highlightedName" :key="i" :style="seg.highlight ? { backgroundColor: 'var(--color-warning-subtle)', color: 'var(--color-warning)' } : {}">{{ seg.text }}</span></template>
          <template v-else>{{ conversation.name || (conversation.type === 'GROUP' ? '未命名群聊' : '未知用户') }}</template>
        </span>
        <span v-if="conversation.type === 'GROUP'" class="badge ml-1.5 flex-shrink-0" style="background:var(--color-primary-subtle);color:var(--color-primary-dark);font-size:10px;padding:1px 6px;">群</span>
        <span class="text-xs flex-shrink-0 ml-2" style="color: var(--color-text-tertiary);">{{ formatTime(conversation.lastMessageAt) }}</span>
      </div>
      <div class="flex items-center justify-between mt-0.5">
        <span class="text-sm truncate" style="color: var(--color-text-secondary);">
          <span v-if="conversation.type === 'GROUP' && conversation.lastMessageSenderNickname">{{ conversation.lastMessageSenderNickname }}:</span>
          <template v-if="searchQuery && conversation.lastMessageText"><span v-for="(seg, i) in highlightedPreview" :key="i" :style="seg.highlight ? { backgroundColor: 'var(--color-warning-subtle)', color: 'var(--color-warning)' } : {}">{{ seg.text }}</span></template>
          <template v-else>{{ getPreview(conversation.lastMessageText) || '暂无消息' }}</template>
        </span>
        <div class="flex items-center gap-1 ml-1 flex-shrink-0">
          <button class="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-all" :class="conversation.isMuted ? 'opacity-100' : ''" :style="{ color: conversation.isMuted ? 'var(--color-warning)' : 'var(--color-text-tertiary)' }" title="切换免打扰" @click="handleToggleMute"><BellOff v-if="conversation.isMuted" class="w-3 h-3" /><Bell v-else class="w-3 h-3" /></button>
          <span v-if="conversation.unreadCount > 0 && !conversation.isMuted" class="px-1.5 py-0.5 text-xs font-medium rounded-full min-w-[18px] text-center" style="background-color: var(--color-primary-subtle); color: var(--color-primary-dark);">{{ conversation.unreadCount > 99 ? '99+' : conversation.unreadCount }}</span>
          <span v-else-if="conversation.unreadCount > 0 && conversation.isMuted" class="w-2 h-2 rounded-full" style="background-color: var(--color-warning);"></span>
          <EyeOff v-if="conversation.isHidden" class="w-3 h-3 opacity-60" style="color: var(--color-text-tertiary);" />
        </div>
      </div>
    </div>
  </div>

  <!-- Context menu -->
  <template v-if="!isNotificationCard">
    <Teleport to="body">
      <div v-if="contextMenu.show" class="fixed z-50 glass-float py-1 min-w-[150px]" :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }">
        <button class="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors" style="color: var(--color-text-primary);" @click="onMuteClick" @mouseenter="(e: MouseEvent) => { (e.target as HTMLElement).style.backgroundColor = 'var(--color-surface-hover)' }" @mouseleave="(e: MouseEvent) => { (e.target as HTMLElement).style.backgroundColor = 'transparent' }"><BellOff v-if="conversation.isMuted" class="w-4 h-4" /><Bell v-else class="w-4 h-4" />{{ conversation.isMuted ? '取消免打扰' : '免打扰' }}</button>
        <button class="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors" style="color: var(--color-text-primary);" @click="onHideClick" @mouseenter="(e: MouseEvent) => { (e.target as HTMLElement).style.backgroundColor = 'var(--color-surface-hover)' }" @mouseleave="(e: MouseEvent) => { (e.target as HTMLElement).style.backgroundColor = 'transparent' }"><EyeOff class="w-4 h-4" />{{ conversation.isHidden ? '取消隐藏' : '隐藏会话' }}</button>
      </div>
      <div v-if="contextMenu.show" class="fixed inset-0 z-40" @click="closeContextMenu" @contextmenu.prevent="closeContextMenu"></div>
    </Teleport>
  </template>
</template>
