<script setup lang="ts">
import { ref } from 'vue'
import { Heart, MessageSquare } from 'lucide-vue-next'
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
    class="px-3 py-2.5 rounded-lg cursor-pointer transition-colors border border-transparent relative"
    :class="isSelected ? 'bg-[#094771] border-[#007acc]' : 'hover:bg-[#2a2a2a]'"
    @click="emit('select', post.id)"
  >
    <!-- 置顶标识 -->
    <div v-if="post.isPinned" class="flex items-center gap-1 mb-1">
      <span class="text-xs text-[#e74c3c] font-medium">📌 置顶</span>
      <span v-if="post.pinExpiresAt" class="text-xs text-[#888]">
        · 剩余 {{ computeRemaining(post.pinExpiresAt) }}
      </span>
    </div>

    <!-- 内推标识 -->
    <div v-if="post.postType === 'referral'" class="absolute top-2 right-2">
      <span class="text-xs text-[#4a9eff] bg-[#4a9eff]/15 px-2 py-0.5 rounded font-medium">内推</span>
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
        <div class="font-semibold text-sm" :class="isSelected ? 'text-white' : 'text-[#ddd]'">
          {{ post.title }}
        </div>
        <!-- Bounty badge for QA posts -->
        <div v-if="post.postType === 'qa'" class="flex items-center gap-2 mt-0.5">
          <span class="text-xs text-[#f0c040]">🫘 {{ post.bountyBeans }}</span>
          <span v-if="post.bountyStatus === 'active'" class="text-xs text-[#4a9eff]">求助中</span>
          <span v-else-if="post.bountyStatus === 'expired'" class="text-xs text-[#888]">已结束</span>
          <span v-else-if="post.bountyStatus === 'distributed'" class="text-xs text-[#27ae60]">已分配</span>
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
