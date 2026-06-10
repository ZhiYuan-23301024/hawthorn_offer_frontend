<script setup lang="ts">
import { computed } from 'vue'
import type { PlanEdge, PlanNode } from '@/types/checkin'

const props = defineProps<{
  edge: PlanEdge
  sourceNode: PlanNode
  targetNode: PlanNode
  isSelected: boolean
}>()

const emit = defineEmits<{
  (e: 'select', edgeId: string): void
  (e: 'delete', edgeId: string): void
}>()

const nodeWidth = 160
const nodeHeight = 72

const pathData = computed(() => {
  const startX = props.sourceNode.x + nodeWidth
  const startY = props.sourceNode.y + nodeHeight / 2
  const endX = props.targetNode.x
  const endY = props.targetNode.y + nodeHeight / 2
  
  const dx = Math.abs(endX - startX)
  const controlOffset = Math.max(dx * 0.4, 80)
  
  return `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`
})

const edgeStyles = computed(() => {
  const styles: Record<string, { stroke: string; strokeWidth: string; strokeDasharray: string }> = {
    'main': { stroke: '#3b82f6', strokeWidth: '3', strokeDasharray: 'none' },
    'branch': { stroke: '#f97316', strokeWidth: '2', strokeDasharray: 'none' },
    'side': { stroke: '#10b981', strokeWidth: '2', strokeDasharray: '6,3' },
  }
  return styles[props.edge.type] || styles['main']
})

const markerId = computed(() => `arrowhead-${props.edge.type}`)
</script>

<template>
  <g
    class="cursor-pointer transition-all duration-200"
    :class="{ 'opacity-50': isSelected }"
    @click="emit('select', edge.id)"
    @dblclick="emit('delete', edge.id)"
  >
    <path
      :d="pathData"
      :stroke="isSelected ? edgeStyles.stroke : 'transparent'"
      stroke-width="12"
      fill="none"
      class="cursor-pointer"
    />
    
    <path
      :d="pathData"
      :stroke="edgeStyles.stroke"
      :stroke-width="isSelected ? `${parseInt(edgeStyles.strokeWidth) + 1}` : edgeStyles.strokeWidth"
      :stroke-dasharray="edgeStyles.strokeDasharray"
      fill="none"
      :stroke-linecap="'round'"
      :marker-end="`url(#${markerId})`"
      class="transition-all duration-200"
    />
  </g>
</template>