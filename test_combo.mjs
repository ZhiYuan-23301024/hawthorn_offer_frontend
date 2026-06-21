import { readFileSync } from 'fs'
import { loadModule } from 'vue3-sfc-loader'
import * as Vue from 'vue'

const code = readFileSync('../cpp-advanced-code.txt', 'utf8')
const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/)
const templateMatch = code.match(/<template>([\s\S]*?)<\/template>/)
const scriptContent = scriptMatch[1]
const templateContent = templateMatch[1]

const moduleCache = {
    vue: Vue,
    'lucide-vue-next': {},
    '@/stores/checkin': { useCheckinStore: () => ({ completeTask: () => {} }) },
    '@@/stores/editor': { useEditorStore: () => ({ closeTab: () => {} }) },
}

// Test: full chapters data but HALF the template
const templateLines = templateContent.split('\n')
const halfTemplate = templateLines.slice(0, Math.floor(templateLines.length / 2)).join('\n')
const halfTplSFC = `<script setup lang="ts">${scriptContent}</script>\n<template>${halfTemplate}\n</template>`
console.log('Half template SFC:', halfTplSFC.length, 'chars')

try {
    await loadModule('test.vue', {
        moduleCache,
        getFile: async () => halfTplSFC,
        addStyle: () => {},
    })
    console.log('Half template: OK')
} catch (err) {
    console.log('Half template FAIL:', err.message)
}

// Test: empty chapters but FULL template
const noDataScript = scriptContent.replace(/const chapters = \[[\s\S]*?\n\]/, 'const chapters: any[] = []')
const noDataSFC = `<script setup lang="ts">${noDataScript}</script>\n<template>${templateContent}</template>`

try {
    await loadModule('test.vue', {
        moduleCache,
        getFile: async () => noDataSFC,
        addStyle: () => {},
    })
    console.log('No chapters data + full template: OK')
} catch (err) {
    console.log('No chapters data FAIL:', err.message)
}

// The key question: do chapters with 1-3 items work with full template?
// Let me try with just the first chapter's data
const chaptersStart = scriptContent.indexOf('const chapters = [')
// Find end of chapter 1 (start of chapter 2)
const chapter2Start = scriptContent.indexOf('\n  {\n    id: 2,\n    title:', chaptersStart + 100)
const oneChapter = scriptContent.substring(0, chapter2Start) + '\n  }\n]' + scriptContent.substring(scriptContent.indexOf('\n]', chapter2Start) + 2)

const oneChSFC = `<script setup lang="ts">${oneChapter}</script>\n<template>${templateContent}</template>`
console.log('\n1 chapter SFC:', oneChSFC.length, 'chars')

try {
    await loadModule('test.vue', {
        moduleCache,
        getFile: async () => oneChSFC,
        addStyle: () => {},
    })
    console.log('1 chapter: OK')
} catch (err) {
    console.log('1 chapter FAIL:', err.message)
}
