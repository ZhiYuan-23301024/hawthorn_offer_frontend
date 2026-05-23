<script setup lang="ts">
import { Puzzle, Star, Download, Settings } from 'lucide-vue-next'

const extensions = [
  { name: 'Vue Language Features', author: 'Vue.volar', installs: '5M', stars: 4.5 },
  { name: 'TypeScript', author: 'Microsoft', installs: '10M', stars: 4.8 },
  { name: 'ESLint', author: 'Dirk Baeumer', installs: '20M', stars: 4.7 },
  { name: 'Prettier', author: 'Prettier', installs: '15M', stars: 4.6 }
]
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="p-2 border-b border-vscode-border">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-vscode-text-secondary uppercase tracking-wider">
          Installed Extensions
        </span>
        <button class="p-1 rounded hover:bg-vscode-active transition-colors" title="Settings">
          <Settings class="w-4 h-4 text-vscode-icon" />
        </button>
      </div>
    </div>
    <div class="p-2 space-y-2">
      <div
        v-for="ext in extensions"
        :key="ext.name"
        class="flex items-center p-2 bg-vscode-active rounded cursor-pointer hover:bg-vscode-selected transition-colors"
      >
        <div class="w-10 h-10 bg-vscode-bg rounded flex items-center justify-center mr-3">
          <Puzzle class="w-5 h-5 text-vscode-info" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-vscode-text truncate">{{ ext.name }}</div>
          <div class="text-xs text-vscode-text-secondary">{{ ext.author }}</div>
        </div>
        <div class="flex flex-col items-end">
          <div class="flex items-center">
            <Star class="w-3 h-3 text-vscode-warning mr-1" />
            <span class="text-xs text-vscode-text-secondary">{{ ext.stars }}</span>
          </div>
          <span class="text-xs text-vscode-text-secondary">{{ ext.installs }}</span>
        </div>
        <button class="ml-2 p-1 rounded hover:bg-vscode-bg transition-colors" title="Install">
          <Download class="w-4 h-4 text-vscode-success" />
        </button>
      </div>
    </div>
  </div>
</template>
