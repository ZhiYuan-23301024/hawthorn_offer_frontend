import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

import './plugins/builtin/explorer'
import './plugins/builtin/search'
import './plugins/builtin/git'
import './plugins/builtin/extensions'
import './plugins/builtin/postBrowser'
import './plugins/builtin/account'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// Restore user session on app start
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
if (authStore.token) {
  authStore.fetchCurrentUser()
}

app.mount('#app')
