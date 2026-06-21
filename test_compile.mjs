import { readFileSync } from 'fs'
import { compile } from 'vue/compiler-sfc'

const code = readFileSync('../cpp-advanced-code.txt', 'utf8')

console.log('Compiling SFC...')
try {
  const result = compile(code, {
    id: 'cpp-advanced.vue',
    filename: 'cpp-advanced.vue',
  })
  
  if (result.errors.length > 0) {
    console.log('COMPILE ERRORS:')
    for (const err of result.errors) {
      console.log(' ', err.message)
      if (err.loc) console.log('   at', JSON.stringify(err.loc))
    }
  } else {
    console.log('COMPILE OK!')
    console.log('Template code length:', result.script?.content?.length || 'N/A')
  }
} catch (err) {
  console.log('UNEXPECTED ERROR:', err.message)
}

// Also try civil for comparison
console.log('\n--- Comparing with civil-service-quiz ---')
const civilCode = readFileSync('../plugins/civil-service-quiz/component.vue', 'utf8')
try {
  const civilResult = compile(civilCode, {
    id: 'civil.vue',
    filename: 'civil.vue',
  })
  if (civilResult.errors.length > 0) {
    console.log('Civil COMPILE ERRORS:')
    for (const err of civilResult.errors) {
      console.log(' ', err.message)
    }
  } else {
    console.log('Civil COMPILE OK!')
  }
} catch (err) {
  console.log('Civil UNEXPECTED ERROR:', err.message)
}
