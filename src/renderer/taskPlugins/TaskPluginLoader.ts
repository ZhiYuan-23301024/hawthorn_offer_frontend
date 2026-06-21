import { ref, markRaw } from 'vue'
import * as Vue from 'vue'
import { loadModule } from 'vue3-sfc-loader'
import { useCheckinStore } from '@/stores/checkin'
import { useEditorStore } from '@/stores/editor'
import type { PluginManifest, PluginInstance, PluginAPI } from '../plugins/types'

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
const API_BASE_URL = apiBase + '/api'

declare global {
  interface Window {
    electronAPI: {
      savePluginCode: (pluginId: string, code: string) => Promise<boolean>
      loadPluginCode: (pluginId: string) => Promise<string | null>
      deletePluginCode: (pluginId: string) => Promise<boolean>
      loadInstalledPlugins: () => Promise<PluginManifest[]>
      savePluginManifest: (manifest: PluginManifest) => Promise<boolean>
      deletePluginManifest: (pluginId: string) => Promise<boolean>
    }
  }
}

export class PluginLoader implements PluginAPI {
  private plugins = ref<Map<string, PluginInstance>>(new Map())
  private pluginCache = ref<Map<string, string>>(new Map())
  
  app = {
    router: null,
    store: null,
    emit: (event: string, ...args: any[]) => {},
    on: (event: string, handler: (...args: any[]) => void) => {}
  }
  
  onInstall?: (pluginId: string) => void
  onUninstall?: (pluginId: string) => void
  onUpdate?: (pluginId: string) => void

  initialize(router: any, store: any) {
    this.app.router = router
    this.app.store = store
    
    // Pinia 实例本身没有 $emit/$on，需要使用 store 的事件系统或提供默认实现
    if (store && typeof store.$emit === 'function') {
      this.app.emit = store.$emit.bind(store)
    } else {
      this.app.emit = (event: string, ...args: any[]) => {
        console.log(`Plugin event: ${event}`, args)
      }
    }
    
    if (store && typeof store.$on === 'function') {
      this.app.on = store.$on.bind(store)
    } else {
      this.app.on = (event: string, handler: (...args: any[]) => void) => {
        console.log(`Plugin listener registered: ${event}`)
      }
    }
  }

  async install(pluginId: string): Promise<PluginInstance> {
    console.log(`[PluginLoader.install] ====== 开始安装插件: ${pluginId} ======`)

    console.log(`[PluginLoader.install] Step1: 请求 manifest -> /plugins/${pluginId}/manifest`)
    const manifest = await this.fetchManifest(pluginId)
    console.log(`[PluginLoader.install] Step1 完成: manifest =`, JSON.stringify(manifest, null, 2))

    console.log(`[PluginLoader.install] Step2: 请求代码 -> /plugins/${pluginId}/download`)
    const code = await this.downloadPlugin(pluginId)
    console.log(`[PluginLoader.install] Step2 完成: code 长度=${code.length}, 前200字符=`, code.substring(0, 200))

    console.log(`[PluginLoader.install] Step3: 持久化到本地`)
    await this.persistToLocal(pluginId, code, manifest)

    console.log(`[PluginLoader.install] Step4: 编译组件`)
    const component = await this.compileComponent(code)
    console.log(`[PluginLoader.install] Step4 完成: component 类型=`, typeof component, ', keys=', Object.keys(component || {}))
    
    const instance: PluginInstance = {
      manifest, 
      component: markRaw(component),
      mounted: false,
      config: {}
    }
    
    this.plugins.value.set(pluginId, instance)
    this.pluginCache.value.set(pluginId, code)
    console.log(`[PluginLoader.install] Step5: 上报安装 -> POST /plugins/${pluginId}/install`)
    this.reportInstall(pluginId)
    
    this.onInstall?.(pluginId)
    console.log(`[PluginLoader.install] ====== 安装完成: ${pluginId} ======`)
    return instance
  }

