<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Check, Clock, Target, Star, Code, ChevronDown, ChevronUp, BookOpen, Briefcase, GraduationCap } from 'lucide-vue-next'
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

const hintsExpanded = ref(false)

const formattedParams = computed(() => {
  if (!props.params || Object.keys(props.params).length === 0) {
    return null
  }
  return Object.entries(props.params)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ')
})

const taskType = computed(() => {
  const name = props.taskName.toLowerCase()
  if (name.includes('刷题') || name.includes('编程') || name.includes('code')) return 'coding'
  if (name.includes('c++') || name.includes('cpp')) return 'cpp'
  if (name.includes('工程') || name.includes('实践') || name.includes('project')) return 'engineering'
  if (name.includes('考公') || name.includes('公务员') || name.includes('civil')) return 'civil'
  return 'focus'
})

const taskIcon = computed(() => {
  const icons: Record<string, any> = {
    'coding': Code,
    'cpp': Code,
    'engineering': Briefcase,
    'civil': GraduationCap,
    'focus': Clock
  }
  return icons[taskType.value] || Clock
})

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

const cppQuestions = [
  {
    id: 1,
    title: '智能指针的使用',
    difficulty: 'medium',
    description: '请解释 std::unique_ptr 和 std::shared_ptr 的区别，并编写一个使用智能指针管理动态内存的示例程序。',
    examples: [
      '要求：使用 std::unique_ptr 管理一个动态分配的数组',
      '要求：使用 std::shared_ptr 实现对象的共享所有权'
    ],
    hints: [
      'unique_ptr 是独占所有权的智能指针',
      'shared_ptr 使用引用计数来管理对象的生命周期'
    ],
    timeLimit: 30
  },
  {
    id: 2,
    title: 'Lambda 表达式',
    difficulty: 'easy',
    description: '请解释 Lambda 表达式的语法和使用场景，并编写一个使用 Lambda 表达式的示例。',
    examples: [
      '使用 Lambda 表达式作为 std::sort 的比较函数',
      '使用 Lambda 表达式捕获外部变量'
    ],
    hints: [
      'Lambda 表达式的基本语法：[捕获列表](参数列表) -> 返回类型 { 函数体 }',
      '值捕获使用 []，引用捕获使用 [&]'
    ],
    timeLimit: 20
  },
  {
    id: 3,
    title: 'STL 容器的选择',
    difficulty: 'hard',
    description: '请分析 std::vector、std::list、std::deque 和 std::map 的性能特点和适用场景。',
    examples: [
      '场景1：频繁在末尾添加元素',
      '场景2：频繁在任意位置插入和删除',
      '场景3：需要快速随机访问'
    ],
    hints: [
      'vector 适合随机访问但插入删除效率低',
      'list 适合频繁插入删除但不支持随机访问',
      'map 适合键值对查找'
    ],
    timeLimit: 45
  }
]

const engineeringTasks = [
  {
    id: 1,
    title: '项目初始化',
    difficulty: 'easy',
    description: '使用 CMake 创建一个新的 C++ 项目，包含：1. 主程序入口 2. 静态库 3. 动态库 4. 单元测试。',
    examples: [
      '创建 CMakeLists.txt',
      '配置编译器选项',
      '设置输出目录'
    ],
    hints: [
      '使用 add_executable 创建可执行文件',
      '使用 add_library 创建库',
      '使用 enable_testing 启用测试'
    ],
    timeLimit: 60
  },
  {
    id: 2,
    title: '构建系统配置',
    difficulty: 'medium',
    description: '配置 CI/CD 流水线，实现自动化构建和测试。',
    examples: [
      '配置 GitHub Actions',
      '实现多平台构建',
      '自动运行单元测试'
    ],
    hints: [
      '使用 GitHub Actions 的 workflow 文件',
      '配置构建矩阵支持不同平台',
      '设置测试覆盖率报告'
    ],
    timeLimit: 45
  },
  {
    id: 3,
    title: '代码审查规范',
    difficulty: 'hard',
    description: '制定团队代码审查规范，包括：代码风格、命名规范、注释要求、安全检查。',
    examples: [
      '配置 clang-format',
      '配置 clang-tidy',
      '编写代码审查检查清单'
    ],
    hints: [
      '使用 .clang-format 文件配置代码风格',
      '使用 clang-tidy 进行静态分析',
      '制定 PR 模板'
    ],
    timeLimit: 30
  }
]

