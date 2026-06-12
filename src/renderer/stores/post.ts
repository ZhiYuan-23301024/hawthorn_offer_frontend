import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { PostListVO, ResumePostListVO, ResumePostDetail, PostDetail, CommentVO, PageResponse } from '@/api/post'
import * as postApi from '@/api/post'
import { apiGet } from '@/api/http'
import type { ApiResponse } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { getUserComments, getUserLikes, type UserCommentVO, type UserLikedItemVO } from '@/api/social'

export type PostTab = 'resume' | 'regular' | 'qa' | 'myOwn' | 'referral'

export type RegularSubTab = 'hot' | 'latest' | 'referral'

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
  const regularSubTab = ref<RegularSubTab>('hot')
  const resumeSubTab = ref<'recommended' | 'purchased' | 'mine'>('recommended')
  const resumeKeyword = ref('')
  const regularKeyword = ref('')
  const keyword = computed(() => activeTab.value === 'resume' ? resumeKeyword.value : regularKeyword.value)
  const sort = ref('hot')
  const loading = ref(false)
  const loadingMore = ref(false)

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

  const likedIds = ref<Set<string>>(loadLikedIds())

  watch(likedIds, (val) => {
    saveLikedIds(val)
  }, { deep: false })

  async function fetchResumePostList(page = 1, kw?: string, append = false) {
    if (append) {
      loadingMore.value = true
    } else {
      loading.value = true
    }
    try {
      const kwParam = kw !== undefined ? kw : keyword.value
      const res = await postApi.getResumePostList(page, 10, kwParam || undefined)
      if (res.code === 200) {
        const items = (res.data.items || []).map(item => ({
          ...item,
          commentCount: item.commentCount || 0
        }))
        if (append) {
          resumePostList.value = [...resumePostList.value, ...items]
        } else {
          resumePostList.value = items
        }
        resumePostTotal.value = res.data.total
        resumePostPage.value = page
        // 从服务端同步点赞状态（处理跨浏览器同步）
        syncLikedIdsFromList(res.data.items || [])
      }
    } finally {
      if (append) {
        loadingMore.value = false
      } else {
        loading.value = false
      }
    }
  }

  async function fetchPostList(page = 1, kw?: string, s?: string, append = false) {
    if (append) {
      loadingMore.value = true
    } else {
      loading.value = true
    }
    try {
      const kwParam = kw !== undefined ? kw : keyword.value
      const sParam = s !== undefined ? s : sort.value
      const pt = regularSubTab.value === 'referral' ? 'referral' : undefined
      const res = await postApi.getPostList(page, 10, kwParam || undefined, sParam, pt)
      if (res.code === 200) {
        const items = (res.data.items || []).map(item => ({
          ...item,
          likeCount: item.likeCount || 0,
          commentCount: item.commentCount || 0
        }))
        if (append) {
          postList.value = [...postList.value, ...items]
        } else {
          postList.value = items
        }
        postTotal.value = res.data.total
        postPage.value = page
        // 从服务端同步点赞状态（处理跨标签页/跨设备同步）
        syncLikedIdsFromList(res.data.items || [])
      }
    } finally {
      if (append) {
        loadingMore.value = false
      } else {
        loading.value = false
      }
    }
  }

  const qaFilter = ref('')

  // ---- myOwn sub-tabs ----
  const myOwnSubTab = ref<'posts' | 'comments' | 'likes'>('posts')
  const myComments = ref<UserCommentVO[]>([])
  const myLikes = ref<UserLikedItemVO[]>([])
  const myCommentsDisplayPage = ref(1)
  const myLikesDisplayPage = ref(1)
  const commentsLoaded = ref(false)
  const likesLoaded = ref(false)

  const myOwnDisplayComments = computed(() => {
    const list = [...myComments.value]
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return list.slice(0, myCommentsDisplayPage.value * 10)
  })

  const myOwnDisplayLikes = computed(() => {
    return myLikes.value.slice(0, myLikesDisplayPage.value * 10)
  })

  async function fetchQaPosts(page = 1, kw?: string, s?: string, bs?: string, append = false) {
    if (append) {
      loadingMore.value = true
    } else {
      loading.value = true
    }
    try {
      const kwParam = kw !== undefined ? kw : keyword.value
      const sParam = s !== undefined ? s : sort.value
      const bsParam = bs !== undefined ? bs : qaFilter.value
      const res = await postApi.getPostList(page, 10, kwParam || undefined, sParam, 'qa', bsParam || undefined)
      if (res.code === 200) {
        const items = (res.data.items || []).map(item => ({
          ...item,
          likeCount: item.likeCount || 0,
          commentCount: item.commentCount || 0
        }))
        if (append) {
          postList.value = [...postList.value, ...items]
        } else {
          postList.value = items
        }
        postTotal.value = res.data.total
        postPage.value = page
        syncLikedIdsFromList(res.data.items || [])
      }
    } finally {
      if (append) {
        loadingMore.value = false
      } else {
        loading.value = false
      }
    }
  }

  async function fetchMyPosts(page = 1, keyword?: string, append = false) {
    const authStore = useAuthStore()
    if (append) {
      loadingMore.value = true
    } else {
      loading.value = true
    }
    try {
      let url = `/api/posts?page=${page}&size=10&sort=latest&myOwn=true`
      if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`
      const res = await apiGet<ApiResponse<PageResponse<PostListVO>>>(url, authStore.token || undefined)
      if (res.code === 200 && res.data) {
        const items = (res.data.items || []).map(item => ({
          ...item,
          likeCount: item.likeCount || 0,
          commentCount: item.commentCount || 0
        }))
        if (append) {
          postList.value = [...postList.value, ...items]
        } else {
          postList.value = items
        }
        postTotal.value = res.data.total
        postPage.value = page
      }
    } finally {
      if (append) {
        loadingMore.value = false
      } else {
        loading.value = false
      }
    }
  }

  async function loadMorePosts() {
    if (loading.value || loadingMore.value) return
    if (activeTab.value === 'myOwn') {
      await loadMoreMyOwn()
      return
    }
    const nextPage = postPage.value + 1
    if (nextPage > Math.ceil(postTotal.value / 10)) return

    const kw = keyword.value || undefined
    if (activeTab.value === 'resume') {
      await fetchResumePostList(nextPage, kw, true)
    } else if (activeTab.value === 'qa') {
      const f = qaFilter.value
      if (f === 'hot' || f === 'latest') {
        await fetchQaPosts(nextPage, kw, f, undefined, true)
      } else {
        await fetchQaPosts(nextPage, kw, 'latest', f, true)
      }
    } else {
      await fetchPostList(nextPage, kw, sort.value, true)
    }
  }

  function setMyOwnSubTab(sub: 'posts' | 'comments' | 'likes') {
    myOwnSubTab.value = sub
    if (sub === 'comments' && !commentsLoaded.value) {
      fetchMyComments()
    } else if (sub === 'likes' && !likesLoaded.value) {
      fetchMyLikes()
    }
  }

  async function fetchMyComments() {
    loading.value = true
    try {
      const authStore = useAuthStore()
      const userId = authStore.user?.id
      if (!userId) return
      const res = await getUserComments(userId)
      if (res.code === 200) {
        myComments.value = res.data || []
        commentsLoaded.value = true
        myCommentsDisplayPage.value = 1
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchMyLikes() {
    loading.value = true
    try {
      const authStore = useAuthStore()
      const userId = authStore.user?.id
      if (!userId) return
      const res = await getUserLikes(userId)
      if (res.code === 200) {
        myLikes.value = res.data || []
        likesLoaded.value = true
        myLikesDisplayPage.value = 1
      }
    } finally {
      loading.value = false
    }
  }

  function loadMoreMyOwn() {
    if (myOwnSubTab.value === 'comments') {
      if (myCommentsDisplayPage.value * 10 < myComments.value.length) {
        myCommentsDisplayPage.value++
      }
    } else if (myOwnSubTab.value === 'likes') {
      if (myLikesDisplayPage.value * 10 < myLikes.value.length) {
        myLikesDisplayPage.value++
      }
    } else {
      // posts: backend pagination
      if (loading.value || loadingMore.value) return
      const nextPage = postPage.value + 1
      if (nextPage > Math.ceil(postTotal.value / 10)) return
      const kw = keyword.value || undefined
      fetchMyPosts(nextPage, kw, true)
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

  async function fetchComments(targetId: string, type: string) {
    const targetType = 'post'
    const res = await postApi.getComments(targetType, targetId)
    if (res.code === 200) {
      comments.value = res.data || []
    }
  }

  async function toggleLike(id: string, type: PostTab) {
    if (type !== 'regular' && type !== 'resume') return
    const isLiked = likedIds.value.has(id)
    const isResume = type === 'resume'
    try {
      if (isResume) {
        if (isLiked) await postApi.unlikeResumePost(id)
        else await postApi.likeResumePost(id)
      } else {
        if (isLiked) await postApi.unlikePost(id)
        else await postApi.likePost(id)
      }

      const newSet = new Set(likedIds.value)
      if (isLiked) newSet.delete(id)
      else newSet.add(id)
      likedIds.value = newSet

      const list = isResume ? resumePostList.value : postList.value
      const item = list.find((p: any) => p.id === id)
      if (item) {
        const currentCount: number = item.likeCount || 0
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

  async function purchaseResumePost(id: string) {
    const res = await postApi.purchaseResumePost(id)
    if (res.code === 200 && res.data) {
      const authStore = useAuthStore()
      if (authStore.user) {
        authStore.user.beans = res.data.balance
      }
      if (selectedId.value === id) {
        await selectPost(id, 'resume')
      }
      return res.data.balance
    }
    throw new Error(res.message || '购买失败')
  }

  function setTab(tab: PostTab) {
    activeTab.value = tab
    resumeSubTab.value = 'recommended'
    regularSubTab.value = 'hot'
    myOwnSubTab.value = 'posts'
    selectedId.value = null
    selectedType.value = null
    currentDetail.value = null
    comments.value = []
  }

  function setRegularSubTab(sub: RegularSubTab) {
    regularSubTab.value = sub
    const kw = keyword.value || undefined
    fetchPostList(1, kw, sort.value)
  }

  function setResumeSubTab(sub: 'recommended' | 'purchased' | 'mine') {
    resumeSubTab.value = sub
    selectedId.value = null
    selectedType.value = null
    currentDetail.value = null
    comments.value = []
    const kw = keyword.value || undefined
    if (sub === 'purchased') {
      fetchPurchasedResumePosts()
    } else if (sub === 'mine') {
      fetchMyResumePosts()
    } else {
      fetchResumePostList(1, kw)
    }
  }

  async function fetchPurchasedResumePosts() {
    loading.value = true
    try {
      const authStore = useAuthStore()
      const res = await apiGet<ApiResponse<ResumePostListVO[]>>(
        '/api/posts/resumes/purchased', authStore.token || undefined
      )
      if (res.code === 200) {
        resumePostList.value = res.data || []
        resumePostTotal.value = (res.data || []).length
        resumePostPage.value = 1
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchMyResumePosts() {
    loading.value = true
    try {
      const authStore = useAuthStore()
      const res = await apiGet<ApiResponse<ResumePostListVO[]>>(
        '/api/posts/resumes/me', authStore.token || undefined
      )
      if (res.code === 200 && res.data) {
        resumePostList.value = (res.data || []).map((rp: any) => ({
          id: rp.id,
          userId: rp.userId,
          resumeName: rp.resumeName,
          authorName: authStore.user?.nickname || '',
          authorAvatar: authStore.user?.nickname?.charAt(0) || '?',
          authorAvatarUrl: authStore.user?.avatar || null,
          commentCount: rp.commentCount || 0,
          price: rp.price || 50,
          promoText: rp.promoText || '',
          likeCount: rp.likeCount || 0,
          isLiked: rp.isLiked || false,
          deleted: rp.deleted || rp.isDeleted || false,
          createdAt: rp.createdAt,
          updatedAt: rp.updatedAt,
        }))
        resumePostTotal.value = (res.data || []).length
        resumePostPage.value = 1
      }
    } finally {
      loading.value = false
    }
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
    activeTab, regularSubTab, resumeSubTab, resumeKeyword, regularKeyword, keyword, sort, loading, loadingMore,
    resumePostList, resumePostTotal, resumePostPage,
    postList, postTotal, postPage,
    selectedId, selectedType, currentDetail, comments, loadingDetail,
    likedIds, qaFilter,
    myOwnSubTab, myComments, myLikes, myCommentsDisplayPage, myLikesDisplayPage,
    commentsLoaded, likesLoaded,
    myOwnDisplayComments, myOwnDisplayLikes,
    fetchResumePostList, fetchPostList, fetchQaPosts, fetchMyPosts, loadMorePosts, selectPost, toggleLike, purchaseResumePost,
    fetchPurchasedResumePosts, fetchMyResumePosts,
    setTab, setRegularSubTab, setResumeSubTab, setKeyword, setSort, fetchComments,
    setMyOwnSubTab, fetchMyComments, fetchMyLikes, loadMoreMyOwn,
    clearLikedIds
  }
})