  private async persistToLocal(pluginId: string, code: string, manifest: PluginManifest): Promise<void> {
    if (window.electronAPI) {
      try {
        await window.electronAPI.savePluginCode(pluginId, code)
        await window.electronAPI.savePluginManifest(manifest)
        console.log(`[PluginLoader] 插件已持久化到本地: ${pluginId}`)
      } catch (err) {
        console.warn(`[PluginLoader] 本地持久化失败 (非 Electron 环境可忽略):`, err)
      }
    }
  }

  private async fetchManifest(pluginId: string): Promise<PluginManifest> {
    const url = `${API_BASE_URL}/plugins/${pluginId}/manifest`
    console.log(`[PluginLoader.fetchManifest] >>> GET ${url}`)
    const response = await fetch(url)
    console.log(`[PluginLoader.fetchManifest] <<< status=${response.status}, ok=${response.ok}`)
    if (!response.ok) {
      const body = await response.text().catch(() => '(无法读取响应体)')
      console.error(`[PluginLoader.fetchManifest] 请求失败! body=`, body)
      throw new Error(`Failed to fetch manifest: ${response.statusText}`)
    }
    const json = await response.json()
    console.log(`[PluginLoader.fetchManifest] 返回 JSON:`, JSON.stringify(json, null, 2))
    if (json.code && json.code !== 200) {
      console.error(`[PluginLoader.fetchManifest] 业务错误! code=${json.code}, message=${json.message}`)
      throw new Error(`获取插件清单失败: ${json.message || '未知错误'}`)
    }
    return json
  }

  private async downloadPlugin(pluginId: string): Promise<string> {
    const url = `${API_BASE_URL}/plugins/${pluginId}/download`
    console.log(`[PluginLoader.downloadPlugin] >>> GET ${url}`)
    const response = await fetch(url)
    const contentType = response.headers.get('content-type') || ''
    console.log(`[PluginLoader.downloadPlugin] <<< status=${response.status}, ok=${response.ok}, contentType=${contentType}`)
    if (!response.ok) {
      const body = await response.text().catch(() => '(无法读取响应体)')
      console.error(`[PluginLoader.downloadPlugin] 请求失败! body=`, body)
      throw new Error(`Failed to download plugin: ${response.statusText}`)
    }
    const code = await response.text()
    console.log(`[PluginLoader.downloadPlugin] 返回代码长度=${code.length}, 前200字符:`, code.substring(0, 200))
    if (contentType.includes('application/json') || (code.startsWith('{') && code.includes('"code"'))) {
      try {
        const errorJson = JSON.parse(code)
        if (errorJson.code && errorJson.code !== 200) {
          console.error(`[PluginLoader.downloadPlugin] 业务错误! code=${errorJson.code}, message=${errorJson.message}`)
          throw new Error(`下载插件代码失败: ${errorJson.message || '未知错误'}`)
        }
      } catch (parseErr) {
        // 不是有效的 JSON 错误响应，当作普通代码处理
      }
    }
    return code
  }