const civilQuestions = [
  {
    id: 1,
    title: '行政能力测试',
    difficulty: 'easy',
    description: '下列选项中，属于行政决策基本特征的是？',
    options: ['强制性', '民主性', '合法性', '以上都是'],
    answer: 3,
    explanation: '行政决策具有强制性（以国家权力为后盾）、民主性（体现人民意志）、合法性（符合法律法规）等基本特征。'
  },
  {
    id: 2,
    title: '申论写作',
    difficulty: 'medium',
    description: '请分析当前我国就业形势的特点，并提出解决就业问题的对策。',
    hints: [
      '就业形势特点：结构性矛盾突出、青年就业压力大、新业态带来新机遇',
      '对策：发展实体经济、加强职业培训、优化就业服务'
    ],
    timeLimit: 45
  },
  {
    id: 3,
    title: '法律基础知识',
    difficulty: 'medium',
    description: '根据我国宪法规定，下列哪项不属于公民的基本权利？',
    options: ['选举权', '受教育权', '罢工权', '人身自由权'],
    answer: 2,
    explanation: '我国宪法规定的公民基本权利包括选举权、受教育权、人身自由权等，但罢工权不属于公民的基本权利。'
  }
]

const currentQuestion = computed(() => {
  const questionId = props.params?.questionId as number || 1
  const questionSets: Record<string, any[]> = {
    'coding': questions,
    'cpp': cppQuestions,
    'engineering': engineeringTasks,
    'civil': civilQuestions
  }
  const set = questionSets[taskType.value] || []
  return set.find(q => q.id === questionId) || set[0]
})

const difficultyColor = computed(() => {
  const colors: Record<string, string> = {
    'easy': 'text-green-400',
    'medium': 'text-yellow-400',
    'hard': 'text-red-400'
  }
  return colors[currentQuestion.value?.difficulty] || 'text-gray-400'
})

const difficultyLabel = computed(() => {
  const labels: Record<string, string> = {
    'easy': '简单',
    'medium': '中等',
    'hard': '困难'
  }
  return labels[currentQuestion.value?.difficulty] || '未知'
})

const selectedAnswer = ref<number | null>(null)
const showResult = ref(false)

function selectAnswer(index: number) {
  if (showResult.value) return
  selectedAnswer.value = index
}

