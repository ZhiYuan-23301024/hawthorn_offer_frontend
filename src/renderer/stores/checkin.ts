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
      console.log(`[checkin.fetchTasks] >>> GET ${url}`)
      
      const response = await fetch(url)
      console.log(`[checkin.fetchTasks] <<< status=${response.status}, ok=${response.ok}, contentType=${response.headers.get('content-type')}`)
      if (!response.ok) {
        const body = await response.text().catch(() => '(无法读取)')
        console.error(`[checkin.fetchTasks] 请求失败! body=`, body)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      
      console.log(`[checkin.fetchTasks] 原始响应类型: ${typeof data}, isArray: ${Array.isArray(data)}`)
      console.log(`[checkin.fetchTasks] 原始 keys:`, Object.keys(data || {}))
      
      const plugins = Array.isArray(data) ? data : (data.records || data.content || data.data || [])
      
      console.log(`[checkin.fetchTasks] 解析到 ${plugins.length} 个插件, ids=`, plugins.map((p: any) => p.id))
      
      if (!Array.isArray(plugins)) {
        throw new Error('Invalid data format: expected array')
      }
      
      const paramConfigs: Record<string, any[]> = {
        'test-quiz-task': [
          {
            name: '题目编号',
            key: 'questionId',
            type: 'number',
            default: 1,
            min: 1,
            max: 3,
            placeholder: '输入 1-3 的数字'
          },
          {
            name: '显示提示',
            key: 'showHints',
            type: 'boolean',
            default: true
          },
          {
            name: '难度筛选',
            key: 'difficulty',
            type: 'select',
            default: 'all',
            options: [
              { label: '全部', value: 'all' },
              { label: '简单', value: 'easy' },
              { label: '中等', value: 'medium' },
              { label: '困难', value: 'hard' }
            ]
          }
        ],
        'programming-quiz': [
          {
            name: '题目编号',
            key: 'questionId',
            type: 'number',
            default: 1,
            min: 1,
            max: 3,
            placeholder: '输入 1-3 的数字'
          },
          {
            name: '显示提示',
            key: 'showHints',
            type: 'boolean',
            default: true
          },
          {
            name: '难度筛选',
            key: 'difficulty',
            type: 'select',
            default: 'all',
            options: [
              { label: '全部', value: 'all' },
              { label: '简单', value: 'easy' },
              { label: '中等', value: 'medium' },
              { label: '困难', value: 'hard' }
            ]
          }
        ]
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
        readme: '',
        params: plugin.params || paramConfigs[plugin.id]
      }))
      
      console.log(`[checkin.fetchTasks] 映射后 availableTasks 数量=${availableTasks.value.length}`)
      syncInstalledStatus()
    } catch (err) {
      error.value = '获取任务列表失败，使用本地缓存'
      console.error('[checkin.fetchTasks] 请求失败，降级到本地缓存:', err)
      loadLocalFallback()
    } finally {
      isLoading.value = false
    }
  }

  function loadLocalFallback() {
    const fallbackTasks: CheckinTask[] = [
      {
        id: 'test-quiz-task',
        name: '编程刷题测试软件',
        icon: 'code',
        description: '刷刷题',
        difficulty: 'medium',
        category: '编程',
        downloads: 1523,
        version: '1.0.0',
        latestVersion: '1.0.0',
        hasUpdate: false,
        sourceUrl: '',
        readme: '# 编程刷题测试软件\n\n刷刷题',
        params: [
          {
            name: '题目编号',
            key: 'questionId',
            type: 'number',
            default: 1,
            min: 1,
            max: 3,
            placeholder: '输入 1-3 的数字'
          },
          {
            name: '显示提示',
            key: 'showHints',
            type: 'boolean',
            default: true
          },
          {
            name: '难度筛选',
            key: 'difficulty',
            type: 'select',
            default: 'all',
            options: [
              { label: '全部', value: 'all' },
              { label: '简单', value: 'easy' },
              { label: '中等', value: 'medium' },
              { label: '困难', value: 'hard' }
            ]
          }
        ]
      },
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
      installedTasks.value = []
    }
    
    // 从 TaskPluginLoader 获取已安装插件的 manifest，同步 params
    const loadedPlugins = taskPluginLoader.getAllPlugins()
    for (const plugin of loadedPlugins) {
      const task = installedTasks.value.find(t => t.id === plugin.manifest.id)
      if (task && plugin.manifest.params) {
        task.params = plugin.manifest.params
      }
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
      myPlans.value = []
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
    console.log(`[checkin.installTask] >>> 开始安装任务: ${taskId}`)
    const task = availableTasks.value.find(t => t.id === taskId)
    if (!task) {
      console.warn(`[checkin.installTask] 任务 ${taskId} 不在 availableTasks 中!`)
      return
    }
    if (installedTasks.value.find(t => t.id === taskId)) {
      console.log(`[checkin.installTask] 任务 ${taskId} 已安装，跳过`)
      return
    }
    try {
      console.log(`[checkin.installTask] 调用 taskPluginLoader.install(${taskId})`)
      const instance = await taskPluginLoader.install(taskId)
      console.log(`[checkin.installTask] taskPluginLoader.install 返回:`, instance ? 'OK' : 'NULL')
      if (instance?.manifest?.params) {
        task.params = instance.manifest.params
        console.log(`[checkin.installTask] 已从 manifest 同步 params, 数量=${instance.manifest.params.length}`)
      } else {
        console.log(`[checkin.installTask] manifest 无 params，使用默认配置`)
      }
    } catch (err) {
      console.error(`[checkin.installTask] 插件安装失败!`, err)
    }
    installedTasks.value.push(task)
    saveInstalledTasks()
    console.log(`[checkin.installTask] installedTasks 现在共 ${installedTasks.value.length} 个`)
  }

  async function uninstallTask(taskId: string) {
    console.log(`[checkin.uninstallTask] >>> 开始卸载任务: ${taskId}`)
    try {
      console.log(`[checkin.uninstallTask] 调用 taskPluginLoader.uninstall(${taskId})`)
      await taskPluginLoader.uninstall(taskId)
      console.log(`[checkin.uninstallTask] taskPluginLoader.uninstall 完成`)
    } catch (err) {
      console.error(`[checkin.uninstallTask] 插件卸载失败!`, err)
    }
    installedTasks.value = installedTasks.value.filter(t => t.id !== taskId)
    saveInstalledTasks()
    console.log(`[checkin.uninstallTask] installedTasks 现在共 ${installedTasks.value.length} 个`)
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