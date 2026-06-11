import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { PostListVO, ResumePostListVO, ResumePostDetail, PostDetail, CommentVO, PageResponse } from '@/api/post'
import * as postApi from '@/api/post'
import { apiGet } from '@/api/http'
import type { ApiResponse } from '@/api/http'
import { useAuthStore } from '@/stores/auth'

export type PostTab = 'resume' | 'regular' | 'qa' | 'myOwn'

const LIKED_IDS_KEY = 'hawthorn_post_liked_ids'

function loadLikedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LIKED_IDS_KEY)
    if (raw) {
      return new Set(JSON.parse(raw))
    }
  } catch { /* ignore */ }
  return new Set()
}

function saveLikedIds(ids: Set<string>) {
  try {
    localStorage.setItem(LIKED_IDS_KEY, JSON.stringify([...ids]))
  } catch { /* ignore */ }
}

export const usePostStore = defineStore('post', () => {
  const activeTab = ref<PostTab>('resume')
  const resumeKeyword = ref('')
  const regularKeyword = ref('')
  const keyword = computed(() => activeTab.value === 'resume' ? resumeKeyword.value : regularKeyword.value)
  const sort = ref('hot')
  const loading = ref(false)

  const resumePostList = ref<ResumePostListVO[]>([])
  const resumePostTotal = ref(0)
  const resumePostPage = ref(1)

  const postList = ref<PostListVO[]>([])
  const postTotal = ref(0)
  const postPage = ref(1)

  const selectedId = ref<string | null>(null)
  const selectedType = ref<PostTab | null>(null)
  const currentDetail = ref<ResumePostDetail | PostDetail | null>(null)
  const comments = ref<CommentVO[]>([])
  const loadingDetail = ref(false)

  const myResumeId = ref<string | null>(null)

  const likedIds = ref<Set<string>>(loadLikedIds())

  watch(likedIds, (val) => {
    saveLikedIds(val)
  }, { deep: false })

  async function fetchResumePostList(page = 1, kw?: string) {
    loading.value = true
    try {
      const kwParam = kw !== undefined ? kw : keyword.value
      const res = await postApi.getResumePostList(page, 10, kwParam || undefined)
      if (res.code === 200) {
        resumePostList.value = (res.data.items || []).map(item => ({
          ...item,
          commentCount: item.commentCount || 0
        }))
        resumePostTotal.value = res.data.total
        resumePostPage.value = page
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchPostList(page = 1, kw?: string, s?: string) {
    loading.value = true
    try {
      const kwParam = kw !== undefined ? kw : keyword.value
      const sParam = s !== undefined ? s : sort.value
      const res = await postApi.getPostList(page, 10, kwParam || undefined, sParam)
      if (res.code === 200) {
        postList.value = (res.data.items || []).map(item => ({
          ...item,
          likeCount: item.likeCount || 0,
          commentCount: item.commentCount || 0
        }))
        postTotal.value = res.data.total
        postPage.value = page
        // 从服务端同步点赞状态（处理跨标签页/跨设备同步）
        syncLikedIdsFromList(res.data.items || [])
      }
    } finally {
      loading.value = false
    }
  }

  const qaFilter = ref('')

  async function fetchQaPosts(page = 1, kw?: string, s?: string, bs?: string) {
    loading.value = true
    try {
      const kwParam = kw !== undefined ? kw : keyword.value
      const sParam = s !== undefined ? s : sort.value
      const bsParam = bs !== undefined ? bs : qaFilter.value
      const res = await postApi.getPostList(page, 10, kwParam || undefined, sParam, 'qa', bsParam || undefined)
      if (res.code === 200) {
        postList.value = (res.data.items || []).map(item => ({
          ...item,
          likeCount: item.likeCount || 0,
          commentCount: item.commentCount || 0
        }))
        postTotal.value = res.data.total
        postPage.value = page
        syncLikedIdsFromList(res.data.items || [])
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchMyPosts(page = 1, keyword?: string) {
    const authStore = useAuthStore()
    loading.value = true
    try {
      let url = `/api/posts?page=${page}&size=10&sort=latest&myOwn=true`
      if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`
      const res = await apiGet<ApiResponse<PageResponse<PostListVO>>>(url, authStore.token || undefined)
      if (res.code === 200 && res.data) {
        postList.value = (res.data.items || []).map(item => ({
          ...item,
          likeCount: item.likeCount || 0,
          commentCount: item.commentCount || 0
        }))
        postTotal.value = res.data.total
        postPage.value = page
      }
    } finally {
      loading.value = false
    }
  }

  async function selectPost(id: string, type: PostTab) {
    selectedId.value = id
    selectedType.value = type
    loadingDetail.value = true
    try {
      if (type === 'resume') {
        const res = await postApi.getResumePostDetail(id)
        if (res.code === 200) {
          currentDetail.value = res.data
        }
      } else {
        const res = await postApi.getPostDetail(id)
        if (res.code === 200) {
          currentDetail.value = res.data
          // 从服务端同步点赞状态
          const newLiked = new Set(likedIds.value)
          if (res.data.isLiked) {
            newLiked.add(id)
          } else {
            newLiked.delete(id)
          }
          likedIds.value = newLiked
        }
      }
      await fetchComments(id, type)
    } finally {
      loadingDetail.value = false
    }
  }

  async function fetchComments(targetId: string, type: PostTab) {
    const targetType = 'post'
    const res = await postApi.getComments(targetType, targetId)
    if (res.code === 200) {
      comments.value = res.data || []
    }
  }

  async function toggleLike(id: string, type: PostTab) {
    // Only regular posts support likes
    if (type !== 'regular') return
    const isLiked = likedIds.value.has(id)
    try {
      if (isLiked) {
        await postApi.unlikePost(id)
      } else {
        await postApi.likePost(id)
      }

      const newSet = new Set(likedIds.value)
      if (isLiked) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      likedIds.value = newSet

      const item = postList.value.find((p: PostListVO) => p.id === id)
      if (item) {
        const currentCount = item.likeCount || 0
        item.likeCount = currentCount + (isLiked ? -1 : 1)
        item.isLiked = !isLiked
      }

      if (currentDetail.value && selectedId.value === id) {
        const detail = currentDetail.value as { likeCount?: number; isLiked?: boolean }
        const currentCount = detail.likeCount || 0
        detail.likeCount = currentCount + (isLiked ? -1 : 1)
        detail.isLiked = !isLiked
      }
    } catch {
      // API call failed, don't update local state
    }
  }

  function setTab(tab: PostTab) {
    activeTab.value = tab
    selectedId.value = null
    selectedType.value = null
    currentDetail.value = null
    comments.value = []
  }

  function setKeyword(kw: string) {
    if (activeTab.value === 'resume') {
      resumeKeyword.value = kw
    } else {
      regularKeyword.value = kw
    }
  }

  function setSort(s: string) {
    sort.value = s
  }

  async function checkMyResumePost() {
    try {
      const res = await postApi.getMyResumePost()
      if (res.code === 200 && res.data) {
        myResumeId.value = res.data.id
      } else {
        myResumeId.value = null
      }
    } catch {
      myResumeId.value = null
    }
  }

  function clearMyResumeId() {
    myResumeId.value = null
  }

  function syncLikedIdsFromList(list: { id: string; isLiked?: boolean }[]) {
    const next = new Set(likedIds.value)
    for (const item of list) {
      if (item.isLiked) {
        next.add(item.id)
      } else {
        next.delete(item.id)
      }
    }
    likedIds.value = next
  }

  function clearLikedIds() {
    likedIds.value = new Set()
    try {
      localStorage.removeItem(LIKED_IDS_KEY)
    } catch { /* ignore */ }
  }

  return {
    activeTab, resumeKeyword, regularKeyword, keyword, sort, loading,
    resumePostList, resumePostTotal, resumePostPage,
    postList, postTotal, postPage,
    selectedId, selectedType, currentDetail, comments, loadingDetail,
    likedIds, qaFilter,
    fetchResumePostList, fetchPostList, fetchQaPosts, fetchMyPosts, selectPost, toggleLike,
    setTab, setKeyword, setSort, fetchComments,
    myResumeId, checkMyResumePost, clearMyResumeId, clearLikedIds
  }
})
