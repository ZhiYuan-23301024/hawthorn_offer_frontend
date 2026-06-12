<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { UserPlus, Edit3, Eye, EyeOff, Loader, Heart, MessageSquare, FileText, ThumbsUp, MessageCircle, UserCheck } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useEditorStore } from '@/stores/editor'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSidebarStore } from '@/stores/sidebar'
import { usePostStore } from '@/stores/post'
import { useSocialStore } from '@/stores/social'
import { avatarUrl, avatarColor } from '@/utils/format'
import {
  getUserProfile, getUserStats, getUserComments, getUserLikes,
  getMyPrivacy, updateMyPrivacy,
  type UserProfileVO, type UserStatsVO, type UserCommentVO, type UserLikedItemVO
} from '@/api/social'
import { getUserPosts } from '@/api/social'
import PostDetail from '@/components/Editor/PostDetail.vue'
import ChatView from '@/components/Chat/ChatView.vue'

const props = defineProps<{
  userId: string
}>()

const authStore = useAuthStore()
const editorStore = useEditorStore()
const workspaceStore = useWorkspaceStore()
const sidebarStore = useSidebarStore()
const postStore = usePostStore()
const socialStore = useSocialStore()

const isSelf = computed(() => authStore.user?.id === props.userId)

const profile = ref<UserProfileVO | null>(null)
const stats = ref<UserStatsVO | null>(null)
const posts = ref<any[]>([])
const comments = ref<UserCommentVO[]>([])
const likedItems = ref<UserLikedItemVO[]>([])
const privacy = ref<Record<string, boolean>>({})

const loading = ref(true)
const activeTab = ref<'posts' | 'comments' | 'likes'>('posts')
const sortMode = ref<'latest' | 'hot'>('latest')
const showFriendDialog = ref(false)
const friendMessage = ref('')
const sendingRequest = ref(false)
const isFriend = ref(false)

const TABS = [
  { key: 'posts' as const, label: '帖子', icon: FileText, showKey: 'showPosts' },
  { key: 'comments' as const, label: '回复', icon: MessageSquare, showKey: 'showComments' },
  { key: 'likes' as const, label: '点赞', icon: ThumbsUp, showKey: 'showFavorites' },
]

const visibleTabs = computed(() => {
  if (isSelf.value) return TABS
  return TABS.filter(t => privacy.value[t.showKey] !== false)
})

const showSort = computed(() => activeTab.value !== 'likes')

// 5-item limit for non-self viewers
const displayPosts = computed(() => sortedPosts.value.slice(0, 5))
const displayComments = computed(() => sortedComments.value.slice(0, 5))
const displayLikes = computed(() => likedItems.value.slice(0, 5))

const formatDate = (d: string) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

