<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Play, Edit3 } from 'lucide-vue-next'
import { useCheckinStore } from '@/stores/checkin'
import { useEditorStore } from '@/stores/editor'
import CheckinPlanCanvas from './CheckinPlanCanvas.vue'
import CheckinTaskPalette from './CheckinTaskPalette.vue'
import CheckinRoadmap from './CheckinRoadmap.vue'
import type { PlanNode, PlanEdge } from '@/types/checkin'

const props = defineProps<{
  planId: string
}>()

const checkinStore = useCheckinStore()
const editorStore = useEditorStore()

const plan = ref(checkinStore.myPlans.find(p => p.id === props.planId))
const isEditing = ref(true)
const localNodes = ref<PlanNode[]>([])
const localEdges = ref<PlanEdge[]>([])

watch(() => props.planId, loadPlan)

onMounted(loadPlan)

function loadPlan() {
  plan.value = checkinStore.myPlans.find(p => p.id === props.planId)
  if (plan.value) {
    localNodes.value = JSON.parse(JSON.stringify(plan.value.nodes))
    localEdges.value = JSON.parse(JSON.stringify(plan.value.edges))
  }
}

function handleUpdate(nodes: PlanNode[], edges: PlanEdge[]) {
  localNodes.value = nodes
  localEdges.value = edges
}

function handleSave() {
  if (plan.value) {
    checkinStore.updatePlanStructure(plan.value.id, localNodes.value, localEdges.value)
    loadPlan()
  }
}

function openRoadmap() {
  isEditing.value = false
}

function openEditor() {
  isEditing.value = true
}

const completedCount = computed(() => {
  if (!plan.value) return 0
  return plan.value.nodes.filter(n => n.completed).length
})

const totalCount = computed(() => {
  if (!plan.value) return 0
  return plan.value.nodes.length
})
</script>

<template>
  <div class="h-full flex flex-col">
    <div v-if="plan" class="flex items-center justify-between px-4 py-3 bg-vscode-sidebar border-b border-vscode-border">
      <div class="flex items-center space-x-4">
        <h2 class="text-lg font-semibold text-vscode-text">{{ plan.name }}</h2>
        <span class="text-sm text-vscode-text-secondary">
          {{ completedCount }}/{{ totalCount }} 已完成
        </span>
      </div>
      
      <div class="flex items-center space-x-2">
        <button
          class="flex items-center px-3 py-1.5 rounded transition-colors text-sm"
          :class="isEditing ? 'bg-vscode-active text-vscode-icon-hover' : 'hover:bg-vscode-selected text-vscode-text-secondary'"
          @click="openEditor"
        >
          <Edit3 class="w-4 h-4 mr-1.5" />
          编辑
        </button>
        <button
          class="flex items-center px-3 py-1.5 rounded transition-colors text-sm"
          :class="!isEditing ? 'bg-vscode-active text-vscode-icon-hover' : 'hover:bg-vscode-selected text-vscode-text-secondary'"
          @click="openRoadmap"
        >
          <Play class="w-4 h-4 mr-1.5" />
          执行
        </button>
      </div>
    </div>
    
    <div class="flex-1 flex overflow-hidden">
      <template v-if="isEditing">
        <div class="w-64 border-r border-vscode-border flex-shrink-0">
          <CheckinTaskPalette />
        </div>
        <div class="flex-1">
          <CheckinPlanCanvas
            :nodes="localNodes"
            :edges="localEdges"
            @update="handleUpdate"
            @save="handleSave"
          />
        </div>
      </template>
      
      <template v-else>
        <div class="flex-1 overflow-y-auto">
          <CheckinRoadmap :plan-id="planId" />
        </div>
      </template>
    </div>
  </div>
</template>