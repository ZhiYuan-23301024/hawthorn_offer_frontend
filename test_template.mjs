import { readFileSync } from 'fs'
import { parse } from '@babel/parser'

const code = readFileSync('../cpp-advanced-code.txt', 'utf8')

// Extract template
const templateMatch = code.match(/<template>([\s\S]*?)<\/template>/)
const templateOnly = templateMatch[1].trim()

console.log('Template length:', templateOnly.length)
console.log('Template lines:', templateOnly.split('\n').length)

// Check template for potential issues
const templateLines = templateOnly.split('\n')

// Look for lines with complex :class arrays
console.log('\n=== Lines with :class arrays ===')
for (let i = 0; i < templateLines.length; i++) {
  const line = templateLines[i]
  if (line.includes(':class="[')) {
    console.log(`L${i+1} [${line.length}]: ${line.substring(0, 150)}`)
  }
}

// Look for v-for patterns
console.log('\n=== v-for patterns ===')
for (let i = 0; i < templateLines.length; i++) {
  const line = templateLines[i]
  if (line.includes('v-for')) {
    console.log(`L${i+1}: ${line.substring(0, 120)}`)
  }
}

// Count how many v-if/v-else-if/v-else chains
const vIfCount = (templateOnly.match(/v-if=/g) || []).length
const vElseIfCount = (templateOnly.match(/v-else-if=/g) || []).length
const vElseCount = (templateOnly.match(/v-else\b/g) || []).length
console.log(`\nv-if: ${vIfCount}, v-else-if: ${vElseIfCount}, v-else: ${vElseCount}`)