const formatTimeAgo = (d: string) => {
  const now = Date.now()
  const diff = now - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m}分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}小时前`
  return `${Math.floor(h / 24)}天前`
}

const sortedPosts = computed(() => {
  const list = [...posts.value]
  if (sortMode.value === 'hot') {
    list.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
  } else {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
  return list
})

const sortedComments = computed(() => {
  const list = [...comments.value]
  if (sortMode.value === 'hot') {
    list.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
  } else {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
  return list
})

onMounted(() => loadAll())

watch(() => props.userId, () => loadAll())

async function loadAll() {
  loading.value = true
  try {
    const [pRes, sRes, poRes, cRes, lRes] = await Promise.all([
      getUserProfile(props.userId),
      getUserStats(props.userId),
      getUserPosts(props.userId),
      getUserComments(props.userId),
      getUserLikes(props.userId),
    ])
    if (pRes.code === 200) profile.value = pRes.data
    if (sRes.code === 200) stats.value = sRes.data
    if (poRes.code === 200) posts.value = poRes.data || []
    if (cRes.code === 200) comments.value = cRes.data || []
    if (lRes.code === 200) likedItems.value = lRes.data || []
  } catch { /* ignore */ }
  finally { loading.value = false }

  if (isSelf.value) {
    try {
      const privRes = await getMyPrivacy()
      if (privRes.code === 200) privacy.value = privRes.data
    } catch { /* ignore */ }
  } else if (profile.value?.privacySettings) {
    privacy.value = profile.value.privacySettings
  }

  // Check friend status
  if (!isSelf.value) {
    try {
      await socialStore.fetchContacts()
      isFriend.value = socialStore.contacts?.friends?.some(f => f.id === props.userId) ?? false
    } catch { /* ignore */ }
  }
}

function handleEditProfile() {
  editorStore.openComponentTab(
    'account:profile',
    '账户与设置/个人信息',
    null as any,
    { activeSection: 'profile' }
  )
}

function handleTabTitleClick() {
  sidebarStore.setActiveItem('postBrowser')
  workspaceStore.setActivePanel('postBrowser')
  postStore.setTab('myOwn')
}

async function handleSendFriendRequest() {
  if (!profile.value || !friendMessage.value.trim()) return
  sendingRequest.value = true
  try {
    await socialStore.sendFriendRequest(profile.value.id, friendMessage.value.trim())
    alert(`已向 ${profile.value.nickname} 发送好友申请`)
    showFriendDialog.value = false
    friendMessage.value = ''
  } catch (e: any) {
    alert(e.message || '发送失败')
  } finally {
    sendingRequest.value = false
  }
}

function handleGoChat() {
  if (!profile.value) return
  const conv = socialStore.conversations.find(
    c => c.type === 'PRIVATE' && c.name === profile.value?.nickname
  )
  if (conv) {
    editorStore.openComponentTab(
      `chat:conv:${conv.id}`,
      profile.value.nickname || '聊天',
      ChatView,
      { conversationId: conv.id }
    )
  } else {
    alert('未找到聊天会话，请先添加好友')
  }
}

async function togglePrivacy(key: string) {
  const newVal = !(privacy.value[key] !== false)
  privacy.value = { ...privacy.value, [key]: newVal }
  try {
    await updateMyPrivacy({ [key]: newVal })
  } catch { /* ignore */ }
}

function openPost(postId: string) {
  sidebarStore.setActiveItem('postBrowser')
  workspaceStore.setActivePanel('postBrowser')
  if (isSelf.value) {
    postStore.setTab('myOwn')
  } else {
    postStore.setTab('regular')
  }
  postStore.selectPost(postId, 'regular')
  editorStore.openComponentTab(
    `post:regular:${postId}`,
    profile.value?.nickname ? `${profile.value.nickname} 的帖子` : '帖子详情',
    PostDetail,
    { postId, postType: 'regular' }
  )
}

function openLikedPost(targetId: string, targetType: string) {
  if (targetType === 'post') {
    openPost(targetId)
  }
}
</script>

<template>
  <div class="h-full overflow-y-auto text-[#ccc]">
    <div v-if="loading" class="flex items-center justify-center h-full">
      <Loader class="w-6 h-6 animate-spin text-[#888]" />
    </div>

    <template v-else-if="profile">
      <!-- Header -->
      <div class="px-6 py-5 border-b border-[#333]">
        <div class="flex items-start gap-5">
          <div
            class="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-3xl flex-shrink-0 overflow-hidden"
            :style="profile.avatar ? {} : { backgroundColor: avatarColor(profile.id) }"
            :class="profile.avatar ? 'bg-[#6b46c1]' : ''"
          >
            <img v-if="profile.avatar" :src="avatarUrl(profile.avatar)" class="w-full h-full object-cover" />
            <span v-else>{{ profile.nickname?.charAt(0) || '?' }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-xl font-bold text-[#ddd]">{{ profile.nickname }}</h2>
              <span v-if="profile.chsiVerified" class="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">已认证</span>
            </div>
            <div v-if="profile.bio" class="text-sm text-[#999] mt-1">{{ profile.bio }}</div>
            <div class="text-xs text-[#777] mt-1.5">
              🫘 {{ profile.beans }} 百斩豆 · 加入于 {{ formatDate(profile.createdAt) }}
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button v-if="isSelf" class="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#555] text-[#aaa] text-sm hover:bg-[#2a2a2a] transition-colors" @click="handleEditProfile">
              <Edit3 class="w-3.5 h-3.5" /> 编辑资料
            </button>
            <template v-else-if="isFriend">
              <span class="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#555] text-[#777] text-sm cursor-default">
                <UserCheck class="w-3.5 h-3.5" /> 已添加
              </span>
              <button class="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#4a9eff] text-[#4a9eff] text-sm hover:bg-[#4a9eff]/10 transition-colors" @click="handleGoChat">
                <MessageCircle class="w-3.5 h-3.5" /> 去聊天
              </button>
            </template>
            <template v-else>
              <button class="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#e74c3c] text-[#e74c3c] text-sm hover:bg-[#e74c3c]/10 transition-colors" @click="showFriendDialog = true">
                <UserPlus class="w-3.5 h-3.5" /> 加好友
              </button>
            </template>
          </div>
        </div>
      </div>

      <!-- Stats: 4 columns -->
      <div v-if="stats" class="grid grid-cols-4 gap-3 px-6 py-4 border-b border-[#333]">
        <div class="text-center">
          <div class="text-lg font-bold text-[#4a9eff]">{{ stats.postCount }}</div>
          <div class="text-xs text-[#777]">帖子</div>
        </div>
        <div class="text-center">
          <div class="text-lg font-bold text-[#4a9eff]">{{ stats.commentCount }}</div>
          <div class="text-xs text-[#777]">回复</div>
        </div>
        <div class="text-center">
          <div class="text-lg font-bold text-[#4a9eff]">{{ stats.likeReceivedCount }}</div>
          <div class="text-xs text-[#777]">获赞</div>
        </div>
        <div class="text-center">
          <div class="text-lg font-bold text-[#f0c040]">{{ stats.adoptedCount }}</div>
          <div class="text-xs text-[#777]">采纳</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex items-center border-b border-[#333] px-6">
        <button
          v-for="tab in visibleTabs"
          :key="tab.key"
          class="flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors group relative"
          :class="activeTab === tab.key ? 'text-[#4a9eff] border-[#4a9eff]' : 'text-[#888] border-transparent hover:text-[#aaa]'"
          :title="isSelf ? '查看全部' : ''"
          @click="activeTab === tab.key && isSelf ? handleTabTitleClick() : (activeTab = tab.key)"
        >
          <component :is="tab.icon" class="w-3.5 h-3.5" />
          {{ tab.label }}
          <span v-if="isSelf" class="ml-1 text-xs text-[#4a9eff] opacity-0 group-hover:opacity-100 transition-opacity">查看全部</span>
          <button
            v-if="isSelf"
            class="ml-1 p-0.5 rounded hover:bg-[#333] transition-colors"
            @click.stop="togglePrivacy(tab.showKey)"
            :title="privacy[tab.showKey] !== false ? '他人可见' : '已隐藏'"
          >
            <Eye v-if="privacy[tab.showKey] !== false" class="w-3 h-3 text-[#4a9eff]" />
            <EyeOff v-else class="w-3 h-3 text-[#777]" />
          </button>
        </button>
        <div class="flex-1"></div>
        <div v-if="showSort" class="flex gap-1 pr-2">
          <button
            class="px-2 py-1 text-xs rounded"
            :class="sortMode === 'latest' ? 'bg-[#4a9eff]/20 text-[#4a9eff]' : 'text-[#888] hover:text-[#aaa]'"
            @click="sortMode = 'latest'"
          >最新</button>
          <button
            class="px-2 py-1 text-xs rounded"
            :class="sortMode === 'hot' ? 'bg-[#4a9eff]/20 text-[#4a9eff]' : 'text-[#888] hover:text-[#aaa]'"
            @click="sortMode = 'hot'"
          >最热</button>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="px-6 py-4">
        <!-- Posts -->
        <div v-if="activeTab === 'posts'">
          <div v-if="displayPosts.length === 0" class="text-sm text-[#777] text-center py-8">暂无帖子</div>
          <div
            v-for="post in displayPosts"
            :key="post.id"
            class="py-3 border-b border-[#333] last:border-0 cursor-pointer hover:bg-[#2a2a2a] transition-colors rounded px-2 -mx-2"
            @click="openPost(post.id)"
          >
            <div class="text-sm font-medium text-[#ccc]">{{ post.title }}</div>
            <div class="flex items-center gap-3 mt-1 text-xs text-[#777]">
              <span>{{ formatTimeAgo(post.createdAt) }}</span>
              <span v-if="post.likeCount" class="flex items-center gap-1"><Heart class="w-3 h-3" />{{ post.likeCount }}</span>
              <span v-if="post.commentCount" class="flex items-center gap-1"><MessageSquare class="w-3 h-3" />{{ post.commentCount }}</span>
            </div>
          </div>
        </div>

        <!-- Comments -->
        <div v-if="activeTab === 'comments'">
          <div v-if="displayComments.length === 0" class="text-sm text-[#777] text-center py-8">暂无回复</div>
          <div
            v-for="c in displayComments"
            :key="c.id"
            class="py-3 border-b border-[#333] last:border-0"
          >
            <div class="text-sm text-[#bbb] line-clamp-2">{{ c.content }}</div>
            <div class="flex items-center gap-3 mt-1 text-xs text-[#777]">
              <span>{{ formatTimeAgo(c.createdAt) }}</span>
              <span v-if="c.likeCount" class="flex items-center gap-1"><Heart class="w-3 h-3" />{{ c.likeCount }}</span>
              <a v-if="c.postTitle" class="text-[#4a9eff] hover:underline cursor-pointer truncate max-w-[200px]" @click.stop="c.targetId && openPost(c.targetId)">
                @{{ c.postTitle }}
              </a>
            </div>
          </div>
        </div>

        <!-- Likes -->
        <div v-if="activeTab === 'likes'">
          <div v-if="displayLikes.length === 0" class="text-sm text-[#777] text-center py-8">暂无点赞</div>
          <div
            v-for="item in displayLikes"
            :key="`${item.targetId}-${item.targetType}`"
            class="py-3 border-b border-[#333] last:border-0 cursor-pointer hover:bg-[#2a2a2a] transition-colors rounded px-2 -mx-2"
            @click="item.targetType === 'post' && openLikedPost(item.targetId, item.targetType)"
          >
            <div class="flex items-center gap-2">
              <span class="text-xs px-1.5 py-0.5 rounded" :class="item.targetType === 'post' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'">
                {{ item.targetType === 'post' ? '帖子' : '回复' }}
              </span>
              <span class="text-sm text-[#bbb] line-clamp-1">{{ item.targetText || '(内容已删除)' }}</span>
            </div>
            <div class="text-xs text-[#777] mt-1">{{ formatTimeAgo(item.likeTime) }}</div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="flex items-center justify-center h-full text-sm text-[#888]">
      用户不存在
    </div>

    <!-- Friend Request Dialog -->
    <Teleport to="body">
      <div v-if="showFriendDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" @click.self="showFriendDialog = false">
        <div class="bg-[#1e1e1e] border border-[#333] rounded-lg p-6 w-[400px]">
          <h3 class="text-lg font-semibold text-[#ccc] mb-4">发送好友申请</h3>
          <p class="text-sm text-[#888] mb-3">
            向 <span class="text-[#4a9eff]">{{ profile?.nickname }}</span> 发送好友申请
          </p>
          <textarea v-model="friendMessage" class="w-full bg-[#2d2d2d] border border-[#444] rounded px-3 py-2 text-sm text-[#ccc] outline-none focus:border-[#4a9eff] resize-none" rows="3" placeholder="你好，我想加你为好友..."></textarea>
          <div class="flex gap-3 justify-end mt-4">
            <button class="px-4 py-2 border border-[#555] text-[#aaa] rounded-md text-sm hover:bg-[#2a2a2a]" @click="showFriendDialog = false">取消</button>
            <button class="px-4 py-2 bg-[#4a9eff] text-white rounded-md text-sm hover:bg-[#3a8eef] disabled:opacity-50" :disabled="!friendMessage.trim() || sendingRequest" @click="handleSendFriendRequest">
              {{ sendingRequest ? '发送中...' : '发送申请' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
