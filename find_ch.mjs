import { readFileSync } from 'fs'

const code = readFileSync('../cpp-advanced-code.txt', 'utf8')
const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/)
const scriptContent = scriptMatch[1]

// Find each chapter-level `{ id: N,` where N is the chapter ID
// Chapter ids are 1-6, but questions also have id:1, id:2, etc.
// So we need to find the pattern at chapter level.
// Chapters start with: \n  {\n    id: N,\n    title: '...
const chapterPositions = []
const chPattern = /\n  \{\s*\n\s*id:\s*(\d+),\s*\n\s*title:/g
let m
while ((m = chPattern.exec(scriptContent)) !== null) {
    chapterPositions.push({ pos: m.index, id: m[2] || m[1] })
}
// Get positions more carefully
const chRegex = /\n  \{[\s]*\n[\s]*id: (\d+),[\s]*\n[\s]*title: '([^']+)'/g
let mm
while ((mm = chRegex.exec(scriptContent)) !== null) {
    console.log(`Chapter ${mm[1]}: "${mm[2]}" at index ${mm.index}`)
}
