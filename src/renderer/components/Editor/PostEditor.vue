<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { usePostStore } from '@/stores/post'
import { useEditorStore } from '@/stores/editor'
import { useAuthStore } from '@/stores/auth'
import * as postApi from '@/api/post'
import { apiGet, type ApiResponse } from '@/api/http'
import type { PersonalResume } from '@/api/resume'
import type { ResumePostDetail } from '@/api/post'
import { useRequireAuth } from '@/composables/useRequireAuth'
import { Bean, Pin } from 'lucide-vue-next'
import PostDetail from './PostDetail.vue'

const props = defineProps<{
  postType: 'resume' | 'regular' | 'qa' | 'referral'
  editPostId?: string
  editTitle?: string
  editResumeName?: string
  editContent?: string
  editPromoText?: string
  editPrice?: number
  editResumeId?: string
  editReferralCode?: string
  editReferralLink?: string
}>()

const postStore = usePostStore()
const editorStore = useEditorStore()
const authStore = useAuthStore()

const resumeName = ref(props.editResumeName || '')
const title = ref(props.editTitle || '')
const content = ref(props.editContent || '')

// 简历帖专用状态
const personalResumes = ref<PersonalResume[]>([])
const selectedResumeId = ref(props.editResumeId || '')
const promoText = ref(props.editPromoText || '')
const price = ref(props.editPrice || 50)
const loadingResumes = ref(false)

async function loadMyResumes() {
  loadingResumes.value = true
  try {
    const resp = await apiGet<ApiResponse<{ items: PersonalResume[]; total: number }>>(
      `/api/resumes?page=1&size=100`, authStore.token || undefined
    )
    if (resp.code === 200) {
      personalResumes.value = resp.data.items
    }
  } finally {
    loadingResumes.value = false
  }
}

onMounted(() => {
  if (props.postType === 'resume') {
    loadMyResumes()
  }
})
const isAnonymous = ref(false)
const isReferralPost = ref(props.postType === 'referral')
const referralCode = ref(props.editReferralCode || '')
const referralLink = ref(props.editReferralLink || '')
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

const selectedResumePreview = ref('')

// 选择简历后加载完整内容用于预览
watch(selectedResumeId, async (newId) => {
  if (!newId) {
    selectedResumePreview.value = ''
    return
  }
  try {
    const resp = await apiGet<ApiResponse<PersonalResume>>(
      `/api/resumes/${newId}`, authStore.token || undefined
    )
    if (resp.code === 200 && resp.data?.content) {
      const c = resp.data.content
      selectedResumePreview.value = c.length > 200 ? c.substring(0, 200) + '...' : c
    } else {
      // 兜底：从已加载列表中取
      const resume = personalResumes.value.find(r => r.id === newId)
      const c = resume?.content || ''
      selectedResumePreview.value = c ? (c.length > 200 ? c.substring(0, 200) + '...' : c) : ''
    }
  } catch {
    selectedResumePreview.value = ''
  }
})

function onPriceBlur() {
  if (price.value < 1 || !Number.isInteger(price.value)) {
    price.value = 50
  }
}

function onBountyBlur() {
  if (bountyBeans.value < 10 || !Number.isInteger(bountyBeans.value)) {
    bountyBeans.value = 10
  }
}

