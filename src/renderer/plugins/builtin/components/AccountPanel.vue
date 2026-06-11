<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { UserCircle, LogOut, PenLine, ShieldCheck, Flame } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { API_BASE_URL, apiGet, apiPost, type ApiResponse } from '@/api/http'
import type { ChsiVerificationStatus } from '@/types'

const authStore = useAuthStore()

const props = withDefaults(defineProps<{
  activeSection?: 'all' | 'profile' | 'avatar' | 'password' | 'chsi' | 'activity' | 'chsi-review'
}>(), {
  activeSection: 'all'
})

const mode = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const verifyCode = ref('')
const authMessage = ref('')
const settingsMessage = ref('')
const reviewMessage = ref('')
const cooldown = ref(0)
const timerRef = ref<number | null>(null)

const nickname = ref('')
const bio = ref('')
const oldPassword = ref('')
const newPassword = ref('')
const selectedAvatarName = ref('')
const avatarPreviewUrl = ref('')

const chsiName = ref('')
const chsiStudentId = ref('')
const chsiProofFile = ref<File | null>(null)
const chsiProofFileName = ref('')
const chsiProofPreviewUrl = ref('')
const pendingChsiReviews = ref<ChsiVerificationStatus[]>([])
const reviewActionLoadingId = ref('')
const pendingReviewLoading = ref(false)
const rejectReasonDrafts = ref<Record<string, string>>({})

const chsiStatusText = computed(() => {
  const status = authStore.chsiVerification?.status
  if (status === 'PENDING') return '待审核'
  if (status === 'APPROVED') return '已认证'
  if (status === 'REJECTED') return '审核未通过'
  return '未提交'
})

const heatDays = ref(30)

const heatMap = computed(() => {
  const today = new Date()
  const source = new Map(authStore.activity.map(item => [item.date, item]))
  const points = [] as { date: string; count: number; postCount: number; commentCount: number; offerCount: number }[]

  for (let i = heatDays.value - 1; i >= 0; i -= 1) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const current = source.get(key)
    points.push({
      date: key,
      count: current?.count || 0,
      postCount: current?.postCount || 0,
      commentCount: current?.commentCount || 0,
      offerCount: current?.offerCount || 0
    })
  }
  return points
})

const activeSection = computed(() => props.activeSection || 'all')

const showSection = (section: 'profile' | 'avatar' | 'password' | 'chsi' | 'activity' | 'chsi-review') => {
  return activeSection.value === 'all' || activeSection.value === section
}

const canReviewChsi = computed(() => !!authStore.user?.chsiReviewer)

const avatarUrl = computed(() => {
  return toAbsoluteAssetUrl(authStore.user?.avatar || '')
})

const heatIntensity = (count: number) => {
  if (count <= 0) return 'bg-gray-700'
  if (count <= 2) return 'bg-emerald-700'
  if (count <= 4) return 'bg-emerald-500'
  return 'bg-emerald-300'
}

const getHeatPointTitle = (point: { date: string; count: number; postCount: number; commentCount: number; offerCount: number }) => {
  if (point.count <= 0) {
    return `${point.date}\n暂无活跃记录`
  }

  const parts = [
    point.postCount > 0 ? `帖子 ${point.postCount}` : '',
    point.commentCount > 0 ? `评论 ${point.commentCount}` : '',
    point.offerCount > 0 ? `Offer ${point.offerCount}` : ''
  ].filter(Boolean)

  return `${point.date}\n总计 ${point.count}\n${parts.join('，')}`
}

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const clearAuthMessage = () => {
  authMessage.value = ''
}

const clearSettingsMessage = () => {
  settingsMessage.value = ''
}

const clearReviewMessage = () => {
  reviewMessage.value = ''
}

const toAbsoluteAssetUrl = (path: string) => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path
  }
  if (path.startsWith('/')) {
    return `${API_BASE_URL}${path}`
  }
  return `${API_BASE_URL}/${path}`
}

const switchMode = (target: 'login' | 'register') => {
  mode.value = target
  clearAuthMessage()
}

