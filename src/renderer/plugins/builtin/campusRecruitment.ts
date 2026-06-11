import { pluginManager } from '../pluginManager'
import CampusRecruitmentPanel from './components/CampusRecruitmentPanel.vue'

const campusRecruitmentPlugin = {
  id: 'campusRecruitment',
  name: '校招专区',
  icon: 'briefcase',
  component: CampusRecruitmentPanel,
  activate() {
    console.log('Campus recruitment plugin activated')
  },
  deactivate() {
    console.log('Campus recruitment plugin deactivated')
  }
}

pluginManager.register(campusRecruitmentPlugin)

export default campusRecruitmentPlugin
