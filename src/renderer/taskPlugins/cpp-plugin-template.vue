<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Check, X, ChevronLeft, ChevronRight, RotateCcw, BookOpen, Code, FileQuestion, Trophy, Zap, Cpu, GitBranch, Layers, Package, Settings, Terminal, TestTube, Activity, Award, Clipboard, Coffee, Database, Eye, Flag, Heart, Home, Info, Key, Link, Map, Monitor, Moon, Music, PenTool, Phone, Plus, Save, Search, Share, Shield, Smile, Star, Sun, ThumbsUp, Trash, Upload, User, Video, Wifi, Wind } from 'lucide-vue-next'
import { useCheckinStore } from '@/stores/checkin'
import { useEditorStore } from '@/stores/editor'

const p = defineProps<{ planId: string; taskId: string; taskName: string; instId?: string; params?: Record<string, unknown> }>()
const s = useCheckinStore()
const e = useEditorStore()

const I: Record<string, any> = { BookOpen, Code, FileQuestion, Trophy, Zap, Cpu, GitBranch, Layers, Package, Settings, Terminal, TestTube, Activity, Award, Clipboard, Coffee, Database, Eye, Flag, Heart, Home, Info, Key, Link, Map, Monitor, Moon, Music, PenTool, Phone, Plus, Save, Search, Share, Shield, Smile, Star, Sun, ThumbsUp, Trash, Upload, User, Video, Wifi, Wind }
const list = ref<any[]>([])
const ld = ref(true)
const err = ref('')
const cid = ref('')
const sid = ref(0)
const sel = ref('')
const sr = ref(false)
const ok = ref(false)
const qi = ref(0)
const ans = ref<Set<string>>(new Set())
const B = (window.__HAWTHORN_API_URL__) || 'http://localhost:8080/api'

const ch = computed(() => list.value.find((x: any) => x.id === cid.value) || list.value[0])
const sc = computed(() => ch.value?.sections?.[sid.value])
const q = computed(() => sc.value?.questions?.[qi.value])
const n = computed(() => sc.value?.questions?.length || 0)
const v = computed(() => sel.value === q.value?.answer)
const hp = computed(() => qi.value > 0)
const hn = computed(() => qi.value < n.value - 1)
const ac = computed(() => ans.value.size)
const tc = computed(() => { let t = 0; for (const c of list.value) for (const x of c.sections || []) t += x.questions?.length || 0; return t })

function ic(k: string) { return I[k] || BookOpen }
function kk(c: string, s: number, q: number) { return c + ':' + s + ':' + q }
function pk(k: string) { if (!sr.value) sel.value = k }
function sb() {
  if (!sel.value) return
  sr.value = true
  if (q.value && ch.value) ans.value.add(kk(ch.value.id, sid.value, qi.value))
  // 答对且还有下一题 → 自动跳转
  if (sel.value === q.value?.answer && hn.value) setTimeout(() => nx(), 1200)
}
function rs() { sel.value = ''; sr.value = false }
function gc(id: string) { cid.value = id; sid.value = 0; qi.value = 0; rs() }
function gs(i: number) { sid.value = i; qi.value = 0; rs() }
function pr() {
  if (qi.value > 0) { qi.value--; rs() }
  else if (sid.value > 0) { sid.value--; const s2 = ch.value?.sections?.[sid.value]; qi.value = (s2?.questions?.length || 1) - 1; rs() }
}
function nx() {
  const sc2 = sc.value
  if (qi.value < (sc2?.questions?.length || 0) - 1) { qi.value++; rs() }
  else if (sid.value < (ch.value?.sections?.length || 0) - 1) { sid.value++; qi.value = 0; rs() }
  else if (ac.value >= tc.value) { /* 全部答完 → 完成提示 */
    console.log(`[plugin.nx] 全部答完! planId=${p.planId}, instId=${p.instId}, ac=${ac.value}, tc=${tc.value}`)
    ok.value = true
    s.completeTask(p.planId, p.instId)
    setTimeout(() => { console.log(`[plugin.closeTab] closing checkin:task:${p.instId}`); e.closeTab('checkin:task:' + p.instId) }, 2000)
  }
  else { /* 还有未答题目 → 回到第一章第一节 */ gc(list.value[0]?.id) }
}
function fn() {
  if (ac.value < tc.value) return
  console.log(`[plugin.fn] 完成打卡! planId=${p.planId}, instId=${p.instId}, ac=${ac.value}, tc=${tc.value}`)
  ok.value = true
  s.completeTask(p.planId, p.instId)
  setTimeout(() => { console.log(`[plugin.closeTab] closing checkin:task:${p.instId}`); e.closeTab('checkin:task:' + p.instId) }, 1500)
}

