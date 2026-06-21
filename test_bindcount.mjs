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

// List of ALL 28 bindings the template needs
const all28Bindings = `
const props = defineProps<{ planId: string; taskId: string; taskName: string; params?: Record<string, unknown> }>()
const checkinStore = { completeTask: () => {} }
const editorStore = { closeTab: () => {} }
const chapters: any[] = []
const currentView = 'learn'
const selectedChapterIndex = 0
const currentSectionIndex = 0
const currentQuestionIndex = 0
const selectedAnswer = null
const codeAnswer = ''
const showResult = false
const questionResults: any[] = []
const showComplete = false
const selectedChapter: any = { id: 1, title: 'Test', sections: [], questions: [] }
const currentSection: any = { title: 'Test', content: 'Test', code: '' }
const currentQuestion: any = { type: 'choice', question: 'Test', options: ['A'], answer: 0, template: '', explanation: '' }
const allQuestionsAnswered = false
const correctCount = 0
const chapterNumber = 1
function setView(v: string) {}
function nextSection() {}
function prevSection() {}
function selectAnswer(i: number) {}
function submitAnswer() {}
function nextQuestion() {}
function prevQuestion() {}
function resetPractice() {}
function completeTask() {}
`

async function test(name, script) {
    const sfc = `<script setup lang="ts">${script}</script>\n<template>${templateContent}</template>`
    try {
        await loadModule('test.vue', { moduleCache: modCache, getFile: async () => sfc, addStyle: () => {} })
        console.log(`${name}: OK`)
    } catch (err) {
        console.log(`${name}: FAIL - ${err.message.substring(0, 100)}`)
    }
}

// Test: all 28 bindings, no data
await test('All 28 bindings', all28Bindings)

// Test: just 15 bindings (civil quiz level)
const just15 = all28Bindings.split('\n').filter(l => l.trim()).slice(0, 15).join('\n')
await test('First 15 bindings only', just15)