const readAuth = async () => {
  if (authStore.token) {
    await authStore.fetchCurrentUser()
    await authStore.fetchChsiVerificationStatus()
    await authStore.fetchActivity(heatDays.value)
    if (authStore.user?.chsiReviewer) {
      await fetchPendingChsiReviews()
    }
    if (authStore.user) {
      nickname.value = authStore.user.nickname || ''
      bio.value = authStore.user.bio || ''
    }
    avatarPreviewUrl.value = ''
  }
}

const doSendCode = async () => {
  clearAuthMessage()
  if (!email.value.trim()) {
    authMessage.value = '请输入邮箱'
    return
  }
  if (!isValidEmail(email.value.trim())) {
    authMessage.value = '请输入正确的邮箱格式'
    return
  }
  if (cooldown.value > 0) {
    return
  }
  const res = await authStore.sendVerifyCode(email.value.trim())
  authMessage.value = res.code === 200 ? '验证码已发送' : res.message
  if (res.code === 200) {
    cooldown.value = 60
    timerRef.value = window.setInterval(() => {
      cooldown.value = Math.max(0, cooldown.value - 1)
      if (cooldown.value <= 0 && timerRef.value !== null) {
        window.clearInterval(timerRef.value)
      }
    }, 1000)
  }
}

const doLogin = async () => {
  clearAuthMessage()
  if (!email.value.trim() || !password.value) {
    authMessage.value = '请输入邮箱和密码'
    return
  }
  if (!isValidEmail(email.value.trim())) {
    authMessage.value = '请输入正确的邮箱格式'
    return
  }
  const res = await authStore.login({ email: email.value.trim(), password: password.value })
  if (res.code === 200) {
    await readAuth()
  } else {
    authMessage.value = res.message
  }
}

const doRegister = async () => {
  clearAuthMessage()
  if (!email.value.trim() || !password.value || !confirmPassword.value || !verifyCode.value.trim()) {
    authMessage.value = '请完整填写注册信息'
    return
  }
  if (!isValidEmail(email.value.trim())) {
    authMessage.value = '请输入正确的邮箱格式'
    return
  }
  if (password.value !== confirmPassword.value) {
    authMessage.value = '两次输入的密码不一致'
    return
  }
  const res = await authStore.register({
    email: email.value.trim(),
    password: password.value,
    confirmPassword: confirmPassword.value,
    verifyCode: verifyCode.value.trim()
  })
  if (res.code === 200) {
    await readAuth()
  } else {
    authMessage.value = res.message
  }
}

const doUpdateProfile = async () => {
  clearSettingsMessage()
  if (!nickname.value.trim()) {
    settingsMessage.value = '昵称不能为空'
    return
  }
  await authStore.updateProfile({
    nickname: nickname.value.trim(),
    bio: bio.value.trim()
  })
}

const doChangePassword = async () => {
  clearSettingsMessage()
  if (!oldPassword.value || !newPassword.value) {
    settingsMessage.value = '请填写旧密码和新密码'
    return
  }
  if (oldPassword.value === newPassword.value) {
    settingsMessage.value = '新密码不能与旧密码相同'
    return
  }
  const res = await authStore.changePassword({
    oldPassword: oldPassword.value,
    newPassword: newPassword.value
  })
  if (res.code === 200) {
    oldPassword.value = ''
    newPassword.value = ''
    settingsMessage.value = '密码已更新'
  } else {
    settingsMessage.value = res.message
  }
}

const doVerifyChsi = async () => {
  clearSettingsMessage()
  if (!chsiName.value.trim() || !chsiStudentId.value.trim()) {
    settingsMessage.value = '请先填写真实姓名和学号'
    return
  }
  if (!chsiProofFile.value) {
    settingsMessage.value = '请先上传截图'
    return
  }
  const res = await authStore.submitChsi({
    realName: chsiName.value.trim(),
    studentId: chsiStudentId.value.trim(),
    proofImage: chsiProofFile.value
  })
  if (res.code === 200) {
    settingsMessage.value = '学信网认证材料已提交，等待管理员审核'
    chsiProofFile.value = null
    chsiProofFileName.value = ''
    if (chsiProofPreviewUrl.value) {
      URL.revokeObjectURL(chsiProofPreviewUrl.value)
    }
    chsiProofPreviewUrl.value = ''
  } else {
    settingsMessage.value = res.message
  }
}

