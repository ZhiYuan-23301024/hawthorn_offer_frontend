import { pluginManager } from '../pluginManager'
import AccountPanel from './components/AccountPanel.vue'

const accountPlugin = {
  id: 'account',
  name: '账户与设置',
  icon: 'user-circle',
  component: AccountPanel,
  activate() {
    console.log('Account plugin activated')
  },
  deactivate() {
    console.log('Account plugin deactivated')
  }
}

pluginManager.register(accountPlugin)

export default accountPlugin
