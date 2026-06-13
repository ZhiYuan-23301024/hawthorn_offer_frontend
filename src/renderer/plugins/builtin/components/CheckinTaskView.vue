<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Check, Clock, Target, Star, Code, ChevronDown, ChevronUp } from 'lucide-vue-next'
import { useCheckinStore } from '@/stores/checkin'
import { useEditorStore } from '@/stores/editor'

const props = defineProps<{
  planId: string
  taskId: string
  taskName: string
  params?: Record<string, unknown>
}>()

const checkinStore = useCheckinStore()
const editorStore = useEditorStore()

const isCompleting = ref(false)
const completionTime = ref(0)
const showComplete = ref(false)

// 展开/收起提示
const hintsExpanded = ref(false)

// 格式化参数显示
const formattedParams = computed(() => {
  if (!props.params || Object.keys(props.params).length === 0) {
    return null
  }
  return Object.entries(props.params)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ')
})

// 编程刷题相关
const questionId = computed(() => props.params?.questionId as number || 1)
const showHints = computed(() => props.params?.showHints !== false)
const difficulty = computed(() => props.params?.difficulty as string || 'all')

// 预置题目数据（与测试方案保持一致）
const questions = [
  {
    id: 1,
    title: '两数之和',
    difficulty: 'easy',
    description: '给定一个整数数组 nums 和一个整数目标值 target，请你在该数组中找出和为目标值 target 的那两个整数，并返回它们的数组下标。',
    examples: [
      '输入：nums = [2,7,11,15], target = 9',
      '输出：[0,1]',
      '解释：因为 nums[0] + nums[1] == 9 ，返回 [0, 1] 。'
    ],
    hints: [
      '可以使用哈希表来优化查找效率',
      '时间复杂度可以从 O(n²) 优化到 O(n)'
    ],
    timeLimit: 15
  },
  {
    id: 2,
    title: '有效的括号',
    difficulty: 'medium',
    description: '给定一个只包括 \'(\', \')\', \'{\', \'}\', \'[\', \']\' 的字符串 s，判断字符串是否有效。',
    examples: [
      '输入：s = "()"',
      '输出：true',
      '输入：s = "()[]{}"',
      '输出：true',
      '输入：s = "(]"',
      '输出：false'
    ],
    hints: [
      '使用栈来解决这个问题',
      '左括号入栈，右括号出栈匹配'
    ],
    timeLimit: 20
  },
  {
    id: 3,
    title: '合并K个升序链表',
    difficulty: 'hard',
    description: '给你一个链表数组，每个链表都已经按升序排列，请你将所有链表合并到一个升序链表中，返回合并后的链表。',
    examples: [
      '输入：lists = [[1,4,5],[1,3,4],[2,6]]',
      '输出：[1,1,2,3,4,4,5,6]',
      '解释：链表数组如下：\n1->4->5,\n1->3->4,\n2->6\n合并后：1->1->2->3->4->4->5->6'
    ],
    hints: [
      '可以使用优先队列（最小堆）来优化',
      '也可以使用分治归并策略'
    ],
    timeLimit: 30
  }
]

const currentQuestion = computed(() => {
  const id = questionId.value
  return questions.find(q => q.id === id) || questions[0]
})

const difficultyColor = computed(() => {
  const colors: Record<string, string> = {
    'easy': 'text-green-400',
    'medium': 'text-yellow-400',
    'hard': 'text-red-400'
  }
  return colors[currentQuestion.value.difficulty] || 'text-gray-400'
})

const difficultyLabel = computed(() => {
  const labels: Record<string, string> = {
    'easy': '简单',
    'medium': '中等',
    'hard': '困难'
  }
  return labels[currentQuestion.value.difficulty] || '未知'
})

function startTimer() {
  isCompleting.value = true
  completionTime.value = 0
  timer = window.setInterval(() => {
    completionTime.value++
  }, 1000)
}

function completeTask() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  isCompleting.value = false
  showComplete.value = true
  
  checkinStore.completeTask(props.planId, props.taskId)
  
  setTimeout(() => {
    editorStore.closeTab(`checkin:task:${props.taskId}`)
  }, 1500)
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

let timer: number | null = null

