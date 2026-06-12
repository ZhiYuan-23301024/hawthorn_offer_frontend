<script setup lang="ts">
import { computed } from 'vue'
import { X, ArrowUpCircle, ArrowDownCircle, Bean } from 'lucide-vue-next'
import { stripEmoji } from '@/utils/format'

const props = defineProps<{
  show: boolean
  message: {
    content: string
    notificationType?: string
    targetType?: string
    targetId?: string
    createdAt: string
  } | null
}>()

const emit = defineEmits<{
  close: []
  navigate: [targetType: string, targetId: string]
}>()

const isEarn = computed(() => props.message?.notificationType === 'BEAN_EARN')

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

function getAmount(): string {
  if (!props.message?.content) return ''
  const match = props.message.content.match(/([+-]\d+)\s*百斩豆/)
  return match ? match[1] : ''
}

function getReason(): string {
  if (!props.message?.content) return ''
  const text = stripEmoji(props.message.content)
  const match = text.match(/·\s*(.+?)\s*[+-]\d+\s*百斩豆/)
  return match ? match[1].trim() : ''
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show && message"
      class="fixed inset-0 z-50 flex items-center justify-center" style="background: rgba(36, 34, 32, 0.3);"
      @click.self="emit('close')"
    >
      <div class="bg-vscode-sidebar border border-vscode-border rounded-lg shadow-2xl w-80 p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-semibold flex items-center gap-2" :class="isEarn ? 'text-success' : 'text-danger'">
            <ArrowUpCircle v-if="isEarn" class="w-5 h-5" />
            <ArrowDownCircle v-else class="w-5 h-5" />
            {{ isEarn ? '豆子收入' : '豆子支出' }}
          </h3>
          <button
            class="p-1 rounded hover:bg-vscode-active transition-colors text-vscode-icon"
            @click="emit('close')"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="text-center py-4">
          <Bean class="w-8 h-8 mx-auto mb-2" :style="{ color: isEarn ? 'var(--color-success)' : 'var(--color-danger)' }" />
          <span class="text-3xl font-bold" :class="isEarn ? 'text-success' : 'text-danger'">
            {{ getAmount() }}
          </span>
          <span class="text-sm text-vscode-text-secondary ml-1">百斩豆</span>
        </div>

        <div class="space-y-2 text-sm text-vscode-text-secondary">
          <div class="flex justify-between">
            <span>原因</span>
            <span class="text-vscode-text">{{ getReason() }}</span>
          </div>
          <div class="flex justify-between">
            <span>时间</span>
            <span class="text-vscode-text">{{ formatTime(message.createdAt) }}</span>
          </div>
        </div>

        <div v-if="message.targetType && message.targetId" class="mt-4">
          <button
            class="w-full py-2 text-sm text-vscode-info hover:bg-vscode-info/10 rounded transition-colors"
            @click="emit('navigate', message.targetType!, message.targetId!)"
          >
            查看相关帖子 →
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
