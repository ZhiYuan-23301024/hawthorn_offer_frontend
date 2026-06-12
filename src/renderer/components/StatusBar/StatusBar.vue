<script setup lang="ts">
import { ref } from 'vue'
import { GitBranch, CheckCircle, AlertCircle } from 'lucide-vue-next'

const branch = ref('main')
const line = ref(1)
const column = ref(1)
const language = ref('TypeScript')
const encoding = ref('UTF-8')
const status = ref('normal')
</script>

<template>
  <footer
    class="h-6 flex items-center justify-between px-3 flex-shrink-0"
    style="background-color: var(--color-surface); border-top: 1px solid var(--color-divider); font-family: var(--font-body);"
  >
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-1 cursor-pointer transition-colors" style="color: var(--color-text-tertiary);">
        <GitBranch class="w-3 h-3" />
        <span class="text-xs">{{ branch }}</span>
      </div>
      <div class="flex items-center gap-1" style="color: var(--color-text-tertiary);">
        <CheckCircle v-if="status === 'normal'" class="w-3 h-3" style="color: var(--color-success);" />
        <AlertCircle v-else class="w-3 h-3" style="color: var(--color-warning);" />
        <span class="text-xs">Ready</span>
      </div>
    </div>
    <div class="flex items-center gap-4" style="color: var(--color-text-tertiary);">
      <span class="text-xs">{{ language }}</span>
      <span class="text-xs">{{ encoding }}</span>
      <span class="text-xs">Ln {{ line }}, Col {{ column }}</span>
    </div>
  </footer>
</template>
