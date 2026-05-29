<script setup lang="ts">
import { Heart, MessageSquare } from 'lucide-vue-next'
import { API_BASE_URL } from '@/api/http'
import type { PostListVO } from '@/api/post'

defineProps<{
  post: PostListVO
  isSelected: boolean
  isLiked: boolean
}>()

function avatarUrl(url: string | null): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http')) return url
  return API_BASE_URL + url
}

function avatarColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  return `hsl(${h}, 45%, 35%)`
}

const emit = defineEmits<{
  select: [id: string]
  like: [id: string]
}>()

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}个月前`
  return `${Math.floor(months / 12)}年前`
}
</script>

<template>
  <div
    class="px-3 py-2.5 rounded-lg cursor-pointer transition-colors border border-transparent"
    :class="isSelected ? 'bg-[#094771] border-[#007acc]' : 'hover:bg-[#2a2a2a]'"
    @click="emit('select', post.id)"
  >
    <div class="flex items-start gap-2.5">
      <div
        class="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden"
        :style="avatarUrl(post.authorAvatarUrl) ? {} : { backgroundColor: avatarColor(post.userId) }"
        :class="isSelected ? 'bg-[#2b6cb0]' : 'bg-[#555]'"
      >
        <img v-if="avatarUrl(post.authorAvatarUrl)" :src="avatarUrl(post.authorAvatarUrl)" class="w-full h-full object-cover" />
        <span v-else>{{ post.authorAvatar }}</span>
      </div>
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-sm" :class="isSelected ? 'text-white' : 'text-[#ddd]'">
          {{ post.title }}
        </div>
        <div class="text-xs mt-0.5" :class="isSelected ? 'text-[#b0d4f1]' : 'text-[#aaa]'">
          {{ post.authorName }}
        </div>
        <div
          class="text-xs mt-1 leading-relaxed line-clamp-2"
          :class="isSelected ? 'text-[#a0c8e8]' : 'text-[#999]'"
        >
          {{ post.excerpt }}
        </div>
        <div class="flex items-center gap-3 mt-1.5 text-xs" :class="isSelected ? 'text-[#b0d4f1]' : 'text-[#888]'">
          <button
            class="flex items-center gap-0.5 hover:text-[#e74c3c] transition-colors"
            :class="isLiked ? 'text-[#e74c3c]' : ''"
            @click.stop="emit('like', post.id)"
          >
            <Heart class="w-3 h-3" :fill="isLiked ? 'currentColor' : 'none'" />
            {{ post.likeCount }}
          </button>
          <span class="flex items-center gap-0.5">
            <MessageSquare class="w-3 h-3" />
            {{ post.commentCount }}
          </span>
          <span>{{ formatTimeAgo(post.createdAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
