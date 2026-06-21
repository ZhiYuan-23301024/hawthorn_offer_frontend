import { readFileSync } from 'fs'
import { loadModule } from 'vue3-sfc-loader'
import * as Vue from 'vue'

const code = readFileSync('../cpp-advanced-code.txt', 'utf8')
const templateMatch = code.match(/<template>([\s\S]*?)<\/template>/)
const templateContent = templateMatch[1]
const templateLines = templateContent.split('\n')
const joinedTemplate = templateLines.join('\n')

const modCache = {
    vue: Vue,
    'lucide-vue-next': {},
    '@/stores/checkin': { useCheckinStore: () => ({ completeTask: () => {} }) },
    '@/stores/editor': { useEditorStore: () => ({ closeTab: () => {} }) },
}

const minimalScript = `
const props = defineProps<{ planId: string; taskId: string; taskName: string; params?: Record<string, unknown> }>()
const showComplete = false; const currentView = 'learn'
const selectedChapter: any = {}
const currentSection: any = {}
const currentQuestion: any = {}
const currentQuestionIndex = 0; const selectedAnswer = null
const codeAnswer = ''; const showResult = false
const questionResults: any[] = []
const allQuestionsAnswered = false; const correctCount = 0
const chapters: any[] = []
function selectAnswer(i: number) {}; function submitAnswer() {}
function resetPractice() {}; function completeTask() {}
function setView(v: string) {}; function nextSection() {}
function prevSection() {}; function nextQuestion() {}; function prevQuestion() {}
`

async function test(name, templateStr) {
    const sfc = `<script setup lang="ts">${minimalScript}</script>\n<template>${templateStr}</template>`
    try {
        await loadModule('test.vue', { moduleCache: modCache, getFile: async () => sfc, addStyle: () => {} })
        console.log(`${name}: OK (${sfc.length} chars)`)
    } catch (err) {
        console.log(`${name}: FAIL (${sfc.length} chars) - ${err.message.substring(0, 100)}`)
    }
}

console.log('Original:', templateContent.length, 'chars, has trailing \\n:', templateContent.endsWith('\n'))
console.log('Joined :', joinedTemplate.length, 'chars, has trailing \\n:', joinedTemplate.endsWith('\n'))

await test('Original template', templateContent)
await test('Joined template ', joinedTemplate)
await test('Joined + \\n     ', joinedTemplate + '\n')
await test('Trimmed template', templateContent.trimEnd())
console.log('')

// Test with civil quiz template for comparison
const civilCode = readFileSync('../plugins/civil-service-quiz/component.vue', 'utf8')
const civilTplMatch = civilCode.match(/<template>([\s\S]*?)<\/template>/)
const civilTemplate = civilTplMatch[1]

// Minimal script matching civil quiz
const civilMinScript = `
const props = defineProps<{ planId: string; taskId: string; taskName: string; params?: Record<string, unknown> }>()
const showComplete = false
const currentQuestion: any = { category: 'test', options: [] }
const questionId = 1
const selectedAnswer = null
const showResult = false
const isCorrect = false
const hasPrev = false; const hasNext = false
const categoryColor = 'bg-blue-500'
function selectOption(k: string) {}
function submitAnswer() {}
function resetQuiz() {}
function goToQuestion(id: number) {}
function completeTask() {}
`

const civilSFC = `<script setup lang="ts">${civilMinScript}</script>\n<template>${civilTemplate}</template>`
console.log('Civil SFC size:', civilSFC.length, 'chars')
try {
    await loadModule('test.vue', { moduleCache: modCache, getFile: async () => civilSFC, addStyle: () => {} })
    console.log('Civil template test: OK')
} catch (err) {
    console.log('Civil template test: FAIL -', err.message.substring(0, 100))
}
