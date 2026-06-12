<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, ref, watch } from 'vue'
import {
  CheckCircle2,
  Download,
  FilePlus,
  History,
  Loader,
  PenLine,
  RefreshCw,
  Save,
  ScrollText,
  Star,
  Trash2,
  Upload
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useEditorStore } from '@/stores/editor'
import {
  createPersonalResume,
  deletePersonalResume,
  downloadPersonalResumeFile,
  getLatestPersonalResumeScore,
  getPersonalResumeDetail,
  getPersonalResumeScoreHistory,
  importPersonalResume,
  listPersonalResumes,
  replacePersonalResumeFile,
  scorePersonalResume,
  setDefaultPersonalResume,
  updatePersonalResume,
  type PersonalResume,
  type ResumeScoreRecord
} from '@/api/resume'

const props = withDefaults(defineProps<{
  mode?: 'sidebar' | 'detail'
  resumeId?: string
  startEditing?: boolean
}>(), {
  mode: 'sidebar',
  resumeId: '',
  startEditing: false
})

const authStore = useAuthStore()
const editorStore = useEditorStore()
const selfComponent = getCurrentInstance()?.type

const resumes = ref<PersonalResume[]>([])
const selectedId = ref('')
const selectedResume = ref<PersonalResume | null>(null)
const searchText = ref('')
const resumeName = ref('')
const content = ref('')
const editing = ref(false)
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const uploading = ref(false)
const scoring = ref(false)
const downloading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const replaceFileInputRef = ref<HTMLInputElement | null>(null)
const targetRole = ref('GENERAL')
const latestScore = ref<ResumeScoreRecord | null>(null)
const scoreHistory = ref<ResumeScoreRecord[]>([])
const showHistory = ref(false)
const isDetailMode = computed(() => props.mode === 'detail')

const targetRoles = [
  { value: 'GENERAL', label: '通用' },
  { value: 'BACKEND', label: '后端' },
  { value: 'FRONTEND', label: '前端' },
  { value: 'ALGORITHM', label: '算法' },
  { value: 'TESTING', label: '测试' },
  { value: 'PRODUCT', label: '产品' }
]

const hasResume = computed(() => !!selectedResume.value?.id)
const isBusy = computed(() => loading.value || saving.value || deleting.value || uploading.value || scoring.value || downloading.value)
const selectedHasFile = computed(() => !!selectedResume.value?.originalFileName)

function clearMessages() {
  errorMessage.value = ''
  successMessage.value = ''
}

function setError(error: unknown, fallback: string) {
  errorMessage.value = error instanceof Error ? error.message : fallback
}

