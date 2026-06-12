<script setup lang="ts">
import Sidebar from '@/components/Sidebar/Sidebar.vue'
import Workspace from '@/components/Workspace/Workspace.vue'
import Editor from '@/components/Editor/Editor.vue'
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-vscode-bg overflow-hidden">
    <div class="flex-1 flex overflow-hidden">
      <Sidebar />
      <Workspace />
      <Editor />
    </div>
  </div>
</template>
