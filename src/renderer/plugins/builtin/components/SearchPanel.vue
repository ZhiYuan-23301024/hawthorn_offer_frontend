<script setup lang="ts">
import { ref } from 'vue'
import { Search, FileText } from 'lucide-vue-next'

const searchQuery = ref('')
const searchResults = ref([
  { file: 'src/main.ts', line: 15, text: 'console.log("Hello World")' },
  { file: 'src/App.vue', line: 23, text: '<div class="app">' },
  { file: 'src/components/Sidebar.vue', line: 8, text: 'const sidebarStore' }
])
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="p-2 border-b border-vscode-border">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vscode-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search..."
          class="w-full bg-vscode-bg border border-vscode-border rounded px-8 py-2 text-sm text-vscode-text placeholder-vscode-text-secondary focus:outline-none focus:border-vscode-info"
        />
      </div>
    </div>
    <div class="flex-1 overflow-y-auto p-2">
      <div class="text-xs font-semibold text-vscode-text-secondary uppercase tracking-wider mb-2 px-2">
        Search Results
      </div>
      <div class="space-y-1">
        <div
          v-for="(result, index) in searchResults"
          :key="index"
          class="flex items-center px-2 py-1.5 rounded cursor-pointer hover:bg-vscode-selected transition-colors"
        >
          <FileText class="w-4 h-4 text-vscode-icon mr-2" />
          <div class="flex-1 min-w-0">
            <div class="text-sm text-vscode-text truncate">{{ result.file }}</div>
            <div class="text-xs text-vscode-text-secondary truncate">{{ result.text }}</div>
          </div>
          <span class="text-xs text-vscode-text-secondary ml-2">{{ result.line }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
