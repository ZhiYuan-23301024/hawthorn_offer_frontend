import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TreeNode } from '@/types'

export const useWorkspaceStore = defineStore('workspace', () => {
  const activePanel = ref('explorer')
  const selectedNode = ref<string | null>(null)
  const treeData = ref<TreeNode[]>([])

  function setActivePanel(panelId: string) {
    activePanel.value = panelId
  }

  function setSelectedNode(nodeId: string | null) {
    selectedNode.value = nodeId
  }

  function setTreeData(data: TreeNode[]) {
    treeData.value = data
  }

  return {
    activePanel,
    selectedNode,
    treeData,
    setActivePanel,
    setSelectedNode,
    setTreeData
  }
})
