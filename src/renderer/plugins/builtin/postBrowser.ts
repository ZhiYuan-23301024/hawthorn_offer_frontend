import { pluginManager } from '../pluginManager'
import PostBrowserPanel from '@/components/PostBrowser/PostBrowserPanel.vue'

const postBrowserPlugin = {
  id: 'postBrowser',
  name: '帖子浏览',
  icon: 'message-square',
  component: PostBrowserPanel,
  activate() {
    console.log('PostBrowser plugin activated')
  },
  deactivate() {
    console.log('PostBrowser plugin deactivated')
  }
}

pluginManager.register(postBrowserPlugin)

export default postBrowserPlugin
