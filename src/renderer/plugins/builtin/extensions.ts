import { pluginManager } from '../pluginManager'
import ExtensionsPanel from './components/ExtensionsPanel.vue'

const extensionsPlugin = {
  id: 'extensions',
  name: 'Extensions',
  icon: 'puzzle',
  component: ExtensionsPanel,
  activate() {
    console.log('Extensions plugin activated')
  },
  deactivate() {
    console.log('Extensions plugin deactivated')
  }
}

pluginManager.register(extensionsPlugin)

export default extensionsPlugin
