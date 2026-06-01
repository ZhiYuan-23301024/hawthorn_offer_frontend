<script setup lang="ts">
import type { ResumePostListVO } from '@/api/post'
import { avatarUrl, formatTimeAgo } from '@/utils/format'

defineProps<{
  resume: ResumePostListVO
  isSelected: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
}>()
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
