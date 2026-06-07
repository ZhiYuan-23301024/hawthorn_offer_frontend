import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CheckinTask, CheckinPlan, PlanTask } from '@/types/checkin'

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
      // 添加页码和数量参数
      const url = `${API_BASE_URL}/plugins?page=1&size=20`
      console.log('Fetching tasks from:', url)
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      
      console.log('Raw response data:', data)
      
      // 处理分页数据或直接数组（支持多种分页格式）
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

  function loadData() {
    const savedPlans = localStorage.getItem('checkin_myPlans')
    if (savedPlans) {
      myPlans.value = JSON.parse(savedPlans)
    } else {
      myPlans.value = [
        {
          id: 'default',
          name: '日常打卡',
          description: '日常学习和生活打卡计划',
          createdAt: new Date().toISOString().split('T')[0],
          tasks: installedTasks.value.slice(0, 3).map((t, i) => ({
            id: `task-${t.id}`,
            taskId: t.id,
            taskName: t.name,
            order: i,
            completed: false
          }))
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
        await fetch(`${API_BASE_URL}/plugins/${taskId}/install`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': 'test-user-001'
          }
        })
      } catch (err) {
        console.warn('Failed to report install:', err)
      }
      installedTasks.value.push(task)
      saveInstalledTasks()
    }
  }

  async function uninstallTask(taskId: string) {
    try {
      await fetch(`${API_BASE_URL}/plugins/${taskId}/uninstall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'test-user-001'
        }
      })
    } catch (err) {
      console.warn('Failed to report uninstall:', err)
    }
    installedTasks.value = installedTasks.value.filter(t => t.id !== taskId)
    saveInstalledTasks()
  }

  function createPlan(name: string, description: string, taskIds: string[]) {
    const tasks: PlanTask[] = taskIds.map((taskId, index) => {
      const task = installedTasks.value.find(t => t.id === taskId)
      return {
        id: `plan-task-${Date.now()}-${index}`,
        taskId,
        taskName: task?.name || 'Unknown',
        order: index,
        completed: false
      }
    })

    const newPlan: CheckinPlan = {
      id: `plan-${Date.now()}`,
      name,
      description,
      createdAt: new Date().toISOString().split('T')[0],
      tasks
    }

    myPlans.value.push(newPlan)
    saveMyPlans()
    return newPlan
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

  function completeTask(planId: string, taskId: string) {
    const plan = myPlans.value.find(p => p.id === planId)
    if (plan) {
      const task = plan.tasks.find(t => t.id === taskId)
      if (task) {
        task.completed = true
        task.completedAt = new Date().toISOString()
        saveMyPlans()
      }
    }
  }

  function getUninstalledTasks() {
    return availableTasks.value.filter(t => !installedTasks.value.find(it => it.id === t.id))
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
    deletePlan,
    renamePlan,
    completeTask,
    getUninstalledTasks
  }
})