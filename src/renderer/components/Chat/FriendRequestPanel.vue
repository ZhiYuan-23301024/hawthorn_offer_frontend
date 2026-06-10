<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { UserPlus, UserCheck, UserX, Clock, Loader, Users } from 'lucide-vue-next'
import { useSocialStore } from '@/stores/social'
import { useEditorStore } from '@/stores/editor'
import ChatView from './ChatView.vue'

const store = useSocialStore()
const editorStore = useEditorStore()
const activeTab = ref<'pending' | 'sent'>('pending')

onMounted(() => {
  store.fetchFriendRequests()
})

function handleAccept(id: string) {
  store.acceptFriendRequest(id).then((conv) => {
    if (conv) {
      // 自动打开新创建的私聊会话
      editorStore.openComponentTab(
        `chat:conv:${conv.id}`,
        conv.name || '私聊',
        ChatView,
        { conversationId: conv.id }
      )
    }
  }).catch(e => {
    alert(e.message || '操作失败')
  })
}

function handleReject(id: string) {
  if (!confirm('确定要拒绝此好友申请吗？')) return
  store.rejectFriendRequest(id).catch(e => {
    alert(e.message || '操作失败')
  })
}

async function handleAcceptJoinReq(conversationId: string, reqId: string, applicantName: string) {
  try {
    await store.acceptJoinRequest(conversationId, reqId, applicantName)
  } catch (e: any) {
    alert(e.message || '操作失败')
  }
}

