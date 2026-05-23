import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { pluginManager } from '@/plugins/pluginManager'

export const useSidebarStore = defineStore('sidebar', () => {
  const activeItem = ref('explorer')

  const items = computed(() => {
    return pluginManager.getAllPlugins().map(plugin => ({
      id: plugin.id,
      icon: plugin.icon,
      label: plugin.name,
      pluginId: plugin.id
    }))
  })

  function setActiveItem(itemId: string) {
    activeItem.value = itemId
  }

  return {
    activeItem,
    items,
    setActiveItem
  }
})
