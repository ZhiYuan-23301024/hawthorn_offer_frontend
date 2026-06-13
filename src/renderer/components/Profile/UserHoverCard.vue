<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { UserPlus, ExternalLink, MessageCircle, UserCheck, LogIn } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useEditorStore } from '@/stores/editor'
import { useSocialStore } from '@/stores/social'
import { useSidebarStore } from '@/stores/sidebar'
import { useWorkspaceStore } from '@/stores/workspace'
import { avatarUrl, avatarColor } from '@/utils/format'
import { getUserProfile, getUserStats, type UserProfileVO, type UserStatsVO } from '@/api/social'
import UserProfilePage from './UserProfilePage.vue'
import ChatView from '@/components/Chat/ChatView.vue'
import AccountPanel from '@/plugins/builtin/components/AccountPanel.vue'

const props = defineProps<{
  userId: string
  show: boolean
  anchorEl: HTMLElement | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'mouseenter'): void
  (e: 'mouseleave'): void
}>()

const authStore = useAuthStore()
const editorStore = useEditorStore()
const socialStore = useSocialStore()
const sidebarStore = useSidebarStore()
const workspaceStore = useWorkspaceStore()

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
    // 未登录时直接显示登录提示，不发起 API 请求
    if (!authStore.isAuthenticated) {
      loading.value = false
      profile.value = null
      stats.value = null
      return
    }
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

function goToLogin() {
  emit('close')
  sidebarStore.setActiveItem('account')
  workspaceStore.setActivePanel('account')
  editorStore.openOrUpdateComponentTab('account:login', '登录 / 注册', AccountPanel, { activeSection: 'all' })
}

function handleViewProfile() {
  if (!authStore.isAuthenticated) {
    goToLogin()
    return
  }
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
  if (!profile.value) return
  if (!authStore.isAuthenticated) {
    showFriendDialog.value = false
    emit('close')
    if (confirm('请先登录后再添加好友，是否前往登录？')) {
      goToLogin()
    }
    return
  }
  sendingRequest.value = true
  try {
    const message = friendMessage.value.trim() || '你好，我想加你为好友'
    await socialStore.sendFriendRequest(props.userId, message)
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
    <div
      v-if="show"
      class="fixed z-[60] w-[300px] rounded-lg shadow-2xl p-4 glass-float" style="min-height: 180px"
      :style="cardStyle"
      @mouseenter="emit('mouseenter')"
      @mouseleave="showFriendDialog || emit('mouseleave')"
      @click.stop
    >
      <!-- Hover Card Content -->
      <div v-show="!showFriendDialog">
        <div v-if="loading" class="flex items-center justify-center py-4">
          <div class="w-4 h-4 border-2 rounded-full animate-spin" style="border-color: var(--color-primary); border-top-color: transparent;"></div>
        </div>

        <!-- 未登录：显示登录提示 -->
        <div v-else-if="!authStore.isAuthenticated" class="flex flex-col items-center py-4 gap-3">
          <p class="text-sm text-center" style="color: var(--color-text-secondary);">登录后即可查看用户主页</p>
          <button
            class="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg text-white transition-colors"
            style="background-color: var(--color-primary);"
            @click="goToLogin"
            @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-primary-dark)' }"
            @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-primary)' }"
          >
            <LogIn class="w-3.5 h-3.5" /> 登录
          </button>
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
              <div class="text-sm font-semibold truncate" style="font-family: var(--font-display); color: var(--color-text-primary);">{{ profile.nickname }}</div>
              <div v-if="profile.chsiVerified" class="text-xs" style="color: var(--color-primary);">已认证</div>
            </div>
          </div>

          <!-- Bio -->
          <div v-if="profile.bio" class="text-xs mb-3 line-clamp-2" style="color: var(--color-text-secondary);">{{ profile.bio }}</div>

          <!-- Stats -->
          <div v-if="stats" class="flex gap-3 mb-3 text-center text-xs">
            <div><span class="font-medium" style="color: var(--color-primary-dark);">{{ stats.postCount }}</span> <span style="color: var(--color-text-secondary);">帖子</span></div>
            <div><span class="font-medium" style="color: var(--color-primary-dark);">{{ stats.commentCount }}</span> <span style="color: var(--color-text-secondary);">回复</span></div>
            <div><span class="font-medium" style="color: var(--color-primary-dark);">{{ stats.likeReceivedCount }}</span> <span style="color: var(--color-text-secondary);">获赞</span></div>
            <div><span class="font-medium" style="color: var(--color-warning);">{{ stats.adoptedCount }}</span> <span style="color: var(--color-text-secondary);">采纳</span></div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <button
              class="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded border transition-colors"
              style="border-color: var(--color-primary); color: var(--color-primary);"
              @click="handleViewProfile"
            >
              <ExternalLink class="w-3 h-3" /> 查看主页
            </button>
            <template v-if="!isSelf">
              <template v-if="isFriend">
                <button
                  class="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded border transition-colors"
                  style="border-color: var(--color-primary); color: var(--color-primary);"
                  @click="handleGoChat"
                >
                  <MessageCircle class="w-3 h-3" /> 去聊天
                </button>
              </template>
              <button
                v-else
                class="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded border transition-colors"
                style="border-color: var(--color-cta); color: var(--color-cta-dark);"
                @click="showFriendDialog = true"
              >
                <UserPlus class="w-3 h-3" /> 加好友
              </button>
            </template>
          </div>
        </template>
      </div>

      <!-- Friend Request Mini Dialog -->
      <div v-show="showFriendDialog">
        <h4 class="text-sm font-semibold mb-3" style="font-family: var(--font-display); color: var(--color-text-primary);">发送好友申请</h4>
        <p class="text-xs mb-2" style="color: var(--color-text-secondary);">向 <span style="color: var(--color-primary);">{{ profile?.nickname }}</span> 发送好友申请</p>
        <textarea v-model="friendMessage" class="w-full input-base resize-none text-xs" rows="2" placeholder="你好，我想加你为好友..."></textarea>
        <div class="flex gap-2 justify-end mt-3">
          <button class="px-3 py-1 rounded text-xs btn-ghost" @click="showFriendDialog = false">取消</button>
          <button class="px-3 py-1 text-white rounded text-xs transition-colors disabled:opacity-50 btn-primary" :disabled="sendingRequest" @click="handleSendRequest">
            {{ sendingRequest ? '...' : '发送' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
