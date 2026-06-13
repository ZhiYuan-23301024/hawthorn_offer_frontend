<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, Search, UserPlus, Loader, Send } from 'lucide-vue-next'
import { useSocialStore } from '@/stores/social'
import { avatarUrl, avatarColor } from '@/utils/format'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useSocialStore()

const searchQuery = ref('')
const expandedUserId = ref<string | null>(null)
const requestMessage = ref('')
const imgErrors = ref<Set<string>>(new Set())
let searchTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.show, (val) => {
  if (!val) {
    searchQuery.value = ''
    store.searchResults = []
    expandedUserId.value = null
    requestMessage.value = ''
  }
})

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  if (!searchQuery.value.trim()) {
    store.searchResults = []
    return
  }
  searchTimer = setTimeout(() => {
    store.searchUsers(searchQuery.value.trim())
  }, 300)
}

function clearSearch() {
  searchQuery.value = ''
  store.searchResults = []
}

function toggleExpand(userId: string) {
  if (expandedUserId.value === userId) {
    expandedUserId.value = null
    requestMessage.value = ''
  } else {
    expandedUserId.value = userId
    requestMessage.value = ''
  }
}

async function handleSendRequest(userId: string, nickname: string) {
  try {
    const message = requestMessage.value.trim() || '你好，我想加你为好友'
    await store.sendFriendRequest(userId, message)
    alert(`已向 ${nickname} 发送好友申请`)
    const user = store.searchResults.find(u => u.id === userId)
    if (user) user.isContact = true
    expandedUserId.value = null
    requestMessage.value = ''
  } catch (e: any) {
    alert(e.message || '发送失败')
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center" style="background: rgba(36, 34, 32, 0.35);"
      @click.self="emit('close')"
    >
      <div class="bg-vscode-sidebar border border-vscode-border rounded-lg shadow-2xl w-[400px] max-h-[480px] flex flex-col">
        <!-- 头部 -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-vscode-border">
          <h3 class="text-sm font-semibold text-vscode-text flex items-center gap-2">
            <UserPlus class="w-4 h-4" />
            添加好友
          </h3>
          <button
            class="p-1 rounded hover:bg-vscode-active transition-colors text-vscode-icon"
            @click="emit('close')"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- 搜索栏 -->
        <div class="p-3 border-b border-vscode-border">
          <div class="relative">
            <Search class="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-vscode-text-secondary" />
            <input
              v-model="searchQuery"
              type="text"
              class="w-full bg-vscode-bg border border-vscode-border rounded pl-8 pr-8 py-2 text-sm text-vscode-text focus:outline-none focus:border-vscode-info/50 placeholder-vscode-text-secondary"
              placeholder="搜索用户昵称..."
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

        <!-- 搜索结果 -->
        <div class="flex-1 overflow-y-auto">
          <!-- 加载中 -->
          <div v-if="store.searchingUsers" class="flex items-center justify-center py-8">
            <Loader class="w-5 h-5 animate-spin text-vscode-text-secondary" />
          </div>

          <!-- 无结果 -->
          <div v-else-if="searchQuery.trim() && !store.searchingUsers && store.searchResults.length === 0" class="py-8 text-center text-sm text-vscode-text-secondary">
            未找到匹配的用户
          </div>

          <!-- 初始提示 -->
          <div v-else-if="!searchQuery.trim()" class="py-8 text-center text-sm text-vscode-text-secondary">
            <Search class="w-8 h-8 mx-auto mb-2 opacity-30" />
            输入昵称搜索用户并添加好友
          </div>

          <!-- 结果列表 -->
          <div v-else class="divide-y divide-vscode-border">
            <div
              v-for="user in store.searchResults"
              :key="user.id"
            >
              <div class="flex items-center gap-3 px-4 py-3 hover:bg-vscode-active/50 transition-colors">
                <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs overflow-hidden flex-shrink-0" :style="{ backgroundColor: avatarColor(user.id) }">
                  <img
                    v-if="user.avatar && !imgErrors.has(user.id)"
                    :src="avatarUrl(user.avatar)"
                    :alt="user.nickname"
                    class="w-full h-full object-cover"
                    @error="imgErrors.add(user.id)"
                  />
                  <span v-else>{{ (user.nickname || '?')[0] }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm text-vscode-text truncate">{{ user.nickname }}</div>
                  <div class="text-xs text-vscode-text-secondary truncate">{{ user.email }}</div>
                </div>
                <button
                  v-if="user.isContact"
                  class="px-3 py-1 text-xs text-vscode-text-secondary rounded cursor-default"
                  disabled
                >
                  已是好友
                </button>
                <button
                  v-else
                  class="px-3 py-1 text-xs bg-vscode-info/20 text-vscode-info rounded hover:bg-vscode-info/30 transition-colors flex items-center gap-1"
                  @click="toggleExpand(user.id)"
                >
                  <UserPlus class="w-3 h-3" />
                  {{ expandedUserId === user.id ? '取消' : '添加好友' }}
                </button>
              </div>
              <!-- 展开的申请消息输入区 -->
              <div
                v-if="expandedUserId === user.id && !user.isContact"
                class="px-4 pb-3 flex flex-col gap-2"
              >
                <textarea
                  v-model="requestMessage"
                  class="w-full bg-vscode-bg border border-vscode-border rounded px-3 py-2 text-sm text-vscode-text focus:outline-none focus:border-vscode-info/50 placeholder-vscode-text-secondary resize-none"
                  placeholder="发送好友申请，介绍一下自己..."
                  rows="2"
                ></textarea>
                <div class="flex justify-end">
                  <button
                    class="px-3 py-1.5 text-xs bg-vscode-info text-white rounded hover:bg-vscode-info/80 transition-colors flex items-center gap-1"
                    @click="handleSendRequest(user.id, user.nickname)"
                  >
                    <Send class="w-3 h-3" />
                    发送申请
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
