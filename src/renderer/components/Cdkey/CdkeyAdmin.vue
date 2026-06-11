<script setup lang="ts">
import { ref } from 'vue'
import * as postApi from '@/api/post'

const amounts = [10, 50, 100, 300, 500, 1000, 5000]
const amount = ref(100)
const count = ref(10)
const codes = ref<string[]>([])
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

async function handleGenerate() {
  try {
    const resp = await postApi.generateCdkeys({ amount: amount.value, count: count.value })
    if (resp.code === 200) {
      codes.value = resp.data!.codes
      message.value = `成功生成 ${count.value} 个 CDKEY（面值 ${amount.value} 百斩豆）`
      messageType.value = 'success'
    } else {
      message.value = resp.message || '生成失败'
      messageType.value = 'error'
    }
  } catch {
    message.value = '生成失败，请稍后再试'
    messageType.value = 'error'
  }
}

function handleDownload() {
  const text = codes.value.join('\n')
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cdkeys_${amount.value}x${count.value}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="h-full flex flex-col text-[#ccc]">
    <h2 class="text-lg font-semibold mb-6">CDKEY 管理 — 批量生成</h2>

    <div class="flex items-center gap-4 mb-4">
      <div>
        <label class="text-sm text-[#888] block mb-1">面值</label>
        <select v-model="amount" class="bg-[#2d2d2d] border border-[#444] rounded px-3 py-2 text-sm text-[#ccc] outline-none focus:border-[#4a9eff]">
          <option v-for="a in amounts" :key="a" :value="a">{{ a }} 百斩豆</option>
        </select>
      </div>
      <div>
        <label class="text-sm text-[#888] block mb-1">数量</label>
        <input
          v-model.number="count"
          type="number"
          min="1"
          max="1000"
          class="w-28 bg-[#2d2d2d] border border-[#444] rounded px-3 py-2 text-sm text-[#ccc] outline-none focus:border-[#4a9eff]"
        />
      </div>
    </div>

    <button
      class="bg-[#4a9eff] text-white rounded-md py-2 px-6 text-sm font-medium hover:bg-[#3a8eef] transition-colors mb-4 self-start"
      @click="handleGenerate"
    >生成 CDKEY</button>

    <div v-if="message" class="mb-4 text-sm" :class="messageType === 'success' ? 'text-[#27ae60]' : 'text-[#e74c3c]'">
      {{ message }}
    </div>

    <div v-if="codes.length > 0" class="flex-1 flex flex-col">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-[#888]">生成结果 ({{ codes.length }} 个)</span>
        <button
          class="text-sm text-[#4a9eff] hover:text-[#3a8eef]"
          @click="handleDownload"
        >下载 TXT</button>
      </div>
      <div class="flex-1 overflow-y-auto bg-[#2d2d2d] border border-[#444] rounded-md p-3 font-mono text-xs text-[#aaa] whitespace-pre-wrap">
        {{ codes.join('\n') }}
      </div>
    </div>
  </div>
</template>
