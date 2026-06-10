<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Search, Users, MessageSquare, Loader, X, ChevronRight, ChevronDown } from 'lucide-vue-next'
import { useSocialStore } from '@/stores/social'
import { useEditorStore } from '@/stores/editor'
import { useAuthStore } from '@/stores/auth'
import { pinyin } from 'pinyin-pro'
import { API_BASE_URL } from '@/api/http'
import ChatView from './ChatView.vue'

function getAvatarUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return API_BASE_URL + path
}

const store = useSocialStore()
const editorStore = useEditorStore()
const authStore = useAuthStore()

const searchQuery = ref('')
const showFriends = ref(true)
const showGroups = ref(true)

// 登录后拉取通讯录
watch(() => authStore.isAuthenticated, (authed) => {
  if (authed) {
    store.fetchContacts()
  } else {
    store.contacts = null
  }
}, { immediate: true })

// 切换账号时重新拉取
watch(() => (authStore.user as any)?.id, (newId, oldId) => {
  if (newId && newId !== oldId) {
    store.fetchContacts()
  }
})

// 获取首字母分组：中文用拼音首字母，英文直接取首字母，其余归 #
function getFirstLetter(name: string): string {
  if (!name) return '#'
  const first = name.charAt(0)
  // 英文字母直接返回大写
  if (/[A-Za-z]/.test(first)) return first.toUpperCase()
  // 中文用拼音首字母
  if (/[一-龥]/.test(first)) {
    const py = pinyin(first, { toneType: 'none', type: 'array' })
    if (py.length > 0 && py[0].length > 0) {
      return py[0].charAt(0).toUpperCase()
    }
  }
  return '#'
}

// 过滤后的好友
const filteredFriends = computed(() => {
  const friends = store.contacts?.friends || []
  if (!searchQuery.value.trim()) return friends
  const q = searchQuery.value.trim().toLowerCase()
  return friends.filter(f =>
    (f.nickname || '').toLowerCase().includes(q)
  )
})

// 过滤后的群聊
const filteredGroups = computed(() => {
  const groups = store.contacts?.groups || []
  if (!searchQuery.value.trim()) return groups
  const q = searchQuery.value.trim().toLowerCase()
  return groups.filter(g =>
    (g.name || '').toLowerCase().includes(q)
  )
})

// 好友按字母分组
const groupedFriends = computed(() => {
  const groups: Record<string, typeof filteredFriends.value> = {}
  for (const f of filteredFriends.value) {
    const letter = getFirstLetter(f.nickname)
    if (!groups[letter]) groups[letter] = []
    groups[letter].push(f)
  }
  // 排序每个分组
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => (a.nickname || '').localeCompare(b.nickname || ''))
  }
  return groups
})

const sortedLetters = computed(() => Object.keys(groupedFriends.value).sort())

const anyResults = computed(() =>
  filteredFriends.value.length > 0 || filteredGroups.value.length > 0
)

function getFriendConversationId(friendName: string): string | null {
  const conv = store.conversations.find(
    c => c.type === 'PRIVATE' && c.name === friendName
  )
  return conv?.id || null
}

function handleOpenFriendChat(friend: { id: string; nickname: string }) {
  const convId = getFriendConversationId(friend.nickname)
  if (!convId) return
  editorStore.openComponentTab(
    `chat:conv:${convId}`,
    friend.nickname || '聊天',
    ChatView,
    { conversationId: convId }
  )
}

function handleOpenGroupChat(group: { id: string; name: string; isHidden: boolean }) {
  if (group.isHidden) {
    store.toggleHide(group.id)
  }
  editorStore.openComponentTab(
    `chat:conv:${group.id}`,
    group.name || '群聊',
    ChatView,
    { conversationId: group.id }
  )
}
</script>

