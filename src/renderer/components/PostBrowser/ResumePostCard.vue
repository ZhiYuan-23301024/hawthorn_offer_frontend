<script setup lang="ts">
import { ref } from 'vue'
import { Heart, MessageSquare , Bean } from 'lucide-vue-next'
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
    class="px-3 py-2.5 rounded-lg cursor-pointer border relative post-card"
    :class="resume.deleted ? 'opacity-60' : ''"
    :style="{
      backgroundColor: resume.deleted
        ? 'transparent'
        : (isSelected ? 'var(--color-primary-subtle)' : 'transparent'),
      borderColor: resume.deleted
        ? 'var(--color-border)'
        : (isSelected ? 'var(--color-primary)' : 'transparent'),
      boxShadow: !resume.deleted && isSelected ? 'inset 0 1px 3px rgba(123,143,166,0.12), 0 2px 8px rgba(30,28,26,0.06)' : 'none',
      transform: !resume.deleted && isSelected ? 'translateY(-1px)' : 'none',
    }"
    @click="emit('select', resume.id)"
    @mouseenter="(e: MouseEvent) => { if (!isSelected && !resume.deleted) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface-hover)' }"
    @mouseleave="(e: MouseEvent) => { if (!isSelected && !resume.deleted) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }"
  >
    <span v-if="resume.deleted && resume.pastGrace" class="absolute top-1.5 right-2 text-xs px-1.5 py-0.5 rounded" style="color: var(--color-danger); background-color: var(--color-danger-subtle);">已删除</span>
    <span v-else-if="resume.deleted && !resume.pastGrace" class="absolute top-1.5 right-2 text-xs px-1.5 py-0.5 rounded" style="color: var(--color-warning); background-color: var(--color-warning-subtle);">即将过期({{ resume.graceRemainingDays > 0 ? resume.graceRemainingDays : '不足1' }}天)</span>
    <div class="flex items-start gap-2.5">
      <div
        class="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden"
        :style="{ backgroundColor: avatarColor(resume.userId) }"
      >
        <img v-show="!imgError" :src="avatarUrl(resume.authorAvatarUrl) || ''" alt="" class="w-full h-full object-cover" @error="imgError = true" />
        <span v-show="imgError || !avatarUrl(resume.authorAvatarUrl)">{{ resume.authorAvatar || '?' }}</span>
      </div>
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-sm flex items-center gap-2">
          <span :class="resume.deleted ? 'line-through' : ''" :style="{ color: resume.deleted ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)' }">{{ resume.resumeName }}</span>
          <span v-if="!resume.deleted" class="flex-shrink-0 text-xs px-1.5 py-0.5 rounded" style="color: var(--color-cta-dark); background-color: var(--color-cta-subtle);">{{ resume.price || 50  }} <Bean class="w-3.5 h-3.5 inline-block align-text-bottom" /></span>
        </div>
        <div class="text-sm mt-0.5" style="color: var(--color-text-secondary);">{{ resume.authorName }}</div>
        <div v-if="resume.promoText" class="text-sm mt-1.5 leading-relaxed line-clamp-2" style="color: var(--color-text-tertiary);">{{ resume.promoText }}</div>
        <div class="flex items-center gap-3 mt-2 text-xs" style="color: var(--color-text-tertiary);">
          <button
            class="flex items-center gap-0.5 transition-colors"
            :style="{ color: isLiked ? 'var(--color-danger)' : 'var(--color-text-tertiary)' }"
            @click.stop="emit('like', resume.id)"
            @mouseenter="(e: MouseEvent) => { if (!isLiked) (e.currentTarget as HTMLElement).style.color = 'var(--color-danger)' }"
            @mouseleave="(e: MouseEvent) => { if (!isLiked) (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)' }"
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
