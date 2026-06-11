import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { pluginManager } from '@/plugins/pluginManager'

export const useSidebarStore = defineStore('sidebar', () => {
  const activeItem = ref('explorer')

  const items = computed(() => {
    const bottomIds = ['account']
    const sorted = pluginManager.getAllPlugins()
      .filter(p => !bottomIds.includes(p.id))
      .map(plugin => ({
        id: plugin.id,
        icon: plugin.icon,
        label: plugin.name,
        pluginId: plugin.id
      }))
    bottomIds.forEach(id => {
      const plugin = pluginManager.getPlugin(id)
      if (plugin) {
        sorted.push({
          id: plugin.id,
          icon: plugin.icon,
          label: plugin.name,
          pluginId: plugin.id
        })
      }
    })
    return sorted
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
