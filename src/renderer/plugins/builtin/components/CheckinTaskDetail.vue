<script setup lang="ts">
import { computed } from 'vue'
import { X, Download, AlertCircle, Check } from 'lucide-vue-next'
import MarkdownIt from 'markdown-it'
import { useCheckinStore } from '@/stores/checkin'
import type { CheckinTask } from '@/types/checkin'

const props = defineProps<{
  task: CheckinTask | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const checkinStore = useCheckinStore()
const isInstalled = computed(() => {
  return checkinStore.installedTasks.some(t => t.id === props.task?.id)
})

// 初始化 markdown-it，支持 HTML 和链接
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
})

// 渲染后的 HTML
const renderedDescription = computed(() => {
  if (!props.task?.description) return ''
  // 把字符串形式的 \n 转换成真正的换行符
  const text = props.task.description.replace(/\\n/g, '\n')
  return md.render(text)
})

function toggleInstall() {
  if (!props.task) return
  
  if (isInstalled.value) {
    checkinStore.uninstallTask(props.task.id)
  } else {
    checkinStore.installTask(props.task.id)
  }
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <div v-if="task" class="h-full flex flex-col bg-vscode-bg">
    <div class="flex items-center justify-between p-4 border-b border-vscode-border">
      <div class="flex items-center">
        <div class="w-10 h-10 rounded-full bg-vscode-active flex items-center justify-center mr-3">
          <Download class="w-5 h-5 text-vscode-icon-hover" />
        </div>
        <div>
          <h1 class="text-lg font-bold text-vscode-text">{{ task.name }}</h1>
          <div class="flex items-center space-x-2">
            <span class="text-sm text-vscode-text-secondary">{{ task.category }}</span>
          </div>
        </div>
      </div>
      <button
        class="p-2 rounded hover:bg-vscode-selected transition-colors"
        @click="handleClose"
      >
        <X class="w-5 h-5 text-vscode-icon" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div class="p-4 space-y-4">
        <div class="bg-vscode-hover rounded-lg p-4">
          <h2 class="text-sm font-semibold text-vscode-text-secondary mb-3">基本信息</h2>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-vscode-text-secondary">版本</span>
              <div class="flex items-center">
                <span class="text-sm text-vscode-text">{{ task.version }}</span>
                <span v-if="task.hasUpdate" class="ml-2 flex items-center text-vscode-warning">
                  <AlertCircle class="w-3 h-3 mr-1" />
                  <span class="text-xs">有更新 ({{ task.latestVersion }})</span>
                </span>
                <span v-else class="ml-2 flex items-center text-vscode-success">
                  <Check class="w-3 h-3" />
                  <span class="text-xs">最新版本</span>
                </span>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-vscode-text-secondary">下载量</span>
              <span class="text-sm text-vscode-text">{{ task.downloads.toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <div class="bg-vscode-hover rounded-lg p-4">
          <h2 class="text-sm font-semibold text-vscode-text-secondary mb-3">描述</h2>
          <div
            class="prose prose-sm max-w-none text-vscode-text-secondary"
            v-html="renderedDescription"
          ></div>
        </div>
      </div>
    </div>

    <div class="p-4 border-t border-vscode-border">
      <button
        class="w-full py-2.5 rounded-lg text-sm font-medium transition-colors"
        :class="isInstalled 
          ? 'bg-danger text-white'
          : 'bg-vscode-active hover:bg-vscode-hover text-vscode-icon-hover'"
        @click="toggleInstall"
      >
        <Download class="w-4 h-4 inline-block mr-2" />
        {{ isInstalled ? '卸载任务' : '安装任务' }}
      </button>
    </div>
  </div>

  <div v-else class="h-full flex items-center justify-center text-vscode-text-secondary">
    未选择任务
  </div>
</template>