const onChsiProofUpload = (evt: Event) => {
  const input = evt.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    settingsMessage.value = '未选择任何文件'
    chsiProofFile.value = null
    chsiProofFileName.value = ''
    return
  }
  if (!file.type.startsWith('image/')) {
    settingsMessage.value = '请上传图片文件'
    return
  }
  if (file.size <= 0) {
    settingsMessage.value = '文件内容为空'
    return
  }
  chsiProofFile.value = file
  chsiProofFileName.value = file.name
  if (chsiProofPreviewUrl.value) {
    URL.revokeObjectURL(chsiProofPreviewUrl.value)
  }
  chsiProofPreviewUrl.value = URL.createObjectURL(file)
}

const doLogout = async () => {
  await authStore.logout()
  clearAuthMessage()
  clearSettingsMessage()
  clearReviewMessage()
  pendingChsiReviews.value = []
  rejectReasonDrafts.value = {}
}

const fetchPendingChsiReviews = async () => {
  if (!authStore.token || !canReviewChsi.value) {
    pendingChsiReviews.value = []
    clearReviewMessage()
    return
  }

  pendingReviewLoading.value = true
  try {
    const res = await apiGet<ApiResponse<ChsiVerificationStatus[]>>('/api/users/admin/chsi/pending', authStore.token)
    if (res.code === 200) {
      pendingChsiReviews.value = res.data
    } else {
      settingsMessage.value = res.message
    }
  } catch (error) {
    settingsMessage.value = error instanceof Error ? error.message : '获取待审核列表失败'
  } finally {
    pendingReviewLoading.value = false
  }
}

const reviewSubmission = async (submissionId: string, action: 'approve' | 'reject') => {
  clearReviewMessage()
  if (!submissionId) {
    return
  }

  const rejectReason = (rejectReasonDrafts.value[submissionId] || '').trim()
  if (action === 'reject' && !rejectReason) {
    reviewMessage.value = '驳回时请填写原因'
    return
  }

  reviewActionLoadingId.value = `${submissionId}:${action}`
  try {
    const res = await apiPost<ApiResponse<ChsiVerificationStatus>>(
      `/api/users/admin/chsi/${submissionId}/review`,
      {
        action,
        rejectReason: action === 'reject' ? rejectReason : undefined
      },
      authStore.token
    )

    if (res.code === 200) {
      reviewMessage.value = action === 'approve' ? '已通过该认证申请' : '已驳回该认证申请'
      delete rejectReasonDrafts.value[submissionId]
      await fetchPendingChsiReviews()
    } else {
      reviewMessage.value = res.message
    }
  } catch (error) {
    reviewMessage.value = error instanceof Error ? error.message : '审核失败'
  } finally {
    reviewActionLoadingId.value = ''
  }
}

const onAvatarUpload = async (evt: Event) => {
  clearSettingsMessage()
  const input = evt.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    settingsMessage.value = '未选择任何文件'
    return
  }
  if (!file.type.startsWith('image/')) {
    settingsMessage.value = '请上传图片文件'
    return
  }
  if (file.size <= 0) {
    settingsMessage.value = '文件内容为空'
    return
  }

  selectedAvatarName.value = file.name
  if (avatarPreviewUrl.value) {
    URL.revokeObjectURL(avatarPreviewUrl.value)
  }
  avatarPreviewUrl.value = URL.createObjectURL(file)
  try {
    const res = await authStore.uploadAvatar(file)
    if (res.code === 200) {
      settingsMessage.value = '头像已更新'
      avatarPreviewUrl.value = ''
    } else {
      settingsMessage.value = res.message
    }
  } catch (e: unknown) {
    settingsMessage.value = e instanceof Error ? e.message : '上传失败'
  }
}

