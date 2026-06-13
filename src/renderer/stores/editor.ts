import { defineStore } from 'pinia'
import { ref, computed, markRaw } from 'vue'
import type { EditorTab } from '@/types'

export const useEditorStore = defineStore('editor', () => {
  const tabs = ref<EditorTab[]>([])
  const activeTabId = ref<string | null>(null)
  const modifiedTabs = ref<Set<string>>(new Set())

  const activeTab = computed(() => {
    if (!activeTabId.value) return null
    return tabs.value.find(tab => tab.id === activeTabId.value) || null
  })

  function openFile(file: Omit<EditorTab, 'id'> & { id?: string }) {
    const existingTab = tabs.value.find(tab => tab.path === file.path)
    if (existingTab) {
      activeTabId.value = existingTab.id
      return
    }

    const newTab: EditorTab = {
      id: file.id || `tab-${Date.now()}`,
      title: file.title,
      path: file.path,
      content: file.content,
      language: file.language
    }
    tabs.value.push(newTab)
    activeTabId.value = newTab.id
  }

  function openComponentTab(tabId: string, title: string, component: any, componentProps?: Record<string, unknown>) {
    const existingTab = tabs.value.find(tab => tab.id === tabId)
    if (existingTab) {
      activeTabId.value = existingTab.id
      return
    }

    const newTab: EditorTab = {
      id: tabId,
      title,
      component: markRaw(component),
      componentProps
    }
    tabs.value.push(newTab)
    activeTabId.value = newTab.id
  }

  function setActiveTab(tabId: string) {
    activeTabId.value = tabId
  }

  function openOrUpdateComponentTab(tabId: string, title: string, component: any, componentProps?: Record<string, unknown>) {
    const existingTab = tabs.value.find(tab => tab.id === tabId)
    if (existingTab) {
      existingTab.title = title
      existingTab.componentProps = componentProps
      activeTabId.value = existingTab.id
      return
    }

    const newTab: EditorTab = {
      id: tabId,
      title,
      component: markRaw(component),
      componentProps
    }
    tabs.value.push(newTab)
    activeTabId.value = newTab.id
  }

  function closeTab(tabId: string) {
    const index = tabs.value.findIndex(tab => tab.id === tabId)
    if (index !== -1) {
      tabs.value.splice(index, 1)
      modifiedTabs.value.delete(tabId)

      if (activeTabId.value === tabId) {
        activeTabId.value = tabs.value[index]?.id || tabs.value[index - 1]?.id || null
      }
    }
  }

  function updateContent(tabId: string, content: string) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.content = content
      modifiedTabs.value.add(tabId)
    }
  }

  function markModified(tabId: string) {
    modifiedTabs.value.add(tabId)
  }

  function saveTab(tabId: string) {
    modifiedTabs.value.delete(tabId)
  }

  /** 关闭所有标签页（退出登录时调用） */
  function closeAllTabs() {
    tabs.value = []
    activeTabId.value = null
    modifiedTabs.value = new Set()
  }

  return {
    tabs,
    activeTabId,
    activeTab,
    modifiedTabs,
    openFile,
    openComponentTab,
    openOrUpdateComponentTab,
    setActiveTab,
    closeTab,
    updateContent,
    markModified,
    saveTab,
    closeAllTabs
  }
}
)
