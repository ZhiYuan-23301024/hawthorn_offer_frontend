<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { Search } from 'lucide-vue-next'
import { usePostStore } from '@/stores/post'
import { useEditorStore } from '@/stores/editor'
import { useAuthStore } from '@/stores/auth'
import { useRequireAuth } from '@/composables/useRequireAuth'
import ResumePostCard from './ResumePostCard.vue'
import RegularPostCard from './RegularPostCard.vue'
import PostDetail from '@/components/Editor/PostDetail.vue'
import PostEditor from '@/components/Editor/PostEditor.vue'

const postStore = usePostStore()
const editorStore = useEditorStore()

const searchInput = ref('')
const checkingResume = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

const sortOptions = [
  { value: 'hot', label: '热门' },
  { value: 'latest', label: '最新' }
]

const qaFilterOptions = [
  { value: 'hot', label: '最热' },
  { value: 'latest', label: '最新' },
  { value: 'active', label: '进行中' },
  { value: 'expired', label: '已过期' }
]
const qaActiveFilter = ref('hot')

function onQaFilterChange(filter: string) {
  qaActiveFilter.value = filter
  const kw = postStore.keyword || undefined
  if (filter === 'hot' || filter === 'latest') {
    postStore.qaFilter = ''
    postStore.fetchQaPosts(1, kw, filter)
  } else {
    postStore.qaFilter = filter
    postStore.fetchQaPosts(1, kw, 'latest', filter)
  }
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    postStore.setKeyword(searchInput.value)
    if (postStore.activeTab === 'resume') {
      postStore.fetchResumePostList(1, searchInput.value)
    } else if (postStore.activeTab === 'myOwn') {
      postStore.fetchMyPosts(1, searchInput.value)
    } else {
      postStore.fetchPostList(1, searchInput.value)
    }
  }, 300)
}

function onTabChange(tab: 'resume' | 'regular' | 'qa' | 'myOwn') {
  postStore.setTab(tab)
  searchInput.value = postStore.keyword
  const kw = postStore.keyword || undefined
  if (tab === 'resume') {
    postStore.fetchResumePostList(1, kw)
  } else if (tab === 'myOwn') {
    postStore.fetchMyPosts(1, kw)
  } else if (tab === 'qa') {
    const f = qaActiveFilter.value
    if (f === 'hot' || f === 'latest') {
      postStore.fetchQaPosts(1, kw, f)
    } else {
      postStore.fetchQaPosts(1, kw, 'latest', f)
    }
  } else {
    postStore.fetchPostList(1, kw, postStore.sort)
  }
}

function onSelectPost(id: string, type: 'resume' | 'regular' | 'qa') {
  postStore.selectPost(id, type)
  // 从列表数据中获取标题（同步，无需等 API 返回）
  const tabType = type === 'qa' ? 'regular' : type
  const title = type === 'resume'
    ? postStore.resumePostList.find(p => p.id === id)?.resumeName || '简历详情'
    : postStore.postList.find(p => p.id === id)?.title || '帖子详情'
  editorStore.openComponentTab(`post:${tabType}:${id}`, title, PostDetail, {
    postId: id,
    postType: tabType
  })
}

function onLike(id: string) {
  if (!useRequireAuth()) return
  const type = postStore.activeTab === 'resume' ? 'resume' : 'regular'
  postStore.toggleLike(id, type)
}

async function checkMyResume() {
  const authStore = useAuthStore()
  if (!authStore.token) return
  checkingResume.value = true
  await postStore.checkMyResumePost()
  checkingResume.value = false
}

function handlePublish() {
  if (!useRequireAuth()) return
  const type = postStore.activeTab === 'myOwn' ? 'regular' : postStore.activeTab
  if (type === 'resume' && postStore.myResumeId) {
    // View/edit existing resume
    postStore.selectPost(postStore.myResumeId, 'resume')
    editorStore.openComponentTab(`post:resume:${postStore.myResumeId}`, '我的简历', PostDetail, {
      postId: postStore.myResumeId,
      postType: 'resume'
    })
  } else if (type === 'qa') {
    editorStore.openComponentTab(`post:editor:qa`, '发布求助帖', PostEditor, {
      postType: 'qa'
    })
  } else {
    const label = type === 'resume' ? '发布简历' : '发布社区帖'
    editorStore.openComponentTab(`post:editor:${type}`, label, PostEditor, {
      postType: type
    })
  }
}