function submitAnswer() {
  if (selectedAnswer.value === null) return
  showResult.value = true
}

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
      <div class="text-center mb-8">
        <div class="w-16 h-16 rounded-full bg-vscode-active flex items-center justify-center mx-auto mb-4">
          <component :is="taskIcon" class="w-8 h-8 text-vscode-icon-hover" />
        </div>
        <h1 class="text-2xl font-bold text-vscode-text">{{ taskName }}</h1>
        <p class="text-vscode-text-secondary mt-2">专注完成当前任务</p>
      </div>

      <div v-if="formattedParams" class="bg-vscode-hover rounded-lg p-4 mb-6">
        <div class="flex items-center text-sm text-vscode-text-secondary">
          <Star class="w-4 h-4 mr-2" />
          <span class="font-mono">{{ formattedParams }}</span>
        </div>
      </div>

      <template v-if="taskType === 'civil' && currentQuestion">
        <div class="bg-vscode-hover rounded-lg p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center space-x-3">
              <GraduationCap class="w-6 h-6 text-vscode-active" />
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
            <div>
              <h3 class="text-sm font-semibold text-vscode-text-secondary mb-2">题目描述</h3>
              <p class="text-vscode-text whitespace-pre-line">{{ currentQuestion.question }}</p>
            </div>
            
            <div v-if="currentQuestion.options" class="space-y-3">
              <button 
                v-for="(option, index) in currentQuestion.options" 
                :key="index"
                @click="selectAnswer(index)"
                :disabled="showResult"
                :class="[
                  'w-full flex items-center p-4 rounded-lg border-2 transition-all text-left',
                  selectedAnswer === index ? 'border-blue-500 bg-blue-500/10' : 'border-vscode-border hover:border-vscode-active',
                  showResult && index === currentQuestion.answer ? 'border-green-500 bg-green-500/10' : '',
                  showResult && selectedAnswer === index && index !== currentQuestion.answer ? 'border-red-500 bg-red-500/10' : ''
                ]"
              >
                <span class="w-8 h-8 rounded-full bg-vscode-active flex items-center justify-center mr-3 font-bold text-vscode-text">{{ String.fromCharCode(65 + index) }}</span>
                <span class="flex-1 text-vscode-text">{{ option }}</span>
              </button>
            </div>
            
            <div v-if="currentQuestion.hints && currentQuestion.hints.length > 0">
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
            
            <div v-if="showResult && currentQuestion.explanation" class="mt-6 p-4 bg-vscode-bg rounded-lg">
              <div class="flex items-center mb-2">
                <Check v-if="selectedAnswer === currentQuestion.answer" class="w-5 h-5 text-green-500 mr-2" />
                <span :class="selectedAnswer === currentQuestion.answer ? 'text-green-500' : 'text-red-500'" class="font-bold">
                  {{ selectedAnswer === currentQuestion.answer ? '回答正确！' : '回答错误' }}
                </span>
              </div>
              <p class="text-sm text-vscode-text-secondary"><span class="font-medium">解析：</span>{{ currentQuestion.explanation }}</p>
            </div>
          </div>
        </div>
        
        <div v-if="!showResult" class="flex justify-center mb-6">
          <button 
            @click="submitAnswer"
            :disabled="selectedAnswer === null"
            :class="[
              'px-6 py-2 rounded-lg font-medium transition-colors',
              selectedAnswer !== null ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-vscode-border text-vscode-text-secondary cursor-not-allowed'
            ]"
          >
            提交答案
          </button>
        </div>
      </template>

      <template v-else-if="currentQuestion">
        <div class="space-y-4 mb-6">
          <div class="bg-vscode-hover rounded-lg p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center space-x-3">
                <component :is="taskType === 'cpp' ? Code : taskType === 'engineering' ? Briefcase : Code" class="w-6 h-6 text-vscode-active" />
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
              <div>
                <h3 class="text-sm font-semibold text-vscode-text-secondary mb-2">题目描述</h3>
                <p class="text-vscode-text whitespace-pre-line">{{ currentQuestion.description }}</p>
              </div>
              
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
              
              <div v-if="currentQuestion.hints && currentQuestion.hints.length > 0">
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
          
          <div class="bg-vscode-hover rounded-lg p-6">
            <h3 class="text-sm font-semibold text-vscode-text-secondary mb-2">任务区域</h3>
            <div class="bg-vscode-bg rounded border border-vscode-border p-4 text-sm text-vscode-text-secondary">
              <template v-if="taskType === 'cpp'">
                请在 C++ 开发环境中完成本题，完成后点击下方"完成任务"按钮。
              </template>
              <template v-else-if="taskType === 'engineering'">
                请完成项目工程化任务，包括代码编写、测试和文档。完成后点击下方"完成任务"按钮。
              </template>
              <template v-else>
                请在你常用的编程环境中完成本题，完成后点击下方"完成任务"按钮。
              </template>
            </div>
          </div>
        </div>
      </template>

      <div v-else class="bg-vscode-hover rounded-lg p-6 mb-6">
        <div class="flex items-center justify-center mb-4">
          <Clock class="w-6 h-6 text-vscode-icon mr-2" />
          <span class="text-4xl font-mono font-bold text-vscode-text">{{ formatTime(completionTime) }}</span>
        </div>
        <div class="text-center text-sm text-vscode-text-secondary">
          已专注 {{ completionTime }} 秒
        </div>
      </div>

      <button
        class="w-full py-3 rounded-lg bg-success text-white font-semibold transition-colors text-lg" style="--hover-bg: var(--color-success);"
        @click="completeTask"
      >
        完成任务
      </button>

      <p class="text-center text-xs text-vscode-text-secondary mt-4">
        点击完成后将自动返回 Roadmap
      </p>
    </div>
  </div>
</template>