function fillDraft(resume: PersonalResume | null) {
  selectedResume.value = resume
  selectedId.value = resume?.id || ''
  resumeName.value = resume?.resumeName || ''
  content.value = resume?.content || ''
  editing.value = !resume
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function formatSize(value?: number | null) {
  if (!value) return '-'
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

async function loadResumes(preferredId = selectedId.value) {
  clearMessages()
  if (!authStore.isAuthenticated) {
    resumes.value = []
    fillDraft(null)
    return
  }

  loading.value = true
  try {
    const res = await listPersonalResumes(1, 50, searchText.value)
    if (res.code !== 200) {
      errorMessage.value = res.message || '加载个人简历失败'
      return
    }
    resumes.value = res.data.items || []
    const next = resumes.value.find(item => item.id === preferredId)
      || resumes.value.find(item => item.isDefault)
      || resumes.value[0]
      || null
    if (next) {
      selectedId.value = next.id
      if (isDetailMode.value) {
        await selectResume(next.id)
      } else if (!editorStore.activeTabId?.startsWith('personal-resume:')) {
        openResumeTab(next.id, next.resumeName)
      }
    } else {
      fillDraft(null)
      latestScore.value = null
      scoreHistory.value = []
    }
  } catch (error) {
    setError(error, '加载个人简历失败')
  } finally {
    loading.value = false
  }
}

function openResumeTab(id: string, title = '个人简历', startEditing = false) {
  if (!selfComponent) return
  editorStore.openComponentTab(
    `personal-resume:${id}`,
    title || '个人简历',
    selfComponent,
    { mode: 'detail', resumeId: id, startEditing }
  )
}

async function selectResume(id: string) {
  clearMessages()
  selectedId.value = id
  if (!isDetailMode.value) {
    const item = resumes.value.find(resume => resume.id === id)
    openResumeTab(id, item?.resumeName || '个人简历')
    return
  }
  try {
    const res = await getPersonalResumeDetail(id)
    if (res.code === 200) {
      fillDraft(res.data)
      editing.value = false
      await loadScores(id)
    } else {
      errorMessage.value = res.message || '加载简历详情失败'
    }
  } catch (error) {
    setError(error, '加载简历详情失败')
  }
}

async function loadScores(id = selectedId.value) {
  latestScore.value = null
  scoreHistory.value = []
  if (!id) return
  try {
    const latest = await getLatestPersonalResumeScore(id)
    if (latest.code === 200) {
      latestScore.value = latest.data
    }
  } catch {
    latestScore.value = null
  }
  try {
    const history = await getPersonalResumeScoreHistory(id, 1, 8)
    if (history.code === 200) {
      scoreHistory.value = history.data.items || []
    }
  } catch {
    scoreHistory.value = []
  }
}

function startNew() {
  clearMessages()
  if (!isDetailMode.value) {
    openResumeTab('new', '新建个人简历', true)
    return
  }
  fillDraft(null)
  selectedId.value = ''
  resumeName.value = '新的个人简历'
  content.value = ''
  latestScore.value = null
  scoreHistory.value = []
  editing.value = true
}

function startEdit() {
  clearMessages()
  editing.value = true
}

function cancelEdit() {
  clearMessages()
  fillDraft(selectedResume.value)
  editing.value = false
}

async function saveResume() {
  clearMessages()
  if (!authStore.isAuthenticated) {
    errorMessage.value = '请先登录'
    return
  }
  if (!resumeName.value.trim()) {
    errorMessage.value = '简历名称不能为空'
    return
  }
  if (!content.value.trim()) {
    errorMessage.value = '简历内容不能为空'
    return
  }

  saving.value = true
  try {
    if (selectedResume.value?.id) {
      const res = await updatePersonalResume(selectedResume.value.id, {
        resumeName: resumeName.value.trim(),
        content: content.value.trim(),
        isDefault: Boolean(selectedResume.value.isDefault)
      })
      if (res.code === 200) {
        successMessage.value = '个人简历已保存'
        await loadResumes(res.data.id)
        openResumeTab(res.data.id, resumeName.value.trim())
        editing.value = false
      } else {
        errorMessage.value = res.message || '保存失败'
      }
      return
    }

    const res = await createPersonalResume({
      resumeName: resumeName.value.trim(),
      content: content.value.trim()
    })
    if (res.code === 200) {
      successMessage.value = '个人简历已创建'
      const newId = res.data.resumeId
      await selectResume(newId)
      openResumeTab(newId, resumeName.value.trim())
      editing.value = false
    } else {
      errorMessage.value = res.message || '创建失败'
    }
  } catch (error) {
    setError(error, '保存失败')
  } finally {
    saving.value = false
  }
}

async function removeResume() {
  clearMessages()
  if (!selectedResume.value?.id || deleting.value) return
  if (!window.confirm('确定要删除这份个人简历吗？')) return

  deleting.value = true
  try {
    const res = await deletePersonalResume(selectedResume.value.id)
    if (res.code === 200) {
      successMessage.value = '个人简历已删除'
      await loadResumes('')
    } else {
      errorMessage.value = res.message || '删除失败'
    }
  } catch (error) {
    setError(error, '删除失败')
  } finally {
    deleting.value = false
  }
}

async function markDefault() {
  clearMessages()
  if (!selectedResume.value?.id) return
  try {
    const res = await setDefaultPersonalResume(selectedResume.value.id)
    if (res.code === 200) {
      successMessage.value = '已设为默认简历'
      await loadResumes(res.data.id)
    } else {
      errorMessage.value = res.message || '设置默认失败'
    }
  } catch (error) {
    setError(error, '设置默认失败')
  }
}

function triggerImport() {
  fileInputRef.value?.click()
}

function triggerReplace() {
  replaceFileInputRef.value?.click()
}

async function handleImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  clearMessages()
  uploading.value = true
  try {
    const res = await importPersonalResume(file)
    if (res.code === 200) {
      successMessage.value = '简历文件已导入'
      await loadResumes(res.data.id)
      if (isDetailMode.value) {
        editing.value = true
      }
      openResumeTab(res.data.id, res.data.resumeName, true)
    } else {
      errorMessage.value = res.message || '导入失败'
    }
  } catch (error) {
    setError(error, '导入失败')
  } finally {
    uploading.value = false
  }
}

async function handleReplaceFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !selectedResume.value?.id) return
  clearMessages()
  uploading.value = true
  try {
    const res = await replacePersonalResumeFile(selectedResume.value.id, file)
    if (res.code === 200) {
      successMessage.value = '简历文件已替换'
      await loadResumes(res.data.id)
      editing.value = true
    } else {
      errorMessage.value = res.message || '替换失败'
    }
  } catch (error) {
    setError(error, '替换失败')
  } finally {
    uploading.value = false
  }
}

