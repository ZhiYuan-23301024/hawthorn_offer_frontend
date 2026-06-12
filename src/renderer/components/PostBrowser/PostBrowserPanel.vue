<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Search, Heart, MessageSquare, FileText, ThumbsUp } from 'lucide-vue-next'
import { usePostStore } from '@/stores/post'
import { useEditorStore } from '@/stores/editor'
import { useRequireAuth } from '@/composables/useRequireAuth'
import { formatTimeAgo } from '@/utils/format'
import ResumePostCard from './ResumePostCard.vue'
import RegularPostCard from './RegularPostCard.vue'
import PostDetail from '@/components/Editor/PostDetail.vue'
import PostEditor from '@/components/Editor/PostEditor.vue'

const postStore = usePostStore()
const editorStore = useEditorStore()

const searchInput = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

const regularSubTabOptions = [
  { value: 'hot', label: '热门' },
  { value: 'latest', label: '最新' },
  { value: 'referral', label: '内推' }
]

const qaFilterOptions = [
  { value: 'hot', label: '热门' },
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
      if (postStore.myOwnSubTab === 'posts') {
        postStore.fetchMyPosts(1, searchInput.value)
      }
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
  postStore.toggleLike(id, postStore.activeTab === 'resume' ? 'resume' : 'regular')
}