  private async compileComponent(code: string): Promise<any> {
    console.log(`[PluginLoader.compileComponent] 开始编译, 代码长度=${code.length}`)
    
    // 创建模块缓存，注入主应用的依赖
    const moduleCache: Record<string, any> = {
      vue: Vue,
      'lucide-vue-next': await import('lucide-vue-next'),
      '@/stores/checkin': { useCheckinStore },
      '@/stores/editor': { useEditorStore },
    }
    
    // ===== 策略1: vue3-sfc-loader 编译 =====
    try {
      const component = await loadModule('plugin.vue', {
        moduleCache,
        async getFile(_filePath: string) {
          return Promise.resolve(code)
        },
        addStyle(styleStr: string): Promise<void> {
          const style = document.createElement('style')
          style.textContent = styleStr
          document.head.appendChild(style)
          return Promise.resolve()
        }
      })
      console.log(`[PluginLoader.compileComponent] 策略1成功: vue3-sfc-loader 直接编译`)
      return component
    } catch (err: any) {
      console.warn(`[PluginLoader.compileComponent] 策略1失败: ${err.message}`)
    }
    
    // ===== 策略2: 手动解析 SFC，动态编译模板 =====
    console.log(`[PluginLoader.compileComponent] 尝试策略2: 手动解析 SFC + defineComponent`)
    try {
      const component = await this.compileSFCManually(code, moduleCache)
      console.log(`[PluginLoader.compileComponent] 策略2成功: 手动 SFC 编译`)
      return component
    } catch (err: any) {
      console.warn(`[PluginLoader.compileComponent] 策略2失败: ${err.message}`)
    }
    
    // ===== 策略3: 作为普通 JS 模块加载 =====
    const isVueSFC = code.trim().startsWith('<template') || code.trim().startsWith('<script')
    if (!isVueSFC) {
      console.log(`[PluginLoader.compileComponent] 尝试策略3: 普通 JS 模块加载`)
      const blob = new Blob([code], { type: 'application/javascript' })
      const url = URL.createObjectURL(blob)
      try {
        // @ts-ignore
        const module = await import(/* @vite-ignore */ url)
        console.log(`[PluginLoader.compileComponent] 策略3成功: 普通 JS 模块加载`)
        return module.default || module
      } catch (err) {
        URL.revokeObjectURL(url)
        throw err
      }
    }
    
    console.error(`[PluginLoader.compileComponent] 所有策略均失败!`)
    console.error(`[PluginLoader.compileComponent] 失败代码前300字符:`, code.substring(0, 300))
    throw new Error('无法编译插件代码')
  }
  
  /**
   * 手动解析 Vue SFC，提取 script setup 和 template，
   * 使用 Vue 的 defineComponent + compile 自行组装组件。
   * 比 vue3-sfc-loader 更宽容，适用于大型 SFC 文件。
   */
  private async compileSFCManually(code: string, moduleCache: Record<string, any>): Promise<any> {
    // 1. 提取 script setup 内容
    const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/)
    const scriptContent = scriptMatch?.[1]?.trim() || ''
    
    // 2. 提取 template 内容
    const templateMatch = code.match(/<template>([\s\S]*?)<\/template>/)
    const templateContent = templateMatch?.[1]?.trim() || '<div></div>'
    
    console.log(`[PluginLoader.compileSFC] script=${scriptContent.length} chars, template=${templateContent.length} chars`)
    
