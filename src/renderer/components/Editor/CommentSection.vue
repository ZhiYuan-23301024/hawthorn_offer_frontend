<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { Heart, ChevronDown, ChevronUp, Send, Trash2, Maximize2, Minimize2 } from 'lucide-vue-next'
import { usePostStore } from '@/stores/post'
import { useAuthStore } from '@/stores/auth'
import * as postApi from '@/api/post'
import type { CommentVO } from '@/api/post'
import type { PostTab } from '@/stores/post'
import { formatTimeAgo, avatarUrl, avatarColor } from '@/utils/format'
import { useRequireAuth } from '@/composables/useRequireAuth'

const props = defineProps<{
  targetId: string
  targetType: 'resume' | 'regular'
  postType?: string
  bountyRemaining?: number
  bountyStatus?: string
  postAuthorId?: string
}>()

const postStore = usePostStore()
const authStore = useAuthStore()

const newComment = ref('')
const replyToId = ref<string | null>(null)
const replyToName = ref('')
const replyContent = ref('')
const sortMode = ref<'hot' | 'latest'>('hot')

const isOwner = computed(() => authStore.user?.id != null && authStore.user.id === props.postAuthorId)
const expandedReplies = ref<Set<string>>(new Set())
const commentLikedIds = ref<Set<string>>(new Set())
const commentExpanded = ref(false)
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
  // 更新帖子列表中的评论数
  const listItem = postStore.postList.find(p => p.id === props.targetId)
  if (listItem) listItem.commentCount += 1
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
  // 更新帖子列表中的评论数
  const listItem = postStore.postList.find(p => p.id === props.targetId)
  if (listItem) listItem.commentCount += 1
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
const bountyDialogType = ref<'adopt' | 'reward'>('reward')
const bountyDialogComment = ref<CommentVO | null>(null)
const bountyDialogBeans = ref(10)

function openBountyDialog(type: 'adopt' | 'reward', comment: CommentVO) {
  if (!useRequireAuth()) return
  bountyDialogType.value = type
  bountyDialogComment.value = comment
  bountyDialogBeans.value = props.bountyRemaining || 10
  showBountyDialog.value = true
}

async function handleBountyConfirm() {
  if (!bountyDialogComment.value) return
  const commentId = bountyDialogComment.value.id
  const beans = bountyDialogBeans.value
  try {
    if (bountyDialogType.value === 'adopt') {
      const resp = await postApi.adoptComment(props.targetId, commentId, beans)
      if (resp.code === 200) {
        const data = resp.data!
        if (data.fromAccount > 0) {
          alert(`超出求助余额 ${data.fromAccount} 豆子已从账户扣除`)
        }
      } else {
        alert(resp.message || '采纳失败')
        return
      }
    } else {
      const resp = await postApi.rewardComment(props.targetId, commentId, beans)
      if (resp.code !== 200) {
        alert(resp.message || '打赏失败')
        return
      }
    }
    showBountyDialog.value = false
    await postStore.fetchComments(props.targetId, props.targetType)
    // 刷新帖子详情以更新剩余豆子数
    await postStore.selectPost(props.targetId, (props.postType as PostTab) || 'regular')
  } catch {
    alert('操作失败')
  }
}

