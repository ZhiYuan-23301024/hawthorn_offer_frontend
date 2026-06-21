import { readFileSync } from 'fs'
import { loadModule } from 'vue3-sfc-loader'
import * as Vue from 'vue'

const originalCode = readFileSync('../cpp-advanced-code.txt', 'utf8')

// Extract template
const templateMatch = originalCode.match(/<template>([\s\S]*?)<\/template>/)
const templateOnly = templateMatch[1]

// Create minimal SFC with just the template
const minimalSFC = `<script setup lang="ts">
const props = defineProps<{ planId: string; taskId: string; taskName: string; params?: Record<string, unknown> }>()
const showComplete = false
const currentView = 'learn'
const checkinStore = { completeTask: () => {} }
const editorStore = { closeTab: () => {} }
const selectedChapter = { id: 1, title: 'test', sections: [], questions: [] }
const currentSection = { title: 'test', content: '', code: '' }
const currentSectionIndex = 0
const currentQuestion = { type: 'choice', question: 'test', options: [], answer: 0, template: '', explanation: '' }
const currentQuestionIndex = 0
const selectedAnswer = null
const codeAnswer = ''
const showResult = false
const questionResults = { value: [] }
const allQuestionsAnswered = false
const correctCount = 0
const isCorrect = false
const hasPrev = false
const hasNext = false
const categoryColor = 'bg-blue-500'
function setView(v: string) {}
function nextSection() {}
function prevSection() {}
function selectAnswer(i: number) {}
function submitAnswer() {}
function nextQuestion() {}
function prevQuestion() {}
function resetPractice() {}
function completeTask() {}
</script>
<template>${templateOnly}</template>`

console.log('Minimal SFC length:', minimalSFC.length)

const moduleCache = {
    vue: Vue,
    'lucide-vue-next': {},
    '@/stores/checkin': { useCheckinStore: () => ({ completeTask: () => {} }) },
    '@/stores/editor': { useEditorStore: () => ({ closeTab: () => {} }) },
}

try {
    const component = await loadModule('plugin.vue', {
        moduleCache,
        getFile: async () => minimalSFC,
        addStyle: () => {},
    })
    console.log('SUCCESS!')
} catch (err) {
    console.log('FAILED:', err.message)
}
