<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, watch } from 'vue'
import { Heart, Edit3, Trash2, Coffee, Pin, Lock, CheckCircle2, Bean } from 'lucide-vue-next'
import { usePostStore } from '@/stores/post'
import { useAuthStore } from '@/stores/auth'
import { useEditorStore } from '@/stores/editor'
import { useWorkspaceStore } from '@/stores/workspace'
import * as postApi from '@/api/post'
import type { ResumePostDetail, PostDetail, PostListVO } from '@/api/post'
import { avatarUrl, avatarColor } from '@/utils/format'
import { useRequireAuth } from '@/composables/useRequireAuth'
import CommentSection from './CommentSection.vue'
import PostEditor from './PostEditor.vue'
import UserHoverCard from '@/components/Profile/UserHoverCard.vue'
import UserProfilePage from '@/components/Profile/UserProfilePage.vue'

const props = defineProps<{
  postId: string
  postType: 'resume' | 'regular' | 'qa' | 'referral'
}>()

const postStore = usePostStore()
const authStore = useAuthStore()
const editorStore = useEditorStore()
const workspaceStore = useWorkspaceStore()
const commentSectionRef = ref<InstanceType<typeof CommentSection> | null>(null)

const now = ref(Date.now())
let timeTimer: ReturnType<typeof setInterval> | null = null

const showPinDialog = ref(false)
const pinHours = ref(1)
const pinPresets = [1, 6, 12, 24, 72, 168]
const pinPresetLabels = ['1h', '6h', '12h', '1天', '3天', '7天']

// Hover card state
const hoverUserId = ref<string | null>(null)
const hoverAnchorEl = ref<HTMLElement | null>(null)
const showHoverCard = ref(false)
let hoverTimer: ReturnType<typeof setTimeout> | null = null
let hoverCloseTimer: ReturnType<typeof setTimeout> | null = null

function onAuthorMouseEnter(e: MouseEvent, userId: string) {
  if (hoverTimer) clearTimeout(hoverTimer)
  if (hoverCloseTimer) clearTimeout(hoverCloseTimer)
  hoverUserId.value = userId
  hoverAnchorEl.value = e.currentTarget as HTMLElement
  hoverTimer = setTimeout(() => { showHoverCard.value = true }, 300)
}

function onAuthorMouseLeave() {
  if (hoverTimer) clearTimeout(hoverTimer)
  hoverCloseTimer = setTimeout(() => {
    showHoverCard.value = false
    hoverUserId.value = null
    hoverAnchorEl.value = null
  }, 750)
}

function onHoverCardMouseEnter() {
  if (hoverCloseTimer) clearTimeout(hoverCloseTimer)
}

function onHoverCardMouseLeave() {
  showHoverCard.value = false
  hoverUserId.value = null
  hoverAnchorEl.value = null
}

function onAuthorClick(userId: string) {
  showHoverCard.value = false
  if (hoverTimer) clearTimeout(hoverTimer)
  if (hoverCloseTimer) clearTimeout(hoverCloseTimer)
  editorStore.openComponentTab(
    `profile:${userId}`,
    '用户主页',
    UserProfilePage,
    { userId }
  )
}

function onPostContentClick() {
  commentSectionRef.value?.cancelReply()
}

const detail = computed(() => postStore.currentDetail)

// Type-narrowed helpers — eliminate inline `as` casts in template
const resumeData = computed<ResumePostDetail | null>(() =>
  props.postType === 'resume' ? (detail.value as ResumePostDetail | null) : null
)
const postData = computed<PostDetail | null>(() =>
  props.postType === 'regular' ? (detail.value as PostDetail | null) : null
)
const postListItem = computed<PostListVO | null>(() =>
  postStore.postList.find(p => p.id === props.postId) ?? null
)

