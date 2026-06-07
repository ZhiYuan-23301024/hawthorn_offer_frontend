import { pluginManager } from '../pluginManager'
import CheckinPanel from './components/CheckinPanel.vue'

const checkinPlugin = {
  id: 'checkin',
  name: 'Checkin',
  icon: 'calendar-check',
  component: CheckinPanel,
  activate() {
    console.log('Checkin plugin activated')
  },
  deactivate() {
    console.log('Checkin plugin deactivated')
  }
}

pluginManager.register(checkinPlugin)

export default checkinPlugin