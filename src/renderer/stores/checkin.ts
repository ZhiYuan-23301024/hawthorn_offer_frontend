import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CheckinTask, CheckinPlan, PlanNode, PlanEdge, PlanTask } from '@/types/checkin'
import { taskPluginLoader } from '@/taskPlugins/TaskPluginLoader'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export const useCheckinStore = defineStore('checkin', () => {
  const availableTasks = ref<CheckinTask[]>([])
  const installedTasks = ref<CheckinTask[]>([])
  const myPlans = ref<CheckinPlan[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTasksFromAPI() {
    isLoading.value = true
    error.value = null
    try {
      const url = `${API_BASE_URL}/plugins?page=1&size=20`
      console.log('Fetching tasks from:', url)
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      
      console.log('Raw response data:', data)
      
      const plugins = Array.isArray(data) ? data : (data.records || data.content || data.data || [])
      
      console.log('Extracted plugins:', plugins)
      
      if (!Array.isArray(plugins)) {
        throw new Error('Invalid data format: expected array')
      }
      
      availableTasks.value = plugins.map((plugin: any) => ({
        id: plugin.id,
        name: plugin.name,
        icon: 'circle',
        description: plugin.description || '',
        difficulty: 'medium' as const,
        category: plugin.category || '其他',
        downloads: plugin.downloads || 0,
        version: plugin.version || '1.0.0',
        latestVersion: plugin.version || '1.0.0',
        hasUpdate: false,
        sourceUrl: '',
        readme: ''
      }))
      
      console.log('Available tasks after mapping:', availableTasks.value)
      syncInstalledStatus()
    } catch (err) {
      error.value = '获取任务列表失败，使用本地缓存'
      console.error('Failed to fetch tasks:', err)
      loadLocalFallback()
    } finally {
      isLoading.value = false
    }
  }

  function loadLocalFallback() {
    const fallbackTasks: CheckinTask[] = [
      {
        id: '1',
        name: '每日代码',
        icon: 'code',
        description: '每天编写代码至少1小时',
        difficulty: 'medium',
        category: '编程',
        downloads: 1256,
        version: '1.0.0',
        latestVersion: '1.1.0',
        hasUpdate: true,
        sourceUrl: 'https://github.com/hawthorn/daily-code',
        readme: '# 每日代码\n\n每天编写代码至少1小时，养成编程习惯。'
      },
      {
        id: '2',
        name: '阅读学习',
        icon: 'book',
        description: '每天阅读技术书籍或文章',
        difficulty: 'easy',
        category: '学习',
        downloads: 892,
        version: '2.0.0',
        latestVersion: '2.0.0',
        hasUpdate: false,
        sourceUrl: 'https://github.com/hawthorn/daily-reading',
        readme: '# 阅读学习\n\n每天阅读技术书籍或文章。'
      },
      {
        id: '3',
        name: '运动健身',
        icon: 'dumbbell',
        description: '每天运动30分钟',
        difficulty: 'medium',
        category: '健康',
        downloads: 2103,
        version: '1.5.0',
        latestVersion: '1.6.0',
        hasUpdate: true,
        sourceUrl: 'https://github.com/hawthorn/fitness',
        readme: '# 运动健身\n\n每天运动30分钟，保持身体健康。'
      },
      {
        id: '4',
        name: '冥想放松',
        icon: 'brain',
        description: '每天冥想15分钟',
        difficulty: 'easy',
        category: '健康',
        downloads: 567,
        version: '1.2.0',
        latestVersion: '1.2.0',
        hasUpdate: false,
        sourceUrl: 'https://github.com/hawthorn/meditation',
        readme: '# 冥想放松\n\n每天冥想15分钟，放松身心。'
      },
      {
        id: '5',
        name: '早起打卡',
        icon: 'sunrise',
        description: '每天早上7点前起床',
        difficulty: 'hard',
        category: '习惯',
        downloads: 3421,
        version: '2.1.0',
        latestVersion: '2.1.0',
        hasUpdate: false,
        sourceUrl: 'https://github.com/hawthorn/early-morning',
        readme: '# 早起打卡\n\n每天早上7点前起床。'
      },
      {
        id: '6',
        name: '早睡打卡',
        icon: 'moon',
        description: '每天晚上11点前睡觉',
        difficulty: 'hard',
        category: '习惯',
        downloads: 2891,
        version: '1.8.0',
        latestVersion: '1.9.0',
        hasUpdate: true,
        sourceUrl: 'https://github.com/hawthorn/early-sleep',
        readme: '# 早睡打卡\n\n每天晚上11点前睡觉。'
      }
    ]
    availableTasks.value = fallbackTasks
    syncInstalledStatus()
  }

  function syncInstalledStatus() {
    const savedInstalled = localStorage.getItem('checkin_installedTasks')
    if (savedInstalled) {
      const installedIds = JSON.parse(savedInstalled)
      installedTasks.value = availableTasks.value.filter(t => installedIds.includes(t.id))
    } else {
      installedTasks.value = availableTasks.value.slice(0, 4)
      saveInstalledTasks()
    }
  }

  function migratePlan(plan: any): CheckinPlan {
    if (plan.nodes && plan.edges) return plan as CheckinPlan
    
    if (plan.tasks && Array.isArray(plan.tasks)) {
      const nodes: PlanNode[] = plan.tasks.map((t: PlanTask, i: number) => ({
        id: `node-${Date.now()}-${i}`,
        taskId: t.taskId,
        taskName: t.taskName,
        category: '其他',
        x: 100 + (i % 3) * 200,
        y: 100 + Math.floor(i / 3) * 150,
        completed: t.completed || false,
        completedAt: t.completedAt,
      }))
      
      const edges: PlanEdge[] = []
      for (let i = 0; i < nodes.length - 1; i++) {
        edges.push({
          id: `edge-${Date.now()}-${i}`,
          sourceNodeId: nodes[i].id,
          targetNodeId: nodes[i + 1].id,
          type: 'main',
        })
      }
      
      return { ...plan, nodes, edges } as CheckinPlan
    }
    
    return { ...plan, nodes: [], edges: [] } as CheckinPlan
  }

  function loadData() {
    const savedPlans = localStorage.getItem('checkin_myPlans')
    if (savedPlans) {
      myPlans.value = JSON.parse(savedPlans).map((plan: any) => migratePlan(plan))
    } else {
      myPlans.value = [
        {
          id: 'default',
          name: '日常打卡',
          description: '日常学习和生活打卡计划',
          createdAt: new Date().toISOString().split('T')[0],
          nodes: installedTasks.value.slice(0, 3).map((t, i) => ({
            id: `node-${Date.now()}-${i}`,
            taskId: t.id,
            taskName: t.name,
            category: t.category,
            x: 100 + i * 200,
            y: 150,
            completed: false
          })),
          edges: installedTasks.value.slice(0, 3).map((_, i) => ({
            id: `edge-${Date.now()}-${i}`,
            sourceNodeId: `node-${Date.now()}-${i}`,
            targetNodeId: `node-${Date.now()}-${i + 1}`,
            type: 'main' as const
          })).slice(0, 2)
        }
      ]
      saveMyPlans()
    }
  }

  function saveInstalledTasks() {
    const ids = installedTasks.value.map(t => t.id)
    localStorage.setItem('checkin_installedTasks', JSON.stringify(ids))
  }

  function saveMyPlans() {
    localStorage.setItem('checkin_myPlans', JSON.stringify(myPlans.value))
  }

  async function installTask(taskId: string) {
    const task = availableTasks.value.find(t => t.id === taskId)
    if (task && !installedTasks.value.find(t => t.id === taskId)) {
      try {
        await taskPluginLoader.install(taskId)
      } catch (err) {
        console.warn('Failed to install plugin:', err)
      }
      installedTasks.value.push(task)
      saveInstalledTasks()
    }
  }

  async function uninstallTask(taskId: string) {
    try {
      await taskPluginLoader.uninstall(taskId)
    } catch (err) {
      console.warn('Failed to uninstall plugin:', err)
    }
    installedTasks.value = installedTasks.value.filter(t => t.id !== taskId)
    saveInstalledTasks()
  }

  function createPlan(name: string, description?: string): CheckinPlan {
    const newPlan: CheckinPlan = {
      id: `plan-${Date.now()}`,
      name,
      description: description || '',
      createdAt: new Date().toISOString().split('T')[0],
      nodes: [],
      edges: [],
    }

    myPlans.value.push(newPlan)
    saveMyPlans()
    return newPlan
  }

  function updatePlanStructure(
    planId: string,
    nodes: PlanNode[],
    edges: PlanEdge[]
  ) {
    const plan = myPlans.value.find(p => p.id === planId)
    if (plan) {
      plan.nodes = nodes
      plan.edges = edges
      saveMyPlans()
    }
  }

  function getPlanEntryNode(planId: string): PlanNode | null {
    const plan = myPlans.value.find(p => p.id === planId)
    if (!plan || plan.nodes.length === 0) return null
    
    const nodesWithIncoming = new Set(plan.edges.map(e => e.targetNodeId))
    return plan.nodes.find(n => !nodesWithIncoming.has(n.id)) || plan.nodes[0]
  }

  function getNextNodes(planId: string, nodeId: string, edgeType?: 'main' | 'branch' | 'side'): PlanNode[] {
    const plan = myPlans.value.find(p => p.id === planId)
    if (!plan) return []
    const nextNodeIds = plan.edges
      .filter(e => e.sourceNodeId === nodeId)
      .filter(e => !edgeType || e.type === edgeType)
      .map(e => e.targetNodeId)
    return plan.nodes.filter(n => nextNodeIds.includes(n.id))
  }

  function getMainPathNodes(planId: string): PlanNode[] {
    const plan = myPlans.value.find(p => p.id === planId)
    if (!plan) return []
    const entry = getPlanEntryNode(planId)
    if (!entry) return []
    
    const result: PlanNode[] = []
    const visited = new Set<string>()
    const queue = [entry.id]
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!
      if (visited.has(nodeId)) continue
      visited.add(nodeId)
      const node = plan.nodes.find(n => n.id === nodeId)
      if (node) result.push(node)
      plan.edges
        .filter(e => e.sourceNodeId === nodeId && e.type === 'main')
        .forEach(e => queue.push(e.targetNodeId))
    }
    return result
  }

  function deletePlan(planId: string) {
    myPlans.value = myPlans.value.filter(p => p.id !== planId)
    saveMyPlans()
  }

  function renamePlan(planId: string, newName: string) {
    const plan = myPlans.value.find(p => p.id === planId)
    if (plan) {
      plan.name = newName
      saveMyPlans()
    }
  }

  function completeTask(planId: string, nodeId: string) {
    const plan = myPlans.value.find(p => p.id === planId)
    if (plan) {
      const node = plan.nodes.find(n => n.id === nodeId)
      if (node) {
        node.completed = !node.completed
        node.completedAt = node.completed ? new Date().toISOString() : undefined
        saveMyPlans()
      }
    }
  }

  function getUninstalledTasks() {
    return availableTasks.value.filter(t => !installedTasks.value.find(it => it.id === t.id))
  }

  /** 重置打卡状态（退出登录时调用） */
  function reset() {
    availableTasks.value = []
    installedTasks.value = []
    myPlans.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    availableTasks,
    installedTasks,
    myPlans,
    isLoading,
    error,
    fetchTasksFromAPI,
    loadData,
    installTask,
    uninstallTask,
    createPlan,
    updatePlanStructure,
    getPlanEntryNode,
    getNextNodes,
    getMainPathNodes,
    deletePlan,
    renamePlan,
    completeTask,
    getUninstalledTasks,
    reset
  }
})