import { pluginManager } from '../pluginManager'
import ExplorerPanel from './components/ExplorerPanel.vue'

const explorerPlugin = {
  id: 'explorer',
  name: 'Explorer',
  icon: 'folder-open',
  component: ExplorerPanel,
  activate() {
    console.log('Explorer plugin activated')
  },
  deactivate() {
    console.log('Explorer plugin deactivated')
  }
}

pluginManager.register(explorerPlugin)

export default explorerPlugin
