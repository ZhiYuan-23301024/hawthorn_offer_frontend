<script setup lang="ts">
import { computed } from 'vue'

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
    title: parts[0] || '',
    preview: parts.slice(1).join(' ') || ''
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
      <span class="text-sm text-vscode-text flex-1 min-w-0 truncate mr-3">
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
