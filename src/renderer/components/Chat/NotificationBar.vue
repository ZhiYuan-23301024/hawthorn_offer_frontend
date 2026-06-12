<script setup lang="ts">
import { computed } from 'vue'
import { Bell, Bean, Heart, MessageSquare, UserPlus } from 'lucide-vue-next'
import { cleanNotificationText } from '@/utils/format'

const props = defineProps<{
  message: {
    id: string
    content: string
    notificationType?: string
    targetType?: string
    targetId?: string
    createdAt: string
  }
}>()

defineEmits<{
  click: [message: typeof props.message]
}>()

// 豆子相关
const BEAN_TYPES = ['BEAN_EARN', 'BEAN_SPEND', 'TIP', 'REWARD', 'BOUNTY', 'PURCHASE', 'REFUND', 'PIN']
const isBeanNotify = computed(() =>
  BEAN_TYPES.some(t => props.message.notificationType?.includes(t)) ||
  props.message.content?.includes('百斩豆') || props.message.content?.includes('豆子')
)
const isBeanEarn = computed(() =>
  props.message.notificationType === 'BEAN_EARN' || props.message.notificationType === 'TIP' ||
  props.message.notificationType === 'REWARD' || props.message.notificationType === 'REFUND'
)

// 社交互动
const isLike = computed(() => props.message.notificationType === 'LIKE' || props.message.content?.includes('赞'))
const isComment = computed(() => props.message.notificationType === 'COMMENT' || props.message.notificationType === 'REPLY' || props.message.content?.includes('回复') || props.message.content?.includes('评论'))
const isFollow = computed(() => props.message.notificationType === 'FOLLOW' || props.message.content?.includes('关注'))

const iconComponent = computed(() => {
  if (isBeanNotify.value) return Bean
  if (isLike.value) return Heart
  if (isComment.value) return MessageSquare
  if (isFollow.value) return UserPlus
  return Bell
})

const iconColor = computed(() => {
  if (isBeanNotify.value) return isBeanEarn.value ? 'var(--color-success)' : 'var(--color-danger)'
  if (isLike.value) return 'var(--color-danger)'
  if (isComment.value) return 'var(--color-primary)'
  if (isFollow.value) return 'var(--color-primary)'
  return 'var(--color-primary)'
})

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return '昨天'
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// Split content by \n — first line is title, rest is preview
const lines = computed(() => {
  const content = props.message.content || ''
  const parts = content.split('\n')
  return {
    title: cleanNotificationText(parts[0] || ''),
    preview: cleanNotificationText(parts.slice(1).join(' ') || '')
  }
})

const previewText = computed(() => {
  const text = lines.value.preview
  if (!text) return ''
  return text.length > 40 ? text.substring(0, 40) + '...' : text
})
</script>

<template>
  <div
    class="flex flex-col px-4 py-2.5 cursor-pointer transition-colors hover:bg-vscode-selected/40 border-b border-vscode-border/30"
    @click="$emit('click', message)"
  >
    <div class="flex items-center justify-between">
      <span class="text-sm flex-1 min-w-0 truncate mr-3 flex items-center gap-1.5" :style="{ color: 'var(--color-text-primary)' }">
        <component :is="iconComponent" class="w-4 h-4 flex-shrink-0" :style="{ color: iconColor }" />
        {{ lines.title }}
      </span>
      <span class="text-xs text-vscode-text-secondary flex-shrink-0">
        {{ formatTime(message.createdAt) }}
      </span>
    </div>
    <div v-if="previewText" class="mt-0.5 text-xs text-vscode-text-secondary/60 truncate ml-0">
      "{{ previewText }}"
    </div>
  </div>
</template>
