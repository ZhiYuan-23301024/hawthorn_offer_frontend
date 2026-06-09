<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref } from 'vue'
import { Heart, Edit3, Trash2 } from 'lucide-vue-next'
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

const props = defineProps<{
  postId: string
  postType: 'resume' | 'regular'
}>()

const postStore = usePostStore()
const authStore = useAuthStore()
const editorStore = useEditorStore()
const workspaceStore = useWorkspaceStore()
const commentSectionRef = ref<InstanceType<typeof CommentSection> | null>(null)

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

const authorName = computed(() => resumeData.value?.authorName ?? postListItem.value?.authorName ?? '')
const authorAvatar = computed(() => resumeData.value?.authorAvatar ?? postListItem.value?.authorAvatar ?? '')
const authorAvatarUrl = computed(() => resumeData.value?.authorAvatarUrl ?? postListItem.value?.authorAvatarUrl ?? null)
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

function handleEdit() {
  const label = props.postType === 'resume' ? '编辑简历' : '编辑帖子'
  if (props.postType === 'regular' && postData.value) {
    editorStore.openComponentTab(`post:editor:${props.postId}`, label, PostEditor, {
      postType: 'regular',
      editPostId: props.postId,
      editTitle: postData.value.title || '',
      editContent: postData.value.content || ''
    })
  } else if (props.postType === 'resume' && resumeData.value) {
    editorStore.openComponentTab(`post:editor:${props.postId}`, label, PostEditor, {
      postType: 'resume',
      editPostId: props.postId,
      editResumeName: resumeData.value.resumeName || '',
      editContent: resumeData.value.content || ''
    })
  }
}

async function handleDelete() {
  const message = props.postType === 'resume' ? '确定要删除这份简历吗？' : '确定要删除这篇帖子吗？'
  if (!confirm(message)) return
  try {
    if (props.postType === 'resume') {
      await postApi.deleteResumePost(props.postId)
      postStore.clearMyResumeId()
      postStore.fetchResumePostList(1)
    } else {
      await postApi.deletePost(props.postId)
      postStore.fetchPostList(1)
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
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    postStore.selectPost(props.postId, props.postType)
  }
}
</script>

<template>
  <div v-if="detail" class="h-full flex flex-col p-6 text-[#ccc]">
    <!-- Post content: scrollable, takes up to half the height -->
    <div class="overflow-y-auto flex-shrink-0" style="max-height: 45%">
    <!-- Resume detail -->
    <template v-if="postType === 'resume'">
      <div class="flex items-center gap-3 mb-5">
        <div
          class="w-12 h-12 rounded-full bg-[#2b6cb0] flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden"
        >
          <img
            v-if="authorAvatarUrl"
            :src="avatarUrl(authorAvatarUrl)"
            class="w-full h-full object-cover"
          />
          <span v-else>{{ authorAvatar || authorName?.charAt(0) || '?' }}</span>
        </div>
        <div class="flex-1">
          <div class="text-lg font-semibold text-[#ddd]">
            {{ titleOrName }}
          </div>
          <div class="text-xs text-[#888] mt-0.5">
            {{ authorName }} · {{ formatTime(detailCreatedAt) }}
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button v-if="isOwner" class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#4a9eff] text-[#4a9eff] text-sm hover:bg-[#4a9eff]/10 transition-colors" @click="handleEdit">
            <Edit3 class="w-3.5 h-3.5" /> 编辑
          </button>
          <button v-if="isOwner" class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#e74c3c] text-[#e74c3c] text-sm hover:bg-[#e74c3c]/10 transition-colors" @click="handleDelete">
            <Trash2 class="w-3.5 h-3.5" /> 删除
          </button>
        </div>
      </div>

      <div class="text-sm leading-relaxed whitespace-pre-wrap text-[#bbb]" @click="onPostContentClick">
        {{ bodyContent }}
      </div>
    </template>

    <!-- Regular post detail -->
    <template v-else>
      <div class="flex items-center gap-3 mb-5">
        <div
          class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden"
          :style="postListItem?.authorAvatarUrl ? {} : { backgroundColor: avatarColor(detailUserId) }"
          :class="postListItem?.authorAvatarUrl ? 'bg-[#6b46c1]' : ''"
        >
          <img
            v-if="postListItem?.authorAvatarUrl"
            :src="avatarUrl(postListItem.authorAvatarUrl)"
            class="w-full h-full object-cover"
          />
          <span v-else>{{ postListItem?.authorAvatar || '?' }}</span>
        </div>
        <div class="flex-1">
          <div class="text-lg font-semibold text-[#ddd]">
            {{ titleOrName }}
          </div>
          <div class="text-xs text-[#888] mt-0.5">
            {{ postListItem?.authorName }}
            <span v-if="detailCreatedAt" class="ml-2">{{ formatTime(detailCreatedAt) }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button v-if="isOwner" class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#4a9eff] text-[#4a9eff] text-sm hover:bg-[#4a9eff]/10 transition-colors" @click="handleEdit">
            <Edit3 class="w-3.5 h-3.5" /> 编辑
          </button>
          <button v-if="isOwner" class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#e74c3c] text-[#e74c3c] text-sm hover:bg-[#e74c3c]/10 transition-colors" @click="handleDelete">
            <Trash2 class="w-3.5 h-3.5" /> 删除
          </button>
          <button
            class="flex items-center gap-1.5 px-4 py-2 rounded-md border transition-colors"
            :class="isLiked ? 'bg-[#e74c3c]/20 border-[#e74c3c] text-[#e74c3c]' : 'bg-[#2d2d2d] border-[#555] text-[#888] hover:border-[#e74c3c] hover:text-[#e74c3c]'"
            @click="handleLike"
          >
            <Heart class="w-4 h-4" :fill="isLiked ? 'currentColor' : 'none'" />
            <span class="text-sm">{{ detailLikeCount }}</span>
          </button>
        </div>
      </div>

      <div class="text-sm leading-relaxed whitespace-pre-wrap text-[#bbb]" @click="onPostContentClick">
        {{ bodyContent }}
      </div>
    </template>

    </div>

    <!-- Comments (regular posts only) -->
    <CommentSection ref="commentSectionRef" v-if="postType === 'regular'" :target-id="postId" :target-type="postType" class="flex-1 min-h-0" />
  </div>

  <div v-else-if="postStore.loadingDetail" class="h-full flex items-center justify-center">
    <div class="text-sm text-[#888]">加载中...</div>
  </div>

  <div v-else class="h-full flex items-center justify-center">
    <div class="text-sm text-[#888]">请选择一篇帖子查看详情</div>
  </div>
</template>
