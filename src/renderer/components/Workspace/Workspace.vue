<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { pluginManager } from '@/plugins/pluginManager'

const workspaceStore = useWorkspaceStore()

const currentComponent = computed(() => {
  const plugin = pluginManager.getPlugin(workspaceStore.activePanel)
  if (plugin) {
    return markRaw(plugin.component)
  }
  return null
})

const currentPlugin = computed(() => {
  return pluginManager.getPlugin(workspaceStore.activePanel)
})
</script>

<template>
  <aside class="w-64 bg-vscode-bg border-r border-vscode-border flex flex-col">
    <div v-if="currentPlugin" class="p-2 border-b border-vscode-border">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-vscode-text-secondary uppercase tracking-wider">
          {{ currentPlugin.name }}
        </span>
      </div>
    </div>
    <div class="flex-1 overflow-hidden">
      <component v-if="currentComponent" :is="currentComponent" />
    </div>
  </aside>
</template>
