<script setup lang="ts">
import { ref } from 'vue'
import { Heart, MessageSquare } from 'lucide-vue-next'
import type { ResumePostListVO } from '@/api/post'
import { avatarUrl, avatarColor, formatTimeAgo } from '@/utils/format'

defineProps<{
  resume: ResumePostListVO
  isSelected: boolean
  isLiked: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  like: [id: string]
}>()

const imgError = ref(false)
</script>

<template>
  <div
    class="px-3 py-2.5 rounded-lg cursor-pointer transition-colors border relative"
    :class="resume.deleted
      ? (isSelected ? 'bg-[#2a2a2a] border-[#555] opacity-70' : 'bg-[#1e1e1e] border-[#333] opacity-60 hover:opacity-80')
      : (isSelected ? 'bg-[#094771] border-[#007acc]' : 'border-transparent hover:bg-[#2a2a2a]')"
    @click="emit('select', resume.id)"
  >
    <span v-if="resume.deleted" class="absolute top-1.5 right-2 text-[10px] text-[#e74c3c] bg-[#e74c3c]/10 px-1.5 py-0.5 rounded">已删除</span>
    <div class="flex items-start gap-2.5">
      <!-- Avatar -->
      <div
        class="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden"
        :style="{ backgroundColor: avatarColor(resume.userId) }"
      >
        <img v-show="!imgError" :src="avatarUrl(resume.authorAvatarUrl) || ''" alt="" class="w-full h-full object-cover" @error="imgError = true" />
        <span v-show="imgError || !avatarUrl(resume.authorAvatarUrl)">{{ resume.authorAvatar || '?' }}</span>
      </div>

      <div class="flex-1 min-w-0">
        <!-- Title + Price tag + Deleted -->
        <div class="font-semibold text-sm flex items-center gap-2" :class="isSelected ? 'text-white' : 'text-[#ddd]'">
          <span :class="resume.deleted ? 'text-[#666] line-through' : ''">{{ resume.resumeName }}</span>
          <span v-if="!resume.deleted" class="flex-shrink-0 text-[10px] text-[#f0c040] bg-[#3d3520] px-1.5 py-0.5 rounded">🫘 {{ resume.price || 50 }}</span>
        </div>

        <!-- Author -->
        <div class="text-xs mt-0.5" :class="isSelected ? 'text-[#b0d4f1]' : 'text-[#aaa]'">
          {{ resume.authorName }}
        </div>

        <!-- Promo text -->
        <div
          v-if="resume.promoText"
          class="text-xs mt-1 leading-relaxed line-clamp-2"
          :class="isSelected ? 'text-[#a0c8e8]' : 'text-[#999]'"
        >
          {{ resume.promoText }}
        </div>

        <!-- Meta row -->
        <div class="flex items-center gap-3 mt-1.5 text-xs" :class="isSelected ? 'text-[#b0d4f1]' : 'text-[#888]'">
          <button
            class="flex items-center gap-0.5 hover:text-[#e74c3c] transition-colors"
            :class="isLiked ? 'text-[#e74c3c]' : ''"
            @click.stop="emit('like', resume.id)"
          >
            <Heart class="w-3 h-3" :fill="isLiked ? 'currentColor' : 'none'" />
            {{ resume.likeCount || 0 }}
          </button>
          <span class="flex items-center gap-0.5">
            <MessageSquare class="w-3 h-3" />
            {{ resume.commentCount || 0 }}
          </span>
          <span>{{ formatTimeAgo(resume.createdAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