function handlePublish() {
  if (!useRequireAuth()) return
  const type = postStore.activeTab === 'myOwn' ? 'regular' : postStore.activeTab
  if (type === 'qa') {
    editorStore.openComponentTab(`post:editor:qa`, '发布求助帖', PostEditor, { postType: 'qa' })
  } else if (type === 'regular' && postStore.regularSubTab === 'referral') {
    editorStore.openComponentTab(`post:editor:referral`, '发布内推帖', PostEditor, { postType: 'referral' })
  } else {
    const label = type === 'resume' ? '发布简历帖' : '发布社区帖'
    editorStore.openComponentTab(`post:editor:${type}`, label, PostEditor, { postType: type })
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

function onRegularSubTabChange(subTab: string) {
  if (subTab === 'referral') {
    postStore.setRegularSubTab('referral')
  } else {
    postStore.setSort(subTab)
    postStore.setRegularSubTab(subTab as 'hot' | 'latest')
  }
}

const myOwnSubTabOptions = [
  { value: 'posts' as const, label: '帖子', icon: FileText },
  { value: 'comments' as const, label: '回复', icon: MessageSquare },
  { value: 'likes' as const, label: '点赞', icon: ThumbsUp },
]

function onMyOwnSubTabChange(sub: 'posts' | 'comments' | 'likes') {
  postStore.setMyOwnSubTab(sub)
}

function onOpenPostFromComment(postId: string) {
  postStore.selectPost(postId, 'regular')
  editorStore.openComponentTab(
    `post:regular:${postId}`,
    '帖子详情',
    PostDetail,
    { postId, postType: 'regular' }
  )
}

const currentList = computed(() => {
  return postStore.activeTab === 'resume' ? postStore.resumePostList : postStore.postList
})

const isLoading = computed(() => postStore.loading)

onMounted(() => {
  searchInput.value = postStore.keyword
  postStore.fetchResumePostList()
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
      const sub = postStore.resumeSubTab
      if (sub === 'purchased') { postStore.fetchPurchasedResumePosts() }
      else if (sub === 'mine') { postStore.fetchMyResumePosts() }
      else { postStore.fetchResumePostList(1, kw) }
    } else if (postStore.activeTab === 'myOwn') {
      if (postStore.myOwnSubTab === 'comments') { postStore.fetchMyComments() }
      else if (postStore.myOwnSubTab === 'likes') { postStore.fetchMyLikes() }
      else { postStore.fetchMyPosts(1, kw) }
    } else if (postStore.activeTab === 'qa') {
      const f = qaActiveFilter.value
      if (f === 'hot' || f === 'latest') { postStore.fetchQaPosts(1, kw, f) }
      else { postStore.fetchQaPosts(1, kw, 'latest', f) }
    } else {
      postStore.fetchPostList(1, kw, postStore.sort)
    }
  }
}
</script>

<template>
  <div class="flex flex-col h-full" style="background-color: var(--color-bg);">
    <!-- Tab bar -->
    <div class="flex px-3 pt-2" style="border-bottom: 1px solid var(--color-divider);">
      <button
        v-for="tab in [
          { id: 'resume' as const, label: '简历贴' },
          { id: 'regular' as const, label: '社区' },
          { id: 'qa' as const, label: '求助' },
          { id: 'myOwn' as const, label: '我的' }
        ]"
        :key="tab.id"
        class="px-3 py-1.5 text-sm font-medium transition-colors relative flex-shrink-0 whitespace-nowrap"
        :style="{
          color: postStore.activeTab === tab.id ? 'var(--color-primary-dark)' : 'var(--color-text-tertiary)',
          borderBottom: postStore.activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
        }"
        @click="onTabChange(tab.id)"
      >{{ tab.label }}</button>
    </div>

    <!-- Search bar -->
    <div class="px-3 py-2" style="border-bottom: 1px solid var(--color-divider);">
      <div class="flex items-center rounded-md px-2.5 py-1.5 input-base" style="background: var(--color-surface);">
        <Search class="w-3.5 h-3.5 mr-1.5 flex-shrink-0" style="color: var(--color-text-tertiary);" />
        <input
          v-model="searchInput"
          type="text"
          :placeholder="postStore.activeTab === 'resume' ? '搜索简历...' : (postStore.activeTab === 'myOwn' ? (postStore.myOwnSubTab === 'posts' ? '搜索我的帖子...' : '搜索...') : (postStore.activeTab === 'qa' ? '搜索求助...' : '搜索社区...'))"
          class="bg-transparent text-xs outline-none flex-1"
          style="color: var(--color-text-primary);"
          @input="onSearchInput"
        />
      </div>
    </div>

    <!-- Sub-tab bars -->
    <div v-if="postStore.activeTab === 'resume'" class="px-3 py-1.5 flex" style="border-bottom: 1px solid var(--color-divider);">
      <button
        v-for="sub in [{v:'recommended',l:'推荐'},{v:'purchased',l:'已购买'},{v:'mine',l:'我的'}]"
        :key="sub.v"
        class="flex-1 text-center text-sm pb-1 transition-colors"
        :style="{
          color: postStore.resumeSubTab === sub.v ? 'var(--color-primary-dark)' : 'var(--color-text-tertiary)',
          borderBottom: postStore.resumeSubTab === sub.v ? '2px solid var(--color-primary)' : '2px solid transparent',
        }"
        @click="postStore.setResumeSubTab(sub.v as 'recommended' | 'purchased' | 'mine')"
      >{{ sub.l }}</button>
    </div>

    <div v-if="postStore.activeTab === 'regular'" class="px-3 py-1.5 flex" style="border-bottom: 1px solid var(--color-divider);">
      <button
        v-for="opt in regularSubTabOptions"
        :key="opt.value"
        class="flex-1 text-center text-sm pb-1 transition-colors"
        :style="{
          color: postStore.regularSubTab === opt.value ? 'var(--color-primary-dark)' : 'var(--color-text-tertiary)',
          borderBottom: postStore.regularSubTab === opt.value ? '2px solid var(--color-primary)' : '2px solid transparent',
        }"
        @click="onRegularSubTabChange(opt.value)"
      >{{ opt.label }}</button>
    </div>

    <div v-if="postStore.activeTab === 'qa'" class="px-3 py-1.5 flex" style="border-bottom: 1px solid var(--color-divider);">
      <button
        v-for="opt in qaFilterOptions"
        :key="opt.value"
        class="flex-1 text-center text-sm pb-1 transition-colors"
        :style="{
          color: qaActiveFilter === opt.value ? 'var(--color-primary-dark)' : 'var(--color-text-tertiary)',
          borderBottom: qaActiveFilter === opt.value ? '2px solid var(--color-primary)' : '2px solid transparent',
        }"
        @click="onQaFilterChange(opt.value)"
      >{{ opt.label }}</button>
    </div>

    <div v-if="postStore.activeTab === 'myOwn'" class="px-3 py-1.5 flex" style="border-bottom: 1px solid var(--color-divider);">
      <button
        v-for="opt in myOwnSubTabOptions"
        :key="opt.value"
        class="flex-1 justify-center items-center gap-1 text-sm pb-1 transition-colors flex"
        :style="{
          color: postStore.myOwnSubTab === opt.value ? 'var(--color-primary-dark)' : 'var(--color-text-tertiary)',
          borderBottom: postStore.myOwnSubTab === opt.value ? '2px solid var(--color-primary)' : '2px solid transparent',
        }"
        @click="onMyOwnSubTabChange(opt.value)"
      >
        <component :is="opt.icon" class="w-3 h-3" />
        {{ opt.label }}
      </button>
    </div>

    <!-- Post list -->
    <div class="flex-1 overflow-y-auto px-1.5 py-1.5 space-y-1" @scroll="onScroll">
      <div v-if="isLoading" class="flex items-center justify-center py-10">
        <div class="text-sm" style="color: var(--color-text-tertiary);">加载中...</div>
      </div>

      <div v-else-if="currentList.length === 0 && postStore.activeTab !== 'myOwn'" class="flex items-center justify-center py-10">
        <div class="text-center">
          <div class="text-sm" style="color: var(--color-text-secondary);">暂无帖子</div>
          <div class="text-xs mt-1" style="color: var(--color-text-tertiary);">快来发布第一篇吧</div>
        </div>
      </div>

      <template v-else-if="postStore.activeTab === 'resume'">
        <ResumePostCard
          v-for="resume in postStore.resumePostList" :key="resume.id"
          :resume="resume"
          :is-selected="postStore.selectedId === resume.id"
          :is-liked="postStore.likedIds.has(resume.id)"
          @select="onSelectPost($event, 'resume')" @like="onLike"
        />
      </template>

      <template v-else-if="postStore.activeTab === 'regular'">
        <RegularPostCard
          v-for="post in postStore.postList" :key="post.id"
          :post="post"
          :is-selected="postStore.selectedId === post.id"
          :is-liked="postStore.likedIds.has(post.id)"
          @select="onSelectPost($event, 'regular')" @like="onLike"
        />
      </template>

      <template v-else-if="postStore.activeTab === 'qa'">
        <RegularPostCard
          v-for="post in postStore.postList" :key="post.id"
          :post="post"
          :is-selected="postStore.selectedId === post.id"
          :is-liked="postStore.likedIds.has(post.id)"
          @select="onSelectPost($event, 'qa')" @like="onLike"
        />
      </template>

      <template v-else-if="postStore.activeTab === 'myOwn'">
        <template v-if="postStore.myOwnSubTab === 'posts'">
          <RegularPostCard
            v-for="post in postStore.postList" :key="post.id"
            :post="post"
            :is-selected="postStore.selectedId === post.id"
            :is-liked="postStore.likedIds.has(post.id)"
            :show-pin-actions="true"
            @select="onSelectPost($event, 'regular')" @like="onLike"
            @pin-changed="postStore.fetchMyPosts(1, postStore.keyword || undefined)"
          />
        </template>

        <template v-else-if="postStore.myOwnSubTab === 'comments'">
          <div v-if="postStore.myOwnDisplayComments.length === 0 && !postStore.loading" class="flex items-center justify-center py-10">
            <div class="text-sm" style="color: var(--color-text-tertiary);">暂无回复</div>
          </div>
          <div v-for="c in postStore.myOwnDisplayComments" :key="c.id" class="py-3" style="border-bottom: 1px solid var(--color-divider);">
            <div class="text-sm line-clamp-2" style="color: var(--color-text-primary);">{{ c.content }}</div>
            <div class="flex items-center gap-3 mt-1 text-xs" style="color: var(--color-text-secondary);">
              <span>{{ formatTimeAgo(c.createdAt) }}</span>
              <span v-if="c.likeCount" class="flex items-center gap-1"><Heart class="w-3 h-3" />{{ c.likeCount }}</span>
              <a v-if="c.postTitle" class="cursor-pointer truncate max-w-[200px] hover:underline" style="color: var(--color-primary);" @click.stop="c.targetId && onOpenPostFromComment(c.targetId)">@{{ c.postTitle }}</a>
            </div>
          </div>
        </template>

        <template v-else-if="postStore.myOwnSubTab === 'likes'">
          <div v-if="postStore.myOwnDisplayLikes.length === 0 && !postStore.loading" class="flex items-center justify-center py-10">
            <div class="text-sm" style="color: var(--color-text-tertiary);">暂无点赞</div>
          </div>
          <div
            v-for="item in postStore.myOwnDisplayLikes"
            :key="`${item.targetId}-${item.targetType}`"
            class="py-3 transition-colors rounded px-2 -mx-2"
            style="border-bottom: 1px solid var(--color-divider);"
            :class="item.targetType === 'post' && item.targetId ? 'cursor-pointer' : 'cursor-default opacity-70'"
            @click="item.targetType === 'post' && item.targetId && onOpenPostFromComment(item.targetId)"
            @mouseenter="(e: MouseEvent) => { if (item.targetType === 'post' && item.targetId) (e.target as HTMLElement).style.backgroundColor = 'var(--color-surface-hover)' }"
            @mouseleave="(e: MouseEvent) => { (e.target as HTMLElement).style.backgroundColor = 'transparent' }"
          >
            <div class="flex items-center gap-2">
              <span class="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0" :style="{
                backgroundColor: item.targetType === 'post' ? 'var(--color-primary-subtle)' : 'var(--color-success-subtle)',
                color: item.targetType === 'post' ? 'var(--color-primary-dark)' : 'var(--color-success)',
              }">{{ item.targetType === 'post' ? '帖子' : '回复' }}</span>
              <span class="text-sm line-clamp-1" style="color: var(--color-text-primary);">{{ item.targetText || '(内容已删除)' }}</span>
            </div>
            <div class="text-xs mt-1" style="color: var(--color-text-secondary);">{{ formatTimeAgo(item.likeTime) }}</div>
          </div>
        </template>
      </template>

      <div v-if="postStore.loadingMore" class="flex items-center justify-center py-4">
        <div class="text-xs" style="color: var(--color-text-tertiary);">加载更多...</div>
      </div>
    </div>

    <!-- Publish button -->
    <div v-if="!(postStore.activeTab === 'myOwn' && postStore.myOwnSubTab !== 'posts')" class="p-2.5" style="border-top: 1px solid var(--color-divider);">
      <button
        class="w-full text-sm font-medium py-2 rounded-md transition-colors btn-cta"
        @click="handlePublish"
      >
        {{ postStore.activeTab === 'resume' ? '+ 发布简历帖' : postStore.activeTab === 'qa' ? '+ 发布求助' : (postStore.activeTab === 'regular' && postStore.regularSubTab === 'referral') ? '+ 发布内推帖' : '+ 发布社区帖' }}
      </button>
    </div>
  </div>
</template>
