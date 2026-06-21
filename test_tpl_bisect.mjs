import { readFileSync } from 'fs'
import { loadModule } from 'vue3-sfc-loader'
import * as Vue from 'vue'

const code = readFileSync('../cpp-advanced-code.txt', 'utf8')
const templateMatch = code.match(/<template>([\s\S]*?)<\/template>/)
const templateLines = templateMatch[1].split('\n')

const modCache = {
    vue: Vue,
    'lucide-vue-next': {},
    '@/stores/checkin': { useCheckinStore: () => ({ completeTask: () => {} }) },
    '@/stores/editor': { useEditorStore: () => ({ closeTab: () => {} }) },
}

const minimalScript = `
const props = defineProps<{ planId: string; taskId: string; taskName: string; params?: Record<string, unknown> }>()
const showComplete = false
const currentView = 'learn'
const selectedChapter = { id: 1, title: 'Test', sections: [], questions: [] }
const currentSection = { title: 'Test', content: '', code: '' }
const currentQuestion = { type: 'choice', question: 'Test', options: ['A','B','C','D'], answer: 0, template: '', explanation: '' }
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

async function testTemplateChunk(usedLines) {
    const templateContent = templateLines.slice(0, usedLines).join('\n')
    const sfc = `<script setup lang="ts">${minimalScript}</script>\n<template>${templateContent}\n</template>`
    try {
        await loadModule('test.vue', { moduleCache: modCache, getFile: async () => sfc, addStyle: () => {} })
        return true
    } catch (err) {
        return false
    }
}

// Binary search
let low = 0
let high = templateLines.length
let failLine = -1

while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const ok = await testTemplateChunk(mid)
    console.log(`Template[0..${mid}]/${templateLines.length}: ${ok ? 'OK' : 'FAIL'}`)
    
    if (ok) {
        low = mid + 1
    } else {
        failLine = mid
        high = mid - 1
    }
}

console.log(`\n=== First failing template line: ${failLine} ===`)
if (failLine > 0) {
    console.log('Line content:')
    console.log(templateLines[failLine - 1])
    console.log('\nContext:')
    for (let i = Math.max(0, failLine - 4); i < Math.min(templateLines.length, failLine + 2); i++) {
        const marker = i === failLine - 1 ? '>>>' : '   '
        console.log(`${marker} L${i+1}: ${templateLines[i]}`)
    }
}