async function downloadFile() {
  clearMessages()
  if (!selectedResume.value?.id) return
  downloading.value = true
  try {
    const blob = await downloadPersonalResumeFile(selectedResume.value.id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = selectedResume.value.originalFileName || `${selectedResume.value.resumeName}.resume`
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    setError(error, '下载失败')
  } finally {
    downloading.value = false
  }
}

async function runScore() {
  clearMessages()
  if (!selectedResume.value?.id) return
  scoring.value = true
  try {
    const res = await scorePersonalResume(selectedResume.value.id, targetRole.value)
    if (res.code === 200) {
      latestScore.value = res.data
      successMessage.value = '简历评分已生成'
      await loadScores(selectedResume.value.id)
    } else {
      errorMessage.value = res.message || '评分失败'
    }
  } catch (error) {
    setError(error, '评分失败')
  } finally {
    scoring.value = false
  }
}

onMounted(() => {
  if (isDetailMode.value) {
    if (props.resumeId === 'new') {
      startNew()
      return
    }
    if (props.resumeId) {
      selectResume(props.resumeId).then(() => {
        if (props.startEditing) editing.value = true
      })
      return
    }
  }
  loadResumes()
})

watch(() => authStore.isAuthenticated, () => {
  if (isDetailMode.value && props.resumeId && props.resumeId !== 'new') {
    selectResume(props.resumeId)
  } else if (!isDetailMode.value) {
    loadResumes('')
  }
})
</script>

<template>
  <div class="h-full flex flex-col bg-vscode-bg text-vscode-text">
    <div class="p-2 border-b border-vscode-border">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-semibold text-vscode-text-secondary uppercase tracking-wider">个人简历</span>
        <button
          class="p-1 rounded text-vscode-icon hover:text-vscode-icon-hover hover:bg-vscode-active disabled:opacity-50"
          title="刷新"
          :disabled="isBusy"
          @click="loadResumes()"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <div v-if="!authStore.isAuthenticated" class="p-3 text-sm">
      <div class="rounded border border-vscode-border bg-vscode-sidebar p-3 space-y-2">
        <div class="flex items-center gap-2">
          <ScrollText class="w-4 h-4 text-vscode-info" />
          <span class="font-medium">请先登录</span>
        </div>
        <p class="text-xs text-vscode-text-secondary leading-5">登录后可以维护个人简历库、导入文件并生成评分。</p>
      </div>
    </div>

    <div
      v-else
      class="flex-1 min-h-0 overflow-y-auto text-sm"
      :class="isDetailMode ? 'p-4' : 'p-2 space-y-2'"
    >
      <div v-if="errorMessage" class="rounded bg-vscode-active px-2 py-1.5 text-vscode-warning text-xs">
        {{ errorMessage }}
      </div>
      <div v-if="successMessage" class="rounded bg-vscode-active px-2 py-1.5 text-vscode-success text-xs">
        {{ successMessage }}
      </div>
      <input ref="replaceFileInputRef" type="file" class="hidden" accept=".doc,.docx,.pdf,.txt" @change="handleReplaceFile" />

      <div v-if="!isDetailMode" class="space-y-2">
        <div class="flex gap-1.5">
          <input
            v-model="searchText"
            class="min-w-0 flex-1 bg-vscode-sidebar border border-vscode-border rounded px-2 py-1 text-xs focus:outline-none focus:border-vscode-info/60"
            placeholder="搜索简历"
            @keydown.enter="loadResumes('')"
          />
          <button class="px-2 py-1 rounded bg-vscode-selected text-xs" :disabled="loading" @click="loadResumes('')">搜索</button>
        </div>
        <div class="flex gap-1.5">
          <button class="inline-flex items-center gap-1 px-2 py-1 rounded bg-vscode-selected text-xs" @click="startNew">
            <FilePlus class="w-3.5 h-3.5" />
            新建
          </button>
          <button class="inline-flex items-center gap-1 px-2 py-1 rounded border border-vscode-border text-xs" :disabled="uploading" @click="triggerImport">
            <Upload class="w-3.5 h-3.5" />
            {{ uploading ? '导入中' : '导入文件' }}
          </button>
          <input ref="fileInputRef" type="file" class="hidden" accept=".doc,.docx,.pdf,.txt" @change="handleImportFile" />
        </div>
      </div>

      <div v-if="!isDetailMode" class="border border-vscode-border rounded bg-vscode-sidebar overflow-hidden">
        <div v-if="loading" class="flex items-center gap-2 p-2 text-vscode-text-secondary text-xs">
          <Loader class="w-4 h-4 animate-spin" />
          正在加载...
        </div>
        <button
          v-for="item in resumes"
          :key="item.id"
          class="w-full text-left px-2 py-2 border-b border-vscode-border last:border-b-0 hover:bg-vscode-active"
          :class="selectedId === item.id ? 'bg-vscode-selected/50' : ''"
          @click="selectResume(item.id)"
        >
          <div class="flex items-center gap-1 min-w-0">
            <Star v-if="item.isDefault" class="w-3.5 h-3.5 text-vscode-warning flex-shrink-0" />
            <span class="font-medium truncate">{{ item.resumeName }}</span>
          </div>
          <div class="mt-1 text-[11px] text-vscode-text-secondary truncate">
            {{ item.originalFileName || (item.sourceType === 'FILE' ? '文件简历' : '文本简历') }} · {{ formatDate(item.updatedAt) }}
          </div>
        </button>
        <div v-if="!loading && resumes.length === 0" class="p-3 text-xs text-vscode-text-secondary leading-5">
          暂无个人简历，可新建文本简历或导入 doc/docx/pdf/txt。
        </div>
      </div>

      <div
        v-if="isDetailMode"
        class="border border-vscode-border rounded bg-vscode-sidebar space-y-2"
        :class="isDetailMode ? 'p-4' : 'p-2'"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1 min-w-0">
            <ScrollText class="w-4 h-4 text-vscode-info flex-shrink-0" />
            <span class="font-medium truncate">{{ hasResume ? selectedResume?.resumeName : '编辑个人简历' }}</span>
          </div>
          <span v-if="selectedResume?.isDefault" class="text-[11px] text-vscode-warning">默认</span>
        </div>

        <template v-if="editing">
          <label class="grid gap-1">
            <span class="text-xs text-vscode-text-secondary">名称</span>
            <input
              v-model="resumeName"
              class="bg-vscode-active border border-vscode-border px-2 py-1 rounded text-sm focus:outline-none focus:border-vscode-info/60"
              placeholder="例如：后端开发简历"
            />
          </label>
          <label class="grid gap-1">
            <span class="text-xs text-vscode-text-secondary">内容</span>
            <textarea
              v-model="content"
              :rows="isDetailMode ? 24 : 14"
              class="bg-vscode-active border border-vscode-border px-2 py-1 rounded text-sm leading-5 resize-y focus:outline-none focus:border-vscode-info/60"
              placeholder="输入或导入你的个人简历内容"
            />
          </label>
          <div class="flex flex-wrap gap-1.5">
            <button class="inline-flex items-center gap-1 px-2 py-1 rounded bg-vscode-selected text-xs disabled:opacity-60" :disabled="saving" @click="saveResume">
              <Save class="w-3.5 h-3.5" />
              {{ saving ? '保存中' : '保存' }}
            </button>
            <button v-if="hasResume" class="px-2 py-1 rounded border border-vscode-border text-xs" :disabled="saving" @click="cancelEdit">取消</button>
          </div>
        </template>

        <template v-else-if="selectedResume">
          <div class="text-xs text-vscode-text-secondary space-y-1">
            <div>更新：{{ formatDate(selectedResume.updatedAt) }}</div>
            <div v-if="selectedResume.originalFileName">文件：{{ selectedResume.originalFileName }} · {{ formatSize(selectedResume.fileSize) }}</div>
          </div>
          <pre
            class="overflow-y-auto whitespace-pre-wrap break-words text-xs leading-5 text-vscode-text font-mono bg-vscode-active border border-vscode-border rounded p-2"
            :class="isDetailMode ? 'max-h-[52vh]' : 'max-h-56'"
          >{{ selectedResume.content }}</pre>
          <div class="flex flex-wrap gap-1.5">
            <button class="inline-flex items-center gap-1 px-2 py-1 rounded bg-vscode-selected text-xs" @click="startEdit">
              <PenLine class="w-3.5 h-3.5" />
              编辑
            </button>
            <button class="inline-flex items-center gap-1 px-2 py-1 rounded border border-vscode-border text-xs" @click="triggerReplace">
              <Upload class="w-3.5 h-3.5" />
              替换文件
            </button>
            <button class="inline-flex items-center gap-1 px-2 py-1 rounded border border-vscode-border text-xs disabled:opacity-50" :disabled="!selectedHasFile || downloading" @click="downloadFile">
              <Download class="w-3.5 h-3.5" />
              下载
            </button>
            <button class="inline-flex items-center gap-1 px-2 py-1 rounded border border-vscode-border text-xs disabled:opacity-50" :disabled="!!selectedResume.isDefault" @click="markDefault">
              <CheckCircle2 class="w-3.5 h-3.5" />
              设默认
            </button>
            <button class="inline-flex items-center gap-1 px-2 py-1 rounded border border-vscode-warning text-vscode-warning text-xs disabled:opacity-60" :disabled="deleting" @click="removeResume">
              <Trash2 class="w-3.5 h-3.5" />
              删除
            </button>
          </div>
        </template>

        <div v-else class="flex items-start gap-2 text-vscode-text-secondary">
          <FilePlus class="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span class="text-xs leading-5">选择、新建或导入一份个人简历。</span>
        </div>
      </div>

      <div v-if="isDetailMode && selectedResume" class="border border-vscode-border rounded bg-vscode-sidebar p-2 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="font-medium text-sm">简历评分</span>
          <button class="inline-flex items-center gap-1 text-xs text-vscode-text-secondary hover:text-vscode-text" @click="showHistory = !showHistory">
            <History class="w-3.5 h-3.5" />
            历史
          </button>
        </div>
        <div class="flex gap-1.5">
          <select v-model="targetRole" class="flex-1 bg-vscode-active border border-vscode-border rounded px-2 py-1 text-xs focus:outline-none">
            <option v-for="role in targetRoles" :key="role.value" :value="role.value">{{ role.label }}</option>
          </select>
          <button class="px-2 py-1 rounded bg-vscode-selected text-xs disabled:opacity-60" :disabled="scoring" @click="runScore">
            {{ scoring ? '评分中' : '评分' }}
          </button>
        </div>
        <div v-if="latestScore" class="space-y-2">
          <div class="flex items-end gap-2">
            <span class="text-2xl font-semibold text-vscode-info">{{ latestScore.totalScore }}</span>
            <span class="text-xs text-vscode-text-secondary pb-1">/ 100 · {{ latestScore.targetRoleName }}</span>
          </div>
          <div class="space-y-1">
            <div v-for="dim in latestScore.dimensions" :key="dim.key" class="text-xs">
              <div class="flex justify-between text-vscode-text-secondary">
                <span>{{ dim.name }}</span>
                <span>{{ dim.score }}/{{ dim.maxScore }}</span>
              </div>
              <div class="h-1.5 bg-vscode-active rounded overflow-hidden">
                <div class="h-full bg-vscode-info" :style="{ width: `${Math.min(100, (dim.score / dim.maxScore) * 100)}%` }"></div>
              </div>
            </div>
          </div>
          <p class="text-xs leading-5 text-vscode-text-secondary">{{ latestScore.summary }}</p>
          <div class="grid gap-1 text-xs leading-5">
            <div><span class="text-vscode-success">优势：</span>{{ latestScore.strengths.join('；') }}</div>
            <div><span class="text-vscode-warning">不足：</span>{{ latestScore.weaknesses.join('；') }}</div>
            <div><span class="text-vscode-info">建议：</span>{{ latestScore.suggestions.join('；') }}</div>
          </div>
        </div>
        <div v-else class="text-xs text-vscode-text-secondary leading-5">还没有评分记录，选择岗位方向后生成评分。</div>
        <div v-if="showHistory" class="border-t border-vscode-border pt-2 space-y-1">
          <div v-for="record in scoreHistory" :key="record.id" class="flex items-center justify-between text-xs">
            <span>{{ record.targetRoleName }} · {{ formatDate(record.createdAt) }}</span>
            <span class="text-vscode-info">{{ record.totalScore }}</span>
          </div>
          <div v-if="scoreHistory.length === 0" class="text-xs text-vscode-text-secondary">暂无历史记录</div>
        </div>
      </div>
    </div>
  </div>
</template>
