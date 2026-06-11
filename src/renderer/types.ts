export interface UserProfile {
  id: string
  email: string
  nickname?: string
  bio?: string
  avatar?: string
  chsiVerified: boolean
  chsiReviewer?: boolean
  beans: number
}

export interface HeatmapPoint {
  date: string
  count: number
  postCount?: number
  commentCount?: number
  offerCount?: number
}

export interface ChsiVerificationStatus {
  id?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  realName?: string
  studentId?: string
  proofImageUrl?: string
  rejectReason?: string
  submittedAt?: string
  reviewedAt?: string
  reviewedBy?: string
  userChsiVerified?: boolean
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
