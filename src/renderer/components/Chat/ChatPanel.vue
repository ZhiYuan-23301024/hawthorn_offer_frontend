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

onMounted(() => {
  store.fetchConversations()
})

// 如果组件挂载时未登录，等认证就绪后再拉取
watch(() => authStore.isAuthenticated, (authed) => {
  if (authed && store.conversations.length === 0 && !store.loadingConversations) {
    store.fetchConversations()
  }
})

// 会话列表：空搜索显示非隐藏会话，有搜索词显示后端搜索结果
const displayConversations = computed(() => {
  const source = searchQuery.value.trim()
    ? store.searchedConversations
    : store.conversations.filter(c => !c.isHidden)

  if (!searchQuery.value.trim()) {
    // Pin notification conversations to top (always visible, never hidden)
    const notif = store.conversations.filter(
      c => c.type === 'SYSTEM_NOTIFY' || c.type === 'BEAN_NOTIFY'
    )
    const others = source.filter(
      c => c.type !== 'SYSTEM_NOTIFY' && c.type !== 'BEAN_NOTIFY'
    )
    return [...notif, ...others]
  }
  return source
})

// 防抖后端搜索
let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  const q = searchQuery.value.trim()
  if (!q) {
    store.searchedConversations = []
    return
  }
  searchTimer = setTimeout(() => {
    store.searchConversations(q)
  }, 300)
}

function clearSearch() {
  searchQuery.value = ''
  store.searchedConversations = []
}

function handleSelectConversation(id: string) {
  const conv = store.conversations.find(c => c.id === id)
  if (!conv) return
  editorStore.openComponentTab(
    `chat:conv:${id}`,
    conv.name || (conv.type === 'GROUP' ? '群聊' : '私聊'),
    ChatView,
    { conversationId: id }
  )
}

function handleCreatedGroup(conversationId: string) {
  store.fetchConversations()
  handleSelectConversation(conversationId)
}

function closePlusMenu() {
  showPlusMenu.value = false
}
</script>

