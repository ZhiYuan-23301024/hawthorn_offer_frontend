<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Check, Plus, Download, Trash2, Edit3, X, ChevronRight, Play, Info } from 'lucide-vue-next'
import { useCheckinStore } from '@/stores/checkin'
import { useEditorStore } from '@/stores/editor'
import CheckinRoadmap from './CheckinRoadmap.vue'
import CheckinTaskDetail from './CheckinTaskDetail.vue'
import type { CheckinTask, CheckinPlan } from '@/types/checkin'

const checkinStore = useCheckinStore()
const editorStore = useEditorStore()

const expandedSections = ref({
  installed: true,
  uninstalled: true,
  mycheckin: true
})
const showCreatePlanModal = ref(false)
const showRenameModal = ref(false)
const newPlanName = ref('')
const newPlanDescription = ref('')
const selectedTasks = ref<string[]>([])
const renamePlanName = ref('')
const editingPlanId = ref<string | null>(null)

async function loadData() {
  await checkinStore.fetchTasksFromAPI()
  checkinStore.loadData()
}

function toggleInstall(task: CheckinTask, isInstalled: boolean) {
  if (isInstalled) {
    checkinStore.uninstallTask(task.id)
  } else {
    checkinStore.installTask(task.id)
  }
}

function openTaskDetail(task: CheckinTask) {
  editorStore.openComponentTab(
    `checkin:taskdetail:${task.id}`,
    task.name,
    CheckinTaskDetail,
    { task }
  )
}

function openRoadmap(plan: CheckinPlan) {
  editorStore.openComponentTab(
    `checkin:roadmap:${plan.id}`,
    plan.name,
    CheckinRoadmap,
    { planId: plan.id }
  )
}

function openCreatePlanModal() {
  selectedTasks.value = []
  showCreatePlanModal.value = true
}

function createPlan() {
  if (newPlanName.value.trim() && selectedTasks.value.length > 0) {
    checkinStore.createPlan(newPlanName.value.trim(), newPlanDescription.value.trim(), selectedTasks.value)
    newPlanName.value = ''
    newPlanDescription.value = ''
    selectedTasks.value = []
    showCreatePlanModal.value = false
  }
}

function toggleTaskSelection(taskId: string) {
  const index = selectedTasks.value.indexOf(taskId)
  if (index > -1) {
    selectedTasks.value.splice(index, 1)
  } else {
    selectedTasks.value.push(taskId)
  }
}

function deletePlan(planId: string) {
  checkinStore.deletePlan(planId)
}

function openRenameModal(plan: CheckinPlan) {
  editingPlanId.value = plan.id
  renamePlanName.value = plan.name
  showRenameModal.value = true
}

function renamePlan() {
  if (editingPlanId.value && renamePlanName.value.trim()) {
    checkinStore.renamePlan(editingPlanId.value, renamePlanName.value.trim())
    editingPlanId.value = null
    renamePlanName.value = ''
    showRenameModal.value = false
  }
}

function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case 'easy': return 'bg-green-500'
    case 'medium': return 'bg-yellow-500'
    case 'hard': return 'bg-red-500'
    default: return 'bg-gray-500'
  }
}

