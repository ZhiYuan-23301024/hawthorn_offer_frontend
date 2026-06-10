export interface CheckinTask {
  id: string
  name: string
  icon: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  downloads: number
  version: string
  latestVersion: string
  hasUpdate: boolean
  sourceUrl: string
  readme: string
}

export interface PlanNode {
  id: string
  taskId: string
  taskName: string
  category: string
  x: number
  y: number
  completed: boolean
  completedAt?: string
}

export interface PlanEdge {
  id: string
  sourceNodeId: string
  targetNodeId: string
  type: 'main' | 'branch' | 'side'
}

export const EdgeType = {
  MAIN: 'main' as const,
  BRANCH: 'branch' as const,
  SIDE: 'side' as const,
}

export interface CheckinPlan {
  id: string
  name: string
  description: string
  createdAt: string
  nodes: PlanNode[]
  edges: PlanEdge[]
  tasks?: PlanTask[]
}

export interface PlanTask {
  id: string
  taskId: string
  taskName: string
  order: number
  completed: boolean
  completedAt?: string
}

export interface TaskNode {
  id: string
  title: string
  description: string
  completed: boolean
  order: number
  connections?: string[]
}