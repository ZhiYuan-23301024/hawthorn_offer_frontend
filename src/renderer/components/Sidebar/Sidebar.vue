<script setup lang="ts">
import { FolderOpen, Search, GitBranch, Puzzle, UserCircle, MessageSquare, CalendarCheck } from 'lucide-vue-next'
import { useSidebarStore } from '@/stores/sidebar'
import { useWorkspaceStore } from '@/stores/workspace'

const sidebarStore = useSidebarStore()
const workspaceStore = useWorkspaceStore()

const iconComponents: Record<string, any> = {
  'folder-open': FolderOpen,
  'search': Search,
  'git-branch': GitBranch,
  'puzzle': Puzzle,
  'user-circle': UserCircle,
  'calendar-check': CalendarCheck,
  'message-square': MessageSquare
}

function handleItemClick(itemId: string) {
  sidebarStore.setActiveItem(itemId)
  workspaceStore.setActivePanel(itemId)
}
</script>

<template>
  <aside class="w-12 bg-vscode-sidebar flex flex-col items-center py-4 border-r border-vscode-border">
    <div class="flex-1 flex flex-col items-center space-y-1">
      <button
        v-for="item in sidebarStore.items"
        :key="item.id"
        class="w-10 h-10 flex items-center justify-center rounded transition-all relative group"
        :class="{
          'bg-vscode-active': sidebarStore.activeItem === item.id
        }"
        @click="handleItemClick(item.id)"
      >
        <component
          :is="iconComponents[item.icon] || FolderOpen"
          class="w-5 h-5 transition-colors"
          :class="{
            'text-vscode-icon-hover': sidebarStore.activeItem === item.id,
            'text-vscode-icon': sidebarStore.activeItem !== item.id
          }"
        />
        <span class="absolute left-full ml-2 px-2 py-1 bg-vscode-active text-vscode-text text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          {{ item.label }}
        </span>
      </button>
    </div>
    <div class="mt-auto flex flex-col items-center space-y-1">
      <button class="w-10 h-10 flex items-center justify-center rounded text-vscode-icon hover:text-vscode-icon-hover hover:bg-vscode-active transition-all">
        <span class="text-xs font-bold text-vscode-icon-hover">H</span>
      </button>
    </div>
  </aside>
</template>