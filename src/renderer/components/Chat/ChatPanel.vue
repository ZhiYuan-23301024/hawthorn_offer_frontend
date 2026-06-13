<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Search, Plus, Users, MessageSquare, UserCheck, UserPlus, Loader, X } from 'lucide-vue-next'
import { useSocialStore } from '@/stores/social'
import { useEditorStore } from '@/stores/editor'
import { useAuthStore } from '@/stores/auth'
import ConversationItem from './ConversationItem.vue'
import FriendRequestPanel from './FriendRequestPanel.vue'
import ContactsPanel from './ContactsPanel.vue'
import CreateGroupModal from './CreateGroupModal.vue'
import AddFriendModal from './AddFriendModal.vue'
import GroupSearchModal from './GroupSearchModal.vue'
import ChatView from './ChatView.vue'
import { BookUser } from 'lucide-vue-next'

type TabType = 'conversations' | 'requests' | 'contacts'

const store = useSocialStore()
const editorStore = useEditorStore()
const authStore = useAuthStore()

const activeTab = ref<TabType>('conversations')
const searchQuery = ref('')
const showPlusMenu = ref(false)
const showCreateGroup = ref(false)
const showAddFriend = ref(false)
const showGroupSearch = ref(false)

onMounted(() => { store.fetchConversations(); store.fetchFriendRequests() })
watch(() => authStore.isAuthenticated, (authed) => { if (authed && store.conversations.length === 0 && !store.loadingConversations) store.fetchConversations() })

const displayConversations = computed(() => {
  const source = searchQuery.value.trim() ? store.searchedConversations : store.conversations.filter(c => !c.isHidden)
  if (!searchQuery.value.trim()) {
    const notif = store.conversations.filter(c => c.type === 'SYSTEM_NOTIFY' || c.type === 'BEAN_NOTIFY')
    const others = source.filter(c => c.type !== 'SYSTEM_NOTIFY' && c.type !== 'BEAN_NOTIFY')
    return [...notif, ...others]
  }
  return source
})

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() { if (searchTimer) clearTimeout(searchTimer); const q = searchQuery.value.trim(); if (!q) { store.searchedConversations = []; return }; searchTimer = setTimeout(() => { store.searchConversations(q) }, 300) }
function clearSearch() { searchQuery.value = ''; store.searchedConversations = [] }
function handleSelectConversation(id: string) { const conv = store.conversations.find(c => c.id === id); if (!conv) return; editorStore.openComponentTab(`chat:conv:${id}`, conv.name || (conv.type === 'GROUP' ? '群聊' : '私聊'), ChatView, { conversationId: id }) }
function handleCreatedGroup(conversationId: string) { store.fetchConversations(); handleSelectConversation(conversationId) }
function closePlusMenu() { showPlusMenu.value = false }
</script>