const authorName = computed(() => resumeData.value?.authorName ?? postData.value?.authorName ?? postListItem.value?.authorName ?? '')
const authorAvatar = computed(() => resumeData.value?.authorAvatar ?? postData.value?.authorAvatar ?? postListItem.value?.authorAvatar ?? '')
const authorAvatarUrl = computed(() => resumeData.value?.authorAvatarUrl ?? postData.value?.authorAvatarUrl ?? postListItem.value?.authorAvatarUrl ?? null)
const titleOrName = computed(() => resumeData.value?.resumeName ?? postData.value?.title ?? '')
const bodyContent = computed(() => resumeData.value?.content ?? postData.value?.content ?? '')
const detailCreatedAt = computed(() => resumeData.value?.createdAt ?? postData.value?.createdAt ?? '')
const detailUserId = computed(() => resumeData.value?.userId ?? postData.value?.userId ?? '')
const detailLikeCount = computed(() => postData.value?.likeCount ?? 0)

const isLiked = computed(() => postStore.likedIds.has(props.postId))
const isOwner = computed(() => {
  const uid = detailUserId.value
  if (!uid || !authStore.user?.id) return false
  return uid === authStore.user.id
})

const isQaPost = computed(() => (detail.value as any)?.postType === 'qa')
const isReferralPost = computed(() => (postData.value as any)?.postType === 'referral' || postListItem.value?.postType === 'referral')
const referralCode = computed(() => (postData.value as any)?.referralCode || postListItem.value?.referralCode || '')
const referralLink = computed(() => (postData.value as any)?.referralLink || postListItem.value?.referralLink || '')
const bountyBeansTotal = computed(() => (detail.value as any)?.bountyBeans ?? 0)
const bountyRemaining = computed(() => (detail.value as any)?.bountyRemaining ?? 0)
const bountyStatus = computed(() => (detail.value as any)?.bountyStatus ?? '')
const bountyExpiresAt = computed(() => (detail.value as any)?.bountyExpiresAt ?? '')

const bountyTimeLeft = computed(() => {
  if (!bountyExpiresAt.value || bountyStatus.value !== 'active') return ''
  const remaining = new Date(bountyExpiresAt.value).getTime() - now.value
  if (remaining <= 0) return '已过期'
  const totalSec = Math.floor(remaining / 1000)
  const totalMin = Math.floor(totalSec / 60)
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const mins = totalMin % 60
  const secs = totalSec % 60
  if (days > 0) return `${days}天${hours}小时`
  if (hours > 0) return `${hours}小时${mins}分钟`
  if (mins > 0) return `${mins}分钟`
  return `${secs}秒`
})

function handleEdit() {
  const label = props.postType === 'resume' ? '编辑简历' : '编辑帖子'
  const isRef = isReferralPost.value
  if ((props.postType === 'regular' || props.postType === 'referral') && postData.value) {
    editorStore.openComponentTab(`post:editor:${props.postId}`, label, PostEditor, {
      postType: isRef ? 'referral' : 'regular',
      editPostId: props.postId,
      editTitle: postData.value.title || '',
      editContent: postData.value.content || '',
      editReferralCode: isRef ? (referralCode.value || '') : undefined,
      editReferralLink: isRef ? (referralLink.value || '') : undefined
    })
  } else if (props.postType === 'resume' && resumeData.value) {
    editorStore.openComponentTab(`post:editor:${props.postId}`, label, PostEditor, {
      postType: 'resume',
      editPostId: props.postId,
      editResumeName: resumeData.value.resumeName || '',
      editPromoText: resumeData.value.promoText || '',
      editPrice: resumeData.value.price || 50,
      editResumeId: resumeData.value.resumeId || ''
    })
  }
}

const purchasing = ref(false)
const purchaseError = ref('')
const avatarImgError = ref(false)
watch([() => props.postId, authorAvatarUrl], () => { avatarImgError.value = false })

// Tip dialog state
const showTipDialog = ref(false)
const tipAmount = ref(10)
const tipPresets = [5, 10, 20, 50]
const tipCustomInput = ref('')
const showTipConfirm = ref(false)
const tipping = ref(false)
const tipError = ref('')

const maxTipBeans = computed(() => authStore.user?.beans ?? 0)

function openTipDialog() {
  tipAmount.value = Math.min(10, maxTipBeans.value)
  tipCustomInput.value = ''
  showTipConfirm.value = false
  tipError.value = ''
  showTipDialog.value = true
}

function selectTipPreset(amount: number) {
  tipAmount.value = amount
  tipCustomInput.value = ''
}

