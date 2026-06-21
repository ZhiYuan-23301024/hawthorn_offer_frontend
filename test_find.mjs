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

async function test(name, scriptPart) {
    const sfc = `<script setup lang="ts">${scriptPart}</script>\n<template>${templateContent}</template>`
    try {
        await loadModule('test.vue', { moduleCache: modCache, getFile: async () => sfc, addStyle: () => {} })
        console.log(`${name}: OK`)
        return true
    } catch (err) {
        console.log(`${name}: FAIL - ${err.message.substring(0, 100)}`)
        return false
    }
}

// Find the exact boundary of chapter objects
// Chapters are identifiable by `{ id: N,` patterns
const chapterBoundaries = []
const chRegex = /\n(\s*\{\s*\n\s*id:\s*(\d+),)/g
let m
while ((m = chRegex.exec(scriptContent)) !== null) {
    chapterBoundaries.push({ pos: m.index + 1, line: scriptContent.substring(0, m.index + 1).split('\n').length, id: m[2] })
}
console.log('Chapter boundaries:', chapterBoundaries.map(c => `id=${c.id}@line=${c.line}`).join(', '))

// Use start/end positions to create proper subsets
// Get start of const chapters = [ and end of last chapter before id 4
const chaptersStart = scriptContent.indexOf('const chapters = [')
const chaptersEndMarker = scriptContent.indexOf('\n  },\n  {\n    id: 4,') // start of chapter 4

if (chaptersEndMarker > 0) {
    // Create script with chapters 1-3 properly closed
    const ch1to3 = scriptContent.substring(0, chaptersEndMarker) + '\n  }\n]' + scriptContent.substring(scriptContent.indexOf('\n]', chaptersEndMarker) + 2)
    await test('Chapters 1-3 (clean cut)', ch1to3)
}

const chaptersEndMarker5 = scriptContent.indexOf('\n  },\n  {\n    id: 5,')
if (chaptersEndMarker5 > 0) {
    const ch1to4 = scriptContent.substring(0, chaptersEndMarker5) + '\n  }\n]' + scriptContent.substring(scriptContent.indexOf('\n]', chaptersEndMarker5) + 2)
    await test('Chapters 1-4 (clean cut)', ch1to4)
}

const chaptersEndMarker6 = scriptContent.indexOf('\n  },\n  {\n    id: 6,')
if (chaptersEndMarker6 > 0) {
    const ch1to5 = scriptContent.substring(0, chaptersEndMarker6) + '\n  }\n]' + scriptContent.substring(scriptContent.indexOf('\n]', chaptersEndMarker6) + 2)
    await test('Chapters 1-5 (clean cut)', ch1to5)
}
