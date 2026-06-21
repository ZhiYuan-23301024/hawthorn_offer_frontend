import { readFileSync } from 'fs'
import * as Vue from 'vue'

const code = readFileSync('../cpp-advanced-code.txt', 'utf8')

// Use vue3-sfc-loader directly to examine what it generates
import { loadModule } from 'vue3-sfc-loader'

const moduleCache = {
    vue: Vue,
    'lucide-vue-next': {},
    '@/stores/checkin': { useCheckinStore: () => ({ completeTask: () => {} }) },
    '@/stores/editor': { useEditorStore: () => ({ closeTab: () => {} }) },
}

// Try with a simpler large data to test the "size" hypothesis
// Create a script with a single large array (same size as chapters)
const testData = []
for (let i = 1; i <= 6; i++) {
    testData.push({
        id: i,
        title: `Chapter ${i}`,
        description: `Description for chapter ${i}`,
        items: Array.from({length: 50}, (_, j) => ({
            id: j + 1,
            text: `Item ${j+1} in chapter ${i} with some long text to fill space and make the array larger than usual`,
            code: '// Test code\n' + 'x = 1;\n'.repeat(5),
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
        }))
    })
}

const testScript = `
const props = defineProps<{ planId: string; taskId: string; taskName: string; params?: Record<string, unknown> }>()
const showComplete = false
const data = ${JSON.stringify(testData)}
function completeTask() {}
`

const testSFC = `<script setup lang="ts">${testScript}</script>\n<template><div>hello</div></template>`
console.log('Test SFC length:', testSFC.length)

try {
    await loadModule('test.vue', {
        moduleCache,
        getFile: async () => testSFC,
        addStyle: () => {},
    })
    console.log('Large data test: OK')
} catch (err) {
    console.log('Large data test FAIL:', err.message)
}

// Now test with the actual chapters data but a small template
const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/)
const actualScript = scriptMatch[1]

const smallTemplate = '<div>Hello</div>'
const smallTplSFC = `<script setup lang="ts">${actualScript}</script>\n<template>${smallTemplate}</template>`
console.log('\nSmall template + full script:', smallTplSFC.length, 'chars')
try {
    await loadModule('test.vue', {
        moduleCache,
        getFile: async () => smallTplSFC,
        addStyle: () => {},
    })
    console.log('OK!')
} catch (err) {
    console.log('FAIL:', err.message)
}