function applyCustomTip() {
  const val = parseFloat(tipCustomInput.value as any)
  if (!isNaN(val) && val >= 1) {
    if (!Number.isInteger(val)) {
      tipError.value = '豆子数必须为整数'
      return
    }
    tipError.value = ''
    tipAmount.value = Math.min(Math.floor(val), maxTipBeans.value)
  }
}

function goToTipConfirm() {
  if (tipAmount.value < 1) {
    tipError.value = '打赏豆子数至少为1'
    return
  }
  if (tipAmount.value > maxTipBeans.value) {
    tipError.value = '豆子不足'
    return
  }
  tipError.value = ''
  showTipConfirm.value = true
}

async function handleTipConfirm() {
  tipping.value = true
  tipError.value = ''
  try {
    const beans = tipAmount.value
    let res
    if (props.postType === 'resume') {
      res = await postApi.tipResumePost(props.postId, beans)
    } else {
      res = await postApi.tipPost(props.postId, beans)
    }
    if (res.code === 200 && res.data) {
      if (authStore.user) {
        authStore.user.beans = res.data.balance
      }
      showTipDialog.value = false
      showTipConfirm.value = false
      alert(`打赏成功！消耗 🫘 ${beans} 百斩豆`)
    } else {
      tipError.value = res.message || '打赏失败'
      showTipConfirm.value = false
    }
  } catch (e: any) {
    tipError.value = e.message || '打赏失败'
    showTipConfirm.value = false
  } finally {
    tipping.value = false
  }
}

function handleTipClick() {
  if (!useRequireAuth()) return
  if (isOwner.value) {
    alert('不能打赏自己的帖子')
    return
  }
  openTipDialog()
}

async function handlePurchase() {
  const price = resumeData.value?.price ?? 50
  if (!confirm(`支付 🫘 ${price} 豆查看完整简历？`)) return
  purchasing.value = true
  purchaseError.value = ''
  try {
    await postStore.purchaseResumePost(props.postId)
  } catch (e: any) {
    purchaseError.value = e.message || '购买失败'
  } finally {
    purchasing.value = false
  }
}

async function handleResumeLike() {
  if (!useRequireAuth()) return
  await postStore.toggleLike(props.postId, 'resume')
}

async function handleDelete() {
  const isQa = isQaPost.value
  const message = props.postType === 'resume'
    ? '确定要删除这份简历吗？'
    : isQa
      ? '确定要删除这篇求助帖吗？求助豆子不会返还。'
      : '确定要删除这篇帖子吗？'
  if (!confirm(message)) return
  try {
    if (props.postType === 'resume') {
      await postApi.deleteResumePost(props.postId)
      // 刷新当前分栏的列表
      const sub = postStore.resumeSubTab
      if (sub === 'purchased') postStore.fetchPurchasedResumePosts()
      else if (sub === 'mine') postStore.fetchMyResumePosts()
      else postStore.fetchResumePostList(1)
    } else {
      const resp = await postApi.deletePost(props.postId)
      const refund = (resp.code === 200 && resp.data?.refund) ? resp.data.refund : 0
      if (isQa) {
        if (refund > 0) {
          alert(`求助帖已删除，返还 🫘 ${refund} 百斩豆（置顶退款），求助豆子不返还`)
        } else {
          alert('求助帖已删除，求助豆子不返还')
        }
        postStore.fetchQaPosts(1)
      } else {
        if (refund > 0) {
          alert(`帖子已删除，返还 🫘 ${refund} 百斩豆`)
        }
        postStore.fetchPostList(1)
      }
    }
    // Navigate back to post browser
    workspaceStore.setActivePanel('postBrowser')
    // Close this tab
    const tabId = `post:${props.postType}:${props.postId}`
    editorStore.closeTab(tabId)
  } catch {
    // silently fail
  }
}

function handleLike() {
  if (!useRequireAuth()) return
  postStore.toggleLike(props.postId, props.postType)
}

const isPostPinned = computed(() => {
  const listItem = postListItem.value
  return listItem?.isPinned ?? false
})

const pinRemainingHours = computed(() => {
  const li = postListItem.value
  if (!li?.pinExpiresAt) return 0
  return Math.max(0, (new Date(li.pinExpiresAt).getTime() - Date.now()) / 3600000)
})