onMounted(() => {
  startTimer()
})
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div v-if="showComplete" class="h-full flex flex-col items-center justify-center">
      <div class="w-24 h-24 rounded-full bg-vscode-success flex items-center justify-center mb-6 animate-bounce">
        <Check class="w-12 h-12 text-white" />
      </div>
      <h2 class="text-2xl font-bold text-vscode-text mb-2">任务完成！</h2>
      <p class="text-vscode-text-secondary">正在返回 Roadmap...</p>
    </div>

    <div v-else class="max-w-2xl mx-auto">
      <!-- 任务头部 -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 rounded-full bg-vscode-active flex items-center justify-center mx-auto mb-4">
          <Target class="w-8 h-8 text-vscode-icon-hover" />
        </div>
        <h1 class="text-2xl font-bold text-vscode-text">{{ taskName }}</h1>
        <p class="text-vscode-text-secondary mt-2">专注完成当前任务</p>
      </div>

      <!-- 参数配置提示（仅在有参数时显示） -->
      <div v-if="formattedParams" class="bg-vscode-hover rounded-lg p-4 mb-6">
        <div class="flex items-center text-sm text-vscode-text-secondary">
          <Star class="w-4 h-4 mr-2" />
          <span class="font-mono">{{ formattedParams }}</span>
        </div>
      </div>

      <!-- 编程刷题模式（检测是否有 questionId 参数） -->
      <div v-if="currentQuestion" class="space-y-4 mb-6">
        <!-- 题目卡片 -->
        <div class="bg-vscode-hover rounded-lg p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center space-x-3">
              <Code class="w-6 h-6 text-vscode-active" />
              <h2 class="text-xl font-bold text-vscode-text">{{ currentQuestion.title }}</h2>
            </div>
            <span 
              class="px-3 py-1 rounded-full text-sm font-medium"
              :class="{
                'bg-green-900/30 text-green-400': currentQuestion.difficulty === 'easy',
                'bg-yellow-900/30 text-yellow-400': currentQuestion.difficulty === 'medium',
                'bg-red-900/30 text-red-400': currentQuestion.difficulty === 'hard'
              }"
            >
              {{ difficultyLabel }}
            </span>
          </div>
          
          <div class="space-y-4">
            <!-- 题目描述 -->
            <div>
              <h3 class="text-sm font-semibold text-vscode-text-secondary mb-2">题目描述</h3>
              <p class="text-vscode-text whitespace-pre-line">{{ currentQuestion.description }}</p>
            </div>
            
            <!-- 示例 -->
            <div>
              <h3 class="text-sm font-semibold text-vscode-text-secondary mb-2">示例</h3>
              <div class="space-y-1">
                <div 
                  v-for="(example, idx) in currentQuestion.examples" 
                  :key="idx"
                  class="font-mono text-sm text-vscode-text bg-vscode-bg rounded px-3 py-2"
                >
                  {{ example }}
                </div>
              </div>
            </div>
            
            <!-- 提示区域 -->
            <div v-if="showHints && currentQuestion.hints.length > 0">
              <button 
                class="flex items-center text-sm text-vscode-text-secondary hover:text-vscode-text transition-colors"
                @click="hintsExpanded = !hintsExpanded"
              >
                <ChevronDown v-if="!hintsExpanded" class="w-4 h-4 mr-1" />
                <ChevronUp v-else class="w-4 h-4 mr-1" />
                {{ hintsExpanded ? '收起提示' : '显示提示' }}
              </button>
              <div v-if="hintsExpanded" class="mt-2 space-y-1">
                <div 
                  v-for="(hint, idx) in currentQuestion.hints" 
                  :key="idx"
                  class="text-sm text-yellow-400 bg-yellow-900/20 rounded px-3 py-2"
                >
                  {{ hint }}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 编码区域提示 -->
        <div class="bg-vscode-hover rounded-lg p-6">
          <h3 class="text-sm font-semibold text-vscode-text-secondary mb-2">编码区域</h3>
          <div class="bg-vscode-bg rounded border border-vscode-border p-4 text-sm text-vscode-text-secondary">
            请在你常用的编程环境中完成本题，完成后点击下方"完成任务"按钮。
          </div>
        </div>
      </div>

      <!-- 默认专注模式（无参数时） -->
      <div v-else class="bg-vscode-hover rounded-lg p-6 mb-6">
        <div class="flex items-center justify-center mb-4">
          <Clock class="w-6 h-6 text-vscode-icon mr-2" />
          <span class="text-4xl font-mono font-bold text-vscode-text">{{ formatTime(completionTime) }}</span>
        </div>
        <div class="text-center text-sm text-vscode-text-secondary">
          已专注 {{ completionTime }} 秒
        </div>
      </div>

      <!-- 任务说明（无参数时） -->
      <div v-if="!currentQuestion" class="bg-vscode-hover rounded-lg p-6 mb-6">
        <h3 class="text-sm font-semibold text-vscode-text-secondary mb-4 flex items-center">
          <Star class="w-4 h-4 mr-2" />
          任务说明
        </h3>
        <div class="space-y-2 text-sm text-vscode-text">
          <p>这是一个专注打卡任务，你需要：</p>
          <ul class="list-disc list-inside space-y-1 text-vscode-text-secondary">
            <li>专注完成当前任务</li>
            <li>保持专注状态</li>
            <li>完成后点击下方按钮</li>
          </ul>
        </div>
      </div>

      <button
        class="w-full py-3 rounded-lg bg-success text-white font-semibold transition-colors text-lg" style="--hover-bg: var(--color-success);"
        @click="completeTask"
      >
        {{ currentQuestion ? '完成任务' : '完成任务' }}
      </button>

      <p class="text-center text-xs text-vscode-text-secondary mt-4">
        点击完成后将自动返回 Roadmap
      </p>
    </div>
  </div>
</template>
