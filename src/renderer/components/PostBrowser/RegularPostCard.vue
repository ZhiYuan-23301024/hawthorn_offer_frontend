<script setup lang="ts">
import { ref } from 'vue'
import { Heart, MessageSquare, Pin, Bean } from 'lucide-vue-next'
import type { PostListVO } from '@/api/post'
import { avatarUrl, avatarColor, formatTimeAgo } from '@/utils/format'

const props = defineProps<{
  post: PostListVO
  isSelected: boolean
  isLiked: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  like: [id: string]
}>()

const imgError = ref(false)

function computeRemaining(expiresAt: string | null): string {
  if (!expiresAt) return ''
  const remaining = new Date(expiresAt).getTime() - Date.now()
  if (remaining <= 0) return '已过期'
  const hours = Math.floor(remaining / 3600000)
  if (hours >= 24) return `${Math.floor(hours / 24)}天`
  return `${hours}小时`
}
</script>

<template>
  <div
    class="px-3 py-2.5 rounded-lg cursor-pointer border border-transparent relative post-card"
    :style="{
      backgroundColor: isSelected ? 'var(--color-primary-subtle)' : (post.isPinned ? 'var(--color-warning-subtle)' : 'transparent'),
      borderColor: isSelected ? 'var(--color-primary)' : (post.isPinned ? 'rgba(168,144,108,0.15)' : 'transparent'),
      boxShadow: isSelected ? 'inset 0 1px 3px rgba(123,143,166,0.12), 0 2px 8px rgba(30,28,26,0.06)' : 'none',
      transform: isSelected ? 'translateY(-1px)' : 'none',
    }"
    @click="emit('select', post.id)"
    @mouseenter="(e: MouseEvent) => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = post.isPinned ? 'var(--color-warning-subtle)' : 'var(--color-surface-hover)' }"
    @mouseleave="(e: MouseEvent) => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = post.isPinned ? 'var(--color-warning-subtle)' : 'transparent' }"
  >
    <div v-if="post.isPinned" class="flex items-center gap-1 mb-1">
      <span class="text-xs font-medium" style="color: var(--color-danger);"><Pin class="w-3 h-3 inline-block" style="color:var(--color-danger);" /> 置顶</span>
      <span v-if="post.pinExpiresAt" class="text-xs" style="color: var(--color-text-tertiary);">
        · 剩余 {{ computeRemaining(post.pinExpiresAt) }}
      </span>
    </div>

    <div v-if="post.postType === 'referral'" class="absolute top-2 right-2">
      <span class="text-xs px-2 py-0.5 rounded font-medium" style="background-color: var(--color-primary-subtle); color: var(--color-primary-dark);">内推</span>
    </div>

    <div class="flex items-start gap-2.5">
      <div
        class="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden"
        :style="{ backgroundColor: avatarColor(post.userId) }"
      >
        <img v-show="!imgError" :src="avatarUrl(post.authorAvatarUrl) || ''" class="w-full h-full object-cover" @error="imgError = true" />
        <span v-show="imgError || !avatarUrl(post.authorAvatarUrl)">{{ post.authorAvatar || '?' }}</span>
      </div>
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-sm" :style="{ color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-primary)' }">
          {{ post.title }}
        </div>
        <div v-if="post.postType === 'qa'" class="flex items-center gap-2 mt-0.5">
          <span class="text-xs" style="color: var(--color-warning);">{{ post.bountyBeans  }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /></span>
          <span v-if="post.bountyStatus === 'active'" class="text-xs" style="color: var(--color-primary);">求助中</span>
          <span v-else-if="post.bountyStatus === 'expired'" class="text-xs" style="color: var(--color-text-tertiary);">已结束</span>
          <span v-else-if="post.bountyStatus === 'distributed'" class="text-xs" style="color: var(--color-success);">已分配</span>
        </div>
        <div class="text-sm mt-0.5" :style="{ color: isSelected ? 'var(--color-text-secondary)' : 'var(--color-text-secondary)' }">
          {{ post.authorName }}
        </div>
        <div class="text-sm mt-1.5 leading-relaxed line-clamp-2" :style="{ color: isSelected ? 'var(--color-text-tertiary)' : 'var(--color-text-tertiary)' }">
          {{ post.excerpt }}
        </div>
        <div class="flex items-center gap-3 mt-2 text-xs" :style="{ color: isSelected ? 'var(--color-text-tertiary)' : 'var(--color-text-tertiary)' }">
          <button
            class="flex items-center gap-0.5 transition-colors"
            :style="{ color: isLiked ? 'var(--color-danger)' : 'var(--color-text-tertiary)' }"
            @click.stop="emit('like', post.id)"
            @mouseenter="(e: MouseEvent) => { if (!isLiked) (e.currentTarget as HTMLElement).style.color = 'var(--color-danger)' }"
            @mouseleave="(e: MouseEvent) => { if (!isLiked) (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)' }"
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

<style scoped>
.post-card {
  transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 180ms ease, background 150ms ease, border-color 150ms ease;
}
.post-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(30, 28, 26, 0.08);
}
.post-card:active {
  transform: scale(0.985);
  transition: transform 80ms ease;
}
</style>