async function lo() {
  ld.value = true; err.value = ''
  try {
    const r = await fetch(B + '/plugins/' + p.taskId + '/data')
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const j = await r.json(); const d = j.data || j
    if (d.chapters && Array.isArray(d.chapters)) { list.value = d.chapters; if (list.value.length) cid.value = list.value[0].id }
    else throw new Error('缺少 chapters 数组')
  } catch (x: any) { err.value = x.message || '加载失败' }
  finally { ld.value = false }
}
onMounted(lo)
</script>

<template>
<div class="h-full flex flex-col">
  <div v-if="ld" class="flex-1 flex items-center justify-center">
    <div class="flex flex-col items-center gap-3">
      <div class="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/><span class="text-vscode-text-secondary">加载题库中...</span></div>
  </div>
  <div v-else-if="err" class="flex-1 flex items-center justify-center">
    <div class="flex flex-col items-center gap-4">
      <X class="w-12 h-12 text-red-500"/><p class="text-red-400 font-medium">{{ err }}</p>
      <button @click="lo" class="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium flex items-center"><RotateCcw class="w-4 h-4 mr-2"/>重试</button></div>
  </div>
  <div v-else-if="ok" class="flex-1 flex flex-col items-center justify-center">
    <div class="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-4 animate-bounce"><Check class="w-10 h-10 text-white"/></div>
    <h2 class="text-xl font-bold text-vscode-text mb-2">答题完成！</h2><p class="text-vscode-text-secondary">已答 {{ ac }} / {{ tc }} 题，正在返回...</p>
  </div>
  <div v-else class="flex-1 flex overflow-hidden">
    <div class="w-44 border-r border-vscode-border overflow-y-auto shrink-0">
      <div class="p-2.5 border-b border-vscode-border"><h3 class="text-xs font-semibold text-vscode-text-secondary uppercase">章节</h3></div>
      <div class="py-1">
        <button v-for="c in list" :key="c.id" @click="gc(c.id)" :class="['w-full flex items-center px-3 py-2 text-left text-sm border-l-2', cid===c.id?'bg-blue-500/15 text-blue-400 border-blue-500':'text-vscode-text-secondary hover:bg-vscode-hover border-transparent']">
          <component :is="ic(c.icon)" class="w-4 h-4 mr-2 shrink-0"/><span class="truncate">{{ c.title }}</span></button>
      </div>
      <div class="p-2.5 border-t border-vscode-border mt-auto">
        <div class="flex justify-between text-xs text-vscode-text-secondary mb-1"><span>进度</span><span class="font-mono">{{ ac }}/{{ tc }}</span></div>
        <div class="h-1.5 bg-vscode-border rounded-full overflow-hidden"><div class="h-full bg-blue-500 rounded-full" :style="{width:tc?(ac/tc*100)+'%':'0%'}"/></div>
      </div>
    </div>
    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="flex border-b border-vscode-border px-2 overflow-x-auto shrink-0">
        <button v-for="(x,i) in ch?.sections||[]" :key="x.id" @click="gs(i)" :class="['px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2', sid===i?'border-blue-500 text-blue-400':'border-transparent text-vscode-text-secondary hover:text-vscode-text']">{{ x.title }}</button>
      </div>
      <div class="flex-1 overflow-y-auto p-4">
        <div class="max-w-2xl mx-auto" v-if="q">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2"><span class="text-lg font-bold text-vscode-text">{{ qi+1 }}.</span><h2 class="text-lg font-bold text-vscode-text">{{ q.title || q.content.substring(0,40) }}</h2></div>
            <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', ans.has(kk(ch.id,sid,qi))?'bg-green-500/20 text-green-400':'bg-vscode-border text-vscode-text-secondary']">{{ ans.has(kk(ch.id,sid,qi))?'已答':'未答' }}</span>
          </div>
          <div class="bg-vscode-hover rounded-lg p-3 mb-3"><p class="text-vscode-text">{{ q.content }}</p></div>
          <div class="space-y-2 mb-3">
            <button v-for="o in q.options" :key="o.key" @click="pk(o.key)" :disabled="sr"
              :class="['w-full flex items-center p-3 rounded-lg border-2 text-left', sel===o.key?'border-blue-500 bg-blue-500/10':'border-vscode-border hover:border-vscode-active', sr&&o.key===q.answer?'border-green-500 bg-green-500/10':'', sr&&sel===o.key&&o.key!==q.answer?'border-red-500 bg-red-500/10':'']">
              <span class="w-7 h-7 rounded-full bg-vscode-active flex items-center justify-center mr-3 font-bold text-sm text-vscode-text">{{ o.key }}</span>
              <span class="flex-1 text-vscode-text text-sm">{{ o.text }}</span>
              <Check v-if="sr&&o.key===q.answer" class="w-5 h-5 text-green-500 shrink-0"/><X v-if="sr&&sel===o.key&&o.key!==q.answer" class="w-5 h-5 text-red-500 shrink-0"/></button>
          </div>
          <div v-if="sr" class="bg-vscode-hover rounded-lg p-3 mb-3">
            <div class="flex items-center mb-1.5"><Check v-if="v" class="w-5 h-5 text-green-500 mr-2"/><X v-else class="w-5 h-5 text-red-500 mr-2"/><span :class="v?'text-green-500':'text-red-500'" class="font-bold">{{ v?'正确！':'错误' }}</span></div>
            <p class="text-vscode-text-secondary text-sm"><span class="font-medium text-vscode-text">解析：</span>{{ q.explanation }}</p>
          </div>
          <div class="flex items-center justify-between">
            <div class="flex gap-2">
              <button v-if="!sr" @click="sb" :disabled="!sel" :class="['px-4 py-2 rounded-lg font-medium', sel?'bg-blue-500 hover:bg-blue-600 text-white':'bg-vscode-border text-vscode-text-secondary cursor-not-allowed']">提交答案</button>
              <button v-if="sr" @click="rs" class="px-3 py-2 rounded-lg bg-vscode-active hover:bg-vscode-hover text-vscode-text font-medium flex items-center"><RotateCcw class="w-4 h-4 mr-1"/>重做</button>
              <button v-if="sr&&v && ac>=tc" @click="fn" class="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium">完成打卡</button>
            </div>
            <div class="flex items-center gap-1">
              <button @click="pr" :disabled="!hp" :class="['p-2 rounded-lg', hp?'hover:bg-vscode-hover text-vscode-text':'text-vscode-text-secondary/40 cursor-not-allowed']"><ChevronLeft class="w-5 h-5"/></button>
              <span class="text-xs text-vscode-text-secondary px-1 min-w-[50px] text-center">{{ qi+1 }} / {{ n }}</span>
              <button @click="nx" :disabled="!hn" :class="['p-2 rounded-lg', hn?'hover:bg-vscode-hover text-vscode-text':'text-vscode-text-secondary/40 cursor-not-allowed']"><ChevronRight class="w-5 h-5"/></button>
            </div>
          </div>
        </div>
        <div v-else class="flex-1 flex items-center justify-center"><div class="flex flex-col items-center gap-3 text-vscode-text-secondary"><FileQuestion class="w-10 h-10"/><p>暂无题目</p></div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>
