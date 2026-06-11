<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePostStore } from '@/stores/post'
import { useEditorStore } from '@/stores/editor'
import { useAuthStore } from '@/stores/auth'
import * as postApi from '@/api/post'
import { useRequireAuth } from '@/composables/useRequireAuth'
import PostDetail from './PostDetail.vue'

const props = defineProps<{
  postType: 'resume' | 'regular' | 'qa'
  editPostId?: string
  editTitle?: string
  editResumeName?: string
  editContent?: string
}>()

const postStore = usePostStore()
const editorStore = useEditorStore()
const authStore = useAuthStore()

const resumeName = ref(props.editResumeName || '')
const title = ref(props.editTitle || '')
const content = ref(props.editContent || '')
const isAnonymous = ref(false)
const isPinnedPost = ref(false)
const pinHours = ref(1)
const pinPresets = [1, 6, 12, 24, 72, 168]
const pinPresetLabels = ['1h', '6h', '12h', '1天', '3天', '7天']
	const bountyBeans = ref(10)
	const bountyDuration = ref(60)

// 问答帖置顶时长不能超过求助时长
const maxPinHours = computed(() => {
  if (props.postType === 'qa') {
    return Math.max(0, Math.floor(bountyDuration.value / 60))
  }
  return 168
})

const allowedPinPresets = computed(() => {
  return pinPresets.filter(p => p <= maxPinHours.value)
})

const allowedPinPresetLabels = computed(() => {
  return pinPresets
    .map((p, i) => ({ hours: p, label: pinPresetLabels[i] }))
    .filter(item => item.hours <= maxPinHours.value)
    .map(item => item.label)
})

