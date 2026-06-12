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
    class="w-12 flex flex-col items-center py-4 flex-shrink-0 glass-sidebar"
    style="border-right: 1px solid var(--color-border);"
  >
    <!-- All icons in one group -->
    <div class="flex flex-col items-center gap-2">
      <button
        v-for="item in sidebarStore.items"
        :key="item.id"
        class="sidebar-btn group"
        :class="{ active: sidebarStore.activeItem === item.id }"
        @click="handleItemClick(item.id)"
      >
        <component
          :is="iconComponents[item.icon] || MessageCircle"
          class="w-5 h-5 transition-colors"
        />
        <!-- Unread badge -->
        <span
          v-if="item.id === 'chat' && socialStore.totalUnread > 0"
          class="unread-badge"
        >{{ socialStore.totalUnread > 99 ? '99+' : socialStore.totalUnread }}</span>
        <!-- Tooltip -->
        <span class="sidebar-tooltip">
          {{ item.label }}
        </span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  cursor: pointer;
  position: relative;
  transition: all var(--transition-base);
  color: var(--color-text-tertiary);
}
.sidebar-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-secondary);
  transform: scale(1.06);
}
.sidebar-btn:active {
  transform: scale(0.95);
}
.sidebar-btn.active {
  background: var(--color-primary-subtle);
  color: var(--color-primary-dark);
}
.sidebar-btn.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  border-radius: 0 2px 2px 0;
  background: var(--color-primary);
}

.unread-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: var(--color-danger);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 0 4px;
  line-height: 1;
}

.sidebar-tooltip {
  position: absolute;
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  z-index: 50;
  background: var(--glass-float-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  transition: opacity var(--transition-fast);
}
.group:hover .sidebar-tooltip {
  opacity: 1;
}
</style>
