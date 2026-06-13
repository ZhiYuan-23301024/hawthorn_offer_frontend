import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { pluginManager } from '@/plugins/pluginManager'

export const useSidebarStore = defineStore('sidebar', () => {
  const activeItem = ref('postBrowser')

  const items = computed(() => {
    const bottomIds = ['account']
    const removedIds = ['explorer', 'search', 'git', 'extensions']
    const sorted = pluginManager.getAllPlugins()
      .filter(p => !bottomIds.includes(p.id) && !removedIds.includes(p.id))
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

  /** 重置侧边栏状态（退出登录时调用） */
  function reset() {
    activeItem.value = 'postBrowser'
  }

  return {
    activeItem,
    items,
    setActiveItem,
    reset
  }
})
