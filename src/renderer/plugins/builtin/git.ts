import { pluginManager } from '../pluginManager'
import GitPanel from './components/GitPanel.vue'

const gitPlugin = {
  id: 'git',
  name: 'Git',
  icon: 'git-branch',
  component: GitPanel,
  activate() {
    console.log('Git plugin activated')
  },
  deactivate() {
    console.log('Git plugin deactivated')
  }
}

pluginManager.register(gitPlugin)

export default gitPlugin