<template>
  <div class="h-full flex flex-col" style="background-color: var(--color-bg);">
    <!-- Header -->
    <div class="p-3" style="border-bottom: 1px solid var(--color-divider);">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-vscode-text-secondary uppercase tracking-wider">聊天</span>
        <div class="relative">
          <button class="p-1 rounded-md transition-colors cursor-pointer" style="color: var(--color-text-tertiary);" @click="showPlusMenu = !showPlusMenu" @mouseenter="(e: MouseEvent) => { (e.target as HTMLElement).style.backgroundColor = 'var(--color-surface-hover)' }" @mouseleave="(e: MouseEvent) => { (e.target as HTMLElement).style.backgroundColor = 'transparent' }"><Plus class="w-4 h-4" /></button>
          <div v-if="showPlusMenu" class="absolute right-0 top-full mt-1 z-30 glass-float min-w-[140px] py-1" @click="closePlusMenu">
            <button class="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors" style="color: var(--color-text-primary);" @click="showAddFriend = true" @mouseenter="(e: MouseEvent) => { (e.target as HTMLElement).style.backgroundColor = 'var(--color-surface-hover)' }" @mouseleave="(e: MouseEvent) => { (e.target as HTMLElement).style.backgroundColor = 'transparent' }"><UserPlus class="w-3.5 h-3.5" /> 添加好友</button>
            <button class="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors" style="color: var(--color-text-primary);" @click="showGroupSearch = true" @mouseenter="(e: MouseEvent) => { (e.target as HTMLElement).style.backgroundColor = 'var(--color-surface-hover)' }" @mouseleave="(e: MouseEvent) => { (e.target as HTMLElement).style.backgroundColor = 'transparent' }"><Search class="w-3.5 h-3.5" /> 添加群聊</button>
            <button class="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors" style="color: var(--color-text-primary);" @click="showCreateGroup = true" @mouseenter="(e: MouseEvent) => { (e.target as HTMLElement).style.backgroundColor = 'var(--color-surface-hover)' }" @mouseleave="(e: MouseEvent) => { (e.target as HTMLElement).style.backgroundColor = 'transparent' }"><Users class="w-3.5 h-3.5" /> 创建群聊</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex" style="border-bottom: 1px solid var(--color-divider);">
      <button v-for="tab in [{id:'conversations' as const,label:'会话',icon:MessageSquare},{id:'contacts' as const,label:'通讯录',icon:BookUser},{id:'requests' as const,label:'好友请求',icon:UserCheck}]" :key="tab.id"
        class="flex-1 py-2 text-sm font-medium relative chat-tab"
        :style="{ color: activeTab === tab.id ? 'var(--color-primary-dark)' : 'var(--color-text-tertiary)', borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent' }"
        @click="activeTab = tab.id">
        <component :is="tab.icon" class="w-3.5 h-3.5 inline mr-1" />{{ tab.label }}
        <span v-if="tab.id === 'requests' && store.pendingRequestCount > 0" class="absolute top-1 right-2 px-1 py-0.5 text-xs rounded-full leading-none" style="background-color: var(--color-primary-subtle); color: var(--color-primary-dark);">{{ store.pendingRequestCount }}</span>
      </button>
    </div>

    <!-- Conversations tab -->
    <template v-if="activeTab === 'conversations'">
      <div class="px-3 py-2" style="border-bottom: 1px solid var(--color-divider);">
        <div class="flex items-center rounded-md px-2.5 py-1.5 input-base" style="background: var(--color-surface);">
          <Search class="w-3.5 h-3.5 mr-1.5 flex-shrink-0" style="color: var(--color-text-tertiary);" />
          <input v-model="searchQuery" type="text" class="bg-transparent text-xs outline-none flex-1" style="color: var(--color-text-primary);" placeholder="搜索会话..." @input="onSearchInput" />
          <button v-if="searchQuery" class="p-0.5 rounded hover:bg-vscode-active transition-colors flex-shrink-0" style="color: var(--color-text-tertiary);" @click="clearSearch"><X class="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto">
        <div v-if="store.loadingConversations && store.conversations.length === 0" class="flex items-center justify-center py-8"><Loader class="w-5 h-5 animate-spin" style="color: var(--color-text-tertiary);" /></div>
        <div v-else-if="store.conversations.length === 0" class="flex flex-col items-center justify-center py-12" style="color: var(--color-text-tertiary);">
          <MessageSquare class="w-8 h-8 mb-3 opacity-30" /><div class="text-sm">暂无会话</div><div class="text-xs mt-1">添加好友或创建群聊开始聊天</div>
          <button class="mt-3 px-3 py-1.5 text-xs rounded-lg transition-colors btn-primary flex items-center gap-1" @click="showCreateGroup = true"><Plus class="w-3.5 h-3.5" />创建群聊</button>
        </div>
        <div v-else-if="store.searchingConversations" class="flex items-center justify-center py-8"><Loader class="w-5 h-5 animate-spin" style="color: var(--color-text-tertiary);" /></div>
        <div v-else-if="displayConversations.length === 0" class="flex flex-col items-center justify-center py-12" style="color: var(--color-text-tertiary);"><Search class="w-8 h-8 mb-3 opacity-30" /><div class="text-sm">未找到匹配的会话</div></div>
        <div v-else>
          <ConversationItem v-for="(conv, ci) in displayConversations" :key="conv.id" :conversation="conv" :is-active="conv.id === store.activeConversationId" :search-query="searchQuery" :style="{ animationDelay: `${ci * 25}ms` }" @click="handleSelectConversation(conv.id)" />
        </div>
      </div>
    </template>

    <div v-else-if="activeTab === 'requests'" class="flex-1 overflow-hidden"><FriendRequestPanel /></div>
    <div v-else-if="activeTab === 'contacts'" class="flex-1 overflow-hidden"><ContactsPanel /></div>

    <CreateGroupModal :show="showCreateGroup" @close="showCreateGroup = false" @created="handleCreatedGroup" />
    <AddFriendModal :show="showAddFriend" @close="showAddFriend = false" />
    <GroupSearchModal :show="showGroupSearch" @close="showGroupSearch = false" />
    <div v-if="showPlusMenu" class="fixed inset-0 z-20" @click="closePlusMenu"></div>
  </div>
</template>

<style scoped>
.chat-tab {
  transition: color 150ms ease, border-color 150ms ease;
}
.chat-tab:hover {
  color: var(--color-text-primary);
}
</style>
