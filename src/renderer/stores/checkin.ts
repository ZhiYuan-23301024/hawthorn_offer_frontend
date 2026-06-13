import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CheckinTask, CheckinPlan, PlanNode, PlanEdge, PlanTask, PlanShare } from '@/types/checkin'
import { taskPluginLoader } from '@/taskPlugins/TaskPluginLoader'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export const useCheckinStore = defineStore('checkin', () => {
  const availableTasks = ref<CheckinTask[]>([])
  const installedTasks = ref<CheckinTask[]>([])
  const myPlans = ref<CheckinPlan[]>([])
  const availableServerPlans = ref<PlanShare[]>([])
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
        params: plugin.params || undefined
      }))
      
      console.log(`[checkin.fetchTasks] 映射后 availableTasks 数量=${availableTasks.value.length}`)
      await syncInstalledStatus()
    } catch (err) {
      error.value = '获取任务列表失败，使用本地缓存'
      console.error('[checkin.fetchTasks] 请求失败，降级到本地缓存:', err)
      loadLocalFallback()
    } finally {
      isLoading.value = false
    }
  }

  async function loadLocalFallback() {
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
        sourceUrl: ''
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
        sourceUrl: 'https://github.com/hawthorn/daily-code'
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
        sourceUrl: 'https://github.com/hawthorn/daily-reading'
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
        sourceUrl: 'https://github.com/hawthorn/fitness'
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
        sourceUrl: 'https://github.com/hawthorn/meditation'
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
        sourceUrl: 'https://github.com/hawthorn/early-morning'
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
        sourceUrl: 'https://github.com/hawthorn/early-sleep'
      }
    ]
    availableTasks.value = fallbackTasks
    await syncInstalledStatus()
  }

  async function syncInstalledStatus() {
    try {
      const installedIds: string[] = window.electronAPI
        ? await window.electronAPI.loadInstalledTasks()
        : JSON.parse(localStorage.getItem('checkin_installedTasks') || '[]')

      installedTasks.value = availableTasks.value.filter(t => installedIds.includes(t.id))
    } catch {
      installedTasks.value = []
    }
    
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

  async function loadData() {
    try {
      const savedPlans: any[] = window.electronAPI
        ? await window.electronAPI.loadPlans()
        : JSON.parse(localStorage.getItem('checkin_myPlans') || '[]')

      if (savedPlans && savedPlans.length > 0) {
        myPlans.value = savedPlans.map((plan: any) => migratePlan(plan))
      } else {
        myPlans.value = []
      }
    } catch {
      myPlans.value = []
    }
  }

  function saveInstalledTasks() {
    const ids = installedTasks.value.map(t => t.id)
    if (window.electronAPI) {
      window.electronAPI.saveInstalledTasks(ids).catch(err =>
        console.error('[checkin] 保存已安装任务失败:', err)
      )
    } else {
      localStorage.setItem('checkin_installedTasks', JSON.stringify(ids))
    }
  }

  function saveMyPlans() {
    if (window.electronAPI) {
      const plainPlans = JSON.parse(JSON.stringify(myPlans.value))
      window.electronAPI.savePlans(plainPlans).catch(err =>
        console.error('[checkin] 保存计划失败:', err)
      )
    } else {
      localStorage.setItem('checkin_myPlans', JSON.stringify(myPlans.value))
    }
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

  async function fetchPlansFromServer(category?: string) {
    isLoading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      params.set('page', '0')
      params.set('size', '50')
      if (category) params.set('category', category)

      const url = `${API_BASE_URL}/plans?${params.toString()}`
      console.log(`[checkin.fetchPlans] >>> GET ${url}`)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      const plans = Array.isArray(data) ? data : (data.records || data.content || data.data || [])
      availableServerPlans.value = plans
      console.log(`[checkin.fetchPlans] 获取到 ${plans.length} 个计划`)
    } catch (err) {
      error.value = '获取计划列表失败'
      console.error('[checkin.fetchPlans] 请求失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function uploadPlanToServer(planId: string) {
    const plan = myPlans.value.find(p => p.id === planId)
    if (!plan) {
      console.error(`[checkin.uploadPlan] 计划 ${planId} 不存在`)
      return
    }
    try {
      const planData = {
        name: plan.name,
        nodes: plan.nodes,
        edges: plan.edges,
      }
      const body = {
        name: plan.name,
        description: plan.description || '',
        author: '匿名用户',
        category: '综合',
        planData: JSON.stringify(planData),
      }
      const response = await fetch(`${API_BASE_URL}/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      console.log(`[checkin.uploadPlan] 上传成功: ${result.id}`)
      await fetchPlansFromServer()
    } catch (err) {
      console.error('[checkin.uploadPlan] 上传失败:', err)
      throw err
    }
  }

  async function downloadPlanFromServer(serverPlanId: string) {
    try {
      console.log(`[checkin.downloadPlan] >>> 下载计划: ${serverPlanId}`)
      const response = await fetch(`${API_BASE_URL}/plans/${serverPlanId}/download`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const planDataStr = await response.text()
      const planData = JSON.parse(planDataStr)

      const nodes: PlanNode[] = (planData.nodes || []).map((n: any) => ({
        ...n,
        id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        completed: false,
        completedAt: undefined,
      }))

      const nodeIdMap = new Map<string, string>()
      ;(planData.nodes || []).forEach((n: any, i: number) => {
        nodeIdMap.set(n.id, nodes[i].id)
      })

      const edges: PlanEdge[] = (planData.edges || []).map((e: any) => ({
        ...e,
        id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sourceNodeId: nodeIdMap.get(e.sourceNodeId) || e.sourceNodeId,
        targetNodeId: nodeIdMap.get(e.targetNodeId) || e.targetNodeId,
      }))

      const newPlan: CheckinPlan = {
        id: `plan-${Date.now()}`,
        name: `[商店] ${planData.name || '未命名计划'}`,
        description: planData.description || '',
        createdAt: new Date().toISOString().split('T')[0],
        nodes,
        edges,
      }

      myPlans.value.push(newPlan)
      saveMyPlans()
      console.log(`[checkin.downloadPlan] 下载成功，新计划ID: ${newPlan.id}`)
    } catch (err) {
      console.error('[checkin.downloadPlan] 下载失败:', err)
      throw err
    }
  }

  async function generatePlanWithAI(prompt: string, file?: File): Promise<CheckinPlan> {
    const formData = new FormData()

    const taskInfos = availableTasks.value.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      params: t.params?.map(p => ({
        name: p.name,
        key: p.key,
        type: p.type,
        defaultValue: p.default,
      })) || [],
    }))

    const requestBlob = new Blob([JSON.stringify({
      prompt,
      availableTasks: taskInfos,
    })], { type: 'application/json' })
    formData.append('request', requestBlob)

    if (file) {
      formData.append('file', file)
    }

    console.log(`[checkin.generatePlan] >>> POST ${API_BASE_URL}/plans/generate`)
    const response = await fetch(`${API_BASE_URL}/plans/generate`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`HTTP error! status: ${response.status}, body: ${errText}`)
    }

    const planDataStr = await response.text()
    const planData = JSON.parse(planDataStr)

    const nodes: PlanNode[] = (planData.nodes || []).map((n: any) => ({
      ...n,
      id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      completed: false,
      completedAt: undefined,
    }))

    const nodeIdMap = new Map<string, string>()
    ;(planData.nodes || []).forEach((n: any, i: number) => {
      nodeIdMap.set(n.id, nodes[i].id)
    })

    const edges: PlanEdge[] = (planData.edges || []).map((e: any) => ({
      ...e,
      id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sourceNodeId: nodeIdMap.get(e.sourceNodeId) || e.sourceNodeId,
      targetNodeId: nodeIdMap.get(e.targetNodeId) || e.targetNodeId,
    }))

    const newPlan: CheckinPlan = {
      id: `plan-${Date.now()}`,
      name: planData.name || 'AI生成的计划',
      description: planData.description || '',
      createdAt: new Date().toISOString().split('T')[0],
      nodes,
      edges,
    }

    myPlans.value.push(newPlan)
    saveMyPlans()
    console.log(`[checkin.generatePlan] AI生成成功，新计划ID: ${newPlan.id}`)
    return newPlan
  }

  return {
    availableTasks,
    installedTasks,
    myPlans,
    availableServerPlans,
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
    fetchPlansFromServer,
    uploadPlanToServer,
    downloadPlanFromServer,
    generatePlanWithAI
  }
})