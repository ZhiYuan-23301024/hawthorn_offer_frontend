<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Check, Circle, ArrowRight, Play } from 'lucide-vue-next'
import { useCheckinStore } from '@/stores/checkin'
import { useEditorStore } from '@/stores/editor'
import CheckinTaskView from './CheckinTaskView.vue'
import type { CheckinPlan, PlanNode } from '@/types/checkin'

const props = defineProps<{
  planId: string
}>()

const checkinStore = useCheckinStore()
const editorStore = useEditorStore()

const plan = ref<CheckinPlan | null>(null)

const progress = computed(() => {
  if (!plan.value) return 0
  const completed = plan.value.nodes.filter(n => n.completed).length
  return Math.round((completed / plan.value.nodes.length) * 100)
})

const sortedNodes = computed(() => {
  if (!plan.value) return []
  return getMainPathNodes(plan.value)
})

function getMainPathNodes(plan: CheckinPlan): PlanNode[] {
  if (plan.nodes.length === 0) return []
  
  const nodesWithIncoming = new Set(plan.edges.map(e => e.targetNodeId))
  const entryNode = plan.nodes.find(n => !nodesWithIncoming.has(n.id)) || plan.nodes[0]
  
  const result: PlanNode[] = []
  const visited = new Set<string>()
  const queue = [entryNode.id]
  
  while (queue.length > 0) {
    const nodeId = queue.shift()!
    if (visited.has(nodeId)) continue
    visited.add(nodeId)
    const node = plan.nodes.find(n => n.id === nodeId)
    if (node) result.push(node)
    plan.edges
      .filter(e => e.sourceNodeId === nodeId && e.type === 'main')
      .forEach(e => queue.push(e.targetNodeId))
  }
  
  const remainingNodes = plan.nodes.filter(n => !visited.has(n.id))
  return [...result, ...remainingNodes]
}

function loadPlan() {
  plan.value = checkinStore.myPlans.find(p => p.id === props.planId) || null
}

function openTask(node: PlanNode) {
  if (!plan.value) return
  
  editorStore.openComponentTab(
    `checkin:task:${node.id}`,
    node.taskName,
    CheckinTaskView,
    { planId: plan.value.id, taskId: node.id, taskName: node.taskName }
  )
}

watch(() => props.planId, loadPlan)
onMounted(loadPlan)
</script>

<template>
  <div class="h-full p-6 overflow-y-auto">
    <div v-if="plan" class="max-w-3xl mx-auto">
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-vscode-text mb-2">{{ plan.name }}</h1>
        <p class="text-vscode-text-secondary">{{ plan.description }}</p>
        <div class="mt-4">
          <div class="flex items-center justify-between text-sm mb-1">
            <span class="text-vscode-text-secondary">完成进度</span>
            <span class="text-vscode-text">{{ progress }}%</span>
          </div>
          <div class="h-2 bg-vscode-border rounded-full overflow-hidden">
            <div
              class="h-full bg-vscode-success transition-all duration-300"
              :style="{ width: `${progress}%` }"
            ></div>
          </div>
        </div>
      </div>

      <div class="bg-vscode-hover rounded-lg p-4">
        <h2 class="text-sm font-semibold text-vscode-text-secondary mb-4">任务 Roadmap</h2>
        
        <div class="relative">
          <div class="absolute left-6 top-8 bottom-8 w-0.5 bg-vscode-border"></div>
          
          <div class="space-y-4">
            <div
              v-for="(node, index) in sortedNodes"
              :key="node.id"
              class="relative flex items-start"
            >
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center z-10 cursor-pointer transition-transform hover:scale-110"
                :class="node.completed ? 'bg-vscode-success' : 'bg-vscode-active'"
                @click="openTask(node)"
              >
                <Check v-if="node.completed" class="w-6 h-6 text-white" />
                <Circle v-else class="w-6 h-6 text-vscode-icon-hover" />
              </div>
              
              <div class="ml-6 flex-1 bg-vscode-bg rounded-lg p-4 border border-vscode-border hover:border-vscode-active transition-colors">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="flex items-center">
                      <span class="text-sm font-medium text-vscode-text-secondary mr-2">步骤 {{ index + 1 }}</span>
                      <h3 class="text-lg font-semibold text-vscode-text">{{ node.taskName }}</h3>
                    </div>
                    <p class="text-sm text-vscode-text-secondary mt-1">点击任务节点开始执行</p>
                  </div>
                  <button
                    class="flex items-center px-3 py-1.5 rounded bg-vscode-active hover:bg-vscode-hover text-vscode-icon-hover text-sm transition-colors"
                    @click="openTask(node)"
                  >
                    <Play class="w-4 h-4 mr-2" />
                    开始
                  </button>
                </div>
                <div v-if="node.completed && node.completedAt" class="mt-2 text-xs text-vscode-text-secondary">
                  完成时间: {{ new Date(node.completedAt).toLocaleString() }}
                </div>
              </div>
              
              <ArrowRight
                v-if="index < sortedNodes.length - 1"
                class="absolute left-6 top-full w-4 h-4 text-vscode-border -translate-x-1/2 translate-y-1"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-if="progress === 100" class="mt-6 text-center py-8">
        <div class="text-6xl mb-4">🎉</div>
        <h3 class="text-xl font-bold text-vscode-text">恭喜完成所有任务！</h3>
        <p class="text-vscode-text-secondary mt-2">你已完成整个打卡计划</p>
      </div>
    </div>

    <div v-else class="h-full flex items-center justify-center text-vscode-text-secondary">
      计划不存在或已被删除
    </div>
  </div>
</template>