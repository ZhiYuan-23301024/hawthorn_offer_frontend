<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { Heart, ChevronDown, ChevronUp, Send, Trash2, Maximize2, Minimize2, CheckCircle2, Bean } from 'lucide-vue-next'
import { usePostStore } from '@/stores/post'
import { useAuthStore } from '@/stores/auth'
import { useEditorStore } from '@/stores/editor'
import * as postApi from '@/api/post'
import type { CommentVO } from '@/api/post'
import type { PostTab } from '@/stores/post'
import { formatTimeAgo, avatarUrl, avatarColor } from '@/utils/format'
import { useRequireAuth } from '@/composables/useRequireAuth'
import UserHoverCard from '@/components/Profile/UserHoverCard.vue'
import UserProfilePage from '@/components/Profile/UserProfilePage.vue'

const props = defineProps<{
  targetId: string
  targetType: 'resume' | 'regular' | 'post'
  postType?: string
  bountyRemaining?: number
  bountyStatus?: string
  postAuthorId?: string
}>()

const postStore = usePostStore()
const authStore = useAuthStore()
const editorStore = useEditorStore()

// Hover card state
const hoverUserId = ref<string | null>(null)
const hoverAnchorEl = ref<HTMLElement | null>(null)
const showHoverCard = ref(false)
let hoverTimer: ReturnType<typeof setTimeout> | null = null
let hoverCloseTimer: ReturnType<typeof setTimeout> | null = null

function onAvatarMouseEnter(e: MouseEvent, userId: string) {
  if (hoverTimer) clearTimeout(hoverTimer)
  if (hoverCloseTimer) clearTimeout(hoverCloseTimer)
  hoverUserId.value = userId
  hoverAnchorEl.value = e.currentTarget as HTMLElement
  hoverTimer = setTimeout(() => { showHoverCard.value = true }, 300)
}

