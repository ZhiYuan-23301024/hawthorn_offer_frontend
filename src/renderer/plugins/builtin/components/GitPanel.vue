<script setup lang="ts">
import { GitBranch, GitCommit, Download, Upload, FileEdit, Plus } from 'lucide-vue-next'

const branchName = 'main'
const commits = [
  { id: 'a1b2c3d', message: 'Initial commit', time: '2 hours ago' },
  { id: 'e4f5g6h', message: 'Add sidebar component', time: '1 hour ago' },
  { id: 'i7j8k9l', message: 'Implement editor', time: '30 minutes ago' }
]
const stagedFiles = ['src/App.vue', 'src/components/Editor.vue']
const unstagedFiles = ['src/components/Sidebar.vue']
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="p-2 border-b border-vscode-border">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <GitBranch class="w-4 h-4 text-vscode-success mr-2" />
          <span class="text-sm font-medium text-vscode-text">{{ branchName }}</span>
        </div>
        <div class="flex items-center space-x-1">
          <button class="p-1 rounded hover:bg-vscode-active transition-colors" title="Pull">
            <Download class="w-4 h-4 text-vscode-icon" />
          </button>
          <button class="p-1 rounded hover:bg-vscode-active transition-colors" title="Push">
            <Upload class="w-4 h-4 text-vscode-icon" />
          </button>
        </div>
      </div>
    </div>
    <div class="flex-1 overflow-y-auto">
      <div class="p-2 border-b border-vscode-border">
        <div class="text-xs font-semibold text-vscode-text-secondary uppercase tracking-wider mb-2">
          Staged Changes
        </div>
        <div class="space-y-1">
          <div
            v-for="file in stagedFiles"
            :key="file"
            class="flex items-center px-2 py-1 rounded cursor-pointer hover:bg-vscode-selected transition-colors"
          >
            <Plus class="w-3 h-3 text-vscode-success mr-2" />
            <span class="text-sm text-vscode-text truncate">{{ file }}</span>
          </div>
        </div>
      </div>
      <div class="p-2 border-b border-vscode-border">
        <div class="text-xs font-semibold text-vscode-text-secondary uppercase tracking-wider mb-2">
          Unstaged Changes
        </div>
        <div class="space-y-1">
          <div
            v-for="file in unstagedFiles"
            :key="file"
            class="flex items-center px-2 py-1 rounded cursor-pointer hover:bg-vscode-selected transition-colors"
          >
            <FileEdit class="w-3 h-3 text-vscode-warning mr-2" />
            <span class="text-sm text-vscode-text truncate">{{ file }}</span>
          </div>
        </div>
      </div>
      <div class="p-2">
        <div class="text-xs font-semibold text-vscode-text-secondary uppercase tracking-wider mb-2">
          Recent Commits
        </div>
        <div class="space-y-2">
          <div
            v-for="commit in commits"
            :key="commit.id"
            class="px-2 py-2 rounded hover:bg-vscode-selected transition-colors cursor-pointer"
          >
            <div class="flex items-center">
              <GitCommit class="w-4 h-4 text-vscode-icon mr-2" />
              <div class="flex-1">
                <div class="text-sm text-vscode-text">{{ commit.message }}</div>
                <div class="text-xs text-vscode-text-secondary">{{ commit.id }} - {{ commit.time }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>