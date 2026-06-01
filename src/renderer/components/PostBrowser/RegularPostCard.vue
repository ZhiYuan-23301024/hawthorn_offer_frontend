<script setup lang="ts">
import { Heart, MessageSquare } from 'lucide-vue-next'
import type { PostListVO } from '@/api/post'
import { avatarUrl, avatarColor, formatTimeAgo } from '@/utils/format'

defineProps<{
  post: PostListVO
  isSelected: boolean
  isLiked: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  like: [id: string]
}>()
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
