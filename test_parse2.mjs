import { readFileSync } from 'fs'

const code = readFileSync('../cpp-advanced-code.txt', 'utf8')
const lines = code.split('\n')

// Show line 328 and surrounding area
console.log('=== Lines 325-335 ===')
for (let i = 324; i < Math.min(335, lines.length); i++) {
  const line = lines[i]
  console.log(`L${i+1}: [len=${line.length}] ${JSON.stringify(line.substring(0, 130))}`)
}

// Check if there's a hidden character issue by showing exact bytes
console.log('')
console.log('=== Hex dump of line 328 ===')
const line328 = lines[327]
console.log('Raw chars:')
for (let i = 0; i < Math.min(line328.length, 40); i++) {
  const c = line328.charCodeAt(i)
  console.log(`  [${i}] char=${JSON.stringify(line328[i])} hex=0x${c.toString(16)}`)
}

// Extract just script content and check
const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/)
if (scriptMatch) {
  const scriptOnly = scriptMatch[1]
  const scriptLines = scriptOnly.split('\n')
  console.log('')
  console.log('=== Script-only line 327 ===')
  if (scriptLines[326]) {
    console.log(`Len=${scriptLines[326].length}: ${JSON.stringify(scriptLines[326].substring(0, 130))}`)
  }
  // Check within script only (starting from line 2 since line 1 is the script tag)
  console.log('')
  console.log('=== Script lines 324-330 from script block ===')
  for (let i = 323; i < Math.min(330, scriptLines.length); i++) {
    console.log(`Script L${i+1}: [len=${scriptLines[i].length}] ${JSON.stringify(scriptLines[i].substring(0, 100))}`)
  }
}