// 切换求助时长时，自动调整置顶时长，无可用时长则取消勾选
watch(maxPinHours, (maxH) => {
  if (maxH <= 0) {
    isPinnedPost.value = false
  } else if (pinHours.value > maxH) {
    pinHours.value = Math.max(1, maxH)
  }
})
const bountyDurationOptions = [
  { value: 3, label: '3分钟' },
  { value: 60, label: '1小时' },
  { value: 360, label: '6小时' },
  { value: 720, label: '12小时' },
  { value: 1440, label: '1天' },
  { value: 4320, label: '3天' }
]
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
  if (!useRequireAuth()) return
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
        const res = await postApi.updateResumePost(props.editPostId!, resumeName.value.trim(), content.value.trim())
        if (res.code === 200) {
          await postStore.fetchResumePostList(1)
          await postStore.selectPost(props.editPostId!, 'resume')
          editorStore.closeTab(`post:editor:${props.editPostId}`)
        } else {
          error.value = res.message || '保存失败'
        }
      } else {
        const res = await postApi.createResumePost(resumeName.value.trim(), content.value.trim())
        if (res.code === 200) {
          const newId = res.data.resumeId
          await postStore.fetchResumePostList(1)
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
        const res = await postApi.createPost(
          title.value.trim(),
          content.value.trim(),
          isAnonymous.value,
          props.postType === 'qa' ? 'qa' : 'normal',
          props.postType === 'qa' ? bountyBeans.value : 0,
          props.postType === 'qa' ? bountyDuration.value : 0
        )
        if (res.code === 200) {
          const newId = res.data.postId
          // 如果选择了置顶，先置顶再刷新列表
          if (isPinnedPost.value && pinHours.value > 0) {
            const pinRes = await postApi.pinPost(newId, pinHours.value)
            if (pinRes.code !== 200) {
              error.value = '帖子已发布，但置顶失败：' + (pinRes.message || '未知错误')
            }
          }
          if (props.postType === 'qa') {
            await postStore.fetchQaPosts(1)
            editorStore.openComponentTab(`post:regular:${newId}`, title.value.trim(), PostDetail, {
              postId: newId,
              postType: 'regular'
            })
          } else {
            await postStore.fetchPostList(1)
            editorStore.openComponentTab(`post:regular:${newId}`, title.value.trim(), PostDetail, {
              postId: newId,
              postType: 'regular'
            })
          }
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
  <div class="h-full overflow-y-auto">
    <div class="max-w-2xl mx-auto">
      <h2 class="text-lg font-semibold text-[#ddd] mb-6">
        {{ postType === 'resume' ? (isEditing ? '编辑简历' : '发布简历') : postType === 'qa' ? (isEditing ? '编辑求助' : '发布求助') : (isEditing ? '编辑社区帖' : '发布社区帖') }}
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

      <!-- Regular / QA post form -->
      <template v-if="postType === 'regular' || postType === 'qa'">
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

      <!-- Bounty settings (QA posts only, new posts only) -->
      <div v-if="postType === 'qa' && !isEditing" class="mb-4 p-4 border border-[#4a9eff]/30 rounded-md bg-[#4a9eff]/5">
        <h3 class="text-sm font-medium text-[#4a9eff] mb-3">🫘 求助设置</h3>
        <div class="mb-3">
          <label class="block text-sm text-[#aaa] mb-1.5">求助豆子数（最低10）</label>
          <input
            v-model.number="bountyBeans"
            type="number"
            min="10"
            class="w-32 bg-[#2d2d2d] border border-[#444] rounded-md px-3 py-2 text-sm text-[#ccc] outline-none focus:border-[#4a9eff]"
          />
          <span class="ml-2 text-xs text-[#888]">个豆子</span>
        </div>
        <div class="mb-3">
          <label class="block text-sm text-[#aaa] mb-1.5">求助时长</label>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="opt in bountyDurationOptions"
              :key="opt.value"
              class="text-xs px-2 py-0.5 rounded border transition-colors"
              :class="bountyDuration === opt.value ? 'bg-[#4a9eff]/20 border-[#4a9eff] text-[#4a9eff]' : 'border-[#444] text-[#888] hover:border-[#4a9eff]'"
              @click="bountyDuration = opt.value"
            >{{ opt.label }}</button>
          </div>
        </div>
        <div class="text-xs text-[#888]">
          将扣除 🫘 {{ bountyBeans + (isPinnedPost ? pinHours * 10 : 0) }} 百斩豆（余额：🫘 {{ authStore.user?.beans ?? 0 }}）
        </div>
      </div>

      <!-- Anonymous toggle (regular/qa, new posts only) -->
      <div v-if="(postType === 'regular' || postType === 'qa') && !isEditing" class="mb-6 flex items-center gap-2">
        <input
          id="anonymous"
          v-model="isAnonymous"
          type="checkbox"
          class="w-4 h-4 rounded border-[#444] bg-[#2d2d2d] accent-[#4a9eff]"
        />
        <label for="anonymous" class="text-sm text-[#aaa]">匿名发布</label>
      </div>

      <!-- Pin toggle (regular/qa, new posts only) -->
      <div v-if="(postType === 'regular' || (postType === 'qa' && maxPinHours > 0)) && !isEditing" class="mb-4">
        <div class="flex items-center gap-2 mb-2">
          <input
            id="pinPost"
            v-model="isPinnedPost"
            type="checkbox"
            class="w-4 h-4 rounded border-[#444] bg-[#2d2d2d] accent-[#e74c3c]"
          />
          <label for="pinPost" class="text-sm text-[#aaa]">📌置顶</label>
        </div>
        <div v-if="isPinnedPost" class="ml-6 flex items-center gap-2 flex-wrap">
          <template v-if="allowedPinPresets.length > 0">
            <span v-for="(label, i) in allowedPinPresetLabels" :key="i">
              <button
                class="text-xs px-2 py-0.5 rounded border transition-colors"
                :class="pinHours === allowedPinPresets[i] ? 'bg-[#4a9eff]/20 border-[#4a9eff] text-[#4a9eff]' : 'border-[#444] text-[#888] hover:border-[#4a9eff]'"
                @click="pinHours = allowedPinPresets[i]"
              >{{ label }}</button>
            </span>
          </template>
          <span v-else class="text-xs text-[#e74c3c]">求助时长过短，无法置顶</span>
          <input v-if="allowedPinPresets.length > 0" v-model.number="pinHours" type="number" min="1" :max="maxPinHours" class="w-16 bg-[#2d2d2d] border border-[#444] rounded px-2 py-1 text-sm text-[#ccc] outline-none" />
          <span v-if="allowedPinPresets.length > 0" class="text-xs text-[#888]">小时 · 消耗 🫘 {{ pinHours * 10 }}（余额：🫘 {{ authStore.user?.beans ?? 0 }}）</span>
        </div>
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
