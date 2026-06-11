import { pluginManager } from '../pluginManager'
import PersonalResumePanel from './components/PersonalResumePanel.vue'

const personalResumeFeature = {
  id: 'personalResume',
  name: '个人简历',
  icon: 'scroll-text',
  component: PersonalResumePanel,
  activate() {
    console.log('Personal resume activated')
  },
  deactivate() {
    console.log('Personal resume deactivated')
  }
}

pluginManager.register(personalResumeFeature)

export default personalResumeFeature