function toggleSection(section: 'installed' | 'uninstalled' | 'mycheckin') {
  expandedSections.value[section] = !expandedSections.value[section]
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="h-full overflow-y-auto bg-vscode-sidebar">
    <div class="border-b border-vscode-border">
      <button
        class="w-full flex items-center justify-between p-2 hover:bg-vscode-selected/50 transition-colors"
        @click="toggleSection('installed')"
      >
        <div class="flex items-center">
          <component
            :is="expandedSections.installed ? ChevronRight : ChevronRight"
            class="w-3 h-3 text-vscode-icon mr-1 rotate-90"
            :class="{ 'rotate-0': !expandedSections.installed }"
          />
          <span class="text-xs font-semibold text-vscode-text-secondary uppercase tracking-wider">
            已安装
          </span>
          <span class="text-xs text-vscode-text-secondary ml-1">({{ checkinStore.installedTasks.length }})</span>
        </div>
      </button>
      <div v-show="expandedSections.installed" class="px-2 pb-2">
        <div v-if="checkinStore.installedTasks.length === 0" class="text-center text-vscode-text-secondary text-xs py-4">
          暂无已安装的任务
        </div>
        <div
          v-for="task in checkinStore.installedTasks"
          :key="task.id"
          class="flex items-center p-2 rounded hover:bg-vscode-selected transition-colors mb-1"
        >
          <button
            class="w-6 h-6 rounded-full bg-vscode-active flex items-center justify-center mr-2"
            @click="toggleInstall(task, true)"
          >
            <Check class="w-3 h-3 text-vscode-success" />
          </button>
          <div class="flex-1 min-w-0 cursor-pointer" @click="openTaskDetail(task)">
            <div class="flex items-center">
              <span class="text-sm text-vscode-text">{{ task.name }}</span>
              <span :class="[getDifficultyColor(task.difficulty), 'w-1.5 h-1.5 rounded-full ml-1.5']"></span>
              <span v-if="task.hasUpdate" class="text-xs text-vscode-warning ml-1">有更新</span>
            </div>
          </div>
          <button
            class="p-1 rounded hover:bg-vscode-selected/50 transition-colors mr-1"
            @click="openTaskDetail(task)"
            title="查看详情"
          >
            <Info class="w-3 h-3 text-vscode-text-secondary" />
          </button>
          <button
            class="p-1 rounded hover:bg-vscode-selected/50 transition-colors"
            @click="toggleInstall(task, true)"
            title="卸载"
          >
            <Download class="w-3 h-3 text-vscode-text-secondary" />
          </button>
        </div>
      </div>
    </div>

    <div class="border-b border-vscode-border">
      <button
        class="w-full flex items-center justify-between p-2 hover:bg-vscode-selected/50 transition-colors"
        @click="toggleSection('uninstalled')"
      >
        <div class="flex items-center">
          <component
            :is="expandedSections.uninstalled ? ChevronRight : ChevronRight"
            class="w-3 h-3 text-vscode-icon mr-1 rotate-90"
            :class="{ 'rotate-0': !expandedSections.uninstalled }"
          />
          <span class="text-xs font-semibold text-vscode-text-secondary uppercase tracking-wider">
            任务商店
          </span>
          <span class="text-xs text-vscode-text-secondary ml-1">({{ checkinStore.getUninstalledTasks().length }})</span>
        </div>
      </button>
      <div v-show="expandedSections.uninstalled" class="px-2 pb-2">
        <div v-if="checkinStore.getUninstalledTasks().length === 0" class="text-center text-vscode-text-secondary text-xs py-4">
          所有任务都已安装
        </div>
        <div
          v-for="task in checkinStore.getUninstalledTasks()"
          :key="task.id"
          class="flex items-center p-2 rounded hover:bg-vscode-selected transition-colors mb-1"
        >
          <button
            class="w-6 h-6 rounded-full bg-vscode-border flex items-center justify-center mr-2"
            @click="toggleInstall(task, false)"
          >
            <Plus class="w-3 h-3 text-vscode-text-secondary" />
          </button>
          <div class="flex-1 min-w-0 cursor-pointer" @click="openTaskDetail(task)">
            <div class="flex items-center">
              <span class="text-sm text-vscode-text-secondary">{{ task.name }}</span>
              <span :class="[getDifficultyColor(task.difficulty), 'w-1.5 h-1.5 rounded-full ml-1.5']"></span>
            </div>
          </div>
          <span class="text-xs text-vscode-text-secondary mr-1">{{ task.downloads }}</span>
          <button
            class="p-1 rounded hover:bg-vscode-selected/50 transition-colors"
            @click="openTaskDetail(task)"
            title="查看详情"
          >
            <Info class="w-3 h-3 text-vscode-text-secondary" />
          </button>
        </div>
      </div>
    </div>

    <div>
      <div class="flex items-center justify-between p-2">
        <button
          class="flex items-center hover:bg-vscode-selected/50 transition-colors rounded"
          @click="toggleSection('mycheckin')"
        >
          <component
            :is="expandedSections.mycheckin ? ChevronRight : ChevronRight"
            class="w-3 h-3 text-vscode-icon mr-1 rotate-90"
            :class="{ 'rotate-0': !expandedSections.mycheckin }"
          />
          <span class="text-xs font-semibold text-vscode-text-secondary uppercase tracking-wider">
            我的打卡
          </span>
          <span class="text-xs text-vscode-text-secondary ml-1">({{ checkinStore.myPlans.length }})</span>
        </button>
        <button
          class="flex items-center px-2 py-0.5 rounded bg-vscode-active hover:bg-vscode-hover text-vscode-icon-hover text-xs font-medium transition-colors"
          @click="openCreatePlanModal"
        >
          <Plus class="w-3 h-3 mr-1" />
          新建
        </button>
      </div>
      <div v-show="expandedSections.mycheckin" class="px-2 pb-2">
        <div v-if="checkinStore.myPlans.length === 0" class="text-center text-vscode-text-secondary text-xs py-4">
          暂无打卡计划
        </div>
        <div
          v-for="plan in checkinStore.myPlans"
          :key="plan.id"
          class="bg-vscode-hover rounded mb-2 overflow-hidden"
        >
          <div class="flex items-center justify-between p-2">
            <div class="flex-1 min-w-0">
              <div class="flex items-center">
                <span class="text-sm text-vscode-text truncate">{{ plan.name }}</span>
                <span class="text-xs text-vscode-text-secondary ml-1.5">
                  {{ plan.tasks.filter(t => t.completed).length }}/{{ plan.tasks.length }}
                </span>
              </div>
              <div class="text-xs text-vscode-text-secondary truncate">{{ plan.description }}</div>
            </div>
            <div class="flex items-center ml-2">
              <button
                class="p-1 rounded hover:bg-vscode-selected transition-colors mr-1"
                @click="openRenameModal(plan)"
              >
                <Edit3 class="w-3 h-3 text-vscode-text-secondary hover:text-vscode-icon" />
              </button>
              <button
                class="p-1 rounded hover:bg-vscode-selected transition-colors mr-1"
                @click="deletePlan(plan.id)"
              >
                <Trash2 class="w-3 h-3 text-vscode-text-secondary hover:text-vscode-error" />
              </button>
              <button
                class="p-1 rounded bg-vscode-active hover:bg-vscode-hover transition-colors"
                @click="openRoadmap(plan)"
              >
                <Play class="w-3 h-3 text-vscode-icon-hover" />
              </button>
            </div>
          </div>
          <div class="px-2 pb-2">
            <div class="flex items-center space-x-1">
              <div
                v-for="(task, index) in plan.tasks"
                :key="task.id"
                class="flex items-center"
              >
                <div
                  class="w-5 h-5 rounded flex items-center justify-center text-xs"
                  :class="task.completed ? 'bg-vscode-success text-white' : 'bg-vscode-border text-vscode-text-secondary'"
                >
                  {{ index + 1 }}
                </div>
                <ChevronRight v-if="index < plan.tasks.length - 1" class="w-3 h-3 text-vscode-text-secondary mx-0.5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showCreatePlanModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-vscode-sidebar rounded-lg p-4 w-96 shadow-xl max-h-[80vh] overflow-hidden flex flex-col">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-vscode-text">新建打卡计划</h3>
        <button class="p-1 hover:bg-vscode-selected rounded transition-colors" @click="showCreatePlanModal = false">
          <X class="w-4 h-4 text-vscode-text-secondary" />
        </button>
      </div>
      <div class="flex-1 overflow-y-auto">
        <div class="mb-4">
          <label class="block text-xs text-vscode-text-secondary mb-1">计划名称</label>
          <input
            v-model="newPlanName"
            type="text"
            placeholder="输入计划名称"
            class="w-full px-3 py-2 bg-vscode-input rounded text-vscode-text text-sm border border-vscode-border focus:border-vscode-active focus:outline-none"
          />
        </div>
        <div class="mb-4">
          <label class="block text-xs text-vscode-text-secondary mb-1">计划描述</label>
          <textarea
            v-model="newPlanDescription"
            placeholder="输入计划描述"
            rows="2"
            class="w-full px-3 py-2 bg-vscode-input rounded text-vscode-text text-sm border border-vscode-border focus:border-vscode-active focus:outline-none resize-none"
          ></textarea>
        </div>
        <div>
          <label class="block text-xs text-vscode-text-secondary mb-2">选择任务（已安装的任务）</label>
          <div class="space-y-1">
            <div
              v-for="task in checkinStore.installedTasks"
              :key="task.id"
              class="flex items-center p-2 rounded cursor-pointer transition-colors"
              :class="selectedTasks.includes(task.id) ? 'bg-vscode-selected' : 'hover:bg-vscode-selected/50'"
              @click="toggleTaskSelection(task.id)"
            >
              <div
                class="w-5 h-5 rounded border flex items-center justify-center mr-2"
                :class="selectedTasks.includes(task.id) ? 'bg-vscode-active border-vscode-active' : 'border-vscode-border'"
              >
                <Check v-if="selectedTasks.includes(task.id)" class="w-3 h-3 text-vscode-icon-hover" />
              </div>
              <span class="text-sm text-vscode-text">{{ task.name }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="flex justify-end space-x-2 mt-4 pt-4 border-t border-vscode-border">
        <button
          class="px-4 py-1.5 text-sm rounded transition-colors hover:bg-vscode-selected text-vscode-text-secondary"
          @click="showCreatePlanModal = false"
        >
          取消
        </button>
        <button
          class="px-4 py-1.5 text-sm rounded bg-vscode-active text-vscode-icon-hover hover:bg-vscode-hover transition-colors"
          :disabled="!newPlanName.trim() || selectedTasks.length === 0"
          :class="{ 'opacity-50 cursor-not-allowed': !newPlanName.trim() || selectedTasks.length === 0 }"
          @click="createPlan"
        >
          确定
        </button>
      </div>
    </div>
  </div>

  <div v-if="showRenameModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-vscode-sidebar rounded-lg p-4 w-80 shadow-xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-vscode-text">重命名计划</h3>
        <button class="p-1 hover:bg-vscode-selected rounded transition-colors" @click="showRenameModal = false">
          <X class="w-4 h-4 text-vscode-text-secondary" />
        </button>
      </div>
      <input
        v-model="renamePlanName"
        type="text"
        placeholder="输入新名称"
        class="w-full px-3 py-2 bg-vscode-input rounded text-vscode-text text-sm border border-vscode-border focus:border-vscode-active focus:outline-none"
        @keyup.enter="renamePlan"
      />
      <div class="flex justify-end space-x-2 mt-4">
        <button
          class="px-4 py-1.5 text-sm rounded transition-colors hover:bg-vscode-selected text-vscode-text-secondary"
          @click="showRenameModal = false"
        >
          取消
        </button>
        <button
          class="px-4 py-1.5 text-sm rounded bg-vscode-active text-vscode-icon-hover hover:bg-vscode-hover transition-colors"
          @click="renamePlan"
        >
          确定
        </button>
      </div>
    </div>
  </div>
</template>