<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Check, Clock, Target, Star } from 'lucide-vue-next'
import { useCheckinStore } from '@/stores/checkin'
import { useEditorStore } from '@/stores/editor'

const props = defineProps<{
  planId: string
  taskId: string
  taskName: string
}>()

const checkinStore = useCheckinStore()
const editorStore = useEditorStore()

const isCompleting = ref(false)
const completionTime = ref(0)
const showComplete = ref(false)

let timer: number | null = null

function startTimer() {
  isCompleting.value = true
  completionTime.value = 0
  timer = window.setInterval(() => {
    completionTime.value++
  }, 1000)
}

function completeTask() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  isCompleting.value = false
  showComplete.value = true
  
  checkinStore.completeTask(props.planId, props.taskId)
  
  setTimeout(() => {
    editorStore.closeTab(`checkin:task:${props.taskId}`)
  }, 1500)
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

onMounted(() => {
  startTimer()
})
</script>

<template>
  <div class="h-full p-8 overflow-y-auto">
    <div v-if="showComplete" class="h-full flex flex-col items-center justify-center">
      <div class="w-24 h-24 rounded-full bg-vscode-success flex items-center justify-center mb-6 animate-bounce">
        <Check class="w-12 h-12 text-white" />
      </div>
      <h2 class="text-2xl font-bold text-vscode-text mb-2">任务完成！</h2>
      <p class="text-vscode-text-secondary">正在返回 Roadmap...</p>
    </div>

    <div v-else class="max-w-lg mx-auto">
      <div class="text-center mb-8">
        <div class="w-16 h-16 rounded-full bg-vscode-active flex items-center justify-center mx-auto mb-4">
          <Target class="w-8 h-8 text-vscode-icon-hover" />
        </div>
        <h1 class="text-2xl font-bold text-vscode-text">{{ taskName }}</h1>
        <p class="text-vscode-text-secondary mt-2">专注完成当前任务</p>
      </div>

      <div class="bg-vscode-hover rounded-lg p-6 mb-6">
        <div class="flex items-center justify-center mb-4">
          <Clock class="w-6 h-6 text-vscode-icon mr-2" />
          <span class="text-4xl font-mono font-bold text-vscode-text">{{ formatTime(completionTime) }}</span>
        </div>
        <div class="text-center text-sm text-vscode-text-secondary">
          已专注 {{ completionTime }} 秒
        </div>
      </div>

      <div class="bg-vscode-hover rounded-lg p-6 mb-6">
        <h3 class="text-sm font-semibold text-vscode-text-secondary mb-4 flex items-center">
          <Star class="w-4 h-4 mr-2" />
          任务说明
        </h3>
        <div class="space-y-2 text-sm text-vscode-text">
          <p>这是一个专注打卡任务，你需要：</p>
          <ul class="list-disc list-inside space-y-1 text-vscode-text-secondary">
            <li>专注完成当前任务</li>
            <li>保持专注状态</li>
            <li>完成后点击下方按钮</li>
          </ul>
        </div>
      </div>

      <button
        class="w-full py-3 rounded-lg bg-vscode-success hover:bg-green-600 text-white font-semibold transition-colors text-lg"
        @click="completeTask"
      >
        完成任务
      </button>

      <p class="text-center text-xs text-vscode-text-secondary mt-4">
        点击完成后将自动返回 Roadmap
      </p>
    </div>
  </div>
</template>