<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, LeafyGreen } from 'lucide-vue-next'
import { useEditorStore } from '@/stores/editor'

const editorStore = useEditorStore()
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const content = ref('')

const accountSections = [
  { id: 'profile', label: '个人信息' },
  { id: 'avatar', label: '修改头像' },
  { id: 'password', label: '修改密码' },
  { id: 'chsi', label: '学信网认证' },
  { id: 'activity', label: 'Activity热力图' },
  { id: 'chsi-review', label: '认证审核' }
] as const

type AccountSectionId = (typeof accountSections)[number]['id']

watch(() => editorStore.activeTab, (newTab) => {
  if (newTab) {
    content.value = newTab.content || ''
  } else {
    content.value = ''
  }
}, { immediate: true })

function getAccountSectionLabel(sectionId: AccountSectionId) {
  const match = accountSections.find(item => item.id === sectionId)
  return match ? match.label : '设置详情'
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
  <main class="flex-1 flex flex-col min-w-0" style="background-color: var(--color-bg);">
    <!-- 标签栏 -->
    <div
      v-if="editorStore.tabs.length > 0"
      class="flex items-center overflow-x-auto flex-nowrap"
      style="background-color: var(--color-surface); border-bottom: 1px solid var(--color-divider);"
    >
      <div
        v-for="tab in editorStore.tabs"
        :key="tab.id"
        class="flex items-center px-4 py-2 cursor-pointer transition-colors relative flex-shrink-0 text-sm"
        :style="{
          backgroundColor: editorStore.activeTabId === tab.id ? 'var(--color-surface-raised)' : 'transparent',
          color: editorStore.activeTabId === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          borderRight: '1px solid var(--color-divider)',
          boxShadow: editorStore.activeTabId === tab.id ? '0 1px 3px rgba(0,0,0,0.06), 0 -1px 2px rgba(0,0,0,0.03)' : 'none',
          fontFamily: 'var(--font-body)',
          zIndex: editorStore.activeTabId === tab.id ? 1 : 0,
        }"
        @click="handleTabClick(tab.id)"
        @mouseenter="(e: MouseEvent) => { if (editorStore.activeTabId !== tab.id) (e.target as HTMLElement).style.backgroundColor = 'var(--color-surface-hover)' }"
        @mouseleave="(e: MouseEvent) => { if (editorStore.activeTabId !== tab.id) (e.target as HTMLElement).style.backgroundColor = 'transparent' }"
      >
        <span class="truncate max-w-[150px] font-medium">
          {{ tab.title }}
        </span>
        <span v-if="isModified(tab.id)" class="ml-1" style="color: var(--color-primary);">*</span>
        <button
          class="ml-2 p-0.5 rounded opacity-0 hover:opacity-100 transition-all"
          :style="{ '--hover-bg': 'var(--color-surface-hover)' }"
          @click="handleCloseTab($event, tab.id)"
          @mouseenter="(e: MouseEvent) => { (e.target as HTMLElement).style.backgroundColor = 'var(--color-surface-hover)' }"
          @mouseleave="(e: MouseEvent) => { (e.target as HTMLElement).style.backgroundColor = 'transparent' }"
        >
          <X class="w-3 h-3" :style="{ color: 'var(--color-text-tertiary)' }" />
        </button>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="flex-1 overflow-hidden">
      <div v-if="editorStore.activeTab" class="h-full">
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
          class="w-full h-full resize-none focus:outline-none p-6 text-sm"
          style="background-color: transparent; color: var(--color-text-primary); font-family: var(--font-mono);"
          spellcheck="false"
        />
      </div>
      <!-- 空状态 -->
      <div v-else class="h-full flex flex-col items-center justify-center" style="color: var(--color-text-tertiary);">
        <div class="text-5xl mb-4 opacity-20"><LeafyGreen :size="48" style="opacity:0.2;" /></div>
        <div class="text-lg font-medium" style="font-family: var(--font-display); color: var(--color-text-secondary);">Welcome to Hawthorn Offer</div>
        <div class="text-sm mt-2">从左侧导航开始探索</div>
      </div>
    </div>
  </main>
</template>
