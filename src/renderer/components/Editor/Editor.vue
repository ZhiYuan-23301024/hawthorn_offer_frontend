<script setup lang="ts">
import { ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { useEditorStore } from '@/stores/editor'

const editorStore = useEditorStore()
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const content = ref('')
let lastEditorWheel = 0

const accountSections = [
  { id: 'profile', label: '个人信息' },
  { id: 'avatar', label: '修改头像' },
  { id: 'password', label: '修改密码' },
  { id: 'chsi', label: '学信网认证' },
  { id: 'activity', label: 'Activity热力图' }
] as const

type AccountSectionId = (typeof accountSections)[number]['id']

watch(() => editorStore.activeTab, (newTab) => {
  if (newTab) {
    content.value = newTab.content || ''
  } else {
    content.value = ''
  }
}, { immediate: true })

function getCurrentSectionIndex(tabId: string | undefined): number {
  if (!tabId) return -1
  return accountSections.findIndex(item => item.id === tabId)
}

function getAccountSectionLabel(sectionId: AccountSectionId) {
  const match = accountSections.find(item => item.id === sectionId)
  return match ? match.label : '设置详情'
}

function switchAccountSection(currentSection: AccountSectionId, delta: number) {
  const currentIndex = accountSections.findIndex(item => item.id === currentSection)
  if (currentIndex < 0) return
  const nextIndex = (currentIndex + delta + accountSections.length) % accountSections.length
  const target = accountSections[nextIndex]

  if (!editorStore.activeTab || !editorStore.activeTab.component || !editorStore.activeTab.componentProps) {
    return
  }
  editorStore.openComponentTab(
    `account:${target.id}`,
    `账户与设置/${getAccountSectionLabel(target.id)}`,
    editorStore.activeTab.component,
    { activeSection: target.id }
  )
}

function handleEditorWheel(event: WheelEvent) {
  const activeTab = editorStore.activeTab
  const currentSection = activeTab?.componentProps?.activeSection

  if (typeof currentSection !== 'string') {
    return
  }
  const index = getCurrentSectionIndex(currentSection)
  if (index < 0) {
    return
  }

  const now = Date.now()
  if (now - lastEditorWheel < 280) {
    return
  }
  lastEditorWheel = now

  const direction = event.deltaY > 0 ? 1 : -1
  if (direction === 0) {
    return
  }
  event.preventDefault()
  switchAccountSection(currentSection as AccountSectionId, direction)
}

function handleContentChange() {
  if (editorStore.activeTabId && textareaRef.value) {
    editorStore.updateContent(editorStore.activeTabId, textareaRef.value.value)
  }
}

function handleTabClick(tabId: string) {
  editorStore.setActiveTab(tabId)
}

function handleCloseTab(event: Event, tabId: string) {
  event.stopPropagation()
  editorStore.closeTab(tabId)
}

function isModified(tabId: string) {
  return editorStore.modifiedTabs.has(tabId)
}
</script>

<template>
  <main class="flex-1 flex flex-col bg-vscode-bg">
    <div v-if="editorStore.tabs.length > 0" class="flex items-center border-b border-vscode-border bg-vscode-active">
      <div
        v-for="tab in editorStore.tabs"
        :key="tab.id"
        class="flex items-center px-3 py-2 cursor-pointer border-r border-vscode-border transition-colors relative"
        :class="{
          'bg-vscode-bg': editorStore.activeTabId === tab.id,
          'hover:bg-vscode-selected': editorStore.activeTabId !== tab.id
        }"
        @click="handleTabClick(tab.id)"
      >
        <span class="text-sm text-vscode-text truncate max-w-[150px]">
          {{ tab.title }}
        </span>
        <span v-if="isModified(tab.id)" class="ml-1 text-vscode-info">*</span>
        <button
          class="ml-2 p-0.5 rounded opacity-0 hover:opacity-100 hover:bg-vscode-selected transition-all"
          @click="handleCloseTab($event, tab.id)"
        >
          <X class="w-3 h-3 text-vscode-icon" />
        </button>
      </div>
    </div>
    <div class="flex-1 overflow-hidden">
      <div v-if="editorStore.activeTab" class="h-full p-4" @wheel="handleEditorWheel">
        <component
          v-if="editorStore.activeTab.component"
          :is="editorStore.activeTab.component"
          v-bind="editorStore.activeTab.componentProps || {}"
          class="h-full"
        />
        <textarea
          v-else
          ref="textareaRef"
          v-model="content"
          @input="handleContentChange"
          class="w-full h-full bg-transparent text-vscode-text font-mono text-sm resize-none focus:outline-none"
          spellcheck="false"
        />
      </div>
      <div v-else class="h-full flex flex-col items-center justify-center text-vscode-text-secondary">
        <div class="text-6xl mb-4 opacity-30">📄</div>
        <div class="text-lg">Welcome to Hawthorn Offer</div>
        <div class="text-sm mt-2">Select a file from the explorer to start editing</div>
      </div>
    </div>
  </main>
</template>