const maxRenewHours = computed(() => {
  const globalMax = Math.max(0, 168 - Math.ceil(pinRemainingHours.value))
  // 问答帖：置顶时长不能超过求助剩余时间
  if (isQaPost.value && bountyExpiresAt.value) {
    const bountyRemainingMs = new Date(bountyExpiresAt.value).getTime() - Date.now()
    const bountyRemainingHours = Math.max(0, Math.floor(bountyRemainingMs / 3600000))
    return Math.min(globalMax, bountyRemainingHours)
  }
  return globalMax
})

function computeRemainingDetail(expiresAt: string | null): string {
  if (!expiresAt) return ''
  const remaining = new Date(expiresAt).getTime() - now.value
  if (remaining <= 0) return '已过期'
  const totalSec = Math.floor(remaining / 1000)
  const totalMin = Math.floor(totalSec / 60)
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const mins = totalMin % 60
  const secs = totalSec % 60
  if (days > 0) return `${days}天 ${hours}小时 ${mins}分钟`
  if (hours > 0) return `${hours}小时 ${mins}分钟`
  if (mins > 0) return `${mins}分钟`
  return `${secs}秒`
}

async function handlePin() {
  try {
    const resp = await postApi.pinPost(props.postId, pinHours.value)
    if (resp.code === 200) {
      showPinDialog.value = false
      alert(`置顶成功！消耗 🫘 ${resp.data!.beansSpent} 百斩豆`)
      await postStore.fetchPostList(1, postStore.keyword || undefined, postStore.sort)
      await postStore.selectPost(props.postId, props.postType)
    } else {
      alert(resp.message || '置顶失败')
    }
  } catch {
    // ignore
  }
}

async function handleUnpin() {
  if (!confirm('取消置顶将返还 80% 百斩豆，确认取消？')) return
  try {
    const resp = await postApi.unpinPost(props.postId)
    if (resp.code === 200) {
      alert(`已取消置顶，返还 🫘 ${resp.data!.refund} 百斩豆`)
      await postStore.fetchPostList(1, postStore.keyword || undefined, postStore.sort)
      await postStore.selectPost(props.postId, props.postType)
    } else {
      alert(resp.message || '取消失败')
    }
  } catch {
    // ignore
  }
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

onMounted(async () => {
  postStore.selectPost(props.postId, props.postType)
  document.addEventListener('visibilitychange', onVisibilityChange)
  timeTimer = setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
  if (timeTimer) { clearInterval(timeTimer); timeTimer = null }
})

function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    postStore.selectPost(props.postId, props.postType)
  }
}
</script>

