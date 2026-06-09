import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiGet, apiPost, apiPut, apiUpload, ApiResponse } from '@/api/http'
import type { UserProfile, HeatmapPoint, ChsiVerificationStatus } from '@/types'
import { usePostStore } from '@/stores/post'

interface LoginResponse {
  token: string
  user: UserProfile
}

interface VerifyCodeRequest {
  email: string
}

interface RegisterPayload {
  email: string
  password: string
  confirmPassword: string
  verifyCode: string
}

interface LoginPayload {
  email: string
  password: string
}

interface UpdateProfilePayload {
  nickname?: string
  bio?: string
}

interface ChangePasswordPayload {
  oldPassword: string
  newPassword: string
}

interface ChsiPayload {
  realName: string
  studentId: string
  proofImage?: File
}

const AUTH_TOKEN_KEY = 'hawthorn_offer_auth_token'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(AUTH_TOKEN_KEY) || '')
  const user = ref<UserProfile | null>(null)
  const activity = ref<HeatmapPoint[]>([])
  const loading = ref(false)
  const message = ref('')
  const chsiVerification = ref<ChsiVerificationStatus | null>(null)

  const isAuthenticated = computed(() => !!user.value && !!token.value)

  function setAuthToken(nextToken: string) {
    token.value = nextToken
    localStorage.setItem(AUTH_TOKEN_KEY, nextToken)
  }

  function clearAuth() {
    token.value = ''
    user.value = null
    localStorage.removeItem(AUTH_TOKEN_KEY)
    chsiVerification.value = null
    // 清除帖子相关缓存，避免退出登录后残留上一用户的点赞和评论数据
    localStorage.removeItem('hawthorn_post_liked_ids')
    try {
      const postStore = usePostStore()
      postStore.clearLikedIds()
      postStore.comments = []
      postStore.currentDetail = null
    } catch { /* store 可能尚未初始化，忽略 */ }
  }

  async function login(payload: LoginPayload) {
    loading.value = true
    message.value = ''
    try {
      const res = await apiPost<ApiResponse<LoginResponse>>('/api/auth/login/email', payload)
      if (res.code === 200) {
        setAuthToken(res.data.token)
        user.value = res.data.user
      } else {
        message.value = res.message
      }
      return res
    } finally {
      loading.value = false
    }
  }

  async function register(payload: RegisterPayload) {
    loading.value = true
    message.value = ''
    try {
      const res = await apiPost<ApiResponse<LoginResponse>>('/api/auth/register', payload)
      if (res.code === 200) {
        setAuthToken(res.data.token)
        user.value = res.data.user
      } else {
        message.value = res.message
      }
      return res
    } finally {
      loading.value = false
    }
  }

  async function sendVerifyCode(email: string) {
    const res = await apiPost<ApiResponse<null>>('/api/auth/verify-code', { email } as VerifyCodeRequest)
    if (res.code !== 200) {
      message.value = res.message
    }
    return res
  }

  async function logout() {
    try {
      await apiPost<ApiResponse<null>>('/api/auth/logout', {}, token.value)
    } finally {
      clearAuth()
    }
  }

  async function fetchCurrentUser() {
    if (!token.value) return
    const res = await apiGet<ApiResponse<UserProfile>>('/api/users/me', token.value)
    if (res.code === 200) {
      user.value = res.data
    }
    return res
  }

  async function updateProfile(payload: UpdateProfilePayload) {
    const res = await apiPut<ApiResponse<UserProfile>>('/api/users/me/profile', payload, token.value)
    if (res.code === 200) {
      user.value = res.data
    } else {
      message.value = res.message
    }
    return res
  }

  async function uploadAvatar(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await apiUpload<ApiResponse<UserProfile>>('/api/users/me/avatar', formData, token.value)
    if (res.code === 200) {
      user.value = res.data
    } else {
      message.value = res.message
    }
    return res
  }

  async function changePassword(payload: ChangePasswordPayload) {
    const res = await apiPost<ApiResponse<null>>('/api/users/me/password', payload, token.value)
    if (res.code !== 200) {
      message.value = res.message
    }
    return res
  }

  async function submitChsi(payload: ChsiPayload) {
    const formData = new FormData()
    formData.append('realName', payload.realName)
    formData.append('studentId', payload.studentId)
    if (!payload.proofImage) {
      return {
        code: 400,
        message: '请上传学信网截图',
        data: null
      }
    }
    formData.append('proofImage', payload.proofImage)
    const res = await apiUpload<ApiResponse<ChsiVerificationStatus>>('/api/users/me/chsi/submit', formData, token.value)
    if (res.code === 200) {
      chsiVerification.value = res.data
    } else {
      message.value = res.message
    }
    return res
  }

  async function fetchChsiVerificationStatus() {
    const res = await apiGet<ApiResponse<ChsiVerificationStatus>>('/api/users/me/chsi/status', token.value)
    if (res.code === 200) {
      chsiVerification.value = res.data
    } else {
      message.value = res.message
    }
    return res
  }

  async function fetchActivity(days = 30) {
    const res = await apiGet<ApiResponse<HeatmapPoint[]>>(`/api/users/me/activity?days=${days}`, token.value)
    if (res.code === 200) {
      activity.value = res.data
    } else {
      message.value = res.message
    }
    return res
  }

  return {
    token,
    user,
    loading,
    message,
    activity,
    isAuthenticated,
    login,
    register,
    sendVerifyCode,
    logout,
    fetchCurrentUser,
    updateProfile,
    uploadAvatar,
    changePassword,
    submitChsi,
    chsiVerification,
    fetchChsiVerificationStatus,
    fetchActivity
  }
})
