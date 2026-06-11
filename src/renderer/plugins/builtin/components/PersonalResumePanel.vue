<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { FilePlus, Loader, PenLine, RefreshCw, Save, ScrollText, Trash2 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import {
  createPersonalResume,
  deletePersonalResume,
  getMyPersonalResume,
  updatePersonalResume,
  type PersonalResume
} from '@/api/resume'

const authStore = useAuthStore()

const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const resume = ref<PersonalResume | null>(null)
const resumeName = ref('')
const content = ref('')
const editing = ref(false)

const hasResume = computed(() => !!resume.value?.id)
const isBusy = computed(() => loading.value || saving.value || deleting.value)
const titleText = computed(() => hasResume.value ? '个人简历' : '创建个人简历')

function clearMessages() {
  errorMessage.value = ''
  successMessage.value = ''
}

function fillDraft(nextResume: PersonalResume | null) {
  resume.value = nextResume
  resumeName.value = nextResume?.resumeName || ''
  content.value = nextResume?.content || ''
  editing.value = !nextResume
}

async function loadResume() {
  clearMessages()
  if (!authStore.isAuthenticated) {
    fillDraft(null)
    return
  }

  loading.value = true
  try {
    const res = await getMyPersonalResume()
    if (res.code === 200) {
      fillDraft(res.data)
    } else if (res.code === 404) {
      fillDraft(null)
    } else {
      errorMessage.value = res.message || '加载个人简历失败'
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载个人简历失败'
  } finally {
    loading.value = false
  }
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
    if (resume.value?.id) {
      const res = await updatePersonalResume(resume.value.id, {
        resumeName: resumeName.value.trim(),
        content: content.value.trim()
      })
      if (res.code === 200) {
        fillDraft(res.data)
        editing.value = false
        successMessage.value = '个人简历已保存'
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
      await loadResume()
      successMessage.value = '个人简历已创建'
    } else {
      errorMessage.value = res.message || '创建失败'
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function removeResume() {
  clearMessages()
  if (!resume.value?.id || deleting.value) {
    return
  }
  const confirmed = window.confirm('确定要删除个人简历吗？')
  if (!confirmed) {
    return
  }

  deleting.value = true
  try {
    const res = await deletePersonalResume(resume.value.id)
    if (res.code === 200) {
      fillDraft(null)
      successMessage.value = '个人简历已删除'
    } else {
      errorMessage.value = res.message || '删除失败'
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '删除失败'
  } finally {
    deleting.value = false
  }
}

function startEdit() {
  clearMessages()
  editing.value = true
}

function cancelEdit() {
  clearMessages()
  fillDraft(resume.value)
  editing.value = false
}

onMounted(loadResume)

watch(() => authStore.isAuthenticated, () => {
  loadResume()
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
          @click="loadResume"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
      <div v-if="!authStore.isAuthenticated" class="rounded border border-vscode-border bg-vscode-sidebar p-3 space-y-2">
        <div class="flex items-center gap-2 text-vscode-text">
          <ScrollText class="w-4 h-4 text-vscode-info" />
          <span class="font-medium">请先登录</span>
        </div>
        <p class="text-xs text-vscode-text-secondary leading-5">登录后可以创建和维护只属于自己的个人简历。</p>
      </div>

      <template v-else>
        <div v-if="loading" class="flex items-center gap-2 text-vscode-text-secondary">
          <Loader class="w-4 h-4 animate-spin" />
          <span>正在加载...</span>
        </div>

        <div v-if="errorMessage" class="rounded bg-vscode-active px-3 py-2 text-vscode-warning text-xs">
          {{ errorMessage }}
        </div>
        <div v-if="successMessage" class="rounded bg-vscode-active px-3 py-2 text-vscode-success text-xs">
          {{ successMessage }}
        </div>

        <div class="rounded border border-vscode-border bg-vscode-sidebar p-3 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <ScrollText class="w-4 h-4 text-vscode-info flex-shrink-0" />
              <span class="font-medium truncate">{{ titleText }}</span>
            </div>
            <span v-if="hasResume && !editing" class="text-[11px] text-vscode-text-secondary">已创建</span>
          </div>

          <template v-if="editing">
            <label class="grid gap-1">
              <span class="text-xs text-vscode-text-secondary">简历名称</span>
              <input
                v-model="resumeName"
                class="bg-vscode-active border border-vscode-border px-2 py-1 rounded text-sm focus:outline-none focus:border-vscode-info/60"
                placeholder="例如：Java 后端简历"
              />
            </label>
            <label class="grid gap-1">
              <span class="text-xs text-vscode-text-secondary">简历内容</span>
              <textarea
                v-model="content"
                rows="14"
                class="bg-vscode-active border border-vscode-border px-2 py-1 rounded text-sm leading-5 resize-y focus:outline-none focus:border-vscode-info/60"
                placeholder="输入你的个人简历内容"
              />
            </label>
            <div class="flex items-center gap-2">
              <button
                class="inline-flex items-center gap-1 px-2 py-1 rounded bg-vscode-selected text-vscode-text disabled:opacity-60"
                :disabled="saving"
                @click="saveResume"
              >
                <Save class="w-4 h-4" />
                {{ saving ? '保存中...' : (hasResume ? '保存' : '创建') }}
              </button>
              <button
                v-if="hasResume"
                class="px-2 py-1 rounded border border-vscode-border text-vscode-text-secondary hover:text-vscode-text"
                :disabled="saving"
                @click="cancelEdit"
              >
                取消
              </button>
            </div>
          </template>

          <template v-else-if="resume">
            <div>
              <div class="text-xs text-vscode-text-secondary mb-1">简历名称</div>
              <div class="text-sm text-vscode-text break-words">{{ resume.resumeName }}</div>
            </div>
            <div>
              <div class="text-xs text-vscode-text-secondary mb-1">简历内容</div>
              <pre class="whitespace-pre-wrap break-words text-sm leading-5 text-vscode-text font-mono">{{ resume.content }}</pre>
            </div>
            <div class="flex items-center gap-2">
              <button class="inline-flex items-center gap-1 px-2 py-1 rounded bg-vscode-selected" @click="startEdit">
                <PenLine class="w-4 h-4" />
                编辑
              </button>
              <button
                class="inline-flex items-center gap-1 px-2 py-1 rounded border border-vscode-warning text-vscode-warning disabled:opacity-60"
                :disabled="deleting"
                @click="removeResume"
              >
                <Trash2 class="w-4 h-4" />
                {{ deleting ? '删除中...' : '删除' }}
              </button>
            </div>
          </template>

          <template v-else>
            <div class="flex items-start gap-2 text-vscode-text-secondary">
              <FilePlus class="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span class="text-xs leading-5">还没有个人简历，创建后会保存在个人简历独立数据中。</span>
            </div>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>