function onSortChange(sort: string) {
  postStore.setSort(sort)
  if (postStore.activeTab === 'qa') {
    postStore.fetchQaPosts(1, postStore.keyword, sort)
  } else {
    postStore.fetchPostList(1, postStore.keyword, sort)
  }
}

const currentList = computed(() => {
  return postStore.activeTab === 'resume' ? postStore.resumePostList : postStore.postList
})

const isLoading = computed(() => postStore.loading)

onMounted(() => {
  searchInput.value = postStore.keyword
  postStore.fetchResumePostList()
  checkMyResume()
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

function onScroll(event: Event) {
  const el = event.target as HTMLElement
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
    postStore.loadMorePosts()
  }
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    const kw = postStore.keyword || undefined
    if (postStore.activeTab === 'resume') {
      postStore.fetchResumePostList(1, kw)
    } else if (postStore.activeTab === 'myOwn') {
      postStore.fetchMyPosts(1, kw)
    } else if (postStore.activeTab === 'qa') {
      const f = qaActiveFilter.value
      if (f === 'hot' || f === 'latest') {
        postStore.fetchQaPosts(1, kw, f)
      } else {
        postStore.fetchQaPosts(1, kw, 'latest', f)
      }
    } else {
      postStore.fetchPostList(1, kw, postStore.sort)
    }
  }
}

watch(() => postStore.resumePostList.length, () => {
  checkMyResume()
})
</script>

