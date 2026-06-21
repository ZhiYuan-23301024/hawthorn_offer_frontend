import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

import './plugins/builtin/postBrowser'
import './plugins/builtin/chat'
import './plugins/builtin/personalResume'
import './plugins/builtin/account'
import './plugins/builtin/checkin'
import './plugins/builtin/campusRecruitment'

// API 地址：优先读 .env 的 VITE_API_BASE_URL，默认 localhost
const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
window.__HAWTHORN_API_URL__ = apiBase + '/api'
console.log('[App] API 地址:', window.__HAWTHORN_API_URL__)

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// 初始化任务插件加载器
import { taskPluginLoader } from './taskPlugins/TaskPluginLoader'
taskPluginLoader.initialize(null, pinia)

// 从本地文件系统恢复已安装的插件
taskPluginLoader.restoreInstalledPlugins().then((restored) => {
  if (restored.length > 0) {
    console.log(`[App] 已从本地恢复 ${restored.length} 个插件`)
  }
})

// Restore user session on app start
import { useAuthStore } from '@/stores/auth'
import { useSocialStore } from '@/stores/social'
const authStore = useAuthStore()
if (authStore.token) {
  authStore.fetchCurrentUser().then(() => {
    if (authStore.isAuthenticated) {
      const socialStore = useSocialStore()
      socialStore.fetchConversations()
    }
  })
}

app.mount('#app')
