import { pluginManager } from '../pluginManager'
import SearchPanel from './components/SearchPanel.vue'

const searchPlugin = {
  id: 'search',
  name: 'Search',
  icon: 'search',
  component: SearchPanel,
  activate() {
    console.log('Search plugin activated')
  },
  deactivate() {
    console.log('Search plugin deactivated')
  }
}

pluginManager.register(searchPlugin)

export default searchPlugin