function onAvatarMouseLeave() {
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

function onAvatarClick(userId: string) {
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

const newComment = ref('')
const replyToId = ref<string | null>(null)
const replyToName = ref('')
const replyContent = ref('')
const sortMode = ref<'hot' | 'latest'>('hot')

const isOwner = computed(() => authStore.user?.id != null && authStore.user.id === props.postAuthorId)
const expandedReplies = ref<Set<string>>(new Set())
const commentLikedIds = ref<Set<string>>(new Set())
const avatarImgErrors = ref<Set<string>>(new Set())
const commentExpanded = ref(false)
	/** 本地更新帖子列表中的评论数（正数增加，负数减少） */
	function bumpLocalCommentCount(delta: number) {
	  const regItem = postStore.postList.find(p => p.id === props.targetId)
	  if (regItem) regItem.commentCount = Math.max(0, (regItem.commentCount || 0) + delta)
	  const resItem = postStore.resumePostList.find(p => p.id === props.targetId)
	  if (resItem) resItem.commentCount = Math.max(0, (resItem.commentCount || 0) + delta)
	}
const commentTextarea = ref<HTMLTextAreaElement | null>(null)
const replyTextarea = ref<HTMLTextAreaElement | null>(null)

const replyExpanded = ref(false)

const MAX_AUTO_ROWS = 8

const isAnonymousComment = ref(false)
const isAnonymousReply = ref(false)

function isSelfComment(comment: CommentVO): boolean {
  return comment.isAnonymous && authStore.user?.id != null && comment.userId === authStore.user.id
}

function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  const lineHeight = 20
  const maxHeight = lineHeight * MAX_AUTO_ROWS + 16 // 16px padding
  el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px'
}

function autoResizeComment() {
  if (commentExpanded.value) return
  autoResize(commentTextarea.value)
}

function autoResizeReply() {
  if (replyExpanded.value) return
  autoResize(replyTextarea.value)
}

function toggleCommentExpand() {
  commentExpanded.value = !commentExpanded.value
  if (!commentExpanded.value) {
    nextTick(() => autoResize(commentTextarea.value))
  }
}

// Reset expand state when switching posts
watch(() => postStore.selectedId, () => {
  commentExpanded.value = false
  newComment.value = ''
})

// Sync comment liked IDs from backend data (handles login/logout user switch)
watch(() => postStore.comments, (comments) => {
  const ids = new Set<string>()
  function collect( list: CommentVO[]) {
    for (const c of list) {
      if (c.isLiked) ids.add(c.id)
      if (c.children?.length) collect(c.children)
    }
  }
  collect(comments || [])
  commentLikedIds.value = ids
}, { deep: true, immediate: true })

const sortedComments = computed(() => {
  const list = [...postStore.comments]

  if (sortMode.value === 'hot') {
    list.sort((a, b) => b.likeCount - a.likeCount)
  } else {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
  return list
})

async function handleSendComment() {
  if (!useRequireAuth()) return
  if (!newComment.value.trim()) return
  const targetType = 'post'
  await postApi.createComment({
    targetId: props.targetId,
    targetType,
    content: newComment.value.trim(),
    isAnonymous: isAnonymousComment.value
  })
  newComment.value = ''
  isAnonymousComment.value = false
  commentExpanded.value = false
  nextTick(() => autoResize(commentTextarea.value))
  bumpLocalCommentCount(1)
  await postStore.fetchComments(props.targetId, props.targetType)
}

async function handleSendReply() {
  if (!useRequireAuth()) return
  if (!replyContent.value.trim() || !replyToId.value) return
  const targetType = 'post'
  const parentId = replyToId.value
  await postApi.createComment({
    targetId: props.targetId,
    targetType,
    content: replyContent.value.trim(),
    parentId,
    isAnonymous: isAnonymousReply.value
  })
  replyContent.value = ''
  replyToId.value = null
  replyToName.value = ''
  isAnonymousReply.value = false
  replyExpanded.value = false
  nextTick(() => autoResize(replyTextarea.value))
  bumpLocalCommentCount(1)
  // Auto-expand the parent comment so the new reply is visible
  const next = new Set(expandedReplies.value)
  next.add(parentId)
  expandedReplies.value = next
  await postStore.fetchComments(props.targetId, props.targetType)
}

function onCommentClick(commentId: string, nickname: string) {
  if (!useRequireAuth()) return
  replyToId.value = commentId
  replyToName.value = nickname
  replyContent.value = ''
}

function cancelReply() {
  replyToId.value = null
  replyToName.value = ''
  replyContent.value = ''
  isAnonymousReply.value = false
  replyExpanded.value = false
}

function toggleReplies(commentId: string) {
  const next = new Set(expandedReplies.value)
  if (next.has(commentId)) {
    next.delete(commentId)
  } else {
    next.add(commentId)
  }
  expandedReplies.value = next
}

async function handleLikeComment(comment: CommentVO) {
  if (!useRequireAuth()) return
  const isLiked = commentLikedIds.value.has(comment.id)
  try {
    if (isLiked) {
      await postApi.unlikeComment(comment.id)
    } else {
      await postApi.likeComment(comment.id)
    }
    // 乐观更新本地状态：同时更新 isLiked（供 watcher 同步）和 likeCount
    comment.isLiked = !isLiked
    comment.likeCount += isLiked ? -1 : 1
    if (comment.likeCount < 0) comment.likeCount = 0
    const next = new Set(commentLikedIds.value)
    if (isLiked) {
      next.delete(comment.id)
    } else {
      next.add(comment.id)
    }
    commentLikedIds.value = next
  } catch { /* ignore */ }
}

async function handleDeleteComment(commentId: string) {
  if (!confirm('确定要删除这条评论吗？')) return
  try {
    const resp = await postApi.deleteComment(commentId)
    if (resp.code === 200) {
      await postStore.fetchComments(props.targetId, props.targetType)
      bumpLocalCommentCount(-1)
    }
  } catch { /* ignore */ }
}

function flattenComments(comments: CommentVO[], depth: number, replyToName?: string): { comment: CommentVO; depth: number; replyToName?: string }[] {
  const result: { comment: CommentVO; depth: number; replyToName?: string }[] = []
  for (const c of comments) {
    result.push({ comment: c, depth, replyToName })
    if (expandedReplies.value.has(c.id) && c.children?.length) {
      result.push(...flattenComments(c.children, depth + 1, c.nickname))
    }
  }
  return result
}

const allComments = computed(() => {
  return flattenComments(sortedComments.value, 0)
})

function countAll(comments: CommentVO[]): number {
  let n = 0
  for (const c of comments) {
    n += 1 + countAll(c.children || [])
  }
  return n
}

const totalCommentCount = computed(() => countAll(postStore.comments))

// Bounty dialog
const showBountyDialog = ref(false)
const showBountyConfirm = ref(false)
const bountyDialogType = ref<'adopt' | 'reward'>('reward')
const bountyDialogComment = ref<CommentVO | null>(null)
const bountyDialogBeans = ref(10)
const bountyPresets = [5, 10, 20, 50]
const bountyCustomInput = ref('')
const bountyError = ref('')
const bountySubmitting = ref(false)

function openBountyDialog(type: 'adopt' | 'reward', comment: CommentVO) {
  if (!useRequireAuth()) return
  bountyDialogType.value = type
  bountyDialogComment.value = comment
  bountyDialogBeans.value = props.bountyRemaining || 10
  bountyCustomInput.value = ''
  showBountyConfirm.value = false
  bountyError.value = ''
  bountySubmitting.value = false
  showBountyDialog.value = true
}

function selectBountyPreset(amount: number) {
  bountyDialogBeans.value = amount
  bountyCustomInput.value = ''
}

function applyBountyCustom() {
  const val = parseFloat(bountyCustomInput.value as any)
  if (!isNaN(val) && val >= 1) {
    if (!Number.isInteger(val)) {
      bountyError.value = '豆子数必须为整数'
      return
    }
    bountyError.value = ''
    bountyDialogBeans.value = Math.floor(val)
  }
}

function goToBountyConfirm() {
  if (bountyDialogBeans.value < 1) {
    bountyError.value = '豆子数至少为1'
    return
  }
  bountyError.value = ''
  showBountyConfirm.value = true
}

async function handleBountyConfirm() {
  if (!bountyDialogComment.value) return
  const commentId = bountyDialogComment.value.id
  const beans = bountyDialogBeans.value
  bountySubmitting.value = true
  try {
    if (bountyDialogType.value === 'adopt') {
      const resp = await postApi.adoptComment(props.targetId, commentId, beans)
      if (resp.code === 200) {
        const data = resp.data!
        showBountyDialog.value = false
        showBountyConfirm.value = false
        if (data.fromAccount > 0) {
          alert(`超出求助余额 ${data.fromAccount} 豆子已从账户扣除`)
        }
      } else {
        bountyError.value = resp.message || '采纳失败'
        showBountyConfirm.value = false
        return
      }
    } else {
      const resp = await postApi.rewardComment(props.targetId, commentId, beans)
      if (resp.code !== 200) {
        bountyError.value = resp.message || '打赏失败'
        showBountyConfirm.value = false
        return
      }
      showBountyDialog.value = false
      showBountyConfirm.value = false
    }
    await postStore.fetchComments(props.targetId, props.targetType)
    // 刷新帖子详情以更新剩余豆子数
    await postStore.selectPost(props.targetId, (props.postType as PostTab) || 'regular')
  } catch {
    bountyError.value = '操作失败'
    showBountyConfirm.value = false
  } finally {
    bountySubmitting.value = false
  }
}

defineExpose({ cancelReply })
</script>

<template>
  <div class="comment-section flex flex-col h-full">
    <!-- Header -->
    <div class="comment-header">
      <span class="comment-header-title">
        评论 ({{ totalCommentCount }})
      </span>
      <div class="comment-sort">
        <button :class="sortMode === 'hot' ? 'is-active' : ''" @click="sortMode = 'hot'">热门</button>
        <button :class="sortMode === 'latest' ? 'is-active' : ''" @click="sortMode = 'latest'">最新</button>
      </div>
    </div>

    <!-- Comment list -->
    <div class="comment-list">
      <div v-if="sortedComments.length === 0" class="comment-empty">
        暂无评论，来发表第一条吧
      </div>

      <template v-for="(entry, ci) in allComments" :key="entry.comment.id">
        <div
          class="comment-row list-item-enter"
          :class="[
            entry.depth > 0 ? 'is-nested' : '',
            entry.comment.content ? 'is-clickable' : 'is-deleted'
          ]"
          :style="{ animationDelay: `${ci * 30}ms` }"
          @click="entry.comment.content && onCommentClick(entry.comment.id, entry.comment.nickname)"
        >
          <!-- Avatar -->
          <div
            class="comment-avatar"
            :class="[
              entry.depth > 0 ? 'is-sm' : '',
              !entry.comment.isAnonymous ? 'is-interactive' : ''
            ]"
            :style="{ backgroundColor: avatarColor(entry.comment.userId) }"
            @mouseenter="!entry.comment.isAnonymous && onAvatarMouseEnter($event, entry.comment.userId)"
            @mouseleave="onAvatarMouseLeave"
            @click.stop="!entry.comment.isAnonymous && onAvatarClick(entry.comment.userId)"
          >
            <img v-if="avatarUrl(entry.comment.avatarUrl) && !avatarImgErrors.has(entry.comment.id)" :src="avatarUrl(entry.comment.avatarUrl)" class="w-full h-full object-cover" @error="avatarImgErrors.add(entry.comment.id)" />
            <span v-else class="avatar-fallback">{{ entry.comment.nickname?.charAt(0) || '?' }}</span>
          </div>

          <!-- Body -->
          <div class="comment-body">
            <!-- Meta line -->
            <div v-if="entry.comment.content" class="comment-meta">
              <span
                class="comment-nickname"
                :class="!entry.comment.isAnonymous ? 'is-link' : ''"
                @mouseenter="!entry.comment.isAnonymous && onAvatarMouseEnter($event, entry.comment.userId)"
                @mouseleave="onAvatarMouseLeave"
                @click.stop="!entry.comment.isAnonymous && onAvatarClick(entry.comment.userId)"
              >{{ entry.comment.nickname }}</span>
              <span v-if="entry.comment.isAnonymous && entry.comment.isPostAuthor" class="comment-badge badge-author">楼主</span>
              <span v-else-if="entry.comment.isAnonymous && isSelfComment(entry.comment)" class="comment-badge badge-self">本人</span>
              <span v-if="(entry.comment.bountyBeans ?? 0) > 0" class="comment-bounty">+{{ entry.comment.bountyBeans }} <Bean class="w-3 h-3 inline-block align-text-bottom" /></span>
              <span v-if="entry.comment.isAdopted" class="comment-badge badge-adopted"><CheckCircle2 class="w-3 h-3 inline-block" /> 已采纳</span>
              <span v-if="entry.replyToName" class="comment-reply-to">回复 @{{ entry.replyToName }}</span>
              <span class="comment-time">{{ formatTimeAgo(entry.comment.createdAt) }}</span>
            </div>

            <!-- Content -->
            <div v-if="entry.comment.content" class="comment-content">
              {{ entry.comment.content }}
            </div>
            <div v-else class="comment-content is-deleted">
              该评论已被删除
            </div>

            <!-- Reply toggle -->
            <div
              v-if="entry.comment.children?.length"
              class="comment-toggle-replies"
              @click.stop="toggleReplies(entry.comment.id)"
            >
              <template v-if="expandedReplies.has(entry.comment.id)">
                <ChevronUp class="w-3.5 h-3.5 inline" /> 收起回复
              </template>
              <template v-else>
                <ChevronDown class="w-3.5 h-3.5 inline" /> 展开 {{ countAll(entry.comment.children) }} 条回复
              </template>
            </div>
          </div>

          <!-- Actions (right side) -->
          <div class="comment-actions">
            <!-- Delete -->
            <button
              v-if="entry.comment.content && authStore.user?.id && entry.comment.userId === authStore.user.id"
              class="comment-action-btn btn-delete"
              @click.stop="handleDeleteComment(entry.comment.id)"
              title="删除"
            >
              <Trash2 class="w-4 h-4" />
            </button>

            <!-- Like -->
            <button
              v-if="entry.comment.content"
              class="comment-action-btn btn-like"
              :class="commentLikedIds.has(entry.comment.id) ? 'is-active' : ''"
              @click.stop="handleLikeComment(entry.comment)"
            >
              <Heart class="w-4 h-4" :fill="commentLikedIds.has(entry.comment.id) ? 'currentColor' : 'none'" />
              <span v-if="entry.comment.likeCount">{{ entry.comment.likeCount }}</span>
            </button>

            <!-- Bounty: adopt / reward -->
            <template v-if="props.postType === 'qa' && entry.comment.content">
              <button
                v-if="isOwner && props.bountyStatus === 'active' && !entry.comment.isAdopted && entry.comment.userId !== authStore.user?.id"
                class="comment-action-btn btn-adopt"
                @click.stop="openBountyDialog('adopt', entry.comment)"
              >采纳</button>
              <button
                v-if="entry.comment.userId !== authStore.user?.id"
                class="comment-action-btn btn-reward"
                @click.stop="openBountyDialog('reward', entry.comment)"
              >打赏</button>
            </template>
          </div>
        </div>
      </template>
    </div>

    <!-- Reply bar -->
    <div v-if="replyToId" class="reply-bar">
      <div class="reply-bar-row">
        <span class="reply-bar-label">回复 @{{ replyToName }}:</span>
        <textarea
          ref="replyTextarea"
          v-model="replyContent"
          rows="1"
          placeholder="写下回复... (Enter 发送, Shift+Enter 换行)"
          class="comment-textarea"
          :style="replyExpanded ? { height: '50vh' } : {}"
          @input="autoResizeReply"
          @keydown.enter.exact.prevent="handleSendReply"
        />
        <div class="reply-bar-actions">
          <button class="icon-btn" @click="replyExpanded = !replyExpanded" title="展开">
            <Minimize2 v-if="replyExpanded" class="w-4 h-4" />
            <Maximize2 v-else class="w-4 h-4" />
          </button>
          <button class="icon-btn btn-send" @click="handleSendReply" title="发送">
            <Send class="w-4 h-4" />
          </button>
        </div>
        <button class="btn-cancel" @click="cancelReply">取消</button>
      </div>
      <div class="checkbox-row">
        <input
          id="anonymous-reply"
          v-model="isAnonymousReply"
          type="checkbox"
          class="comment-checkbox"
        />
        <label for="anonymous-reply" class="checkbox-label">匿名回复</label>
      </div>
    </div>

    <!-- New comment input -->
    <div v-else class="new-comment-bar">
      <div class="new-comment-row">
        <textarea
          ref="commentTextarea"
          v-model="newComment"
          rows="2"
          placeholder="留下你的评论... (Enter 发送, Shift+Enter 换行)"
          class="comment-textarea"
          :style="commentExpanded ? { height: '50vh' } : {}"
          @input="autoResizeComment"
          @keydown.enter.exact.prevent="handleSendComment"
        />
        <div class="reply-bar-actions">
          <button class="icon-btn" @click="toggleCommentExpand" title="展开">
            <Minimize2 v-if="commentExpanded" class="w-4 h-4" />
            <Maximize2 v-else class="w-4 h-4" />
          </button>
          <button class="btn-send-main" @click="handleSendComment">发送</button>
        </div>
      </div>
      <div class="checkbox-row">
        <input
          id="anonymous-comment"
          v-model="isAnonymousComment"
          type="checkbox"
          class="comment-checkbox"
        />
        <label for="anonymous-comment" class="checkbox-label">匿名评论</label>
      </div>
    </div>

    <!-- Bounty dialog -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showBountyDialog" class="modal-overlay" @click.self="showBountyDialog = false">
          <div class="modal-card glass-float">
            <template v-if="!showBountyConfirm">
              <h3 class="modal-title">
                {{ bountyDialogType === 'adopt' ? '采纳回答' : '打赏回答' }}
              </h3>
              <p class="modal-desc">
                {{ bountyDialogType === 'adopt' ? '采纳后将标记为已采纳，豆子立即发放' : '直接打赏豆子给回答者' }}
              </p>
              <p v-if="bountyDialogType === 'adopt' && props.bountyRemaining && props.bountyRemaining > 0" class="modal-balance">
                求助剩余：{{ props.bountyRemaining }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" />
              </p>

              <!-- Presets -->
              <div class="preset-group">
                <button
                  v-for="preset in bountyPresets"
                  :key="preset"
                  class="preset-btn"
                  :class="bountyDialogBeans === preset && !bountyCustomInput ? 'preset-active' : ''"
                  @click="selectBountyPreset(preset)"
                >{{ preset }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /></button>
              </div>

              <!-- Custom input -->
              <div class="modal-section">
                <label class="modal-label">自定义金额</label>
                <input
                  v-model.number="bountyCustomInput"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="输入豆子数"
                  class="modal-input w-full"
                  :class="[bountyCustomInput && !Number.isInteger(bountyCustomInput) ? 'input-error' : '']"
                  @input="applyBountyCustom"
                />
                <p v-if="bountyDialogType === 'adopt' && props.bountyRemaining && bountyDialogBeans > (props.bountyRemaining || 0)" class="input-hint">
                  超出求助余额 {{ bountyDialogBeans - (props.bountyRemaining || 0) }} 豆子，将继续从账户扣除
                </p>
              </div>

              <p v-if="bountyError" class="modal-error">{{ bountyError }}</p>

              <div class="modal-actions">
                <button class="btn-ghost" @click="showBountyDialog = false">取消</button>
                <button class="btn-primary" :disabled="bountyDialogBeans < 1" @click="goToBountyConfirm">
                  确认{{ bountyDialogType === 'adopt' ? '采纳' : '打赏' }} {{ bountyDialogBeans }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" />
                </button>
              </div>
            </template>

            <!-- Confirm step -->
            <template v-else>
              <h3 class="modal-title">确认支付</h3>
              <p class="modal-desc">是否支付 {{ bountyDialogBeans }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /> 百斩豆？</p>
              <p class="modal-hint">
                {{ bountyDialogType === 'adopt' ? '采纳该回答，豆子将立即发放给回答者' : '打赏给回答者，豆子将从你的账户扣除' }}
                <span v-if="bountyDialogType === 'adopt' && props.bountyRemaining && bountyDialogBeans > (props.bountyRemaining || 0)" class="text-danger">（超出求助余额部分将从账户扣除）</span>
              </p>
              <p v-if="bountyError" class="modal-error">{{ bountyError }}</p>
              <div class="modal-actions">
                <button class="btn-ghost" @click="showBountyConfirm = false">取消</button>
                <button class="btn-primary" :disabled="bountySubmitting" @click="handleBountyConfirm">
                  {{ bountySubmitting ? '处理中...' : '确认支付' }}
                </button>
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>
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

<style scoped>
/* ══════════════════════════════════════════════════════════════
   CommentSection · Scoped Styles
   Morandi + Oatmeal · Clean Discussion Thread
   ══════════════════════════════════════════════════════════════ */

.comment-section {
  color: var(--color-text-primary);
}

/* ── Header ── */
.comment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-top: 1px solid var(--color-divider);
  flex-shrink: 0;
}

.comment-header-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.comment-sort {
  display: flex;
  gap: 12px;
  font-size: 12px;
}
.comment-sort button {
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: color var(--transition-fast);
  padding: 0;
}
.comment-sort button:hover { color: var(--color-text-primary); }
.comment-sort button.is-active { color: var(--color-primary); font-weight: 500; }

/* ── Comment list ── */
.comment-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 24px 8px;
}

.comment-empty {
  font-size: 12px;
  color: var(--color-text-tertiary);
  padding: 24px 0;
  text-align: center;
}

/* ── Comment row ── */
.comment-row {
  display: flex;
  gap: 10px;
  padding: 10px 8px;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}
.comment-row.is-clickable {
  cursor: pointer;
}
.comment-row.is-clickable:hover {
  background: var(--color-surface-hover);
}
.comment-row.is-nested {
  margin-left: 36px;
  padding-left: 10px;
  border-left: 2px solid var(--color-divider);
}
.comment-row.is-deleted {
  cursor: default;
  opacity: 0.55;
}

/* ── Avatar ── */
.comment-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  flex-shrink: 0;
  overflow: hidden;
  margin-top: 1px;
  user-select: none;
}
.comment-avatar.is-sm {
  width: 24px;
  height: 24px;
  font-size: 10px;
}
.comment-avatar.is-interactive {
  cursor: pointer;
  transition: opacity var(--transition-fast);
}
.comment-avatar.is-interactive:hover { opacity: 0.85; }

.avatar-fallback {
  line-height: 1;
}

/* ── Comment body ── */
.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 14px;
  line-height: 1.4;
}

