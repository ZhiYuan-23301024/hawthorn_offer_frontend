import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

import './plugins/builtin/explorer'
import './plugins/builtin/search'
import './plugins/builtin/git'
import './plugins/builtin/extensions'
import './plugins/builtin/postBrowser'
import './plugins/builtin/chat'
import './plugins/builtin/account'
import './plugins/builtin/checkin'
import './plugins/builtin/campusRecruitment'

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
