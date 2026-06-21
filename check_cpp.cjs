const fs = require('fs')
const code = fs.readFileSync('../cpp-advanced-code.txt', 'utf8')

// Extract script content (without the <script> tag)
const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/)
if (scriptMatch) {
  const scriptContent = scriptMatch[1]
  const lines = scriptContent.split('\n')
  
  // Find areas that could have missing commas - look at each array element transition
  console.log('Total script lines:', lines.length)
  console.log('')
  
  // Check lines 330-350 (area around the error)
  console.log('=== Lines 330-350 ===')
  for (let i = 329; i < Math.min(350, lines.length); i++) {
    const line = lines[i]
    console.log(`Line ${i + 1}: [${line.length} chars] ${line.substring(0, 100)}`)
  }
  
  // Check for patterns that might indicate missing comma
  console.log('')
  console.log('=== Checking for potential issues ===')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Check for two closing brackets without comma between
    if (line.match(/]\s*}/) && !line.match(/,/)) {
      // This might be normal end of array
    }
  }
  
  // Look for section content containing code snippets that might cause issues
  console.log('')
  console.log('=== Checking code template strings ===')
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('template:') || lines[i].includes('code:')) {
      console.log(`Line ${i + 1}: ${lines[i].substring(0, 120)}`)
    }
  }
}
