<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { UserPlus, ExternalLink, MessageCircle, UserCheck } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useEditorStore } from '@/stores/editor'
import { useSocialStore } from '@/stores/social'
import { avatarUrl, avatarColor } from '@/utils/format'
import { getUserProfile, getUserStats, type UserProfileVO, type UserStatsVO } from '@/api/social'
import UserProfilePage from './UserProfilePage.vue'
import ChatView from '@/components/Chat/ChatView.vue'

const props = defineProps<{
  userId: string
  show: boolean
  anchorEl: HTMLElement | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const authStore = useAuthStore()
const editorStore = useEditorStore()
const socialStore = useSocialStore()

const profile = ref<UserProfileVO | null>(null)
const stats = ref<UserStatsVO | null>(null)
const loading = ref(false)
const showFriendDialog = ref(false)
const friendMessage = ref('')
const sendingRequest = ref(false)
const isFriend = ref(false)
const avatarImgError = ref(false)

const isSelf = computed(() => authStore.user?.id === props.userId)

const cardStyle = computed(() => {
  if (!props.anchorEl || typeof window === 'undefined') return { top: '0px', left: '0px' }
  const rect = props.anchorEl.getBoundingClientRect()
  return {
    top: `${rect.bottom}px`,
    left: `${Math.min(rect.left, window.innerWidth - 320)}px`,
  }
})

watch(() => props.show, async (val) => {
  if (val && props.userId) {
    loading.value = true
    avatarImgError.value = false
    try {
      const [pRes, sRes] = await Promise.all([
        getUserProfile(props.userId),
        getUserStats(props.userId),
        socialStore.fetchContacts(),
      ])
      if (pRes.code === 200) profile.value = pRes.data
      if (sRes.code === 200) stats.value = sRes.data
      isFriend.value = socialStore.contacts?.friends?.some(f => f.id === props.userId) ?? false
    } catch { /* ignore */ }
    finally { loading.value = false }
  } else {
    profile.value = null
    stats.value = null
  }
})

function handleViewProfile() {
  emit('close')
  editorStore.openComponentTab(
    `profile:${props.userId}`,
    profile.value?.nickname || '用户主页',
    UserProfilePage,
    { userId: props.userId }
  )
}

function handleGoChat() {
  if (!profile.value) return
  const conv = socialStore.conversations.find(
    c => c.type === 'PRIVATE' && c.name === profile.value?.nickname
  )
  if (conv) {
    emit('close')
    editorStore.openComponentTab(
      `chat:conv:${conv.id}`,
      profile.value.nickname || '聊天',
      ChatView,
      { conversationId: conv.id }
    )
  }
}

async function handleSendRequest() {
  if (!profile.value || !friendMessage.value.trim()) return
  sendingRequest.value = true
  try {
    await socialStore.sendFriendRequest(props.userId, friendMessage.value.trim())
    alert(`已向 ${profile.value.nickname} 发送好友申请`)
    showFriendDialog.value = false
    friendMessage.value = ''
    emit('close')
  } catch (e: any) {
    alert(e.message || '发送失败')
  } finally {
    sendingRequest.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <!-- Hover Card -->
    <div
      v-if="show && !showFriendDialog"
      class="fixed z-[60] w-[300px] bg-[#1e1e1e] border border-[#444] rounded-lg shadow-2xl p-4"
      :style="cardStyle"
      @mouseleave="emit('close')"
    >
      <div v-if="loading" class="flex items-center justify-center py-4">
        <div class="w-4 h-4 border-2 border-[#4a9eff] border-t-transparent rounded-full animate-spin"></div>
      </div>

      <template v-else-if="profile">
        <!-- Header -->
        <div class="flex items-center gap-3 mb-3">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden"
            :style="{ backgroundColor: avatarColor(profile.id) }"
          >
            <img v-if="profile.avatar && !avatarImgError" :src="avatarUrl(profile.avatar)" @error="avatarImgError = true" class="w-full h-full object-cover" />
            <span v-else>{{ profile.nickname?.charAt(0) || '?' }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-semibold text-[#ddd] truncate">{{ profile.nickname }}</div>
            <div v-if="profile.chsiVerified" class="text-xs text-blue-400">已认证</div>
          </div>
        </div>

        <!-- Bio -->
        <div v-if="profile.bio" class="text-xs text-[#999] mb-3 line-clamp-2">{{ profile.bio }}</div>

        <!-- Stats -->
        <div v-if="stats" class="flex gap-3 mb-3 text-center text-xs">
          <div><span class="text-[#4a9eff] font-medium">{{ stats.postCount }}</span> <span class="text-[#777]">帖子</span></div>
          <div><span class="text-[#4a9eff] font-medium">{{ stats.commentCount }}</span> <span class="text-[#777]">回复</span></div>
          <div><span class="text-[#4a9eff] font-medium">{{ stats.likeReceivedCount }}</span> <span class="text-[#777]">获赞</span></div>
          <div><span class="text-[#f0c040] font-medium">{{ stats.adoptedCount }}</span> <span class="text-[#777]">采纳</span></div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <button
            class="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded border border-[#4a9eff] text-[#4a9eff] hover:bg-[#4a9eff]/10 transition-colors"
            @click="handleViewProfile"
          >
            <ExternalLink class="w-3 h-3" /> 查看主页
          </button>
          <template v-if="!isSelf">
            <template v-if="isFriend">
              <button
                class="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded border border-[#4a9eff] text-[#4a9eff] hover:bg-[#4a9eff]/10 transition-colors"
                @click="handleGoChat"
              >
                <MessageCircle class="w-3 h-3" /> 去聊天
              </button>
            </template>
            <button
              v-else
              class="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded border border-[#e74c3c] text-[#e74c3c] hover:bg-[#e74c3c]/10 transition-colors"
              @click="showFriendDialog = true"
            >
              <UserPlus class="w-3 h-3" /> 加好友
            </button>
          </template>
        </div>
      </template>
    </div>

    <!-- Friend Request Mini Dialog -->
    <div
      v-if="show && showFriendDialog"
      class="fixed z-[60] w-[300px] bg-[#1e1e1e] border border-[#444] rounded-lg shadow-2xl p-4"
      :style="cardStyle"
    >
      <h4 class="text-sm font-semibold text-[#ccc] mb-3">发送好友申请</h4>
      <p class="text-xs text-[#888] mb-2">向 <span class="text-[#4a9eff]">{{ profile?.nickname }}</span> 发送好友申请</p>
      <textarea v-model="friendMessage" class="w-full bg-[#2d2d2d] border border-[#444] rounded px-2 py-1.5 text-xs text-[#ccc] outline-none focus:border-[#4a9eff] resize-none" rows="2" placeholder="你好，我想加你为好友..."></textarea>
      <div class="flex gap-2 justify-end mt-3">
        <button class="px-3 py-1 border border-[#555] text-[#aaa] rounded text-xs hover:bg-[#2a2a2a]" @click="showFriendDialog = false">取消</button>
        <button class="px-3 py-1 bg-[#4a9eff] text-white rounded text-xs hover:bg-[#3a8eef] disabled:opacity-50" :disabled="!friendMessage.trim() || sendingRequest" @click="handleSendRequest">
          {{ sendingRequest ? '...' : '发送' }}
        </button>
      </div>
    </div>
  </Teleport>
</template>
