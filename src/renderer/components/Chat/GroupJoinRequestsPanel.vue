<script setup lang="ts">
import { onMounted } from 'vue'
import { X, UserCheck, UserX, Loader } from 'lucide-vue-next'
import { useSocialStore } from '@/stores/social'

const props = defineProps<{
  conversationId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useSocialStore()

onMounted(() => {
  store.fetchGroupJoinRequests(props.conversationId)
})

async function handleAccept(reqId: string, applicantName: string) {
  try {
    await store.acceptJoinRequest(props.conversationId, reqId, applicantName)
  } catch (e: any) {
    alert(e.message || '操作失败')
  }
}

async function handleReject(reqId: string) {
  try {
    await store.rejectJoinRequest(props.conversationId, reqId)
  } catch (e: any) {
    alert(e.message || '操作失败')
  }
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="border-b border-vscode-border bg-vscode-sidebar">
    <div class="flex items-center justify-between px-4 py-2">
      <span class="text-sm font-medium text-vscode-text">待审批入群申请</span>
      <button
        class="p-1 rounded hover:bg-vscode-active transition-colors text-vscode-icon"
        @click="emit('close')"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- 加载中 -->
    <div v-if="store.loadingJoinRequests" class="flex items-center justify-center py-4">
      <Loader class="w-4 h-4 animate-spin text-vscode-text-secondary" />
    </div>

    <!-- 空态 -->
    <div v-else-if="store.groupJoinRequests.length === 0" class="py-3 text-center text-xs text-vscode-text-secondary">
      暂无待处理的入群申请
    </div>

    <!-- 申请列表 -->
    <div v-else class="max-h-[200px] overflow-y-auto divide-y divide-vscode-border">
      <div
        v-for="req in store.groupJoinRequests"
        :key="req.id"
        class="flex items-center gap-3 px-4 py-2.5 hover:bg-vscode-active/50 transition-colors"
      >
        <div class="w-8 h-8 rounded-full bg-vscode-active flex items-center justify-center text-xs text-vscode-text overflow-hidden flex-shrink-0">
          <img
            v-if="req.userAvatar"
            :src="req.userAvatar"
            :alt="req.userNickname"
            class="w-full h-full object-cover"
          />
          <span v-else>{{ (req.userNickname || '?')[0] }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm text-vscode-text">{{ req.userNickname || '未知用户' }}</div>
          <div class="text-xs text-vscode-text-secondary mt-0.5" v-if="req.message">
            {{ req.message }}
          </div>
          <div class="text-xs text-vscode-text-secondary mt-0.5">
            {{ formatTime(req.createdAt) }}
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            class="p-1.5 rounded-lg bg-vscode-info/20 text-vscode-info hover:bg-vscode-info/30 transition-colors"
            title="同意"
            @click="handleAccept(req.id, req.userNickname || '用户')"
          >
            <UserCheck class="w-4 h-4" />
          </button>
          <button
            class="p-1.5 rounded-lg bg-danger-subtle text-danger hover:bg-danger/20 transition-colors"
            title="拒绝"
            @click="handleReject(req.id)"
          >
            <UserX class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
