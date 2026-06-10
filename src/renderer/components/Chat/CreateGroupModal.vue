<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { X, Search, Loader, Check, Users } from 'lucide-vue-next'
import { useSocialStore } from '@/stores/social'
import type { UserBriefVO } from '@/api/social'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', conversationId: string): void
}>()

const store = useSocialStore()

const groupName = ref('')
const friendSearch = ref('')
const selectedMembers = ref<UserBriefVO[]>([])
const friends = ref<UserBriefVO[]>([])
const loadingFriends = ref(false)
const creating = ref(false)

watch(() => props.show, async (val) => {
  if (val) {
    groupName.value = ''
    friendSearch.value = ''
    selectedMembers.value = []
    // 加载好友列表
    loadingFriends.value = true
    try {
      await store.fetchContacts()
      friends.value = store.contacts?.friends || []
    } finally {
      loadingFriends.value = false
    }
  }
})

const filteredFriends = computed(() => {
  if (!friendSearch.value.trim()) return friends.value
  const q = friendSearch.value.trim().toLowerCase()
  return friends.value.filter(f => (f.nickname || '').toLowerCase().includes(q))
})

function isSelected(userId: string): boolean {
  return selectedMembers.value.some(m => m.id === userId)
}

function toggleMember(friend: UserBriefVO) {
  const idx = selectedMembers.value.findIndex(m => m.id === friend.id)
  if (idx >= 0) {
    selectedMembers.value.splice(idx, 1)
  } else {
    selectedMembers.value.push(friend)
  }
}

async function handleCreate() {
  if (!groupName.value.trim() || selectedMembers.value.length < 2) return
  creating.value = true
  try {
    const conv = await store.createGroup(
      groupName.value.trim(),
      selectedMembers.value.map(m => m.id)
    )
    if (conv) {
      emit('created', conv.id)
      emit('close')
    }
  } catch {
    // error handled by store
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="emit('close')"
    >
      <div class="bg-vscode-sidebar border border-vscode-border rounded-lg shadow-2xl w-[420px] max-h-[560px] flex flex-col">
        <!-- 头部 -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-vscode-border">
          <h3 class="text-sm font-semibold text-vscode-text flex items-center gap-2">
            <Users class="w-4 h-4" />
            创建群聊
          </h3>
          <button
            class="p-1 rounded hover:bg-vscode-active transition-colors text-vscode-icon"
            @click="emit('close')"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <!-- 群名称 -->
          <div>
            <label class="text-xs text-vscode-text-secondary mb-1 block">群名称</label>
            <input
              v-model="groupName"
              type="text"
              class="w-full bg-vscode-bg border border-vscode-border rounded px-3 py-2 text-sm text-vscode-text focus:outline-none focus:border-vscode-info/50 placeholder-vscode-text-secondary"
              placeholder="输入群聊名称"
              maxlength="30"
            />
          </div>

          <!-- 已选成员 -->
          <div v-if="selectedMembers.length > 0">
            <label class="text-xs text-vscode-text-secondary mb-1 block">
              已选成员 ({{ selectedMembers.length }})
            </label>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="m in selectedMembers"
                :key="m.id"
                class="flex items-center gap-1 px-2 py-1 bg-vscode-info/10 text-vscode-info text-xs rounded-full"
              >
                {{ m.nickname }}
                <button
                  class="hover:text-red-400 transition-colors"
                  @click="toggleMember(m)"
                >
                  <X class="w-3 h-3" />
                </button>
              </span>
            </div>
          </div>

          <!-- 好友列表 -->
          <div>
            <label class="text-xs text-vscode-text-secondary mb-1 block">选择好友</label>
            <!-- 搜索 -->
            <div class="relative mb-2">
              <Search class="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-vscode-text-secondary" />
              <input
                v-model="friendSearch"
                type="text"
                class="w-full bg-vscode-bg border border-vscode-border rounded pl-8 pr-3 py-2 text-sm text-vscode-text focus:outline-none focus:border-vscode-info/50 placeholder-vscode-text-secondary"
                placeholder="搜索好友..."
              />
            </div>

            <!-- 好友列表 -->
            <div v-if="loadingFriends" class="py-4 text-center">
              <Loader class="w-4 h-4 animate-spin text-vscode-text-secondary inline" />
            </div>
            <div v-else-if="filteredFriends.length === 0" class="py-3 text-center text-xs text-vscode-text-secondary">
              {{ friendSearch ? '未找到匹配的好友' : '暂无好友，先去添加好友吧' }}
            </div>
            <div v-else class="border border-vscode-border rounded divide-y divide-vscode-border max-h-[200px] overflow-y-auto">
              <div
                v-for="friend in filteredFriends"
                :key="friend.id"
                class="flex items-center gap-3 px-3 py-2 hover:bg-vscode-active/50 transition-colors cursor-pointer"
                :class="isSelected(friend.id) ? 'bg-vscode-info/10' : ''"
                @click="toggleMember(friend)"
              >
                <div class="w-8 h-8 rounded-full bg-vscode-active flex items-center justify-center text-xs text-vscode-text overflow-hidden flex-shrink-0">
                  <img
                    v-if="friend.avatar"
                    :src="friend.avatar"
                    :alt="friend.nickname"
                    class="w-full h-full object-cover"
                  />
                  <span v-else>{{ (friend.nickname || '?')[0] }}</span>
                </div>
                <span class="text-sm text-vscode-text flex-1 truncate">{{ friend.nickname }}</span>
                <div
                  class="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                  :class="isSelected(friend.id) ? 'bg-vscode-info border-vscode-info' : 'border-vscode-text-secondary'"
                >
                  <Check v-if="isSelected(friend.id)" class="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="px-4 py-3 border-t border-vscode-border flex gap-2">
          <button
            class="flex-1 py-2 text-sm text-vscode-text-secondary hover:text-vscode-text hover:bg-vscode-active rounded transition-colors"
            @click="emit('close')"
          >
            取消
          </button>
          <button
            class="flex-1 py-2 text-sm bg-vscode-info/20 text-vscode-info rounded hover:bg-vscode-info/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!groupName.trim() || selectedMembers.length < 2 || creating"
            @click="handleCreate"
          >
            {{ creating ? '创建中...' : `创建群聊 (${selectedMembers.length + 1}人)` }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