defineExpose({ cancelReply })
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between py-3 border-t border-[#333]">
      <span class="text-sm text-[#aaa] font-medium">
        评论 ({{ totalCommentCount }})
      </span>
      <div class="flex gap-3 text-xs">
        <button :class="sortMode === 'hot' ? 'text-[#4a9eff]' : 'text-[#888] hover:text-[#ccc]'" @click="sortMode = 'hot'">热门</button>
        <button :class="sortMode === 'latest' ? 'text-[#4a9eff]' : 'text-[#888] hover:text-[#ccc]'" @click="sortMode = 'latest'">最新</button>
      </div>
    </div>

    <!-- Comment list -->
    <div class="flex-1 overflow-y-auto space-y-3 pb-2">
      <div v-if="sortedComments.length === 0" class="text-xs text-[#666] py-4 text-center">
        暂无评论，来发表第一条吧
      </div>

      <template v-for="entry in allComments" :key="entry.comment.id">
        <!-- Clickable comment row -->
        <div
          class="flex gap-2.5 rounded-md -mx-1 px-1 py-1 transition-colors"
          :class="[
            entry.depth > 0 ? 'ml-9 pl-2 border-l-2 border-[#333]' : '',
            entry.comment.content ? 'cursor-pointer hover:bg-[#2a2a2a]' : 'cursor-default opacity-60'
          ]"
          @click="entry.comment.content && onCommentClick(entry.comment.id, entry.comment.nickname)"
        >
          <!-- Avatar -->
          <div
            class="rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mt-0.5 overflow-hidden"
            :class="entry.depth > 0 ? 'w-6 h-6' : 'w-8 h-8'"
            :style="entry.comment.avatarUrl ? {} : { backgroundColor: avatarColor(entry.comment.userId) }"
          >
            <img v-if="avatarUrl(entry.comment.avatarUrl)" :src="avatarUrl(entry.comment.avatarUrl)" class="w-full h-full object-cover" />
            <span v-else>{{ entry.comment.nickname?.charAt(0) || '?' }}</span>
          </div>

          <!-- Body -->
          <div class="flex-1 min-w-0">
            <div v-if="entry.comment.content" class="text-xs">
              <span class="font-semibold text-[#ccc]">{{ entry.comment.nickname }}</span>
              <span v-if="entry.comment.isAnonymous && entry.comment.isPostAuthor" class="ml-1 text-xs px-1.5 py-0.5 rounded bg-[#4a9eff]/20 text-[#4a9eff] font-medium">楼主</span>
              <span v-else-if="entry.comment.isAnonymous && isSelfComment(entry.comment)" class="ml-1 text-xs px-1.5 py-0.5 rounded bg-[#27ae60]/20 text-[#27ae60] font-medium">本人</span>
              <span v-if="(entry.comment.bountyBeans ?? 0) > 0" class="ml-1 text-xs text-[#f0c040]">🫘+{{ entry.comment.bountyBeans }}</span>
              <span v-if="entry.comment.isAdopted" class="ml-1 text-xs px-1.5 py-0.5 rounded bg-[#27ae60]/20 text-[#27ae60] font-medium">✅ 已采纳</span>
              <span v-if="entry.replyToName" class="text-[#4a9eff] ml-1">回复 @{{ entry.replyToName }}</span>
              <span class="text-[#666] ml-2">{{ formatTimeAgo(entry.comment.createdAt) }}</span>
            </div>
            <div v-if="entry.comment.content" class="text-xs text-[#bbb] mt-1 leading-relaxed whitespace-pre-wrap">
              {{ entry.comment.content }}
            </div>
            <div v-else class="text-xs text-[#666] italic mt-1">
              该评论已被删除
            </div>

            <!-- Reply toggle (any comment with children) -->
            <div
              v-if="entry.comment.children?.length"
              class="mt-2 text-xs text-[#888] cursor-pointer hover:text-[#aaa] inline-flex items-center gap-1"
              @click.stop="toggleReplies(entry.comment.id)"
            >
              <span v-if="expandedReplies.has(entry.comment.id)">
                <ChevronUp class="w-3 h-3 inline" /> 收起回复
              </span>
              <span v-else>
                <ChevronDown class="w-3 h-3 inline" /> 展开 {{ countAll(entry.comment.children) }} 条回复
              </span>
            </div>
          </div>

          <!-- Delete button (own, non-deleted comments only) -->
          <button
            v-if="entry.comment.content && authStore.user?.id && entry.comment.userId === authStore.user.id"
            class="flex items-center gap-0.5 text-xs flex-shrink-0 pt-0.5 text-[#888] hover:text-[#e74c3c] transition-colors"
            @click.stop="handleDeleteComment(entry.comment.id)"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>

          <!-- Like button (non-deleted comments only) -->
          <button
            v-if="entry.comment.content"
            class="flex items-center gap-0.5 text-xs flex-shrink-0 pt-0.5 transition-colors"
            :class="commentLikedIds.has(entry.comment.id) ? 'text-[#e74c3c]' : 'text-[#888] hover:text-[#e74c3c]'"
            @click.stop="handleLikeComment(entry.comment)"
          >
            <Heart class="w-3.5 h-3.5" :fill="commentLikedIds.has(entry.comment.id) ? 'currentColor' : 'none'" />
            <span>{{ entry.comment.likeCount || 0 }}</span>
          </button>

          <!-- Bounty action buttons (QA posts only) -->
          <template v-if="props.postType === 'qa' && entry.comment.content">
            <button
              v-if="isOwner && props.bountyStatus === 'active' && !entry.comment.isAdopted && entry.comment.userId !== authStore.user?.id"
              class="text-xs px-2 py-0.5 rounded border border-[#f0c040]/50 text-[#f0c040] hover:bg-[#f0c040]/10 transition-colors flex-shrink-0"
              @click.stop="openBountyDialog('adopt', entry.comment)"
            >采纳</button>
            <button
              v-if="entry.comment.userId !== authStore.user?.id"
              class="text-xs px-2 py-0.5 rounded border border-[#4a9eff]/50 text-[#4a9eff] hover:bg-[#4a9eff]/10 transition-colors flex-shrink-0"
              @click.stop="openBountyDialog('reward', entry.comment)"
            >打赏</button>
          </template>
        </div>
      </template>
    </div>

    <!-- Reply bar -->
    <div v-if="replyToId" class="flex flex-col gap-2 py-2 border-t border-[#333]">
      <div class="flex items-end gap-2">
        <span class="text-xs text-[#4a9eff] flex-shrink-0 pt-1.5">回复 @{{ replyToName }}:</span>
        <textarea
          ref="replyTextarea"
          v-model="replyContent"
          rows="1"
          placeholder="写下回复... (Enter 发送, Shift+Enter 换行)"
          class="flex-1 bg-[#2d2d2d] border border-[#444] rounded-md px-2.5 py-1.5 text-xs text-[#ccc] outline-none focus:border-[#4a9eff] placeholder:text-[#666] resize-none overflow-y-auto transition-all"
          :style="replyExpanded ? { height: '50vh' } : {}"
          @input="autoResizeReply"
          @keydown.enter.exact.prevent="handleSendReply"
        />
        <div class="flex flex-col gap-1 flex-shrink-0">
          <button
            class="text-[#888] hover:text-[#ccc] transition-colors"
            @click="replyExpanded = !replyExpanded"
          >
            <Minimize2 v-if="replyExpanded" class="w-4 h-4" />
            <Maximize2 v-else class="w-4 h-4" />
          </button>
          <button class="text-[#4a9eff] hover:text-[#3a8eef]" @click="handleSendReply">
            <Send class="w-4 h-4" />
          </button>
        </div>
        <button class="text-xs text-[#888] hover:text-[#ccc] flex-shrink-0 mb-0.5" @click="cancelReply">取消</button>
      </div>
      <div class="flex items-center gap-2">
        <input
          id="anonymous-reply"
          v-model="isAnonymousReply"
          type="checkbox"
          class="w-4 h-4 rounded border-[#444] bg-[#2d2d2d] accent-[#4a9eff]"
        />
        <label for="anonymous-reply" class="text-xs text-[#aaa] cursor-pointer">匿名回复</label>
      </div>
    </div>

    <!-- New comment input -->
    <div v-else class="flex flex-col gap-2 pt-3 border-t border-[#333]">
      <div class="flex items-end gap-2">
        <textarea
          ref="commentTextarea"
          v-model="newComment"
          rows="2"
          placeholder="留下你的评论... (Enter 发送, Shift+Enter 换行)"
          class="flex-1 bg-[#2d2d2d] border border-[#444] rounded-md px-3 py-2 text-sm text-[#ccc] outline-none focus:border-[#4a9eff] placeholder:text-[#666] resize-none overflow-y-auto transition-all"
          :style="commentExpanded ? { height: '50vh' } : {}"
          @input="autoResizeComment"
          @keydown.enter.exact.prevent="handleSendComment"
        />
        <div class="flex flex-col gap-1 flex-shrink-0">
          <button
            class="text-[#888] hover:text-[#ccc] transition-colors"
            @click="toggleCommentExpand"
          >
            <Minimize2 v-if="commentExpanded" class="w-4 h-4" />
            <Maximize2 v-else class="w-4 h-4" />
          </button>
          <button
            class="bg-[#4a9eff] text-white text-sm px-4 py-2 rounded-md hover:bg-[#3a8eef] transition-colors"
            @click="handleSendComment"
          >发送</button>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <input
          id="anonymous-comment"
          v-model="isAnonymousComment"
          type="checkbox"
          class="w-4 h-4 rounded border-[#444] bg-[#2d2d2d] accent-[#4a9eff]"
        />
        <label for="anonymous-comment" class="text-xs text-[#aaa] cursor-pointer">匿名评论</label>
      </div>
    </div>

    <!-- Bounty dialog -->
    <div v-if="showBountyDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" @click.self="showBountyDialog = false">
      <div class="bg-[#1e1e1e] border border-[#333] rounded-lg p-6 w-[380px]">
        <h3 class="text-lg font-semibold text-[#ccc] mb-4">
          {{ bountyDialogType === 'adopt' ? '采纳回答' : '打赏回答' }}
        </h3>
        <div class="text-sm text-[#aaa] mb-3">
          {{ bountyDialogType === 'adopt' ? '采纳后将标记为已采纳，豆子立即发放' : '直接打赏豆子给回答者' }}
        </div>
        <div v-if="bountyDialogType === 'adopt' && props.bountyRemaining && props.bountyRemaining > 0" class="text-xs text-[#888] mb-3">
          求助剩余：🫘 {{ props.bountyRemaining }}
        </div>
        <div class="mb-4">
          <label class="block text-sm text-[#aaa] mb-1.5">豆子数</label>
          <input
            v-model.number="bountyDialogBeans"
            type="number"
            min="1"
            class="w-full bg-[#2d2d2d] border border-[#444] rounded-md px-3 py-2 text-sm text-[#ccc] outline-none focus:border-[#4a9eff]"
          />
          <div v-if="bountyDialogType === 'adopt' && props.bountyRemaining && bountyDialogBeans > props.bountyRemaining" class="text-xs text-[#e74c3c] mt-1">
            超出求助余额 {{ bountyDialogBeans - (props.bountyRemaining || 0) }} 豆子，将继续从账户扣除
          </div>
        </div>
        <div class="flex gap-3 justify-end">
          <button class="px-4 py-2 border border-[#555] text-[#aaa] rounded-md text-sm hover:bg-[#2a2a2a]" @click="showBountyDialog = false">取消</button>
          <button class="px-4 py-2 bg-[#4a9eff] text-white rounded-md text-sm hover:bg-[#3a8eef]" @click="handleBountyConfirm">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>
