<script setup lang="ts">
import { ref } from 'vue'
import { usePostStore } from '@/stores/post'
import { useEditorStore } from '@/stores/editor'
import * as postApi from '@/api/post'
import PostDetail from './PostDetail.vue'

const props = defineProps<{
  postType: 'resume' | 'regular'
  editPostId?: string
  editTitle?: string
  editResumeName?: string
  editContent?: string
}>()

const postStore = usePostStore()
const editorStore = useEditorStore()

const resumeName = ref(props.editResumeName || '')
const title = ref(props.editTitle || '')
const content = ref(props.editContent || '')
const isAnonymous = ref(false)
const submitting = ref(false)
const error = ref('')

const isEditing = !!props.editPostId

function handleCancel() {
  if (!confirm('内容未保存，是否取消编辑？')) return
  const tabId = props.editPostId
    ? `post:editor:${props.editPostId}`
    : `post:editor:${props.postType}`
  editorStore.closeTab(tabId)
}

async function handleSubmit() {
  error.value = ''
  if (props.postType === 'resume') {
    if (!resumeName.value.trim() || !content.value.trim()) {
      error.value = '姓名和内容不能为空'
      return
    }
  } else {
    if (!title.value.trim() || !content.value.trim()) {
      error.value = '标题和内容不能为空'
      return
    }
  }

  submitting.value = true
  try {
    if (props.postType === 'resume') {
      if (isEditing) {
        const res = await postApi.updateResume(props.editPostId!, resumeName.value.trim(), content.value.trim())
        if (res.code === 200) {
          await postStore.fetchResumeList(1)
          await postStore.selectPost(props.editPostId!, 'resume')
          editorStore.closeTab(`post:editor:${props.editPostId}`)
        } else {
          error.value = res.message || '保存失败'
        }
      } else {
        const res = await postApi.createResume(resumeName.value.trim(), content.value.trim())
        if (res.code === 200) {
          const newId = res.data.resumeId
          await postStore.fetchResumeList(1)
          editorStore.openComponentTab(`post:resume:${newId}`, resumeName.value.trim(), PostDetail, {
            postId: newId,
            postType: 'resume'
          })
        } else {
          error.value = res.message || '发布失败'
        }
      }
    } else {
      if (isEditing) {
        const res = await postApi.updatePost(props.editPostId!, title.value.trim(), content.value.trim())
        if (res.code === 200) {
          await postStore.fetchPostList(1)
          await postStore.selectPost(props.editPostId!, 'regular')
          editorStore.closeTab(`post:editor:${props.editPostId}`)
        } else {
          error.value = res.message || '保存失败'
        }
      } else {
        const res = await postApi.createPost(title.value.trim(), content.value.trim(), isAnonymous.value)
        if (res.code === 200) {
          await postStore.fetchPostList(1)
          const newId = res.data.postId
          editorStore.openComponentTab(`post:regular:${newId}`, title.value.trim(), PostDetail, {
            postId: newId,
            postType: 'regular'
          })
        } else {
          error.value = res.message || '发布失败'
        }
      }
    }
  } catch {
    error.value = isEditing ? '保存失败，请稍后重试' : '发布失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="h-full overflow-y-auto p-6">
    <div class="max-w-2xl mx-auto">
      <h2 class="text-lg font-semibold text-[#ddd] mb-6">
        {{ postType === 'resume' ? (isEditing ? '编辑简历' : '发布简历') : (isEditing ? '编辑帖子' : '发布帖子') }}
      </h2>

      <div v-if="error" class="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-sm text-red-400">
        {{ error }}
      </div>

      <!-- Resume form -->
      <template v-if="postType === 'resume'">
        <div class="mb-4">
          <label class="block text-sm text-[#aaa] mb-1.5">姓名</label>
          <input
            v-model="resumeName"
            type="text"
            placeholder="输入你的姓名"
            class="w-full bg-[#2d2d2d] border border-[#444] rounded-md px-3 py-2 text-sm text-[#ccc] outline-none focus:border-[#4a9eff] placeholder:text-[#666]"
          />
        </div>
      </template>

      <!-- Regular post form -->
      <template v-else>
        <div class="mb-4">
          <label class="block text-sm text-[#aaa] mb-1.5">标题</label>
          <input
            v-model="title"
            type="text"
            placeholder="输入帖子标题"
            class="w-full bg-[#2d2d2d] border border-[#444] rounded-md px-3 py-2 text-sm text-[#ccc] outline-none focus:border-[#4a9eff] placeholder:text-[#666]"
          />
        </div>
      </template>

      <!-- Content -->
      <div class="mb-4">
        <label class="block text-sm text-[#aaa] mb-1.5">
          {{ postType === 'resume' ? '简历内容' : '内容' }}
        </label>
        <textarea
          v-model="content"
          :placeholder="postType === 'resume' ? '输入简历内容...' : '输入帖子内容...'"
          rows="12"
          class="w-full bg-[#2d2d2d] border border-[#444] rounded-md px-3 py-2 text-sm text-[#ccc] outline-none focus:border-[#4a9eff] placeholder:text-[#666] resize-none"
        />
      </div>

      <!-- Anonymous toggle (regular only, new posts only) -->
      <div v-if="postType === 'regular' && !isEditing" class="mb-6 flex items-center gap-2">
        <input
          id="anonymous"
          v-model="isAnonymous"
          type="checkbox"
          class="w-4 h-4 rounded border-[#444] bg-[#2d2d2d] accent-[#4a9eff]"
        />
        <label for="anonymous" class="text-sm text-[#aaa]">匿名发布</label>
      </div>

      <!-- Submit + Cancel -->
      <div class="flex gap-3">
        <button
          class="flex-1 bg-[#4a9eff] text-white rounded-md py-2 text-sm font-medium hover:bg-[#3a8eef] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="submitting"
          @click="handleSubmit"
        >
          {{ submitting ? (isEditing ? '保存中...' : '发布中...') : (isEditing ? '保存' : '发布') }}
        </button>
        <button
          v-if="isEditing"
          class="flex-1 border border-[#555] text-[#aaa] rounded-md py-2 text-sm font-medium hover:bg-[#2a2a2a] transition-colors"
          @click="handleCancel"
        >
          取消
        </button>
      </div>
    </div>
  </div>
</template>