<template>
  <div class="h-full flex flex-col bg-vscode-bg">
    <!-- 顶部分页栏 -->
    <div class="p-2 border-b border-vscode-border">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-vscode-text-secondary uppercase tracking-wider">聊天</span>
        <!-- + 下拉菜单 -->
        <div class="relative">
          <button
            class="p-1 rounded hover:bg-vscode-active transition-colors text-vscode-icon"
            title="更多操作"
            @click="showPlusMenu = !showPlusMenu"
          >
            <Plus class="w-4 h-4" />
          </button>
          <!-- 下拉菜单 -->
          <div
            v-if="showPlusMenu"
            class="absolute right-0 top-full mt-1 z-30 bg-vscode-sidebar border border-vscode-border rounded-md shadow-lg py-1 min-w-[140px]"
            @click="closePlusMenu"
          >
            <button
              class="w-full flex items-center gap-2 px-3 py-2 text-sm text-vscode-text hover:bg-vscode-active transition-colors"
              @click="showAddFriend = true"
            >
              <UserPlus class="w-3.5 h-3.5" />
              添加好友
            </button>
            <button
              class="w-full flex items-center gap-2 px-3 py-2 text-sm text-vscode-text hover:bg-vscode-active transition-colors"
              @click="showGroupSearch = true"
            >
              <Search class="w-3.5 h-3.5" />
              添加群聊
            </button>
            <button
              class="w-full flex items-center gap-2 px-3 py-2 text-sm text-vscode-text hover:bg-vscode-active transition-colors"
              @click="showCreateGroup = true"
            >
              <Users class="w-3.5 h-3.5" />
              创建群聊
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="flex border-b border-vscode-border">
      <button
        class="flex-1 py-2 text-xs font-medium transition-colors border-b-2 relative"
        :class="activeTab === 'conversations'
          ? 'text-vscode-text border-vscode-info'
          : 'text-vscode-text-secondary border-transparent hover:text-vscode-text'"
        @click="activeTab = 'conversations'"
      >
        <MessageSquare class="w-3.5 h-3.5 inline mr-1" />
        会话
      </button>
      <button
        class="flex-1 py-2 text-xs font-medium transition-colors border-b-2"
        :class="activeTab === 'contacts'
          ? 'text-vscode-text border-vscode-info'
          : 'text-vscode-text-secondary border-transparent hover:text-vscode-text'"
        @click="activeTab = 'contacts'"
      >
        <BookUser class="w-3.5 h-3.5 inline mr-1" />
        通讯录
      </button>
      <button
        class="flex-1 py-2 text-xs font-medium transition-colors border-b-2 relative"
        :class="activeTab === 'requests'
          ? 'text-vscode-text border-vscode-info'
          : 'text-vscode-text-secondary border-transparent hover:text-vscode-text'"
        @click="activeTab = 'requests'"
      >
        <UserCheck class="w-3.5 h-3.5 inline mr-1" />
        好友请求
        <span
          v-if="store.pendingRequestCount > 0"
          class="absolute top-1 right-2 px-1 py-0.5 text-xs rounded-full bg-vscode-info/30 text-vscode-info leading-none"
        >
          {{ store.pendingRequestCount }}
        </span>
      </button>
    </div>

    <!-- 会话标签页 -->
    <template v-if="activeTab === 'conversations'">
      <!-- 搜索栏 -->
      <div class="p-2">
        <div class="relative">
          <Search class="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-vscode-text-secondary" />
          <input
            v-model="searchQuery"
            type="text"
            class="w-full bg-vscode-sidebar border border-vscode-border rounded pl-8 pr-8 py-1.5 text-xs text-vscode-text focus:outline-none focus:border-vscode-info/50 placeholder-vscode-text-secondary"
            placeholder="搜索会话..."
            @input="onSearchInput"
          />
          <button
            v-if="searchQuery"
            class="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-vscode-active transition-colors text-vscode-text-secondary"
            @click="clearSearch"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- 会话列表 -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="store.loadingConversations && store.conversations.length === 0" class="flex items-center justify-center py-8">
          <Loader class="w-5 h-5 animate-spin text-vscode-text-secondary" />
        </div>
        <div v-else-if="store.conversations.length === 0" class="flex flex-col items-center justify-center py-12 text-vscode-text-secondary">
          <MessageSquare class="w-8 h-8 mb-3 opacity-30" />
          <div class="text-sm">暂无会话</div>
          <div class="text-xs mt-1">添加好友或创建群聊开始聊天</div>
          <button
            class="mt-3 px-3 py-1.5 text-xs bg-vscode-info/20 text-vscode-info rounded-lg hover:bg-vscode-info/30 transition-colors flex items-center gap-1"
            @click="showCreateGroup = true"
          >
            <Plus class="w-3.5 h-3.5" />
            创建群聊
          </button>
        </div>
        <div v-else-if="store.searchingConversations" class="flex items-center justify-center py-8">
          <Loader class="w-5 h-5 animate-spin text-vscode-text-secondary" />
        </div>
        <div v-else-if="displayConversations.length === 0" class="flex flex-col items-center justify-center py-12 text-vscode-text-secondary">
          <Search class="w-8 h-8 mb-3 opacity-30" />
          <div class="text-sm">未找到匹配的会话</div>
        </div>
        <div v-else>
          <ConversationItem
            v-for="conv in displayConversations"
            :key="conv.id"
            :conversation="conv"
            :is-active="conv.id === store.activeConversationId"
            :search-query="searchQuery"
            @click="handleSelectConversation(conv.id)"
          />
        </div>
      </div>
    </template>

    <!-- 好友请求标签页 -->
    <div v-else-if="activeTab === 'requests'" class="flex-1 overflow-hidden">
      <FriendRequestPanel />
    </div>

    <!-- 通讯录标签页 -->
    <div v-else-if="activeTab === 'contacts'" class="flex-1 overflow-hidden">
      <ContactsPanel />
    </div>

    <!-- 模态框 -->
    <CreateGroupModal
      :show="showCreateGroup"
      @close="showCreateGroup = false"
      @created="handleCreatedGroup"
    />

    <AddFriendModal
      :show="showAddFriend"
      @close="showAddFriend = false"
    />

    <GroupSearchModal
      :show="showGroupSearch"
      @close="showGroupSearch = false"
    />

    <!-- 点击遮罩关闭 + 下拉菜单 -->
    <div
      v-if="showPlusMenu"
      class="fixed inset-0 z-20"
      @click="closePlusMenu"
    ></div>
  </div>
</template>
