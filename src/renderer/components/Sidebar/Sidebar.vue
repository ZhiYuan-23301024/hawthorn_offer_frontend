<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { FolderOpen, Search, GitBranch, Puzzle, UserCircle, MessageSquare, MessageCircle, CalendarCheck, Briefcase } from 'lucide-vue-next'
import { useSidebarStore } from '@/stores/sidebar'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSocialStore } from '@/stores/social'
import { useAuthStore } from '@/stores/auth'

const sidebarStore = useSidebarStore()
const workspaceStore = useWorkspaceStore()
const socialStore = useSocialStore()
const authStore = useAuthStore()

let unreadPollTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  unreadPollTimer = setInterval(() => {
    if (authStore.isAuthenticated) {
      socialStore.fetchConversations()
    }
  }, 30000)
})

onUnmounted(() => {
  if (unreadPollTimer) { clearInterval(unreadPollTimer); unreadPollTimer = null }
})

const iconComponents: Record<string, any> = {
  'folder-open': FolderOpen,
  'search': Search,
  'git-branch': GitBranch,
  'puzzle': Puzzle,
  'user-circle': UserCircle,
  'message-square': MessageSquare,
  'message-circle': MessageCircle,
  'calendar-check': CalendarCheck,
  'briefcase': Briefcase
}

function handleItemClick(itemId: string) {
  sidebarStore.setActiveItem(itemId)
  workspaceStore.setActivePanel(itemId)
}
</script>

<template>
  <aside class="w-12 bg-vscode-sidebar flex flex-col items-center py-4 border-r border-vscode-border flex-shrink-0">
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
        <!-- 未读消息角标 -->
        <span
          v-if="item.id === 'chat' && socialStore.totalUnread > 0"
          class="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none"
        >{{ socialStore.totalUnread > 99 ? '99+' : socialStore.totalUnread }}</span>
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
