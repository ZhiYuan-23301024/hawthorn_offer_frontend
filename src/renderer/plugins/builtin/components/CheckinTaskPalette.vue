<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, GripVertical } from 'lucide-vue-next'
import { useCheckinStore } from '@/stores/checkin'
import type { CheckinTask } from '@/types/checkin'

const checkinStore = useCheckinStore()

const searchQuery = ref('')

const filteredTasks = computed(() => {
  if (!searchQuery.value) {
    return checkinStore.installedTasks
  }
  const query = searchQuery.value.toLowerCase()
  return checkinStore.installedTasks.filter(
    task => task.name.toLowerCase().includes(query) ||
            task.description.toLowerCase().includes(query) ||
            task.category.toLowerCase().includes(query)
  )
})

const categoryIcons: Record<string, string> = {
  '编程': '💻',
  '学习': '📚',
  '健康': '💪',
  '习惯': '🌱',
  '其他': '📌',
}

function handleDragStart(e: DragEvent, task: CheckinTask) {
  if (e.dataTransfer) {
    e.dataTransfer.setData('application/json', JSON.stringify({
      taskId: task.id,
      taskName: task.name,
      category: task.category
    }))
    e.dataTransfer.effectAllowed = 'copy'
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-vscode-sidebar">
    <div class="p-3 border-b border-vscode-border">
      <h3 class="text-sm font-semibold text-vscode-text mb-3">任务面板</h3>
      <div class="relative">
        <Search class="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-vscode-text-secondary" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索任务..."
          class="w-full pl-7 pr-3 py-1.5 bg-vscode-input rounded text-sm text-vscode-text border border-vscode-border focus:border-vscode-active focus:outline-none"
        />
      </div>
    </div>
    
    <div class="flex-1 overflow-y-auto p-2">
      <div v-if="filteredTasks.length === 0" class="text-center text-vscode-text-secondary text-sm py-8">
        没有找到匹配的任务
      </div>
      
      <div class="space-y-2">
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="p-3 rounded-lg bg-vscode-hover border border-vscode-border cursor-grab active:cursor-grabbing hover:border-vscode-active transition-all duration-200"
          draggable="true"
          @dragstart="handleDragStart($event, task)"
        >
          <div class="flex items-start">
            <GripVertical class="w-4 h-4 text-vscode-text-secondary mr-2 flex-shrink-0 mt-0.5" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-2">
                <span class="text-base">{{ categoryIcons[task.category] || '📌' }}</span>
                <span class="font-medium text-sm text-vscode-text truncate">{{ task.name }}</span>
              </div>
              <p class="text-xs text-vscode-text-secondary mt-1 line-clamp-2">{{ task.description }}</p>
              <span class="inline-block mt-2 px-2 py-0.5 text-xs rounded bg-vscode-input text-vscode-text-secondary">
                {{ task.category }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="p-3 border-t border-vscode-border">
      <p class="text-xs text-vscode-text-secondary text-center">
        拖拽任务到画布添加节点
      </p>
    </div>
  </div>
</template>