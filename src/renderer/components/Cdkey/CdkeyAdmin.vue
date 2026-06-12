<script setup lang="ts">
import { ref } from 'vue'
import { Download } from 'lucide-vue-next'
import * as postApi from '@/api/post'

const amounts = [10, 50, 100, 300, 500, 1000, 5000]
const amount = ref(100)
const count = ref(10)
const codes = ref<string[]>([])
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

async function handleGenerate() {
  message.value = ''
  try {
    const resp = await postApi.generateCdkeys({ amount: amount.value, count: count.value })
    if (resp.code === 200) { codes.value = resp.data!.codes; message.value = `成功生成 ${count.value} 个 CDKEY（面值 ${amount.value} 百斩豆）`; messageType.value = 'success' }
    else { message.value = resp.message || '生成失败'; messageType.value = 'error' }
  } catch { message.value = '生成失败，请稍后再试'; messageType.value = 'error' }
}

function handleDownload() { const text = codes.value.join('\n'); const blob = new Blob([text], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `cdkeys_${amount.value}x${count.value}.txt`; a.click(); URL.revokeObjectURL(url) }
</script>

<template>
  <div class="h-full overflow-y-auto p-6" style="background-color: var(--color-bg); color: var(--color-text-primary);">
    <h2 class="text-lg font-semibold mb-6" style="font-family: var(--font-display);">CDKEY 管理 — 批量生成</h2>

    <div class="flex items-center gap-4 mb-4">
      <div><label class="text-sm block mb-1" style="color: var(--color-text-secondary);">面值</label>
        <select v-model="amount" class="input-base text-sm py-2"><option v-for="a in amounts" :key="a" :value="a">{{ a }} 百斩豆</option></select></div>
      <div><label class="text-sm block mb-1" style="color: var(--color-text-secondary);">数量</label>
        <input v-model.number="count" type="number" min="1" max="1000" class="w-28 input-base text-sm py-2" /></div>
    </div>

    <button class="text-white rounded-md py-2 px-6 text-sm font-medium transition-colors mb-4 btn-primary" @click="handleGenerate">生成 CDKEY</button>

    <div v-if="message" class="mb-4 text-sm" :style="{ color: messageType === 'success' ? 'var(--color-success)' : 'var(--color-danger)' }">{{ message }}</div>

    <div v-if="codes.length > 0" class="flex flex-col">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm" style="color: var(--color-text-secondary);">生成结果 ({{ codes.length }} 个)</span>
        <button class="text-sm transition-colors inline-flex items-center gap-1" style="color: var(--color-primary);" @click="handleDownload"><Download class="w-3.5 h-3.5" /> 下载 TXT</button>
      </div>
      <div class="flex-1 overflow-y-auto border rounded-md p-3 font-mono text-xs whitespace-pre-wrap" style="background-color: var(--color-surface); border-color: var(--color-border); color: var(--color-text-secondary);">{{ codes.join('\n') }}</div>
    </div>
  </div>
</template>