    // 3. 模板预处理：移除所有 v-model，替换为等效绑定
    //    v-model:prop="expr" -> :prop + @update:prop
    //    v-model="expr"      -> :value + @input
    let preprocessedTemplate = templateContent
      .replace(/v-model:(\w+)=["']([^"']*)["']/g, 
        (_, prop, expr) => `:${prop}="${expr}" @update:${prop}="__vModelUpdate($event, (__v) => { ${expr} = __v })"`)
      .replace(/v-model=(["'])([^"']*)\1(?!\s*:)/g,
        (_, q, expr) => `:value=${q}${expr}${q} @input="__vModelUpdate($event, (__v) => { ${expr} = __v })"`)
    
    console.log(`[PluginLoader.compileSFC] 模板预处理完成, 长度: ${templateContent.length} -> ${preprocessedTemplate.length}`)
    
    // 4. 动态导入 @vue/compiler-dom 编译模板
    let renderFn: any
    try {
      const compilerDom = await import('@vue/compiler-dom')
      const compiled = compilerDom.compile(preprocessedTemplate, {
        mode: 'module',
        prefixIdentifiers: true,
        hoistStatic: true,
      })
      console.log(`[PluginLoader.compileSFC] 模板编译成功`)
      
      // 创建 render 函数：编译输出需要再包装一下
      const { createElementBlock, createElementVNode, openBlock, createVNode, toDisplayString,
        renderList, Fragment, createCommentVNode, createTextVNode, resolveComponent,
        withDirectives, vModelText, normalizeClass, vModelDynamic } = Vue as any
      
      // 准备 render 函数需要的运行时 helper
      const renderHelpers: Record<string, any> = {
        createElementBlock, createElementVNode, openBlock, createVNode,
        toDisplayString, renderList, Fragment, createCommentVNode, createTextVNode,
        resolveComponent, withDirectives, vModelText, normalizeClass, vModelDynamic,
      }
      
      // 注入 __vModelUpdate helper: 模拟 v-model 行为
      renderHelpers.__vModelUpdate = (event: Event, setter: (value: any) => void) => {
        const target = event.target as any
        if (target?.value !== undefined) {
          setter(target.value)
        } else if (target?.type === 'checkbox' || target?.type === 'radio') {
          setter(target.checked)
        }
      }
      
      renderFn = new Function('__vue__', 
        `return function render(_ctx, _cache) { const { ${Object.keys(renderHelpers).join(', ')} } = __vue__; ${compiled.code} }`
      )(renderHelpers)
    } catch (e: any) {
      console.warn(`[PluginLoader.compileSFC] 模板编译失败: ${e.message}`, e)
      // 回退：使用空 render
      renderFn = new Function('return () => null')()
    }
    
    // 4. 创建 setup 函数
    // 将 script 中的 import 语句替换为从 moduleCache 获取
    const processedScript = this.resolveImports(scriptContent, moduleCache)
    console.log(`[PluginLoader.compileSFC] imports 已解析, 处理前=${scriptContent.length}, 处理后=${processedScript.length}`)
    
    // 5. 移除 TypeScript 语法，转换为纯 JS
    let jsScript = this.stripTypeScript(processedScript)
    console.log(`[PluginLoader.compileSFC] TypeScript 已剥离, 处理后=${jsScript.length}`)
    
    // 6. 用 Function 构造 setup 函数
    const setupFn = new Function('__vue_imports__', `
      const { ref, computed, onMounted, watch, reactive, toRefs, defineProps: dp, defineEmits, defineExpose, withDefaults } = __vue_imports__.vue;
      const defineProps = dp;
      ${jsScript.replace(/export\s+default\s+/g, 'return ')}
    `)
    
    // 5. 使用 defineComponent 组装
    const { defineComponent } = Vue as any
    return defineComponent({
      name: 'plugin',
      props: {
        planId: String,
        taskId: String,
        taskName: String,
        params: Object,
      },
      setup(props: any) {
        // 提供 mock defineProps/defineEmits，让插件脚本中的编译器宏能正常工作
        const mockDefineProps = () => props
        const mockDefineEmits = () => ({} as any)
        const __vue_imports__ = {
          vue: {
            ...Vue,
            defineProps: mockDefineProps,
            defineEmits: mockDefineEmits,
          },
          ...moduleCache,
        }
        
        try {
          // 执行 setup 函数，获取返回值
          const result = setupFn(__vue_imports__)
          return result
        } catch (e: any) {
          console.error(`[PluginLoader.compileSFC] setup 执行失败:`, e)
          return {}
        }
      },
      render: renderFn,
    })
  }
  
  /**
   * 解析 import 语句，将模块引用替换为从 moduleCache 获取的值
   */
  private resolveImports(script: string, moduleCache: Record<string, any>): string {
    let result = script
    
    // 移除所有 import 语句（Top-level imports），因为我们通过 moduleCache 提供
    result = result.replace(/^import\s+.*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    result = result.replace(/^import\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    result = result.replace(/^import\s*\{[^}]*\}\s*from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    result = result.replace(/^import\s+\*\s+as\s+\w+\s+from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    result = result.replace(/^import\s+\w+\s+from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    
    // 返回处理后的脚本，外部通过 __vue_imports__ 提供所需依赖
    return result.trim()
  }
  
  /**
   * 移除 TypeScript 类型语法，转换为纯 JavaScript。
   * 处理：泛型参数、类型注解、as 断言等。
   */
  private stripTypeScript(script: string): string {
    let result = script
    
    // 1. 移除函数调用中的泛型参数（处理嵌套泛型）:
    //    defineProps<{ planId: string; params?: Record<string, unknown> }>() -> defineProps()
    //    ref<'learn' | 'practice'>('learn') -> ref('learn')
    result = result.replace(
      /(defineProps|defineEmits|defineExpose|withDefaults|ref|reactive|computed|shallowRef|shallowReactive|toRef|toRefs|customRef)\s*<(?:[^<>]*|<[^<>]*>)*>(\s*\()/g,
      '$1$2'
    )
    
    // 2. 移除类型注解: variableName: type -> variableName
    //    覆盖: : string, : 'learn' | 'practice', : Event, : string[] 等
    result = result.replace(
      /\b(\w+)\s*:\s*(?:'[^']*'|"[^"]*"|\w+(?:\[\])?)(\s*[|&]\s*(?:'[^']*'|"[^"]*"|\w+(?:\[\])?))*\s*(?=[=,);\n])/g,
      '$1'
    )
    
    // 3. 移除 as 类型断言: x as string -> x
    result = result.replace(/\s+as\s+\w+/g, '')
    
    console.log(`[PluginLoader.stripTS] stripped 预览:`, result.substring(0, 600))
    
    return result
  }
  
  // 替换模板字符串为普通字符串拼接（已废弃，保留备用）
  private replaceTemplateLiterals(code: string): string {
    console.log(`[PluginLoader.replaceTemplateLiterals] 开始替换模板字符串`)
    let result = code
    
    // 匹配模板字符串: `xxx${expr}yyy`
    // 使用简单的字符串替换，不处理复杂的嵌套情况
    const templateRegex = /`([^`]*)\$\{([^}]+)\}([^`]*)`/g
    
    let match
    let count = 0
    while ((match = templateRegex.exec(code)) !== null) {
      const [fullMatch, prefix, expr, suffix] = match
      // 替换为字符串拼接: prefix + expr + suffix
      const replacement = `'${prefix}' + ${expr} + '${suffix}'`
      result = result.replace(fullMatch, replacement)
      count++
    }
    
    // 处理只有前缀和后缀没有表达式的模板字符串
    const simpleTemplateRegex = /`([^`]+)`/g
    while ((match = simpleTemplateRegex.exec(code)) !== null) {
      const [fullMatch, content] = match
      // 避免重复替换已经处理过的
      if (fullMatch.includes('${')) continue
      // 如果内容是纯文本，替换为普通字符串
      if (!fullMatch.includes("'")) {
        result = result.replace(fullMatch, `'${content}'`)
        count++
      }
    }
    
    console.log(`[PluginLoader.replaceTemplateLiterals] 完成，替换了 ${count} 处`)
    return result
  }

  private async reportInstall(pluginId: string): Promise<void> {
    const url = `${API_BASE_URL}/plugins/${pluginId}/install`
    console.log(`[PluginLoader.reportInstall] >>> POST ${url}`)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': 'test-user-001'
        }
      })
      console.log(`[PluginLoader.reportInstall] <<< status=${response.status}`)
    } catch (err) {
      console.warn('[PluginLoader.reportInstall] 上报失败 (可忽略):', err)
    }
  }

  async uninstall(pluginId: string): Promise<void> {
    console.log(`[PluginLoader.uninstall] ====== 开始卸载插件: ${pluginId} ======`)
    const instance = this.plugins.value.get(pluginId)
    if (instance) {
      instance.component?.unmount?.()
      this.plugins.value.delete(pluginId)
      console.log(`[PluginLoader.uninstall] 已从内存移除组件和实例`)
    } else {
      console.log(`[PluginLoader.uninstall] 内存中未找到该插件实例`)
    }
    this.pluginCache.value.delete(pluginId)

    console.log(`[PluginLoader.uninstall] Step1: 从本地文件系统清除`)
    await this.removeFromLocal(pluginId)
    
    const url = `${API_BASE_URL}/plugins/${pluginId}/uninstall`
    console.log(`[PluginLoader.uninstall] Step2: 上报卸载 -> POST ${url}`)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': 'test-user-001'
        }
      })
      console.log(`[PluginLoader.uninstall] 上报卸载 <<< status=${response.status}`)
    } catch (err) {
      console.warn('[PluginLoader.uninstall] 上报卸载失败 (可忽略):', err)
    }
    
    this.onUninstall?.(pluginId)
    console.log(`[PluginLoader.uninstall] ====== 卸载完成: ${pluginId} ======`)
  }

  private async removeFromLocal(pluginId: string): Promise<void> {
    if (window.electronAPI) {
      try {
        await window.electronAPI.deletePluginCode(pluginId)
        await window.electronAPI.deletePluginManifest(pluginId)
        console.log(`[PluginLoader] 本地插件已清理: ${pluginId}`)
      } catch (err) {
        console.warn(`[PluginLoader] 本地清理失败:`, err)
      }
    }
  }

  async update(pluginId: string): Promise<void> {
    await this.uninstall(pluginId)
    await this.install(pluginId)
    this.onUpdate?.(pluginId)
  }

  async restoreInstalledPlugins(): Promise<PluginInstance[]> {
    console.log(`[PluginLoader.restore] ====== 开始从本地恢复插件 ======`)
    if (!window.electronAPI) {
      console.log('[PluginLoader.restore] 非 Electron 环境，跳过本地插件恢复')
      return []
    }

    try {
      console.log(`[PluginLoader.restore] Step1: 读取本地插件清单`)
      const installedManifests: PluginManifest[] = await window.electronAPI.loadInstalledPlugins()
      console.log(`[PluginLoader.restore] 发现 ${installedManifests.length} 个本地已安装插件, ids=`, installedManifests.map(m => m.id))

      const restored: PluginInstance[] = []

      for (const manifest of installedManifests) {
        console.log(`[PluginLoader.restore] 正在恢复插件: id=${manifest.id}, name=${manifest.name}`)
        try {
          console.log(`[PluginLoader.restore]   -> 加载本地代码: ${manifest.id}`)
          const code = await window.electronAPI.loadPluginCode(manifest.id)
          if (!code) {
            console.warn(`[PluginLoader.restore]   -> 插件 ${manifest.id} 本地代码缺失，跳过`)
            continue
          }
          console.log(`[PluginLoader.restore]   -> 代码长度=${code.length}, 前200字符:`, code.substring(0, 200))

          console.log(`[PluginLoader.restore]   -> 编译组件: ${manifest.id}`)
          const component = await this.compileComponent(code)
          console.log(`[PluginLoader.restore]   -> 编译成功, component 类型=`, typeof component)

          const instance: PluginInstance = {
            manifest,
            component: markRaw(component),
            mounted: false,
            config: {}
          }

          this.plugins.value.set(manifest.id, instance)
          this.pluginCache.value.set(manifest.id, code)
          restored.push(instance)
          console.log(`[PluginLoader.restore]   -> 已恢复插件: ${manifest.id}`)
        } catch (err) {
          console.error(`[PluginLoader.restore]   -> 恢复插件 ${manifest.id} 失败:`, err)
        }
      }

      console.log(`[PluginLoader.restore] ====== 恢复完成, 共 ${restored.length} 个 ======`)
      return restored
    } catch (err) {
      console.error('[PluginLoader.restore] 读取本地插件清单失败:', err)
      return []
    }
  }

  getPlugin(pluginId: string): PluginInstance | null {
    return this.plugins.value.get(pluginId) || null
  }

  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.value.values())
  }

  hasPlugin(pluginId: string): boolean {
    return this.plugins.value.has(pluginId)
  }
}

export const taskPluginLoader = new PluginLoader()