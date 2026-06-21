<script setup lang="ts">
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-vue-next'
import { useEditorStore } from '@/stores/editor'

const props = defineProps<{
  planId: string
  taskId: string
  taskName: string
  pluginError?: string
}>()

const editorStore = useEditorStore()

function goBack() {
  editorStore.closeTab(`checkin:task:${props.taskId}`)
}
</script>

<template>
  <div class="h-full flex flex-col items-center justify-center p-8">
    <div class="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
      <AlertTriangle class="w-10 h-10 text-red-400" />
    </div>
    
    <h2 class="text-2xl font-bold text-vscode-text mb-2">插件加载失败</h2>
    <p class="text-vscode-text-secondary text-center mb-2">任务 "{{ taskName }}" 的插件未能成功加载</p>
    
    <div v-if="pluginError" class="mt-4 p-4 bg-vscode-bg rounded-lg border border-red-500/30 max-w-md">
      <p class="text-sm text-red-400 font-mono">{{ pluginError }}</p>
    </div>
    
    <div class="mt-8 space-y-3">
      <div class="flex items-center text-sm text-vscode-text-secondary">
        <RefreshCw class="w-4 h-4 mr-2" />
        <span>请检查插件是否正确安装</span>
      </div>
      <div class="flex items-center text-sm text-vscode-text-secondary">
        <span class="w-4 h-4 mr-2 flex items-center justify-center">•</span>
        <span>或重新安装该任务插件</span>
      </div>
    </div>
    
    <button
      class="mt-8 px-6 py-2 rounded-lg bg-vscode-active hover:bg-vscode-hover text-vscode-text transition-colors flex items-center"
      @click="goBack"
    >
      <ArrowLeft class="w-4 h-4 mr-2" />
      返回上一页
    </button>
  </div>
</template>
