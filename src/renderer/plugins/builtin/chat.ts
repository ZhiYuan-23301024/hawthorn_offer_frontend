import { pluginManager } from '../pluginManager'
import ChatPanel from '@/components/Chat/ChatPanel.vue'

const chatPlugin = {
  id: 'chat',
  name: '聊天',
  icon: 'message-circle',
  component: ChatPanel,
  activate() {
    console.log('Chat plugin activated')
  },
  deactivate() {
    console.log('Chat plugin deactivated')
  }
}

pluginManager.register(chatPlugin)

export default chatPlugin
