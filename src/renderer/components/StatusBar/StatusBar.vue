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
  <footer class="h-6 bg-vscode-sidebar border-t border-vscode-border flex items-center justify-between px-3">
    <div class="flex items-center space-x-4">
      <div class="flex items-center space-x-1 cursor-pointer hover:text-vscode-icon-hover transition-colors">
        <GitBranch class="w-3 h-3 text-vscode-icon" />
        <span class="text-xs text-vscode-icon">{{ branch }}</span>
      </div>
      <div class="flex items-center space-x-1">
        <CheckCircle v-if="status === 'normal'" class="w-3 h-3 text-vscode-success" />
        <AlertCircle v-else class="w-3 h-3 text-vscode-warning" />
        <span class="text-xs text-vscode-icon">Ready</span>
      </div>
    </div>
    <div class="flex items-center space-x-4">
      <span class="text-xs text-vscode-icon">{{ language }}</span>
      <span class="text-xs text-vscode-icon">{{ encoding }}</span>
      <span class="text-xs text-vscode-icon">Ln {{ line }}, Col {{ column }}</span>
    </div>
  </footer>
</template>
