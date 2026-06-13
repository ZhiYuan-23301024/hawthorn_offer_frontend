<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { CheckCircle, Circle, Play, Maximize2, ZoomIn, ZoomOut } from 'lucide-vue-next'
import { useCheckinStore } from '@/stores/checkin'
import { useEditorStore } from '@/stores/editor'
import CheckinTaskView from './CheckinTaskView.vue'
import type { CheckinPlan, PlanNode, PlanEdge } from '@/types/checkin'

const props = defineProps<{
  planId: string
}>()

const checkinStore = useCheckinStore()
const editorStore = useEditorStore()

const plan = ref<CheckinPlan | null>(null)
const canvasRef = ref<HTMLElement | null>(null)

const canvasState = reactive({
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  isPanning: false,
  dragStartX: 0,
  dragStartY: 0,
})

const progress = computed(() => {
  if (!plan.value) return 0
  const completed = plan.value.nodes.filter(n => n.completed).length
  return Math.round((completed / plan.value.nodes.length) * 100)
})

function loadPlan() {
  plan.value = checkinStore.myPlans.find(p => p.id === props.planId) || null
}

function openTask(node: PlanNode) {
  if (!plan.value) return
  
  editorStore.openComponentTab(
    `checkin:task:${node.id}`,
    node.taskName,
    CheckinTaskView,
    { planId: plan.value.id, taskId: node.id, taskName: node.taskName, params: node.params || {} }
  )
}

function toggleComplete(node: PlanNode) {
  if (!plan.value) return
  
  checkinStore.completeTask(plan.value.id, node.id)
  loadPlan()
}

function getSourceNode(edge: PlanEdge) {
  return plan.value?.nodes.find(n => n.id === edge.sourceNodeId)
}

function getTargetNode(edge: PlanEdge) {
  return plan.value?.nodes.find(n => n.id === edge.targetNodeId)
}

function getEdgeColor(type: string) {
  const colors: Record<string, string> = {
    'main': '#7B8FA6',
    'branch': '#A8906C',
    'side': '#6B8C73',
  }
  return colors[type] || '#7B8FA6'
}

function handleMouseDown(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.closest('.canvas-area') && !target.closest('button') && !target.closest('.node-card')) {
    canvasState.isPanning = true
    canvasState.dragStartX = e.clientX - canvasState.offsetX
    canvasState.dragStartY = e.clientY - canvasState.offsetY
    e.preventDefault()
  }
}

function handleMouseMove(e: MouseEvent) {
  if (canvasState.isPanning) {
    canvasState.offsetX = e.clientX - canvasState.dragStartX
    canvasState.offsetY = e.clientY - canvasState.dragStartY
  }
}

function handleMouseUp() {
  canvasState.isPanning = false
}

function handleWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  canvasState.scale = Math.min(Math.max(canvasState.scale + delta, 0.25), 2)
}

function zoomIn() {
  canvasState.scale = Math.min(canvasState.scale + 0.25, 2)
}

function zoomOut() {
  canvasState.scale = Math.max(canvasState.scale - 0.25, 0.25)
}

function resetZoom() {
  canvasState.scale = 1
  canvasState.offsetX = 0
  canvasState.offsetY = 0
}

import { Code2, BookOpen, Heart, Repeat, Tag, ClipboardList, PartyPopper } from 'lucide-vue-next'

const categoryIcons: Record<string, any> = {
  '编程': Code2,
  '学习': BookOpen,
  '健康': Heart,
  '习惯': Repeat,
  '其他': Tag,
}

const categoryStyles: Record<string, { bg: string; border: string; dot: string }> = {
  '编程': { bg: 'bg-warning-subtle', border: 'border-warning', dot: 'bg-warning' },
  '学习': { bg: 'bg-primary-subtle', border: 'border-primary', dot: 'bg-primary' },
  '健康': { bg: 'bg-emerald-100', border: 'border-emerald-500', dot: 'bg-emerald-500' },
  '习惯': { bg: 'bg-violet-100', border: 'border-violet-500', dot: 'bg-violet-500' },
  '其他': { bg: 'bg-gray-100', border: 'border-gray-400', dot: 'bg-gray-400' },
}

