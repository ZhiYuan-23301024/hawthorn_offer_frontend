import { readFileSync } from 'fs'
import { loadModule } from 'vue3-sfc-loader'
import * as Vue from 'vue'

const code = readFileSync('../cpp-advanced-code.txt', 'utf8')
const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/)
const templateMatch = code.match(/<template>([\s\S]*?)<\/template>/)
const scriptContent = scriptMatch[1]
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
        console.log(`${name}: OK (${sfc.length} chars)`)
    } catch (err) {
        console.log(`${name}: FAIL (${sfc.length} chars) - ${err.message.substring(0, 120)}`)
    }
}

// Key test: full template + chapters data of different sizes
const chaptersStart = scriptContent.indexOf('const chapters = [')
const chaptersEnd = scriptContent.indexOf(']', chaptersStart + 1000)

// Find the first occurrence of '\n]' after chapters data start
// Actually, let me find it differently - the last ']' before the reactive state
const afterChapters = scriptContent.indexOf('\n\nconst currentView', chaptersStart)
const endOfChapters = scriptContent.lastIndexOf('\n]', afterChapters)

console.log(`Chapters from index ${chaptersStart} to ${endOfChapters}`)

// Test 1: empty chapters
await test('Empty chapters', scriptContent.replace(/const chapters = \[[\s\S]*?\n\]/, 'const chapters: any[] = []'))

// Test 2: single chapter object
const ch1End = scriptContent.indexOf('\n  },\n  {\n    id: 2,')
if (ch1End > 0) {
    const oneCh = scriptContent.substring(0, ch1End) + '\n  }\n]' + scriptContent.substring(endOfChapters + 2)
    await test('1 chapter only', oneCh)
}

// Test 3: chapter with just id/title (no sections/questions)
await test('Minimal chapters',
    scriptContent.substring(0, chaptersStart) +
    'const chapters = [{ id: 1, title: "test", description: "test", sections: [], questions: [] }]\n' +
    scriptContent.substring(endOfChapters + 2)
)

// Test 4: The exact same data as JSON string (to bypass any parsing issues)
const chaptersContent = scriptContent.substring(chaptersStart, endOfChapters + 2)
const chaptersJsonScript = scriptContent.substring(0, chaptersStart) + 
    'const chapters: any[] = ' + JSON.stringify([{id:1,title:'test'}]) + '\n' +
    scriptContent.substring(endOfChapters + 2)
await test('JSON chapters', chaptersJsonScript)
