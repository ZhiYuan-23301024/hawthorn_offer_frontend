<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import type { PlanNode } from '@/types/checkin'

const props = defineProps<{
  node: PlanNode
  isSelected: boolean
  isConnecting: boolean
}>()

const emit = defineEmits<{
  (e: 'select', nodeId: string): void
  (e: 'startConnect', nodeId: string, event: MouseEvent): void
  (e: 'dragStart', nodeId: string, event: MouseEvent): void
}>()

const categoryStyles = computed(() => {
  const styles: Record<string, { bg: string; border: string; dot: string }> = {
    '编程': { bg: 'bg-warning-subtle', border: 'border-warning', dot: 'bg-warning' },
    '学习': { bg: 'bg-primary-subtle', border: 'border-primary', dot: 'bg-primary' },
    '健康': { bg: 'bg-emerald-100', border: 'border-emerald-500', dot: 'bg-emerald-500' },
    '习惯': { bg: 'bg-violet-100', border: 'border-violet-500', dot: 'bg-violet-500' },
    '其他': { bg: 'bg-gray-100', border: 'border-gray-400', dot: 'bg-gray-400' },
  }
  return styles[props.node.category] || styles['其他']
})

import { Code2, BookOpen, Heart, Repeat, Tag } from 'lucide-vue-next'

const categoryIcons: Record<string, any> = {
  '编程': Code2,
  '学习': BookOpen,
  '健康': Heart,
  '习惯': Repeat,
  '其他': Tag,
}

function handleMouseDown(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('connection-handle')) {
    return
  }
  emit('dragStart', props.node.id, e)
}

function handleSourceHandleMouseDown(e: MouseEvent) {
  e.stopPropagation()
}

function handleTargetHandleMouseDown(e: MouseEvent) {
  e.stopPropagation()
  emit('startConnect', props.node.id, e)
}
</script>

<template>
  <div
    class="node-card absolute w-[160px] h-[72px] rounded-[10px] flex flex-col items-center justify-center cursor-move transition-all duration-200 select-none"
    :class="[
      categoryStyles.bg,
      categoryStyles.border,
      'border-2',
      isSelected ? 'ring-2 ring-vscode-active shadow-lg shadow-vscode-active/30' : '',
      isConnecting ? 'opacity-50' : ''
    ]"
    :style="{ left: `${node.x}px`, top: `${node.y}px` }"
    @mousedown="handleMouseDown"
    @click.stop="emit('select', node.id)"
  >
    <div class="connection-handle absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-[10px] h-[10px] rounded-full bg-gray-400 hover:bg-gray-600 cursor-crosshair transition-colors" @mousedown="handleSourceHandleMouseDown"></div>
    
    <div class="flex items-center space-x-2">
      <component :is="categoryIcons[node.category] || Tag" class="w-4 h-4" style="color: var(--color-text-secondary);" />
      <span class="font-medium text-sm text-vscode-text truncate max-w-[100px]">{{ node.taskName }}</span>
    </div>
    
    <div class="flex items-center space-x-1 mt-1">
      <span :class="[categoryStyles.dot, 'w-2 h-2 rounded-full']"></span>
      <span class="text-xs text-vscode-text-secondary">{{ node.category }}</span>
    </div>
    
    <div v-if="node.completed" class="absolute bottom-1 right-1">
      <Check class="w-4 h-4 text-vscode-success" />
    </div>
    
    <div class="connection-handle absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-[10px] h-[10px] rounded-full bg-gray-400 hover:bg-vscode-active cursor-crosshair transition-colors" @mousedown="handleTargetHandleMouseDown"></div>
  </div>
</template>