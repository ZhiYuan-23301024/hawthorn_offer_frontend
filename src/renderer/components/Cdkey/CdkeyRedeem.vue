<script setup lang="ts">
import { ref } from 'vue'
import * as postApi from '@/api/post'

const code = ref('')
const balance = ref(0)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

async function handleRedeem() {
  if (!code.value.trim()) {
    message.value = '请输入 CDKEY'
    messageType.value = 'error'
    return
  }
  try {
    const resp = await postApi.redeemCdkey(code.value.trim().toUpperCase())
    if (resp.code === 200) {
      const data = resp.data!
      message.value = `兑换成功！获得 🫘 ${data.amount} 百斩豆`
      messageType.value = 'success'
      balance.value = data.balance
      code.value = ''
    } else {
      message.value = resp.message || '兑换失败'
      messageType.value = 'error'
    }
  } catch {
    message.value = '兑换失败，请稍后再试'
    messageType.value = 'error'
  }
}
</script>

<template>
  <div class="h-full flex flex-col text-[#ccc]">
    <h2 class="text-lg font-semibold mb-6">CDKEY 兑换</h2>

    <div class="mb-4">
      <label class="text-sm text-[#888] mb-2 block">格式：HAWTHORN-XXXX-XXXX</label>
      <input
        v-model="code"
        placeholder="HAWTHORN-XXXX-XXXX"
        class="w-full bg-[#2d2d2d] border border-[#444] rounded-md px-3 py-3 text-sm text-[#ccc] outline-none focus:border-[#4a9eff] placeholder:text-[#666] uppercase"
        style="text-transform: uppercase"
        @keydown.enter="handleRedeem"
      />
    </div>

    <div v-if="message" class="mb-4 text-sm" :class="messageType === 'success' ? 'text-[#27ae60]' : 'text-[#e74c3c]'">
      {{ message }}
    </div>

    <button
      class="w-full bg-[#4a9eff] text-white rounded-md py-2.5 text-sm font-medium hover:bg-[#3a8eef] transition-colors mb-6"
      @click="handleRedeem"
    >兑换</button>

    <div class="text-sm text-[#888]">
      当前余额：<span class="text-[#ccc] font-semibold">🫘 {{ balance }} 百斩豆</span>
    </div>
  </div>
</template>
