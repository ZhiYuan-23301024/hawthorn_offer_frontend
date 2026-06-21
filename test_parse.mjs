import { readFileSync } from 'fs'
import { loadModule } from 'vue3-sfc-loader'
import * as Vue from 'vue'

const code = readFileSync('../cpp-advanced-code.txt', 'utf8')

console.log('Code length:', code.length)

// Same config as TaskPluginLoader.ts
const moduleCache = {
  vue: Vue,
  'lucide-vue-next': {},
  '@/stores/checkin': { useCheckinStore: () => ({ completeTask: () => {} }) },
  '@/stores/editor': { useEditorStore: () => ({ openComponentTab: () => {}, closeTab: () => {} }) },
}

try {
  const component = await loadModule('plugin.vue', {
    moduleCache,
    getFile: async () => code,
    addStyle: () => {},
  })
  console.log('SUCCESS! component:', Object.keys(component))
} catch (err) {
  console.log('FAILED:', err.message)
  console.log('Stack:', err.stack?.split('\n').slice(0, 5).join('\n'))
}
