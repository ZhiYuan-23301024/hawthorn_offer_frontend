<script setup lang="ts">
import { computed, markRaw, ref, watch } from 'vue'
import { FilePlus, UserCircle, Search, LogOut, User, ShieldCheck, Building2, Briefcase, CalendarClock, BadgeCheck, Gift, Download, Home } from 'lucide-vue-next'
import { useWorkspaceStore } from '@/stores/workspace'
import { useEditorStore } from '@/stores/editor'
import { useAuthStore } from '@/stores/auth'
import ExplorerPanel from '@/plugins/builtin/components/ExplorerPanel.vue'
import UserProfilePage from '@/components/Profile/UserProfilePage.vue'
import { pluginManager } from '@/plugins/pluginManager'

const workspaceStore = useWorkspaceStore()
const editorStore = useEditorStore()
const authStore = useAuthStore()

const accountFeatures = computed(() => {
  const base = [
    { id: 'profile-page', label: '个人主页', icon: Home },
    { id: 'profile', label: '个人信息', icon: User },
    { id: 'avatar', label: '修改头像', icon: FilePlus },
    { id: 'password', label: '修改密码', icon: LogOut },
    { id: 'chsi', label: '学信网认证', icon: UserCircle },
    { id: 'activity', label: 'Activity热力图', icon: Search },
    { id: 'cdkey', label: 'CDKEY 兑换', icon: Gift }
  ]

  if (authStore.user?.chsiReviewer) {
    base.push({ id: 'chsi-review', label: '认证审核', icon: ShieldCheck })
  }

  return base
})
const activeAccountIndex = ref(0)
const campusFeatures = [
  { id: 'overview', label: '校招总览', icon: Building2 },
  { id: 'companies', label: '企业列表', icon: Building2 },
  { id: 'jobs', label: '岗位列表', icon: Briefcase },
  { id: 'timeline', label: '流程时间线', icon: CalendarClock },
  { id: 'tracking', label: '我的关注', icon: BadgeCheck }
]
const activeCampusIndex = ref(0)

const currentPlugin = computed(() => pluginManager.getPlugin(workspaceStore.activePanel))

const showExplorer = computed(() => workspaceStore.activePanel === 'explorer')

const directoryTitle = computed(() => {
  if (currentPlugin.value?.id === 'account') {
    return '账户与设置'
  }
  if (currentPlugin.value?.id === 'campusRecruitment') {
    return '校招专区'
  }
  if (currentPlugin.value?.name) {
    return currentPlugin.value.name
  }
  return '工作区'
})

const currentComponent = computed(() => {
  const plugin = currentPlugin.value
  return plugin ? markRaw(plugin.component) : null
})

watch(
  () => editorStore.activeTab?.id,
  (activeTabId) => {
    if (!activeTabId || !activeTabId.startsWith('account:')) {
      return
    }
    const section = activeTabId.replace('account:', '')
    const idx = accountFeatures.value.findIndex(item => item.id === section)
    if (idx >= 0) {
      activeAccountIndex.value = idx
    }
  },
  { immediate: true }
)

watch(
  () => editorStore.activeTab?.id,
  (activeTabId) => {
    if (!activeTabId || !activeTabId.startsWith('campus:')) {
      return
    }
    const section = activeTabId.replace('campus:', '')
    const idx = campusFeatures.findIndex(item => item.id === section)
    if (idx >= 0) {
      activeCampusIndex.value = idx
    }
  },
  { immediate: true }
)

function handleAccountFeatureSelect(featureId: string) {
  if (!currentPlugin.value) {
    return
  }
  const index = accountFeatures.value.findIndex(item => item.id === featureId)
  if (index >= 0) {
    activeAccountIndex.value = index
  }

  if (featureId === 'profile-page' && authStore.user?.id) {
    editorStore.openComponentTab(
      `profile:${authStore.user.id}`,
      '个人主页',
      UserProfilePage,
      { userId: authStore.user.id }
    )
    return
  }

  editorStore.openComponentTab(
    `account:${featureId}`,
    `${directoryTitle.value}/${accountFeatures.value.find(item => item.id === featureId)?.label || '详情'}`,
    currentPlugin.value.component,
    { activeSection: featureId }
  )
}

function handleCampusFeatureSelect(featureId: string) {
  if (!currentPlugin.value) {
    return
  }
  const index = campusFeatures.findIndex(item => item.id === featureId)
  if (index >= 0) {
    activeCampusIndex.value = index
  }
  editorStore.openComponentTab(
    `campus:${featureId}`,
    `${directoryTitle.value}/${campusFeatures.find(item => item.id === featureId)?.label || '详情'}`,
    currentPlugin.value.component,
    { activeSection: featureId }
  )
}

</script>

<template>
  <aside class="w-64 bg-vscode-bg border-r border-vscode-border flex flex-col flex-shrink-0">
    <div v-if="currentPlugin?.id !== 'chat'" class="p-2 border-b border-vscode-border">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-vscode-text-secondary uppercase tracking-wider">
          {{ directoryTitle }}
        </span>
      </div>
    </div>

    <div class="flex-1 overflow-hidden">
      <ExplorerPanel v-if="showExplorer" />

      <div v-else-if="currentPlugin?.id === 'account'" class="p-2">
        <div class="text-xs font-medium text-vscode-text-secondary mb-2">功能目录</div>
        <div
          class="max-h-64 overflow-y-auto pr-1"
          tabindex="0"
          role="list"
          aria-label="个人设置目录"
        >
          <div
          v-for="feature in accountFeatures"
          :key="feature.id"
          class="flex items-center px-2 py-1.5 rounded cursor-pointer transition-colors"
          :class="feature.id === accountFeatures[activeAccountIndex]?.id ? 'bg-vscode-selected/60' : 'hover:bg-vscode-selected/20'"
          role="button"
          @click="handleAccountFeatureSelect(feature.id)"
        >
          <component :is="feature.icon" class="w-4 h-4 mr-2 text-vscode-icon" />
          <span class="text-sm text-vscode-text">{{ feature.label }}</span>
          <span class="ml-auto text-xs text-vscode-text-secondary">{{ feature.id === accountFeatures[activeAccountIndex]?.id ? '正在查看' : '' }}</span>
        </div>
        </div>
      </div>

      <div v-else-if="currentPlugin?.id === 'campusRecruitment'" class="p-2">
        <div class="text-xs font-medium text-vscode-text-secondary mb-2">专区目录</div>
        <div
          class="max-h-72 overflow-y-auto pr-1"
          tabindex="0"
          role="list"
          aria-label="校招专区目录"
        >
          <div
            v-for="feature in campusFeatures"
            :key="feature.id"
            class="flex items-center px-2 py-1.5 rounded cursor-pointer transition-colors"
            :class="feature.id === campusFeatures[activeCampusIndex]?.id ? 'bg-vscode-selected/60' : 'hover:bg-vscode-selected/20'"
            role="button"
            @click="handleCampusFeatureSelect(feature.id)"
          >
            <component :is="feature.icon" class="w-4 h-4 mr-2 text-vscode-icon" />
            <span class="text-sm text-vscode-text">{{ feature.label }}</span>
            <span class="ml-auto text-xs text-vscode-text-secondary">{{ feature.id === campusFeatures[activeCampusIndex]?.id ? '正在查看' : '' }}</span>
          </div>
        </div>
      </div>

      <component v-else-if="currentComponent" :is="currentComponent" />

      <div v-else class="h-full p-4 text-vscode-text-secondary text-sm">
        <p>选择左侧功能查看对应内容</p>
      </div>
    </div>
  </aside>
</template>