.comment-nickname {
  font-weight: 600;
  color: var(--color-text-primary);
}
.comment-nickname.is-link {
  cursor: pointer;
  transition: color var(--transition-fast);
}
.comment-nickname.is-link:hover { color: var(--color-primary); }

.comment-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  font-weight: 500;
  flex-shrink: 0;
}
.badge-author {
  background: var(--color-primary-subtle);
  color: var(--color-primary-dark);
}
.badge-self {
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.badge-adopted {
  background: var(--color-success-subtle);
  color: var(--color-success);
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.comment-bounty {
  font-size: 11px;
  color: var(--color-warning);
  font-weight: 500;
}

.comment-reply-to {
  color: var(--color-primary);
}

.comment-time {
  color: var(--color-text-tertiary);
}

.comment-content {
  font-size: 15px;
  color: var(--color-text-secondary);
  margin-top: 4px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.comment-content.is-deleted {
  font-style: italic;
  color: var(--color-text-tertiary);
  margin-top: 0;
}

.comment-toggle-replies {
  margin-top: 6px;
  font-size: 11px;
  color: var(--color-text-tertiary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  transition: color var(--transition-fast);
}
.comment-toggle-replies:hover {
  color: var(--color-text-secondary);
}

/* ── Comment actions ── */
.comment-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  align-self: center;
}

.comment-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  padding: 3px 6px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.btn-delete {
  color: var(--color-text-tertiary);
}
.btn-delete:hover {
  color: var(--color-danger);
}

.btn-like {
  color: var(--color-text-tertiary);
}
.btn-like:hover {
  color: var(--color-danger);
}
.btn-like.is-active {
  color: var(--color-danger);
}

.btn-adopt {
  color: var(--color-warning);
  border-color: var(--color-warning);
}
.btn-adopt:hover {
  background: var(--color-cta-subtle);
}

.btn-reward {
  color: var(--color-primary);
  border-color: var(--color-primary);
}
.btn-reward:hover {
  background: var(--color-primary-subtle);
}

/* ── Reply bar ── */
.reply-bar {
  padding: 12px 24px;
  border-top: 1px solid var(--color-divider);
  background: var(--color-surface);
  flex-shrink: 0;
}

.reply-bar-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.reply-bar-label {
  font-size: 12px;
  color: var(--color-primary);
  flex-shrink: 0;
  padding-bottom: 7px;
}

.reply-bar-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.btn-cancel {
  font-size: 11px;
  color: var(--color-text-tertiary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 4px 7px;
  transition: color var(--transition-fast);
}
.btn-cancel:hover { color: var(--color-text-primary); }

/* ── New comment bar ── */
.new-comment-bar {
  padding: 16px 24px;
  border-top: 1px solid var(--color-divider);
  flex-shrink: 0;
}

.new-comment-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

/* ── Shared textarea ── */
.comment-textarea {
  flex: 1;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  font-size: 15px;
  color: var(--color-text-primary);
  outline: none;
  resize: none;
  overflow-y: auto;
  transition: border-color var(--transition-fast);
  font-family: inherit;
  line-height: 1.5;
}
.comment-textarea::placeholder {
  color: var(--color-text-tertiary);
}
.comment-textarea:focus {
  border-color: var(--color-border-focus);
}

/* ── Icon buttons ── */
.icon-btn {
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  display: flex;
}
.icon-btn:hover { color: var(--color-text-primary); }
.icon-btn.btn-send { color: var(--color-primary); }
.icon-btn.btn-send:hover { color: var(--color-primary-dark); }

.btn-send-main {
  background: var(--color-primary);
  color: #fff;
  border: none;
  padding: 7px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast);
  white-space: nowrap;
}
.btn-send-main:hover { background: var(--color-primary-dark); }

/* ── Checkbox ── */
.checkbox-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
}

.comment-checkbox {
  width: 15px;
  height: 15px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  accent-color: var(--color-primary);
  cursor: pointer;
}

.checkbox-label {
  font-size: 12px;
  color: var(--color-text-tertiary);
  cursor: pointer;
  user-select: none;
}

/* ── Modal (shared with PostDetail) ── */
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
.modal-hint .text-danger { color: var(--color-danger); }

.modal-section {
  margin-bottom: 12px;
}

.modal-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  display: block;
  margin-bottom: 6px;
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

.input-hint {
  font-size: 11px;
  color: var(--color-danger);
  margin-top: 6px;
}

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
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.preset-btn.preset-active {
  background: var(--color-primary-subtle);
  border-color: var(--color-primary);
  color: var(--color-primary);
  font-weight: 500;
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
