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

// Test 1: Full original file
console.log('=== Test 1: Full original file ===')
try {
    await loadModule('test.vue', { moduleCache, getFile: async () => code, addStyle: () => {} })
    console.log('OK')
} catch (err) {
    console.log('FAIL:', err.message)
}

// Test 2: Reconstructed from extracted parts
const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/)
const templateMatch = code.match(/<template>([\s\S]*?)<\/template>/)
const reconstructed = `<script setup lang="ts">${scriptMatch[1]}</script>\n<template>${templateMatch[1]}</template>`

console.log('\n=== Test 2: Reconstructed SFC ===')
console.log('Reconstructed length:', reconstructed.length, 'vs original:', code.length)
try {
    await loadModule('test.vue', { moduleCache, getFile: async () => reconstructed, addStyle: () => {} })
    console.log('OK')
} catch (err) {
    console.log('FAIL:', err.message)
}
