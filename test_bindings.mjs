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

// Extract ALL bindings from the original script
// (variables and functions that appear at the top level)
const scriptContent = code.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]
const bindingPatterns = [
    /^const (\w+)\s*=/gm,      // const declarations
    /^function (\w+)/gm,        // function declarations  
]
const bindings = new Set()
for (const pattern of bindingPatterns) {
    let m
    while ((m = pattern.exec(scriptContent)) !== null) {
        bindings.add(m[1])
    }
}

console.log('Template bindings needed:', [...bindings].join(', '))
console.log('')

// Now test with DIFFERENT subsets of the original script
async function test(name, script) {
    const sfc = `<script setup lang="ts">${script}</script>\n<template>${templateContent}</template>`
    try {
        await loadModule('test.vue', { moduleCache: modCache, getFile: async () => sfc, addStyle: () => {} })
        console.log(`${name}: OK`)
        return true
    } catch (err) {
        console.log(`${name}: FAIL - ${err.message.substring(0, 100)}`)
        return false
    }
}

// Test: full original script minus chapters data (replace with empty array)
const noChapters = scriptContent.replace(
    /const chapters = \[[\s\S]*?\n\](?=\s*\n)/,
    'const chapters: any[] = []'
)
await test('Full script, no chapters', noChapters)

// Test: full original script minus chapters data but with proper regex
const manualNoChapters = scriptContent.substring(0, 489) + 
    'const chapters: any[] = []\n' +
    scriptContent.substring(18733)
await test('Full script, no chapters (manual)', manualNoChapters)
