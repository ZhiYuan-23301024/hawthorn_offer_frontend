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
    workspaceStore.setActivePanel('postBrowser')
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
  <div v-if="detail" class="post-detail h-full flex flex-col">
    <!-- Post content: scrollable, fixed proportion -->
    <div class="post-content-area overflow-y-auto flex-shrink-0 animate-fade-in-up" style="max-height: 45%">
    <!-- Resume detail -->
    <template v-if="postType === 'resume' && resumeData">
      <!-- Author header -->
      <div class="author-header">
        <div class="author-avatar"
              :style="{ backgroundColor: avatarColor(detailUserId) }"
              @mouseenter="!resumeData?.isAnonymous && onAuthorMouseEnter($event, detailUserId)"
              @mouseleave="onAuthorMouseLeave"
              @click="!resumeData?.isAnonymous && onAuthorClick(detailUserId)">
          <img v-if="authorAvatarUrl && !avatarImgError" :src="avatarUrl(authorAvatarUrl)" class="w-full h-full object-cover" @error="avatarImgError = true" />
          <span v-else class="avatar-fallback">{{ authorAvatar || authorName?.charAt(0) || '?' }}</span>
        </div>
        <div class="author-info">
          <div class="author-title-row">
            <span class="post-title">{{ titleOrName }}</span>
            <span v-if="resumeData?.deleted" class="badge-deleted">已删除</span>
          </div>
          <div class="author-meta">
            <span
              v-if="!resumeData?.isAnonymous"
              class="author-name"
              @mouseenter="onAuthorMouseEnter($event, detailUserId)"
              @mouseleave="onAuthorMouseLeave"
              @click="onAuthorClick(detailUserId)"
            >{{ authorName }}</span>
            <span v-else class="author-name">{{ authorName }}</span>
            <span class="meta-sep">·</span>
            <span>{{ formatTime(detailCreatedAt) }}</span>
          </div>
        </div>
        <div class="author-actions">
          <span class="price-tag">{{ resumeData.price }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /></span>
          <template v-if="!resumeData.deleted">
            <button class="btn-action btn-tip" @click="handleTipClick">
              <Coffee class="w-4 h-4" /> 打赏
            </button>
            <button v-if="isOwner" class="btn-action btn-edit" @click="handleEdit">
              <Edit3 class="w-4 h-4" /> 编辑
            </button>
            <button v-if="isOwner" class="btn-action btn-delete" @click="handleDelete">
              <Trash2 class="w-4 h-4" /> 删除
            </button>
            <button
              class="btn-action btn-like"
              :class="resumeData.isLiked ? 'is-liked' : ''"
              @click="handleResumeLike"
            >
              <Heart class="w-4 h-4" :fill="resumeData.isLiked ? 'currentColor' : 'none'" />
              <span>{{ resumeData.likeCount || 0 }}</span>
            </button>
          </template>
        </div>
      </div>

      <!-- Promo text -->
      <div class="promo-card" @click="onPostContentClick">
        <p class="promo-text">{{ resumeData.promoText }}</p>
      </div>

      <!-- Resume content -->
      <div class="resume-section">
        <h3 class="section-label">
          {{ resumeData.hasPurchased || isOwner ? '简历内容' : '简历预览（前200字）' }}
        </h3>
        <div class="resume-content-card">
          <pre class="resume-content">{{ resumeData.content }}</pre>
        </div>
        <div v-if="!resumeData.deleted && !resumeData.hasPurchased && !isOwner" class="purchase-cta">
          <p class="purchase-msg"><Lock class="w-4 h-4 inline-block" /> 支付 {{ resumeData.price }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /> 豆查看完整简历</p>
          <p v-if="purchaseError" class="purchase-error">{{ purchaseError }}</p>
          <button class="btn-purchase" :disabled="purchasing" @click="handlePurchase">
            {{ purchasing ? '处理中...' : '支付解锁' }}
          </button>
        </div>
        <div v-else-if="resumeData.hasPurchased && !isOwner" class="purchased-badge">
          <CheckCircle2 class="w-4 h-4 inline-block" /> 已购买，可查看完整内容
        </div>
      </div>
    </template>

    <!-- Regular / QA / Referral post detail -->
    <template v-else>
      <!-- Bounty info card (QA posts only) -->
      <div v-if="isQaPost" class="info-card qa-card" :class="bountyStatus === 'active' ? 'qa-active' : 'qa-ended'">
        <div class="qa-stats">
          <span class="qa-beans"><Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /> 求助 {{ bountyBeansTotal }} 豆子</span>
          <span v-if="bountyStatus === 'active'" class="qa-remaining">剩余 {{ bountyRemaining }}</span>
          <span v-if="bountyStatus === 'active' && bountyTimeLeft" class="qa-time">⏱ {{ bountyTimeLeft }}</span>
          <span v-else-if="bountyStatus === 'distributed'" class="qa-distributed">已分配</span>
          <span v-else-if="bountyStatus === 'expired'" class="qa-expired">已结束</span>
        </div>
      </div>

      <!-- Referral info card (referral posts only) -->
      <div v-if="isReferralPost" class="info-card referral-card">
        <div class="referral-row">
          <span class="referral-label">内推码</span>
          <span class="referral-value">{{ referralCode }}</span>
        </div>
        <div v-if="referralLink" class="referral-row">
          <span class="referral-label">内推链接</span>
          <a :href="referralLink" target="_blank" class="referral-link">{{ referralLink }}</a>
        </div>
      </div>

      <!-- Author header -->
      <div class="author-header">
        <div
          class="author-avatar"
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
          <span v-else class="avatar-fallback">{{ authorAvatar || '?' }}</span>
        </div>
        <div class="author-info">
          <div class="author-title-row">
            <span class="post-title">{{ titleOrName }}</span>
          </div>
          <div class="author-meta">
            <span
              v-if="!postListItem?.isAnonymous"
              class="author-name"
              @mouseenter="onAuthorMouseEnter($event, detailUserId)"
              @mouseleave="onAuthorMouseLeave"
              @click="onAuthorClick(detailUserId)"
            >{{ authorName }}</span>
            <span v-else class="author-name">{{ authorName }}</span>
            <span v-if="detailCreatedAt" class="meta-sep">·</span>
            <span v-if="detailCreatedAt">{{ formatTime(detailCreatedAt) }}</span>
          </div>
        </div>
        <div class="author-actions">
          <!-- Owner-only: management buttons -->
          <template v-if="isOwner">
            <button class="btn-action btn-edit" @click="handleEdit">
              <Edit3 class="w-4 h-4" /> 编辑
            </button>
            <button class="btn-action btn-delete" @click="handleDelete">
              <Trash2 class="w-4 h-4" /> 删除
            </button>
            <template v-if="postType === 'regular' || postType === 'referral'">
              <button v-if="!isPostPinned" class="btn-action btn-pin" @click="showPinDialog = true">
                <Pin class="w-3.5 h-3.5 inline-block" /> 置顶
              </button>
              <template v-else>
                <button class="btn-action btn-pin" @click="showPinDialog = true">
                  <Pin class="w-3.5 h-3.5 inline-block" /> 续费
                </button>
                <button class="btn-action btn-unpin" @click="handleUnpin">
                  取消置顶
                </button>
              </template>
            </template>
          </template>
          <!-- Tip button (non-owner) -->
          <button v-if="!isOwner" class="btn-action btn-tip" @click="handleTipClick">
            <Coffee class="w-4 h-4" /> 打赏
          </button>
          <!-- Like button -->
          <button
            class="btn-action btn-like"
            :class="isLiked ? 'is-liked' : ''"
            @click="handleLike"
          >
            <Heart class="w-4 h-4" :fill="isLiked ? 'currentColor' : 'none'" />
            <span>{{ detailLikeCount }}</span>
          </button>
        </div>
      </div>

      <!-- Post body -->
      <div class="post-body" @click="onPostContentClick">
        {{ bodyContent }}
      </div>
    </template>

    </div>

    <!-- Divider -->
    <div class="content-divider"></div>

    <!-- Comments section -->
    <CommentSection v-if="!resumeData?.deleted" ref="commentSectionRef" :target-id="postId" target-type="post" :post-type="isQaPost ? 'qa' : (postType === 'resume' ? 'resume' : 'normal')" :bounty-remaining="bountyRemaining" :bounty-status="bountyStatus" :post-author-id="detailUserId" class="flex-1 min-h-0" />
    <div v-else class="flex-1 flex items-center justify-center text-sm" style="color: var(--color-text-secondary);">帖子已删除，评论已关闭</div>
  </div>

  <!-- Empty states -->
  <div v-else-if="postStore.loadingDetail" class="h-full flex items-center justify-center">
    <div class="text-sm" style="color: var(--color-text-secondary);">加载中...</div>
  </div>

  <div v-else class="h-full flex items-center justify-center">
    <div class="text-sm" style="color: var(--color-text-secondary);">请选择一篇帖子查看详情</div>
  </div>

  <!-- Pin dialog -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showPinDialog" class="modal-overlay" @click.self="showPinDialog = false">
        <div class="modal-card glass-float">
          <h3 class="modal-title">{{ isPostPinned ? '续费置顶' : '帖子置顶' }}</h3>

          <div v-if="isPostPinned && postListItem?.pinExpiresAt" class="modal-hint">
            当前剩余：{{ computeRemainingDetail(postListItem.pinExpiresAt) }}
            <span v-if="maxRenewHours <= 0" style="color: var(--color-danger);">（{{ isQaPost ? '已达到求助最大置顶时长' : '已达到7天上限' }}）</span>
            <span v-else>（最多续费 {{ maxRenewHours }} 小时）</span>
          </div>

          <div v-if="maxRenewHours > 0" class="modal-section">
            <span class="modal-label">选择时长：</span>
            <div class="preset-group">
              <button
                v-for="(label, i) in pinPresetLabels"
                :key="i"
                class="preset-btn"
                :class="pinPresets[i] <= maxRenewHours ? (pinHours === pinPresets[i] ? 'preset-active' : '') : 'preset-disabled'"
                @click="pinPresets[i] <= maxRenewHours && (pinHours = pinPresets[i])"
              >{{ label }}</button>
            </div>
          </div>

          <div v-if="maxRenewHours > 0" class="modal-section">
            <span class="modal-label">自定义：</span>
            <input
              v-model.number="pinHours"
              type="number"
              min="1"
              :max="maxRenewHours"
              class="modal-input"
            /> 小时
          </div>

          <div v-if="maxRenewHours > 0" class="modal-cost">
            消耗：{{ Math.min(pinHours, maxRenewHours) * 10 }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /> 百斩豆
          </div>

          <div v-else class="modal-error">
            {{ isQaPost ? '已达到求助最大置顶时长，不可高于求助时长' : '已达到最大置顶时长（7天），无法续费' }}
          </div>

          <div class="modal-actions">
            <button class="btn-ghost" @click="showPinDialog = false">取消</button>
            <button v-if="maxRenewHours > 0" class="btn-primary" @click="handlePin">确认{{ isPostPinned ? '续费' : '置顶' }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Tip dialog -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showTipDialog" class="modal-overlay" @click.self="showTipDialog = false">
        <div class="modal-card glass-float">
          <template v-if="!showTipConfirm">
            <h3 class="modal-title"><Bean class="w-4 h-4 inline-block align-text-bottom" /> 打赏帖子</h3>
            <p class="modal-desc">选择打赏金额，豆子将直接转给帖主</p>
            <p class="modal-balance">你的余额：{{ maxTipBeans }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /></p>

            <!-- Presets -->
            <div class="preset-group">
              <button
                v-for="preset in tipPresets"
                :key="preset"
                class="preset-btn"
                :class="preset <= maxTipBeans ? (tipAmount === preset && !tipCustomInput ? 'preset-active' : '') : 'preset-disabled'"
                @click="preset <= maxTipBeans && selectTipPreset(preset)"
              >{{ preset }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /></button>
            </div>

            <!-- Custom input -->
            <div class="modal-section">
              <label class="modal-label">自定义金额</label>
              <input
                v-model.number="tipCustomInput"
                type="number"
                min="1"
                :max="maxTipBeans"
                step="1"
                placeholder="输入豆子数"
                class="modal-input w-full"
                :class="[tipCustomInput && !Number.isInteger(tipCustomInput) ? 'input-error' : '']"
                @input="applyCustomTip"
              />
            </div>

            <p v-if="tipError" class="modal-error">{{ tipError }}</p>

            <div class="modal-actions">
              <button class="btn-ghost" @click="showTipDialog = false">取消</button>
              <button class="btn-cta" :disabled="tipAmount < 1" @click="goToTipConfirm">
                确认打赏 {{ tipAmount }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" />
              </button>
            </div>
          </template>

          <!-- Confirm step -->
          <template v-else>
            <h3 class="modal-title">确认支付</h3>
            <p class="modal-desc">是否支付 {{ tipAmount }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /> 百斩豆？</p>
            <p class="modal-hint">打赏给帖主，豆子将从你的账户扣除</p>
            <p v-if="tipError" class="modal-error">{{ tipError }}</p>
            <div class="modal-actions">
              <button class="btn-ghost" @click="showTipConfirm = false">取消</button>
              <button class="btn-cta" :disabled="tipping" @click="handleTipConfirm">
                {{ tipping ? '处理中...' : '确认支付' }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>

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

<style scoped>
/* ══════════════════════════════════════════════════════════════
   PostDetail · Scoped Styles
   Morandi + Oatmeal · Refined Editorial
   ══════════════════════════════════════════════════════════════ */

.post-detail {
  color: var(--color-text-primary);
}

/* ── Content area ── */
.post-content-area {
  padding: 20px 24px 16px;
}

.content-divider {
  height: 1px;
  background: var(--color-divider);
  margin: 0 24px;
  flex-shrink: 0;
}

/* ── Author header ── */
.author-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.author-avatar {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
  overflow: hidden;
  cursor: pointer;
  transition: opacity var(--transition-fast);
  user-select: none;
}
.author-avatar:hover { opacity: 0.85; }

.avatar-fallback {
  line-height: 1;
}

.author-info {
  flex: 1;
  min-width: 0;
}

.author-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.post-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.4;
  word-break: break-word;
}

.badge-deleted {
  font-size: 11px;
  color: var(--color-danger);
  background: var(--color-danger-subtle);
  padding: 1px 8px;
  border-radius: var(--radius-full);
  font-weight: 400;
  flex-shrink: 0;
}

.author-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--color-text-tertiary);
  margin-top: 3px;
}

.author-name {
  cursor: pointer;
  transition: color var(--transition-fast);
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.author-name:hover { color: var(--color-primary); }

.meta-sep {
  color: var(--color-border);
  user-select: none;
}

/* ── Author actions ── */
.author-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.price-tag {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-warning);
  padding: 4px 8px;
  background: var(--color-warning-subtle);
  border-radius: var(--radius-sm);
}

.btn-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  user-select: none;
}

.btn-tip {
  color: var(--color-warning);
  border-color: var(--color-warning);
  background: transparent;
}
.btn-tip:hover {
  background: var(--color-cta-subtle);
}

.btn-edit {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: transparent;
}
.btn-edit:hover {
  background: var(--color-primary-subtle);
}

.btn-delete {
  color: var(--color-danger);
  border-color: var(--color-danger);
  background: transparent;
}
.btn-delete:hover {
  background: var(--color-danger-subtle);
}

.btn-pin {
  color: var(--color-danger);
  border-color: var(--color-danger);
  background: transparent;
}
.btn-pin:hover {
  background: var(--color-danger-subtle);
}

.btn-unpin {
  color: var(--color-text-secondary);
  border-color: var(--color-text-tertiary);
  background: transparent;
}
.btn-unpin:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.btn-like {
  color: var(--color-text-tertiary);
  border-color: var(--color-border);
  background: var(--color-surface);
}
.btn-like:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}
.btn-like.is-liked {
  background: var(--color-danger-subtle);
  border-color: var(--color-danger);
  color: var(--color-danger);
}

/* ── Info cards (Bounty / Referral) ── */
.info-card {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  font-size: 15px;
}

.qa-card {
  border-left: 3px solid var(--color-primary);
}
.qa-active {
  background: var(--color-primary-subtle);
}
.qa-ended {
  background: var(--color-surface);
}

.qa-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  color: var(--color-text-secondary);
}

.qa-beans {
  color: var(--color-warning);
  font-weight: 500;
}
.qa-remaining {
  color: var(--color-primary);
}
.qa-time {
  color: var(--color-text-secondary);
}
.qa-distributed {
  color: var(--color-success);
  font-weight: 500;
}
.qa-expired {
  color: var(--color-text-tertiary);
}

.referral-card {
  background: var(--color-primary-subtle);
  border-left: 3px solid var(--color-primary);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.referral-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.referral-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  min-width: 56px;
}

.referral-value {
  font-size: 14px;
  color: var(--color-primary-dark);
  font-weight: 600;
  letter-spacing: 0.02em;
}

.referral-link {
  font-size: 14px;
  color: var(--color-primary);
  text-decoration: underline;
  transition: color var(--transition-fast);
  word-break: break-all;
}
.referral-link:hover {
  color: var(--color-primary-light);
}

/* ── Promo card ── */
.promo-card {
  padding: 14px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-divider);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  cursor: default;
}

.promo-text {
  font-size: 15px;
  color: var(--color-text-primary);
  white-space: pre-wrap;
  line-height: 1.65;
}

/* ── Resume section ── */
.resume-section {
  margin-bottom: 16px;
}

.section-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
  font-weight: 500;
}

.resume-content-card {
  padding: 14px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.resume-content {
  font-size: 15px;
  color: var(--color-text-primary);
  white-space: pre-wrap;
  line-height: 1.65;
  font-family: inherit;
  margin: 0;
}

/* ── Purchase CTA ── */
.purchase-cta {
  margin-top: 12px;
  padding: 16px;
  background: var(--color-cta-subtle);
  border: 1px solid var(--color-cta);
  border-radius: var(--radius-md);
  text-align: center;
}

.purchase-msg {
  font-size: 13px;
  color: var(--color-warning);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.purchase-error {
  font-size: 12px;
  color: var(--color-danger);
  margin-bottom: 8px;
}

.btn-purchase {
  padding: 8px 28px;
  background: var(--color-cta);
  color: var(--color-text-on-cta);
  border: none;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.btn-purchase:hover { background: var(--color-cta-dark); }
.btn-purchase:disabled { opacity: 0.5; cursor: not-allowed; }

.purchased-badge {
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-success);
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ── Post body ── */
.post-body {
  font-size: 16px;
  line-height: 1.7;
  white-space: pre-wrap;
  color: var(--color-text-secondary);
  padding-bottom: 8px;
}

/* ── Modal system ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30, 28, 26, 0.35);
  backdrop-filter: blur(4px);
}

.modal-card {
  width: 400px;
  max-width: 92vw;
  padding: 24px;
  border-radius: var(--radius-lg);
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 16px;
}

.modal-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}

.modal-balance {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-bottom: 12px;
}

.modal-hint {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}

.modal-section {
  margin-bottom: 12px;
}

.modal-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  display: block;
  margin-bottom: 6px;
}

.modal-cost {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

.modal-error {
  font-size: 12px;
  color: var(--color-danger);
  margin-bottom: 12px;
}

.modal-input {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 7px 12px;
  font-size: 13px;
  color: var(--color-text-primary);
  outline: none;
  transition: border-color var(--transition-fast);
  width: 80px;
}
.modal-input:focus { border-color: var(--color-border-focus); }
.modal-input.w-full { width: 100%; }
.modal-input.input-error { border-color: var(--color-danger); }

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

/* ── Preset buttons ── */
.preset-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.preset-btn {
  padding: 6px 14px;
  font-size: 13px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  background: transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.preset-btn:hover {
  border-color: var(--color-warning);
  color: var(--color-warning);
}
.preset-btn.preset-active {
  background: var(--color-cta-subtle);
  border-color: var(--color-warning);
  color: var(--color-warning);
  font-weight: 500;
}
.preset-btn.preset-disabled {
  color: var(--color-text-tertiary);
  cursor: not-allowed;
  opacity: 0.5;
}

/* ── Modal transitions ── */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 180ms ease;
}
.modal-enter-active .modal-card,
.modal-leave-active .modal-card {
  transition: transform 180ms ease, opacity 180ms ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-card {
  transform: translateY(12px) scale(0.97);
  opacity: 0;
}
.modal-leave-to .modal-card {
  transform: translateY(-8px) scale(0.98);
  opacity: 0;
}
</style>
