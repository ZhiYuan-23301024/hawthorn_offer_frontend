import { readFileSync } from 'fs'
import { parse } from '@babel/parser'

const code = readFileSync('../cpp-advanced-code.txt', 'utf8')

// Extract script content (without <script> tag)
const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/)
const scriptOnly = scriptMatch[1]

console.log('Script-only length:', scriptOnly.length)
console.log('Script-only lines:', scriptOnly.split('\n').length)

try {
  // Parse with TypeScript support like vue3-sfc-loader does
  const ast = parse(scriptOnly, {
    sourceType: 'module',
    plugins: ['typescript'],
    errorRecovery: false,
  })
  console.log('PARSE OK!')
} catch (err) {
  console.log('ERROR:', err.message)
  
  // Show the exact error location
  const scriptLines = scriptOnly.split('\n')
  const errLine = err.loc?.line
  const errCol = err.loc?.column
  console.log('Error at line:', errLine, 'column:', errCol)
  
  if (errLine) {
    console.log('')
    console.log('=== Error line and context ===')
    for (let i = Math.max(0, errLine - 3); i < Math.min(scriptLines.length, errLine + 2); i++) {
      const prefix = i + 1 === errLine ? '>>>' : '   '
      console.log(`${prefix} L${i+1}: ${scriptLines[i]}`)
    }
  }
}
