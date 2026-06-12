<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, Search, Loader, Users, UserPlus, Send } from 'lucide-vue-next'
import { useSocialStore } from '@/stores/social'
import { avatarUrl, avatarColor } from '@/utils/format'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useSocialStore()

const searchCode = ref('')
const joinMessage = ref('')
const showJoinForm = ref(false)
const joining = ref(false)
const imgError = ref(false)

watch(() => props.show, (val) => {
  if (!val) {
    searchCode.value = ''
    joinMessage.value = ''
    showJoinForm.value = false
    store.groupSearchResult = null
  }
})

async function handleSearch() {
  if (!searchCode.value.trim()) return
  await store.searchGroupByCode(searchCode.value.trim())
  showJoinForm.value = false
  joinMessage.value = ''
}

async function handleJoin() {
  if (!store.groupSearchResult || joining.value) return
  joining.value = true
  try {
    await store.requestJoinGroup(store.groupSearchResult.id, joinMessage.value.trim() || undefined)
    alert('申请已发送，等待群主审核')
    showJoinForm.value = false
    joinMessage.value = ''
  } catch (e: any) {
    alert(e.message || '申请失败')
  } finally {
    joining.value = false
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
            <Search class="w-4 h-4" />
            搜索群聊
          </h3>
          <button
            class="p-1 rounded hover:bg-vscode-active transition-colors text-vscode-icon"
            @click="emit('close')"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- 内容 -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <!-- 搜索输入 -->
          <div>
            <label class="text-xs text-vscode-text-secondary mb-1 block">通过群号搜索群聊</label>
            <div class="flex gap-2">
              <div class="relative flex-1">
                <Search class="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-vscode-text-secondary" />
                <input
                  v-model="searchCode"
                  type="text"
                  class="w-full bg-vscode-bg border border-vscode-border rounded pl-8 pr-3 py-2 text-sm text-vscode-text focus:outline-none focus:border-vscode-info/50 placeholder-vscode-text-secondary"
                  placeholder="输入6位群号"
                  maxlength="6"
                  @keydown.enter="handleSearch"
                />
              </div>
              <button
                class="px-3 py-2 bg-vscode-info/20 text-vscode-info rounded hover:bg-vscode-info/30 transition-colors text-sm flex items-center gap-1"
                @click="handleSearch"
              >
                <Search class="w-3.5 h-3.5" />
                搜索
              </button>
            </div>
          </div>

          <!-- 搜索中 -->
          <div v-if="store.searchingGroup" class="text-center py-4">
            <Loader class="w-5 h-5 animate-spin text-vscode-text-secondary inline" />
          </div>

          <!-- 搜索结果 -->
          <div
            v-else-if="store.groupSearchResult"
            class="border border-vscode-border rounded-lg p-3 bg-vscode-bg"
          >
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm overflow-hidden" :style="{ backgroundColor: avatarColor(store.groupSearchResult.id || 'search') }">
                <img
                  v-if="store.groupSearchResult.avatar && !imgError"
                  :src="avatarUrl(store.groupSearchResult.avatar)"
                  :alt="store.groupSearchResult.name"
                  class="w-full h-full object-cover"
                  @error="imgError = true"
                />
                <span v-else>{{ (store.groupSearchResult.name || '群')[0] }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-vscode-text">{{ store.groupSearchResult.name }}</div>
                <div class="text-xs text-vscode-text-secondary">
                  群号: {{ store.groupSearchResult.groupCode }}
                  <span class="ml-2">· {{ store.groupSearchResult.memberCount || 0 }} 人</span>
                </div>
              </div>
            </div>

            <!-- 申请加入表单 -->
            <div v-if="!showJoinForm">
              <button
                class="w-full py-2 text-sm bg-vscode-info/20 text-vscode-info rounded-lg hover:bg-vscode-info/30 transition-colors flex items-center justify-center gap-1.5"
                @click="showJoinForm = true"
              >
                <UserPlus class="w-4 h-4" />
                申请加入
              </button>
            </div>
            <div v-else class="space-y-2">
              <textarea
                v-model="joinMessage"
                class="w-full bg-vscode-sidebar border border-vscode-border rounded px-3 py-2 text-sm text-vscode-text focus:outline-none focus:border-vscode-info/50 placeholder-vscode-text-secondary resize-none"
                rows="2"
                placeholder="附言（可选）"
                maxlength="100"
              ></textarea>
              <div class="flex gap-2">
                <button
                  class="flex-1 py-1.5 text-sm text-vscode-text-secondary hover:text-vscode-text hover:bg-vscode-active rounded transition-colors"
                  @click="showJoinForm = false; joinMessage = ''"
                >
                  取消
                </button>
                <button
                  class="flex-1 py-1.5 text-sm bg-vscode-info/20 text-vscode-info rounded hover:bg-vscode-info/30 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                  :disabled="joining"
                  @click="handleJoin"
                >
                  <Send class="w-3.5 h-3.5" />
                  {{ joining ? '发送中...' : '发送申请' }}
                </button>
              </div>
            </div>
          </div>

          <!-- 未找到 -->
          <div v-else-if="store.groupSearchResult === null && searchCode.trim()" class="text-center py-4 text-sm text-vscode-text-secondary">
            未找到该群聊
          </div>

          <!-- 初始提示 -->
          <div v-else class="text-center py-8 text-sm text-vscode-text-secondary">
            <Search class="w-8 h-8 mx-auto mb-2 opacity-30" />
            输入群号搜索群聊并申请加入
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