<template>
  <div v-if="detail" class="h-full flex flex-col text-vscode-text">
    <!-- Post content: scrollable, takes up to half the height -->
    <div class="overflow-y-auto flex-shrink-0" style="max-height: 45%">
    <!-- Resume detail -->
    <template v-if="postType === 'resume' && resumeData">
      <div class="flex items-center gap-3 mb-5">
        <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
              :style="{ backgroundColor: avatarColor(detailUserId) }"
	          @mouseenter="!resumeData?.isAnonymous && onAuthorMouseEnter($event, detailUserId)"
	          @mouseleave="onAuthorMouseLeave"
	          @click="!resumeData?.isAnonymous && onAuthorClick(detailUserId)">
          <img v-if="authorAvatarUrl && !avatarImgError" :src="avatarUrl(authorAvatarUrl)" class="w-full h-full object-cover" @error="avatarImgError = true" />
          <span v-else>{{ authorAvatar || authorName?.charAt(0) || '?' }}</span>
        </div>
        <div class="flex-1">
          <div class="text-lg font-semibold text-vscode-text flex items-center gap-2">
            {{ titleOrName }}
            <span v-if="resumeData?.deleted" class="text-xs text-danger bg-danger-subtle px-2 py-0.5 rounded font-normal">已删除</span>
          </div>
          <div class="text-xs text-vscode-text-secondary mt-0.5">
            <span
              v-if="!resumeData?.isAnonymous"
              class="cursor-pointer hover:text-primary transition-colors"
              @mouseenter="onAuthorMouseEnter($event, detailUserId)"
              @mouseleave="onAuthorMouseLeave"
              @click="onAuthorClick(detailUserId)"
            >{{ authorName }}</span>
            <span v-else>{{ authorName }}</span>
            · {{ formatTime(detailCreatedAt) }}
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-warning font-semibold text-sm">{{ resumeData.price  }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /></span>
          <template v-if="!resumeData.deleted">
            <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-warning text-warning text-sm hover:bg-cta/10 transition-colors" @click="handleTipClick">
              <Coffee class="w-3.5 h-3.5" /> 打赏
            </button>
            <button v-if="isOwner" class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-primary text-primary text-sm hover:bg-primary/10 transition-colors" @click="handleEdit">
              <Edit3 class="w-3.5 h-3.5" /> 编辑
            </button>
            <button v-if="isOwner" class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-danger text-danger text-sm hover:bg-danger/10 transition-colors" @click="handleDelete">
              <Trash2 class="w-3.5 h-3.5" /> 删除
            </button>
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-colors"
              :class="resumeData.isLiked ? 'bg-danger/20 border-danger text-danger' : 'bg-vscode-active border-vscode-border text-vscode-text-secondary hover:border-danger hover:text-danger'"
              @click="handleResumeLike"
            >
              <Heart class="w-4 h-4" :fill="resumeData.isLiked ? 'currentColor' : 'none'" />
              <span class="text-sm">{{ resumeData.likeCount || 0 }}</span>
            </button>
          </template>
        </div>
      </div>

      <div class="mb-4 p-3 bg-vscode-active rounded-md" @click="onPostContentClick">
        <p class="text-sm text-vscode-text whitespace-pre-wrap">{{ resumeData.promoText }}</p>
      </div>

      <div class="mb-4">
        <h3 class="text-sm text-vscode-text-secondary mb-2">
          {{ resumeData.hasPurchased || isOwner ? '简历内容' : '简历预览（前200字）' }}
        </h3>
        <div class="p-3 bg-vscode-active border border-vscode-border rounded-md">
          <pre class="text-sm text-vscode-text whitespace-pre-wrap font-sans">{{ resumeData.content }}</pre>
        </div>
        <div v-if="!resumeData.deleted && !resumeData.hasPurchased && !isOwner" class="mt-2 p-3 bg-cta-subtle border border-cta rounded-md text-center">
          <p class="text-sm text-warning mb-2"><Lock class="w-4 h-4 inline-block" style="color:var(--color-warning);" /> 支付 {{ resumeData.price  }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /> 豆查看完整简历</p>
          <p v-if="purchaseError" class="text-xs text-danger mb-2">{{ purchaseError }}</p>
          <button class="px-6 py-2 bg-cta text-white rounded-md text-sm font-medium hover:bg-cta-dark transition-colors disabled:opacity-50"
            :disabled="purchasing" @click="handlePurchase">
            {{ purchasing ? '处理中...' : '支付解锁' }}
          </button>
        </div>
        <div v-else-if="resumeData.hasPurchased && !isOwner" class="mt-2 text-xs text-success">
          <CheckCircle2 class="w-4 h-4 inline-block" style="color:var(--color-success);" /> 已购买，可查看完整内容
        </div>
      </div>
    </template>

    <!-- Regular post detail -->
    <template v-else>
      <!-- Bounty info card (QA posts only) -->
      <div v-if="isQaPost" class="mb-4 p-4 border rounded-md"
        :class="bountyStatus === 'active' ? 'border-primary/30 bg-primary/5' : 'border-vscode-border/30 bg-vscode-active'">
        <div class="flex items-center gap-3 text-sm flex-wrap">
          <span class="text-warning"><Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /> 求助 {{ bountyBeansTotal }} 豆子</span>
          <span v-if="bountyStatus === 'active'" class="text-primary">| 剩余 {{ bountyRemaining }}</span>
          <span v-if="bountyStatus === 'active' && bountyTimeLeft" class="text-vscode-text-secondary">| ⏱ 剩余 {{ bountyTimeLeft }}</span>
          <span v-else-if="bountyStatus === 'distributed'" class="text-success">| 已分配</span>
          <span v-else-if="bountyStatus === 'expired'" class="text-vscode-text-secondary">| 已结束</span>
        </div>
      </div>

      <!-- Referral info card (referral posts only) -->
      <div v-if="isReferralPost" class="mb-4 p-4 border border-primary/30 rounded-md bg-primary/5">
        <div class="flex flex-col gap-2 text-sm">
          <div class="flex items-center gap-2">
            <span class="text-vscode-text-secondary">内推码</span>
            <span class="text-primary font-medium">{{ referralCode }}</span>
          </div>
          <div v-if="referralLink" class="flex items-center gap-2">
            <span class="text-vscode-text-secondary">内推链接</span>
            <a
              :href="referralLink"
              target="_blank"
              class="text-primary hover:text-primary-light underline transition-colors break-all"
            >{{ referralLink }}</a>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3 mb-5">
        <div
          class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
          :style="{ backgroundColor: avatarColor(detailUserId) }"
          @mouseenter="!postListItem?.isAnonymous && onAuthorMouseEnter($event, detailUserId)"
          @mouseleave="onAuthorMouseLeave"
          @click="!postListItem?.isAnonymous && onAuthorClick(detailUserId)"
        >
          <img
            v-if="authorAvatarUrl && !avatarImgError"
            :src="avatarUrl(authorAvatarUrl)"
            class="w-full h-full object-cover"
            @error="avatarImgError = true" />
          <span v-else>{{ authorAvatar || '?' }}</span>
        </div>
        <div class="flex-1">
          <div class="text-lg font-semibold text-vscode-text">
            {{ titleOrName }}
          </div>
          <div class="text-xs text-vscode-text-secondary mt-0.5">
            <span
              v-if="!postListItem?.isAnonymous"
              class="cursor-pointer hover:text-primary transition-colors"
              @mouseenter="onAuthorMouseEnter($event, detailUserId)"
              @mouseleave="onAuthorMouseLeave"
              @click="onAuthorClick(detailUserId)"
            >{{ authorName }}</span>
            <span v-else>{{ authorName }}</span>
            <span v-if="detailCreatedAt" class="ml-2">{{ formatTime(detailCreatedAt) }}</span>
          </div>
          <div v-if="isPostPinned && postListItem?.pinExpiresAt" class="text-xs text-danger mt-0.5">
            <Pin class="w-3 h-3 inline-block" /> 置顶 · 剩余 {{ computeRemainingDetail(postListItem.pinExpiresAt) }}
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button v-if="isOwner" class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-primary text-primary text-sm hover:bg-primary/10 transition-colors" @click="handleEdit">
            <Edit3 class="w-3.5 h-3.5" /> 编辑
          </button>
          <button v-if="isOwner" class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-danger text-danger text-sm hover:bg-danger/10 transition-colors" @click="handleDelete">
            <Trash2 class="w-3.5 h-3.5" /> 删除
          </button>
          <button v-if="isOwner && (postType === 'regular' || postType === 'referral') && !isPostPinned" class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-danger text-danger text-sm hover:bg-danger/10 transition-colors" @click="showPinDialog = true">
            <Pin class="w-3 h-3 inline-block" /> 置顶
          </button>
          <button v-if="isOwner && (postType === 'regular' || postType === 'referral') && isPostPinned" class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-danger text-danger text-sm hover:bg-danger/10 transition-colors" @click="showPinDialog = true">
            <Pin class="w-3 h-3 inline-block" /> 续费置顶
          </button>
          <button v-if="isOwner && (postType === 'regular' || postType === 'referral') && isPostPinned" class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#888] text-vscode-text-secondary text-sm hover:bg-[#888]/10 transition-colors" @click="handleUnpin">
            取消置顶
          </button>
          <button
            class="flex items-center gap-1.5 px-4 py-2 rounded-md border transition-colors"
            :class="isLiked ? 'bg-danger/20 border-danger text-danger' : 'bg-vscode-active border-vscode-border text-vscode-text-secondary hover:border-danger hover:text-danger'"
            @click="handleLike"
          >
            <Heart class="w-4 h-4" :fill="isLiked ? 'currentColor' : 'none'" />
            <span class="text-sm">{{ detailLikeCount }}</span>
          </button>
        </div>
      </div>

      <div class="text-sm leading-relaxed whitespace-pre-wrap text-vscode-text-secondary" @click="onPostContentClick">
        {{ bodyContent }}
      </div>
    </template>

    </div>

    <!-- Comments (regular / QA posts only) -->
    <CommentSection v-if="!resumeData?.deleted" ref="commentSectionRef" :target-id="postId" target-type="post" :post-type="isQaPost ? 'qa' : (postType === 'resume' ? 'resume' : 'normal')" :bounty-remaining="bountyRemaining" :bounty-status="bountyStatus" :post-author-id="detailUserId" class="flex-1 min-h-0" />
    <div v-else class="flex-1 flex items-center justify-center text-sm text-vscode-text-secondary">帖子已删除，评论已关闭</div>
  </div>

  <div v-else-if="postStore.loadingDetail" class="h-full flex items-center justify-center">
    <div class="text-sm text-vscode-text-secondary">加载中...</div>
  </div>

  <div v-else class="h-full flex items-center justify-center">
    <div class="text-sm text-vscode-text-secondary">请选择一篇帖子查看详情</div>
  </div>

  <!-- 置顶弹窗 -->
  <div v-if="showPinDialog" class="fixed inset-0 z-50 flex items-center justify-center " @click.self="showPinDialog = false">
    <div class="bg-vscode-bg border border-vscode-border rounded-lg p-6 w-[400px]">
      <h3 class="text-lg font-semibold text-vscode-text mb-4">{{ isPostPinned ? '续费置顶' : '帖子置顶' }}</h3>

      <div v-if="isPostPinned && postListItem?.pinExpiresAt" class="text-xs text-vscode-text-secondary mb-3">
        当前剩余：{{ computeRemainingDetail(postListItem.pinExpiresAt) }}
        <span v-if="maxRenewHours <= 0 && isQaPost" class="text-danger">（已达到求助最大置顶时长）</span>
        <span v-else-if="maxRenewHours <= 0" class="text-danger">（已达到7天上限）</span>
        <span v-else class="text-vscode-text-secondary">（最多续费 {{ maxRenewHours }} 小时）</span>
      </div>

      <div v-if="maxRenewHours > 0" class="mb-3">
        <span class="text-sm text-vscode-text-secondary">选择时长：</span>
        <div class="flex flex-wrap gap-2 mt-2">
          <button
            v-for="(label, i) in pinPresetLabels"
            :key="i"
            class="px-3 py-1 text-xs rounded border transition-colors"
            :class="pinPresets[i] <= maxRenewHours ? (pinHours === pinPresets[i] ? 'bg-primary/20 border-primary text-primary' : 'border-vscode-border text-vscode-text-secondary hover:border-primary hover:text-primary') : 'border-vscode-border text-[#555] cursor-not-allowed'"
            @click="pinPresets[i] <= maxRenewHours && (pinHours = pinPresets[i])"
          >{{ label }}</button>
        </div>
      </div>

      <div v-if="maxRenewHours > 0" class="mb-4">
        <span class="text-sm text-vscode-text-secondary">自定义：</span>
        <input
          v-model.number="pinHours"
          type="number"
          min="1"
          :max="maxRenewHours"
          class="ml-2 w-24 bg-vscode-active border border-vscode-border rounded px-2 py-1 text-sm text-vscode-text outline-none focus:border-primary"
        /> 小时
      </div>

      <div v-if="maxRenewHours > 0" class="text-sm text-vscode-text-secondary mb-4">
        消耗：{{ Math.min(pinHours, maxRenewHours) * 10  }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /> 百斩豆
      </div>

      <div v-else-if="isQaPost" class="text-sm text-danger mb-4">
        已达到求助最大置顶时长，不可高于求助时长
      </div>
      <div v-else class="text-sm text-danger mb-4">
        已达到最大置顶时长（7天），无法续费
      </div>

      <div class="flex gap-3 justify-end">
        <button class="px-4 py-2 border border-vscode-border text-vscode-text-secondary rounded-md text-sm hover:bg-vscode-active" @click="showPinDialog = false">取消</button>
        <button v-if="maxRenewHours > 0" class="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-dark" @click="handlePin">确认{{ isPostPinned ? '续费' : '置顶' }}</button>
      </div>
    </div>
  </div>

  <!-- 打赏弹窗 -->
  <div v-if="showTipDialog" class="fixed inset-0 z-50 flex items-center justify-center " @click.self="showTipDialog = false">
    <div class="bg-vscode-bg border border-vscode-border rounded-lg p-6 w-[400px]">
      <template v-if="!showTipConfirm">
        <h3 class="text-lg font-semibold text-vscode-text mb-4"><Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /> 打赏帖子</h3>
        <div class="text-sm text-vscode-text-secondary mb-4">选择打赏金额，豆子将直接转给帖主</div>
        <div class="text-xs text-vscode-text-secondary mb-3">你的余额：{{ maxTipBeans  }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /></div>

        <!-- Presets -->
        <div class="flex flex-wrap gap-2 mb-4">
          <button
            v-for="preset in tipPresets"
            :key="preset"
            class="px-4 py-2 text-sm rounded-md border transition-colors"
            :class="preset <= maxTipBeans ? (tipAmount === preset && !tipCustomInput ? 'bg-cta/20 border-warning text-warning' : 'border-vscode-border text-vscode-text-secondary hover:border-warning hover:text-warning') : 'border-vscode-border text-[#555] cursor-not-allowed'"
            @click="preset <= maxTipBeans && selectTipPreset(preset)"
          >{{ preset  }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /></button>
        </div>

        <!-- Custom input -->
        <div class="mb-4">
          <label class="text-sm text-vscode-text-secondary block mb-1.5">自定义金额</label>
          <input
            v-model.number="tipCustomInput"
            type="number"
            min="1"
            :max="maxTipBeans"
            step="1"
            placeholder="输入豆子数"
            class="w-full bg-vscode-active border border-vscode-border rounded-md px-3 py-2 text-sm text-vscode-text outline-none focus:border-warning placeholder:text-vscode-text-secondary"
            :class="[tipCustomInput && !Number.isInteger(tipCustomInput) ? '!border-danger' : '']"
            @input="applyCustomTip"
          />
        </div>

        <p v-if="tipError" class="text-xs text-danger mb-3">{{ tipError }}</p>

        <div class="flex gap-3 justify-end">
          <button class="px-4 py-2 border border-vscode-border text-vscode-text-secondary rounded-md text-sm hover:bg-vscode-active" @click="showTipDialog = false">取消</button>
          <button class="px-4 py-2 bg-cta text-white rounded-md text-sm font-medium hover:bg-cta-dark disabled:opacity-50" :disabled="tipAmount < 1" @click="goToTipConfirm">
            确认打赏 {{ tipAmount  }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" />
          </button>
        </div>
      </template>

      <!-- Confirm step -->
      <template v-else>
        <h3 class="text-lg font-semibold text-vscode-text mb-4">确认支付</h3>
        <div class="text-sm text-vscode-text-secondary mb-2">是否支付 {{ tipAmount  }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /> 百斩豆？</div>
        <div class="text-xs text-vscode-text-secondary mb-4">打赏给帖主，豆子将从你的账户扣除</div>
        <p v-if="tipError" class="text-xs text-danger mb-3">{{ tipError }}</p>
        <div class="flex gap-3 justify-end">
          <button class="px-4 py-2 border border-vscode-border text-vscode-text-secondary rounded-md text-sm hover:bg-vscode-active" @click="showTipConfirm = false">取消</button>
          <button class="px-4 py-2 bg-cta text-white rounded-md text-sm font-medium hover:bg-cta-dark disabled:opacity-50" :disabled="tipping" @click="handleTipConfirm">
            {{ tipping ? '处理中...' : '确认支付' }}
          </button>
        </div>
      </template>
    </div>
  </div>

  <UserHoverCard
    v-if="hoverUserId"
    :user-id="hoverUserId"
    :show="showHoverCard"
    :anchor-el="hoverAnchorEl"
    @close="showHoverCard = false; hoverUserId = null; hoverAnchorEl = null"
    @mouseenter="onHoverCardMouseEnter"
    @mouseleave="onHoverCardMouseLeave"
  />
</template>
