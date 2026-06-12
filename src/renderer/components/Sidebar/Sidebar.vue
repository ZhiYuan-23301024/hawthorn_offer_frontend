<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { UserCircle, MessageSquare, MessageCircle, CalendarCheck, Briefcase, ScrollText } from 'lucide-vue-next'
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
  }, 10000)
})

onUnmounted(() => {
  if (unreadPollTimer) { clearInterval(unreadPollTimer); unreadPollTimer = null }
})

const iconComponents: Record<string, any> = {
  'user-circle': UserCircle,
  'message-square': MessageSquare,
  'message-circle': MessageCircle,
  'calendar-check': CalendarCheck,
  'briefcase': Briefcase,
  'scroll-text': ScrollText
}

function handleItemClick(itemId: string) {
  sidebarStore.setActiveItem(itemId)
  workspaceStore.setActivePanel(itemId)
}
</script>

<template>
  <aside
    class="w-11 flex flex-col items-center py-3 flex-shrink-0 glass-sidebar"
    style="border-right: 1px solid var(--color-border);"
  >
    <div class="flex-1 flex flex-col items-center gap-0.5">
      <button
        v-for="item in sidebarStore.items"
        :key="item.id"
        class="w-9 h-9 flex items-center justify-center rounded-md transition-all relative group cursor-pointer"
        :style="{
          backgroundColor: sidebarStore.activeItem === item.id ? 'var(--color-primary-subtle)' : 'transparent',
        }"
        @click="handleItemClick(item.id)"
      >
        <component
          :is="iconComponents[item.icon] || MessageCircle"
          class="w-5 h-5 transition-colors"
          :style="{
            color: sidebarStore.activeItem === item.id ? 'var(--color-primary-dark)' : 'var(--color-text-tertiary)',
          }"
        />
        <!-- 未读消息角标 -->
        <span
          v-if="item.id === 'chat' && socialStore.totalUnread > 0"
          class="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-white text-[10px] font-bold px-1 leading-none"
          style="background-color: var(--color-danger);"
        >{{ socialStore.totalUnread > 99 ? '99+' : socialStore.totalUnread }}</span>
        <!-- 提示文字 -->
        <span
          class="absolute left-full ml-2 px-2 py-1 rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 glass-float"
          style="color: var(--color-text-primary);"
        >
          {{ item.label }}
        </span>
      </button>
    </div>
  </aside>
</template>