const onHeatDaysChange = async (days: number) => {
  heatDays.value = days
  await authStore.fetchActivity(days)
}

onMounted(readAuth)
watch(() => authStore.message, (next) => {
  if (next) {
    if (authStore.isAuthenticated) {
      settingsMessage.value = next
    } else {
      authMessage.value = next
    }
  }
})

watch(canReviewChsi, async (next) => {
  if (next) {
    await fetchPendingChsiReviews()
  } else {
    pendingChsiReviews.value = []
    rejectReasonDrafts.value = {}
    clearReviewMessage()
  }
})

watch(() => authStore.user?.id, () => {
  clearAuthMessage()
  clearSettingsMessage()
  clearReviewMessage()
  pendingChsiReviews.value = []
  rejectReasonDrafts.value = {}
})
</script>

<template>
  <div class="h-full p-4 space-y-4 overflow-auto text-sm text-vscode-text">
    <div class="flex items-center justify-between">
      <h2 class="text-base font-semibold">账户与个人设置</h2>
      <button
        v-if="authStore.isAuthenticated"
        class="px-2 py-1 border border-vscode-border rounded text-vscode-warning hover:border-vscode-warning"
        @click="doLogout"
      >
        <span class="inline-flex items-center gap-1"><LogOut class="w-4 h-4"/> 退出</span>
      </button>
    </div>

    <template v-if="!authStore.isAuthenticated">
      <div class="flex gap-2">
        <button
          class="px-3 py-1 rounded"
          :class="mode === 'login' ? 'bg-vscode-selected' : 'bg-vscode-active'"
          @click="switchMode('login')"
        >登录</button>
        <button
          class="px-3 py-1 rounded"
          :class="mode === 'register' ? 'bg-vscode-selected' : 'bg-vscode-active'"
          @click="switchMode('register')"
        >注册</button>
      </div>

      <div class="grid gap-3">
        <div v-if="authMessage" class="rounded bg-vscode-active px-3 py-2 text-vscode-warning">{{ authMessage }}</div>
        <label class="grid gap-1">
          <span>邮箱</span>
          <input v-model="email" class="bg-vscode-active border border-vscode-border px-2 py-1 rounded" />
        </label>
        <label class="grid gap-1">
          <span>密码</span>
          <input v-model="password" type="password" class="bg-vscode-active border border-vscode-border px-2 py-1 rounded" />
        </label>
        <label v-if="mode === 'register'" class="grid gap-1">
          <span>确认密码</span>
          <input v-model="confirmPassword" type="password" class="bg-vscode-active border border-vscode-border px-2 py-1 rounded" />
        </label>
        <label v-if="mode === 'register'" class="grid gap-1">
          <span>验证码</span>
          <div class="flex gap-2">
            <input v-model="verifyCode" class="flex-1 bg-vscode-active border border-vscode-border px-2 py-1 rounded" />
            <button
              class="px-2 py-1 border border-vscode-border rounded"
              @click="doSendCode"
              :disabled="cooldown > 0"
            >
              {{ cooldown > 0 ? cooldown + 's' : '发送验证码' }}
            </button>
          </div>
        </label>

        <button
          class="self-start px-3 py-1 bg-vscode-selected rounded"
          @click="mode === 'login' ? doLogin() : doRegister()"
        >
          {{ mode === 'login' ? '登录' : '注册' }}
        </button>
      </div>
    </template>

    <template v-else>
      <div v-if="settingsMessage" class="rounded bg-vscode-active px-3 py-2 text-vscode-warning">{{ settingsMessage }}</div>
      <section v-if="showSection('profile')" class="border border-vscode-border rounded p-3 space-y-2">
        <h3 class="text-xs uppercase tracking-wider text-vscode-text-secondary">个人信息</h3>
        <div class="flex items-center gap-2">
          <img
            v-if="avatarPreviewUrl || avatarUrl"
            :src="avatarPreviewUrl || avatarUrl"
            class="w-12 h-12 rounded-full object-cover border border-vscode-border"
          />
          <div v-else class="w-12 h-12 rounded-full bg-vscode-active border border-vscode-border flex items-center justify-center">
            <UserCircle class="w-8 h-8 text-vscode-icon" />
          </div>
          <div class="text-xs">
            <p>邮箱：{{ authStore.user?.email }}</p>
            <p>昵称：{{ authStore.user?.nickname }}</p>
            <p>认证：{{ authStore.user?.chsiVerified ? '已认证' : '未认证' }}</p>
          </div>
        </div>

        <label class="grid gap-1">
          <span>昵称</span>
          <input v-model="nickname" class="bg-vscode-active border border-vscode-border px-2 py-1 rounded" />
        </label>
        <label class="grid gap-1">
          <span>简介</span>
          <textarea v-model="bio" rows="3" class="bg-vscode-active border border-vscode-border px-2 py-1 rounded" />
        </label>
        <button class="px-2 py-1 bg-vscode-selected rounded" @click="doUpdateProfile">
          <span class="inline-flex gap-1 items-center"><PenLine class="w-4 h-4"/> 保存资料</span>
        </button>
      </section>

      <section v-if="showSection('avatar')" class="border border-vscode-border rounded p-3 space-y-2">
        <h3 class="text-xs uppercase tracking-wider text-vscode-text-secondary">头像</h3>
        <label class="grid gap-1">
          <span>头像</span>
          <input type="file" accept="image/*" @change="onAvatarUpload" />
          <span v-if="selectedAvatarName" class="text-xs text-vscode-text-secondary">已选择：{{ selectedAvatarName }}</span>
        </label>
      </section>

      <section v-if="showSection('password')" class="border border-vscode-border rounded p-3 space-y-2">
        <h3 class="text-xs uppercase tracking-wider text-vscode-text-secondary">安全设置</h3>
        <label class="grid gap-1">
          <span>旧密码</span>
          <input v-model="oldPassword" type="password" class="bg-vscode-active border border-vscode-border px-2 py-1 rounded" />
        </label>
        <label class="grid gap-1">
          <span>新密码</span>
          <input v-model="newPassword" type="password" class="bg-vscode-active border border-vscode-border px-2 py-1 rounded" />
        </label>
        <button class="px-2 py-1 border border-vscode-border rounded" @click="doChangePassword">
          修改密码
        </button>
      </section>

      <section v-if="showSection('chsi')" class="border border-vscode-border rounded p-3 space-y-2">
        <h3 class="text-xs uppercase tracking-wider text-vscode-text-secondary">学信网认证</h3>
        <div class="inline-flex items-center gap-1 text-vscode-warning text-xs">
          <ShieldCheck class="w-4 h-4" />
          <span>当前状态：{{ chsiStatusText }}</span>
        </div>
        <div v-if="authStore.chsiVerification?.rejectReason" class="text-xs text-vscode-warning">
          未通过原因：{{ authStore.chsiVerification.rejectReason }}
        </div>
        <div v-if="authStore.chsiVerification?.submittedAt" class="text-xs text-vscode-text-secondary">
          最近提交：{{ authStore.chsiVerification.submittedAt }}
        </div>
        <label class="grid gap-1">
          <span>真实姓名</span>
          <input v-model="chsiName" class="bg-vscode-active border border-vscode-border px-2 py-1 rounded" />
        </label>
        <label class="grid gap-1">
          <span>学号</span>
          <input v-model="chsiStudentId" class="bg-vscode-active border border-vscode-border px-2 py-1 rounded" />
        </label>
        <label class="grid gap-1">
          <span>学信网截图（含姓名与学号）</span>
          <div class="flex items-center gap-2">
            <input type="file" accept="image/*" @change="onChsiProofUpload" />
          </div>
          <span v-if="chsiProofFileName" class="text-xs text-vscode-text-secondary">已选择：{{ chsiProofFileName }}</span>
          <img
            v-if="chsiProofPreviewUrl"
            :src="chsiProofPreviewUrl"
            class="w-24 h-24 rounded border border-vscode-border object-cover"
            alt="chsi-proof-preview"
          />
        </label>
        <button class="px-2 py-1 border border-vscode-border rounded" @click="doVerifyChsi">
          提交认证
        </button>
      </section>

      <section v-if="canReviewChsi && showSection('chsi-review')" class="border border-vscode-border rounded p-3 space-y-3">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-xs uppercase tracking-wider text-vscode-text-secondary">认证审核</h3>
          <button class="px-2 py-1 border border-vscode-border rounded text-xs" @click="fetchPendingChsiReviews">
            刷新列表
          </button>
        </div>

        <div v-if="reviewMessage" class="rounded bg-vscode-active px-3 py-2 text-vscode-warning">
          {{ reviewMessage }}
        </div>

        <div v-if="pendingReviewLoading" class="text-xs text-vscode-text-secondary">正在加载待审核记录...</div>
        <div v-else-if="pendingChsiReviews.length === 0" class="text-xs text-vscode-text-secondary">当前没有待审核的学信网认证</div>

        <div v-else class="space-y-3">
          <div
            v-for="item in pendingChsiReviews"
            :key="item.id"
            class="rounded border border-vscode-border p-3 space-y-2"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="text-sm font-medium text-vscode-text">
                {{ item.realName || '未填写姓名' }}
                <span class="ml-2 text-xs text-vscode-text-secondary">学号：{{ item.studentId || '未填写' }}</span>
              </div>
              <span class="text-xs text-vscode-text-secondary">提交于：{{ item.submittedAt || '-' }}</span>
            </div>

            <img
              v-if="item.proofImageUrl"
              :src="toAbsoluteAssetUrl(item.proofImageUrl)"
              class="max-h-56 rounded border border-vscode-border object-contain bg-vscode-active"
              alt="chsi-review-proof"
            />

            <label class="grid gap-1">
              <span class="text-xs text-vscode-text-secondary">驳回原因（仅驳回时必填）</span>
              <textarea
                v-model="rejectReasonDrafts[item.id || '']"
                rows="2"
                class="bg-vscode-active border border-vscode-border px-2 py-1 rounded"
                placeholder="例如：截图信息不完整、姓名学号不清晰"
              />
            </label>

            <div class="flex items-center gap-2">
              <button
                class="px-2 py-1 rounded bg-emerald-700 text-white disabled:opacity-60"
                :disabled="reviewActionLoadingId !== ''"
                @click="reviewSubmission(item.id || '', 'approve')"
              >
                {{ reviewActionLoadingId === `${item.id}:approve` ? '通过中...' : '通过' }}
              </button>
              <button
                class="px-2 py-1 rounded border border-vscode-warning text-vscode-warning disabled:opacity-60"
                :disabled="reviewActionLoadingId !== ''"
                @click="reviewSubmission(item.id || '', 'reject')"
              >
                {{ reviewActionLoadingId === `${item.id}:reject` ? '驳回中...' : '驳回' }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section v-if="showSection('activity')" class="border border-vscode-border rounded p-3 space-y-2">
        <h3 class="text-xs uppercase tracking-wider text-vscode-text-secondary">Activity 热力图</h3>
        <div class="flex items-center gap-2 text-xs">
          <button class="px-2 py-1 border border-vscode-border rounded" @click="onHeatDaysChange(14)">14天</button>
          <button class="px-2 py-1 border border-vscode-border rounded" @click="onHeatDaysChange(30)">30天</button>
          <button class="px-2 py-1 border border-vscode-border rounded" @click="onHeatDaysChange(90)">90天</button>
        </div>
        <div class="grid grid-cols-10 gap-1">
          <div
            v-for="point in heatMap"
            :key="point.date"
            :title="getHeatPointTitle(point)"
            :class="[heatIntensity(point.count), 'h-4 rounded-sm']"
          ></div>
        </div>
        <p class="text-xs text-vscode-text-secondary">
          <Flame class="w-4 h-4 inline" /> 活跃度基于近期发帖、评论和 offer 记录
        </p>
      </section>
    </template>
  </div>
</template>
