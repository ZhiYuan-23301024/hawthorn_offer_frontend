<script setup lang="ts">
import { ref } from 'vue'
import { ChevronRight, ChevronDown, Folder, FileCode } from 'lucide-vue-next'
import type { TreeNode } from '@/types'
import { useWorkspaceStore } from '@/stores/workspace'
import { useEditorStore } from '@/stores/editor'

const workspaceStore = useWorkspaceStore()
const editorStore = useEditorStore()

const treeData = ref<TreeNode[]>([
  {
    id: '1',
    label: 'src',
    type: 'folder',
    expanded: true,
    children: [
      {
        id: '1-1',
        label: 'main.ts',
        type: 'file',
        path: '/src/main.ts'
      },
      {
        id: '1-2',
        label: 'App.vue',
        type: 'file',
        path: '/src/App.vue'
      },
      {
        id: '1-3',
        label: 'components',
        type: 'folder',
        expanded: false,
        children: [
          {
            id: '1-3-1',
            label: 'Sidebar.vue',
            type: 'file',
            path: '/src/components/Sidebar.vue'
          },
          {
            id: '1-3-2',
            label: 'Editor.vue',
            type: 'file',
            path: '/src/components/Editor.vue'
          }
        ]
      }
    ]
  },
  {
    id: '2',
    label: 'package.json',
    type: 'file',
    path: '/package.json'
  },
  {
    id: '3',
    label: 'README.md',
    type: 'file',
    path: '/README.md'
  }
])

function toggleExpand(node: TreeNode) {
  node.expanded = !node.expanded
}

function handleNodeClick(node: TreeNode) {
  workspaceStore.setSelectedNode(node.id)
  if (node.type === 'file') {
    editorStore.openFile({
      id: node.id,
      title: node.label,
      path: node.path || '',
      content: `// Content of ${node.label}\n\nconsole.log('Hello World');`,
      language: node.label.split('.').pop() || 'txt'
    })
  }
}
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="p-2">
      <div class="text-xs font-semibold text-vscode-text-secondary uppercase tracking-wider mb-2 px-2">
        Explorer
      </div>
      <div class="space-y-0">
        <template v-for="node in treeData" :key="node.id">
          <div
            class="flex items-center px-2 py-1 rounded cursor-pointer hover:bg-vscode-selected transition-colors"
            :class="{ 'bg-vscode-selected': workspaceStore.selectedNode === node.id }"
            @click="handleNodeClick(node)"
          >
            <button
              v-if="node.type === 'folder'"
              class="w-4 h-4 flex items-center justify-center mr-1"
              @click.stop="toggleExpand(node)"
            >
              <ChevronDown v-if="node.expanded" class="w-3 h-3 text-vscode-icon" />
              <ChevronRight v-else class="w-3 h-3 text-vscode-icon" />
            </button>
            <span v-else class="w-4"></span>
            <Folder v-if="node.type === 'folder'" class="w-4 h-4 text-vscode-warning mr-1" />
            <FileCode v-else class="w-4 h-4 text-vscode-icon-hover mr-1" />
            <span class="text-sm text-vscode-text truncate">{{ node.label }}</span>
          </div>
          <div
            v-if="node.type === 'folder' && node.expanded && node.children"
            class="ml-4"
          >
            <template v-for="child in node.children" :key="child.id">
              <div
                class="flex items-center px-2 py-1 rounded cursor-pointer hover:bg-vscode-selected transition-colors"
                :class="{ 'bg-vscode-selected': workspaceStore.selectedNode === child.id }"
                @click="handleNodeClick(child)"
              >
                <button
                  v-if="child.type === 'folder'"
                  class="w-4 h-4 flex items-center justify-center mr-1"
                  @click.stop="toggleExpand(child)"
                >
                  <ChevronDown v-if="child.expanded" class="w-3 h-3 text-vscode-icon" />
                  <ChevronRight v-else class="w-3 h-3 text-vscode-icon" />
                </button>
                <span v-else class="w-4"></span>
                <Folder v-if="child.type === 'folder'" class="w-4 h-4 text-vscode-warning mr-1" />
                <FileCode v-else class="w-4 h-4 text-vscode-icon-hover mr-1" />
                <span class="text-sm text-vscode-text truncate">{{ child.label }}</span>
              </div>
              <div
                v-if="child.type === 'folder' && child.expanded && child.children"
                class="ml-4"
              >
                <div
                  v-for="grandchild in child.children"
                  :key="grandchild.id"
                  class="flex items-center px-2 py-1 rounded cursor-pointer hover:bg-vscode-selected transition-colors"
                  :class="{ 'bg-vscode-selected': workspaceStore.selectedNode === grandchild.id }"
                  @click="handleNodeClick(grandchild)"
                >
                  <span class="w-8"></span>
                  <FileCode class="w-4 h-4 text-vscode-icon-hover mr-1" />
                  <span class="text-sm text-vscode-text truncate">{{ grandchild.label }}</span>
                </div>
              </div>
            </template>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
