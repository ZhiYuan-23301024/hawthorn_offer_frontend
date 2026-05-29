<script setup lang="ts">
import { API_BASE_URL } from '@/api/http'
import type { ResumeListVO } from '@/api/post'

defineProps<{
  resume: ResumeListVO
  isSelected: boolean
}>()

function avatarUrl(url: string | null): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http')) return url
  return API_BASE_URL + url
}

const emit = defineEmits<{
  select: [id: string]
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
    @click="emit('select', resume.id)"
  >
    <div class="flex items-start gap-2.5">
      <div
        class="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden"
        :class="isSelected ? 'bg-[#2b6cb0]' : 'bg-[#555]'"
      >
        <img v-if="avatarUrl(resume.authorAvatarUrl)" :src="avatarUrl(resume.authorAvatarUrl)" class="w-full h-full object-cover" />
        <span v-else>{{ resume.authorAvatar }}</span>
      </div>
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-sm" :class="isSelected ? 'text-white' : 'text-[#ddd]'">
          {{ resume.resumeName }}
        </div>
        <div class="flex items-center gap-3 mt-1.5 text-xs" :class="isSelected ? 'text-[#b0d4f1]' : 'text-[#888]'">
          <span>{{ formatTimeAgo(resume.createdAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