function onPinBlur() {
  if (pinHours.value < 1 || !Number.isInteger(pinHours.value)) {
    pinHours.value = 1
  } else if (pinHours.value > maxPinHours.value) {
    pinHours.value = maxPinHours.value
  }
}

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
    if (!selectedResumeId.value) {
      error.value = '请选择一份简历'
      return
    }
    if (!promoText.value.trim()) {
      error.value = '宣传文字不能为空'
      return
    }
    if (price.value < 1 || !Number.isInteger(price.value)) {
      error.value = "价格必须为正整数"
      return
    }
  } else {
    if (!title.value.trim() || !content.value.trim()) {
      error.value = '标题和内容不能为空'
      return
    }
  }

  if (props.postType === 'qa' && !isEditing) {
    if (bountyBeans.value < 10 || !Number.isInteger(bountyBeans.value)) {
      error.value = '求助豆子数最低 10，必须为正整数'
      return
    }
  }

  if (props.postType === 'referral' || isReferralPost.value) {
    if (!referralCode.value.trim()) {
      error.value = '内推码不能为空'
      return
    }
    if (!referralLink.value.trim()) {
      error.value = '内推链接不能为空'
      return
    }
  }

  if (isPinnedPost.value) {
    if (pinHours.value < 1 || !Number.isInteger(pinHours.value) || pinHours.value > maxPinHours.value) {
      error.value = `置顶时长需为 1-${maxPinHours.value} 小时的正整数`
      return
    }
  }

  submitting.value = true
  try {
    if (props.postType === 'resume') {
      if (isEditing) {
        const res = await postApi.updateResumePost(props.editPostId!, {
          resumeId: selectedResumeId.value || undefined,
          promoText: promoText.value.trim(),
          price: price.value
        })
        if (res.code === 200) {
          await postStore.fetchResumePostList(1)
          await postStore.selectPost(props.editPostId!, 'resume')
          editorStore.closeTab(`post:editor:${props.editPostId}`)
        } else {
          error.value = res.message || '保存失败'
        }
      } else {
        const res = await postApi.createResumePost(selectedResumeId.value, promoText.value.trim(), price.value)
        if (res.code === 200) {
          const newId = res.data.resumeId
          await postStore.fetchResumePostList(1)
          editorStore.openComponentTab(`post:resume:${newId}`, '简历帖', PostDetail, {
            postId: newId,
            postType: 'resume'
          })
        } else {
          error.value = res.message || '发布失败'
        }
      }
    } else {
      if (isEditing) {
        const isReferralEdit = props.postType === 'referral' || isReferralPost.value
        const res = await postApi.updatePost(
          props.editPostId!,
          title.value.trim(),
          content.value.trim(),
          isReferralEdit ? referralCode.value.trim() : undefined,
          isReferralEdit ? referralLink.value.trim() : undefined
        )
        if (res.code === 200) {
          await postStore.fetchPostList(1)
          await postStore.selectPost(props.editPostId!, 'regular')
          editorStore.closeTab(`post:editor:${props.editPostId}`)
        } else {
          error.value = res.message || '保存失败'
        }
      } else {
        const actualPostType = props.postType === 'qa' ? 'qa' : (props.postType === 'referral' || isReferralPost.value) ? 'referral' : 'normal'
        const res = await postApi.createPost(
          title.value.trim(),
          content.value.trim(),
          isAnonymous.value,
          actualPostType,
          props.postType === 'qa' ? bountyBeans.value : 0,
          props.postType === 'qa' ? bountyDuration.value : 0,
          actualPostType === 'referral' ? referralCode.value.trim() : undefined,
          actualPostType === 'referral' ? referralLink.value.trim() : undefined
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
      <h2 class="text-lg font-semibold text-vscode-text mb-6">
        {{ postType === 'resume' ? (isEditing ? '编辑简历' : '发布简历') : postType === 'qa' ? (isEditing ? '编辑求助' : '发布求助') : (postType === 'referral' || isReferralPost) ? (isEditing ? '编辑内推帖' : '发布内推帖') : (isEditing ? '编辑社区帖' : '发布社区帖') }}
      </h2>

      <div v-if="error" class="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-sm text-danger">
        {{ error }}
      </div>

      <!-- Resume form -->
      <template v-if="postType === 'resume'">
        <div class="mb-4">
          <label class="block text-sm text-vscode-text-secondary mb-1.5">选择简历</label>
          <select
            v-model="selectedResumeId"
            class="w-full bg-vscode-active border border-vscode-border rounded-md px-3 py-2.5 text-sm text-vscode-text outline-none focus:border-primary"
          >
            <option value="" disabled>请选择一份个人简历</option>
            <option v-for="r in personalResumes" :key="r.id" :value="r.id">
              {{ r.resumeName }}
            </option>
          </select>
          <p v-if="personalResumes.length === 0 && !loadingResumes" class="text-xs text-vscode-text-secondary mt-1">
            暂无简历，请先在个人设置中创建简历
          </p>
        </div>
        <div class="mb-4">
          <label class="block text-sm text-vscode-text-secondary mb-1.5">宣传文字</label>
          <textarea
            v-model="promoText"
            placeholder="写一段宣传文字，让更多人了解你的简历亮点..."
            rows="4"
            class="w-full bg-vscode-active border border-vscode-border rounded-md px-3 py-2.5 text-sm text-vscode-text outline-none focus:border-primary placeholder:text-vscode-text-secondary resize-none"
          ></textarea>
        </div>
        <div class="mb-4">
          <label class="block text-sm text-vscode-text-secondary mb-1.5">查看完整简历价格（<Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /> 豆子）</label>
          <input
            v-model.number="price"
            type="number"
            min="1"
            max="99999"
            class="w-32 bg-vscode-active border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
            :class="price < 1 || !Number.isInteger(price) ? 'border-red-500/50 text-danger' : 'border-vscode-border text-vscode-text'"
            @blur="onPriceBlur"
          />
          <span v-if="price < 1 || !Number.isInteger(price)" class="text-xs ml-2 text-danger">请输入有效正整数</span>
          <span v-else class="text-xs ml-2 text-vscode-text-secondary">默认 50 <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /></span>
        </div>
      </template>

      <!-- Regular / QA / Referral post form -->
      <template v-if="postType === 'regular' || postType === 'qa' || postType === 'referral'">
        <div class="mb-4">
          <label class="block text-sm text-vscode-text-secondary mb-1.5">标题</label>
          <input
            v-model="title"
            type="text"
            placeholder="输入帖子标题"
            class="w-full bg-vscode-active border border-vscode-border rounded-md px-3 py-2 text-sm text-vscode-text outline-none focus:border-primary placeholder:text-vscode-text-secondary"
          />
        </div>
      </template>

      <!-- Content -->
      <template v-if="postType !== 'resume'">
        <div class="mb-4">
          <label class="block text-sm text-vscode-text-secondary mb-1.5">内容</label>
          <textarea
            v-model="content"
            placeholder="输入帖子内容..."
            rows="12"
            class="w-full bg-vscode-active border border-vscode-border rounded-md px-3 py-2 text-sm text-vscode-text outline-none focus:border-primary placeholder:text-vscode-text-secondary resize-none"
          />
        </div>
      </template>
      <!-- Resume preview -->
      <template v-else>
        <div class="mb-4">
          <label class="block text-sm text-vscode-text-secondary mb-1.5">简历预览（前200字）</label>
          <div class="w-full bg-vscode-active border border-vscode-border rounded-md px-3 py-3 text-sm text-vscode-text-secondary whitespace-pre-wrap min-h-[100px]">
            {{ selectedResumePreview || '请先选择一份简历' }}
          </div>
        </div>
      </template>

      <!-- Bounty settings (QA posts only, new posts only) -->
      <div v-if="postType === 'qa' && !isEditing" class="mb-4 p-4 border border-primary/30 rounded-md bg-primary/5">
        <h3 class="text-sm font-medium text-primary mb-3"><Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /> 求助设置</h3>
        <div class="mb-3">
          <label class="block text-sm text-vscode-text-secondary mb-1.5">求助豆子数（最低10）</label>
          <input
            v-model.number="bountyBeans"
            type="number"
            min="10"
            max="99999"
            class="w-32 bg-vscode-active border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
            :class="bountyBeans < 10 || !Number.isInteger(bountyBeans) ? 'border-red-500/50 text-danger' : 'border-vscode-border text-vscode-text'"
            @blur="onBountyBlur"
          />
          <span class="ml-2 text-xs" :class="bountyBeans < 10 || !Number.isInteger(bountyBeans) ? 'text-danger' : 'text-vscode-text-secondary'">
            {{ bountyBeans < 10 || !Number.isInteger(bountyBeans) ? '最低 10 豆' : '个豆子' }}
          </span>
        </div>
        <div class="mb-3">
          <label class="block text-sm text-vscode-text-secondary mb-1.5">求助时长</label>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="opt in bountyDurationOptions"
              :key="opt.value"
              class="text-xs px-2 py-0.5 rounded border transition-colors"
              :class="bountyDuration === opt.value ? 'bg-primary/20 border-primary text-primary' : 'border-vscode-border text-vscode-text-secondary hover:border-primary'"
              @click="bountyDuration = opt.value"
            >{{ opt.label }}</button>
          </div>
        </div>
        <div class="text-xs text-vscode-text-secondary">
          将扣除 {{ bountyBeans + (isPinnedPost ? pinHours * 10 : 0)  }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /> 百斩豆（余额：{{ authStore.user?.beans ?? 0  }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" />）
        </div>
      </div>

      <!-- Referral post toggle (regular post type, new posts only) -->
      <!-- Referral fields for editing -->
      <div v-if="isEditing && isReferralPost" class="mb-4 p-4 border border-primary/30 rounded-md bg-primary/5">
        <div class="mb-3">
          <label class="block text-sm text-vscode-text-secondary mb-1.5">内推码</label>
          <input
            v-model="referralCode"
            type="text"
            placeholder="输入内推码"
            class="w-full bg-vscode-active border border-vscode-border rounded-md px-3 py-2 text-sm text-vscode-text outline-none focus:border-primary placeholder:text-vscode-text-secondary"
          />
        </div>
        <div>
          <label class="block text-sm text-vscode-text-secondary mb-1.5">内推链接</label>
          <input
            v-model="referralLink"
            type="url"
            placeholder="输入内推链接（支持跳转）"
            class="w-full bg-vscode-active border border-vscode-border rounded-md px-3 py-2 text-sm text-vscode-text outline-none focus:border-primary placeholder:text-vscode-text-secondary"
          />
        </div>
      </div>

      <!-- Referral post toggle (new posts only) -->
      <div v-if="!isEditing && (postType === 'regular' || postType === 'referral')" class="mb-4">
        <div v-if="postType === 'regular'" class="flex items-center gap-2 mb-3">
          <button
            class="text-xs px-3 py-1 rounded border transition-colors"
            :class="!isReferralPost ? 'bg-primary/20 border-primary text-primary' : 'border-vscode-border text-vscode-text-secondary hover:border-primary'"
            @click="isReferralPost = false"
          >普通帖</button>
          <button
            class="text-xs px-3 py-1 rounded border transition-colors"
            :class="isReferralPost ? 'bg-primary/20 border-primary text-primary' : 'border-vscode-border text-vscode-text-secondary hover:border-primary'"
            @click="isReferralPost = true"
          >内推帖</button>
        </div>

        <!-- Referral fields -->
        <div v-if="isReferralPost" class="p-4 border border-primary/30 rounded-md bg-primary/5">
          <div class="mb-3">
            <label class="block text-sm text-vscode-text-secondary mb-1.5">内推码</label>
            <input
              v-model="referralCode"
              type="text"
              placeholder="输入内推码"
              class="w-full bg-vscode-active border border-vscode-border rounded-md px-3 py-2 text-sm text-vscode-text outline-none focus:border-primary placeholder:text-vscode-text-secondary"
            />
          </div>
          <div>
            <label class="block text-sm text-vscode-text-secondary mb-1.5">内推链接</label>
            <input
              v-model="referralLink"
              type="url"
              placeholder="输入内推链接（支持跳转）"
              class="w-full bg-vscode-active border border-vscode-border rounded-md px-3 py-2 text-sm text-vscode-text outline-none focus:border-primary placeholder:text-vscode-text-secondary"
            />
          </div>
        </div>
      </div>

      <!-- Anonymous toggle (regular/qa, new posts only, not for referral) -->
      <div v-if="(postType === 'regular' || postType === 'qa') && !isEditing && !isReferralPost" class="mb-6 flex items-center gap-2">
        <input
          id="anonymous"
          v-model="isAnonymous"
          type="checkbox"
          class="w-4 h-4 rounded border-vscode-border bg-vscode-active accent-primary"
        />
        <label for="anonymous" class="text-sm text-vscode-text-secondary">匿名发布</label>
      </div>

      <!-- Pin toggle (regular/referral/qa, new posts only) -->
      <div v-if="(postType === 'regular' || postType === 'referral' || (postType === 'qa' && maxPinHours > 0)) && !isEditing" class="mb-4">
        <div class="flex items-center gap-2 mb-2">
          <input
            id="pinPost"
            v-model="isPinnedPost"
            type="checkbox"
            class="w-4 h-4 rounded border-vscode-border bg-vscode-active accent-danger"
          />
          <label for="pinPost" class="text-sm text-vscode-text-secondary"><Pin class="w-3.5 h-3.5 inline-block" />置顶</label>
        </div>
        <div v-if="isPinnedPost" class="ml-6 flex items-center gap-2 flex-wrap">
          <template v-if="allowedPinPresets.length > 0">
            <span v-for="(label, i) in allowedPinPresetLabels" :key="i">
              <button
                class="text-xs px-2 py-0.5 rounded border transition-colors"
                :class="pinHours === allowedPinPresets[i] ? 'bg-primary/20 border-primary text-primary' : 'border-vscode-border text-vscode-text-secondary hover:border-primary'"
                @click="pinHours = allowedPinPresets[i]"
              >{{ label }}</button>
            </span>
          </template>
          <span v-else class="text-xs text-danger">求助时长过短，无法置顶</span>
          <input v-if="allowedPinPresets.length > 0" v-model.number="pinHours" type="number" min="1" :max="maxPinHours"
            class="w-16 bg-vscode-active border rounded px-2 py-1 text-sm outline-none"
            :class="pinHours < 1 || !Number.isInteger(pinHours) || pinHours > maxPinHours ? 'border-red-500/50 text-danger' : 'border-vscode-border text-vscode-text'"
            @blur="onPinBlur"
          />
          <span v-if="allowedPinPresets.length > 0 && (pinHours < 1 || !Number.isInteger(pinHours) || pinHours > maxPinHours)" class="text-xs text-danger">
            {{ pinHours < 1 || !Number.isInteger(pinHours) ? '至少 1 小时' : `不超过 ${maxPinHours} 小时` }}
          </span>
          <span v-else-if="allowedPinPresets.length > 0" class="text-xs text-vscode-text-secondary">
            小时 · 消耗 {{ pinHours * 10  }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" />（余额：{{ authStore.user?.beans ?? 0  }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" />）
          </span>
        </div>
      </div>

      <!-- Submit + Cancel -->
      <div class="flex gap-3">
        <button
          class="flex-1 bg-primary text-white rounded-md py-2 text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="submitting"
          @click="handleSubmit"
        >
          {{ submitting ? (isEditing ? '保存中...' : '发布中...') : (isEditing ? '保存' : '发布') }}
        </button>
        <button
          v-if="isEditing"
          class="flex-1 border border-vscode-border text-vscode-text-secondary rounded-md py-2 text-sm font-medium hover:bg-vscode-active transition-colors"
          @click="handleCancel"
        >
          取消
        </button>
      </div>
    </div>
  </div>
</template>