async function handleRejectJoinReq(conversationId: string, reqId: string) {
  try {
    await store.rejectJoinRequest(conversationId, reqId)
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
  <div class="h-full flex flex-col">
    <!-- 标签页切换 -->
    <div class="flex border-b border-vscode-border">
      <button
        class="flex-1 py-2 text-sm font-medium transition-colors border-b-2"
        :class="activeTab === 'pending'
          ? 'text-vscode-text border-vscode-info'
          : 'text-vscode-text-secondary border-transparent hover:text-vscode-text'"
        @click="activeTab = 'pending'"
      >
        收到的申请
        <span
          v-if="store.pendingRequestCount > 0"
          class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-vscode-info/30 text-vscode-info"
        >
          {{ store.pendingRequestCount }}
        </span>
      </button>
      <button
        class="flex-1 py-2 text-sm font-medium transition-colors border-b-2"
        :class="activeTab === 'sent'
          ? 'text-vscode-text border-vscode-info'
          : 'text-vscode-text-secondary border-transparent hover:text-vscode-text'"
        @click="activeTab = 'sent'"
      >
        发出的申请
      </button>
    </div>

    <!-- 加载 -->
    <div v-if="store.loadingFriendRequests" class="flex-1 flex items-center justify-center">
      <Loader class="w-5 h-5 animate-spin text-vscode-text-secondary" />
    </div>

    <!-- 收到的申请 -->
    <div v-else-if="activeTab === 'pending'" class="flex-1 overflow-y-auto">
      <div v-if="store.allReceivedRequests.length === 0" class="p-6 text-center text-sm text-vscode-text-secondary">
        暂无收到的申请记录
      </div>
      <div
        v-for="req in store.allReceivedRequests"
        :key="req.id"
        class="flex items-center gap-3 px-3 py-3 border-b border-vscode-border/50 hover:bg-vscode-selected/20 transition-colors"
      >
        <div class="w-10 h-10 rounded-full bg-vscode-active flex items-center justify-center text-xs text-vscode-text overflow-hidden flex-shrink-0">
          <img
            v-if="req.fromAvatar"
            :src="req.fromAvatar"
            :alt="req.fromNickname"
            class="w-full h-full object-cover"
          />
          <span v-else>{{ (req.fromNickname || '?')[0] }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-vscode-text">{{ req.fromNickname || '未知用户' }}</div>
          <div class="text-xs text-vscode-text-secondary mt-0.5" v-if="req.message">
            {{ req.message }}
          </div>
          <div class="text-xs text-vscode-text-secondary mt-0.5 flex items-center gap-1">
            <Clock class="w-3 h-3" />
            {{ formatTime(req.updatedAt || req.createdAt) }}
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <template v-if="req.status === 'PENDING'">
            <button
              class="p-1.5 rounded-lg bg-vscode-info/20 text-vscode-info hover:bg-vscode-info/30 transition-colors"
              title="接受"
              @click="handleAccept(req.id)"
            >
              <UserCheck class="w-4 h-4" />
            </button>
            <button
              class="p-1.5 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors"
              title="拒绝"
              @click="handleReject(req.id)"
            >
              <UserX class="w-4 h-4" />
            </button>
          </template>
          <span
            v-else
            class="px-2 py-0.5 text-xs rounded-full"
            :class="{
              'bg-green-500/20 text-green-400': req.status === 'ACCEPTED',
              'bg-gray-500/20 text-gray-400': req.status === 'REJECTED',
              'bg-red-500/20 text-red-400': req.status === 'REMOVED'
            }"
          >
            {{ req.status === 'ACCEPTED' ? '已接受' : req.status === 'REJECTED' ? '已拒绝' : '已删除' }}
          </span>
        </div>
      </div>
    </div>

    <!-- 入群申请 -->
    <template v-if="activeTab === 'pending'">
      <div v-if="store.loadingAllGroupJoinRequests" class="flex items-center justify-center py-4">
        <Loader class="w-4 h-4 animate-spin text-vscode-text-secondary" />
      </div>
      <template v-else-if="store.allGroupJoinRequests.filter(r => r.status === 'PENDING').length > 0">
        <div class="px-3 py-2 text-xs font-medium text-vscode-text-secondary border-b border-vscode-border/50 flex items-center gap-1.5">
          <Users class="w-3.5 h-3.5" />
          入群申请
        </div>
        <div
          v-for="req in store.allGroupJoinRequests.filter(r => r.status === 'PENDING')"
          :key="req.id"
          class="flex items-center gap-3 px-3 py-3 border-b border-vscode-border/50 hover:bg-vscode-selected/20 transition-colors"
        >
          <div class="w-10 h-10 rounded-full bg-vscode-active flex items-center justify-center text-xs text-vscode-text overflow-hidden flex-shrink-0">
            <img
              v-if="req.userAvatar"
              :src="req.userAvatar"
              :alt="req.userNickname"
              class="w-full h-full object-cover"
            />
            <span v-else>{{ (req.userNickname || '?')[0] }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-vscode-text">{{ req.userNickname || '未知用户' }}</div>
            <div class="text-xs text-vscode-text-secondary mt-0.5">
              申请加入 <span class="text-vscode-info">{{ req.groupName || '群聊' }}</span>
            </div>
            <div class="text-xs text-vscode-text-secondary mt-0.5" v-if="req.message">
              {{ req.message }}
            </div>
            <div class="text-xs text-vscode-text-secondary mt-0.5 flex items-center gap-1">
              <Clock class="w-3 h-3" />
              {{ formatTime(req.createdAt) }}
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button
              class="p-1.5 rounded-lg bg-vscode-info/20 text-vscode-info hover:bg-vscode-info/30 transition-colors"
              title="同意"
              @click="handleAcceptJoinReq(req.conversationId, req.id, req.userNickname || '用户')"
            >
              <UserCheck class="w-4 h-4" />
            </button>
            <button
              class="p-1.5 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors"
              title="拒绝"
              @click="handleRejectJoinReq(req.conversationId, req.id)"
            >
              <UserX class="w-4 h-4" />
            </button>
          </div>
        </div>
      </template>
    </template>

    <!-- 发出的申请 -->
    <div v-else class="flex-1 overflow-y-auto">
      <div v-if="store.sentFriendRequests.length === 0" class="p-6 text-center text-sm text-vscode-text-secondary">
        暂无发出的好友申请
      </div>
      <div
        v-for="req in store.sentFriendRequests"
        :key="req.id"
        class="flex items-center gap-3 px-3 py-3 border-b border-vscode-border/50"
      >
        <div class="w-10 h-10 rounded-full bg-vscode-active flex items-center justify-center text-xs text-vscode-text overflow-hidden flex-shrink-0">
          <img
            v-if="req.toAvatar"
            :src="req.toAvatar"
            :alt="req.toNickname"
            class="w-full h-full object-cover"
          />
          <span v-else>{{ (req.toNickname || '?')[0] }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-vscode-text">{{ req.toNickname || '未知用户' }}</div>
          <div class="text-xs text-vscode-text-secondary mt-0.5" v-if="req.message">
            {{ req.message }}
          </div>
          <div class="text-xs mt-0.5" :class="{
            'text-vscode-info': req.status === 'PENDING',
            'text-green-400': req.status === 'ACCEPTED',
            'text-red-400': req.status === 'REJECTED'
          }">
            {{ req.status === 'PENDING' ? '等待对方确认' : req.status === 'ACCEPTED' ? '已接受' : '已拒绝' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
