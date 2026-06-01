<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { Heart, ChevronDown, ChevronUp, CornerDownRight, Send, Trash2, Maximize2, Minimize2 } from 'lucide-vue-next'
import { usePostStore } from '@/stores/post'
import { useAuthStore } from '@/stores/auth'
import { API_BASE_URL } from '@/api/http'
import * as postApi from '@/api/post'
import type { CommentVO } from '@/api/post'
import { formatTimeAgo, avatarUrl, avatarColor } from '@/utils/format'

const props = defineProps<{
  targetId: string
  targetType: 'resume' | 'regular'
}>()

const postStore = usePostStore()
const authStore = useAuthStore()

const newComment = ref('')
const replyToId = ref<string | null>(null)
const replyToName = ref('')
const replyContent = ref('')
const sortMode = ref<'hot' | 'latest'>('hot')
const expandedReplies = ref<Set<string>>(new Set())
const commentLikedIds = ref<Set<string>>(new Set())
const commentExpanded = ref(false)
const commentTextarea = ref<HTMLTextAreaElement | null>(null)
const replyTextarea = ref<HTMLTextAreaElement | null>(null)

const replyExpanded = ref(false)

const MAX_AUTO_ROWS = 8

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
  if (!newComment.value.trim()) return
  const targetType = 'post'
  await postApi.createComment({
    targetId: props.targetId,
    targetType,
    content: newComment.value.trim()
  })
  newComment.value = ''
  commentExpanded.value = false
  nextTick(() => autoResize(commentTextarea.value))
  await postStore.fetchComments(props.targetId, props.targetType)
}

async function handleSendReply() {
  if (!replyContent.value.trim() || !replyToId.value) return
  const targetType = 'post'
  const parentId = replyToId.value
  await postApi.createComment({
    targetId: props.targetId,
    targetType,
    content: replyContent.value.trim(),
    parentId
  })
  replyContent.value = ''
  replyToId.value = null
  replyToName.value = ''
  replyExpanded.value = false
  nextTick(() => autoResize(replyTextarea.value))
  // Auto-expand the parent comment so the new reply is visible
  const next = new Set(expandedReplies.value)
  next.add(parentId)
  expandedReplies.value = next
  await postStore.fetchComments(props.targetId, props.targetType)
}

function onCommentClick(commentId: string, nickname: string) {
  replyToId.value = commentId
  replyToName.value = nickname
  replyContent.value = ''
}

function cancelReply() {
  replyToId.value = null
  replyToName.value = ''
  replyContent.value = ''
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
  const isLiked = commentLikedIds.value.has(comment.id)
  try {
    if (isLiked) {
      await postApi.unlikeComment(comment.id)
    } else {
      await postApi.likeComment(comment.id)
    }
    const next = new Set(commentLikedIds.value)
    if (isLiked) {
      next.delete(comment.id)
      comment.likeCount = Math.max(0, comment.likeCount - 1)
    } else {
      next.add(comment.id)
      comment.likeCount += 1
    }
    commentLikedIds.value = next
  } catch { /* ignore */ }
}

async function handleDeleteComment(commentId: string) {
  if (!confirm('确定要删除这条评论吗？')) return
  try {
    const token = authStore.token || undefined
    const resp = await fetch(`${API_BASE_URL}/api/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    }).then(r => r.json())
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
        </div>
      </template>
    </div>

    <!-- Reply bar -->
    <div v-if="replyToId" class="flex items-end gap-2 py-2 border-t border-[#333]">
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

    <!-- New comment input -->
    <div v-else class="flex items-end gap-2 pt-3 border-t border-[#333]">
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
  </div>
</template>