<template>
  <div class="flex flex-col h-full bg-[#1e1e1e]">
    <!-- Tab bar -->
    <div class="flex border-b border-[#333] px-3 pt-2">
      <button
        class="px-3 py-1.5 text-sm font-medium transition-colors"
        :class="postStore.activeTab === 'resume'
          ? 'text-[#4a9eff] border-b-2 border-[#4a9eff]'
          : 'text-[#888] hover:text-[#ccc]'"
        @click="onTabChange('resume')"
      >
        简历贴
      </button>
      <button
        class="px-3 py-1.5 text-sm font-medium transition-colors"
        :class="postStore.activeTab === 'regular'
          ? 'text-[#4a9eff] border-b-2 border-[#4a9eff]'
          : 'text-[#888] hover:text-[#ccc]'"
        @click="onTabChange('regular')"
      >
        社区
      </button>
      <button
        class="px-3 py-1.5 text-sm font-medium transition-colors"
        :class="postStore.activeTab === 'qa'
          ? 'text-[#4a9eff] border-b-2 border-[#4a9eff]'
          : 'text-[#888] hover:text-[#ccc]'"
        @click="onTabChange('qa')"
      >
        求助
      </button>
      <button
        class="px-3 py-1.5 text-sm font-medium transition-colors"
        :class="postStore.activeTab === 'myOwn'
          ? 'text-[#4a9eff] border-b-2 border-[#4a9eff]'
          : 'text-[#888] hover:text-[#ccc]'"
        @click="onTabChange('myOwn')"
      >
        我的
      </button>
    </div>

    <!-- Search bar -->
    <div class="px-3 py-2 border-b border-[#2a2a2a]">
      <div class="flex items-center bg-[#2d2d2d] border border-[#444] rounded-md px-2.5 py-1.5">
        <Search class="w-3.5 h-3.5 text-[#666] mr-1.5 flex-shrink-0" />
        <input
          v-model="searchInput"
          type="text"
          :placeholder="postStore.activeTab === 'resume' ? '搜索简历...' : (postStore.activeTab === 'myOwn' ? '搜索我的帖子...' : (postStore.activeTab === 'qa' ? '搜索求助...' : '搜索社区...'))"
          class="bg-transparent text-[#ccc] text-xs outline-none flex-1 placeholder:text-[#666]"
          @input="onSearchInput"
        />
      </div>
    </div>

    <!-- Sort bar (regular posts only) -->
    <!-- Sort bar for regular posts -->
    <div v-if="postStore.activeTab === 'regular'" class="px-3 py-1.5 border-b border-[#2a2a2a] flex gap-4">
      <button
        v-for="opt in sortOptions"
        :key="opt.value"
        class="text-xs pb-1 transition-colors"
        :class="postStore.sort === opt.value
          ? 'text-[#4a9eff] border-b border-[#4a9eff]'
          : 'text-[#888] hover:text-[#ccc]'"
        @click="onSortChange(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- Filter bar for QA posts -->
    <div v-if="postStore.activeTab === 'qa'" class="px-3 py-1.5 border-b border-[#2a2a2a] flex gap-4">
      <button
        v-for="opt in qaFilterOptions"
        :key="opt.value"
        class="text-xs pb-1 transition-colors"
        :class="qaActiveFilter === opt.value
          ? 'text-[#4a9eff] border-b border-[#4a9eff]'
          : 'text-[#888] hover:text-[#ccc]'"
        @click="onQaFilterChange(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- Post list -->
    <div class="flex-1 overflow-y-auto px-1.5 py-1.5 space-y-1" @scroll="onScroll">
      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-10">
        <div class="text-sm text-[#888]">加载中...</div>
      </div>

      <!-- Empty -->
      <div v-else-if="currentList.length === 0" class="flex items-center justify-center py-10">
        <div class="text-center">
          <div class="text-sm text-[#888]">暂无帖子</div>
          <div class="text-xs text-[#666] mt-1">快来发布第一篇吧</div>
        </div>
      </div>

      <!-- Resume cards -->
      <template v-else-if="postStore.activeTab === 'resume'">
        <ResumePostCard
          v-for="resume in postStore.resumePostList"
          :key="resume.id"
          :resume="resume"
          :is-selected="postStore.selectedId === resume.id"
          @select="onSelectPost($event, 'resume')"
        />
      </template>

      <!-- Regular post cards -->
      <template v-else-if="postStore.activeTab === 'regular'">
        <RegularPostCard
          v-for="post in postStore.postList"
          :key="post.id"
          :post="post"
          :is-selected="postStore.selectedId === post.id"
          :is-liked="postStore.likedIds.has(post.id)"
          @select="onSelectPost($event, 'regular')"
          @like="onLike"
        />
      </template>

      <!-- QA post cards -->
      <template v-else-if="postStore.activeTab === 'qa'">
        <RegularPostCard
          v-for="post in postStore.postList"
          :key="post.id"
          :post="post"
          :is-selected="postStore.selectedId === post.id"
          :is-liked="postStore.likedIds.has(post.id)"
          @select="onSelectPost($event, 'qa')"
          @like="onLike"
        />
      </template>

      <!-- My own posts -->
      <template v-else-if="postStore.activeTab === 'myOwn'">
        <RegularPostCard
          v-for="post in postStore.postList"
          :key="post.id"
          :post="post"
          :is-selected="postStore.selectedId === post.id"
          :is-liked="postStore.likedIds.has(post.id)"
          :show-pin-actions="true"
          @select="onSelectPost($event, 'regular')"
          @like="onLike"
          @pin-changed="postStore.fetchMyPosts(1, postStore.keyword || undefined)"
        />
      </template>

      <!-- Load more indicator -->
      <div v-if="postStore.loadingMore" class="flex items-center justify-center py-4">
        <div class="text-xs text-[#666]">加载更多...</div>
      </div>
    </div>

    <!-- Publish / View resume button -->
    <div class="border-t border-[#333] p-2.5">
      <button
        class="w-full text-white text-sm font-medium py-2 rounded-md transition-colors"
        :class="postStore.activeTab === 'resume' && postStore.myResumeId
          ? 'bg-[#2f855a] hover:bg-[#276749]'
          : 'bg-[#4a9eff] hover:bg-[#3a8eef]'"
        @click="handlePublish"
      >
        {{ postStore.activeTab === 'resume' ? (postStore.myResumeId ? '查看我的简历' : '+ 发布简历') : postStore.activeTab === 'qa' ? '+ 发布求助' : '+ 发布社区帖' }}
      </button>
    </div>
  </div>
</template>
