import { readFileSync } from 'fs'
import { loadModule } from 'vue3-sfc-loader'
import * as Vue from 'vue'

const code = readFileSync('../cpp-advanced-code.txt', 'utf8')

// Monkey-patch to capture the final compiled code
const moduleCache = {
    vue: Vue,
    'lucide-vue-next': {},
    '@/stores/checkin': { useCheckinStore: () => ({ completeTask: () => {} }) },
    '@/stores/editor': { useEditorStore: () => ({ closeTab: () => {} }) },
}

// Instead of using loadModule, let's try to figure out the issue differently
// Let's try with a simpler template to isolate the problem

// Split the template into chunks and test each one
const templateMatch = code.match(/<template>([\s\S]*?)<\/template>/)
const templateLines = templateMatch[1].split('\n')

// Create SFC with first N lines of template
async function testTemplateChunk(lineCount) {
  const scriptContent = code.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]
  const templateContent = templateLines.slice(0, lineCount).join('\n')
  const testSFC = `<script setup lang="ts">${scriptContent}</script>\n<template>${templateContent}\n</template>`
  
  try {
    await loadModule('test.vue', {
      moduleCache,
      getFile: async () => testSFC,
      addStyle: () => {},
    })
    return { ok: true, line: lineCount }
  } catch (err) {
    return { ok: false, line: lineCount, error: err.message }
  }
}

// Binary search to find the problematic line
let low = 1
let high = templateLines.length
let failPoint = -1

while (low <= high) {
  const mid = Math.floor((low + high) / 2)
  const result = await testTemplateChunk(mid)
  console.log(`Template line ${mid}/${templateLines.length}: ${result.ok ? 'OK' : 'FAIL - ' + result.error}`)
  
  if (result.ok) {
    low = mid + 1
  } else {
    failPoint = mid
    high = mid - 1
  }
}

console.log(`\n=== Error first appears at template line: ${failPoint} ===`)
if (failPoint > 0) {
  console.log('Problematic line:')
  console.log(templateLines[failPoint - 1])
  console.log('\nContext:')
  for (let i = Math.max(0, failPoint - 3); i < Math.min(templateLines.length, failPoint + 2); i++) {
    console.log(`  L${i+1}: ${templateLines[i].substring(0, 120)}`)
  }
}
