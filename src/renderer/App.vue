<script setup lang="ts">
import Sidebar from '@/components/Sidebar/Sidebar.vue'
import Workspace from '@/components/Workspace/Workspace.vue'
import Editor from '@/components/Editor/Editor.vue'
</script>

<template>
  <div class="h-screen w-screen flex overflow-hidden" style="background-color: var(--color-bg); color: var(--color-text-primary); font-family: var(--font-body);">
    <Sidebar />
    <Workspace />
    <Editor />
  </div>
</template>