watch(() => props.planId, () => {
  loadPlan()
  resetZoom()
})

onMounted(() => {
  loadPlan()
  window.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('mousemove', handleMouseMove)
})

onUnmounted(() => {
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('mousemove', handleMouseMove)
})
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="flex items-center justify-between px-4 py-3 bg-vscode-sidebar border-b border-vscode-border">
      <div>
        <h1 class="text-lg font-semibold text-vscode-text">{{ plan?.name }}</h1>
        <p class="text-sm text-vscode-text-secondary">{{ plan?.description }}</p>
      </div>
      
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-1">
          <span class="text-sm text-vscode-text-secondary">{{ progress }}% 完成</span>
        </div>
        
        <div class="flex items-center space-x-2">
          <button
            class="p-2 rounded hover:bg-vscode-selected transition-colors"
            @click="zoomOut"
            title="缩小"
          >
            <ZoomOut class="w-4 h-4 text-vscode-text-secondary" />
          </button>
          <span class="text-sm text-vscode-text-secondary w-14 text-center">{{ Math.round(canvasState.scale * 100) }}%</span>
          <button
            class="p-2 rounded hover:bg-vscode-selected transition-colors"
            @click="zoomIn"
            title="放大"
          >
            <ZoomIn class="w-4 h-4 text-vscode-text-secondary" />
          </button>
          <button
            class="p-2 rounded hover:bg-vscode-selected transition-colors"
            @click="resetZoom"
            title="重置视图"
          >
            <Maximize2 class="w-4 h-4 text-vscode-text-secondary" />
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 p-4 overflow-hidden">
      <div class="flex items-center space-x-4 mb-4 text-sm">
        <div class="flex items-center space-x-2">
          <span class="w-3 h-0.5 bg-primary"></span>
          <span class="text-vscode-text-secondary">主线（蓝色）- 核心路径</span>
        </div>
        <div class="flex items-center space-x-2">
          <span class="w-3 h-0.5 bg-warning"></span>
          <span class="text-vscode-text-secondary">支线A（橙色）- 推荐完成</span>
        </div>
        <div class="flex items-center space-x-2">
          <span class="w-3 h-0.5 bg-success" style="border-bottom: 2px dashed;"></span>
          <span class="text-vscode-text-secondary">支线B（绿色虚线）- 可选任务</span>
        </div>
      </div>

      <div class="bg-vscode-hover rounded-lg p-4 h-full">
        <h2 class="text-sm font-semibold text-vscode-text-secondary mb-4">任务流程图</h2>
        
        <div
          ref="canvasRef"
          class="canvas-area relative w-full h-[calc(100%-32px)] overflow-hidden rounded"
          :style="{
            backgroundImage: 'radial-gradient(circle, #D4D0CA 1px, transparent 1px)',
            backgroundSize: `${20 * canvasState.scale}px ${20 * canvasState.scale}px`,
            backgroundPosition: `${canvasState.offsetX}px ${canvasState.offsetY}px`,
            cursor: canvasState.isPanning ? 'grabbing' : 'grab'
          }"
          @mousedown="handleMouseDown"
          @wheel="handleWheel"
        >
          <svg 
            class="absolute inset-0 w-full h-full pointer-events-none"
            :style="{
              transform: `translate(${canvasState.offsetX}px, ${canvasState.offsetY}px) scale(${canvasState.scale})`,
              transformOrigin: '0 0'
            }"
          >
            <defs>
              <marker id="arrowhead-main-roadmap" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#7B8FA6" />
              </marker>
              <marker id="arrowhead-branch-roadmap" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#A8906C" />
              </marker>
              <marker id="arrowhead-side-roadmap" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#6B8C73" />
              </marker>
            </defs>
            
            <g v-for="edge in plan?.edges" :key="edge.id">
              <path
                v-if="getSourceNode(edge!) && getTargetNode(edge!)"
                :d="`M ${(getSourceNode(edge!)?.x || 0) + 80} ${(getSourceNode(edge!)?.y || 0) + 36} C ${(getSourceNode(edge!)?.x || 0) + 160} ${(getSourceNode(edge!)?.y || 0) + 36}, ${(getTargetNode(edge!)?.x || 0)} ${(getTargetNode(edge!)?.y || 0) + 36}, ${(getTargetNode(edge!)?.x || 0)} ${(getTargetNode(edge!)?.y || 0) + 36}`"
                :stroke="getEdgeColor(edge!.type)"
                :stroke-width="edge!.type === 'main' ? '3' : '2'"
                :stroke-dasharray="edge!.type === 'side' ? '6,3' : 'none'"
                fill="none"
                :marker-end="`url(#arrowhead-${edge!.type}-roadmap)`"
                class="transition-all duration-300"
              />
            </g>
          </svg>
          
          <div 
            class="absolute inset-0"
            :style="{
              transform: `translate(${canvasState.offsetX}px, ${canvasState.offsetY}px) scale(${canvasState.scale})`,
              transformOrigin: '0 0'
            }"
          >
            <div
              v-for="node in plan?.nodes"
              :key="node.id"
              class="absolute transition-all duration-300"
              :style="{ left: `${node.x}px`, top: `${node.y}px` }"
            >
              <div
                class="node-card w-[160px] rounded-lg p-3 border-2 transition-all duration-300"
                :class="[
                  categoryStyles[node.category]?.bg || 'bg-gray-100',
                  categoryStyles[node.category]?.border || 'border-gray-400',
                  node.completed ? 'ring-2 ring-vscode-success' : ''
                ]"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center space-x-2">
                    <component :is="categoryIcons[node.category] || Tag" class="w-4 h-4" style="color: var(--color-text-secondary);" />
                    <span class="font-medium text-sm text-vscode-text">{{ node.taskName }}</span>
                  </div>
                  <button
                    class="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                    :class="node.completed ? 'bg-vscode-success' : 'bg-vscode-active'"
                    @click.stop="toggleComplete(node)"
                  >
                    <CheckCircle v-if="node.completed" class="w-4 h-4 text-white" />
                    <Circle v-else class="w-4 h-4 text-vscode-icon-hover" />
                  </button>
                </div>
                
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-1">
                    <span :class="[categoryStyles[node.category]?.dot || 'bg-gray-400', 'w-2 h-2 rounded-full']"></span>
                    <span class="text-xs text-vscode-text-secondary">{{ node.category }}</span>
                  </div>
                  <button
                    class="flex items-center px-2 py-1 rounded text-xs bg-vscode-active hover:bg-vscode-hover text-vscode-icon-hover transition-colors"
                    @click.stop="openTask(node)"
                  >
                    <Play class="w-3 h-3 mr-1" />
                    开始
                  </button>
                </div>
                
                <div v-if="node.completed && node.completedAt" class="mt-2 text-xs text-vscode-text-secondary">
                  {{ new Date(node.completedAt).toLocaleString() }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!plan?.nodes.length" class="text-center py-12">
          <ClipboardList :size="40" class="mb-4 mx-auto" style="opacity:0.2;color:var(--color-text-secondary);" />
          <p class="text-vscode-text-secondary">该计划暂无任务节点</p>
        </div>
      </div>

      <div v-if="progress === 100" class="mt-4 text-center py-4">
        <PartyPopper :size="40" class="mb-2 mx-auto" style="opacity:0.2;color:var(--color-warning);" />
        <h3 class="text-lg font-bold text-vscode-text">恭喜完成所有任务！</h3>
      </div>
    </div>
  </div>
</template>