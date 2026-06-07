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

export interface CheckinPlan {
  id: string
  name: string
  description: string
  createdAt: string
  tasks: PlanTask[]
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