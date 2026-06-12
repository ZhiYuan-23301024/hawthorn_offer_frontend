<script setup lang="ts">
import type { MessageVO } from '@/api/social'
import { API_BASE_URL } from '@/api/http'
import { avatarUrl, avatarColor } from '@/utils/format'
import { ref, computed } from 'vue'

const props = defineProps<{ message: MessageVO; isOwn: boolean; showSender: boolean }>()
const showFullImage = ref(false)
const imgError = ref(false)

interface TextSegment { type: 'text' | 'url'; value: string }
const urlRegex = /(https?:\/\/[^\s]+)/g

const textSegments = computed<TextSegment[]>(() => {
  if (props.message.messageType !== 'TEXT') return []
  const content = props.message.content || ''
  const segments: TextSegment[] = []
  let lastIndex = 0; let match: RegExpExecArray | null
  const regex = new RegExp(urlRegex.source, 'g')
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) segments.push({ type: 'text', value: content.slice(lastIndex, match.index) })
    segments.push({ type: 'url', value: match[0] })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < content.length) segments.push({ type: 'text', value: content.slice(lastIndex) })
  return segments.length > 0 ? segments : [{ type: 'text', value: content }]
})

function formatTime(dateStr: string): string {
  const date = new Date(dateStr); const now = new Date(); const diff = now.getTime() - date.getTime(); const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'; if (minutes < 60) return `${minutes}分钟前`
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function getAttachmentUrl(storagePath: string): string { if (storagePath.startsWith('http')) return storagePath; return `${API_BASE_URL}${storagePath}` }
</script>

<template>
  <!-- 系统消息 -->
  <div v-if="message.messageType === 'SYSTEM'" class="flex justify-center py-2">
    <span class="text-xs px-3 py-1 rounded-full" style="background-color: var(--color-surface); color: var(--color-text-tertiary);">{{ message.content }}</span>
  </div>

  <!-- 普通消息 -->
  <div v-else class="flex px-4 py-1.5 msg-enter" :class="isOwn ? 'flex-row-reverse' : 'flex-row'">
    <div class="flex-shrink-0" :class="isOwn ? 'ml-2' : 'mr-2'">
      <div v-if="showSender" class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs overflow-hidden" :style="{ backgroundColor: avatarColor(message.senderId || '') }">
        <img v-if="message.senderAvatar && !imgError" :src="avatarUrl(message.senderAvatar)" :alt="message.senderNickname" class="w-full h-full object-cover" @error="imgError = true" />
        <span v-else>{{ (message.senderNickname || '?')[0] }}</span>
      </div>
      <div v-else class="w-8 h-8"></div>
    </div>

    <div class="max-w-[65%]" :class="isOwn ? 'items-end' : 'items-start'">
      <div v-if="showSender" class="text-xs mb-0.5" :class="isOwn ? 'text-right' : 'text-left'" style="color: var(--color-text-tertiary);">{{ message.senderNickname || '未知用户' }}</div>

      <div class="flex flex-col" :class="isOwn ? 'items-end' : 'items-start'">
        <!-- 文本消息：对方用纯色背景，自己用主色浅色 -->
        <div v-if="message.messageType === 'TEXT'" class="px-3 py-2 rounded-lg text-sm leading-relaxed break-words"
          :style="isOwn ? { backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary-dark)', border: '1px solid rgba(123,143,166,0.15)' } : { backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }">
          <template v-for="(seg, i) in textSegments" :key="i">
            <a v-if="seg.type === 'url'" :href="seg.value" target="_blank" class="underline hover:opacity-80" style="color: var(--color-primary);" @click.stop>{{ seg.value }}</a>
            <span v-else>{{ seg.value }}</span>
          </template>
        </div>

        <!-- 图片消息 -->
        <div v-else-if="message.messageType === 'IMAGE'" class="max-w-[240px]">
          <template v-if="message.attachments && message.attachments.length > 0">
            <img :src="getAttachmentUrl(message.attachments[0].storagePath)" :alt="message.attachments[0].fileName" class="rounded-lg cursor-pointer max-h-[200px] object-cover hover:opacity-90 transition-opacity" @click="showFullImage = true" />
          </template>
          <div v-else class="px-3 py-2 rounded-lg text-sm" style="background-color: var(--color-surface); color: var(--color-text-tertiary);">[图片]</div>
        </div>

        <!-- 文件消息 -->
        <template v-else-if="message.messageType === 'FILE'">
          <a v-if="message.attachments && message.attachments.length > 0" :href="getAttachmentUrl(message.attachments[0].storagePath)" :download="message.attachments[0].fileName" target="_blank" class="px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors cursor-pointer" style="background-color: var(--color-surface); color: var(--color-text-primary); text-decoration: none;" @click.stop>
            <span style="color: var(--color-text-tertiary);">📎</span><span>{{ message.attachments[0].fileName }}</span><span class="text-xs" style="color: var(--color-text-tertiary);">({{ (message.attachments[0].fileSize / 1024).toFixed(1) }} KB)</span>
          </a>
          <div v-else class="px-3 py-2 rounded-lg text-sm" style="background-color: var(--color-surface); color: var(--color-text-tertiary);">[文件]</div>
        </template>

        <span class="text-xs mt-0.5 px-1" style="color: var(--color-text-tertiary);">{{ formatTime(message.createdAt) }}</span>
      </div>
    </div>
  </div>

  <!-- 图片全屏预览 -->
  <Teleport to="body">
    <div v-if="showFullImage && message.attachments && message.attachments.length > 0" class="fixed inset-0 z-50 flex items-center justify-center cursor-pointer" style="background: rgba(36, 34, 32, 0.75);" @click="showFullImage = false">
      <img :src="getAttachmentUrl(message.attachments[0].storagePath)" :alt="message.attachments[0].fileName" class="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
    </div>
  </Teleport>
</template>
