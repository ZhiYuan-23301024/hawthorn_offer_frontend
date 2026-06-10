<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Send, Paperclip, X } from 'lucide-vue-next'
import { useSocialStore } from '@/stores/social'

const store = useSocialStore()
const inputText = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

// 上传状态
const pendingFile = ref<File | null>(null)
const uploading = ref(false)

function handleSend() {
  const text = inputText.value.trim()
  if (!text || store.sendingMessage) return
  store.sendMessage(text)
  inputText.value = ''
  nextTick(() => {
    textareaRef.value?.focus()
  })
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    pendingFile.value = input.files[0]
  }
  input.value = ''
}

function clearPendingFile() {
  pendingFile.value = null
}

async function handleUpload() {
  if (!pendingFile.value || !store.activeConversationId || uploading.value) return
  uploading.value = true
  try {
    await store.uploadFile(store.activeConversationId, pendingFile.value)
    pendingFile.value = null
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="border-t border-vscode-border bg-vscode-bg p-3">
    <!-- 待上传文件预览 -->
    <div
      v-if="pendingFile"
      class="mb-2 flex items-center gap-2 px-3 py-1.5 bg-vscode-sidebar rounded text-sm"
    >
      <span class="text-vscode-text-secondary">📎</span>
      <span class="text-vscode-text flex-1 truncate">{{ pendingFile.name }}</span>
      <span class="text-xs text-vscode-text-secondary">
        {{ (pendingFile.size / 1024).toFixed(1) }} KB
      </span>
      <button
        class="px-2 py-0.5 text-xs bg-vscode-info/20 text-vscode-info rounded hover:bg-vscode-info/30 transition-colors"
        :disabled="uploading"
        @click="handleUpload"
      >
        {{ uploading ? '上传中...' : '发送' }}
      </button>
      <button
        class="p-0.5 rounded hover:bg-vscode-active transition-colors text-vscode-text-secondary"
        @click="clearPendingFile"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>

    <div class="flex items-end gap-2">
      <!-- 文件上传按钮 -->
      <button
        class="p-2 rounded hover:bg-vscode-active transition-colors text-vscode-icon flex-shrink-0"
        title="上传文件"
        @click="triggerFileInput"
      >
        <Paperclip class="w-4 h-4" />
      </button>
      <input
        ref="fileInputRef"
        type="file"
        class="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
        @change="handleFileSelected"
      />

      <!-- 文本输入 -->
      <textarea
        ref="textareaRef"
        v-model="inputText"
        class="flex-1 bg-vscode-sidebar text-vscode-text rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-vscode-info/50 placeholder-vscode-text-secondary"
        rows="1"
        placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
        @keydown="handleKeydown"
        @input="() => {
          if (textareaRef) {
            textareaRef.style.height = 'auto'
            textareaRef.style.height = Math.min(textareaRef.scrollHeight, 120) + 'px'
          }
        }"
      ></textarea>

      <!-- 发送按钮 -->
      <button
        class="p-2 rounded-lg transition-colors flex-shrink-0"
        :class="inputText.trim()
          ? 'bg-vscode-info/20 text-vscode-info hover:bg-vscode-info/30'
          : 'bg-vscode-sidebar text-vscode-text-secondary cursor-not-allowed'"
        :disabled="!inputText.trim() || store.sendingMessage"
        @click="handleSend"
      >
        <Send class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
