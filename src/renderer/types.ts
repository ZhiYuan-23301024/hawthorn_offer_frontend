export interface UserProfile {
  id: string
  email: string
  nickname?: string
  bio?: string
  avatar?: string
  chsiVerified: boolean
}

export interface HeatmapPoint {
  date: string
  count: number
}

export interface ChsiVerificationStatus {
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectReason?: string
  submittedAt?: string
}

export interface Plugin {
  id: string
  name: string
  icon: string
  component: any
  activate: () => void
  deactivate: () => void
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

export interface TreeNode {
  id: string
  label: string
  type: 'folder' | 'file'
  expanded?: boolean
  children?: TreeNode[]
  path?: string
}
