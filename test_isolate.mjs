import { readFileSync } from 'fs'
import { loadModule } from 'vue3-sfc-loader'
import * as Vue from 'vue'

const code = readFileSync('../cpp-advanced-code.txt', 'utf8')

const moduleCache = {
    vue: Vue,
    'lucide-vue-next': {},
    '@/stores/checkin': { useCheckinStore: () => ({ completeTask: () => {} }) },
    '@/stores/editor': { useEditorStore: () => ({ closeTab: () => {} }) },
}

const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/)
const templateMatch = code.match(/<template>([\s\S]*?)<\/template>/)

const scriptContent = scriptMatch[1]
const templateContent = templateMatch[1]

// Test: script only (no template)
console.log('=== Test: Script only SFC ===')
const scriptOnly = `<script setup lang="ts">${scriptContent}</script>`
try {
    await loadModule('test.vue', { moduleCache, getFile: async () => scriptOnly, addStyle: () => {} })
    console.log('OK')
} catch (err) {
    console.log('FAIL:', err.message)
}

// Test: script + empty template
console.log('\n=== Test: Script + empty template ===')
try {
    await loadModule('test.vue', { moduleCache, getFile: async () => scriptOnly + '\n<template><div>hello</div></template>', addStyle: () => {} })
    console.log('OK')
} catch (err) {
    console.log('FAIL:', err.message)
}

// Test: Check if the error relates to the chapter data
console.log('\n=== Test: script with minimal data ===')
// Remove chapters data and see if it works
const minimalScript = scriptContent.replace(/const chapters = \[[\s\S]*?\n\]/, 'const chapters: any[] = []')
const minimalSFC = `<script setup lang="ts">${minimalScript}</script>\n<template>${templateContent}</template>`
try {
    await loadModule('test.vue', { moduleCache, getFile: async () => minimalSFC, addStyle: () => {} })
    console.log('OK - chapters data IS the problem!')
} catch (err) {
    console.log('FAIL:', err.message)
}
