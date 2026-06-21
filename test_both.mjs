import { readFileSync } from 'fs'
import { loadModule } from 'vue3-sfc-loader'
import * as Vue from 'vue'

const civilCode = readFileSync('../plugins/civil-service-quiz/component.vue', 'utf8')
const cppCode = readFileSync('../cpp-advanced-code.txt', 'utf8')

const modCache = {
    vue: Vue,
    'lucide-vue-next': {},
    '@/stores/checkin': { useCheckinStore: () => ({ completeTask: () => {} }) },
    '@/stores/editor': { useEditorStore: () => ({ closeTab: () => {} }) },
}

async function test(name, sfc) {
    try {
        const comp = await loadModule('test.vue', { moduleCache: modCache, getFile: async () => sfc, addStyle: () => {} })
        console.log(`${name}: OK, component:`, Object.keys(comp))
    } catch (err) {
        console.log(`${name}: FAIL - ${err.message.substring(0, 120)}`)
    }
}

// Test 1: Full civil quiz as-is
await test('Civil quiz (full)', civilCode)

// Test 2: Full cpp-advanced as-is  
await test('CPP advanced (full)', cppCode)

// Test 3: Civil quiz but with BOM removed (sometimes files have BOM)
const cleanCivil = civilCode.replace(/^\uFEFF/, '')
if (cleanCivil !== civilCode) {
    await test('Civil quiz (BOM stripped)', cleanCivil)
}

// Test 4: Check byte content of first line
const civilFirstLine = civilCode.split('\n')[0]
console.log('\nCivil first line bytes:', [...civilFirstLine].map(c => c.charCodeAt(0).toString(16)).join(' '))
const cppFirstLine = cppCode.split('\n')[0]
console.log('CPP first line bytes:', [...cppFirstLine].map(c => c.charCodeAt(0).toString(16)).join(' '))
