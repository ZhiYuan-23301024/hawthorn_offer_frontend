export interface Plugin {
  id: string
  name: string
  icon: string
  component: any
  activate: () => void
  deactivate: () => void
}

export interface SidebarItem {
  id: string
  icon: string
  label: string
  pluginId: string
}

export interface TreeNode {
  id: string
  label: string
  type: 'file' | 'folder'
  children?: TreeNode[]
  expanded?: boolean
  path?: string
}

export interface EditorTab {
  id: string
  title: string
  path?: string
  content?: string
  language?: string
  component?: any
  componentProps?: Record<string, unknown>
}

export interface WorkspacePanel {
  id: string
  title: string
}
