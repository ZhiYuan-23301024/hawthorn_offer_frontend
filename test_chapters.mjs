import { readFileSync } from 'fs'
import { loadModule } from 'vue3-sfc-loader'
import * as Vue from 'vue'

const code = readFileSync('../cpp-advanced-code.txt', 'utf8')
const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/)
const templateMatch = code.match(/<template>([\s\S]*?)<\/template>/)

const scriptContent = scriptMatch[1]
const templateContent = templateMatch[1]

// Extract chapters array content
const chaptersMatch = scriptContent.match(/(const chapters = \[[\s\S]*?\n\])/)
const chaptersCode = chaptersMatch[1]

// Try removing different parts of the chapters to find the exact issue

// Find individual chapter objects
const chapterMatches = []
const chapterRegex = /\{\s*\n\s*id:\s*(\d+),/g
let m
while ((m = chapterRegex.exec(chaptersCode)) !== null) {
    chapterMatches.push({ id: m[1], index: m.index })
}
console.log('Chapter IDs found:', chapterMatches.map(c => c.id).join(', '))

// Test with chapters 1-3 only
console.log('\n=== Test: chapters 1-3 only ===')
const chapters3Match = scriptContent.match(/(const chapters = \[[\s\S]*?)(\s*\},\s*\n\s*\{\s*\n\s*id:\s*4\s*,)/)
if (chapters3Match) {
    const partialScript = scriptContent.replace(chapters3Match[0], chapters3Match[1] + '\n]')
    const sfc = `<script setup lang="ts">${partialScript}</script>\n<template>${templateContent}</template>`
    try {
        await loadModule('test.vue', {
            moduleCache: { vue: Vue, 'lucide-vue-next': {}, '@/stores/checkin': { useCheckinStore: () => ({ completeTask: () => {} }) }, '@/stores/editor': { useEditorStore: () => ({ closeTab: () => {} }) } },
            getFile: async () => sfc,
            addStyle: () => {},
        })
        console.log('OK - 3 chapters work')
    } catch (err) {
        console.log('FAIL:', err.message)
    }
}

// Test with chapters 1-4 only
console.log('\n=== Test: chapters 1-4 only ===')
const chapters4Match = scriptContent.match(/(const chapters = \[[\s\S]*?)(\s*\},\s*\n\s*\{\s*\n\s*id:\s*5\s*,)/)
if (chapters4Match) {
    const partialScript = scriptContent.replace(chapters4Match[0], chapters4Match[1] + '\n]')
    const sfc = `<script setup lang="ts">${partialScript}</script>\n<template>${templateContent}</template>`
    try {
        await loadModule('test.vue', {
            moduleCache: { vue: Vue, 'lucide-vue-next': {}, '@/stores/checkin': { useCheckinStore: () => ({ completeTask: () => {} }) }, '@/stores/editor': { useEditorStore: () => ({ closeTab: () => {} }) } },
            getFile: async () => sfc,
            addStyle: () => {},
        })
        console.log('OK - 4 chapters work')
    } catch (err) {
        console.log('FAIL:', err.message)
    }
}

// Test with chapters 1-5 only
console.log('\n=== Test: chapters 1-5 only ===')
const chapters5Match = scriptContent.match(/(const chapters = \[[\s\S]*?)(\s*\},\s*\n\s*\{\s*\n\s*id:\s*6\s*,)/)
if (chapters5Match) {
    const partialScript = scriptContent.replace(chapters5Match[0], chapters5Match[1] + '\n]')
    const sfc = `<script setup lang="ts">${partialScript}</script>\n<template>${templateContent}</template>`
    try {
        await loadModule('test.vue', {
            moduleCache: { vue: Vue, 'lucide-vue-next': {}, '@/stores/checkin': { useCheckinStore: () => ({ completeTask: () => {} }) }, '@/stores/editor': { useEditorStore: () => ({ closeTab: () => {} }) } },
            getFile: async () => sfc,
            addStyle: () => {},
        })
        console.log('OK - 5 chapters work')
    } catch (err) {
        console.log('FAIL:', err.message)
    }
}
