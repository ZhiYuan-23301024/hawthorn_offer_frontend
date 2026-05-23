import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

import './plugins/builtin/explorer'
import './plugins/builtin/search'
import './plugins/builtin/git'
import './plugins/builtin/extensions'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')
