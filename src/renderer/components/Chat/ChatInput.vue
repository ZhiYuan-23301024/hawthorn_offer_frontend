<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Send, Paperclip, X } from 'lucide-vue-next'
import { useSocialStore } from '@/stores/social'

const store = useSocialStore()
const inputText = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const pendingFile = ref<File | null>(null)
const uploading = ref(false)

function handleSend() { const text = inputText.value.trim(); if (!text || store.sendingMessage) return; store.sendMessage(text); inputText.value = ''; nextTick(() => { textareaRef.value?.focus() }) }
function handleKeydown(e: KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }
function triggerFileInput() { fileInputRef.value?.click() }
function handleFileSelected(e: Event) { const input = e.target as HTMLInputElement; if (input.files && input.files.length > 0) pendingFile.value = input.files[0]; input.value = '' }
function clearPendingFile() { pendingFile.value = null }
async function handleUpload() { if (!pendingFile.value || !store.activeConversationId || uploading.value) return; uploading.value = true; try { await store.uploadFile(store.activeConversationId, pendingFile.value); pendingFile.value = null } finally { uploading.value = false } }
</script>

<template>
  <div class="p-3" style="border-top: 1px solid var(--color-divider); background-color: var(--color-surface);">
    <!-- Pending file preview -->
    <div v-if="pendingFile" class="mb-2 flex items-center gap-2 px-3 py-1.5 rounded text-sm" style="background-color: var(--color-bg);">
      <Paperclip class="w-4 h-4" style="color: var(--color-text-tertiary);" />
      <span class="flex-1 truncate" style="color: var(--color-text-primary);">{{ pendingFile.name }}</span>
      <span class="text-xs" style="color: var(--color-text-tertiary);">{{ (pendingFile.size / 1024).toFixed(1) }} KB</span>
      <button class="px-2 py-0.5 text-xs rounded transition-colors btn-primary" :disabled="uploading" @click="handleUpload">{{ uploading ? '上传中...' : '发送' }}</button>
      <button class="p-0.5 rounded transition-colors" style="color: var(--color-text-tertiary);" @click="clearPendingFile"><X class="w-3.5 h-3.5" /></button>
    </div>

    <div class="flex items-end gap-2">
      <button class="p-2 rounded transition-colors flex-shrink-0 cursor-pointer" style="color: var(--color-text-tertiary);" title="上传文件" @click="triggerFileInput" @mouseenter="(e: MouseEvent) => { (e.target as HTMLElement).style.backgroundColor = 'var(--color-surface-hover)' }" @mouseleave="(e: MouseEvent) => { (e.target as HTMLElement).style.backgroundColor = 'transparent' }"><Paperclip class="w-4 h-4" /></button>
      <input ref="fileInputRef" type="file" class="hidden" accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar" @change="handleFileSelected" />
      <textarea ref="textareaRef" v-model="inputText" class="flex-1 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none input-base" style="background-color: var(--color-bg);" rows="1" placeholder="输入消息... (Enter 发送, Shift+Enter 换行)" @keydown="handleKeydown" @input="() => { if (textareaRef) { textareaRef.style.height = 'auto'; textareaRef.style.height = Math.min(textareaRef.scrollHeight, 120) + 'px' } }"></textarea>
      <button class="p-2 rounded-lg transition-colors flex-shrink-0" :class="inputText.trim() ? 'btn-primary' : ''" :style="!inputText.trim() ? { backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-text-tertiary)', cursor: 'not-allowed' } : {}" :disabled="!inputText.trim() || store.sendingMessage" @click="handleSend"><Send class="w-4 h-4" /></button>
    </div>
  </div>
</template>
