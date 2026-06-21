import { readFileSync } from 'fs'
import { loadModule } from 'vue3-sfc-loader'
import * as Vue from 'vue'

const code = readFileSync('../cpp-advanced-code.txt', 'utf8')
const templateMatch = code.match(/<template>([\s\S]*?)<\/template>/)
const templateContent = templateMatch[1]

const modCache = {
    vue: Vue,
    'lucide-vue-next': {},
    '@/stores/checkin': { useCheckinStore: () => ({ completeTask: () => {} }) },
    '@/stores/editor': { useEditorStore: () => ({ closeTab: () => {} }) },
}

async function test(name, script) {
    const sfc = `<script setup lang="ts">${script}</script>\n<template>${templateContent}</template>`
    try {
        await loadModule('test.vue', { moduleCache: modCache, getFile: async () => sfc, addStyle: () => {} })
        console.log(`${name}: OK`)
    } catch (err) {
        console.log(`${name}: FAIL - ${err.message.substring(0, 120)}`)
    }
}

// Clean minimal script that mimics the cpp-advanced structure
const minimalScript = `
const props = defineProps<{ planId: string; taskId: string; taskName: string; params?: Record<string, unknown> }>()
const showComplete = false
const currentView = 'learn'
const selectedChapter = { id: 1, title: 'Test Chapter', sections: [], questions: [] }
const currentSection = { title: 'Test', content: 'Content here', code: '' }
const currentQuestion = { type: 'choice', question: 'Test question', options: ['A', 'B', 'C', 'D'], answer: 0, template: '', explanation: 'Test' }
const currentQuestionIndex = 0
const selectedAnswer = null
const codeAnswer = ''
const showResult = false
const questionResults = []
const allQuestionsAnswered = false
const correctCount = 0
const chapters: any[] = []
function selectAnswer(i: number) {}
function submitAnswer() {}
function resetPractice() {}
function completeTask() {}
function setView(v: string) {}
function nextSection() {}
function prevSection() {}
function nextQuestion() {}
function prevQuestion() {}
`
await test('Clean minimal script + full template', minimalScript)
