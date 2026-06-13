import { rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { homedir, platform } from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 1. 清除构建产物 dist/
try {
  await rm(join(__dirname, '..', 'dist'), { recursive: true, force: true })
  console.log('✓ 已删除 dist/')
} catch {
  console.log('  dist/ 不存在，跳过')
}

// 2. 清除 Electron 用户数据
const appDataPath = platform() === 'win32'
  ? join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'hawthorn-offer-frontend')
  : join(homedir(), '.config', 'hawthorn-offer-frontend')

try {
  await rm(appDataPath, { recursive: true, force: true })
  console.log('✓ 已删除 Electron 用户数据: ' + appDataPath)
} catch {
  console.log('  Electron 用户数据不存在，跳过')
}

console.log('\n清理完成！可以执行 npm run build && npm run electron:dev 重新启动')