<template>
  <div class="h-full flex flex-col bg-vscode-bg">
    <!-- 搜索栏 -->
    <div class="p-2">
      <div class="relative">
        <Search class="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-vscode-text-secondary" />
        <input
          v-model="searchQuery"
          type="text"
          class="w-full bg-vscode-sidebar border border-vscode-border rounded pl-8 pr-8 py-1.5 text-xs text-vscode-text focus:outline-none focus:border-vscode-info/50 placeholder-vscode-text-secondary"
          placeholder="搜索联系人..."
        />
        <button
          v-if="searchQuery"
          class="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-vscode-active transition-colors text-vscode-text-secondary"
          @click="searchQuery = ''"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="flex-1 overflow-y-auto">
      <!-- 加载中 -->
      <div v-if="store.loadingContacts" class="flex items-center justify-center py-8">
        <Loader class="w-5 h-5 animate-spin text-vscode-text-secondary" />
      </div>

      <!-- 无结果 -->
      <div v-else-if="searchQuery && !anyResults" class="flex flex-col items-center justify-center py-12 text-vscode-text-secondary">
        <Search class="w-8 h-8 mb-3 opacity-30" />
        <div class="text-sm">未找到匹配的联系人</div>
      </div>

      <template v-else>
        <!-- 好友分组 -->
        <template v-if="filteredFriends.length > 0">
          <div
            class="px-3 py-2 text-xs font-semibold text-vscode-text-secondary uppercase tracking-wider sticky top-0 bg-vscode-bg z-10 cursor-pointer hover:text-vscode-text transition-colors flex items-center gap-1 select-none"
            @click="showFriends = !showFriends"
          >
            <ChevronDown v-if="showFriends" class="w-3.5 h-3.5" />
            <ChevronRight v-else class="w-3.5 h-3.5" />
            <Users class="w-3.5 h-3.5 ml-0.5" />
            好友
            <span class="font-normal ml-1">({{ filteredFriends.length }})</span>
          </div>
          <div v-show="showFriends" class="relative">
            <template v-for="letter in sortedLetters" :key="letter">
              <div class="px-3 py-1 text-xs font-semibold text-vscode-info bg-vscode-sidebar sticky top-6">
                {{ letter }}
              </div>
              <div
                v-for="friend in groupedFriends[letter]"
                :key="friend.id"
                class="flex items-center gap-3 px-3 py-2 hover:bg-vscode-active/50 transition-colors cursor-pointer"
                @click="handleOpenFriendChat(friend)"
              >
                <div class="w-9 h-9 rounded-full bg-vscode-active flex items-center justify-center text-xs text-vscode-text overflow-hidden flex-shrink-0">
                  <img
                    v-if="friend.avatar"
                    :src="getAvatarUrl(friend.avatar)"
                    :alt="friend.nickname"
                    class="w-full h-full object-cover"
                  />
                  <span v-else>{{ (friend.nickname || '?')[0] }}</span>
                </div>
                <span class="text-sm text-vscode-text truncate">{{ friend.nickname }}</span>
              </div>
            </template>
          </div>
        </template>

        <!-- 群聊分组 -->
        <template v-if="filteredGroups.length > 0">
          <div
            class="px-3 py-2 text-xs font-semibold text-vscode-text-secondary uppercase tracking-wider sticky top-0 bg-vscode-bg z-10 cursor-pointer hover:text-vscode-text transition-colors flex items-center gap-1 select-none mt-1"
            @click="showGroups = !showGroups"
          >
            <ChevronDown v-if="showGroups" class="w-3.5 h-3.5" />
            <ChevronRight v-else class="w-3.5 h-3.5" />
            <MessageSquare class="w-3.5 h-3.5 ml-0.5" />
            群聊
            <span class="font-normal ml-1">({{ filteredGroups.length }})</span>
          </div>
          <div v-show="showGroups">
            <div
              v-for="group in filteredGroups"
              :key="group.id"
              class="flex items-center gap-3 px-3 py-2 hover:bg-vscode-active/50 transition-colors cursor-pointer"
              @click="handleOpenGroupChat(group)"
            >
              <div class="w-9 h-9 rounded-full bg-vscode-active flex items-center justify-center text-xs text-vscode-text overflow-hidden flex-shrink-0">
                <img
                  v-if="group.avatar"
                  :src="getAvatarUrl(group.avatar)"
                  :alt="group.name"
                  class="w-full h-full object-cover"
                />
                <span v-else>{{ (group.name || '群')[0] }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm text-vscode-text truncate">{{ group.name || '未命名群聊' }}</div>
                <div class="text-xs text-vscode-text-secondary">{{ group.memberCount ?? 0 }} 人</div>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>
